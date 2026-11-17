import assert from "node:assert/strict";
import { test } from "node:test";

import { isForeignKeyViolation, isUniqueViolation } from "./pg-errors.ts";

test("isUniqueViolation hanya true untuk kode 23505", () => {
  assert.equal(isUniqueViolation({ code: "23505" }), true);
  assert.equal(isUniqueViolation({ code: "23503" }), false);
  assert.equal(isUniqueViolation(new Error("x")), false);
});

test("isForeignKeyViolation hanya true untuk kode 23503", () => {
  assert.equal(isForeignKeyViolation({ code: "23503" }), true);
  assert.equal(isForeignKeyViolation({ code: "23505" }), false);
  assert.equal(isForeignKeyViolation(null), false);
});
