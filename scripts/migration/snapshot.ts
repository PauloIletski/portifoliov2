import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { kinds, parsePayload, uuidSchema, type Kind, type Payload } from '../../server/schema.js';

export interface SourceRow extends Payload {
  id: string;
}
export interface Asset {
  path: string;
  url: string;
  sha256: string;
  size: number;
  contentType: string;
}
export interface Snapshot {
  version: 1;
  source: string;
  createdAt: string;
  admin: { email: string; sourceId: string };
  tables: Record<Kind, { count: number; sha256: string; rows: SourceRow[] }>;
  assets: Asset[];
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}
export function hash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
}
export function fileHash(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
export async function atomicJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file + '.partial', JSON.stringify(value, null, 2) + '\n');
  await rename(file + '.partial', file);
}
const checksum = z.string().regex(/^[a-f0-9]{64}$/);
const rawRow = z
  .object({
    id: uuidSchema,
    position: z.number().int().nonnegative(),
    published: z.boolean(),
    translations: z.record(z.string(), z.unknown()),
  })
  .strict();
const table = z
  .object({ count: z.number().int().nonnegative(), sha256: checksum, rows: z.array(rawRow) })
  .strict();
const snapshotSchema = z
  .object({
    version: z.literal(1),
    source: z.url(),
    createdAt: z.iso.datetime(),
    admin: z.object({ email: z.email(), sourceId: uuidSchema }).strict(),
    tables: z
      .object({
        projects: table,
        experiences: table,
        profiles: table,
        skills: table,
        contacts: table,
        maintenance: table,
      })
      .strict(),
    assets: z.array(
      z
        .object({
          path: z.string().min(1),
          url: z.url(),
          sha256: checksum,
          size: z.number().int().nonnegative(),
          contentType: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();

export async function readSnapshot(directory: string): Promise<Snapshot> {
  const raw = snapshotSchema.parse(
    JSON.parse(await readFile(path.join(directory, 'snapshot.json'), 'utf8')),
  );
  for (const kind of kinds) {
    const data = raw.tables[kind];
    if (data.count !== data.rows.length || hash(data.rows) !== data.sha256)
      throw new Error(`Checksum ou contagem inválidos em ${kind}.`);
    if (new Set(data.rows.map((row) => row.id)).size !== data.count)
      throw new Error(`UUID duplicado em ${kind}.`);
    if (['profiles', 'maintenance'].includes(kind) && data.count > 1)
      throw new Error(`Cadastro único duplicado em ${kind}.`);
    for (const row of data.rows) {
      const { id, ...payload } = row;
      parsePayload(kind, payload);
    }
  }
  const urls = new Set<string>();
  const paths = new Set<string>();
  for (const asset of raw.assets) {
    if (urls.has(asset.url) || paths.has(asset.path))
      throw new Error('Arquivo duplicado no manifesto.');
    urls.add(asset.url);
    paths.add(asset.path);
    const bytes = await readFile(path.join(directory, 'assets', asset.sha256));
    if (bytes.length !== asset.size || fileHash(bytes) !== asset.sha256)
      throw new Error(`Arquivo corrompido: ${asset.path}`);
  }
  const availableAssets = Object.fromEntries(
    raw.assets.flatMap((asset) => [
      [asset.url, asset.url],
      [decodeURI(asset.url), asset.url],
    ]),
  );
  for (const kind of kinds) {
    for (const row of raw.tables[kind].rows) rewriteAssets(row, availableAssets, raw.source);
  }
  return raw as Snapshot;
}

export function rewriteAssets(
  value: unknown,
  mapping: Record<string, string>,
  source: string,
): unknown {
  if (typeof value === 'string') {
    if (mapping[value]) return mapping[value];
    if (value.startsWith(source + '/storage/v1/object/'))
      throw new Error('Referência Storage sem arquivo exportado.');
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => rewriteAssets(item, mapping, source));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, rewriteAssets(item, mapping, source)]),
    );
  return value;
}
