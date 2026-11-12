import { existsSync } from 'node:fs';
import { provisionAdministrator } from '../../server/provision-admin.js';
import { auth } from '../../server/auth.js';
import { closeDatabase, database, mongoClient } from '../../server/database.js';
import { readSnapshot } from './snapshot.js';
import { setupDatabase } from '../../server/setup.js';

if (existsSync('.env')) process.loadEnvFile('.env');
try {
  const directory = process.argv[2];
  if (!directory)
    throw new Error('Informe o diretório da exportação validada para identificar o administrador.');
  const snapshot = await readSnapshot(directory);
  const email = snapshot.admin.email.toLowerCase().trim();
  const baseURL = process.env['BETTER_AUTH_URL'];
  if (!baseURL || !process.env['RESEND_API_KEY'] || !process.env['EMAIL_FROM'])
    throw new Error('Configure Better Auth e Resend antes de provisionar.');
  if ((process.env['BETTER_AUTH_SECRET'] || '').length < 32)
    throw new Error('Configure BETTER_AUTH_SECRET com pelo menos 32 caracteres.');
  const db = await database();
  await setupDatabase(db);
  await provisionAdministrator(db, await mongoClient(), email);
  await (
    await auth()
  ).api.requestPasswordReset({
    body: { email, redirectTo: new URL('/admin/reset-password', baseURL).href },
  });
  console.log(
    'Administrador provisionado. Link para definir senha solicitado para o e-mail da origem.',
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falha ao provisionar administrador.');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
