import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { Resend } from 'resend';
import { databaseName, mongoClient } from './database.js';

let pending: ReturnType<typeof initialize> | undefined;
export function auth() {
  return (pending ??= initialize().catch((error) => {
    pending = undefined;
    throw error;
  }));
}
async function initialize() {
  const secret = process.env['BETTER_AUTH_SECRET'];
  const baseURL = process.env['BETTER_AUTH_URL'];
  if (!secret || secret.length < 32 || !baseURL)
    throw new Error('Configure BETTER_AUTH_SECRET e BETTER_AUTH_URL.');
  const client = await mongoClient();
  return betterAuth({
    secret,
    baseURL,
    database: mongodbAdapter(client.db(databaseName()), { client }),
    trustedOrigins: [new URL(baseURL).origin],
    advanced: {
      ipAddress: {
        ipAddressHeaders: process.env['VERCEL']
          ? ['x-vercel-forwarded-for']
          : ['x-portfolio-client-ip'],
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        const key = process.env['RESEND_API_KEY'];
        const from = process.env['EMAIL_FROM'];
        if (!key || !from) throw new Error('Configure RESEND_API_KEY e EMAIL_FROM.');
        const { error } = await new Resend(key).emails.send({
          from,
          to: user.email,
          subject: 'Redefinir senha do portfólio',
          text: `Use este link para definir sua senha do painel do portfólio:\n\n${url}\n\nSe você não solicitou, ignore esta mensagem.`,
        });
        if (error) throw new Error('Falha no envio do e-mail de recuperação.');
      },
    },
    rateLimit: { enabled: true, storage: 'database' },
  });
}
