const BLOCKED = [
  /\bINSERT\b/i, /\bUPDATE\b/i, /\bDELETE\b/i, /\bDROP\b/i,
  /\bALTER\b/i, /\bTRUNCATE\b/i, /\bCREATE\b/i, /\bGRANT\b/i,
  /\bREVOKE\b/i, /\bEXEC\b/i, /\bEXECUTE\b/i, /\bPRAGMA\b/i,
  /\bATTACH\b/i, /\bDETACH\b/i, /\bLOAD\b/i,
];

const AGGREGATE_FNS = /\b(COUNT|SUM|AVG|MIN|MAX|GROUP BY)\b/i;

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

  // Add LIMIT if not present and not aggregate
  const isAggregate = AGGREGATE_FNS.test(clean);
  if (!isAggregate && !/\bLIMIT\b/i.test(clean)) {
    clean = `${clean} LIMIT 100`;
  }

  return clean;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
