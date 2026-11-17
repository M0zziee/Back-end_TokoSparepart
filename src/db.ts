import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum diset. Salin .env.example ke .env lalu isi.");
}

export const pool = new Pool({ connectionString, max: 5 });

pool.on("error", (err) => {
  console.error("Postgres pool error:", err.message);
});
