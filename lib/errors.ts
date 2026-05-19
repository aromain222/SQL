export function friendlyErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();

  if (lower.includes("openai_api_key")) {
    return "OpenAI is not configured. Add OPENAI_API_KEY and try again.";
  }
  if (lower.includes("timed out")) {
    return raw;
  }
  if (lower.includes("no such column")) {
    return "The generated SQL referenced a column that does not exist. Try asking with the exact column name from the schema.";
  }
  if (lower.includes("no such table")) {
    return "The generated SQL referenced the wrong table. Try rephrasing the question.";
  }
  if (lower.includes("ambiguous column")) {
    return "The query was ambiguous. Ask for specific columns or a simpler grouping.";
  }
  if (lower.includes("misuse of aggregate") || lower.includes("aggregate functions")) {
    return "The aggregation was invalid. Try asking for a total, average, count, or grouping more directly.";
  }
  if (lower.includes("syntax error")) {
    return "The generated SQL was invalid. Try a simpler version of the question.";
  }
  if (lower.includes("database is locked")) {
    return "The dataset is busy. Wait a moment and try again.";
  }
  if (lower.includes("too many sql variables") || lower.includes("too many terms")) {
    return "The query is too large for this dataset. Narrow the question or add a filter.";
  }

  return raw || "Something went wrong.";
}

