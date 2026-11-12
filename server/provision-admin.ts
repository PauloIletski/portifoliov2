import { randomBytes } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { ObjectId, type Db, type MongoClient } from 'mongodb';

interface Administrator {
  _id: string;
  userId: string;
  email: string;
}

export async function provisionAdministrator(
  db: Db,
  client: MongoClient,
  address: string,
): Promise<Administrator> {
  const email = address.toLowerCase().trim();
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const collection = db.collection<Administrator>('administrators');
      const current = await collection.findOne({ _id: 'admin' }, { session });
      if (current) {
        if (current.email !== email) throw new Error('Administrador diferente já cadastrado.');
        return;
      }
      if (await db.collection('user').findOne({ email }, { session }))
        throw new Error('Usuário existente sem autorização. Revise antes de provisionar.');
      const id = new ObjectId();
      const now = new Date();
      await db
        .collection('user')
        .insertOne(
          {
            _id: id,
            name: 'Administrador',
            email,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
          },
          { session },
        );
      await db
        .collection('account')
        .insertOne(
          {
            _id: new ObjectId(),
            userId: id,
            accountId: id.toHexString(),
            providerId: 'credential',
            password: await hashPassword(randomBytes(48).toString('base64url')),
            createdAt: now,
            updatedAt: now,
          },
          { session },
        );
      await collection.insertOne({ _id: 'admin', userId: id.toHexString(), email }, { session });
    });
    const administrator = await db
      .collection<Administrator>('administrators')
      .findOne({ _id: 'admin' });
    if (!administrator) throw new Error('Administrador não confirmado pelo banco.');
    return administrator;
  } finally {
    await session.endSession();
  }
}
