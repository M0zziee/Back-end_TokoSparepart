import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import express from "express";
import type { Pool } from "pg";

import { createProductsRouter } from "./router.ts";

let server: Server;
let baseUrl: string;

const product = {
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

before(async () => {
  const pool = {
    query: async (text: string) => {
      if (text.includes("INSERT")) {
        throw Object.assign(new Error("duplicate key"), { code: "23505" });
      }
      if (text.includes("WHERE p.id")) return { rows: [], rowCount: 0 };
      return { rows: [product] };
    },
  } as unknown as Pool;

  const app = express();
  app.use(express.json());
  app.use("/products", createProductsRouter(() => pool));

  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("gagal bind ke port acak");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(() => {
  server.close();
});

test("GET /products mengembalikan daftar", async () => {
  const res = await fetch(`${baseUrl}/products`);

  assert.equal(res.status, 200);
  const body = (await res.json()) as unknown[];
  assert.equal(body.length, 1);
});

test("POST /products harga bukan angka mengembalikan 400", async () => {
  const res = await fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku: "X", name: "X", price: "mahal" }),
  });

  assert.equal(res.status, 400);
});

test("POST /products SKU duplikat mengembalikan 409", async () => {
  const res = await fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku: "OLI-10W40", name: "Oli", price: 55000 }),
  });

  assert.equal(res.status, 409);
});

test("POST /products kategoriId bukan angka mengembalikan 400", async () => {
  const res = await fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku: "X", name: "X", price: 1, categoryId: "oli" }),
  });

  assert.equal(res.status, 400);
});

test("PATCH /products/:id tanpa field mengembalikan 400", async () => {
  const res = await fetch(`${baseUrl}/products/1`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(res.status, 400);
});

test("GET /products/:id tidak ada mengembalikan 404", async () => {
  const res = await fetch(`${baseUrl}/products/99`);

  assert.equal(res.status, 404);
});
