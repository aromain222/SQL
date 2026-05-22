import { del, list, put } from "@vercel/blob";
import fs from "fs";
import path from "path";
import { assertDatasetId } from "@/lib/dataset-id";
import { getDbPath } from "@/lib/db";
import { datasetDir } from "@/lib/paths";
import { loadMeta } from "@/lib/meta";
import type { DatasetMeta } from "@/types";

const ROOT = "datasets";

function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function prefix(datasetId: string): string {
  return `${ROOT}/${assertDatasetId(datasetId)}`;
}

function metaPathname(datasetId: string): string {
  return `${prefix(datasetId)}/meta.json`;
}

function dbPathname(datasetId: string): string {
  return `${prefix(datasetId)}/data.db`;
}

async function fetchBlobBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Blob restore failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function persistDataset(meta: DatasetMeta): Promise<void> {
  if (!blobEnabled()) return;
  const dbPath = getDbPath(meta.id);
  if (!fs.existsSync(dbPath)) return;

  await Promise.all([
    put(metaPathname(meta.id), JSON.stringify(meta, null, 2), {
      access: "public",
      allowOverwrite: true,
      contentType: "application/json",
    }),
    put(dbPathname(meta.id), fs.readFileSync(dbPath), {
      access: "public",
      allowOverwrite: true,
      contentType: "application/octet-stream",
    }),
  ]);
}

export async function persistDatasetMeta(meta: DatasetMeta): Promise<void> {
  if (!blobEnabled()) return;
  await put(metaPathname(meta.id), JSON.stringify(meta, null, 2), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function restoreDataset(datasetId: string): Promise<boolean> {
  const id = assertDatasetId(datasetId);
  const localMeta = loadMeta(id);
  const localDbExists = fs.existsSync(getDbPath(id));
  if (localMeta && localDbExists) return true;
  if (!blobEnabled()) return false;

  const result = await list({ prefix: `${prefix(id)}/`, limit: 10 });
  const metaBlob = result.blobs.find((blob) => blob.pathname.endsWith("/meta.json"));
  const dbBlob = result.blobs.find((blob) => blob.pathname.endsWith("/data.db"));
  if (!metaBlob || !dbBlob) return false;

  const [metaBuffer, dbBuffer] = await Promise.all([
    fetchBlobBuffer(metaBlob.url),
    fetchBlobBuffer(dbBlob.url),
  ]);

  fs.mkdirSync(datasetDir(id), { recursive: true });
  fs.writeFileSync(path.join(datasetDir(id), "meta.json"), metaBuffer);
  fs.writeFileSync(getDbPath(id), dbBuffer);
  return true;
}

export async function listStoredMetas(): Promise<DatasetMeta[]> {
  if (!blobEnabled()) return [];
  const result = await list({ prefix: `${ROOT}/`, limit: 1000 });
  const metaBlobs = result.blobs.filter((blob) => blob.pathname.endsWith("/meta.json"));
  const metas = await Promise.all(
    metaBlobs.map(async (blob) => {
      try {
        const buffer = await fetchBlobBuffer(blob.url);
        return JSON.parse(buffer.toString("utf-8")) as DatasetMeta;
      } catch {
        return null;
      }
    }),
  );
  return metas.filter((meta): meta is DatasetMeta => Boolean(meta));
}

export async function deleteStoredDataset(datasetId: string): Promise<void> {
  if (!blobEnabled()) return;
  const result = await list({ prefix: `${prefix(datasetId)}/`, limit: 10 });
  if (result.blobs.length === 0) return;
  await del(result.blobs.map((blob) => blob.pathname));
}

export async function loadMetaWithRestore(datasetId: string): Promise<DatasetMeta | null> {
  const id = assertDatasetId(datasetId);
  const meta = loadMeta(id);
  if (meta && fs.existsSync(getDbPath(id))) return meta;
  await restoreDataset(id);
  const restored = loadMeta(id);
  return restored && fs.existsSync(getDbPath(id)) ? restored : null;
}

export function loadLocalMeta(datasetId: string): DatasetMeta | null {
  return loadMeta(assertDatasetId(datasetId));
}
