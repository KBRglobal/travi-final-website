/**
 * Autonomy Policy & Risk Budgets Engine
 * Controls what autonomous operations the system can perform
 *
 * Enable with: ENABLE_AUTONOMY_POLICY=true
 */

// Types
export * from "./types";

// Configuration
export {
  DEFAULT_AUTONOMY_CONFIG,
  DEFAULT_GLOBAL_POLICY,
  FEATURE_POLICIES,
  DEFAULT_HOURLY_BUDGET,
  DEFAULT_DAILY_BUDGET,
  generateTargetKey,
  isWithinTimeWindow,
  getPeriodBoundaries,
} from "./config";

// Budget management
export {
  getOrCreateBudgetCounter,
  incrementBudgetCounter,
  checkBudgetStatus,
  isBudgetExhausted,
  resetBudget,
  getBudgetSummary,
  clearBudgetCache,
} from "./budgets";

// Policy engine
export {
  findApplicablePolicies,
  evaluatePolicy,
  recordActionExecution,
  quickCheck,
} from "./policy-engine";

// Repository
export {
  getPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
  seedDefaultPolicies,
  logDecision,
  getRecentDecisions,
  pruneOldDecisions,
  startDecisionLogFlusher,
  stopDecisionLogFlusher,
  invalidatePolicyCache,
} from "./repository";

// Admin routes
export { default as autonomyPolicyRoutes } from "./admin-routes";

import { startDecisionLogFlusher, stopDecisionLogFlusher, seedDefaultPolicies } from "./repository";

/**
 * Initialize autonomy policy engine
 */
export async function initAutonomyPolicy(): Promise<void> {
  const enabled = process.env.ENABLE_AUTONOMY_POLICY === "true";

  if (enabled) {
    // Start background log flusher
    startDecisionLogFlusher();

    // Seed default policies if none exist
    try {
      const seeded = await seedDefaultPolicies();
      if (seeded > 0) {
      }
    } catch (error) {}
  }
}

/**
 * Shutdown autonomy policy engine
 */
export function shutdownAutonomyPolicy(): void {
  stopDecisionLogFlusher();
}
