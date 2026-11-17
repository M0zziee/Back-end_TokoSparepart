import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import swaggerUi from "swagger-ui-express";

import { errorHandler, notFound } from "./middleware/error.ts";
import { adminForWrites, requireAuth } from "./middleware/auth.ts";
import { createAuthRouter } from "./modules/auth/router.ts";
import { createCategoriesRouter } from "./modules/categories/router.ts";
import { createProductsRouter } from "./modules/products/router.ts";
import { createUsersRouter } from "./modules/users/router.ts";
import { openapi } from "./openapi.ts";

const app: Express = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/auth", createAuthRouter());
app.use("/categories", requireAuth(), adminForWrites(), createCategoriesRouter());
app.use("/products", requireAuth(), adminForWrites(), createProductsRouter());
app.use("/users", createUsersRouter());

app.get("/openapi.json", (_req: Request, res: Response) => {
  res.json(openapi);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

app.use(notFound);
app.use(errorHandler);

export default app;
