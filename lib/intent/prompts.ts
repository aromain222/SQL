import type { IntentType } from "./types";

// SQLite limitations the LLM needs to know about across all intent types
const SQLITE_LIMITS = `SQLite constraints in this environment:
- No window functions (LAG, LEAD, ROW_NUMBER, RANK, OVER).
- No STDDEV/VARIANCE aggregate. Approximate with: AVG((val - avg_val) * (val - avg_val)).
- No PIVOT. Simulate with CASE WHEN aggregates.
- No CTEs (WITH ... AS). Use subqueries instead.
- No JOINs or UNIONs — only single-table SELECT queries.
- Date grouping: use strftime('%Y-%m', date_col) for month, strftime('%Y', ...) for year.`;

const PROMPTS: Partial<Record<IntentType, string>> = {
  variance_analysis: `VARIANCE & DRIVER ANALYSIS
This question asks why a metric changed or what drove a difference between periods or segments.

Guidelines:
- Break the variance down by the most meaningful available dimension (category, segment, month).
- Show both the absolute change and percentage change where possible.
- % Change formula: ROUND((current - prior) * 100.0 / NULLIF(ABS(prior), 0), 2).
- If a date column exists, group by strftime('%Y-%m', date_col) to expose period-over-period movement.
- Use a subquery to compute a prior-period baseline when comparing two periods.
- Preferred output columns: dimension, current_value, prior_value, change, pct_change.
- Preferred chart: bar (sorted by absolute change descending).

${SQLITE_LIMITS}`,

  cohort_retention: `COHORT RETENTION ANALYSIS
This question tracks how customers from a given signup period behave over time.

Guidelines:
- Define a customer's cohort as their earliest date in the dataset: MIN(date_col) per customer_id, grouped by strftime('%Y-%m', ...).
- For each cohort, count: cohort_size (total customers in that month), and active count in subsequent months.
- Because JOINs are not available, return a simple per-cohort summary: cohort_month, cohort_size, active_today (count still in dataset with a recent date).
- Limit to the 12 most recent cohorts by cohort month.
- If no customer_id or date column exists, set sql to "" and explain what is needed.
- Preferred chart: line (x = cohort_month, y = retention_pct).

${SQLITE_LIMITS}`,

  forecasting: `FORECASTING & SCENARIO ANALYSIS
This question asks about future values or "what if" scenarios.

Guidelines:
- SQLite cannot generate future data. Compute the historical trend as the best available proxy.
- For trend queries: return the most recent 12–24 periods of the relevant metric, ordered by date.
- For "what if" queries: apply the stated condition to existing data (e.g. "if churn drops by 10%" → multiply churn count by 0.9).
- For run-rate questions: take the most recent full period value and annualize or project it.
- Always note in the explanation that results are based on historical data, not a true statistical forecast.
- Preferred chart: line (x = period, y = metric value).

${SQLITE_LIMITS}`,

  anomaly_detection: `ANOMALY DETECTION
This question looks for unusual values, spikes, or statistical outliers.

Guidelines:
- SQLite has no native STDDEV. Use this mean-deviation proxy instead:
  Flag rows where ABS(value - AVG(value_col)) > 2.0 * AVG(ABS(value_col - (SELECT AVG(value_col) FROM dataset))).
- Simpler alternative: ORDER BY value_col DESC LIMIT 20 to surface the highest values.
- Include context columns alongside the flagged value (date, customer_id, segment if available).
- Use a subquery to compute the average so the outer query can compare against it.
- Label the detection method used in the explanation.
- Preferred chart: bar (flagged values highlighted by sorting).

${SQLITE_LIMITS}`,

  dashboard_reporting: `DASHBOARD / REPORTING SUMMARY
This question asks for a high-level overview or multi-metric summary.

Guidelines:
- Return the most important KPIs visible from this dataset in a single clean result set.
- If a date column exists, group by the most recent full period (month or quarter).
- Include: totals, averages, counts, and growth where computable.
- Keep the result concise — aim for fewer than 20 rows suitable for a dashboard widget.
- Prefer a structure of: metric_name, current_value, prior_value (if computable), pct_change.
- Use CASE WHEN to compute multiple metrics in one query rather than separate queries.
- Preferred chart: bar (metric comparison).

${SQLITE_LIMITS}`,
};

/** Returns the intent-specific prompt section, or empty string for generic/finance (handled elsewhere). */
export function getIntentPrompt(intent: IntentType): string {
  return PROMPTS[intent] ?? "";
}
