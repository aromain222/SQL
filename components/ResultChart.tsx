"use client";

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { ChartRecommendation } from "@/types";

const COLORS = ["#2563eb", "#0891b2", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0d9488", "#9333ea"];

interface Props {
  rows: Record<string, unknown>[];
  chart: ChartRecommendation;
}

function formatValue(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return String(v ?? "");
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n % 1 === 0 ? n.toLocaleString() : n.toFixed(2);
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string; name?: string; value?: unknown }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-medium text-slate-600 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-slate-800 font-semibold">
          {p.name}: {formatValue(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function ResultChart({ rows, chart }: Props) {
  if (chart.type === "none" || !chart.x || !chart.y || rows.length === 0) return null;

  const data = rows.map((r) => ({
    x: String(r[chart.x!] ?? ""),
    y: Number(r[chart.y!] ?? 0),
    ...r,
  }));

  return (
    <div className="w-full">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500">{chart.y}</p>
          <p className="text-[11px] text-gray-400">Grouped by {chart.x}</p>
        </div>
        <p className="text-[11px] text-gray-400">{data.length} point{data.length === 1 ? "" : "s"}</p>
      </div>
      <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        {chart.type === "line" ? (
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: "#94a3b8" }} angle={-30} textAnchor="end" height={52} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={formatValue} width={60} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="y" name={chart.y} stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#2563eb" }} />
          </LineChart>
        ) : chart.type === "pie" ? (
          <PieChart>
            <Pie data={data} dataKey="y" nameKey="x" cx="50%" cy="50%" outerRadius={110} innerRadius={40}
              label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
            >
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: "#94a3b8" }} angle={-30} textAnchor="end" height={52} interval={0} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={formatValue} width={60} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="y" name={chart.y} fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
      </div>
    </div>
  );
}
