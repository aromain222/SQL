import OpenAI from "openai";
import type { FinanceAnalysis } from "@/types";
import type { IntentClassification } from "@/lib/intent";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey });
}

export async function generateAnalysis(
  question: string,
  sql: string,
  rows: Record<string, unknown>[],
  columns: string[],
  intent: IntentClassification
): Promise<FinanceAnalysis> {
  if (rows.length === 0) {
    return {
      direct_answer:
        intent.warnings[0] ??
        "The query returned no results. Try broadening your filters or checking the date range.",
      key_number: "No data returned",
      driver_explanation:
        intent.missingFields.length > 0
          ? `This metric requires the following columns that were not found: ${intent.missingFields.join(", ")}.`
          : "No rows matched the query conditions.",
      chart_hint: "",
      assumptions: intent.warnings.slice(0, 3),
      follow_up_questions: buildEmptyFallbackQuestions(intent),
    };
  }

  const preview = JSON.stringify(rows.slice(0, 30), null, 2);
  const metricNames = intent.metricsUsed.join(", ") || "general data";

  const gapNote = intent.missingFields.length > 0
    ? `\nData gaps: ${intent.missingFields.join(", ")} could not be mapped from the schema — analysis may be incomplete.`
    : "";

  const warnNote = intent.warnings.filter((w) => !w.startsWith(metricNames)).length > 0
    ? `\nWarnings: ${intent.warnings[0]}`
    : "";

  const prompt = `You are a senior financial analyst. Explain the result of this ${intent.intentLabel} query.

Question: "${question}"
Metrics: ${metricNames}
SQL: ${sql}
Result: ${rows.length} row(s) — columns: ${columns.join(", ")}${gapNote}${warnNote}

Data (up to 30 rows):
${preview}

Rules for the explanation:
- direct_answer: Lead with the key number or trend. No filler like "The data shows" or "Based on the results". 1–2 sentences.
- key_number: The single most important stat as a short formatted string. Include $ or % symbols. Note direction if a trend is visible (e.g. "+18% MoM", "down $42K"). Use real numbers from the data.
- driver_explanation: Name the specific segment, category, period, or customer that drove the result. Be concrete — cite actual values. 2–3 sentences.
- chart_hint: One sentence on the most important visual pattern: trend direction, outlier, top contributor, or inflection point.
- assumptions: Up to 3 assumptions made: which column was used as the reporting period, how nulls were handled, aggregation method, etc.
- follow_up_questions: 3 specific, answerable questions a CFO or analyst would naturally ask next given this result. Use real column names or metric names from the context where relevant.

Return ONLY valid JSON:
{
  "direct_answer": "...",
  "key_number": "...",
  "driver_explanation": "...",
  "chart_hint": "...",
  "assumptions": ["...", "..."],
  "follow_up_questions": ["...", "...", "..."]
}`;

  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    response_format: { type: "json_object" },
    max_tokens: 700,
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let parsed: Partial<FinanceAnalysis>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return fallback(question, rows);
  }

  return {
    direct_answer: str(parsed.direct_answer) || `${rows.length} result(s) returned.`,
    key_number:    str(parsed.key_number)    || `${rows.length} row(s)`,
    driver_explanation: str(parsed.driver_explanation) || "",
    chart_hint:    str(parsed.chart_hint)    || "",
    assumptions:   strArr(parsed.assumptions).slice(0, 4),
    follow_up_questions: strArr(parsed.follow_up_questions).slice(0, 3),
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : [];
}

function buildEmptyFallbackQuestions(intent: IntentClassification): string[] {
  if (intent.metricsUsed.length === 0) return [];
  const m = intent.metricsUsed[0];
  return [
    `Show the full ${m} breakdown by period`,
    `What time range does the data cover?`,
    `Which columns are available for ${m} analysis?`,
  ];
}

function fallback(question: string, rows: Record<string, unknown>[]): FinanceAnalysis {
  return {
    direct_answer: `${rows.length} result(s) returned for: ${question}`,
    key_number: `${rows.length} row(s)`,
    driver_explanation: "",
    chart_hint: "",
    assumptions: [],
    follow_up_questions: [],
  };
}
