import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";

import { errorHandler, notFound } from "./error.ts";

function mockResponse() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & typeof res;
}

test("notFound mengembalikan 404 format error", () => {
  const res = mockResponse();
  notFound({} as Request, res);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: "Endpoint tidak ditemukan" });
});

test("errorHandler mengembalikan 500 dengan pesan error", () => {
  const res = mockResponse();
  errorHandler(new Error("boom"), {} as Request, res, () => {});
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: "boom" });
});

test("errorHandler memakai pesan default untuk error non-Error", () => {
  const res = mockResponse();
  errorHandler("bukan error", {} as Request, res, () => {});
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: "Terjadi kesalahan" });
});
