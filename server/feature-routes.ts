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
 * Check if a feature is enabled
 */
function isFeatureEnabled(flag: string): boolean {
  // Default to true for all features when not explicitly set
  // This ensures all features work by default
  return process.env[flag] !== "false";
}

/**
 * Register all feature routes
 * Features are enabled by default and can be disabled via environment variables
 */
export function registerFeatureRoutes(app: Express): void {
  let registeredCount = 0;

  // Feature 1: Content Dependency Graph
  if (isFeatureEnabled("ENABLE_CONTENT_DEPENDENCIES")) {
    registerContentDependencyRoutes(app);
    registeredCount++;
  }

  // Feature 2: AI Cost Forecasting
  if (isFeatureEnabled("ENABLE_AI_COST_FORECAST")) {
    registerAiCostForecastRoutes(app);
    registeredCount++;
  }

  // Feature 3: Content Decay Detection
  if (isFeatureEnabled("ENABLE_CONTENT_DECAY")) {
    registerContentDecayRoutes(app);
    registeredCount++;
  }

  // Feature 4: Content Repair Jobs
  if (isFeatureEnabled("ENABLE_CONTENT_REPAIR")) {
    registerContentRepairRoutes(app);
    registeredCount++;
  }

  // Feature 5: Search Zero-Result Intelligence
  if (isFeatureEnabled("ENABLE_ZERO_SEARCH_INTEL")) {
    registerSearchZeroRoutes(app);
    registeredCount++;
  }

  // Feature 6: Link Opportunities
  if (isFeatureEnabled("ENABLE_LINK_OPPORTUNITIES")) {
    registerLinkOpportunityRoutes(app);
    registeredCount++;
  }

  // Feature 6b: Link Management (Octypo Integration)
  if (isFeatureEnabled("ENABLE_LINK_MANAGEMENT")) {
    registerLinkManagementRoutes(app);
    registeredCount++;
  }

  // Feature 7: Content Confidence Score
  if (isFeatureEnabled("ENABLE_CONTENT_CONFIDENCE")) {
    registerContentConfidenceRoutes(app);
    registeredCount++;
  }

  // Feature 8: AI Audit Log
  if (isFeatureEnabled("ENABLE_AI_AUDIT_LOG")) {
    registerAiAuditRoutes(app);
    registeredCount++;
  }

  // Feature 9: Content Timeline
  if (isFeatureEnabled("ENABLE_CONTENT_TIMELINE")) {
    registerContentTimelineRoutes(app);
    registeredCount++;
  }

  // Feature 10: Growth Recommendations
  if (isFeatureEnabled("ENABLE_GROWTH_RECOMMENDATIONS")) {
    registerGrowthRecommendationRoutes(app);
    registeredCount++;
  }

  // Feature 11: Data Ingestion (Travel Advisories, Health Alerts, Events)
  if (isFeatureEnabled("ENABLE_INGESTION")) {
    registerIngestionRoutes(app);
    initializeIngestion();
    registeredCount++;
  }

  // Feature 12: Visa Requirements public API
  if (isFeatureEnabled("ENABLE_VISA_API")) {
    app.use("/api", visaRoutes);
    registeredCount++;
  }

  // Feature 13: Health Alerts public API
  if (isFeatureEnabled("ENABLE_HEALTH_ALERTS_API")) {
    app.use("/api", healthAlertRoutes);
    registeredCount++;
  }

  // Feature 14: Destination Events public API
  if (isFeatureEnabled("ENABLE_EVENTS_API")) {
    app.use("/api", eventsRoutes);
    registeredCount++;
  }

  console.log(`[FeatureRoutes] Registered ${registeredCount} feature routes`);
}

/**
 * List of all feature flags and their descriptions
 * NOTE: Features are ENABLED BY DEFAULT. Set flag to "false" to disable.
 */
export const FEATURE_FLAGS = {
  // Content Features
  ENABLE_CONTENT_DEPENDENCIES: "Content dependency graph tracking",
  ENABLE_CONTENT_DECAY: "Content decay detection",
  ENABLE_CONTENT_REPAIR: "Autonomous content repair jobs",
  ENABLE_CONTENT_CONFIDENCE: "Content confidence scoring",
  ENABLE_CONTENT_TIMELINE: "Content lifecycle timeline",
  ENABLE_CONTENT_HEALTH: "Content health monitoring",

  // AI Features
  ENABLE_AI_COST_FORECAST: "AI cost forecasting engine",
  ENABLE_AI_AUDIT_LOG: "AI output audit logging",

  // Search Features
  ENABLE_ZERO_SEARCH_INTEL: "Search zero-result intelligence",

  // Link Features
  ENABLE_LINK_OPPORTUNITIES: "Internal link opportunity engine",
  ENABLE_LINK_MANAGEMENT: "Link management (Octypo integration)",

  // Growth Features
  ENABLE_GROWTH_RECOMMENDATIONS: "Growth recommendation engine",

  // Data Ingestion
  ENABLE_INGESTION: "Data ingestion (travel advisories, health alerts, events)",
  ENABLE_VISA_API: "Visa requirements public API",
  ENABLE_HEALTH_ALERTS_API: "Health alerts public API",
  ENABLE_EVENTS_API: "Destination events public API",

  // Autonomous Systems
  ENABLE_SEO_AUTOPILOT: "SEO autopilot with scheduled cycles",
  ENABLE_DATA_DECISIONS: "Data decisions autonomous loop",

  // Localization
  ENABLE_TRANSLATION_QUEUE: "Translation queue processing",
  ENABLE_TRANSLATION_WORKER: "Translation worker background job",
  ENABLE_RSS_SCHEDULER: "RSS feed scheduler for content generation",
  ENABLE_LOCALIZATION_GOVERNANCE: "Localization governance system",
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
