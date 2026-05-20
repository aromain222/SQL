"use client";

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { ChartRecommendation } from "@/types";

const COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"];

interface Props {
  rows: Record<string, unknown>[];
  chart: ChartRecommendation;
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
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="x" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={52} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="y" name={chart.y} stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        ) : chart.type === "pie" ? (
          <PieChart>
            <Pie data={data} dataKey="y" nameKey="x" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>

            <Tooltip />
          </PieChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="x" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={52} interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="y" name={chart.y} fill="#2563eb" radius={[3, 3, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
      </div>
    </div>
  );
}
