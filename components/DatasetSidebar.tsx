"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { DatasetMeta } from "@/types";

interface Props {
  datasets: DatasetMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUploadClick: () => void;
  historyCount: Record<string, number>;
}

function DatasetRow({
  meta,
  active,
  historyCount,
  onSelect,
  onRename,
  onDelete,
}: {
  meta: DatasetMeta;
  active: boolean;
  historyCount: number;
  onSelect: () => void;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(meta.name);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commitRename = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === meta.name) { setEditing(false); setDraft(meta.name); return; }
    setBusy(true);
    await onRename(trimmed);
    setEditing(false);
    setBusy(false);
  }, [draft, meta.name, onRename]);

  const handleDelete = useCallback(async () => {
    if (!confirm(`Delete "${meta.name}"? This cannot be undone.`)) return;
    setBusy(true);
    await onDelete();
  }, [meta.name, onDelete]);

  return (
    <div
      className={`group relative px-3 py-2.5 cursor-pointer transition-colors ${
        active ? "bg-blue-50" : "hover:bg-gray-50"
      }`}
      onClick={() => { if (!editing) onSelect(); }}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setEditing(false); setDraft(meta.name); }
          }}
          onClick={(e) => e.stopPropagation()}
          disabled={busy}
          className="w-full text-xs font-medium bg-white border border-blue-400 rounded px-1.5 py-0.5 outline-none"
        />
      ) : (
        <div className="flex items-start justify-between gap-1 min-w-0">
          <div className="min-w-0">
            <p className={`text-xs font-medium truncate ${active ? "text-blue-700" : "text-gray-700"}`}>
              {meta.name}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {meta.rowCount.toLocaleString()} rows
              {historyCount > 0 && ` · ${historyCount} query${historyCount > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              title="Rename"
              className="p-0.5 text-gray-400 hover:text-gray-700 rounded"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              title="Delete"
              className="p-0.5 text-gray-400 hover:text-red-500 rounded"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DatasetSidebar({
  datasets,
  activeId,
  onSelect,
  onRename,
  onDelete,
  onUploadClick,
  historyCount,
}: Props) {
  return (
    <aside className="w-52 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <div className="px-3 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">Datasets</p>
        <button
          onClick={onUploadClick}
          title="Upload new dataset"
          className="text-[10px] font-medium text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
        >
          + Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {datasets.length === 0 ? (
          <p className="text-xs text-gray-400 px-3 py-4">No datasets yet.</p>
        ) : (
          datasets.map((meta) => (
            <DatasetRow
              key={meta.id}
              meta={meta}
              active={meta.id === activeId}
              historyCount={historyCount[meta.id] ?? 0}
              onSelect={() => onSelect(meta.id)}
              onRename={(name) => onRename(meta.id, name)}
              onDelete={() => onDelete(meta.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
