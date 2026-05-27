import { NextRequest, NextResponse } from "next/server";
import { openDb, runQuery } from "@/lib/db";
import { generateSQL } from "@/lib/llm";
import { validateSQL, SQLValidationError } from "@/lib/sql-validator";
import { generateInsight } from "@/lib/insight";
import { DatasetIdError } from "@/lib/dataset-id";
import { INSIGHT_TIMEOUT_MS, LLM_TIMEOUT_MS, MAX_QUESTION_CHARS } from "@/lib/limits";
import { rateLimit } from "@/lib/rate-limit";
import { friendlyErrorMessage } from "@/lib/errors";
import { loadMetaWithRestore } from "@/lib/storage";
import { routeIntent } from "@/lib/intent";
import { generateAnalysis } from "@/lib/analyst";
import type { QueryMetadata } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { key: "query", limit: 60, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;

    const { datasetId, question } = (await req.json()) as {
      datasetId?: string;
      question?: string;
    };

    if (!datasetId || !question?.trim()) {
      return NextResponse.json({ error: "datasetId and question are required." }, { status: 400 });
    }

    if (question.length > MAX_QUESTION_CHARS) {
      return NextResponse.json({ error: "Question is too long." }, { status: 400 });
    }

    const meta = await loadMetaWithRestore(datasetId);
    if (!meta) return NextResponse.json({ error: "Dataset not found." }, { status: 404 });

    const intentResult = routeIntent(question, meta.columns);

    const llmResult = await withTimeout(
      generateSQL(question, meta.tableName, meta.columns, intentResult.promptAdditions || undefined),
      LLM_TIMEOUT_MS,
      "SQL generation timed out. Try a simpler question.",
    );

    // Fabrication guard: if required columns were missing but LLM still returned SQL,
    // flag it so the UI can warn the finance team.
    const fabricationWarning =
      intentResult.missingFields.length > 0 && llmResult.sql
        ? `This ${intentResult.intentLabel} requires "${intentResult.missingFields.join('", "')}" which could not be mapped from the schema. The result may be incomplete or approximate — verify before use.`
        : null;

    const effectiveWarnings = fabricationWarning
      ? [fabricationWarning, ...intentResult.warnings]
      : intentResult.warnings;

    const baseMetadata: QueryMetadata = {
      intent: intentResult.intent,
      intent_label: intentResult.intentLabel,
      metrics_used: intentResult.metricsUsed,
      tables_used: [meta.tableName],
      assumptions: llmResult.assumptions,
      missing_fields: intentResult.missingFields,
      confidence: intentResult.confidence,
    };

    if (!llmResult.sql) {
      return NextResponse.json({
        answer: llmResult.explanation || "This question cannot be answered with the available columns.",
        sql: "",
        rows: [],
        columns: [],
        chartRecommendation: { type: "none" },
        rowCount: 0,
        semanticWarnings: effectiveWarnings,
        metadata: baseMetadata,
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

    const db = openDb(datasetId, { readonly: true, fileMustExist: true });
    const { rows, columns } = runQuery(db, safeSQL);
    db.close();

    const answer =
      rows.length === 0
        ? "No rows matched your query."
        : llmResult.explanation;

    const isFinanceIntent = intentResult.intent !== "generic_db";

    const analysis = isFinanceIntent
      ? await withTimeout(
          generateAnalysis(question, safeSQL, rows, columns, intentResult),
          INSIGHT_TIMEOUT_MS,
          "Analysis timed out.",
        ).catch(() => null)
      : null;

    const insight = !isFinanceIntent
      ? await withTimeout(
          generateInsight(question, rows, columns, meta.columns, intentResult.semanticContext),
          INSIGHT_TIMEOUT_MS,
          "",
        ).catch(() => "")
      : undefined;

    return NextResponse.json({
      answer,
      sql: safeSQL,
      rows,
      columns,
      chartRecommendation: llmResult.chartRecommendation,
      rowCount: rows.length,
      ...(analysis !== null && { analysis }),
      ...(insight !== undefined && insight !== "" && { insight }),
      semanticWarnings: effectiveWarnings,
      metadata: baseMetadata,
    });
  } catch (err) {
    if (err instanceof DatasetIdError) {
      return NextResponse.json({ error: "Invalid dataset id." }, { status: 400 });
    }
    const message = friendlyErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
  ]);
}
