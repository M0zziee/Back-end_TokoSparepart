import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";

import { getPool } from "../../db.ts";
import {
  createCategory,
  deleteCategory,
  isUniqueViolation,
  listCategories,
  updateCategory,
} from "./service.ts";

const idPattern = /^\d+$/;

function readName(req: Request, res: Response): string | null {
  const body = req.body as { name?: unknown } | undefined;
  const name = body?.name;

  if (typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: "Nama kategori wajib diisi" });
    return null;
  }

  return name.trim();
}

function readId(req: Request, res: Response): string | null {
  const id = req.params.id;

  if (typeof id !== "string" || !idPattern.test(id)) {
    res.status(400).json({ error: "id kategori tidak valid" });
    return null;
  }

  return id;
}

export function createCategoriesRouter(getDb: () => Pool = getPool): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response) => {
    res.json(await listCategories(getDb()));
  });

  router.post("/", async (req: Request, res: Response) => {
    const name = readName(req, res);
    if (name === null) return;

    try {
      res.status(201).json(await createCategory(getDb(), name));
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: "Nama kategori sudah dipakai" });
        return;
      }
      throw err;
    }
  });

  router.patch("/:id", async (req: Request, res: Response) => {
    const id = readId(req, res);
    if (id === null) return;

    const name = readName(req, res);
    if (name === null) return;

    try {
      const category = await updateCategory(getDb(), id, name);
      if (!category) {
        res.status(404).json({ error: "Kategori tidak ditemukan" });
        return;
      }
      res.json(category);
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: "Nama kategori sudah dipakai" });
        return;
      }
      throw err;
    }
  });

  router.delete("/:id", async (req: Request, res: Response) => {
    const id = readId(req, res);
    if (id === null) return;

    if (!(await deleteCategory(getDb(), id))) {
      res.status(404).json({ error: "Kategori tidak ditemukan" });
      return;
    }
    res.status(204).end();
  });

  return router;
}
