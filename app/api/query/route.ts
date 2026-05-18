import { NextRequest, NextResponse } from "next/server";
import { loadMeta } from "@/lib/meta";
import { openDb, runQuery } from "@/lib/db";
import { generateSQL } from "@/lib/llm";
import { validateSQL, SQLValidationError } from "@/lib/sql-validator";
import { generateInsight } from "@/lib/insight";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { datasetId, question } = (await req.json()) as {
      datasetId?: string;
      question?: string;
    };

    if (!datasetId || !question?.trim()) {
      return NextResponse.json({ error: "datasetId and question are required." }, { status: 400 });
    }

    // Sanitize question length (prompt injection mitigation)
    if (question.length > 1000) {
      return NextResponse.json({ error: "Question is too long." }, { status: 400 });
    }

    const meta = loadMeta(datasetId);
    if (!meta) return NextResponse.json({ error: "Dataset not found." }, { status: 404 });

    const llmResult = await generateSQL(question, meta.tableName, meta.columns);

    if (!llmResult.sql) {
      return NextResponse.json({
        answer: llmResult.explanation || "This question cannot be answered with the available columns.",
        sql: "",
        rows: [],
        columns: [],
        chartRecommendation: { type: "none" },
        rowCount: 0,
      });
    }

    let safeSQL: string;
    try {
      safeSQL = validateSQL(
        llmResult.sql,
        meta.tableName,
        meta.columns.map((c) => c.sanitizedName)
      );
    } catch (e) {
      if (e instanceof SQLValidationError) {
        return NextResponse.json({ error: `Unsafe query: ${e.message}` }, { status: 400 });
      }
      throw e;
    }

    const db = openDb(datasetId);
    const { rows, columns } = runQuery(db, safeSQL);
    db.close();

    const answer =
      rows.length === 0
        ? "No rows matched your query."
        : llmResult.explanation;

    const insight = await generateInsight(question, rows, columns, meta.columns);

    return NextResponse.json({
      answer,
      sql: safeSQL,
      rows,
      columns,
      chartRecommendation: llmResult.chartRecommendation,
      rowCount: rows.length,
      insight,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Query failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
