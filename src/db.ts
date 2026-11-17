import { Pool } from "pg";

let pool: Pool | undefined;

// Lazy: tes dan cold start tanpa DATABASE_URL tidak langsung gagal saat import.
export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum diset. Salin .env.example ke .env lalu isi.",
    );
  }

  const created = new Pool({ connectionString, max: 5 });

  created.on("error", (err) => {
    console.error("Postgres pool error:", err.message);
  });

  pool = created;
  return pool;
}
