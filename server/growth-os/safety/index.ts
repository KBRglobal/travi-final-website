/**
 * Execution Readiness & Safety Layer (Subsystem 4)
 *
 * Evaluates safety, enforces policies, and determines
 * execution readiness for action plans.
 */

// Types
export type {
  SafetyResult,
  SafetyCategory,
  SafetyCheck,
  SafetyEvaluation,
  PolicyType,
  PolicyEnforcementResult,
  Policy,
  ReadinessStatus,
  ReadinessCheck,
  ConflictType,
  ConflictResult,
  RateLimitResult,
  SafetyConfig,
} from './types';

// Evaluator
export {
  getSafetyConfig,
  updateSafetyConfig,
  evaluatePlan,
  evaluateCandidate,
  checkRateLimit,
  incrementRateLimit,
  detectConflicts,
} from './evaluator';

// Policies
export {
  registerPolicy,
  getPolicy,
  getAllPolicies,
  setPolicyEnabled,
  enforceAllPolicies,
  checkReadiness,
  getReadyForExecution,
  getBlockedPlans,
} from './policies';
