/**
 * Autonomous Execution Orchestrator Module
 *
 * Safely execute approved optimizations with sequencing,
 * rollback, and blast-radius control.
 *
 * Feature flags:
 * - ENABLE_AUTONOMOUS_EXECUTION=false
 * - ENABLE_AUTONOMOUS_ROLLBACK=true
 */

export * from "./types";
export { ExecutionPlanner, getExecutionPlanner, resetExecutionPlanner } from "./planner";
export type { ApprovedProposal } from "./types";
export { Executor, getExecutor, resetExecutor } from "./executor";
export { RollbackManager, getRollbackManager, resetRollbackManager } from "./rollback";
export { SafetyGuards, getSafetyGuards, resetSafetyGuards } from "./safety-guards";
export { createAutonomousExecutionRouter } from "./routes";

const ENABLE_AUTONOMOUS_EXECUTION = process.env.ENABLE_AUTONOMOUS_EXECUTION === "true";

/**
 * Initialize the Autonomous Execution system
 */
export function initAutonomousExecution(): void {
  if (!ENABLE_AUTONOMOUS_EXECUTION) {
    return;
  }

  // Pre-initialize singletons
  const { getExecutionPlanner } = require("./planner");
  const { getExecutor } = require("./executor");
  const { getRollbackManager } = require("./rollback");
  const { getSafetyGuards } = require("./safety-guards");

  getExecutionPlanner();
  getExecutor();
  getRollbackManager();
  getSafetyGuards();
}
