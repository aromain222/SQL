import test from "node:test";
import assert from "node:assert/strict";
import { validateSQL, SQLValidationError } from "@/lib/sql-validator";

const TABLE = "dataset";
const COLS = ["category", "revenue", "created_at", "status", "customer_id", "amount"];

// ─── helpers ──────────────────────────────────────────────────────────────────

function blocks(sql: string, msgPattern?: RegExp) {
  assert.throws(
    () => validateSQL(sql, TABLE, COLS),
    msgPattern
      ? (err: unknown) => {
          assert.ok(err instanceof SQLValidationError, "Expected SQLValidationError");
          assert.match((err as SQLValidationError).message, msgPattern);
          return true;
        }
      : SQLValidationError,
  );
}

function passes(sql: string) {
  assert.doesNotThrow(() => validateSQL(sql, TABLE, COLS));
}

function result(sql: string) {
  return validateSQL(sql, TABLE, COLS);
}

// ─── SELECT requirement ───────────────────────────────────────────────────────

test("bare SELECT passes", () => passes(`SELECT "category" FROM ${TABLE}`));
test("lowercase select passes", () => passes(`select "category" from ${TABLE}`));
test("mixed-case SELECT passes", () => passes(`SeLeCt "revenue" FROM ${TABLE}`));
test("non-SELECT is rejected", () => blocks(`CALL something()`, /Only SELECT/));

// ─── DML – write operations ───────────────────────────────────────────────────

test("INSERT is blocked", () =>
  blocks(`INSERT INTO ${TABLE} VALUES ('x', 1)`, /Write operations/));
test("UPDATE is blocked", () =>
  blocks(`UPDATE ${TABLE} SET "revenue" = 0`, /Write operations/));
test("DELETE is blocked", () =>
  blocks(`DELETE FROM ${TABLE}`, /Write operations/));
test("DROP TABLE is blocked", () =>
  blocks(`DROP TABLE ${TABLE}`, /Write operations/));
test("ALTER TABLE is blocked", () =>
  blocks(`ALTER TABLE ${TABLE} ADD COLUMN foo TEXT`, /Write operations/));
test("TRUNCATE is blocked", () =>
  blocks(`TRUNCATE TABLE ${TABLE}`, /Write operations/));
test("CREATE TABLE is blocked", () =>
  blocks(`CREATE TABLE evil (x TEXT)`, /Write operations/));
test("GRANT is blocked", () =>
  blocks(`GRANT SELECT ON ${TABLE} TO user`, /Write operations/));
test("REVOKE is blocked", () =>
  blocks(`REVOKE SELECT ON ${TABLE} FROM user`, /Write operations/));
test("REPLACE is blocked", () =>
  blocks(`REPLACE INTO ${TABLE} VALUES ('a', 1)`, /Write operations/));
test("MERGE is blocked", () =>
  blocks(`MERGE INTO ${TABLE} USING src ON 1=1`, /Write operations/));

// ─── admin / introspection ────────────────────────────────────────────────────

test("EXPLAIN is blocked", () =>
  blocks(`EXPLAIN SELECT * FROM ${TABLE}`, /Administrative/));
test("EXPLAIN QUERY PLAN is blocked", () =>
  blocks(`EXPLAIN QUERY PLAN SELECT * FROM ${TABLE}`, /Administrative/));
test("PRAGMA table_info is blocked", () =>
  blocks(`PRAGMA table_info(${TABLE})`, /Administrative/));
test("ATTACH DATABASE is blocked", () =>
  blocks(`ATTACH DATABASE ':memory:' AS tmp`, /Administrative/));
test("DETACH DATABASE is blocked", () =>
  blocks(`DETACH DATABASE tmp`, /Administrative/));
test("VACUUM is blocked", () =>
  blocks(`VACUUM`, /Administrative/));
test("RETURNING clause is blocked", () =>
  blocks(`SELECT * FROM ${TABLE} RETURNING "revenue"`, /Administrative/));

