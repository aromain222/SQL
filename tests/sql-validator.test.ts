import test from "node:test";
import assert from "node:assert/strict";
import { validateSQL, SQLValidationError } from "@/lib/sql-validator";

const COLUMNS = ["category", "revenue", "created_at"];

test("adds a default limit to non-aggregate selects", () => {
  assert.equal(
    validateSQL("SELECT category, revenue FROM dataset", "dataset", COLUMNS),
    "SELECT category, revenue FROM dataset LIMIT 100",
  );
});

test("caps oversized limits", () => {
  assert.equal(
    validateSQL("SELECT category, revenue FROM dataset LIMIT 9999", "dataset", COLUMNS),
    "SELECT category, revenue FROM dataset LIMIT 500",
  );
});

test("blocks destructive SQL", () => {
  assert.throws(
    () => validateSQL("DROP TABLE dataset", "dataset", COLUMNS),
    SQLValidationError,
  );
});

test("blocks joins and unions", () => {
  assert.throws(
    () => validateSQL("SELECT * FROM dataset UNION SELECT * FROM dataset", "dataset", COLUMNS),
    SQLValidationError,
  );
});

test("rejects unknown quoted identifiers", () => {
  assert.throws(
    () => validateSQL('SELECT "missing_column" FROM dataset', "dataset", COLUMNS),
    /Unknown column or table/,
  );
});

