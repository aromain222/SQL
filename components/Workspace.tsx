"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { DatasetMeta, QueryResult, HistoryEntry } from "@/types";
import SchemaPanel from "./SchemaPanel";
import ResultsPanel from "./ResultsPanel";
import DatasetSidebar from "./DatasetSidebar";
import { buildStarterAnalyses } from "@/lib/starter-questions";

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

  const starters = activeMeta ? buildStarterAnalyses(activeMeta) : [];

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
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <p className="text-slate-700 font-semibold mb-1">No dataset loaded</p>
              <p className="text-slate-400 text-sm mb-5">Upload a CSV to start asking questions</p>
              <button
                onClick={handleUploadClick}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
              >
                Upload a CSV
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* History strip */}
            {activeHistory.length > 0 && (
              <div className="border-b border-slate-200 bg-white px-4 py-2 flex items-center gap-2.5 shrink-0">
                <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                  {activeHistory.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => setActiveHistoryId((prev) => ({ ...prev, [activeId!]: h.id }))}
                      className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors max-w-[200px] truncate cursor-pointer ${
                        currentHistoryId === h.id
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
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
                <div className="max-w-3xl mx-auto space-y-3">
                  <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                    <div className="flex gap-1 px-4 py-2.5 border-b border-slate-100">
                      {[60, 44, 44, 36].map((w, i) => (
                        <div key={i} className="skeleton h-6 rounded-full" style={{ width: w }} />
                      ))}
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="skeleton h-4 w-3/4" />
                      <div className="skeleton h-4 w-1/2" />
                      <div className="mt-5 skeleton h-10 w-36 rounded-lg" />
                      <div className="skeleton h-3.5 w-full mt-2" />
                      <div className="skeleton h-3.5 w-5/6" />
                      <div className="skeleton h-3.5 w-2/3" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 text-center animate-pulse">Generating answer…</p>
                </div>
              )}

              {!loading && !activeResult && (
                <div className="max-w-xl mx-auto mt-6">
                  <p className="text-sm font-semibold text-slate-800 mb-0.5">{activeMeta.name}</p>
                  <p className="text-xs text-slate-400 mb-6">
                    {activeMeta.rowCount.toLocaleString()} rows · {activeMeta.columns.length} columns
                  </p>

                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suggested analyses</p>
                    {starters[0] && (
                      <button
                        onClick={() => submit(starters[0].question)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        Run first →
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {starters.map((starter) => (
                      <button
                        key={starter.question}
                        onClick={() => submit(starter.question)}
                        className="flex items-start gap-3 w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors shadow-sm cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span>
                          <span className="block text-sm font-medium">{starter.title}</span>
                          <span className="block text-xs text-slate-400 mt-0.5">{starter.reason}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 text-center mt-5">Or type your own question below</p>
                </div>
              )}

              {!loading && activeResult && (
                <div className="max-w-3xl mx-auto space-y-4">
                  <ResultsPanel result={activeResult} onFollowUp={(q) => { setQuestion(q); submit(q); }} />
                  {activeHistory.length > 0 && (
                    <p className="text-xs text-gray-400 text-center">
                      Ask another question below, or pick a previous one from the history bar above.
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="max-w-3xl mx-auto mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <svg className="w-4 h-4 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="border-t border-slate-200 bg-white px-6 py-4 shrink-0">
              <div className="flex items-end gap-2.5 max-w-3xl mx-auto">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(question); } }}
                  placeholder={`Ask a question about ${activeMeta.name}…`}
                  className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm text-slate-800 placeholder:text-slate-400"
                  disabled={loading}
                />
                <button
                  onClick={() => submit(question)}
                  disabled={loading || !question.trim()}
                  title="Send (Enter)"
                  className="w-11 h-11 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm cursor-pointer"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px]">Enter</kbd> to send &nbsp;·&nbsp; <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px]">Shift+Enter</kbd> for new line
              </p>
            </div>
          </>
        )}
      </main>

      {activeMeta && <SchemaPanel columns={activeMeta.columns} />}
    </div>
  );
}
