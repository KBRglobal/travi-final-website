/**
 * Go-Live Control Plane (GLCP)
 *
 * Meta-orchestration system for platform go-live decisions.
 *
 * Features:
 * - System Capability Registry
 * - Environment Readiness Evaluator
 * - Feature Rollout Simulator
 * - Safe Rollout Executor
 * - Executive Go-Live API
 *
 * Enable with: ENABLE_GLCP=true
 */

// Types
export { isGLCPEnabled, CapabilityDomain, RiskLevel, Capability } from './capabilities/types';
export type { BlastRadius, CapabilitySnapshot, DependencyValidation, InvalidStateReport } from './capabilities/types';

// Capability Registry
export {
  discoverCapabilities,
  registerCapabilities,
  getAllCapabilities,
  getCapability,
  getCapabilityByFlag,
  groupByDomain,
  createSnapshot,
  clearCapabilityStore,
} from './capabilities/registry';

// Dependency Resolution
export {
  validateDependencies,
  detectInvalidStates,
  getSafeToEnable,
  getMustDisableFirst,
  getEnableOrder,
  getDisableOrder,
  calculateBlastRadius,
} from './capabilities/dependency-resolver';

// Readiness Evaluation
export type { ReadinessStatus, ProbeCategory, ProbeResult, ReadinessResult, ReadinessSummary } from './readiness/results';
export {
  evaluateReadiness,
  quickHealthCheck,
  evaluateCategory,
  getGoLiveReadiness,
  watchReadiness,
  getAvailableProbes,
  clearEvaluationCache,
} from './readiness/evaluator';

// Simulation
export type {
  SimulationInput,
  SimulationResult,
  SimulationOptions,
  CapabilityImpact,
  DomainImpact,
  Conflict,
  StateComparison,
} from './simulator/types';
export {
  simulate,
  simulateBatch,
  simulateEnable,
  simulateDisable,
  compareStates,
  getCachedSimulation,
  clearSimulationCache,
} from './simulator/simulator';

// Execution
export type {
  ExecutionPlan,
  ExecutionResult,
  ExecutionStep,
  ExecutionOptions,
  ExecutionStatus,
  StepStatus,
  RollbackRequest,
  RollbackResult,
  AuditEntry,
} from './executor/types';
export {
  createPlan,
  approvePlan,
  execute,
  getExecution,
  getPlan,
  listExecutions,
  cancelExecution,
  requestRollback,
  getManualRollbackInstructions,
  clearExecutorState,
} from './executor/executor';

// Audit
export {
  logAuditEvent,
  getAuditLog,
  getExecutionAudit,
  getActivitySummary,
  exportAuditLog,
  clearAuditLog,
  getAuditStats,
} from './executor/audit';

// API Routes
export { glcpRouter } from './api/routes';

// Enforcement (CRITICAL - this is how GLCP controls the platform)
export {
  checkOperation,
  canPublish,
  canSchedule,
  canRunJob,
  canMakeAICall,
  canRegenerate,
  canRollout,
  canExecuteBulkChange,
  explainDecision,
  logEnforcement,
  getEnforcementLog,
  getEnforcementStats,
} from './enforcement/index';
export type { EnforcementAction, EnforcementDecision, OperationContext, DecisionExplanation } from './enforcement/index';

// Enforcement Hooks (drop-in for existing choke points)
export {
  beforePublish,
  beforeSchedule,
  beforeJobExecution,
  beforeAICall,
  beforeRegeneration,
  beforeRollout,
  beforeBulkChange,
  beforeMigration,
  checkMultiple,
  getEnforcementStatus,
} from './enforcement/hooks';

// Admin Routes
export { glcpAdminRouter } from './enforcement/admin-routes';
