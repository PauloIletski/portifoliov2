import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { hashPassword } from 'better-auth/crypto';
import { getPayloadFromClientToken } from '@vercel/blob/client';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { closeDatabase, database, mongoClient } from './database.js';
import { provisionAdministrator } from './provision-admin.js';
import { setupDatabase } from './setup.js';
import { createApi } from './app.js';
import { type ContentDocument, kinds } from './schema.js';
import { importRecord } from '../scripts/migration/import.js';
import { atomicJson, hash, readSnapshot, type Snapshot } from '../scripts/migration/snapshot.js';

test(
  'Atlas API, authentication and resumable import',
  { skip: process.env['TEST_MONGODB'] !== 'true' },
  async (context) => {
    const databaseId = 'portfoliov2_test_' + randomBytes(8).toString('hex');
    process.env['MONGODB_DATABASE'] = databaseId;
    process.env['BETTER_AUTH_SECRET'] = randomBytes(48).toString('base64url');
    process.env['RESEND_API_KEY'] = 're_local_test';
    process.env['EMAIL_FROM'] = 'Portfolio <test@example.com>';
    process.env['BLOB_READ_WRITE_TOKEN'] =
      `vercel_blob_rw_localtest_${randomBytes(32).toString('hex')}`;
    const originalFetch = globalThis.fetch;
    let resetUrl = '';
    globalThis.fetch = async (input, init) => {
      if (String(input).startsWith('https://api.resend.com/')) {
        const body = JSON.parse(String(init?.body)) as { text: string };
        resetUrl = body.text.match(/https?:\/\/[^\s]+/)?.[0] || '';
        return Response.json({ id: randomUUID() });
      }
      return originalFetch(input, init);
    };
    const server = createApi().listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert(address && typeof address === 'object');
    const base = `http://127.0.0.1:${address.port}`;
    process.env['BETTER_AUTH_URL'] = base;
    const originalUri = process.env['MONGODB_URI'];
    delete process.env['MONGODB_URI'];
    await assert.rejects(database(), /MONGODB_URI/);
    process.env['MONGODB_URI'] = originalUri;
    const db = await database();
    let cookie = '';
    async function request(route: string, method = 'GET', body?: unknown, withCookie = true) {
      return fetch(base + route, {
        method,
        headers: {
          Origin: base,
          'Content-Type': 'application/json',
          ...(withCookie && cookie ? { Cookie: cookie } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    }
    const profile: ContentDocument = {
      _id: randomUUID(),
      singleton: true,
      position: 0,
      published: false,
      translations: {
        'pt-BR': { name: '', role: '', description: '', descriptionMore: '', principles: [] },
        'en-US': { name: '', role: '', description: '', descriptionMore: '', principles: [] },
      },
    };
    try {
      await setupDatabase(db);
      const administrator = await provisionAdministrator(
        db,
        await mongoClient(),
        'admin@example.com',
      );
      const userId = new ObjectId(administrator.userId);
      const now = new Date();
      await db
        .collection('account')
        .updateOne(
          { userId },
          { $set: { password: await hashPassword('Local-Only-Password-123') } },
        );
      await context.test(
        'provisions only one administrator and retries for the same email',
        async () => {
          assert.equal(
            (await provisionAdministrator(db, await mongoClient(), 'admin@example.com')).userId,
            administrator.userId,
          );
          await assert.rejects(
            provisionAdministrator(db, await mongoClient(), 'other@example.com'),
            /diferente/,
          );
          assert.equal(await db.collection('user').countDocuments(), 1);
          assert.equal(await db.collection('administrators').countDocuments(), 1);
        },
      );

      await context.test(
        'blocks anonymous CRUD, upload authorization and public signup',
        async () => {
          assert.equal((await request('/api/admin/content/projects')).status, 401);
          assert.equal(
            (await request('/api/admin/uploads', 'POST', { type: 'blob.generate-client-token' }))
              .status,
            401,
          );
          assert.equal(
            (
              await request('/api/auth/sign-up/email', 'POST', {
                name: 'Intruder',
                email: 'intruder@example.com',
                password: 'Long-Enough-Password',
              })
            ).status,
            400,
          );
        },
      );
      await context.test(
        'login checks real credentials and server administrator authorization',
        async () => {
          assert.equal(
            (
              await request('/api/auth/sign-in/email', 'POST', {
                email: 'admin@example.com',
                password: 'wrong-password',
              })
            ).status,
            401,
          );
          const login = await request('/api/auth/sign-in/email', 'POST', {
            email: 'admin@example.com',
            password: 'Local-Only-Password-123',
          });
          assert.equal(login.status, 200, await login.text());
          cookie = login.headers
            .getSetCookie()
            .map((value) => value.split(';')[0])
            .join('; ');
          assert(cookie);
          assert.equal((await request('/api/admin/session')).status, 200);
          await db
            .collection('administrators')
            .updateOne({ userId: userId.toHexString() }, { $set: { userId: 'unauthorized' } });
          assert.equal((await request('/api/admin/session')).status, 403);
          await db
            .collection('administrators')
            .updateOne({ userId: 'unauthorized' }, { $set: { userId: userId.toHexString() } });
        },
      );
      await context.test(
        'validates CRUD, hides drafts, orders reads, enforces singleton and read-only mode',
        async () => {
          const { _id, singleton, ...payload } = profile;
          const response = await request('/api/admin/content/profiles', 'POST', payload);
          assert.equal(response.status, 201, await response.clone().text());
          const row = (await response.json()) as { id: string };
          assert.equal(
            ((await (await request('/api/content/profiles')).json()) as unknown[]).length,
            0,
          );
          assert.equal((await request('/api/admin/content/profiles', 'POST', payload)).status, 409);
          assert.equal(
            (
              await request(`/api/admin/content/profiles/${row.id}`, 'PUT', {
                ...payload,
                published: true,
              })
            ).status,
            400,
          );
          assert.equal((await request('/api/content/unknown')).status, 400);
          assert.equal(
            (await request('/api/admin/content/projects/not-a-uuid', 'DELETE')).status,
            400,
          );
          process.env['ADMIN_READ_ONLY'] = 'true';
          assert.equal(
            (await request(`/api/admin/content/profiles/${row.id}`, 'DELETE')).status,
            503,
          );
          process.env['ADMIN_READ_ONLY'] = 'false';
          assert.equal(
            (await request(`/api/admin/content/profiles/${row.id}`, 'DELETE')).status,
            200,
          );
          assert.equal(
            (await request(`/api/admin/content/profiles/${row.id}`, 'DELETE')).status,
            404,
          );
          const crossOrigin = await fetch(base + '/api/admin/content/profiles', {
            method: 'POST',
            headers: {
              Origin: 'https://evil.example',
              Cookie: cookie,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          assert.equal(crossOrigin.status, 403);
        },
      );
      await context.test('issues scoped upload tokens only for allowed image paths', async () => {
        const event = (pathname: string) => ({
          type: 'blob.generate-client-token',
          payload: { pathname, multipart: false, clientPayload: null },
        });
        assert.equal(
          (await request('/api/admin/uploads', 'POST', event('../escape.png'))).status,
          400,
        );
        const response = await request(
          '/api/admin/uploads',
          'POST',
          event(`portfolio-images/${randomUUID()}.png`),
        );
        assert.equal(response.status, 200, await response.clone().text());
        const result = (await response.json()) as { clientToken: string };
        const payload = getPayloadFromClientToken(result.clientToken);
        assert.equal(payload.maximumSizeInBytes, 5 * 1024 * 1024);
        assert.deepEqual(payload.allowedContentTypes, ['image/jpeg', 'image/png', 'image/webp']);
        assert.equal(payload.addRandomSuffix, true);
      });
      await context.test(
        'reset uses email, rejects invalid tokens, consumes valid tokens and revokes sessions',
        async () => {
          const reset = await request('/api/auth/request-password-reset', 'POST', {
            email: 'admin@example.com',
            redirectTo: base + '/en/admin/reset-password',
          });
          assert.equal(reset.status, 200, await reset.text());
          assert(resetUrl, 'Reset mail captured at the Resend HTTP boundary');
          const redirect = await fetch(resetUrl, { redirect: 'manual', headers: { Origin: base } });
          const location = redirect.headers.get('location');
          assert(location);
          const callback = new URL(location, base);
          assert.equal(callback.pathname, '/en/admin/reset-password');
          const token = callback.searchParams.get('token');
          assert(token);
          assert.equal(
            (
              await request('/api/auth/reset-password', 'POST', {
                token: 'invalid',
                newPassword: 'New-Password-123',
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request('/api/auth/reset-password', 'POST', {
                token,
                newPassword: 'New-Password-123',
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await request('/api/auth/reset-password', 'POST', {
                token,
                newPassword: 'Another-Password-123',
              })
            ).status,
            400,
          );
          assert.equal((await request('/api/admin/session')).status, 401);
        },
      );
      await context.test('expired reset tokens cannot change passwords', async () => {
        await request('/api/auth/request-password-reset', 'POST', {
          email: 'admin@example.com',
          redirectTo: base + '/admin/reset-password',
        });
        const token = new URL(resetUrl).pathname.split('/').at(-1);
        assert(token);
        await db
          .collection('verification')
          .updateOne(
            { identifier: `reset-password:${token}` },
            { $set: { expiresAt: new Date(0) } },
          );
        assert.equal(
          (
            await request('/api/auth/reset-password', 'POST', {
              token,
              newPassword: 'Expired-Password-123',
            })
          ).status,
          400,
        );
      });
      await context.test(
        'imports are resumable and reject destination edits and concurrent singleton inserts',
        async () => {
          const collection = db.collection<ContentDocument>('profiles');
          const ledger = db.collection<{ _id: string; sourceHash: string; targetHash: string }>(
            'migration_records',
          );
          await importRecord(collection, ledger, profile, 'source-hash');
          await importRecord(collection, ledger, profile, 'source-hash');
          assert.equal(await collection.countDocuments(), 1);
          // Simulate interruption after insertion but before provenance is stored.
          await ledger.deleteMany({});
          await importRecord(collection, ledger, profile, 'source-hash');
          await collection.updateOne({ _id: profile._id }, { $set: { position: 8 } });
          await assert.rejects(
            importRecord(collection, ledger, profile, 'source-hash'),
            /Conflito/,
          );
          const results = await Promise.allSettled([
            collection.insertOne({ ...profile, _id: randomUUID() }),
            collection.insertOne({ ...profile, _id: randomUUID() }),
          ]);
          assert(results.every((result) => result.status === 'rejected'));
          await collection.updateOne({ _id: profile._id }, { $set: { position: 0 } });
          await importRecord(
            collection,
            ledger,
            { ...profile, position: 1 },
            'updated-source-hash',
          );
          assert.equal((await collection.findOne({ _id: profile._id }))?.position, 1);
          await collection.deleteOne({ _id: profile._id });
          await assert.rejects(
            importRecord(collection, ledger, profile, 'source-hash'),
            /removido/,
          );
        },
      );
      await context.test('snapshot validation rejects corruption before import', async () => {
        const directory = await mkdtemp(path.join(tmpdir(), 'portfolio-migration-'));
        try {
          const tables = Object.fromEntries(
            kinds.map((kind) => [kind, { count: 0, rows: [], sha256: hash([]) }]),
          ) as unknown as Snapshot['tables'];
          const snapshot: Snapshot = {
            version: 1,
            source: 'https://example.supabase.co',
            createdAt: now.toISOString(),
            admin: { email: 'admin@example.com', sourceId: randomUUID() },
            tables,
            assets: [],
          };
          await atomicJson(path.join(directory, 'snapshot.json'), snapshot);
          await readSnapshot(directory);
          snapshot.tables.projects.count = 1;
          await atomicJson(path.join(directory, 'snapshot.json'), snapshot);
          await assert.rejects(readSnapshot(directory), /Checksum/);
        } finally {
          await rm(directory, { recursive: true });
        }
      });
    } finally {
      globalThis.fetch = originalFetch;
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      assert.match(db.databaseName, /^portfoliov2_test_[a-f0-9]{16}$/);
      try {
        await db.dropDatabase();
      } finally {
        await closeDatabase();
      }
    }
  },
);
