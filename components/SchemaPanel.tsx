import type { ColumnMeta } from "@/types";

const TYPE_COLOR: Record<ColumnMeta["type"], string> = {
  text: "bg-gray-100 text-gray-600",
  integer: "bg-blue-50 text-blue-700",
  real: "bg-purple-50 text-purple-700",
  date: "bg-green-50 text-green-700",
};

export default function SchemaPanel({ columns }: { columns: ColumnMeta[] }) {
  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">Schema</p>
      </div>
      <ul className="py-2">
        {columns.map((col) => (
          <li key={col.sanitizedName} className="px-4 py-2 hover:bg-gray-50">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${TYPE_COLOR[col.type]}`}
              >
                {col.type}
              </span>
              {col.isMostlyEmpty && (
                <span title="Mostly empty" className="text-amber-400 text-xs">⚠</span>
              )}
            </div>
            <p className="text-xs text-gray-800 font-medium mt-1 truncate" title={col.originalName}>
              {col.originalName}
            </p>
            {col.sampleValues.length > 0 && (
              <p className="text-[10px] text-gray-400 truncate mt-0.5">
                e.g. {col.sampleValues.slice(0, 2).join(", ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
