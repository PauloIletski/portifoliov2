// Run only against the disposable local Supabase stack, never a hosted project.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const status = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }),
);
const url = status.API_URL;
assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Local stack required');
const publicKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const root = createClient(url, secretKey, options),
  visitor = createClient(url, publicKey, options),
  owner = createClient(url, publicKey, options),
  ordinary = createClient(url, publicKey, options);
const users = [],
  records = [],
  objects = [];
const password = randomUUID() + 'aA1!';
function ok(result) {
  assert.equal(result.error, null, result.error?.message);
  return result.data;
}
async function user(email) {
  const data = ok(await root.auth.admin.createUser({ email, password, email_confirm: true }));
  users.push(data.user.id);
  return data.user;
}
const suffix = randomUUID();
try {
  const admin = await user(`owner-${suffix}@example.com`);
  await user(`visitor-${suffix}@example.com`);
  ok(await root.from('administrators').insert({ user_id: admin.id }));
  assert.ok((await owner.auth.signInWithPassword({ email: admin.email, password: 'wrong' })).error);
  ok(await owner.auth.signInWithPassword({ email: admin.email, password }));
  ok(await ordinary.auth.signInWithPassword({ email: `visitor-${suffix}@example.com`, password }));
  assert.deepEqual(ok(await ordinary.from('administrators').select('*')), []);
  assert.ok((await ordinary.from('administrators').insert({ user_id: users[1] })).error);
  const payload = { name: 'API test', group: 'interfaces', icon: 'angular' };
  const translations = { 'pt-BR': payload, 'en-US': { ...payload, name: 'API test EN' } };
  const record = ok(
    await owner
      .from('skills')
      .insert({ translations, published: false, position: 999 })
      .select()
      .single(),
  );
  records.push(record.id);
  assert.deepEqual(ok(await visitor.from('skills').select('*').eq('id', record.id)), []);
  assert.deepEqual(ok(await ordinary.from('skills').select('*').eq('id', record.id)), []);
  assert.ok((await visitor.from('skills').insert({ translations, published: true })).error);
  assert.ok((await ordinary.from('skills').insert({ translations, published: true })).error);
  assert.deepEqual(
    ok(await ordinary.from('skills').update({ published: true }).eq('id', record.id).select()),
    [],
  );
  assert.ok(
    (
      await owner
        .from('skills')
        .update({
          published: true,
          translations: { ...translations, 'en-US': { ...payload, name: '' } },
        })
        .eq('id', record.id)
    ).error,
  );
  ok(await owner.from('skills').update({ published: true }).eq('id', record.id));
  assert.equal(ok(await visitor.from('skills').select('*').eq('id', record.id)).length, 1);
  ok(
    await owner
      .from('skills')
      .update({ translations: { ...translations, 'en-US': { ...payload, name: 'Updated EN' } } })
      .eq('id', record.id),
  );
  assert.equal(
    ok(await visitor.from('skills').select('*').eq('id', record.id))[0].translations['en-US'].name,
    'Updated EN',
  );
  const path = `verify-${suffix}.png`;
  objects.push(path);
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=',
    'base64',
  );
  assert.ok(
    (
      await visitor.storage
        .from('portfolio-images')
        .upload('visitor-' + path, png, { contentType: 'image/png' })
    ).error,
  );
  assert.ok(
    (
      await ordinary.storage
        .from('portfolio-images')
        .upload('ordinary-' + path, png, { contentType: 'image/png' })
    ).error,
  );
  assert.ok(
    (
      await owner.storage
        .from('portfolio-images')
        .upload('invalid-' + path, Buffer.from('svg'), { contentType: 'image/svg+xml' })
    ).error,
  );
  assert.ok(
    (
      await owner.storage
        .from('portfolio-images')
        .upload('large-' + path, Buffer.alloc(5242881), { contentType: 'image/png' })
    ).error,
  );
  ok(await owner.storage.from('portfolio-images').upload(path, png, { contentType: 'image/png' }));
  const publicUrl = owner.storage.from('portfolio-images').getPublicUrl(path).data.publicUrl;
  assert.equal((await fetch(publicUrl)).status, 200);
  ok(
    await owner.storage
      .from('portfolio-images')
      .upload(path, png, { contentType: 'image/png', upsert: true }),
  );
  ok(await owner.storage.from('portfolio-images').remove([path]));
  ok(await owner.from('skills').delete().eq('id', record.id));
  ok(await owner.auth.signOut());
  assert.ok((await owner.from('skills').insert({ translations, published: true })).error);
  console.log(
    'PASS: login, administrator permission, anonymous/non-admin RLS, drafts, bilingual publication, runtime updates, Storage MIME/size/permissions and logout.',
  );
} finally {
  if (records.length) await root.from('skills').delete().in('id', records);
  if (objects.length) await root.storage.from('portfolio-images').remove(objects);
  for (const id of users) await root.auth.admin.deleteUser(id);
}
