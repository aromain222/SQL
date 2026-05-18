export type ColumnType = "text" | "integer" | "real" | "date";

export interface ColumnMeta {
  originalName: string;
  sanitizedName: string;
  type: ColumnType;
  sampleValues: string[];
  nullCount: number;
  uniqueCount: number;
  // enriched during cleaning
  isEmpty: boolean;
  isMostlyEmpty: boolean;     // > 80% null
  isDuplicate: boolean;
  detectedFormat?: "currency" | "percentage" | "date" | "number";
}

export interface CleaningWarning {
  column: string;
  level: "info" | "warning";
  message: string;
}

export interface DatasetMeta {
  id: string;
  name: string;
  rowCount: number;
  columns: ColumnMeta[];
  tableName: string;
  createdAt: string;
  warnings: CleaningWarning[];
}

export interface ChartRecommendation {
  type: "bar" | "line" | "pie" | "none";
  x?: string;
  y?: string;
}

export interface LLMResponse {
  sql: string;
  explanation: string;
  chartRecommendation: ChartRecommendation;
}

export interface QueryResult {
  answer: string;
  sql: string;
  rows: Record<string, unknown>[];
  columns: string[];
  chartRecommendation: ChartRecommendation;
  rowCount: number;
  insight?: string;
}

export interface HistoryEntry {
  id: string;
  question: string;
  result: QueryResult;
  timestamp: number;
}
