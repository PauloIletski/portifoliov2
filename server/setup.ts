import type { Db } from 'mongodb';
import { kinds } from './schema.js';

export async function setupDatabase(db: Db): Promise<void> {
  for (const kind of kinds) {
    const singleton = kind === 'profiles' || kind === 'maintenance';
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          '_id',
          'position',
          'published',
          'translations',
          ...(singleton ? ['singleton'] : []),
        ],
        additionalProperties: false,
        properties: {
          _id: {
            bsonType: 'string',
            pattern:
              '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
          },
          position: { bsonType: ['int', 'long', 'double'], minimum: 0, multipleOf: 1 },
          published: { bsonType: 'bool' },
          translations: {
            bsonType: 'object',
            required: ['pt-BR', 'en-US'],
            additionalProperties: false,
            properties: { 'pt-BR': { bsonType: 'object' }, 'en-US': { bsonType: 'object' } },
          },
          ...(singleton ? { singleton: { enum: [true] } } : {}),
        },
      },
    };
    if (await db.listCollections({ name: kind }).hasNext()) {
      await db.command({
        collMod: kind,
        validator,
        validationLevel: 'strict',
        validationAction: 'error',
      });
    } else {
      await db.createCollection(kind, { validator });
    }
    await db.collection(kind).createIndex({ published: 1, position: 1, _id: 1 });
    if (singleton) await db.collection(kind).createIndex({ singleton: 1 }, { unique: true });
  }
  if (!(await db.listCollections({ name: 'administrators' }).hasNext())) {
    await db.createCollection('administrators', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['_id', 'userId', 'email'],
          additionalProperties: false,
          properties: {
            _id: { enum: ['admin'] },
            userId: { bsonType: 'string' },
            email: { bsonType: 'string' },
          },
        },
      },
    });
  }
  await db.collection('administrators').createIndex({ userId: 1 }, { unique: true });
  await db.collection('user').createIndex({ email: 1 }, { unique: true });
  await db.collection('session').createIndex({ token: 1 }, { unique: true });
  await db.collection('session').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('account').createIndex({ providerId: 1, accountId: 1 }, { unique: true });
  await db.collection('verification').createIndex({ identifier: 1 });
  await db.collection('verification').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('rateLimit').createIndex({ key: 1 }, { unique: true });
}
