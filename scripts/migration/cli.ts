import { existsSync } from 'node:fs';
import path from 'node:path';
import { closeDatabase, database } from '../../server/database.js';
import { setupDatabase } from '../../server/setup.js';
import { exportSupabase } from './export.js';
import { importSnapshot, verifySnapshot } from './import.js';
import { readSnapshot } from './snapshot.js';

if (existsSync('.env')) process.loadEnvFile('.env');
const [command, destination] = process.argv.slice(2);
try {
  if (!destination)
    throw new Error(
      'Informe o diretório local da exportação. Exemplo: npm.cmd run db:export -- ./tmp/migration',
    );
  const directory = path.resolve(destination);
  switch (command) {
    case 'export':
      await exportSupabase(directory);
      break;
    case 'validate':
      await readSnapshot(directory);
      console.log('Exportação válida.');
      break;
    case 'import': {
      await readSnapshot(directory);
      const db = await database();
      await setupDatabase(db);
      await importSnapshot(db, directory);
      break;
    }
    case 'verify':
      await verifySnapshot(await database(), directory);
      break;
    default:
      throw new Error('Comando inválido. Use export, validate, import ou verify.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falha na migração.');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
