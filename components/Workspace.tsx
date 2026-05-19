"use client";

import { useState, useRef, useCallback } from "react";
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
  return qs.slice(0, 5);
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
    router.replace(`/workspace?id=${id}`);
  }, [router]);

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
      <DatasetSidebar
        datasets={datasets}
        activeId={activeId}
        onSelect={switchDataset}
        onRename={handleRename}
        onDelete={handleDelete}
        onUploadClick={handleUploadClick}
        historyCount={historyCount}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fa]">
        {!activeMeta ? (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-700 font-medium mb-1">No dataset loaded</p>
              <p className="text-gray-400 text-sm mb-4">Upload a CSV to start asking questions</p>
              <button
                onClick={handleUploadClick}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload a CSV
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Previous questions strip */}
            {activeHistory.length > 0 && (
              <div className="border-b border-gray-200 bg-white px-4 py-2 flex items-center gap-3 overflow-x-auto shrink-0">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">History</span>
                <div className="flex items-center gap-2 overflow-x-auto">
                  {activeHistory.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => setActiveHistoryId((prev) => ({ ...prev, [activeId!]: h.id }))}
                      className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors max-w-[220px] truncate ${
                        currentHistoryId === h.id
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                      }`}
                    >
                      {h.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results / empty state */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading && (
                <div className="flex items-center justify-center gap-3 py-12 text-gray-400 text-sm">
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  Generating answer…
                </div>
              )}

              {!loading && !activeResult && (
                <div className="max-w-xl mx-auto mt-6">
                  <p className="text-sm font-medium text-gray-700 mb-1">{activeMeta.name}</p>
                  <p className="text-xs text-gray-400 mb-6">
                    {activeMeta.rowCount.toLocaleString()} rows · {activeMeta.columns.length} columns
                  </p>

                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Try asking</p>
                  <div className="space-y-2">
                    {suggested.map((q) => (
                      <button
                        key={q}
                        onClick={() => submit(q)}
                        className="flex items-center gap-3 w-full text-left text-sm px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors shadow-sm"
                      >
                        <span className="text-gray-300 shrink-0">→</span>
                        {q}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-5">Or type your own question below</p>
                </div>
              )}

              {!loading && activeResult && (
                <div className="max-w-3xl mx-auto space-y-4">
                  <ResultsPanel result={activeResult} />
                  {activeHistory.length > 0 && (
                    <p className="text-xs text-gray-400 text-center">
                      Ask another question below, or pick a previous one from the history bar above.
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="max-w-3xl mx-auto mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
              <div className="flex items-end gap-3 max-w-3xl mx-auto">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(question); } }}
                  placeholder={`Ask a question about ${activeMeta.name}…`}
                  className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm"
                  disabled={loading}
                />
                <button
                  onClick={() => submit(question)}
                  disabled={loading || !question.trim()}
                  className="px-5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Running
                    </span>
                  ) : "Ask →"}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-2">
                Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Enter</kbd> to ask · <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Shift+Enter</kbd> for new line
              </p>
            </div>
          </>
        )}
      </main>

      {activeMeta && <SchemaPanel columns={activeMeta.columns} />}
    </div>
  );
}
