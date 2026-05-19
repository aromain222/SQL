import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { datasetDir } from "@/lib/paths";
import type { ColumnMeta } from "@/types";

export function getDbPath(datasetId: string): string {
  return path.join(datasetDir(datasetId), "data.db");
}

export function openDb(datasetId: string, options: Database.Options = {}): Database.Database {
  return new Database(getDbPath(datasetId), {
    timeout: 1000,
    ...options,
  });
}

// dates stored as TEXT in SQLite for maximum flexibility
const SQL_TYPE: Record<ColumnMeta["type"], string> = {
  text: "TEXT",
  integer: "INTEGER",
  real: "REAL",
  date: "TEXT",
};

export function createTable(
  db: Database.Database,
  tableName: string,
  columns: ColumnMeta[],
  rows: Record<string, string>[]
): void {
  const colDefs = columns.map((c) => `"${c.sanitizedName}" ${SQL_TYPE[c.type]}`).join(", ");
  db.exec(`DROP TABLE IF EXISTS "${tableName}"`);
  db.exec(`CREATE TABLE "${tableName}" (${colDefs})`);

  const placeholders = columns.map(() => "?").join(", ");
  const insert = db.prepare(`INSERT INTO "${tableName}" VALUES (${placeholders})`);

  const insertMany = db.transaction((data: Record<string, string>[]) => {
    for (const row of data) {
      const values = columns.map((c) => {
        const raw = row[c.sanitizedName] ?? null;
        if (raw === "" || raw === null) return null;
        if (c.type === "integer") { const n = parseInt(raw, 10); return isNaN(n) ? null : n; }
        if (c.type === "real") { const n = parseFloat(raw); return isNaN(n) ? null : n; }
        return raw; // text / date
      });
      insert.run(values);
    }
  });

  insertMany(rows);
}

export function runQuery(
  db: Database.Database,
  sql: string
): { rows: Record<string, unknown>[]; columns: string[] } {
  db.pragma("query_only = ON");
  const stmt = db.prepare(sql);
  const rows = stmt.all() as Record<string, unknown>[];
  const columns =
    rows.length > 0
      ? Object.keys(rows[0])
      : stmt.columns().map((c) => c.name);
  return { rows, columns };
}

export function datasetExists(datasetId: string): boolean {
  return fs.existsSync(getDbPath(datasetId));
}
