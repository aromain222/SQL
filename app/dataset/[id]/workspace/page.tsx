import { notFound } from "next/navigation";
import Link from "next/link";
import { loadMeta } from "@/lib/meta";
import { openDb, runQuery } from "@/lib/db";
import Workspace from "@/components/Workspace";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = loadMeta(id);
  if (!meta) notFound();

  const db = openDb(id);
  const { rows: preview } = runQuery(db, `SELECT * FROM "${meta.tableName}" LIMIT 20`);
  db.close();

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa]">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/dataset/${id}`} className="text-xs text-gray-400 hover:text-gray-600">← Preview</Link>
          <span className="text-gray-200">|</span>
          <p className="text-sm font-semibold text-gray-800">{meta.name}</p>
          <span className="text-[11px] text-gray-400">{meta.rowCount.toLocaleString()} rows</span>
        </div>
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">Upload new file</Link>
      </header>
      <Workspace meta={meta} initialPreview={preview} />
    </div>
  );
}
