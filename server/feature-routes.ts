/**
 * Feature Routes Registration
 *
 * Unified registration for all feature-flagged routes.
 * Each feature is independently enabled via environment variables.
 */

import type { Express } from "express";
import { log } from "./lib/logger";

// Feature route registrations - only include routes that exist
import { registerLinkManagementRoutes } from "./routes/link-management-routes";

/**
 * Check if a feature is enabled
 */
function isFeatureEnabled(flag: string): boolean {
  return process.env[flag] !== "false";
}

/**
 * Register all feature routes
 * Features are enabled by default and can be disabled via environment variables
 */
export function registerFeatureRoutes(app: Express): void {
  let registeredCount = 0;

  // Feature: Link Management (Octypo Integration)
  if (isFeatureEnabled("ENABLE_LINK_MANAGEMENT")) {
    registerLinkManagementRoutes(app);
    registeredCount++;
  }

  log.info(`[FeatureRoutes] Registered ${registeredCount} feature routes`);
}

/**
 * List of all feature flags and their descriptions
 */
export const FEATURE_FLAGS = {
  ENABLE_LINK_MANAGEMENT: "Link management (Octypo integration)",
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
