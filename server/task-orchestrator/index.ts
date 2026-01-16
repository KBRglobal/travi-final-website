/**
 * Autonomous Task Orchestrator Module
 * Turns insights into ordered, executable work plans
 *
 * Enable with: ENABLE_TASK_ORCHESTRATOR=true
 */

export * from './types';
export {
  generatePlan,
  optimizePlan,
  validatePlan,
} from './planner';
export {
  createPlan,
  getPlan,
  getAllPlans,
  getPlansByStatus,
  getPlanSummaries,
  updatePlanStatus,
  updateStepStatus,
  getNextReadySteps,
  deletePlan,
  archiveCompletedPlans,
  getOrchestratorStats,
} from './orchestrator';
export { default as orchestratorRoutes } from './routes';

/**
 * Initialize task orchestrator
 */
export function initTaskOrchestrator(): void {
  const enabled = process.env.ENABLE_TASK_ORCHESTRATOR === 'true';
  console.log(`[Orchestrator] Module initialized (enabled: ${enabled})`);
}
