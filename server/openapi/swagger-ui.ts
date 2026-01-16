import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { generateOpenAPIDocument } from "./index";

const router = Router();

let cachedSpec: ReturnType<typeof generateOpenAPIDocument> | null = null;

function getOpenAPISpec() {
  if (!cachedSpec) {
    cachedSpec = generateOpenAPIDocument();
  }
  return cachedSpec;
}

const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 30px 0; }
    .swagger-ui .info .title { color: #7B4BA4; }
    .swagger-ui .scheme-container { background: #fafafa; padding: 20px; }
    .swagger-ui .opblock.opblock-post { border-color: #7B4BA4; background: rgba(123, 75, 164, 0.05); }
    .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #7B4BA4; }
    .swagger-ui .opblock.opblock-get { border-color: #02A65C; background: rgba(2, 166, 92, 0.05); }
    .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #02A65C; }
    .swagger-ui .opblock.opblock-patch { border-color: #F4C542; background: rgba(244, 197, 66, 0.05); }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #F4C542; color: #333; }
    .swagger-ui .opblock.opblock-delete { border-color: #E84C9A; background: rgba(232, 76, 154, 0.05); }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #E84C9A; }
    .swagger-ui .btn.authorize { background-color: #7B4BA4; border-color: #7B4BA4; }
    .swagger-ui .btn.authorize svg { fill: white; }
  `,
  customSiteTitle: "TRAVI CMS API Documentation",
  customfavIcon: "/favicon.png",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: "list",
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
};

router.get("/openapi.json", (_req, res) => {
  res.json(getOpenAPISpec());
});

router.use("/", swaggerUi.serve);
router.get("/", swaggerUi.setup(getOpenAPISpec(), swaggerUiOptions));

export default router;
