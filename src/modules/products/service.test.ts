import assert from "node:assert/strict";
import { test } from "node:test";
import type { Pool } from "pg";

import {
  createProduct,
  deactivateProduct,
  listProducts,
  updateProduct,
} from "./service.ts";

const row = {
  id: "1",
  sku: "OLI-10W40",
  name: "Oli Mesin",
  categoryId: null,
  categoryName: null,
  price: 55000,
  active: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

function fakePool(handler: (text: string, params?: unknown[]) => unknown) {
  const calls: Array<{ text: string; params?: unknown[] }> = [];
  const pool = {
    query: async (text: string, params?: unknown[]) => {
      calls.push({ text, params });
      return handler(text, params);
    },
  } as unknown as Pool;
  return { pool, calls };
}

test("listProducts menyaring produk nonaktif secara default", async () => {
  const { pool, calls } = fakePool(() => ({ rows: [row] }));

  await listProducts(pool);

  assert.match(calls[0].text, /WHERE p\.active/);
});

test("listProducts includeInactive tidak memakai filter aktif", async () => {
  const { pool, calls } = fakePool(() => ({ rows: [row] }));

  await listProducts(pool, true);

  assert.doesNotMatch(calls[0].text, /WHERE p\.active/);
});

test("createProduct insert lalu ambil ulang dengan join kategori", async () => {
  const { pool, calls } = fakePool((text) =>
    text.includes("INSERT") ? { rows: [{ id: "1" }] } : { rows: [row] },
  );

  const product = await createProduct(pool, {
    sku: "OLI-10W40",
    name: "Oli Mesin",
    categoryId: null,
    price: 55000,
  });

  assert.equal(product?.id, "1");
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].params, ["OLI-10W40", "Oli Mesin", null, 55000]);
});

test("updateProduct mengembalikan null jika id tidak ada", async () => {
  const { pool } = fakePool(() => ({ rows: [], rowCount: 0 }));

  assert.equal(await updateProduct(pool, "99", { name: "Baru" }), null);
});

test("updateProduct hanya mengubah field yang dikirim", async () => {
  const { pool, calls } = fakePool((text) =>
    text.includes("UPDATE") ? { rows: [], rowCount: 1 } : { rows: [row] },
  );

  await updateProduct(pool, "1", { name: "Baru" });

  assert.match(calls[0].text, /SET name = \$2, updated_at = now\(\)/);
  assert.deepEqual(calls[0].params, ["1", "Baru"]);
});

test("deactivateProduct memakai rowCount", async () => {
  const { pool } = fakePool(() => ({ rows: [], rowCount: 0 }));

  assert.equal(await deactivateProduct(pool, "99"), false);
});
