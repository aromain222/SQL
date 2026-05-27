import { DEFAULT_ROW_LIMIT, MAX_QUERY_ROWS } from "@/lib/limits";

// ─── blocked pattern groups ───────────────────────────────────────────────────
// Grouped for specific error messages rather than one generic "blocked keyword"

const BLOCKED_WRITE =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|MERGE|REPLACE)\b/i;

const BLOCKED_ADMIN =
  /\b(EXEC|EXECUTE|PRAGMA|ATTACH|DETACH|LOAD|VACUUM|REINDEX|ANALYZE|EXPLAIN|RETURNING)\b/i;

// CTEs, set operations, and cross-table reads
const BLOCKED_MULTI_TABLE =
  /\b(WITH|RECURSIVE|UNION|INTERSECT|EXCEPT|JOIN)\b/i;

// SQLite internal / schema tables
const BLOCKED_SYSTEM_TABLES =
  /\b(sqlite_master|sqlite_schema|sqlite_temp_master|sqlite_sequence|sqlite_stat[0-9]*|sqlite_dbpage)\b/i;

const LIMIT_PATTERN = /\bLIMIT\s+(-?\d+)\b/i;
const AGGREGATE_FNS = /\b(COUNT|SUM|AVG|MIN|MAX|GROUP\s+BY)\b/i;

// ─── public API ───────────────────────────────────────────────────────────────

export class SQLValidationError extends Error {}

export function validateSQL(sql: string, tableName: string, allowedColumns: string[]): string {
  let clean = sql.trim().replace(/;+$/, "").trim();

  // Strip inline and block comments before any keyword checks
  clean = clean.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").trim();

  // Check specific prohibited patterns BEFORE the SELECT guard so we can give
  // specific, actionable error messages instead of the generic "Only SELECT..."
  checkBlockedPatterns(clean);

  if (!clean.toUpperCase().startsWith("SELECT")) {
    throw new SQLValidationError("Only SELECT queries are allowed.");
  }

  if (/;/.test(clean)) {
    throw new SQLValidationError("Multiple statements are not allowed.");
  }

  checkTableReference(clean, tableName);
  validateAllQuotedIdentifiers(clean, tableName, allowedColumns);
  clean = enforceLimit(clean);

  return clean;
}

// ─── internal helpers ─────────────────────────────────────────────────────────

function checkBlockedPatterns(sql: string): void {
  if (BLOCKED_WRITE.test(sql)) {
    throw new SQLValidationError(
      "Write operations are not permitted. Only SELECT queries are allowed on financial data."
    );
  }
  if (BLOCKED_ADMIN.test(sql)) {
    throw new SQLValidationError(
      "Administrative statements are not permitted. EXPLAIN, PRAGMA, and similar commands are blocked."
    );
  }
  if (BLOCKED_MULTI_TABLE.test(sql)) {
    throw new SQLValidationError(
      "Set operations, CTEs (WITH), and JOIN are not permitted. Only single-table SELECT queries are allowed."
    );
  }
  if (BLOCKED_SYSTEM_TABLES.test(sql)) {
    throw new SQLValidationError(
      "Access to internal database tables (sqlite_master, sqlite_schema, etc.) is not permitted."
    );
  }
}

function checkTableReference(sql: string, tableName: string): void {
  const tableRef = new RegExp(`\\b${escapeRegex(tableName)}\\b`, "i");
  if (!tableRef.test(sql)) {
    throw new SQLValidationError(
      `Query must reference the dataset table "${tableName}".`
    );
  }
}

/**
 * Validates all identifier quoting styles — double-quotes, backticks, and
 * square brackets — against the known column whitelist.
 */
function validateAllQuotedIdentifiers(
  sql: string,
  tableName: string,
  allowedColumns: string[]
): void {
  const allowed = new Set([
    tableName.toLowerCase(),
    ...allowedColumns.map((c) => c.toLowerCase()),
  ]);

  const checks: Array<{ pattern: RegExp; label: (id: string) => string }> = [
    { pattern: /"([^"]+)"/g,   label: (id) => `"${id}"` },
    { pattern: /`([^`]+)`/g,   label: (id) => `\`${id}\`` },
    { pattern: /\[([^\]]+)\]/g, label: (id) => `[${id}]` },
  ];

  for (const { pattern, label } of checks) {
    for (const match of sql.matchAll(pattern)) {
      const identifier = match[1]?.toLowerCase();
      if (identifier && !allowed.has(identifier)) {
        throw new SQLValidationError(`Unknown column or table ${label(match[1] ?? "")}.`);
      }
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
    throw new SQLValidationError("LIMIT must be a positive integer.");
  }
  if (requested <= MAX_QUERY_ROWS) return sql;

  return sql.replace(LIMIT_PATTERN, `LIMIT ${MAX_QUERY_ROWS}`);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
