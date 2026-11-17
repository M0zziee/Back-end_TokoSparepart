const categorySchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "1" },
    name: { type: "string", example: "Oli" },
    createdAt: { type: "string", format: "date-time" },
  },
  required: ["id", "name", "createdAt"],
};

const errorSchema = {
  type: "object",
  properties: { error: { type: "string" } },
  required: ["error"],
};

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: errorSchema } },
});

const productSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "1" },
    sku: { type: "string", example: "OLI-10W40" },
    name: { type: "string", example: "Oli Mesin 10W-40" },
    categoryId: { type: ["string", "null"], example: "1" },
    categoryName: { type: ["string", "null"], example: "Oli" },
    price: { type: "number", example: 55000 },
    active: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "sku",
    "name",
    "categoryId",
    "price",
    "active",
    "createdAt",
    "updatedAt",
  ],
};

const productRequestBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          sku: { type: "string" },
          name: { type: "string" },
          categoryId: { type: ["string", "null"] },
          price: { type: "number", minimum: 0 },
        },
      },
    },
  },
};

export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Toko Sparepart API",
    version: "0.1.0",
    description:
      "API POS & manajemen stok. Spec ini tumbuh seiring modul baru ditambahkan.",
  },
  servers: [{ url: "/" }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        tags: ["system"],
        responses: {
          "200": {
            description: "Server sehat",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", example: "ok" } },
                  required: ["status"],
                },
              },
            },
          },
        },
      },
    },
    "/categories": {
      get: {
        summary: "Daftar kategori",
        tags: ["categories"],
        responses: {
          "200": {
            description: "Daftar kategori urut nama",
            content: {
              "application/json": {
                schema: { type: "array", items: categorySchema },
              },
            },
          },
        },
      },
      post: {
        summary: "Tambah kategori",
        tags: ["categories"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { name: { type: "string", example: "Oli" } },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Kategori dibuat",
            content: { "application/json": { schema: categorySchema } },
          },
          "400": errorResponse("Nama kategori kosong"),
          "409": errorResponse("Nama kategori sudah dipakai"),
        },
      },
    },
    "/categories/{id}": {
      patch: {
        summary: "Ubah nama kategori",
        tags: ["categories"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { name: { type: "string" } },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Kategori diperbarui",
            content: { "application/json": { schema: categorySchema } },
          },
          "400": errorResponse("id atau nama tidak valid"),
          "404": errorResponse("Kategori tidak ditemukan"),
          "409": errorResponse("Nama kategori sudah dipakai"),
        },
      },
      delete: {
        summary: "Hapus kategori",
        tags: ["categories"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "204": { description: "Kategori dihapus" },
          "400": errorResponse("id tidak valid"),
          "404": errorResponse("Kategori tidak ditemukan"),
        },
      },
    },
    "/products": {
      get: {
        summary: "Daftar produk aktif",
        tags: ["products"],
        parameters: [
          {
            name: "includeInactive",
            in: "query",
            description: "Isi `true` untuk ikut menampilkan produk nonaktif",
            schema: { type: "boolean", default: false },
          },
        ],
        responses: {
          "200": {
            description: "Daftar produk urut nama",
            content: {
              "application/json": {
                schema: { type: "array", items: productSchema },
              },
            },
          },
        },
      },
      post: {
        summary: "Tambah produk",
        tags: ["products"],
        requestBody: productRequestBody,
        responses: {
          "201": {
            description: "Produk dibuat",
            content: { "application/json": { schema: productSchema } },
          },
          "400": errorResponse("Input tidak valid atau kategori tidak ada"),
          "409": errorResponse("SKU sudah dipakai"),
        },
      },
    },
    "/products/{id}": {
      get: {
        summary: "Detail produk",
        tags: ["products"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Detail produk",
            content: { "application/json": { schema: productSchema } },
          },
          "400": errorResponse("id tidak valid"),
          "404": errorResponse("Produk tidak ditemukan"),
        },
      },
      patch: {
        summary: "Ubah produk",
        description: "Kirim hanya field yang berubah.",
        tags: ["products"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  sku: { type: "string" },
                  name: { type: "string" },
                  categoryId: { type: ["string", "null"] },
                  price: { type: "number", minimum: 0 },
                  active: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Produk diperbarui",
            content: { "application/json": { schema: productSchema } },
          },
          "400": errorResponse("Input tidak valid"),
          "404": errorResponse("Produk tidak ditemukan"),
          "409": errorResponse("SKU sudah dipakai"),
        },
      },
      delete: {
        summary: "Nonaktifkan produk",
        description: "Produk tidak dihapus agar riwayat stok dan penjualan tetap utuh.",
        tags: ["products"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "204": { description: "Produk dinonaktifkan" },
          "400": errorResponse("id tidak valid"),
          "404": errorResponse("Produk tidak ditemukan atau sudah nonaktif"),
        },
      },
    },
  },
};
