import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";

import app from "./app.ts";

let server: Server;
let baseUrl: string;

before(async () => {
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

test("GET /health mengembalikan status ok", async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok" });
});

test("GET / mengembalikan sapaan", async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "Hello World!");
});

test("GET /openapi.json mengembalikan spec dengan path /health", async () => {
  const res = await fetch(`${baseUrl}/openapi.json`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { paths: Record<string, unknown> };
  assert.ok(body.paths["/health"]);
});

test("GET /docs menyajikan swagger ui", async () => {
  const res = await fetch(`${baseUrl}/docs/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /swagger/i);
});

test("route tak dikenal mengembalikan 404 format error", async () => {
  const res = await fetch(`${baseUrl}/tidak-ada`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: "Endpoint tidak ditemukan" });
});
