"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DatasetMeta, QueryResult, HistoryEntry } from "@/types";
import SchemaPanel from "./SchemaPanel";
import ResultsPanel from "./ResultsPanel";
import DatasetSidebar from "./DatasetSidebar";

function suggestedQuestions(columns: DatasetMeta["columns"]): string[] {
  const numericCols = columns.filter((c) => c.type === "integer" || c.type === "real");
  const dateCols = columns.filter((c) => c.type === "date");
  const qs: string[] = [];
  if (numericCols[0] && columns[0]) qs.push(`What is the total ${numericCols[0].originalName} by ${columns[0].originalName}?`);
  if (numericCols[0]) qs.push(`Show the top 10 rows by ${numericCols[0].originalName}.`);
  if (dateCols[0] && numericCols[0]) qs.push(`How does ${numericCols[0].originalName} change over ${dateCols[0].originalName}?`);
  if (numericCols[0]) qs.push(`What is the average ${numericCols[0].originalName}?`);
  qs.push("How many rows are in this dataset?");
  return qs.slice(0, 4);
}

interface Props {
  initialDatasets: DatasetMeta[];
  initialActiveId: string | null;
}

export default function Workspace({ initialDatasets, initialActiveId }: Props) {
  const router = useRouter();
  const [datasets, setDatasets] = useState<DatasetMeta[]>(initialDatasets);
  const [activeId, setActiveId] = useState<string | null>(initialActiveId);
  const [histories, setHistories] = useState<Record<string, HistoryEntry[]>>({});
  const [activeHistoryId, setActiveHistoryId] = useState<Record<string, string | null>>({});
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeMeta = datasets.find((d) => d.id === activeId) ?? null;
  const activeHistory = activeId ? (histories[activeId] ?? []) : [];
  const currentHistoryId = activeId ? (activeHistoryId[activeId] ?? null) : null;
  const activeResult = activeHistory.find((h) => h.id === currentHistoryId)?.result ?? null;

  const switchDataset = useCallback((id: string) => {
    setActiveId(id);
    setQuestion("");
    setError("");
  }, []);

  const submit = useCallback(async (q: string) => {
    if (!activeId || !q.trim() || loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: activeId, question: q.trim() }),
      });
      const data = await res.json() as QueryResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Query failed.");
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        question: q.trim(),
        result: data,
        timestamp: Date.now(),
      };
      setHistories((prev) => ({ ...prev, [activeId]: [entry, ...(prev[activeId] ?? [])] }));
      setActiveHistoryId((prev) => ({ ...prev, [activeId]: entry.id }));
      setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query failed.");
    } finally {
      setLoading(false);
    }
  }, [activeId, loading]);

  const handleRename = useCallback(async (id: string, name: string) => {
    const res = await fetch(`/api/dataset/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const { meta } = await res.json() as { meta: DatasetMeta };
      setDatasets((prev) => prev.map((d) => (d.id === id ? meta : d)));
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/dataset/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDatasets((prev) => {
        const next = prev.filter((d) => d.id !== id);
        if (activeId === id) setActiveId(next[0]?.id ?? null);
        return next;
      });
      setHistories((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  }, [activeId]);

  const handleUploadClick = useCallback(() => router.push("/"), [router]);

  const historyCount = Object.fromEntries(
    Object.entries(histories).map(([id, h]) => [id, h.length])
  );

  const suggested = activeMeta ? suggestedQuestions(activeMeta.columns) : [];

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Dataset sidebar */}
      <DatasetSidebar
        datasets={datasets}
        activeId={activeId}
        onSelect={switchDataset}
        onRename={handleRename}
        onDelete={handleDelete}
        onUploadClick={handleUploadClick}
        historyCount={historyCount}
      />

      {/* Center */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!activeMeta ? (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <p className="text-gray-400 text-sm mb-3">No dataset selected.</p>
              <button
                onClick={handleUploadClick}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload a dataset
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Query history strip */}
            {activeHistory.length > 0 && (
              <div className="border-b border-gray-100 bg-white px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
                {activeHistory.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setActiveHistoryId((prev) => ({ ...prev, [activeId!]: h.id }))}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors max-w-[200px] truncate ${
                      currentHistoryId === h.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {h.question}
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!activeResult && (
                <div className="max-w-xl mx-auto mt-8 text-center">
                  <p className="text-gray-500 text-sm mb-5">
                    Ask a question about <span className="font-medium text-gray-800">{activeMeta.name}</span>
                  </p>
                  <div className="space-y-2">
                    {suggested.map((q) => (
                      <button
                        key={q}
                        onClick={() => submit(q)}
                        className="block w-full text-left text-sm px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {activeResult && <ResultsPanel result={activeResult} />}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
              <div className="flex items-end gap-3 max-w-3xl mx-auto">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(question); } }}
                  placeholder={`Ask about ${activeMeta.name}…`}
                  className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  disabled={loading}
                />
                <button
                  onClick={() => submit(question)}
                  disabled={loading || !question.trim()}
                  className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Running
                    </span>
                  ) : "Ask"}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-2">Enter to submit · Shift+Enter for new line</p>
            </div>
          </>
        )}
      </main>

      {/* Schema panel */}
      {activeMeta && <SchemaPanel columns={activeMeta.columns} />}
    </div>
  );
}
