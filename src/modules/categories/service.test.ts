import assert from "node:assert/strict";
import { test } from "node:test";
import type { Pool } from "pg";

import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "./service.ts";

type QueryResult = { rows: unknown[]; rowCount?: number | null };

function fakePool(result: QueryResult) {
  const calls: Array<{ text: string; params?: unknown[] }> = [];
  const pool = {
    query: async (text: string, params?: unknown[]) => {
      calls.push({ text, params });
      return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
    },
  } as unknown as Pool;
  return { pool, calls };
}

test("listCategories mengembalikan baris dari query", async () => {
  const { pool } = fakePool({
    rows: [{ id: "1", name: "Oli", createdAt: "2026-01-01" }],
  });

  const rows = await listCategories(pool);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Oli");
});

test("createCategory mengirim nama sebagai parameter", async () => {
  const { pool, calls } = fakePool({
    rows: [{ id: "2", name: "Ban", createdAt: "2026-01-01" }],
  });

  const category = await createCategory(pool, "Ban");

  assert.equal(category.id, "2");
  assert.deepEqual(calls[0].params, ["Ban"]);
});

test("updateCategory mengembalikan null jika tidak ada baris", async () => {
  const { pool } = fakePool({ rows: [] });

  assert.equal(await updateCategory(pool, "99", "Baru"), null);
});

test("deleteCategory memakai rowCount", async () => {
  const { pool } = fakePool({ rows: [], rowCount: 0 });

  assert.equal(await deleteCategory(pool, "99"), false);
});
