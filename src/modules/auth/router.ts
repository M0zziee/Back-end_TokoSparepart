import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";

import { getPool } from "../../db.ts";
import {
  readCookie,
  requireAuth,
  sessionCookie,
  sessionUser,
} from "../../middleware/auth.ts";
import {
  createSession,
  deleteSession,
  findUserByUsername,
  sessionTtlMs,
  verifyPassword,
} from "./service.ts";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: sessionTtlMs,
  };
}

export function createAuthRouter(getDb: () => Pool = getPool): Router {
  const router = Router();

  router.post("/login", async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { username?: unknown; password?: unknown };
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const password = body.password;

    if (!username || typeof password !== "string" || password === "") {
      res.status(400).json({ error: "Username dan password wajib diisi" });
      return;
    }

    const user = await findUserByUsername(getDb(), username);
    const valid = user
      ? await verifyPassword(password, user.passwordHash)
      : false;

    if (!user || !valid) {
      res.status(401).json({ error: "Username atau password salah" });
      return;
    }

    const { token } = await createSession(getDb(), user.id);
    res.cookie(sessionCookie, token, cookieOptions());
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });
  });

  router.post("/logout", async (req: Request, res: Response) => {
    const token = readCookie(req, sessionCookie);
    if (token) await deleteSession(getDb(), token);

    res.clearCookie(sessionCookie, { ...cookieOptions(), maxAge: undefined });
    res.status(204).end();
  });

  router.get("/me", requireAuth(getDb), (req: Request, res: Response) => {
    res.json(sessionUser(res));
  });

  return router;
}
