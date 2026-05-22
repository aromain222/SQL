import Link from "next/link";
import { loadMeta } from "@/lib/meta";
import { uploadsRoot } from "@/lib/paths";
import Workspace from "@/components/Workspace";
import type { DatasetMeta } from "@/types";
import fs from "fs";
import { DatasetIdError } from "@/lib/dataset-id";
import { listStoredMetas, loadMetaWithRestore } from "@/lib/storage";

async function loadAllDatasets(requestedId?: string): Promise<DatasetMeta[]> {
  const uploadsDir = uploadsRoot();
  const byId = new Map<string, DatasetMeta>();

  if (requestedId) {
    const requested = await loadMetaWithRestore(requestedId).catch(() => null);
    if (requested) byId.set(requested.id, requested);
  }

  if (!fs.existsSync(uploadsDir)) {
    for (const meta of await listStoredMetas().catch(() => [])) {
      if (!byId.has(meta.id)) byId.set(meta.id, meta);
    }
    return [...byId.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const dirs = fs.readdirSync(uploadsDir, { withFileTypes: true })
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

  for (const meta of await listStoredMetas().catch(() => [])) {
    if (!byId.has(meta.id)) byId.set(meta.id, meta);
  }

  return [...byId.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const datasets = await loadAllDatasets(id);
  const initialActiveId = id && datasets.find((d) => d.id === id) ? id : (datasets[0]?.id ?? null);

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa]">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">DataChat</span>
        </div>
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">Upload new file</Link>
      </header>
      <Workspace
        key={`${initialActiveId ?? "none"}:${datasets.length}`}
        initialDatasets={datasets}
        initialActiveId={initialActiveId}
      />
    </div>
  );
}
