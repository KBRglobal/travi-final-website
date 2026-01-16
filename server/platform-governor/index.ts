/**
 * Autonomous Platform Governor
 * Feature Flag: ENABLE_PLATFORM_GOVERNOR=false
 *
 * Enforces self-control over the platform:
 * "If X happens, automatically restrict Y."
 *
 * Deterministic, explainable decisions with audit trail.
 * Integrates only via feature flags & kill switches.
 */

export * from './types';
export * from './config';
export { DEFAULT_RULES, getAllRules, getEnabledRules, getRuleById, addCustomRule, removeCustomRule } from './rules';
export {
  evaluateRules,
  getActiveRestrictions,
  isSystemRestricted,
  getRestrictionForSystem,
  overrideDecision,
  resetAllRestrictions,
  getRecentDecisions,
  getAuditLog,
  getDecisionById,
  clearAll,
} from './decision-engine';
export {
  recordAiCost,
  resetDailyAiCost,
  recordError,
  recordRequest,
  resetErrorMetrics,
  updateQueueBacklog,
  updateExternalApiStatus,
  collectContext,
  createTestContext,
} from './context-collector';
export { default as platformGovernorRoutes } from './routes';
