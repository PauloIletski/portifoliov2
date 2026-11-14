import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { createApi } from './app.js';

test('V7: malformed and compressed bodies cannot interrupt the API', async (context) => {
  const originalUrl = process.env['BETTER_AUTH_URL'];
  const server = createApi().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  process.env['BETTER_AUTH_URL'] = base;
  const headers = { Origin: base, 'Content-Type': 'application/json' };
  try {
    await context.test('rejects compressed bodies, including frames with trailing bytes', async () => {
      for (const body of [gzipSync('{}'), Buffer.concat([gzipSync('{}'), Buffer.from('trailing')])]) {
        const response = await fetch(base + '/api/security-probe', {
          method: 'POST', headers: { ...headers, 'Content-Encoding': 'gzip' },
          body: new Uint8Array(body), signal: AbortSignal.timeout(5000),
        });
        assert.equal(response.status, 415);
        await response.text();
        assert.equal((await fetch(base + '/api/security-probe')).status, 404);
      }
    });
    await context.test('rejects invalid JSON and oversized bodies without exposing internals', async () => {
      for (const [body, status] of [['{', 400], [JSON.stringify('x'.repeat(4 * 1024 * 1024)), 413]] as const) {
        const response = await fetch(base + '/api/security-probe', {
          method: 'POST', headers, body, signal: AbortSignal.timeout(5000),
        });
        assert.equal(response.status, status);
        const result = await response.json() as Record<string, unknown>;
        assert.deepEqual(Object.keys(result), ['message']);
        assert.equal((await fetch(base + '/api/security-probe')).status, 404);
      }
    });
    await context.test('rejects missing and foreign origins before handlers', async () => {
      for (const origin of [undefined, 'https://attacker.example']) {
        const response = await fetch(base + '/api/admin/uploads', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: '{}',
        });
        assert.equal(response.status, 403);
      }
    });
    await context.test('rejects collection names and NoSQL operator input outside the allowlist', async () => {
      for (const kind of ['user', 'account', 'session', 'administrators', '%7B%22%24ne%22%3Anull%7D']) {
        assert.equal((await fetch(base + '/api/content/' + kind)).status, 400);
      }
    });
  } finally {
    if (originalUrl === undefined) delete process.env['BETTER_AUTH_URL'];
    else process.env['BETTER_AUTH_URL'] = originalUrl;
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
