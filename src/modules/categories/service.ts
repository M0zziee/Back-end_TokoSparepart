import type { Pool } from "pg";

export type Category = {
  id: string;
  name: string;
  createdAt: string;
};

export async function listCategories(pool: Pool): Promise<Category[]> {
  const { rows } = await pool.query<Category>(
    'SELECT id, name, created_at AS "createdAt" FROM categories ORDER BY name ASC',
  );
  return rows;
}

export async function createCategory(
  pool: Pool,
  name: string,
): Promise<Category> {
  const { rows } = await pool.query<Category>(
    'INSERT INTO categories (name) VALUES ($1) RETURNING id, name, created_at AS "createdAt"',
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
    'UPDATE categories SET name = $2 WHERE id = $1 RETURNING id, name, created_at AS "createdAt"',
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
