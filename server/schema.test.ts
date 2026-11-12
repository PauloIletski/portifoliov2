import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePayload, uuidSchema } from './schema.js';
import { hash, rewriteAssets } from '../scripts/migration/snapshot.js';

const draft = () => ({
  position: 0,
  published: false,
  translations: {
    'pt-BR': { name: '', role: '', description: '', descriptionMore: '', principles: [] },
    'en-US': { name: '', role: '', description: '', descriptionMore: '', principles: [] },
  },
});
test('drafts accept empty fields, publication requires both complete translations', () => {
  assert.doesNotThrow(() => parsePayload('profiles', draft()));
  assert.throws(() => parsePayload('profiles', { ...draft(), published: true }));
  assert.throws(() => parsePayload('profiles', { ...draft(), position: -1 }));
  assert.throws(() => parsePayload('profiles', { ...draft(), unexpected: true }));
});
test('contacts reject multiple channels, unknown types and unsafe URLs', () => {
  const contact = (value: unknown) => ({
    position: 0,
    published: true,
    translations: {
      'pt-BR': { name: 'Contato', channels: value },
      'en-US': { name: 'Contact', channels: value },
    },
  });
  assert.doesNotThrow(() =>
    parsePayload(
      'contacts',
      contact([{ type: 'email', value: 'test@example.com', visible: true }]),
    ),
  );
  assert.throws(() => parsePayload('contacts', contact([])));
  assert.throws(() =>
    parsePayload(
      'contacts',
      contact([{ type: 'website', value: 'javascript:alert(1)', visible: true }]),
    ),
  );
  assert.throws(() =>
    parsePayload(
      'contacts',
      contact([{ type: 'website', value: 'https://user:password@example.com', visible: true }]),
    ),
  );
});
test('maintenance supports legacy records and requires shared scheduling and social links', () => {
  const payload = { name: 'Em breve', launchAt: '2030-12-01T12:00:00Z', technologies: ['angular'] };
  const row = {
    position: 0,
    published: true,
    translations: { 'pt-BR': payload, 'en-US': payload },
  };
  assert.doesNotThrow(() => parsePayload('maintenance', row));
  const invalidDate = { ...payload, launchAt: '2030-02-31T12:00:00Z' };
  assert.throws(() => parsePayload('maintenance', { ...row, translations: { 'pt-BR': invalidDate, 'en-US': invalidDate } }));
  assert.throws(() =>
    parsePayload('maintenance', {
      ...row,
      translations: { ...row.translations, 'en-US': { ...payload, launchAt: '' } },
    }),
  );
});
test('migration hashes ignore object key order and asset rewriting requires exported references', () => {
  assert.equal(hash({ a: 1, b: 2 }), hash({ b: 2, a: 1 }));
  assert.deepEqual(rewriteAssets({ image: { src: 'old' } }, { old: 'new' }, 'https://source'), {
    image: { src: 'new' },
  });
  assert.throws(() =>
    rewriteAssets('https://source/storage/v1/object/public/missing', {}, 'https://source'),
  );
  assert.equal(uuidSchema.safeParse('not-an-id').success, false);
});
