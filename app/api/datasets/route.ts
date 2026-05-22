import { NextResponse } from "next/server";
import fs from "fs";
import { uploadsRoot } from "@/lib/paths";
import { loadMeta } from "@/lib/meta";
import type { DatasetMeta } from "@/types";
import { DatasetIdError } from "@/lib/dataset-id";
import { listStoredMetas } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() {
  const root = uploadsRoot();
  const byId = new Map<string, DatasetMeta>();

  if (fs.existsSync(root)) {
    const dirs = fs.readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const id of dirs) {
      try {
        const meta = loadMeta(id);
        if (meta) byId.set(meta.id, meta);
      } catch (err) {
        if (!(err instanceof DatasetIdError)) throw err;
      }
    }
  }

  for (const meta of await listStoredMetas().catch(() => [])) {
    if (!byId.has(meta.id)) byId.set(meta.id, meta);
  }

  const datasets = [...byId.values()];
  datasets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json({ datasets });
}
