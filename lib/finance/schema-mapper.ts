import type { ColumnMeta } from "@/types";
import type { ColumnMapping, MetricDefinition, MetricMatch } from "./types";
import { FINANCE_METRICS } from "./metrics";

// Maps each finance role to the column name fragments that indicate it
const ROLE_KEYWORDS: Record<string, string[]> = {
  revenue:             ["revenue", "sales", "income", "receipt", "turnover"],
  cogs:                ["cogs", "cost_of_good", "cost_good", "cost_of_sale", "cost_of_rev", "direct_cost", "cost_revenue"],
  expenses:            ["expense", "opex", "overhead", "operating_cost", "total_cost"],
  marketing_spend:     ["marketing", "advertising", "ad_spend", "ads", "acquisition_spend", "campaign"],
  customer_id:         ["customer_id", "user_id", "client_id", "account_id", "subscriber_id"],
  date:                ["date", "period", "month", "year", "week", "quarter", "timestamp", "created_at", "paid_at", "occurred_at"],
  status:              ["status", "state", "payment_status", "subscription_status", "is_active", "is_churned", "event_type", "type"],
  amount:              ["amount", "value", "total", "price", "charge", "fee", "payment"],
  subscription_amount: ["mrr", "arr", "recurring", "subscription_amount", "plan_amount", "monthly_amount", "annual_amount"],
  refund_amount:       ["refund", "refunded_amount", "reversal", "chargeback"],
  segment:             ["segment", "tier", "plan", "plan_name", "product_tier", "channel", "category"],
  cash_balance:        ["cash", "balance", "cash_balance", "bank"],
  expansion_revenue:   ["expansion", "upsell", "upgrade"],
  contraction_revenue: ["contraction", "downgrade"],
  new_customers:       ["new_customer", "new_user", "acquired", "signup"],
};

function scoreColumnForRole(col: ColumnMeta, role: string): number {
  const name = col.sanitizedName.toLowerCase();
  const keywords = ROLE_KEYWORDS[role] ?? [];

  for (const kw of keywords) {
    if (name === kw) return 1.0;
    if (name.startsWith(kw + "_") || name.endsWith("_" + kw)) return 0.85;
    if (name.includes(kw)) return 0.75;
  }

  // Currency-formatted columns with no specific role → generic "amount"
  if (role === "amount" && col.detectedFormat === "currency") return 0.5;
  // Date-typed columns → "date"
  if (role === "date" && (col.type === "date" || col.detectedFormat === "date")) return 0.6;

  return 0;
}

/**
 * Returns the best column for each finance role. Tries every column against
 * every role and keeps the highest-confidence match per role.
 */
export function buildRoleMap(columns: ColumnMeta[]): Map<string, ColumnMapping> {
  const roleMap = new Map<string, ColumnMapping>();

  for (const role of Object.keys(ROLE_KEYWORDS)) {
    let bestCol: ColumnMeta | null = null;
    let bestScore = 0;

    for (const col of columns) {
      const score = scoreColumnForRole(col, role);
      if (score > bestScore) {
        bestScore = score;
        bestCol = col;
      }
    }

    if (bestCol && bestScore > 0) {
      roleMap.set(role, { role, columnName: bestCol.sanitizedName, confidence: bestScore });
    }
  }

  // Revenue fallback: use "amount" column at reduced confidence when no dedicated revenue col exists
  if (!roleMap.has("revenue") && roleMap.has("amount")) {
    const amtMapping = roleMap.get("amount")!;
    roleMap.set("revenue", { ...amtMapping, role: "revenue", confidence: amtMapping.confidence * 0.75 });
  }

  return roleMap;
}

export function matchMetric(
  metric: MetricDefinition,
  roleMap: Map<string, ColumnMapping>
): MetricMatch {
  const columnMappings: ColumnMapping[] = [];
  const missingRoles: string[] = [];

  for (const role of metric.requiredRoles) {
    const mapping = roleMap.get(role);
    if (mapping) {
      columnMappings.push(mapping);
    } else {
      missingRoles.push(role);
    }
  }

  for (const role of metric.optionalRoles) {
    const mapping = roleMap.get(role);
    if (mapping) columnMappings.push(mapping);
  }

  return {
    metric,
    columnMappings,
    isFullySatisfied: missingRoles.length === 0,
    missingRoles,
  };
}

export function detectMetricIntent(question: string): MetricDefinition[] {
  const q = question.toLowerCase();
  return FINANCE_METRICS.filter((metric) =>
    metric.synonyms.some((syn) => q.includes(syn.toLowerCase()))
  );
}
