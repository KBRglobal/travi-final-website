/**
 * Autonomy Enforcement SDK
 * Main entry point for policy enforcement across the system
 *
 * Usage:
 *   import { guardAiCall, guardJobExecution, guardPublish } from './autonomy/enforcement';
 *
 * Features:
 * - guardAiCall: Wrap AI provider calls with policy enforcement
 * - guardJobExecution: Protect background job processing
 * - guardPublish: Gate content publishing operations
 * - Express middleware for route protection
 * - Budget consumption tracking
 */

// Core types
export { AutonomyBlockedError, DEFAULT_ENFORCEMENT_CONFIG } from "./types";

export type {
  GuardedFeature,
  EnforcementContext,
  EnforcementResult,
  EnforcementOverride,
  ConsumptionRecord,
  DegradedResponse,
  JobBlockResult,
  EnforcementConfig,
} from "./types";

// Decision engine
export {
  enforceAutonomy,
  enforceOrThrow,
  quickEnforcementCheck,
  shutdownDecisionEngine,
} from "./decision";

// Express middleware
export {
  createEnforcementMiddleware,
  createDegradedModeMiddleware,
  autonomyErrorHandler,
  enforcementLoggingMiddleware,
} from "./middleware";

export type { EnforcedRequest } from "./middleware";

// Wrappers for guarding operations
export {
  guardAiCall,
  guardJobExecution,
  guardPublish,
  withEnforcement,
  isFeatureAllowed,
  getDegradedFallback,
} from "./wrappers";

// Budget consumption
export {
  consumeBudget,
  recordConsumption,
  getFeatureBudgetStatus,
  reserveBudget,
  releaseReservation,
  getAllBudgetsSummary,
  isRateSustainable,
  shutdownBudgetConsumer,
} from "./budget-consumer";

import { shutdownDecisionEngine } from "./decision";
import { shutdownBudgetConsumer } from "./budget-consumer";

/**
 * Initialize enforcement SDK
 * Called on server startup
 */
export function initEnforcement(): void {
  const enabled = process.env.ENABLE_AUTONOMY_POLICY === "true";
  const degradedMode = process.env.ENABLE_AUTONOMY_DEGRADED_MODE === "true";
}

/**
 * Shutdown enforcement SDK
 * Called on server shutdown to flush buffers
 */
export async function shutdownEnforcement(): Promise<void> {
  shutdownDecisionEngine();
  shutdownBudgetConsumer();
}
