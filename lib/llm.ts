import OpenAI from "openai";
import type { ColumnMeta, LLMResponse } from "@/types";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateSQL(
  question: string,
  tableName: string,
  columns: ColumnMeta[]
): Promise<LLMResponse> {
  const schema = columns
    .map(
      (c) =>
        `  "${c.sanitizedName}" ${c.type.toUpperCase()}${
          c.sampleValues.length ? ` -- e.g. ${c.sampleValues.slice(0, 3).map((v) => JSON.stringify(v)).join(", ")}` : ""
        }`
    )
    .join("\n");

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

Return ONLY this JSON (no markdown, no explanation outside JSON):
{
  "sql": "SELECT ...",
  "explanation": "Brief plain-English description of what the query does",
  "chartRecommendation": {
    "type": "bar | line | pie | none",
    "x": "column name or null",
    "y": "column name or null"
  }
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

  let parsed: Partial<LLMResponse>;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("LLM returned invalid JSON.");
  }

  return {
    sql: typeof parsed.sql === "string" ? parsed.sql : "",
    explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
    chartRecommendation: parsed.chartRecommendation ?? { type: "none" },
  };
}
