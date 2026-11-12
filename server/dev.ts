import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
if (existsSync('.env')) process.loadEnvFile('.env');
const { default: app } = await import('./app.js');
const root = fileURLToPath(new URL('../dist/portfoliov2/browser/', import.meta.url));
app.use(express.static(root));
app.get('/{*route}', (request, response, next) => {
  if (path.extname(request.path)) return next();
  const locale = request.path === '/en' || request.path.startsWith('/en/') ? 'en' : '';
  response.sendFile(path.join(root, locale, 'index.html'));
});
const port = Number(process.env['PORT'] || 8080);
app.listen(port, '127.0.0.1', () => console.log(`API e preview em http://127.0.0.1:${port}`));
