import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { MongoServerError } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { auth } from './auth.js';
import { database } from './database.js';
import { type ContentDocument, kindSchema, parsePayload, toRow, uuidSchema } from './schema.js';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export const requireAdmin: RequestHandler = async (request, _response, next) => {
  const authentication = await auth();
  const session = await authentication.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  if (!session) throw new HttpError(401, 'Entre para continuar.');
  const db = await database();
  const admin = await db
    .collection<{ _id: string; userId: string }>('administrators')
    .findOne({ _id: 'admin', userId: session.user.id });
  if (!admin) throw new HttpError(403, 'Conta sem autorização para administrar.');
  next();
};
export function createApi() {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (request, response, next) => {
    if (!process.env['VERCEL'])
      request.headers['x-portfolio-client-ip'] = request.socket.remoteAddress;
    const started = performance.now();
    response.on('finish', () =>
      console.info('api.request', {
        method: request.method,
        route: request.path.startsWith('/auth') ? '/api/auth' : request.route?.path || '/api',
        status: response.statusCode,
        durationMs: Math.round(performance.now() - started),
      }),
    );
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const origin = request.get('origin');
      const expected = process.env['BETTER_AUTH_URL'];
      if (!origin || !expected || origin !== new URL(expected).origin)
        throw new HttpError(403, 'Origem inválida.');
    }
    next();
  });
  // Better Auth consumes the original stream, before the JSON body parser.
  app.all('/api/auth/{*path}', async (request, response) =>
    toNodeHandler(await auth())(request, response),
  );
  // Browser clients send plain JSON; reject compressed input before creating a decoder.
  app.use(express.json({ limit: '4mb', inflate: false }));
  app.get('/api/content/:kind', async (request, response) => {
    const kind = kindSchema.parse(request.params['kind']);
    const db = await database();
    const rows = await db
      .collection<ContentDocument>(kind)
      .find({ published: true })
      .sort({ position: 1, _id: 1 })
      .toArray();
    response.json(rows.map(toRow));
  });
  app.use('/api/admin', requireAdmin);
  app.get('/api/admin/session', (_request, response) => response.json({ authorized: true }));
  app.use('/api/admin', (request, _response, next) => {
    if (process.env['ADMIN_READ_ONLY'] === 'true' && !['GET', 'HEAD'].includes(request.method))
      throw new HttpError(503, 'Edições pausadas para migração.');
    next();
  });
  app.get('/api/admin/content/:kind', async (request, response) => {
    const kind = kindSchema.parse(request.params['kind']);
    const db = await database();
    const rows = await db
      .collection<ContentDocument>(kind)
      .find()
      .sort({ position: 1, _id: 1 })
      .toArray();
    response.json(rows.map(toRow));
  });
  app.post('/api/admin/content/:kind', async (request, response) => {
    const kind = kindSchema.parse(request.params['kind']);
    const payload = parsePayload(kind, request.body);
    const document: ContentDocument = { _id: randomUUID(), ...payload };
    if (kind === 'profiles' || kind === 'maintenance') document.singleton = true;
    const db = await database();
    await db.collection<ContentDocument>(kind).insertOne(document);
    response.status(201).json(toRow(document));
  });
  app.put('/api/admin/content/:kind/:id', async (request, response) => {
    const kind = kindSchema.parse(request.params['kind']);
    const id = uuidSchema.parse(request.params['id']);
    const payload = parsePayload(kind, request.body);
    const db = await database();
    const document = await db
      .collection<ContentDocument>(kind)
      .findOneAndUpdate({ _id: id }, { $set: payload }, { returnDocument: 'after' });
    if (!document) throw new HttpError(404, 'Registro não encontrado.');
    response.json(toRow(document));
  });
  app.delete('/api/admin/content/:kind/:id', async (request, response) => {
    const kind = kindSchema.parse(request.params['kind']);
    const id = uuidSchema.parse(request.params['id']);
    const db = await database();
    const result = await db.collection<ContentDocument>(kind).deleteOne({ _id: id });
    if (!result.deletedCount) throw new HttpError(404, 'Registro não encontrado.');
    response.json({ id });
  });
  app.post('/api/admin/uploads', async (request, response) => {
    const body: HandleUploadBody = z
      .object({
        type: z.literal('blob.generate-client-token'),
        payload: z
          .object({
            pathname: z.string(),
            multipart: z.boolean(),
            clientPayload: z.string().nullable(),
          })
          .strict(),
      })
      .strict()
      .parse(request.body);
    // No completion webhook is registered; clients save the returned URL in the content form.
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^portfolio-images\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(pathname))
          throw new HttpError(400, 'Caminho de imagem inválido.');
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: 5 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    response.json(result);
  });
  app.use('/api', (_request, _response) => {
    throw new HttpError(404, 'Endpoint não encontrado.');
  });
  const errors: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    if (error instanceof Error && 'status' in error && error.status === 415) {
      response.status(415).json({ message: 'Codificação de conteúdo não suportada.' });
      return;
    }
    if (error instanceof HttpError) {
      response.status(error.status).json({ message: error.message });
      return;
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      response
        .status(400)
        .json({ message: 'Dados inválidos. Revise os campos preenchidos e os obrigatórios em português.' });
      return;
    }
    if (error instanceof Error && 'status' in error && error.status === 413) {
      response.status(413).json({ message: 'Requisição muito grande.' });
      return;
    }
    if (error instanceof MongoServerError && error.code === 11000) {
      response.status(409).json({ message: 'Este cadastro já existe.' });
      return;
    }
    if (error instanceof MongoServerError && error.code === 121) {
      response.status(400).json({ message: 'Dados rejeitados pelo banco.' });
      return;
    }
    console.error('api.request.failed', { type: error instanceof Error ? error.name : 'unknown' });
    response.status(503).json({ message: 'Serviço indisponível. Tente novamente.' });
  };
  app.use(errors);
  return app;
}
export default createApi();
