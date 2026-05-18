import fs from "fs";
import path from "path";
import type { DatasetMeta } from "@/types";

function metaPath(datasetId: string): string {
  return path.join(process.cwd(), "uploads", datasetId, "meta.json");
}

export function saveMeta(meta: DatasetMeta): void {
  const dir = path.join(process.cwd(), "uploads", meta.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(metaPath(meta.id), JSON.stringify(meta, null, 2));
}

export function loadMeta(datasetId: string): DatasetMeta | null {
  const p = metaPath(datasetId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as DatasetMeta;
}
