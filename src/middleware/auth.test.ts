import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import express from "express";
import type { Pool } from "pg";

import { adminForWrites, requireAuth, requireRole } from "./auth.ts";

const admin = { id: "1", username: "admin", name: "Admin", role: "ADMIN" };
const kasir = { id: "2", username: "kasir", name: "Kasir", role: "KASIR" };

let server: Server;
let baseUrl: string;

function poolFor(user: typeof admin | null): Pool {
  return {
    query: async () => ({ rows: user ? [user] : [] }),
  } as unknown as Pool;
}

function buildApp(pool: Pool) {
  const app = express();
  const getDb = () => pool;

  app.get("/private", requireAuth(getDb), (_req, res) => {
    res.json(res.locals.user);
  });
  app.get("/admin", requireAuth(getDb), requireRole("ADMIN"), (_req, res) => {
    res.json({ ok: true });
  });
  app.post("/write", requireAuth(getDb), adminForWrites(), (_req, res) => {
    res.status(204).end();
  });

  return app;
}

before(async () => {
  server = buildApp(poolFor(admin)).listen(0);
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

async function withPool<T>(pool: Pool, run: (url: string) => Promise<T>) {
  const extra = buildApp(pool).listen(0);
  await new Promise<void>((resolve) => extra.once("listening", resolve));
  const address = extra.address();
  if (!address || typeof address === "string") {
    throw new Error("gagal bind ke port acak");
  }
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    extra.close();
  }
}

test("tanpa cookie mengembalikan 401", async () => {
  const res = await fetch(`${baseUrl}/private`);
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "Silakan login" });
});

test("cookie tanpa sesi valid mengembalikan 401", async () => {
  await withPool(poolFor(null), async (url) => {
    const res = await fetch(`${url}/private`, {
      headers: { Cookie: "session=palsu" },
    });
    assert.equal(res.status, 401);
  });
});

test("ADMIN boleh akses route admin dan menulis", async () => {
  const admin1 = await fetch(`${baseUrl}/admin`, {
    headers: { Cookie: "session=valid" },
  });
  assert.equal(admin1.status, 200);

  const write = await fetch(`${baseUrl}/write`, {
    method: "POST",
    headers: { Cookie: "session=valid" },
  });
  assert.equal(write.status, 204);
});

test("KASIR ditolak 403 di route admin dan saat menulis", async () => {
  await withPool(poolFor(kasir), async (url) => {
    const admin1 = await fetch(`${url}/admin`, {
      headers: { Cookie: "session=valid" },
    });
    assert.equal(admin1.status, 403);

    const write = await fetch(`${url}/write`, {
      method: "POST",
      headers: { Cookie: "session=valid" },
    });
    assert.equal(write.status, 403);

    const read = await fetch(`${url}/private`, {
      headers: { Cookie: "session=valid" },
    });
    assert.equal(read.status, 200);
  });
});
