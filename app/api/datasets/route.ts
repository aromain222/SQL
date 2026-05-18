import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadMeta } from "@/lib/meta";
import type { DatasetMeta } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) return NextResponse.json({ datasets: [] });

  const dirs = fs.readdirSync(uploadsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const datasets: DatasetMeta[] = [];
  for (const id of dirs) {
    const meta = loadMeta(id);
    if (meta) datasets.push(meta);
  }

  datasets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json({ datasets });
}
