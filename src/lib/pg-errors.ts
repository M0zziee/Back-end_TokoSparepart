// Kode error PostgreSQL yang dipakai lintas modul.
export function isUniqueViolation(err: unknown): boolean {
  return hasCode(err, "23505");
}

export function isForeignKeyViolation(err: unknown): boolean {
  return hasCode(err, "23503");
}

function hasCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === code
  );
}
