import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Pool } from "pg";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export const sessionTtlMs = 12 * 60 * 60 * 1000;

export type Role = "ADMIN" | "KASIR";

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: Role;
};

export type UserWithPassword = SessionUser & { passwordHash: string };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const hash = (await scryptAsync(password, salt, 64)).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "base64url");
  const actual = await scryptAsync(password, salt, expected.length);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function findUserByUsername(
  pool: Pool,
  username: string,
): Promise<UserWithPassword | null> {
  const { rows } = await pool.query<UserWithPassword>(
    `SELECT id, username, name, role, password_hash AS "passwordHash"
     FROM users
     WHERE username = $1 AND active`,
    [username],
  );
  return rows[0] ?? null;
}

export async function createSession(
  pool: Pool,
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionTtlMs);

  await pool.query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
    [hashToken(token), userId, expiresAt],
  );

  return { token, expiresAt };
}

export async function findUserByToken(
  pool: Pool,
  token: string,
): Promise<SessionUser | null> {
  const { rows } = await pool.query<SessionUser>(
    `SELECT u.id, u.username, u.name, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function deleteSession(pool: Pool, token: string): Promise<void> {
  await pool.query("DELETE FROM sessions WHERE token_hash = $1", [
    hashToken(token),
  ]);
}
