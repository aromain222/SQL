export interface ColumnMapping {
  role: string;
  columnName: string;
  confidence: number; // 0–1
}

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  explanation: string;
  /** Phrases that trigger this metric when found in the user question */
  synonyms: string[];
  /** All of these role slots must be filled for isFullySatisfied = true */
  requiredRoles: string[];
  /** Improve the query but are not required */
  optionalRoles: string[];
  /** SQLite-compatible formula hint injected into the LLM system prompt */
  sqlHint: string;
  defaultChart: "bar" | "line" | "pie" | "none";
  /** Shown to the user when required data is missing */
  missingDataWarning: string;
}

export interface MetricMatch {
  metric: MetricDefinition;
  /** All columns (required + optional) that were successfully mapped */
  columnMappings: ColumnMapping[];
  isFullySatisfied: boolean;
  missingRoles: string[];
}

export interface SemanticContext {
  isFinanceQuery: boolean;
  matchedMetrics: MetricMatch[];
  /** Extra section appended to the LLM system prompt */
  promptAdditions: string;
  /** User-visible warnings about missing or ambiguous data */
  warnings: string[];
}
