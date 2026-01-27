/**
 * AI Orchestrator - Module Index
 *
 * Central AI orchestration layer for all AI operations across TRAVI CMS.
 *
 * ARCHITECTURE:
 * - AIOrchestrator: Main entry point, coordinates all AI requests
 * - ProviderPool: Manages provider configs, routing, availability
 * - RatePolicy: Rate limiting, backpressure, circuit breakers
 * - CreditMonitor: Credit/token tracking, quotas, starvation prevention
 *
 * HARD INVARIANTS:
 * 1. All AI requests go through AIOrchestrator.submitTask()
 * 2. Image tasks MUST route through Image Engine (blocked at orchestrator level)
 * 3. No single system can exhaust all provider credits
 * 4. Rate limits are enforced per-provider with circuit breakers
 *
 * USAGE:
 * ```typescript
 * import { getAIOrchestrator } from '@/server/ai-orchestrator';
 *
 * const orchestrator = getAIOrchestrator();
 * await orchestrator.initialize();
 *
 * const response = await orchestrator.submitTask({
 *   category: 'news',
 *   priority: 'high',
 *   payload: { content: 'Generate article about...' }
 * });
 *
 * if (response.accepted) {
 *
 * }
 * ```
 */

// Main orchestrator
export {
  AIOrchestrator,
  getAIOrchestrator,
  type SubmitTaskRequest,
  type SubmitTaskResponse,
} from "./ai-orchestrator";

// Provider management
export { ProviderPool, getProviderPool } from "./provider-pool";

// Rate limiting
export { RatePolicy, getRatePolicy } from "./rate-policy";

// Credit monitoring
export { CreditMonitor, getCreditMonitor } from "./credit-monitor";

// Types
export type {
  AIProvider,
  AITask,
  AITaskResult,
  TaskPriority,
  TaskCategory,
  ProviderConfig,
  ProviderStatus,
  ProviderCapability,
  RateLimitConfig,
  CreditLimitConfig,
  OrchestratorMetrics,
  ProviderMetrics,
  BackpressureState,
  RoutingDecision,
} from "./types";

// Diagnostics (DEBUG-ONLY, read-only visibility)
export {
  getDiagnosticsSnapshot,
  getCreditCounters,
  getActiveTaskCounts,
  formatDiagnosticsForLog,
  type DiagnosticsSnapshot,
  type ProviderSnapshot,
  type CreditCounters,
} from "./diagnostics";

// Future hooks (INACTIVE by default, no behavior changes)
export {
  hookModelRouting,
  hookCreditReservation,
  hookBackpressureCheck,
  hookPriorityAdjustment,
  hookFailoverDecision,
  MODEL_ROUTING_CONFIG,
  CREDIT_RESERVATION_CONFIG,
  BACKPRESSURE_CONFIG,
  HEALTH_CHECK_CONFIG,
} from "./future-hooks";

// Health tracking (PHASE 5.1 - ACTIVE)
export {
  getHealthTracker,
  HealthTracker,
  type ProviderHealth,
  type HealthConfig,
} from "./health-tracker";

// Credit guard (PHASE 5.2 - ACTIVE, observe-only mode)
export {
  getCreditGuard,
  CreditGuard,
  type CreditGuardConfig,
  type GuardDecision,
} from "./credit-guard";

// Task governance (PHASE 4 - ACTIVE)
export {
  getTaskGovernance,
  TaskGovernance,
  DEFAULT_CATEGORY_LIMITS,
  type CategoryLimits,
  type CategoryUsage,
  type GovernanceCheckResult,
  type FallbackEvent,
  type TaskGovernanceMetrics,
} from "./task-governance";

// Cost analytics (PHASE 4 EXTENSION - ACTIVE)
export {
  getCostAnalytics,
  CostAnalytics,
  PROVIDER_RATES,
  COST_THRESHOLDS,
  CATEGORY_VALUE_MAP,
  getTaskValue,
  type TaskValue,
  type CostEntry,
  type CategoryCost,
  type ProviderCost,
  type ArticleCost,
  type LocaleCost,
  type SessionCost,
  type ValueCategoryCost,
  type ValueMetrics,
  type TaskValueRatioResult,
  type CostRecommendation,
} from "./cost-analytics";

// Provider strategy (TASK 6 - ACTIVE)
export {
  getProviderStrategy,
  ProviderStrategy,
  getProviderScorecard,
  getAllProviderScorecards,
  getRecommendedProvider,
  getProviderRecommendations,
  simulateProviderRemoval,
  getStrategyOverview,
  type ProviderScorecard,
  type ProviderRecommendation,
  type ProviderRemovalSimulation,
} from "./provider-strategy";
