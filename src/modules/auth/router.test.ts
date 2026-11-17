import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import express from "express";
import type { Pool } from "pg";

import { hashPassword } from "./service.ts";
import { createAuthRouter } from "./router.ts";

const user = {
  id: "1",
  username: "admin",
  name: "Admin",
  role: "ADMIN",
};

let server: Server;
let baseUrl: string;

before(async () => {
  const passwordHash = await hashPassword("rahasia123");

  const pool = {
    query: async (text: string) => {
      if (text.includes("password_hash")) {
        return { rows: [{ ...user, passwordHash }] };
      }
      if (text.includes("FROM sessions s")) return { rows: [user] };
      return { rows: [] };
    },
  } as unknown as Pool;

  const app = express();
  app.use(express.json());
  app.use("/auth", createAuthRouter(() => pool));

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

function cookieFrom(res: Response): string {
  const header = res.headers.get("set-cookie") ?? "";
  return header.split(";")[0];
}

test("POST /auth/login benar mengembalikan user dan cookie httpOnly", async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "rahasia123" }),
  });

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), user);
  assert.match(res.headers.get("set-cookie") ?? "", /session=/);
  assert.match(res.headers.get("set-cookie") ?? "", /HttpOnly/i);
});

test("POST /auth/login password salah mengembalikan 401", async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "salah" }),
  });

  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "Username atau password salah" });
});

test("POST /auth/login body kosong mengembalikan 400", async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(res.status, 400);
});

test("GET /auth/me memakai cookie sesi", async () => {
  const login = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "rahasia123" }),
  });

  const me = await fetch(`${baseUrl}/auth/me`, {
    headers: { Cookie: cookieFrom(login) },
  });

  assert.equal(me.status, 200);
  assert.equal((await me.json()).role, "ADMIN");
});

test("POST /auth/logout menghapus cookie", async () => {
  const res = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    headers: { Cookie: "session=apa-saja" },
  });

  assert.equal(res.status, 204);
  assert.match(res.headers.get("set-cookie") ?? "", /session=;/);
});
