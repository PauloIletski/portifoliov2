import { MongoClient } from 'mongodb';

let pending: Promise<MongoClient> | undefined;

export function databaseName(): string {
  return process.env['MONGODB_DATABASE'] || 'portfoliov2';
}
export function databaseUri(): string {
  const uri = process.env['MONGODB_URI'];
  if (!uri) throw new Error('MONGODB_URI ausente.');
  return uri
    .replace('<db_username>', encodeURIComponent(process.env['MONGODB_USERNAME'] || ''))
    .replace('<db_password>', encodeURIComponent(process.env['MONGODB_PASSWORD'] || ''));
}
export function mongoClient(): Promise<MongoClient> {
  return (pending ??= connect().catch((error) => {
    pending = undefined;
    throw error;
  }));
}
async function connect(): Promise<MongoClient> {
  const client = new MongoClient(databaseUri());
  // Driver defaults until pool measurements justify tuning this serverless workload.
  client.on('connectionCheckOutFailed', (event) =>
    console.error('mongo.pool.checkout.failed', { reason: event.reason }),
  );
  client.on('connectionPoolCreated', () => console.info('mongo.pool.created'));
  client.on('connectionCreated', () => console.info('mongo.connection.created'));
  try {
    return await client.connect();
  } catch (error) {
    pending = undefined;
    await client.close();
    throw error;
  }
}
export async function database() {
  return (await mongoClient()).db(databaseName());
}
export async function closeDatabase(): Promise<void> {
  const connection = pending;
  pending = undefined;
  await (await connection)?.close();
}
