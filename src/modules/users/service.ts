import type { Pool } from "pg";

import type { Role, SessionUser } from "../auth/service.ts";

export type User = SessionUser & {
  active: boolean;
  createdAt: string;
};

export type NewUser = {
  username: string;
  name: string;
  role: Role;
  password: string;
};

export type UserChanges = {
  name?: string;
  role?: Role;
  active?: boolean;
};

const selectColumns = `
  id, username, name, role, active, created_at AS "createdAt"
`;

export async function listUsers(pool: Pool): Promise<User[]> {
  const { rows } = await pool.query<User>(
    `SELECT ${selectColumns} FROM users ORDER BY username ASC`,
  );
  return rows;
}

export async function createUser(
  pool: Pool,
  input: NewUser,
  passwordHash: string,
): Promise<User> {
  const { rows } = await pool.query<User>(
    `INSERT INTO users (username, name, role, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING ${selectColumns}`,
    [input.username, input.name, input.role, passwordHash],
  );
  return rows[0];
}

export async function updateUser(
  pool: Pool,
  id: string,
  changes: UserChanges,
): Promise<User | null> {
  const columns: Record<keyof UserChanges, string> = {
    name: "name",
    role: "role",
    active: "active",
  };

  const sets: string[] = [];
  const params: unknown[] = [id];

  for (const [key, column] of Object.entries(columns)) {
    const value = changes[key as keyof UserChanges];
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }

  if (sets.length === 0) return null;

  const { rows } = await pool.query<User>(
    `UPDATE users SET ${sets.join(", ")}, updated_at = now()
     WHERE id = $1
     RETURNING ${selectColumns}`,
    params,
  );
  return rows[0] ?? null;
}

export async function resetPassword(
  pool: Pool,
  id: string,
  passwordHash: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    "UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1",
    [id, passwordHash],
  );
  return (rowCount ?? 0) > 0;
}
