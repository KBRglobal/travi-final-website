/**
 * OpenAPI / Swagger UI Router
 *
 * Serves interactive API docs at /api/docs (behind auth)
 * and the raw spec at /api/docs/spec.json (public).
 */

import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "../lib/openapi";
import { isAuthenticated } from "../replitAuth";

const router = Router();

// Raw spec — publicly accessible for tooling / CI integration
router.get("/spec.json", (_req, res) => {
  res.json(openApiSpec);
});

// Swagger UI — admin only
router.use(
  "/",
  isAuthenticated,
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec as any, {
    customSiteTitle: "TRAVI API Docs",
    customCss: ".swagger-ui .topbar { display: none }",
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

export function setupSwaggerUI() {
  return router;
}

export default router;
