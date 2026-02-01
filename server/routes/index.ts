import type { Express } from "express";
import { registerContentRoutes } from "./content-routes";
import { registerPublicApiRoutes } from "./public-api";
import { registerAdminApiRoutes } from "./admin-api";
import { registerAiApiRoutes } from "./ai-api";
import { registerLocalizationApiRoutes } from "./localization-api";
import { registerAutomationApiRoutes } from "./automation-api";
import { registerCmsApiRoutes } from "./cms-api";
import { registerMetricsRoutes } from "./metrics-routes";
import { registerMediaIntelligenceRoutes } from "../media-intelligence/routes";

/**
 * Main router registry that coordinates all domain-specific route modules.
 */

export async function registerAllRoutes(app: Express): Promise<void> {
  // Content management routes
  registerContentRoutes(app);

  // Public API routes
  registerPublicApiRoutes(app);

  // Admin API routes
  registerAdminApiRoutes(app);

  // AI API routes
  registerAiApiRoutes(app);

  // Localization API routes
  registerLocalizationApiRoutes(app);

  // Automation API routes
  registerAutomationApiRoutes(app);

  // CMS API routes
  registerCmsApiRoutes(app);

  // Prometheus metrics routes
  registerMetricsRoutes(app);

  // Media Intelligence routes
  registerMediaIntelligenceRoutes(app);
}

// Export individual registrars for selective usage
export {
  registerContentRoutes,
  registerPublicApiRoutes,
  registerAdminApiRoutes,
  registerAiApiRoutes,
  registerLocalizationApiRoutes,
  registerAutomationApiRoutes,
  registerCmsApiRoutes,
};
