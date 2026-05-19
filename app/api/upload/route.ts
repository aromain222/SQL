import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs";
import { datasetDir } from "@/lib/paths";
import { parseCSV } from "@/lib/csv";
import { openDb, createTable } from "@/lib/db";
import { saveMeta } from "@/lib/meta";
import type { DatasetMeta } from "@/types";
import { MAX_UPLOAD_BYTES } from "@/lib/limits";
import { rateLimit } from "@/lib/rate-limit";
import { friendlyErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { key: "upload", limit: 20, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv") return NextResponse.json({ error: "Only CSV files are supported." }, { status: 400 });

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File too large. Maximum size is 50 MB." }, { status: 400 });
    }

    const text = await file.text();
    const { columns, rows, warnings } = parseCSV(text);

    const id = randomUUID();
    const tableName = "dataset";
    fs.mkdirSync(datasetDir(id), { recursive: true });

    const db = openDb(id);
    createTable(db, tableName, columns, rows);
    db.close();

    const meta: DatasetMeta = {
      id,
      name: file.name.replace(/\.csv$/i, ""),
      rowCount: rows.length,
      columns,
      tableName,
      createdAt: new Date().toISOString(),
      warnings,
    };
    saveMeta(meta);

    return NextResponse.json({ datasetId: id, meta });
  } catch (err) {
    const message = friendlyErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
