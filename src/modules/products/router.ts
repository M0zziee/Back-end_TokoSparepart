import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";

import { getPool } from "../../db.ts";
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "../../lib/pg-errors.ts";
import {
  createProduct,
  deactivateProduct,
  getProduct,
  listProducts,
  type ProductChanges,
  updateProduct,
} from "./service.ts";

const idPattern = /^\d+$/;
const maxPrice = 9_999_999_999.99;

type Body = Record<string, unknown>;

function bad(res: Response, error: string) {
  res.status(400).json({ error });
}

function readId(req: Request, res: Response): string | null {
  const id = req.params.id;

  if (typeof id !== "string" || !idPattern.test(id)) {
    bad(res, "id produk tidak valid");
    return null;
  }

  return id;
}

function parseText(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return value.trim();
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < 0 || value > maxPrice) return undefined;
  return value;
}

// undefined = tidak valid, null = tanpa kategori.
function parseCategoryId(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !idPattern.test(value)) return undefined;
  return value;
}

async function handlePgErrors(
  res: Response,
  action: () => Promise<void>,
): Promise<void> {
  try {
    await action();
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "SKU sudah dipakai" });
      return;
    }
    if (isForeignKeyViolation(err)) {
      bad(res, "Kategori tidak ditemukan");
      return;
    }
    throw err;
  }
}

export function createProductsRouter(getDb: () => Pool = getPool): Router {
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === "true";
    res.json(await listProducts(getDb(), includeInactive));
  });

  router.get("/:id", async (req: Request, res: Response) => {
    const id = readId(req, res);
    if (id === null) return;

    const product = await getProduct(getDb(), id);
    if (!product) {
      res.status(404).json({ error: "Produk tidak ditemukan" });
      return;
    }
    res.json(product);
  });

  router.post("/", async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Body;

    const sku = parseText(body.sku);
    if (sku === undefined) return bad(res, "SKU wajib diisi");

    const name = parseText(body.name);
    if (name === undefined) return bad(res, "Nama produk wajib diisi");

    const price = parsePrice(body.price);
    if (price === undefined) {
      return bad(res, "Harga harus angka antara 0 dan 9999999999.99");
    }

    const categoryId = parseCategoryId(body.categoryId ?? null);
    if (categoryId === undefined) return bad(res, "Kategori tidak valid");

    await handlePgErrors(res, async () => {
      const product = await createProduct(getDb(), {
        sku,
        name,
        categoryId,
        price,
      });
      res.status(201).json(product);
    });
  });

  router.patch("/:id", async (req: Request, res: Response) => {
    const id = readId(req, res);
    if (id === null) return;

    const body = (req.body ?? {}) as Body;
    const changes: ProductChanges = {};

    if ("sku" in body) {
      const sku = parseText(body.sku);
      if (sku === undefined) return bad(res, "SKU wajib diisi");
      changes.sku = sku;
    }
    if ("name" in body) {
      const name = parseText(body.name);
      if (name === undefined) return bad(res, "Nama produk wajib diisi");
      changes.name = name;
    }
    if ("price" in body) {
      const price = parsePrice(body.price);
      if (price === undefined) {
        return bad(res, "Harga harus angka antara 0 dan 9999999999.99");
      }
      changes.price = price;
    }
    if ("categoryId" in body) {
      const categoryId = parseCategoryId(body.categoryId);
      if (categoryId === undefined) return bad(res, "Kategori tidak valid");
      changes.categoryId = categoryId;
    }
    if ("active" in body) {
      if (typeof body.active !== "boolean") {
        return bad(res, "active harus boolean");
      }
      changes.active = body.active;
    }

    if (Object.keys(changes).length === 0) {
      return bad(res, "Tidak ada field yang diubah");
    }

    await handlePgErrors(res, async () => {
      const product = await updateProduct(getDb(), id, changes);
      if (!product) {
        res.status(404).json({ error: "Produk tidak ditemukan" });
        return;
      }
      res.json(product);
    });
  });

  router.delete("/:id", async (req: Request, res: Response) => {
    const id = readId(req, res);
    if (id === null) return;

    if (!(await deactivateProduct(getDb(), id))) {
      res.status(404).json({ error: "Produk tidak ditemukan" });
      return;
    }
    res.status(204).end();
  });

  return router;
}
