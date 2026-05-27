import type { SemanticContext } from "@/lib/finance/types";

export type IntentType =
  | "generic_db"
  | "finance_metric"
  | "variance_analysis"
  | "cohort_retention"
  | "forecasting"
  | "anomaly_detection"
  | "dashboard_reporting";

export const INTENT_LABELS: Record<IntentType, string> = {
  generic_db:          "Generic database query",
  finance_metric:      "Finance metric",
  variance_analysis:   "Variance / driver analysis",
  cohort_retention:    "Cohort / retention analysis",
  forecasting:         "Forecasting / scenario",
  anomaly_detection:   "Anomaly detection",
  dashboard_reporting: "Dashboard / reporting",
};

/** Returned with every query response */
export interface QueryMetadata {
  intent: IntentType;
  intent_label: string;
  metrics_used: string[];
  tables_used: string[];
  assumptions: string[];
  missing_fields: string[];
  confidence: number;
}

/** Internal result of intent classification */
export interface IntentClassification {
  intent: IntentType;
  intentLabel: string;
  confidence: number;
  /** Fully assembled prompt section injected into the LLM system prompt */
  promptAdditions: string;
  metricsUsed: string[];
  missingFields: string[];
  warnings: string[];
  /** Finance semantic context — carried through for downstream consumers */
  semanticContext: SemanticContext;
}
