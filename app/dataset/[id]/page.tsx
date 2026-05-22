import { notFound } from "next/navigation";
import Link from "next/link";
import { openDb, runQuery } from "@/lib/db";
import WarningBanner from "@/components/WarningBanner";
import { DatasetIdError } from "@/lib/dataset-id";
import type { DatasetMeta } from "@/types";
import { loadMetaWithRestore } from "@/lib/storage";

export default async function DatasetPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let meta: DatasetMeta | null;
  try {
    meta = await loadMetaWithRestore(id);
  } catch (err) {
    if (err instanceof DatasetIdError) notFound();
    throw err;
  }
  if (!meta) notFound();

  const db = openDb(id, { readonly: true, fileMustExist: true });
  const { rows } = runQuery(db, `SELECT * FROM "${meta.tableName}" LIMIT 20`);
  db.close();

  return (
    <main className="min-h-screen bg-[#f8f9fa]">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← Upload new file</Link>
          <h1 className="text-lg font-semibold text-gray-900 mt-0.5">{meta.name}</h1>
          <p className="text-xs text-gray-500">{meta.rowCount.toLocaleString()} rows · {meta.columns.length} columns · imported {new Date(meta.createdAt).toLocaleDateString()}</p>
        </div>
        <Link
          href={`/workspace?id=${id}`}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start asking →
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {meta.warnings.length > 0 && <WarningBanner warnings={meta.warnings} />}

        {/* Column overview */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Columns ({meta.columns.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {meta.columns.map((col) => (
              <div key={col.sanitizedName} className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    col.type === "integer" ? "bg-blue-50 text-blue-700" :
                    col.type === "real" ? "bg-purple-50 text-purple-700" :
                    col.type === "date" ? "bg-green-50 text-green-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{col.type}</span>
                  {col.isMostlyEmpty && <span className="text-amber-400 text-xs" title="Mostly empty">⚠</span>}
                </div>
                <p className="text-xs font-medium text-gray-800 truncate" title={col.originalName}>{col.originalName}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{col.uniqueCount} unique · {col.nullCount} null</p>
                {col.sampleValues.length > 0 && (
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{col.sampleValues.slice(0, 2).join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Data preview */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Preview (first 20 rows)</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {meta.columns.map((col) => (
                    <th key={col.sanitizedName}>{col.originalName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {meta.columns.map((col) => (
                      <td key={col.sanitizedName}>
                        {row[col.sanitizedName] == null ? <span className="text-gray-300">—</span> : String(row[col.sanitizedName])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
