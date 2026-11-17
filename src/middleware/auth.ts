import {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import type { Pool } from "pg";

import { getPool } from "../db.ts";
import {
  findUserByToken,
  type Role,
  type SessionUser,
} from "../modules/auth/service.ts";

export const sessionCookie = "session";

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }

  return null;
}

export function sessionUser(res: Response): SessionUser {
  return res.locals.user as SessionUser;
}

export function requireAuth(getDb: () => Pool = getPool): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = readCookie(req, sessionCookie);
    const db = getDb();
    const user = token ? await findUserByToken(db, token) : null;

    if (!user) {
      res.status(401).json({ error: "Silakan login" });
      return;
    }

    res.locals.user = user;
    next();
  };
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user as SessionUser | undefined;

    if (!user) {
      res.status(401).json({ error: "Silakan login" });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({ error: "Akses ditolak" });
      return;
    }

    next();
  };
}

// Baca boleh semua role login; tulis hanya ADMIN.
export function adminForWrites(): RequestHandler {
  const adminOnly = requireRole("ADMIN");

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET" || req.method === "HEAD") {
      next();
      return;
    }
    adminOnly(req, res, next);
  };
}
