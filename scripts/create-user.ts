import { getPool } from "../src/db.ts";
import { hashPassword } from "../src/modules/auth/service.ts";

const roles = ["ADMIN", "KASIR"] as const;
type Role = (typeof roles)[number];

const [username, name, role] = process.argv.slice(2);
const password = process.env.USER_PASSWORD;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!username || !name || !role) {
  fail(
    "Pakai: npm run create-user -- <username> <nama> <ADMIN|KASIR>\n" +
      "Password dibaca dari env USER_PASSWORD (minimal 8 karakter).",
  );
}

if (!roles.includes(role as Role)) {
  fail("Role harus ADMIN atau KASIR.");
}

if (!password || password.length < 8) {
  fail("USER_PASSWORD minimal 8 karakter.");
}

const pool = getPool();

try {
  const { rows } = await pool.query<{ username: string; role: string }>(
    `INSERT INTO users (username, name, role, password_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (username) DO UPDATE
       SET name = EXCLUDED.name,
           role = EXCLUDED.role,
           password_hash = EXCLUDED.password_hash,
           active = true,
           updated_at = now()
     RETURNING username, role`,
    [username, name, role, await hashPassword(password)],
  );

  console.log(`user ${rows[0].username} (${rows[0].role}) siap`);
} finally {
  await pool.end();
}
