import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "../src/db.ts";

const dir = fileURLToPath(new URL(".", import.meta.url));
const pool = getPool();
const client = await pool.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const { rowCount } = await client.query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [file],
    );
    if (rowCount) continue;

    const sql = await readFile(join(dir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`applied ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }

  console.log("migrasi selesai");
} finally {
  client.release();
  await pool.end();
}
