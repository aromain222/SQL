import type { MetricDefinition } from "./types";

export const FINANCE_METRICS: MetricDefinition[] = [
  {
    id: "revenue",
    name: "Revenue",
    description: "Total sales or income generated",
    explanation:
      "Revenue is total income from sales or services before any costs are deducted — the top line of the income statement.",
    synonyms: [
      "revenue", "sales", "income", "gross revenue", "total sales", "total revenue",
      "top line", "topline", "receipts", "turnover",
    ],
    requiredRoles: ["revenue"],
    optionalRoles: ["date", "customer_id", "segment", "product"],
    sqlHint:
      "SUM(revenue_col). Group by strftime('%Y-%m', date_col) for monthly trends if a date column exists.",
    defaultChart: "line",
    missingDataWarning:
      "No revenue or sales column detected. A currency-formatted column may serve as a proxy.",
  },
  {
    id: "gross_margin",
    name: "Gross Margin",
    description: "(Revenue − COGS) / Revenue as a percentage",
    explanation:
      "Gross margin measures core profitability before operating expenses. Formula: (Revenue − COGS) / Revenue × 100.",
    synonyms: ["gross margin", "gross profit margin", "gross profit", "gp margin", "gpm"],
    requiredRoles: ["revenue", "cogs"],
    optionalRoles: ["date", "product"],
    sqlHint:
      "ROUND((SUM(revenue_col) - SUM(cogs_col)) * 100.0 / NULLIF(SUM(revenue_col), 0), 2) AS gross_margin_pct",
    defaultChart: "line",
    missingDataWarning:
      "Gross margin requires both a revenue column and a COGS column. One or both are missing from the schema.",
  },
  {
    id: "cogs",
    name: "COGS",
    description: "Cost of Goods Sold — direct costs of delivering the product or service",
    explanation:
      "COGS represents direct costs: materials, direct labor, and direct overhead. Subtracting it from revenue gives gross profit.",
    synonyms: [
      "cogs", "cost of goods sold", "cost of revenue", "direct costs",
      "cost of sales", "cost goods", "cost of delivery",
    ],
    requiredRoles: ["cogs"],
    optionalRoles: ["date", "product"],
    sqlHint: "SUM(cogs_col). Group by period for trend analysis.",
    defaultChart: "line",
    missingDataWarning: "No COGS or cost-of-revenue column detected.",
  },
  {
    id: "net_income",
    name: "Net Income",
    description: "Revenue minus all costs, expenses, and taxes — the bottom line",
    explanation:
      "Net income is what remains after subtracting COGS, operating expenses, interest, and taxes from revenue.",
    synonyms: [
      "net income", "net profit", "bottom line", "profit", "earnings",
      "net earnings", "p&l", "profit and loss", "net loss",
    ],
    requiredRoles: ["revenue", "expenses"],
    optionalRoles: ["date", "cogs"],
    sqlHint:
      "SUM(revenue_col) - SUM(expenses_col) AS net_income. Subtract cogs_col too if a separate COGS column exists.",
    defaultChart: "line",
    missingDataWarning:
      "Net income requires both a revenue column and an expenses/costs column.",
  },
  {
    id: "operating_expenses",
    name: "Operating Expenses",
    description: "Day-to-day costs of running the business (OpEx)",
    explanation:
      "Operating expenses include salaries, rent, marketing, and software — anything not directly tied to producing the product.",
    synonyms: [
      "opex", "operating expenses", "operating costs", "overhead",
      "expenses", "costs", "spend", "spending",
    ],
    requiredRoles: ["expenses"],
    optionalRoles: ["date", "segment", "category"],
    sqlHint:
      "SUM(expenses_col). If a category column exists, GROUP BY category to show the breakdown.",
    defaultChart: "bar",
    missingDataWarning: "No expenses or cost column detected.",
  },
  {
    id: "burn",
    name: "Burn Rate",
    description: "Monthly cash outflow — how fast the company is spending",
    explanation:
      "Net burn = monthly cash out − cash in. Gross burn = total cash out. Critical for understanding how long current cash will last.",
    synonyms: [
      "burn", "burn rate", "monthly burn", "cash burn",
      "net burn", "gross burn", "cash outflow",
    ],
    requiredRoles: ["expenses"],
    optionalRoles: ["date", "revenue"],
    sqlHint:
      "SUM(expenses_col) grouped by strftime('%Y-%m', date_col). Net burn = SUM(expenses) - SUM(revenue) if revenue is available.",
    defaultChart: "line",
    missingDataWarning:
      "Burn rate requires an expenses or cash outflow column, ideally paired with a date column.",
  },
  {
    id: "runway",
    name: "Runway",
    description: "Months of cash remaining at current burn rate",
    explanation:
      "Runway = current cash balance / monthly burn rate. Shows how many months the company can operate before running out of cash.",
    synonyms: [
      "runway", "months of runway", "cash runway",
      "runway left", "how long until out of cash",
    ],
    requiredRoles: ["cash_balance", "expenses"],
    optionalRoles: ["date"],
    sqlHint:
      "Divide the latest cash_balance by average monthly expenses. Requires a date column to isolate monthly periods.",
    defaultChart: "none",
    missingDataWarning:
      "Runway requires both a cash balance column and an expenses/burn column.",
  },
  {
    id: "cac",
    name: "CAC",
    description: "Customer Acquisition Cost — spend per new customer acquired",
    explanation:
      "CAC = total acquisition spend / new customers acquired. Lower CAC relative to LTV indicates efficient growth.",
    synonyms: [
      "cac", "customer acquisition cost", "cost to acquire",
      "acquisition cost", "cost per acquisition", "cost per customer",
    ],
    requiredRoles: ["marketing_spend"],
    optionalRoles: ["new_customers", "customer_id", "date", "segment"],
    sqlHint:
      "SUM(marketing_spend_col) / NULLIF(COUNT(DISTINCT customer_id_col), 0) AS cac. Use a new_customers count column if available.",
    defaultChart: "line",
    missingDataWarning:
      "CAC requires a marketing or acquisition spend column. A customer ID or new-customer count column improves accuracy.",
  },
  {
    id: "ltv",
    name: "LTV",
    description: "Customer Lifetime Value — total revenue expected from one customer",
    explanation:
      "LTV approximation = ARPU / churn rate, or total revenue per customer. Measures how much value each customer generates over their lifetime.",
    synonyms: [
      "ltv", "lifetime value", "customer lifetime value",
      "clv", "cltv", "lifetime value per customer",
    ],
    requiredRoles: ["revenue"],
    optionalRoles: ["customer_id", "date", "segment", "status"],
    sqlHint:
      "SUM(revenue_col) / NULLIF(COUNT(DISTINCT customer_id_col), 0) AS avg_ltv, or AVG(total_revenue) if already aggregated per customer.",
    defaultChart: "bar",
    missingDataWarning:
      "LTV is best with per-customer revenue history and churn data. Without both, this is an approximation.",
  },
  {
    id: "churn",
    name: "Churn Rate",
    description: "Percentage of customers or revenue lost in a period",
    explanation:
      "Churn rate = customers lost / customers at start of period. High churn erodes revenue and increases the CAC burden needed to grow.",
    synonyms: [
      "churn", "churn rate", "customer churn", "monthly churn",
      "annual churn", "attrition", "churned customers",
    ],
    requiredRoles: ["status"],
    optionalRoles: ["date", "customer_id", "segment", "subscription_amount"],
    sqlHint:
      "COUNT(CASE WHEN status IN ('churned','cancelled','inactive') THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) AS churn_pct. Adjust status values to match your data.",
    defaultChart: "line",
    missingDataWarning:
      "Churn rate requires a status column with values like 'churned', 'cancelled', or 'inactive'.",
  },
  {
    id: "arr_mrr",
    name: "ARR / MRR",
    description: "Annual / Monthly Recurring Revenue from subscriptions",
    explanation:
      "MRR = sum of active subscription amounts in a month. ARR = MRR × 12. Core health metrics for subscription businesses.",
    synonyms: [
      "arr", "mrr", "annual recurring revenue", "monthly recurring revenue",
      "recurring revenue", "subscription revenue",
    ],
    requiredRoles: ["subscription_amount"],
    optionalRoles: ["date", "customer_id", "status", "segment"],
    sqlHint:
      "SUM(mrr_col) AS mrr, SUM(mrr_col) * 12 AS arr. Filter WHERE status = 'active' if a status column exists.",
    defaultChart: "line",
    missingDataWarning:
      "MRR/ARR requires a subscription or recurring revenue amount column.",
  },
  {
    id: "arpu",
    name: "ARPU",
    description: "Average Revenue Per User (or account)",
    explanation:
      "ARPU = total revenue / number of active users. Measures how much value each customer generates on average in a period.",
    synonyms: [
      "arpu", "average revenue per user", "average revenue per customer",
      "revenue per user", "revenue per customer", "revenue per account",
    ],
    requiredRoles: ["revenue", "customer_id"],
    optionalRoles: ["date", "segment"],
    sqlHint:
      "SUM(revenue_col) / NULLIF(COUNT(DISTINCT customer_id_col), 0) AS arpu",
    defaultChart: "line",
    missingDataWarning: "ARPU requires a revenue column and a customer ID column.",
  },
  {
    id: "nrr",
    name: "Net Revenue Retention",
    description: "% of MRR retained from existing customers including expansion",
    explanation:
      "NRR = (starting MRR + expansion − contraction − churn) / starting MRR × 100. NRR > 100% means existing customers grow revenue without new acquisition.",
    synonyms: [
      "nrr", "net revenue retention", "net dollar retention",
      "ndr", "revenue retention", "dollar retention", "net retention",
    ],
    requiredRoles: ["subscription_amount", "status"],
    optionalRoles: ["date", "expansion_revenue", "contraction_revenue", "segment"],
    sqlHint:
      "Compare starting vs ending MRR for the same set of customers across periods. Requires a date and customer_id column.",
    defaultChart: "line",
    missingDataWarning:
      "NRR requires subscription amounts and status changes over time. Without expansion/contraction columns, this is an approximation.",
  },
  {
    id: "segment_performance",
    name: "Segment Performance",
    description: "Revenue or key metrics broken down by customer segment",
    explanation:
      "Segment analysis shows which customer groups — by plan, tier, geography, or channel — drive the most value.",
    synonyms: [
      "segment", "customer segment", "segment performance", "segment breakdown",
      "by segment", "per segment", "segment analysis", "by plan", "by tier", "by region",
    ],
    requiredRoles: ["segment"],
    optionalRoles: ["revenue", "customer_id", "date", "status"],
    sqlHint:
      "GROUP BY segment_col. Add SUM(revenue), COUNT(DISTINCT customer_id), or churn metrics as needed.",
    defaultChart: "bar",
    missingDataWarning:
      "Segment analysis requires a segment, plan, tier, or category column.",
  },
  {
    id: "cohort_retention",
    name: "Cohort Retention",
    description: "Percentage of a signup cohort still active in subsequent periods",
    explanation:
      "Cohort retention tracks how many customers from a given signup month remain active over time. Fundamental to understanding product stickiness.",
    synonyms: [
      "cohort", "cohort retention", "cohort analysis", "retention by cohort",
      "user retention", "customer retention", "retention curve",
    ],
    requiredRoles: ["customer_id", "date"],
    optionalRoles: ["status", "segment"],
    sqlHint:
      "Group by signup month (cohort) and activity month. Compute COUNT(active) / COUNT(cohort) per period. Requires joining the table to itself or using window functions — which are blocked. A simpler approach: group active customers by their first-seen month.",
    defaultChart: "line",
    missingDataWarning:
      "Cohort analysis requires a customer ID column and a date column. A status or activity column improves accuracy.",
  },
  {
    id: "refunds",
    name: "Refunds",
    description: "Total refund amounts, counts, and refund rate",
    explanation:
      "Refunds represent revenue reversals. High refund rates signal product, billing, or expectation-mismatch issues.",
    synonyms: [
      "refund", "refunds", "refund rate", "chargeback",
      "chargebacks", "returns", "reversals", "money back",
    ],
    requiredRoles: ["status"],
    optionalRoles: ["refund_amount", "amount", "date", "customer_id"],
    sqlHint:
      "Filter WHERE status IN ('refunded','refund','chargeback') or use SUM(refund_col) if a dedicated refund column exists.",
    defaultChart: "bar",
    missingDataWarning:
      "No dedicated refund column or status column found. If refunds appear as a status or type value, filter on that.",
  },
  {
    id: "failed_payments",
    name: "Failed Payments",
    description: "Count and value of failed or declined payment attempts",
    explanation:
      "Failed payments indicate billing friction, card declines, or fraud. High failure rates can signal dunning issues or payment method problems.",
    synonyms: [
      "failed payment", "payment failure", "failed payments", "declined",
      "payment failed", "failed charge", "dunning", "declined payments", "payment decline",
    ],
    requiredRoles: ["status"],
    optionalRoles: ["amount", "date", "customer_id"],
    sqlHint:
      "WHERE status IN ('failed','declined','error','rejected'). Add SUM(amount_col) for total value and GROUP BY strftime('%Y-%m', date_col) for trends.",
    defaultChart: "line",
    missingDataWarning:
      "Failed payments require a status or payment_status column with values like 'failed', 'declined', or 'error'.",
  },
];
