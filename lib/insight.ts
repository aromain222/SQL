import OpenAI from "openai";
import type { ColumnMeta } from "@/types";
import type { SemanticContext } from "@/lib/finance/types";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey });
}

export async function generateInsight(
  question: string,
  rows: Record<string, unknown>[],
  columns: string[],
  schemaCols: ColumnMeta[],
  semanticContext?: SemanticContext
): Promise<string> {
  if (rows.length === 0) return "The query returned no rows, so there is nothing to summarize.";

  const preview = rows.slice(0, 20);
  const availableCols = schemaCols.map((c) => c.originalName).join(", ");

  const financeInstructions = buildFinanceInstructions(semanticContext);

  const prompt = `A user asked: "${question}"

The query returned ${rows.length} row(s) with columns: ${columns.join(", ")}.
Sample results (up to 20 rows):
${JSON.stringify(preview, null, 2)}

Available columns in the full dataset: ${availableCols}
${financeInstructions}
Write 2–4 sentences that:
1. Summarize what the result actually shows in plain English.
2. Call out the most interesting or notable finding.
3. Mention any obvious limitation (e.g. missing columns, partial data, aggregation assumptions).

Be direct and specific. Do not use filler phrases like "it appears" or "this suggests".`;

  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 250,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

function buildFinanceInstructions(ctx?: SemanticContext): string {
  if (!ctx?.isFinanceQuery || ctx.matchedMetrics.length === 0) return "";

  const top = ctx.matchedMetrics[0];
  const lines = [
    "",
    `Finance context: this is a ${top.metric.name} analysis. ${top.metric.explanation}`,
    "When summarizing:",
    "- Use finance terminology (e.g. MoM, YoY, basis points, percentage of revenue).",
    "- Flag if the period is unclear or if data looks incomplete.",
  ];

  if (!top.isFullySatisfied) {
    lines.push(`- Note that the following data was missing: ${top.missingRoles.join(", ")}.`);
  }

  return lines.join("\n");
}
