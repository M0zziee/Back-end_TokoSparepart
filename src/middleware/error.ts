import { type NextFunction, type Request, type Response } from "express";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Endpoint tidak ditemukan" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(err);
  const message =
    process.env.NODE_ENV === "production"
      ? "Terjadi kesalahan pada server"
      : err instanceof Error
        ? err.message
        : "Terjadi kesalahan";
  res.status(500).json({ error: message });
}
