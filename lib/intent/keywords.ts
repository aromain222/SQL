import type { IntentType } from "./types";

/**
 * Ordered by specificity — checked top-to-bottom, first match wins.
 * finance_metric is handled separately via the finance semantic layer.
 */
export const INTENT_KEYWORD_GROUPS: Array<{ intent: IntentType; keywords: string[] }> = [
  {
    intent: "forecasting",
    keywords: [
      "forecast", "predict", "prediction", "projection", "what if", "scenario",
      "if we", "next month", "next quarter", "next year", "expected to",
      "extrapolate", "trend over time", "will revenue", "will churn",
      "will grow", "growth rate if", "run rate",
    ],
  },
  {
    intent: "anomaly_detection",
    keywords: [
      "anomaly", "anomalies", "spike", "outlier", "outliers", "unusual",
      "abnormal", "unexpected", "detect", "flag unusual", "alert on",
      "strange values", "suspicious",
    ],
  },
  {
    intent: "variance_analysis",
    keywords: [
      "why did", "what drove", "what caused", "why is", "why are",
      "variance", "driver", "drivers", "vs last", "vs prior", "vs same period",
      "compared to last", "difference between", "delta", "what changed",
      "why the drop", "why the increase", "why the decrease", "reason for",
      "period over period", "mom", "yoy", "qoq",
    ],
  },
  {
    intent: "cohort_retention",
    keywords: [
      "cohort", "retention rate", "retained customers", "lifecycle",
      "day 30", "day 60", "week 4", "month 3",
      "since signup", "since first purchase", "survival", "churn by cohort",
      "still active after",
    ],
  },
  {
    intent: "dashboard_reporting",
    keywords: [
      "dashboard", "report", "summary", "overview", "kpi", "kpis",
      "key metrics", "executive", "monthly report", "weekly report",
      "business review", "at a glance", "top line metrics", "health check",
    ],
  },
];
