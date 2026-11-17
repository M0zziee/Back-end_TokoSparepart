# Backend Toko Sparepart

REST API untuk POS dan manajemen stok toko sparepart. Repo terpisah dari frontend ([`Front-end_TokoSparepart`](https://github.com/M0zziee/Front-end_TokoSparepart)).

## Tech Stack

| Bagian     | Teknologi                                                        |
| ---------- | ---------------------------------------------------------------- |
| Runtime    | Node.js 24 (`engines.node`, tanpa transpiler)                    |
| Framework  | Express 5, TypeScript 7                                          |
| Database   | PostgreSQL (`pg`, tanpa ORM)                                     |
| Dev tool   | nodemon, `node:test` bawaan Node, Swagger UI                     |

Backend memakai **Node type-stripping** (Node 24) sehingga `.ts` dijalankan langsung — tanpa `ts-node`/`tsx`. `tsc` hanya untuk type-check (`noEmit`).

## Prasyarat

- **Node.js 24** (wajib — `.ts` dijalankan langsung)
- **PostgreSQL 14+**

## Setup

```bash
npm install
```

1. Buat database:
   ```sql
   CREATE DATABASE toko;
   ```
2. Salin `.env.example` menjadi `.env`, lalu isi:
   ```env
   DATABASE_URL=postgres://postgres:password@localhost:5432/toko
   PORT=3001
   FRONTEND_ORIGIN=http://localhost:3000
   ```
3. Jalankan migrasi, lalu server:
   ```bash
   npm run migrate
   npm run dev
   ```

Server berjalan di `http://localhost:${PORT}` (default `3001`).

| Script          | Fungsi                                          |
| --------------- | ----------------------------------------------- |
| `npm run dev`   | nodemon + `node src/server.ts`                  |
| `npm run migrate` | jalankan migrasi yang belum dicatat           |
| `npm run create-user` | buat/ubah user dari CLI (ADMIN/KASIR)      |
| `npm run check` | type-check (`tsc`, noEmit)                      |
| `npm test`      | unit test (`node --test`)                       |

`npm run migrate` dan `npm run dev` memakai `--env-file-if-exists=.env` (fitur bawaan Node 24), jadi tidak butuh `dotenv`. Migrasi hanya jalan sekali per file; riwayatnya dicatat di tabel `schema_migrations`.

## Endpoint

| Method | Path                    | Keterangan                        |
| ------ | ----------------------- | --------------------------------- |
| GET    | `/health`               | Health check (publik)             |
| POST   | `/auth/login`           | Login, set cookie sesi            |
| POST   | `/auth/logout`          | Logout, hapus sesi                |
| GET    | `/auth/me`              | User yang sedang login            |
| GET    | `/users`                | Daftar user (ADMIN)               |
| POST   | `/users`                | Tambah user (ADMIN)               |
| PATCH  | `/users/:id`            | Ubah user (ADMIN)                 |
| PATCH  | `/users/:id/password`   | Reset password (ADMIN)            |
| GET    | `/categories`           | Daftar kategori                   |
| POST   | `/categories`           | Tambah kategori                   |
| PATCH  | `/categories/:id`       | Ubah nama kategori                |
| DELETE | `/categories/:id`       | Hapus kategori                    |
| GET    | `/products`             | Daftar produk aktif               |
| GET    | `/products/:id`         | Detail produk                     |
| POST   | `/products`             | Tambah produk                     |
| PATCH  | `/products/:id`         | Ubah produk                       |
| DELETE | `/products/:id`         | Nonaktifkan produk                |
| GET    | `/products/:id/stock`   | Stok saat ini (belum dibuat)      |
| POST   | `/stock/movements`      | Catat stok masuk/keluar (belum)   |
| GET    | `/stock/movements`      | Riwayat pergerakan stok (belum)   |
| POST   | `/sales`                | Buat transaksi (belum dibuat)     |
| GET    | `/sales`                | Riwayat transaksi (belum dibuat)  |
| GET    | `/reports/sales`        | Laporan penjualan (belum dibuat)  |

Endpoint **tanpa prefix `/api`** (mis. `/products`, bukan `/api/products`). Dokumentasi interaktif: `GET /docs`, spec mentah: `GET /openapi.json`. Spec di `src/openapi.ts` wajib diperbarui setiap endpoint baru ditambahkan.

## Auth & Role

Dua role: `ADMIN` dan `KASIR`. Satu database, satu aplikasi.

- Sesi disimpan di tabel `sessions` (hash SHA-256 dari token), cookie `session` berlaku 12 jam.
- Cookie `httpOnly`, `sameSite=lax`, `secure` saat `NODE_ENV=production`.
- Baca produk/kategori: semua role login. Tulis produk/kategori: `ADMIN` saja.
- Kelola user: `ADMIN` saja. Tidak ada endpoint register publik.
- Frontend mengakses API lewat proxy `/api/*` agar cookie tetap first-party.

Buat admin pertama (idempotent, username ada → update password):

```bash
USER_PASSWORD="password-kuat" npm run create-user -- admin "Admin Toko" ADMIN
```

Tambahkan kasir lewat `POST /users` setelah login sebagai admin.

## Konvensi

- ESM aktif (`"type": "module"`).
- Akses database: `pg` + SQL manual di `service.ts` (parameterized, alias camelCase); tanpa ORM.
- CORS memakai satu origin dari `FRONTEND_ORIGIN` (default `http://localhost:3000`).
- Import **wajib** menyertakan ekstensi `.ts`:
  ```ts
  import { productRouter } from "./modules/product/router.ts";
  ```
- `verbatimModuleSyntax` aktif: import tipe harus `import { type Foo }`.
- `erasableSyntaxOnly` aktif: tidak ada `enum`, `namespace`, atau parameter properties.
- Satu domain = satu folder `src/modules/<domain>/`, isinya `router.ts` dan `service.ts`. Modul lain meng-import `service.ts`, tidak menduplikasi query.
- Service yang menyentuh DB menerima `pool` sebagai argumen agar bisa di-mock di test.
- Validasi input di setiap batas (body/query) — jangan percaya data dari client.
- Format error seragam: `{ "error": "Pesan error" }`.
- Kredensial hanya dari `.env`, jangan pernah commit `.env`.

## Skema Database (ringkas)

| Tabel             | Fungsi                                                    |
| ----------------- | --------------------------------------------------------- |
| `categories`      | Kategori produk                                           |
| `products`        | Data produk (SKU, nama, harga, kategori)                  |
| `stock_movements` | Riwayat stok: `in` / `out` / `adjustment`, disertai ref   |
| `users`           | Akun admin/kasir (`role`, `active`, `password_hash`)      |
| `sessions`        | Sesi login (`token_hash`, `expires_at`)                   |
| `sales`*          | Header transaksi POS                                      |
| `sale_items`*     | Item transaksi + harga saat transaksi                     |

\* Belum ada di migrasi. `sales`/`sale_items` dibuat pada Fase 4.

Stok **dihitung dari `stock_movements`**, bukan kolom stok yang ditimpa. Kolom `qty` disimpan bertanda: `in` positif, `out` negatif, `adjustment` boleh keduanya. Stok saat ini = `SUM(qty)` per produk.

Migrasi SQL baru untuk setiap perubahan skema — jangan ubah migrasi lama yang sudah dijalankan.

## Deployment (Vercel + Neon)

Repo ini satu project Vercel. Database PostgreSQL di Neon.

1. Di dashboard Vercel, **Storage** → **Create Database** → **Neon**, lalu salin **pooled connection string** (host berakhiran `-pooler`).
2. Import repo ini ke Vercel. Tidak perlu build command: Vercel mendeteksi Express dari `src/app.ts` yang mengekspor `app` sebagai default.
3. Environment variables:
   ```env
   DATABASE_URL=postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/toko?sslmode=require
   FRONTEND_ORIGIN=https://<domain-frontend-vercel>
   ```
4. Deploy, lalu cek `https://<domain-backend-vercel>/health` → `{"status":"ok"}`.

Vercel tidak punya pre-deploy command. Jalankan migrasi **sebelum** deploy kode yang butuh skema baru:

```bash
DATABASE_URL="postgresql://...neon.tech/toko?sslmode=require" node migrations/run.ts
```

Atau lewat GitHub Actions `workflow_dispatch` dengan secret `DATABASE_URL` produksi. Direct connection Neon hanya untuk migrasi/perintah admin; runtime selalu pooled.

Batasan serverless: tidak ada proses persisten, ada cold start dan timeout. Pool `pg` dibatasi `max: 5` karena tiap instance function punya pool sendiri. Koneksi wajib TLS (`sslmode=require`). `swagger-ui-express` ikut bundle; kalau berat, matikan `/docs` di production dan sisakan `/openapi.json`.

## Workflow

1. Satu fitur = satu branch.
2. Sebelum commit: `npm run check && npm test`.
3. Jangan commit `.env`, `node_modules`, atau build output.
