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
  },
};
