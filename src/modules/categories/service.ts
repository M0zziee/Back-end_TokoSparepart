import type { Pool } from "pg";

export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export async function listCategories(pool: Pool): Promise<Category[]> {
  const { rows } = await pool.query<Category>(
    "SELECT id, name, created_at FROM categories ORDER BY name ASC",
  );
  return rows;
}

export async function createCategory(
  pool: Pool,
  name: string,
): Promise<Category> {
  const { rows } = await pool.query<Category>(
    "INSERT INTO categories (name) VALUES ($1) RETURNING id, name, created_at",
    [name],
  );
  return rows[0];
}

export async function updateCategory(
  pool: Pool,
  id: string,
  name: string,
): Promise<Category | null> {
  const { rows } = await pool.query<Category>(
    "UPDATE categories SET name = $2 WHERE id = $1 RETURNING id, name, created_at",
    [id, name],
  );
  return rows[0] ?? null;
}

export async function deleteCategory(
  pool: Pool,
  id: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    "DELETE FROM categories WHERE id = $1",
    [id],
  );
  return (rowCount ?? 0) > 0;
}

// pg melempar kode 23505 untuk pelanggaran UNIQUE.
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}
