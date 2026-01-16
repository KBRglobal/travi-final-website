/**
 * System Intelligence Feedback Loop Module
 * Learn from outcomes and adjust priorities
 *
 * Enable with: ENABLE_INTELLIGENCE_FEEDBACK=true
 */

export * from './types';
export {
  captureBeforeMetrics,
  captureAfterMetrics,
  calculateImprovement,
  determineOutcome,
  recordTaskStart,
  recordTaskCompletion,
  recordManualAdjustment,
  getEvent,
  getEventsByTaskType,
  getEventsByTarget,
  getAllMeasuredEvents,
  getRecentEvents,
  cleanupOldEvents,
} from './tracker';
export {
  calculateTaskTypeConfidence,
  calculateAllConfidenceScores,
  shouldAdjustWeight,
  calculateWeightAdjustment,
  updateTaskTypeWeights,
  updateSignalWeights,
  trainModel,
  getModel,
  resetModel,
  getWeightAdjustmentHistory,
  generateSummary,
} from './learner';
export { default as feedbackRoutes } from './routes';

/**
 * Initialize intelligence feedback module
 */
export function initIntelligenceFeedback(): void {
  const enabled = process.env.ENABLE_INTELLIGENCE_FEEDBACK === 'true';
  console.log(`[Feedback] Module initialized (enabled: ${enabled})`);
}
