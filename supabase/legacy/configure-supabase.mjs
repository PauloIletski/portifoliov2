import { writeFileSync } from 'node:fs';
try {
  process.loadEnvFile('.env');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const url = process.env['SUPABASE_URL'] ?? '';
const publishableKey = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? '';
if (
  (url || publishableKey) &&
  (!/^https?:\/\//.test(url) || !publishableKey.startsWith('sb_publishable_'))
) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY (sb_publishable_...).');
}
writeFileSync('public/supabase-config.json', JSON.stringify({ url, publishableKey }) + '\n');
