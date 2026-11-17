import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import express from "express";
import type { Pool } from "pg";

import { createCategoriesRouter } from "./router.ts";

let server: Server;
let baseUrl: string;

function fakePool(query: Pool["query"]): Pool {
  return { query } as unknown as Pool;
}

before(async () => {
  const pool = fakePool((async (text: string) => {
    if (text.includes("INSERT") && text.includes("(name)")) {
      throw Object.assign(new Error("duplicate key"), { code: "23505" });
    }
    return { rows: [], rowCount: 0 };
  }) as unknown as Pool["query"]);

  const app = express();
  app.use(express.json());
  app.use("/categories", createCategoriesRouter(() => pool));

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

test("POST /categories tanpa nama mengembalikan 400", async () => {
  const res = await fetch(`${baseUrl}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "Nama kategori wajib diisi" });
});

test("POST /categories nama duplikat mengembalikan 409", async () => {
  const res = await fetch(`${baseUrl}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Oli" }),
  });

  assert.equal(res.status, 409);
  assert.deepEqual(await res.json(), { error: "Nama kategori sudah dipakai" });
});

test("PATCH /categories/:id id bukan angka mengembalikan 400", async () => {
  const res = await fetch(`${baseUrl}/categories/abc`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Baru" }),
  });

  assert.equal(res.status, 400);
});

test("PATCH /categories/:id tidak ada baris mengembalikan 404", async () => {
  const res = await fetch(`${baseUrl}/categories/99`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Baru" }),
  });

  assert.equal(res.status, 404);
});

test("DELETE /categories/:id tidak ada baris mengembalikan 404", async () => {
  const res = await fetch(`${baseUrl}/categories/99`, { method: "DELETE" });

  assert.equal(res.status, 404);
});
