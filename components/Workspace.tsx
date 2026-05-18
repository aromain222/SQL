"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { DatasetMeta, QueryResult, HistoryEntry } from "@/types";
import SchemaPanel from "./SchemaPanel";
import ResultsPanel from "./ResultsPanel";

function suggestedQuestions(columns: DatasetMeta["columns"]): string[] {
  const names = columns.map((c) => c.originalName);
  const numericCols = columns.filter((c) => c.type === "integer" || c.type === "real").map((c) => c.originalName);
  const dateCols = columns.filter((c) => c.type === "date").map((c) => c.originalName);
  const questions: string[] = [];
  if (numericCols[0] && names[0]) questions.push(`What is the total ${numericCols[0]} by ${names[0]}?`);
  if (numericCols[0]) questions.push(`Show the top 10 rows by ${numericCols[0]}.`);
  if (dateCols[0] && numericCols[0]) questions.push(`How does ${numericCols[0]} change over ${dateCols[0]}?`);
  if (numericCols[0]) questions.push(`What is the average ${numericCols[0]}?`);
  questions.push("How many rows are in this dataset?");
  return questions.slice(0, 4);
}

export default function Workspace({ meta, initialPreview }: { meta: DatasetMeta; initialPreview: Record<string, unknown>[] }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeResult = history.find((h) => h.id === activeId)?.result ?? null;

  const submit = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: meta.id, question: trimmed }),
      });
      const data = await res.json() as QueryResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Query failed.");
      const entry: HistoryEntry = { id: crypto.randomUUID(), question: trimmed, result: data, timestamp: Date.now() };
      setHistory((h) => [entry, ...h]);
      setActiveId(entry.id);
      setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query failed.");
    } finally {
      setLoading(false);
    }
  }, [loading, meta.id]);

  const suggested = suggestedQuestions(meta.columns);

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Left sidebar — history */}
      <aside className="w-52 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">History</p>
          <button onClick={() => router.push("/")} className="text-[10px] text-gray-400 hover:text-gray-600">+ New</button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {history.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-3">No queries yet.</p>
          ) : (
            history.map((h) => (
              <button
                key={h.id}
                onClick={() => setActiveId(h.id)}
                className={`w-full text-left px-4 py-2.5 transition-colors ${activeId === h.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <p className="text-xs truncate">{h.question}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{new Date(h.timestamp).toLocaleTimeString()}</p>
              </button>
            ))
          )}
        </div>
        <div className="p-3 border-t border-gray-100 text-[10px] text-gray-400">
          <p className="font-medium truncate">{meta.name}</p>
          <p>{meta.rowCount.toLocaleString()} rows · {meta.columns.length} cols</p>
        </div>
      </aside>

      {/* Center */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Results area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!activeResult && (
            <div className="max-w-xl mx-auto mt-12 text-center">
              <p className="text-gray-500 text-sm mb-6">Ask a question about <span className="font-medium text-gray-800">{meta.name}</span></p>
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

        {/* Input bar */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(question); } }}
              placeholder="Ask a question about your data…"
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
      </main>

      {/* Right sidebar — schema */}
      <SchemaPanel columns={meta.columns} />
    </div>
  );
}
