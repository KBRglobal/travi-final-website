/**
 * Autonomous Growth Operating System
 *
 * A comprehensive system for automated growth optimization
 * with 5 tightly integrated subsystems:
 *
 * 1. Signal Unification Layer - Aggregates signals from all intelligence sources
 * 2. Prioritization & Trade-off Engine - Multi-dimensional scoring and ranking
 * 3. Action Synthesis Engine - Generates executable action plans
 * 4. Execution Readiness & Safety Layer - Evaluates safety and enforces policies
 * 5. Executive Growth Feed API - Real-time dashboard and action queue
 *
 * FEATURE FLAGS (all default OFF):
 * - ENABLE_GROWTH_OS=true (master switch)
 * - ENABLE_GROWTH_OS_SIGNALS=true
 * - ENABLE_GROWTH_OS_PRIORITIZATION=true
 * - ENABLE_GROWTH_OS_ACTIONS=true
 * - ENABLE_GROWTH_OS_SAFETY=true
 * - ENABLE_GROWTH_OS_API=true
 *
 * AUTONOMY LEVELS:
 * - GROWTH_OS_AUTONOMY_LEVEL=manual (default)
 * - Options: full, supervised, manual, disabled
 */

// Configuration
export {
  isGrowthOSEnabled,
  isSignalsEnabled,
  isPrioritizationEnabled,
  isActionsEnabled,
  isSafetyEnabled,
  isApiEnabled,
  getGrowthOSConfig,
  getAutonomyLevel,
  SCORING_WEIGHTS,
  RISK_THRESHOLDS,
  type GrowthOSConfig,
  type AutonomyLevel,
} from './config';

// Subsystem 1: Signal Unification Layer
export {
  // Types
  type SignalSource,
  type SignalCategory,
  type SignalPriority,
  type NormalizedSignal,
  type RawSignal,
  type SignalQuery,
  type SignalAggregation,
  type EntitySignalSummary,
  // Registry
  signalRegistry,
  // Normalization
  normalizeSignal,
  normalizeSignals,
  validateRawSignal,
  createTrafficSignal,
  createContentHealthSignal,
  createRevenueSignal,
  createOpsSignal,
  // Decay
  runDecayPass,
  startDecayScheduler,
  stopDecayScheduler,
  getDecayStats,
  type DecayStats,
  // Query
  querySignals,
  getTopSignals,
  getCriticalSignals,
  aggregateByCategory,
  getEntitySummary,
  searchSignals,
  getAttentionRequired,
} from './signals';

// Subsystem 2: Prioritization & Trade-off Engine
export {
  // Types
  type ActionType,
  type ExecutionComplexity,
  type Reversibility,
  type ScoringDimensions,
  type ActionCandidate,
  type TradeOffComparison,
  type PrioritizationResult,
  type PrioritizationFilter,
  // Scoring
  calculateDimensions,
  calculatePriorityScore,
  getScoreBreakdown,
  type ScoreBreakdown,
  // Ranking
  createActionCandidate,
  rankCandidates,
  prioritize,
  getTopCandidates,
  getQuickWins,
  getHighImpact,
  getLowRisk,
} from './prioritization';

// Subsystem 3: Action Synthesis Engine
export {
  // Types
  type StepStatus,
  type StepType,
  type ExecutionStep,
  type PlanStatus,
  type ActionPlan,
  type RollbackPlan,
  type ExecutionResult,
  type ActionChange,
  type SynthesisOptions,
  type PlanSummary,
  // Synthesizer
  synthesizePlan,
  synthesizePlans,
  approvePlan,
  planRegistry,
  getReadyPlans,
  getPendingApproval,
  // Executor
  executePlan,
  createRollbackPlan,
  executeRollback,
  getExecutionStats,
  type ExecutionStats,
} from './actions';

// Subsystem 4: Execution Readiness & Safety Layer
export {
  // Types
  type SafetyResult,
  type SafetyCategory,
  type SafetyCheck,
  type SafetyEvaluation,
  type PolicyType,
  type Policy,
  type PolicyEnforcementResult,
  type ReadinessStatus,
  type ReadinessCheck,
  type ConflictResult,
  type RateLimitResult,
  type SafetyConfig,
  // Evaluator
  getSafetyConfig,
  updateSafetyConfig,
  evaluatePlan,
  evaluateCandidate,
  checkRateLimit,
  incrementRateLimit,
  // Policies
  registerPolicy,
  getAllPolicies,
  enforceAllPolicies,
  checkReadiness,
  getReadyForExecution,
  getBlockedPlans,
} from './safety';

// Subsystem 5: Executive Growth Feed API
export {
  // Types
  type FeedItemType,
  type FeedPriority,
  type FeedItem,
  type FeedFilter,
  type FeedResponse,
  type DashboardSummary,
  type QueueItem,
  type QueueResponse,
  // Feed
  generateFeed,
  getFeed,
  getDashboardSummary,
  getActionQueue,
  // Routes
  growthOSRoutes,
} from './api';
