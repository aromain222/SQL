import OpenAI from "openai";
import type { ColumnMeta, LLMResponse } from "@/types";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey });
}

export async function generateSQL(
  question: string,
  tableName: string,
  columns: ColumnMeta[],
  promptAdditions?: string
): Promise<LLMResponse> {
  const schema = columns
    .map(
      (c) =>
        `  "${c.sanitizedName}" ${c.type.toUpperCase()}${
          c.sampleValues.length
            ? ` -- e.g. ${c.sampleValues.slice(0, 3).map((v) => JSON.stringify(v)).join(", ")}`
            : ""
        }`
    )
    .join("\n");

  const contextSection = promptAdditions ? `\n\n${promptAdditions}\n` : "";

  const systemPrompt = `You are a SQL expert. You generate safe SQLite SELECT queries.

Rules:
- Only use the table and columns provided below. Never invent columns.
- Only return SELECT queries. Never INSERT, UPDATE, DELETE, DROP, ALTER, or TRUNCATE.
- Do not use multiple statements. Do not use comments in SQL.
- Prefer simple, readable queries.
- If the question cannot be answered with the available columns, set sql to "" and explain why.
- Always return valid JSON matching the schema below.

Table: "${tableName}"
Columns:
${schema}
${contextSection}
Return ONLY this JSON (no markdown, no explanation outside JSON):
{
  "sql": "SELECT ...",
  "explanation": "Brief plain-English description of what the query does",
  "chartRecommendation": {
    "type": "bar | line | pie | none",
    "x": "column name or null",
    "y": "column name or null"
  },
  "assumptions": ["assumption 1", "assumption 2"]
}`;

  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";

  let parsed: Partial<LLMResponse> & { assumptions?: unknown };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("LLM returned invalid JSON.");
  }

  const chartRecommendation = parsed.chartRecommendation;
  const allowedChartTypes = new Set(["bar", "line", "pie", "none"]);

  const assumptions = Array.isArray(parsed.assumptions)
    ? (parsed.assumptions as unknown[]).filter((a): a is string => typeof a === "string")
    : [];

  return {
    sql: typeof parsed.sql === "string" ? parsed.sql : "",
    explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
    chartRecommendation:
      chartRecommendation &&
      typeof chartRecommendation === "object" &&
      "type" in chartRecommendation &&
      allowedChartTypes.has(String(chartRecommendation.type))
        ? parsed.chartRecommendation!
        : { type: "none" },
    assumptions,
  };
}