// ─── set operations & multi-table ────────────────────────────────────────────

test("UNION is blocked", () =>
  blocks(`SELECT * FROM ${TABLE} UNION SELECT * FROM ${TABLE}`, /Set operations/));
test("UNION ALL is blocked", () =>
  blocks(`SELECT * FROM ${TABLE} UNION ALL SELECT * FROM ${TABLE}`, /Set operations/));
test("INTERSECT is blocked", () =>
  blocks(`SELECT * FROM ${TABLE} INTERSECT SELECT * FROM ${TABLE}`, /Set operations/));
test("EXCEPT is blocked", () =>
  blocks(`SELECT * FROM ${TABLE} EXCEPT SELECT * FROM ${TABLE}`, /Set operations/));
test("JOIN is blocked", () =>
  blocks(`SELECT * FROM ${TABLE} JOIN ${TABLE} ON 1=1`, /Set operations/));
test("LEFT JOIN is blocked", () =>
  blocks(`SELECT * FROM ${TABLE} LEFT JOIN ${TABLE} ON 1=1`, /Set operations/));
test("WITH CTE is blocked", () =>
  blocks(`WITH t AS (SELECT * FROM ${TABLE}) SELECT * FROM t`, /Set operations/));
test("WITH RECURSIVE is blocked", () =>
  blocks(`WITH RECURSIVE t(n) AS (SELECT 1) SELECT * FROM t`, /Set operations/));

// ─── system table access ─────────────────────────────────────────────────────

test("sqlite_master is blocked", () =>
  blocks(`SELECT * FROM sqlite_master`, /internal database/));
test("sqlite_schema is blocked", () =>
  blocks(`SELECT * FROM sqlite_schema`, /internal database/));
test("sqlite_temp_master is blocked", () =>
  blocks(`SELECT * FROM sqlite_temp_master`, /internal database/));
test("sqlite_sequence is blocked", () =>
  blocks(`SELECT * FROM sqlite_sequence`, /internal database/));
test("sqlite_stat1 is blocked", () =>
  blocks(`SELECT * FROM sqlite_stat1`, /internal database/));
test("sqlite_stat4 is blocked", () =>
  blocks(`SELECT * FROM sqlite_stat4`, /internal database/));

// ─── comment injection ────────────────────────────────────────────────────────

test("trailing -- comment is stripped and query passes", () =>
  passes(`SELECT "revenue" FROM ${TABLE} -- ignore me`));
test("block comment is stripped and query passes", () =>
  passes(`SELECT "revenue" FROM ${TABLE} /* normal comment */`));
test("DROP inside block comment is neutralised", () =>
  passes(`SELECT "revenue" FROM ${TABLE} /* DROP TABLE ${TABLE} */`));
test("comment cannot hide EXPLAIN after newline", () =>
  blocks(`SELECT "revenue" FROM ${TABLE}--\nEXPLAIN`, /Administrative/));

// ─── multi-statement ─────────────────────────────────────────────────────────

test("semicolon separating two SELECT statements is blocked", () =>
  blocks(
    `SELECT "revenue" FROM ${TABLE}; SELECT "category" FROM ${TABLE}`,
    /Multiple statements/,
  ));
test("semicolon followed by DML is blocked (caught as write operation)", () =>
  blocks(`SELECT * FROM ${TABLE}; DROP TABLE ${TABLE}`));
test("trailing double semicolon is normalised and query passes", () =>
  passes(`SELECT "revenue" FROM ${TABLE};;`));

// ─── table reference ─────────────────────────────────────────────────────────

test("query referencing wrong table is rejected", () =>
  blocks(`SELECT * FROM other_table`, /must reference the dataset table/));
test("subquery referencing correct table passes", () =>
  passes(`SELECT * FROM (SELECT "revenue" FROM ${TABLE})`));

// ─── identifier whitelist (double-quotes) ────────────────────────────────────

test("known column in double-quotes passes", () =>
  passes(`SELECT "revenue" FROM ${TABLE}`));
