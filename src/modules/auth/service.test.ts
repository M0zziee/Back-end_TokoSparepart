import assert from "node:assert/strict";
import { test } from "node:test";
import type { Pool } from "pg";

import {
  createSession,
  findUserByToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "./service.ts";

test("hashPassword lalu verifyPassword cocok", async () => {
  const stored = await hashPassword("rahasia123");
  assert.match(stored, /^scrypt\$/);
  assert.equal(await verifyPassword("rahasia123", stored), true);
});

test("verifyPassword menolak password salah dan hash rusak", async () => {
  const stored = await hashPassword("rahasia123");
  assert.equal(await verifyPassword("salah", stored), false);
  assert.equal(await verifyPassword("rahasia123", "bukan-hash"), false);
});

test("hash berbeda untuk password sama (salt acak)", async () => {
  const first = await hashPassword("rahasia123");
  const second = await hashPassword("rahasia123");
  assert.notEqual(first, second);
});

test("hashToken stabil dan menyembunyikan token asli", () => {
  const token = "token-asli";
  assert.equal(hashToken(token), hashToken(token));
  assert.match(hashToken(token), /^[0-9a-f]{64}$/);
  assert.notEqual(hashToken(token), token);
});

test("createSession menyimpan hash token, bukan token mentah", async () => {
  const params: unknown[][] = [];
  const pool = {
    query: async (_text: string, values?: unknown[]) => {
      params.push(values ?? []);
      return { rows: [] };
    },
  } as unknown as Pool;

  const { token, expiresAt } = await createSession(pool, "1");

  assert.equal(params[0][0], hashToken(token));
  assert.equal(params[0][1], "1");
  assert.ok(expiresAt.getTime() > Date.now());
});

test("findUserByToken memfilter sesi kedaluwarsa dan user nonaktif", async () => {
  let sql = "";
  const pool = {
    query: async (text: string) => {
      sql = text;
      return { rows: [] };
    },
  } as unknown as Pool;

  assert.equal(await findUserByToken(pool, "token"), null);
  assert.match(sql, /expires_at > now\(\)/);
  assert.match(sql, /u\.active/);
});
