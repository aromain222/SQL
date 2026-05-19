import test from "node:test";
import assert from "node:assert/strict";
import { parseCSV } from "@/lib/csv";
import { assertDatasetId, DatasetIdError } from "@/lib/dataset-id";
import { friendlyErrorMessage } from "@/lib/errors";

test("dataset ids must be UUIDs", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";
  assert.equal(assertDatasetId(id), id);
  assert.throws(() => assertDatasetId("../data"), DatasetIdError);
});

test("csv parser rejects unnamed header rows", () => {
  assert.throws(
    () => parseCSV(",\n1,2"),
    /at least one named column/,
  );
});

test("csv parser deduplicates duplicate headers", () => {
  const parsed = parseCSV("Revenue,Revenue\n1,2\n3,4");
  assert.deepEqual(
    parsed.columns.map((col) => col.sanitizedName),
    ["revenue", "revenue_1"],
  );
});

test("friendly errors translate common sqlite failures", () => {
  assert.match(
    friendlyErrorMessage(new Error("SQLITE_ERROR: no such column: revenuee")),
    /column that does not exist/,
  );
  assert.match(
    friendlyErrorMessage(new Error("SQLITE_ERROR: near \"FROMM\": syntax error")),
    /generated SQL was invalid/,
  );
});

