import { NextRequest, NextResponse } from "next/server";
import { loadMeta } from "@/lib/meta";
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
