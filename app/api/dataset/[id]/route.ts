import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { datasetDir } from "@/lib/paths";
import { loadMeta, saveMeta } from "@/lib/meta";
import { openDb, runQuery } from "@/lib/db";
import { DatasetIdError } from "@/lib/dataset-id";
import type { DatasetMeta } from "@/types";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const meta = loadMeta(id);
    if (!meta) return NextResponse.json({ error: "Dataset not found." }, { status: 404 });

    const db = openDb(id, { readonly: true, fileMustExist: true });
    const { rows } = runQuery(db, `SELECT * FROM "${meta.tableName}" LIMIT 20`);
    db.close();
    return NextResponse.json({ meta, preview: rows });
  } catch (err) {
    if (err instanceof DatasetIdError) {
      return NextResponse.json({ error: "Invalid dataset id." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to load dataset." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let meta: DatasetMeta | null;
  try {
    meta = loadMeta(id);
  } catch (err) {
    if (err instanceof DatasetIdError) {
      return NextResponse.json({ error: "Invalid dataset id." }, { status: 400 });
    }
    throw err;
  }
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
  let dir;
  try {
    dir = datasetDir(id);
  } catch (err) {
    if (err instanceof DatasetIdError) {
      return NextResponse.json({ error: "Invalid dataset id." }, { status: 400 });
    }
    throw err;
  }
  if (!fs.existsSync(dir)) return NextResponse.json({ error: "Dataset not found." }, { status: 404 });

  fs.rmSync(dir, { recursive: true, force: true });
  return NextResponse.json({ ok: true });
}
