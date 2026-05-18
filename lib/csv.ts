import Papa from "papaparse";
import type { ColumnMeta, ColumnType, CleaningWarning } from "@/types";

// ─── name sanitization ───────────────────────────────────────────────────────

function sanitizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^([0-9])/, "_$1")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60) || "col";
}

// ─── value normalization ──────────────────────────────────────────────────────

type DetectedFormat = "currency" | "percentage" | "date" | "number" | undefined;

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                          // 2024-01-15
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,                  // 1/15/2024
  /^\d{1,2}-\d{1,2}-\d{2,4}$/,                    // 1-15-2024
  /^\d{4}\/\d{2}\/\d{2}$/,                        // 2024/01/15
  /^[A-Za-z]+ \d{1,2},? \d{4}$/,                  // January 15, 2024
  /^\d{1,2} [A-Za-z]+ \d{4}$/,                    // 15 January 2024
];

function detectFormat(values: string[]): DetectedFormat {
  const nonEmpty = values.filter((v) => v !== "");
  if (nonEmpty.length === 0) return undefined;
  const sample = nonEmpty.slice(0, 50);

  const isCurrency = sample.every((v) => /^-?[$€£¥][\d,]+(\.\d+)?$|^-?[\d,]+(\.\d+)?[$€£¥]$/.test(v.trim()));
  if (isCurrency) return "currency";

  const isPct = sample.every((v) => /^-?\d+(\.\d+)?%$/.test(v.trim()));
  if (isPct) return "percentage";

  const isDate = sample.every((v) => DATE_PATTERNS.some((p) => p.test(v.trim())));
  if (isDate) return "date";

  const isNum = sample.every((v) => /^-?[\d,]+(\.\d+)?$/.test(v.trim()) && v.trim() !== "");
  if (isNum) return "number";

  return undefined;
}

function normalizeValue(raw: string, format: DetectedFormat): string {
  const v = raw.trim();
  if (v === "") return "";
  switch (format) {
    case "currency":
      return v.replace(/[$€£¥,]/g, "");
    case "percentage":
      return v.replace(/%$/, "");
    case "number":
      return v.replace(/,/g, "");
    default:
      return v;
  }
}

function inferType(values: string[], format: DetectedFormat): ColumnType {
  if (format === "date") return "date";
  const nonNull = values.filter((v) => v !== "");
  if (nonNull.length === 0) return "text";
  if (format === "currency" || format === "percentage") return "real";
  if (format === "number") {
    const allInt = nonNull.every((v) => Number.isInteger(Number(v)));
    return allInt ? "integer" : "real";
  }
  if (nonNull.every((v) => Number.isInteger(Number(v)) && !isNaN(Number(v)))) return "integer";
  if (nonNull.every((v) => !isNaN(Number(v)))) return "real";
  return "text";
}

// ─── public API ───────────────────────────────────────────────────────────────

export interface ParsedCSV {
  columns: ColumnMeta[];
  rows: Record<string, string>[];
  warnings: CleaningWarning[];
}

export function parseCSV(csvText: string): ParsedCSV {
  const result = Papa.parse<string[]>(csvText.trim(), {
    header: false,
    skipEmptyLines: true,
  });

  const data = result.data as string[][];
  if (data.length < 2) throw new Error("CSV must have a header row and at least one data row.");

  const rawHeaders = data[0].map((h) => h.trim());
  const dataRows = data.slice(1);
  const warnings: CleaningWarning[] = [];

  // Detect duplicate original names
  const nameCounts = new Map<string, number>();
  for (const h of rawHeaders) nameCounts.set(h, (nameCounts.get(h) ?? 0) + 1);

  // Build sanitized names, deduplicating
  const seenSanitized = new Map<string, number>();
  const columns: ColumnMeta[] = rawHeaders.map((h, i) => {
    const isDuplicate = (nameCounts.get(h) ?? 0) > 1;
    if (isDuplicate) {
      warnings.push({ column: h, level: "warning", message: `Duplicate column name "${h}" — disambiguated automatically.` });
    }

    let base = sanitizeName(h) || `col_${i}`;
    const count = seenSanitized.get(base) ?? 0;
    seenSanitized.set(base, count + 1);
    const sanitizedName = count === 0 ? base : `${base}_${count}`;

    const rawValues = dataRows.map((r) => (r[i] ?? "").trim());
    const format = detectFormat(rawValues);
    const normalized = rawValues.map((v) => normalizeValue(v, format));
    const nonEmpty = normalized.filter((v) => v !== "");
    const unique = new Set(nonEmpty);
    const nullCount = normalized.length - nonEmpty.length;
    const nullPct = normalized.length > 0 ? nullCount / normalized.length : 0;
    const isEmpty = nonEmpty.length === 0;
    const isMostlyEmpty = !isEmpty && nullPct > 0.8;

    if (isEmpty) {
      warnings.push({ column: h, level: "warning", message: `Column "${h}" is completely empty and will be included as text.` });
    } else if (isMostlyEmpty) {
      warnings.push({
        column: h,
        level: "warning",
        message: `Column "${h}" is ${Math.round(nullPct * 100)}% empty — queries may return sparse results.`,
      });
    }

    if (format === "currency") {
      warnings.push({ column: h, level: "info", message: `Column "${h}" detected as currency — symbols and commas removed, stored as number.` });
    } else if (format === "percentage") {
      warnings.push({ column: h, level: "info", message: `Column "${h}" detected as percentage — "%" removed, stored as number.` });
    } else if (format === "date") {
      warnings.push({ column: h, level: "info", message: `Column "${h}" detected as dates — stored as text for flexible querying.` });
    }

    return {
      originalName: h,
      sanitizedName,
      type: inferType(normalized, format),
      sampleValues: [...unique].slice(0, 5),
      nullCount,
      uniqueCount: unique.size,
      isEmpty,
      isMostlyEmpty,
      isDuplicate: isDuplicate,
      detectedFormat: format,
    };
  });

  // Rebuild rows with normalized + trimmed values
  const rows = dataRows.map((r) =>
    Object.fromEntries(
      columns.map((col, i) => [col.sanitizedName, normalizeValue((r[i] ?? "").trim(), col.detectedFormat)])
    )
  );

  return { columns, rows, warnings };
}
