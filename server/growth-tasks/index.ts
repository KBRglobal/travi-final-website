/**
 * Autonomous Growth Tasks Module
 * Self-generates tasks to grow traffic and revenue
 *
 * Enable with: ENABLE_GROWTH_TASKS=true
 */

export * from "./types";
export { detectors, runDetectors, runSingleDetector } from "./detectors";
export { generateTask, generateTasksFromDetections, batchGenerateTasks } from "./task-generator";
export {
  scoreTask,
  prioritizeTasks,
  getTopTasks,
  categorizeTasks,
  estimateGrowthPotential,
  suggestNextAction,
  getBalancedWorkload,
  calculateGrowthMetrics,
} from "./prioritizer";
export {
  addTask,
  addTasks,
  getTask,
  getAllTasks,
  getPendingTasks,
  updateTaskStatus,
  assignTask,
  completeTask,
  skipTask,
  removeTask,
  clearCompletedTasks,
  startQueue,
  stopQueue,
  getQueueStats,
  getGrowthMetrics,
  forceDetectionRun,
} from "./queue";

import { startQueue, stopQueue } from "./queue";

/**
 * Initialize growth tasks module
 */
export function initGrowthTasks(): void {
  const enabled = process.env.ENABLE_GROWTH_TASKS === "true";

  if (enabled) {
    startQueue();
  }
}

/**
 * Shutdown growth tasks module
 */
export function shutdownGrowthTasks(): void {
  stopQueue();
}
