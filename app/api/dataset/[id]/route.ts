import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadMeta, saveMeta } from "@/lib/meta";
import { openDb, runQuery } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meta = loadMeta(id);
  if (!meta) return NextResponse.json({ error: "Dataset not found." }, { status: 404 });

  try {
    const db = openDb(id);
    const { rows } = runQuery(db, `SELECT * FROM "${meta.tableName}" LIMIT 20`);
    db.close();
    return NextResponse.json({ meta, preview: rows });
  } catch {
    return NextResponse.json({ error: "Failed to load dataset." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meta = loadMeta(id);
  if (!meta) return NextResponse.json({ error: "Dataset not found." }, { status: 404 });

  const { name } = (await req.json()) as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  meta.name = name.trim();
  saveMeta(meta);
  return NextResponse.json({ meta });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dir = path.join(process.cwd(), "uploads", id);
  if (!fs.existsSync(dir)) return NextResponse.json({ error: "Dataset not found." }, { status: 404 });

  fs.rmSync(dir, { recursive: true, force: true });
  return NextResponse.json({ ok: true });
}
