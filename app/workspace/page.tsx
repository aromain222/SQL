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
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-800 tracking-tight">DataChat</span>
        </div>
        <Link href="/" className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors">
          + Upload new file
        </Link>
      </header>
      <Workspace
        key={`${initialActiveId ?? "none"}:${datasets.length}`}
        initialDatasets={datasets}
        initialActiveId={initialActiveId}
      />
    </div>
  );
}
