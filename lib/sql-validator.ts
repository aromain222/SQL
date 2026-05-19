import { DEFAULT_ROW_LIMIT, MAX_QUERY_ROWS } from "@/lib/limits";

const BLOCKED = [
  /\bINSERT\b/i, /\bUPDATE\b/i, /\bDELETE\b/i, /\bDROP\b/i,
  /\bALTER\b/i, /\bTRUNCATE\b/i, /\bCREATE\b/i, /\bGRANT\b/i,
  /\bREVOKE\b/i, /\bEXEC\b/i, /\bEXECUTE\b/i, /\bPRAGMA\b/i,
  /\bATTACH\b/i, /\bDETACH\b/i, /\bLOAD\b/i, /\bVACUUM\b/i,
  /\bREINDEX\b/i, /\bANALYZE\b/i, /\bWITH\b/i, /\bRECURSIVE\b/i,
  /\bUNION\b/i, /\bINTERSECT\b/i, /\bEXCEPT\b/i, /\bJOIN\b/i,
  /\bsqlite_master\b/i, /\bsqlite_schema\b/i,
];

const AGGREGATE_FNS = /\b(COUNT|SUM|AVG|MIN|MAX|GROUP BY)\b/i;
const LIMIT_PATTERN = /\bLIMIT\s+(\d+)\b/i;

export class SQLValidationError extends Error {}

export function validateSQL(sql: string, tableName: string, allowedColumns: string[]): string {
  let clean = sql.trim().replace(/;+$/, "").trim();

  // Strip inline comments
  clean = clean.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").trim();

  if (!clean.toUpperCase().startsWith("SELECT")) {
    throw new SQLValidationError("Only SELECT queries are allowed.");
  }

  if (/;/.test(clean)) {
    throw new SQLValidationError("Multiple statements are not allowed.");
  }

  for (const pattern of BLOCKED) {
    if (pattern.test(clean)) {
      throw new SQLValidationError(`Blocked keyword detected.`);
    }
  }

  // Must reference the correct table
  const tableRef = new RegExp(`\\b${escapeRegex(tableName)}\\b`, "i");
  if (!tableRef.test(clean)) {
    throw new SQLValidationError(`Query must reference the dataset table "${tableName}".`);
  }

  validateQuotedIdentifiers(clean, tableName, allowedColumns);
  clean = enforceLimit(clean);

  return clean;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validateQuotedIdentifiers(sql: string, tableName: string, allowedColumns: string[]): void {
  const allowed = new Set([tableName.toLowerCase(), ...allowedColumns.map((col) => col.toLowerCase())]);
  const matches = sql.matchAll(/"([^"]+)"/g);
  for (const match of matches) {
    const identifier = match[1]?.toLowerCase();
    if (identifier && !allowed.has(identifier)) {
      throw new SQLValidationError(`Unknown column or table "${match[1]}".`);
    }
  }
}

function enforceLimit(sql: string): string {
  const match = LIMIT_PATTERN.exec(sql);
  if (!match) {
    const defaultLimit = AGGREGATE_FNS.test(sql) ? MAX_QUERY_ROWS : DEFAULT_ROW_LIMIT;
    return `${sql} LIMIT ${defaultLimit}`;
  }

  const requested = Number(match[1]);
  if (!Number.isFinite(requested) || requested < 1) {
    throw new SQLValidationError("LIMIT must be a positive number.");
  }
  if (requested <= MAX_QUERY_ROWS) return sql;

  return sql.replace(LIMIT_PATTERN, `LIMIT ${MAX_QUERY_ROWS}`);
}