test("unknown column in double-quotes is rejected", () =>
  blocks(`SELECT "secret_col" FROM ${TABLE}`, /Unknown column or table/));
test("table name in double-quotes is allowed", () =>
  passes(`SELECT "revenue" FROM "${TABLE}"`));

// ─── identifier whitelist (backticks) ────────────────────────────────────────

test("known column in backticks passes", () =>
  passes("SELECT `revenue` FROM " + TABLE));
test("unknown column in backticks is rejected", () =>
  blocks("SELECT `evil_col` FROM " + TABLE, /Unknown column or table/));

// ─── identifier whitelist (square brackets) ──────────────────────────────────

test("known column in square brackets passes", () =>
  passes(`SELECT [revenue] FROM ${TABLE}`));
test("unknown column in square brackets is rejected", () =>
  blocks(`SELECT [evil_col] FROM ${TABLE}`, /Unknown column or table/));

// ─── LIMIT enforcement ───────────────────────────────────────────────────────

test("adds LIMIT 100 to plain SELECT", () =>
  assert.match(result(`SELECT "revenue" FROM ${TABLE}`), /LIMIT 100$/));
test("aggregate query gets LIMIT 500 default", () =>
  assert.match(
    result(`SELECT "category", SUM("revenue") FROM ${TABLE} GROUP BY "category"`),
    /LIMIT 500$/,
  ));
test("existing LIMIT within max is kept", () =>
  assert.match(result(`SELECT * FROM ${TABLE} LIMIT 50`), /LIMIT 50$/));
test("caps oversized LIMIT at 500", () =>
  assert.match(result(`SELECT * FROM ${TABLE} LIMIT 9999`), /LIMIT 500$/));
test("LIMIT 0 is rejected", () =>
  blocks(`SELECT * FROM ${TABLE} LIMIT 0`, /positive integer/));
test("negative LIMIT is rejected", () =>
  blocks(`SELECT * FROM ${TABLE} LIMIT -5`, /positive integer/));

// ─── safe finance queries must pass ──────────────────────────────────────────

test("SUM aggregate passes", () =>
  passes(`SELECT SUM("revenue") FROM ${TABLE}`));
test("GROUP BY with aggregate passes", () =>
  passes(`SELECT "category", SUM("revenue") FROM ${TABLE} GROUP BY "category"`));
test("WHERE with date filter passes", () =>
  passes(`SELECT "revenue" FROM ${TABLE} WHERE "created_at" >= '2024-01-01'`));
test("strftime grouping passes", () =>
  passes(
    `SELECT strftime('%Y-%m', "created_at") AS month, SUM("revenue") FROM ${TABLE} GROUP BY month`,
  ));
test("CASE WHEN passes", () =>
  passes(
    `SELECT "category", CASE WHEN "status" = 'active' THEN 1 ELSE 0 END AS is_active FROM ${TABLE}`,
  ));
test("scalar subquery aggregate passes", () =>
  passes(
    `SELECT "category", "revenue" FROM ${TABLE} WHERE "revenue" > (SELECT AVG("revenue") FROM ${TABLE})`,
  ));
test("ORDER BY with LIMIT passes", () =>
  passes(
    `SELECT "category", SUM("revenue") FROM ${TABLE} GROUP BY "category" ORDER BY SUM("revenue") DESC LIMIT 10`,
  ));
test("COUNT DISTINCT passes", () =>
  passes(`SELECT COUNT(DISTINCT "customer_id") AS uniq FROM ${TABLE}`));
test("NULLIF in formula passes", () =>
  passes(
    `SELECT ROUND(SUM("revenue") * 100.0 / NULLIF(SUM("amount"), 0), 2) AS pct FROM ${TABLE}`,
  ));
test("churn rate CASE formula passes", () =>
  passes(
    `SELECT COUNT(CASE WHEN "status" = 'churned' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) AS churn_pct FROM ${TABLE}`,
  ));
