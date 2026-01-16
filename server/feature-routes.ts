/**
 * Feature Routes Registration
 *
 * Unified registration for all feature-flagged routes.
 * Each feature is independently enabled via environment variables.
 */

import type { Express } from "express";

// Feature route registrations
import { registerContentDependencyRoutes } from "./content-dependencies/routes";
import { registerAiCostForecastRoutes } from "./ai-cost-forecast/routes";
import { registerContentDecayRoutes } from "./content-decay/routes";
import { registerContentRepairRoutes } from "./content-repair/routes";
import { registerSearchZeroRoutes } from "./search-zero/routes";
import { registerLinkOpportunityRoutes } from "./link-opportunities/routes";
import { registerLinkManagementRoutes } from "./routes/link-management-routes";
import { registerContentConfidenceRoutes } from "./content-confidence/routes";
import { registerAiAuditRoutes } from "./ai-audit/routes";
import { registerContentTimelineRoutes } from "./content-timeline/routes";
import { registerGrowthRecommendationRoutes } from "./growth-recommendations/routes";
import { registerIngestionRoutes, initializeIngestion } from "./ingestion";
import { visaRoutes } from "./routes/visa-routes";
import { healthAlertRoutes } from "./routes/health-alert-routes";
import { eventsRoutes } from "./routes/events-routes";

/**
 * Register all feature routes
 */
export function registerFeatureRoutes(app: Express): void {
  // Feature 1: Content Dependency Graph
  registerContentDependencyRoutes(app);

  // Feature 2: AI Cost Forecasting
  registerAiCostForecastRoutes(app);

  // Feature 3: Content Decay Detection
  registerContentDecayRoutes(app);

  // Feature 4: Content Repair Jobs
  registerContentRepairRoutes(app);

  // Feature 5: Search Zero-Result Intelligence
  registerSearchZeroRoutes(app);

  // Feature 6: Link Opportunities
  registerLinkOpportunityRoutes(app);

  // Feature 6b: Link Management (Octypo Integration)
  registerLinkManagementRoutes(app);

  // Feature 7: Content Confidence Score
  registerContentConfidenceRoutes(app);

  // Feature 8: AI Audit Log
  registerAiAuditRoutes(app);

  // Feature 9: Content Timeline
  registerContentTimelineRoutes(app);

  // Feature 10: Growth Recommendations
  registerGrowthRecommendationRoutes(app);

  // Feature 11: Data Ingestion (Travel Advisories, Health Alerts, Events)
  registerIngestionRoutes(app);
  initializeIngestion();

  // Feature 12: Visa Requirements public API
  app.use("/api", visaRoutes);

  // Feature 13: Health Alerts public API
  app.use("/api", healthAlertRoutes);

  // Feature 14: Destination Events public API
  app.use("/api", eventsRoutes);

  console.log("[FeatureRoutes] All feature routes registered");
}

/**
 * List of all feature flags and their descriptions
 */
export const FEATURE_FLAGS = {
  ENABLE_CONTENT_DEPENDENCIES: "Content dependency graph tracking",
  ENABLE_AI_COST_FORECAST: "AI cost forecasting engine",
  ENABLE_CONTENT_DECAY: "Content decay detection",
  ENABLE_CONTENT_REPAIR: "Autonomous content repair jobs",
  ENABLE_ZERO_SEARCH_INTEL: "Search zero-result intelligence",
  ENABLE_LINK_OPPORTUNITIES: "Internal link opportunity engine",
  ENABLE_CONTENT_CONFIDENCE: "Content confidence scoring",
  ENABLE_AI_AUDIT_LOG: "AI output audit logging",
  ENABLE_CONTENT_TIMELINE: "Content lifecycle timeline",
  ENABLE_GROWTH_RECOMMENDATIONS: "Growth recommendation engine",
} as const;

/**
 * Get enabled features status
 */
export function getFeatureStatus(): Record<string, boolean> {
  const status: Record<string, boolean> = {};
  for (const flag of Object.keys(FEATURE_FLAGS)) {
    status[flag] = process.env[flag] === "true";
  }
  return status;
}
