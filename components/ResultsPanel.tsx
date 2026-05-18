"use client";

import { useState, useCallback } from "react";
import type { QueryResult } from "@/types";
import ResultChart from "./ResultChart";

type Tab = "answer" | "table" | "chart" | "sql";

function exportCSV(rows: Record<string, unknown>[], columns: string[], filename: string) {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    columns.map(escape).join(","),
    ...rows.map((r) => columns.map((c) => escape(r[c])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button
      onClick={copy}
      className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400 transition-colors"
    >
      {copied ? "Copied!" : "Copy SQL"}
    </button>
  );
}

export default function ResultsPanel({ result }: { result: QueryResult }) {
  const [tab, setTab] = useState<Tab>("answer");
  const [showInsight, setShowInsight] = useState(false);
  const hasChart = result.chartRecommendation.type !== "none";

  const tabs: { id: Tab; label: string }[] = [
    { id: "answer", label: "Answer" },
    { id: "table", label: `Table (${result.rowCount})` },
    ...(hasChart ? [{ id: "chart" as Tab, label: "Chart" }] : []),
    { id: "sql", label: "SQL" },
  ];

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* Tab bar + action buttons */}
      <div className="flex items-center border-b border-gray-100">
        <div className="flex flex-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "border-b-2 border-blue-500 text-blue-600 bg-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Action buttons — always visible */}
        <div className="flex items-center gap-2 px-3">
          {result.sql && <CopyButton text={result.sql} />}
          {result.rows.length > 0 && (
            <button
              onClick={() => exportCSV(result.rows, result.columns, "query-results.csv")}
              className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400 transition-colors"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {tab === "answer" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">{result.answer}</p>
            {result.insight && (
              <div>
                <button
                  onClick={() => setShowInsight((v) => !v)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>{showInsight ? "▾" : "▸"}</span>
                  Explain this
                </button>
                {showInsight && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-xs text-blue-900 leading-relaxed">{result.insight}</p>
                  </div>
                )}
              </div>
            )}
            {result.rowCount === 0 && (
              <p className="text-xs text-gray-400">No rows matched.</p>
            )}
          </div>
        )}

        {tab === "table" && (
          result.rows.length === 0 ? (
            <p className="text-sm text-gray-400">No results.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {result.columns.map((col) => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {result.columns.map((col) => (
                        <td key={col}>
                          {row[col] == null ? <span className="text-gray-300">—</span> : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === "chart" && (
          <ResultChart rows={result.rows} chart={result.chartRecommendation} />
        )}

        {tab === "sql" && (
          <pre className="text-xs font-mono bg-gray-50 border border-gray-100 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap text-gray-700">
            {result.sql || "No SQL generated."}
          </pre>
        )}
      </div>
    </div>
  );
}
