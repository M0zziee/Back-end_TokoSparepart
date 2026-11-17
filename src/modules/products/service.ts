import type { Pool } from "pg";

export type Product = {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  // shortcut: numeric(12,2) dikirim sebagai float karena frontend butuh number;
  // hitungan uang tetap dilakukan di DB (POS Fase 3), bukan di JS.
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = {
  sku: string;
  name: string;
  categoryId: string | null;
  price: number;
};

export type ProductChanges = Partial<ProductInput> & { active?: boolean };

const selectColumns = `
  p.id,
  p.sku,
  p.name,
  p.category_id AS "categoryId",
  c.name AS "categoryName",
  p.price::float8 AS price,
  p.active,
  p.created_at AS "createdAt",
  p.updated_at AS "updatedAt"
`;

const selectFrom = `
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

export async function listProducts(
  pool: Pool,
  includeInactive = false,
): Promise<Product[]> {
  const { rows } = await pool.query<Product>(
    `SELECT ${selectColumns} ${selectFrom}
     ${includeInactive ? "" : "WHERE p.active"}
     ORDER BY p.name ASC`,
  );
  return rows;
}

export async function getProduct(
  pool: Pool,
  id: string,
): Promise<Product | null> {
  const { rows } = await pool.query<Product>(
    `SELECT ${selectColumns} ${selectFrom} WHERE p.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createProduct(
  pool: Pool,
  input: ProductInput,
): Promise<Product | null> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO products (sku, name, category_id, price)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [input.sku, input.name, input.categoryId, input.price],
  );
  return getProduct(pool, rows[0].id);
}

export async function updateProduct(
  pool: Pool,
  id: string,
  changes: ProductChanges,
): Promise<Product | null> {
  const columns: Record<keyof ProductChanges, string> = {
    sku: "sku",
    name: "name",
    categoryId: "category_id",
    price: "price",
    active: "active",
  };

  const sets: string[] = [];
  const params: unknown[] = [id];

  for (const [key, column] of Object.entries(columns)) {
    const value = changes[key as keyof ProductChanges];
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }

  if (sets.length === 0) {
    return getProduct(pool, id);
  }

  const { rowCount } = await pool.query(
    `UPDATE products SET ${sets.join(", ")}, updated_at = now() WHERE id = $1`,
    params,
  );
  if (!rowCount) return null;

  return getProduct(pool, id);
}

// Nonaktifkan, bukan hapus: riwayat stok dan penjualan tetap utuh.
export async function deactivateProduct(
  pool: Pool,
  id: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    "UPDATE products SET active = false, updated_at = now() WHERE id = $1 AND active",
    [id],
  );
  return (rowCount ?? 0) > 0;
}
