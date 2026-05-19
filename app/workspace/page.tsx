import Link from "next/link";
import { loadMeta } from "@/lib/meta";
import { uploadsRoot } from "@/lib/paths";
import Workspace from "@/components/Workspace";
import type { DatasetMeta } from "@/types";
import fs from "fs";

function loadAllDatasets(): DatasetMeta[] {
  const uploadsDir = uploadsRoot();
  if (!fs.existsSync(uploadsDir)) return [];
  const dirs = fs.readdirSync(uploadsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const datasets: DatasetMeta[] = [];
  for (const id of dirs) {
    const meta = loadMeta(id);
    if (meta) datasets.push(meta);
  }
  return datasets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const datasets = loadAllDatasets();
  const initialActiveId = id && datasets.find((d) => d.id === id) ? id : (datasets[0]?.id ?? null);

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa]">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">DataChat</span>
        </div>
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">Upload new file</Link>
      </header>
      <Workspace initialDatasets={datasets} initialActiveId={initialActiveId} />
    </div>
  );
}
