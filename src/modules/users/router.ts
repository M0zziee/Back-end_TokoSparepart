import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";

import { getPool } from "../../db.ts";
import { isUniqueViolation } from "../../lib/pg-errors.ts";
import {
  requireAuth,
  requireRole,
} from "../../middleware/auth.ts";
import { hashPassword, type Role } from "../auth/service.ts";
import {
  createUser,
  listUsers,
  type NewUser,
  resetPassword,
  type UserChanges,
  updateUser,
} from "./service.ts";

const idPattern = /^\d+$/;
const usernamePattern = /^[a-zA-Z0-9._-]{3,32}$/;
const roles: Role[] = ["ADMIN", "KASIR"];

function bad(res: Response, error: string) {
  res.status(400).json({ error });
}

function readId(req: Request, res: Response): string | null {
  const id = req.params.id;

  if (typeof id !== "string" || !idPattern.test(id)) {
    bad(res, "id user tidak valid");
    return null;
  }

  return id;
}

function readRole(value: unknown): Role | undefined {
  return roles.includes(value as Role) ? (value as Role) : undefined;
}

function readPassword(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length < 8) return undefined;
  return value;
}

export function createUsersRouter(getDb: () => Pool = getPool): Router {
  const router = Router();

  // Kelola user hanya untuk ADMIN, termasuk baca daftar.
  router.use(requireAuth(getDb), requireRole("ADMIN"));

  router.get("/", async (_req: Request, res: Response) => {
    res.json(await listUsers(getDb()));
  });

  router.post("/", async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = readRole(body.role);
    const password = readPassword(body.password);

    if (!usernamePattern.test(username)) {
      return bad(res, "Username 3-32 karakter: huruf, angka, titik, _ atau -");
    }
    if (!name) return bad(res, "Nama wajib diisi");
    if (!role) return bad(res, "Role harus ADMIN atau KASIR");
    if (!password) return bad(res, "Password minimal 8 karakter");

    const input: NewUser = { username, name, role, password };

    try {
      const user = await createUser(
        getDb(),
        input,
        await hashPassword(password),
      );
      res.status(201).json(user);
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: "Username sudah dipakai" });
        return;
      }
      throw err;
    }
  });

  router.patch("/:id/password", async (req: Request, res: Response) => {
    const id = readId(req, res);
    if (id === null) return;

    const body = (req.body ?? {}) as Record<string, unknown>;
    const password = readPassword(body.password);
    if (!password) return bad(res, "Password minimal 8 karakter");

    if (!(await resetPassword(getDb(), id, await hashPassword(password)))) {
      res.status(404).json({ error: "User tidak ditemukan" });
      return;
    }
    res.status(204).end();
  });

  router.patch("/:id", async (req: Request, res: Response) => {
    const id = readId(req, res);
    if (id === null) return;

    const body = (req.body ?? {}) as Record<string, unknown>;
    const changes: UserChanges = {};

    if ("name" in body) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return bad(res, "Nama wajib diisi");
      changes.name = name;
    }
    if ("role" in body) {
      const role = readRole(body.role);
      if (!role) return bad(res, "Role harus ADMIN atau KASIR");
      changes.role = role;
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

    const user = await updateUser(getDb(), id, changes);
    if (!user) {
      res.status(404).json({ error: "User tidak ditemukan" });
      return;
    }
    res.json(user);
  });

  return router;
}
