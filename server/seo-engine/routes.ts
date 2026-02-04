// Stub - SEO Engine routes disabled
import { Express, Router } from "express";

const router = Router();

export function registerSEOEngineRoutes(app: Express): void {
  app.use("/api/seo", router);
}

export default router;
