import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { head, put } from '@vercel/blob';
import type { Collection, Db } from 'mongodb';
import { type ContentDocument, kinds, parsePayload } from '../../server/schema.js';
import {
  atomicJson,
  fileHash,
  hash,
  readSnapshot,
  rewriteAssets,
  type Snapshot,
} from './snapshot.js';

interface Ledger {
  _id: string;
  sourceHash: string;
  targetHash: string;
}
interface BlobMapping {
  _id: string;
  url: string;
  sha256: string;
  source: string;
}

export async function importRecord(
  collection: Collection<ContentDocument>,
  ledger: Collection<Ledger>,
  document: ContentDocument,
  sourceHash: string,
): Promise<void> {
  const id = `${collection.collectionName}/${document._id}`;
  const targetHash = hash(document);
  const current = await collection.findOne({ _id: document._id });
  if (current && hash(current) !== targetHash) {
    const previous = await ledger.findOne({ _id: id });
    if (!previous || previous.targetHash !== hash(current))
      throw new Error(`Conflito no destino: ${id}`);
    // Compare the entire previously read document to avoid overwriting a concurrent edit.
    const result = await collection.replaceOne(current, document);
    if (!result.matchedCount) throw new Error(`Edição concorrente no destino: ${id}`);
  } else if (!current) {
    if (await ledger.findOne({ _id: id })) throw new Error(`Registro removido no destino: ${id}`);
    await collection.insertOne(document);
  }
  await ledger.updateOne({ _id: id }, { $set: { sourceHash, targetHash } }, { upsert: true });
}

async function verifyBlob(url: string, sha256: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || fileHash(new Uint8Array(await response.arrayBuffer())) !== sha256)
    throw new Error('Arquivo Blob ausente ou divergente.');
}

export async function assetMapping(
  db: Db,
  snapshot: Snapshot,
  directory: string,
  copy: boolean,
): Promise<Record<string, string>> {
  const mapping: Record<string, string> = {};
  const saved = db.collection<BlobMapping>('migration_assets');
  for (const asset of snapshot.assets) {
    const id = hash({ source: snapshot.source, path: asset.path, sha256: asset.sha256 });
    let existing = await saved.findOne({ _id: id });
    if (!existing && copy) {
      const bytes = await readFile(path.join(directory, 'assets', asset.sha256));
      // The hash creates a deterministic destination for safe retries after interruption.
      const pathname = `portfolio-images/migrated/${asset.sha256}/${path.posix.basename(asset.path)}`;
      let url: string;
      try {
        url = (await head(pathname)).url;
      } catch (error) {
        if (!(error instanceof Error) || error.name !== 'BlobNotFoundError') throw error;
        url = (
          await put(pathname, bytes, {
            access: 'public',
            contentType: asset.contentType,
            addRandomSuffix: false,
            allowOverwrite: false,
          })
        ).url;
      }
      await verifyBlob(url, asset.sha256);
      await saved.updateOne(
        { _id: id },
        { $setOnInsert: { url, sha256: asset.sha256, source: asset.url } },
        { upsert: true },
      );
      existing = await saved.findOne({ _id: id });
    }
    if (!existing) throw new Error('Arquivo ainda não importado para Blob.');
    await verifyBlob(existing.url, asset.sha256);
    mapping[asset.url] = existing.url;
    mapping[decodeURI(asset.url)] = existing.url;
  }
  return mapping;
}

export function destinationRows(snapshot: Snapshot, mapping: Record<string, string>) {
  return kinds.map((kind) => ({
    kind,
    rows: snapshot.tables[kind].rows.map((row) => {
      const { id, ...payload } = row;
      const transformed = parsePayload(kind, rewriteAssets(payload, mapping, snapshot.source));
      const document: ContentDocument = { _id: id, ...transformed };
      if (kind === 'profiles' || kind === 'maintenance') document.singleton = true;
      return { document, sourceHash: hash(row) };
    }),
  }));
}

export async function importSnapshot(db: Db, directory: string): Promise<void> {
  const snapshot = await readSnapshot(directory);
  const mapping = await assetMapping(db, snapshot, directory, true);
  const ledger = db.collection<Ledger>('migration_records');
  for (const { kind, rows } of destinationRows(snapshot, mapping)) {
    for (const row of rows)
      await importRecord(
        db.collection<ContentDocument>(kind),
        ledger,
        row.document,
        row.sourceHash,
      );
  }
  await atomicJson(path.join(directory, `mapping-${db.databaseName}.json`), mapping);
  await verifySnapshot(db, directory);
}

export async function verifySnapshot(db: Db, directory: string): Promise<void> {
  const snapshot = await readSnapshot(directory);
  const mapping = await assetMapping(db, snapshot, directory, false);
  for (const { kind, rows } of destinationRows(snapshot, mapping)) {
    const collection = db.collection<ContentDocument>(kind);
    if ((await collection.countDocuments()) !== rows.length)
      throw new Error(`Contagem divergente: ${kind}`);
    for (const row of rows) {
      const actual = await collection.findOne({ _id: row.document._id });
      if (!actual || hash(actual) !== hash(row.document))
        throw new Error(`Conteúdo divergente: ${kind}/${row.document._id}`);
    }
  }
  console.log('Conteúdo e arquivos conferidos com a origem.', {
    database: db.databaseName,
    assets: snapshot.assets.length,
  });
}
