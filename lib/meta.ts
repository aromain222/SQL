import fs from "fs";
import path from "path";
import { datasetDir } from "@/lib/paths";
import type { DatasetMeta } from "@/types";

function metaPath(datasetId: string): string {
  return path.join(datasetDir(datasetId), "meta.json");
}

export function saveMeta(meta: DatasetMeta): void {
  fs.mkdirSync(datasetDir(meta.id), { recursive: true });
  fs.writeFileSync(metaPath(meta.id), JSON.stringify(meta, null, 2));
}

export function loadMeta(datasetId: string): DatasetMeta | null {
  const p = metaPath(datasetId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as DatasetMeta;
}
