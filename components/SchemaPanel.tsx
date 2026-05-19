"use client";

import { useState } from "react";
import type { ColumnMeta } from "@/types";

const TYPE_COLOR: Record<ColumnMeta["type"], string> = {
  text: "bg-gray-100 text-gray-500",
  integer: "bg-blue-50 text-blue-600",
  real: "bg-purple-50 text-purple-600",
  date: "bg-green-50 text-green-600",
};

function ColRow({ col }: { col: ColumnMeta }) {
  const [copied, setCopied] = useState(false);
  return (
    <li
      className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer group"
      title={`Click to copy column name`}
      onClick={() => {
        navigator.clipboard.writeText(col.originalName);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLOR[col.type]}`}>
          {col.type}
        </span>
        <span className={`text-[10px] transition-opacity ${copied ? "opacity-100 text-green-500" : "opacity-0 group-hover:opacity-60 text-gray-400"}`}>
          {copied ? "copied!" : "copy"}
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
  );
}

export default function SchemaPanel({ columns }: { columns: ColumnMeta[] }) {
  return (
    <aside className="w-56 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">Columns</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Click any column to copy its name</p>
      </div>
      <ul className="flex-1 overflow-y-auto py-1 divide-y divide-gray-50">
        {columns.map((col) => (
          <ColRow key={col.sanitizedName} col={col} />
        ))}
      </ul>
      <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400">
        {columns.length} columns
      </div>
    </aside>
  );
}
