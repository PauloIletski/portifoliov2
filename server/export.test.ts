import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { exportSupabase } from '../scripts/migration/export.js';
import { readSnapshot } from '../scripts/migration/snapshot.js';

test('exports drafts and orphaned assets with checksums and rejects missing files', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'portfolio-export-'));
  const originalFetch = globalThis.fetch;
  const base = 'https://source.example';
  const adminId = randomUUID();
  const projectId = randomUUID();
  process.env['SUPABASE_URL'] = base;
  process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'local-test-key';
  const payload = {
    name: '',
    author: '',
    mark: '',
    category: '',
    summary: '',
    technologies: [],
    collectionStack: '',
    demoRoute: '',
    demoLabel: '',
    detailsTitle: '',
    details: [],
    image: {
      src: base + '/storage/v1/object/public/portfolio-images/nested/image.png',
      alt: '',
      width: 1,
      height: 1,
    },
  };
  const rows = [
    {
      id: projectId,
      position: 0,
      published: false,
      translations: { 'pt-BR': payload, 'en-US': payload },
    },
  ];
  const bytes = new Uint8Array([1, 2, 3]);
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    assert.equal(new Headers(options?.headers).get('apikey'), 'local-test-key');
    if (url.pathname === '/rest/v1/administrators') return Response.json([{ user_id: adminId }]);
    if (url.pathname === `/auth/v1/admin/users/${adminId}`)
      return Response.json({ email: 'admin@example.com' });
    if (url.pathname.startsWith('/rest/v1/')) {
      const data = url.pathname.endsWith('/projects') ? rows : [];
      return Response.json(data, { headers: { 'content-range': data.length ? '0-0/1' : '*/0' } });
    }
    if (url.pathname === '/storage/v1/object/list/portfolio-images') {
      const body = JSON.parse(String(options?.body)) as { prefix: string };
      return Response.json(
        body.prefix
          ? [{ id: 'image', name: 'image.png' }]
          : [
              { id: null, name: 'nested' },
              { id: 'orphan', name: 'orphan.png' },
            ],
      );
    }
    if (url.pathname.startsWith('/storage/v1/object/authenticated/'))
      return new Response(bytes, { headers: { 'content-type': 'image/png' } });
    throw new Error('Unexpected source request');
  };
  try {
    await exportSupabase(directory);
    const snapshot = await readSnapshot(directory);
    assert.equal(snapshot.tables.projects.count, 1);
    assert.equal(snapshot.tables.projects.rows[0]?.id, projectId);
    assert.equal(snapshot.tables.projects.rows[0]?.published, false);
    assert.equal(snapshot.assets.length, 2);
    assert.equal(snapshot.admin.sourceId, adminId);
    await exportSupabase(directory);
    assert.equal((await readSnapshot(directory)).assets.length, 2);
    await writeFile(path.join(directory, 'assets', snapshot.assets[0]!.sha256), 'corrupt');
    await assert.rejects(readSnapshot(directory), /corrompido/);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(directory, { recursive: true });
  }
});
