const categorySchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "1" },
    name: { type: "string", example: "Oli" },
    created_at: { type: "string", format: "date-time" },
  },
  required: ["id", "name", "created_at"],
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
  },
};
