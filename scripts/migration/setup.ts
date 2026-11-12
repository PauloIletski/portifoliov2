import { existsSync } from 'node:fs';
import { closeDatabase, database } from '../../server/database.js';
import { setupDatabase } from '../../server/setup.js';
if (existsSync('.env')) process.loadEnvFile('.env');
try {
  const db = await database();
  await setupDatabase(db);
  console.log('Coleções e índices configurados.', { database: db.databaseName });
} finally {
  await closeDatabase();
}
