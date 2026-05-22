"use client";

import { useState, useCallback, useMemo } from "react";
import type { QueryResult, ChartRecommendation } from "@/types";
import ResultChart from "./ResultChart";

type Tab = "answer" | "table" | "chart" | "sql";
type ChartType = "bar" | "line" | "pie";

// ─── helpers ─────────────────────────────────────────────────────────────────

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

function downloadMiniReport(result: QueryResult) {
  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const previewRows = result.rows.slice(0, 50);
  const table = previewRows.length
    ? `<table><thead><tr>${result.columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("")}</tr></thead><tbody>${previewRows.map((row) => `<tr>${result.columns.map((col) => `<td>${escapeHtml(row[col])}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    : "<p>No rows returned.</p>";
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Analysis Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; color: #111827; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; margin-top: 24px; }
    p { line-height: 1.5; }
    pre { background: #f3f4f6; padding: 12px; border-radius: 8px; white-space: pre-wrap; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
    th { background: #f9fafb; }
  </style>
</head>
<body>
  <h1>Mini Analysis Report</h1>
  <p>${escapeHtml(result.answer)}</p>
  ${result.insight ? `<h2>Insight</h2><p>${escapeHtml(result.insight)}</p>` : ""}
  <h2>Result Preview</h2>
  ${table}
  <h2>SQL</h2>
  <pre>${escapeHtml(result.sql || "No SQL generated.")}</pre>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "analysis-report.html";
  a.click();
  URL.revokeObjectURL(url);
}

function isNumericCol(col: string, rows: Record<string, unknown>[]): boolean {
  const sample = rows.slice(0, 20).map((r) => r[col]).filter((v) => v != null);
  return sample.length > 0 && sample.every((v) => !isNaN(Number(v)));
}

function looksDateLike(value: unknown): boolean {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{1,2}-\d{1,2}$/.test(text) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(text);
}

function inferAxes(
  columns: string[],
  rows: Record<string, unknown>[]
): { x: string; y: string } | null {
  if (columns.length < 2) return null;
  const numeric = columns.filter((c) => isNumericCol(c, rows));
  const categorical = columns.filter((c) => !isNumericCol(c, rows));
  if (numeric.length === 0) return null;
  return { x: categorical[0] ?? columns[0], y: numeric[0] };
}

function inferChartType(columns: string[], rows: Record<string, unknown>[]): ChartType {
  const axes = inferAxes(columns, rows);
  if (!axes) return "bar";
  const xSample = rows.slice(0, 12).map((row) => row[axes.x]).filter((value) => value != null);
  if (xSample.length > 0 && xSample.every(looksDateLike)) return "line";
  if (rows.length <= 6 && columns.length === 2) return "pie";
  return "bar";
}

function canChart(columns: string[], rows: Record<string, unknown>[]): boolean {
  return rows.length > 0 && inferAxes(columns, rows) !== null;
}

// ─── subcomponents ────────────────────────────────────────────────────────────

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

const CHART_TYPES: { type: ChartType; label: string }[] = [
  { type: "bar", label: "Bar" },
  { type: "line", label: "Line" },
  { type: "pie", label: "Pie" },
];

function ChartTypeSwitcher({
  value,
  onChange,
}: {
  value: ChartType;
  onChange: (t: ChartType) => void;
}) {
  return (
    <div className="flex items-center gap-1 mb-4">
      {CHART_TYPES.map(({ type, label }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
            value === type
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ResultsPanel({ result }: { result: QueryResult }) {
  const polishedRows = useMemo(() => polishRows(result.rows, result.columns), [result.rows, result.columns]);
  const chartable = useMemo(
    () => canChart(result.columns, polishedRows),
    [result.columns, polishedRows]
  );

  const axes = useMemo(
    () =>
      result.chartRecommendation.x && result.chartRecommendation.y
        ? { x: result.chartRecommendation.x, y: result.chartRecommendation.y }
        : inferAxes(result.columns, polishedRows),
    [result.chartRecommendation.x, result.chartRecommendation.y, result.columns, polishedRows]
  );

  const llmType =
    result.chartRecommendation.type !== "none"
      ? (result.chartRecommendation.type as ChartType)
      : inferChartType(result.columns, polishedRows);

  const [tab, setTab] = useState<Tab>("answer");
  const [chartType, setChartType] = useState<ChartType>(llmType);

  const activeChart: ChartRecommendation = {
    type: chartable ? chartType : "none",
    x: axes?.x,
    y: axes?.y,
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "answer", label: "Answer" },
    { id: "table", label: `Table (${result.rowCount})` },
    ...(chartable ? [{ id: "chart" as Tab, label: "Chart" }] : []),
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
          <button
            onClick={() => downloadMiniReport(result)}
            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400 transition-colors"
          >
            Mini Report
          </button>
        </div>
      </div>

      <div className="p-4">
        {tab === "answer" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">{result.answer}</p>
            {result.insight && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Result read</p>
                <p className="text-sm text-blue-950 leading-relaxed">{result.insight}</p>
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
                  <tr>{result.columns.map((col) => <th key={col}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {result.columns.map((col) => (
                        <td key={col}>
                          {row[col] == null
                            ? <span className="text-gray-300">—</span>
                            : String(row[col])}
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
          <div>
            <ChartTypeSwitcher value={chartType} onChange={setChartType} />
            <ResultChart rows={polishedRows} chart={activeChart} />
          </div>
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

function polishRows(rows: Record<string, unknown>[], columns: string[]): Record<string, unknown>[] {
  if (rows.length <= 1 || columns.length < 2) return rows;
  const numeric = columns.filter((col) => isNumericCol(col, rows));
  const categorical = columns.filter((col) => !isNumericCol(col, rows));
  const y = numeric[0];
  const x = categorical[0];
  if (!x || !y) return rows;

  const allDateLike = rows.slice(0, 20).every((row) => looksDateLike(row[x]));
  if (allDateLike) {
    return [...rows].sort((a, b) => String(a[x] ?? "").localeCompare(String(b[x] ?? ""))).slice(0, 60);
  }
  return [...rows].sort((a, b) => Number(b[y] ?? 0) - Number(a[y] ?? 0)).slice(0, 25);
}
