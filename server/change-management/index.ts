/**
 * Production Change Management System (PCMS)
 *
 * "Terraform plan/apply" for content & intelligence.
 * Safe, auditable, reversible bulk changes.
 */

// Routes
export { registerChangeManagementRoutes } from "./routes";

// Plans
export {
  createPlan,
  getPlan,
  updatePlanStatus,
  updateChange,
  listPlans,
  getPlanHistory,
  getStats,
  deletePlan,
  generateChangeId,
} from "./plans";

// Diff
export {
  generateChangeDiff,
  generateContentDiff,
  generatePlanPreview,
  generateHumanReadableSummary,
  generateUnifiedDiff,
  generateJsonDiff,
} from "./diff";

// Guards
export {
  evaluateGuards,
  hasBlockingFailures,
  canApprove,
  canApply,
  setGuardConfig,
  getGuardConfig,
} from "./guards";

// Executor
export {
  dryRun,
  executePlan,
  isExecuting,
  getExecutionStatus,
} from "./executor";

// Rollback
export {
  generateRollbackPlan,
  canRollback,
  rollbackPlan,
  rollbackChanges,
  previewRollback,
  isRollingBack,
} from "./rollback";

// Types
export type {
  ChangePlan,
  ChangeItem,
  ChangeType,
  ChangeStatus,
  PlanStatus,
  PlanScope,
  RiskLevel,
  CreatedFrom,
  ImpactEstimate,
  DryRunResult,
  DiffBlock,
  ContentDiff,
  ChangePreview,
  GuardType,
  GuardResult,
  GuardConfig,
  ExecutionContext,
  ExecutionResult,
  ChangeResult,
  ExecutionError,
  RollbackPlan,
  RollbackItem,
  RollbackResult,
  PlanHistoryEntry,
  ChangeManagementStats,
} from "./types";

// Feature flags
export {
  isChangeManagementEnabled,
  isChangeApplyEnabled,
  isChangeRollbackEnabled,
  isDryRunEnabled,
} from "./types";
