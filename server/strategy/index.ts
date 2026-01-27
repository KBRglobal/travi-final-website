/**
 * Strategic Priority Engine Module
 * Decides what the system should work on first
 *
 * Enable with: ENABLE_STRATEGY_ENGINE=true
 */

export * from "./types";
export { collectAllSignals, allCollectors } from "./signals";
export {
  computePriorityScore,
  computeContributionScores,
  determinePrimaryReason,
  determineSecondaryReasons,
  computeContentPriority,
  applyWeightAdjustments,
} from "./scorer";
export {
  getPriority,
  computeAllPriorities,
  getTopPriorities,
  getPrioritiesByReason,
  getStrategySnapshot,
  getStrategyWeights,
  updateStrategyWeights,
  resetStrategyWeights,
  invalidatePriorityCache,
  getPriorityCacheStats,
} from "./engine";
export { default as strategyRoutes } from "./routes";

/**
 * Initialize strategy engine
 */
export function initStrategyEngine(): void {
  const enabled = process.env.ENABLE_STRATEGY_ENGINE === "true";
}
