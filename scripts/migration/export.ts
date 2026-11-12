import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { kinds } from '../../server/schema.js';
import {
  atomicJson,
  fileHash,
  hash,
  readSnapshot,
  type Asset,
  type Snapshot,
  type SourceRow,
} from './snapshot.js';

export async function exportSupabase(directory: string): Promise<void> {
  const base = process.env['SUPABASE_URL']?.replace(/\/$/, '');
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!base || !key)
    throw new Error('Exportação exige SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente local.');
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  async function sourceRequest(route: string, options?: RequestInit) {
    const response = await fetch(base + route, {
      ...options,
      headers: { ...headers, ...options?.headers },
    });
    if (!response.ok) throw new Error(`Exportação recusada pela origem (${response.status}).`);
    return response;
  }
  const tables = {} as Snapshot['tables'];
  for (const kind of kinds) {
    const rows: SourceRow[] = [];
    let total = 0;
    do {
      const response = await sourceRequest(
        `/rest/v1/${kind}?select=*&order=id&offset=${rows.length}&limit=500`,
        { headers: { Prefer: 'count=exact' } },
      );
      const count = response.headers.get('content-range')?.split('/')[1];
      if (!count || count === '*') throw new Error('A origem não confirmou a contagem total.');
      total = Number(count);
      const page = (await response.json()) as SourceRow[];
      if (!page.length && rows.length < total) throw new Error('Exportação incompleta.');
      rows.push(...page);
    } while (rows.length < total);
    tables[kind] = { count: total, sha256: hash(rows), rows };
  }
  const admins = (await (await sourceRequest('/rest/v1/administrators?select=user_id')).json()) as {
    user_id: string;
  }[];
  if (admins.length !== 1) throw new Error('A origem deve possuir exatamente um administrador.');
  const user = (await (
    await sourceRequest(`/auth/v1/admin/users/${admins[0]!.user_id}`)
  ).json()) as { email?: string };
  if (!user.email) throw new Error('E-mail do administrador ausente.');
  const assets: Asset[] = [];
  await mkdir(path.join(directory, 'assets'), { recursive: true });
  async function listFiles(prefix: string): Promise<void> {
    let offset = 0;
    while (true) {
      const rows = (await (
        await sourceRequest('/storage/v1/object/list/portfolio-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prefix,
            limit: 100,
            offset,
            sortBy: { column: 'name', order: 'asc' },
          }),
        })
      ).json()) as { id: string | null; name: string }[];
      for (const entry of rows) {
        const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (!entry.id) {
          await listFiles(objectPath);
          continue;
        }
        const encoded = objectPath.split('/').map(encodeURIComponent).join('/');
        const response = await sourceRequest(
          `/storage/v1/object/authenticated/portfolio-images/${encoded}`,
        );
        const bytes = new Uint8Array(await response.arrayBuffer());
        const sha256 = fileHash(bytes);
        await writeFile(path.join(directory, 'assets', sha256), bytes);
        assets.push({
          path: objectPath,
          url: `${base}/storage/v1/object/public/portfolio-images/${encoded}`,
          sha256,
          size: bytes.length,
          contentType: response.headers.get('content-type') || 'application/octet-stream',
        });
      }
      if (rows.length < 100) break;
      offset += rows.length;
    }
  }
  await listFiles('');
  const snapshot: Snapshot = {
    version: 1,
    source: base,
    createdAt: new Date().toISOString(),
    admin: { email: user.email, sourceId: admins[0]!.user_id },
    tables,
    assets,
  };
  await atomicJson(path.join(directory, 'snapshot.json'), snapshot);
  await readSnapshot(directory);
  console.log(
    'Exportação completa e validada.',
    Object.fromEntries(kinds.map((kind) => [kind, tables[kind].count])),
    { assets: assets.length },
  );
}
