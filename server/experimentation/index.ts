/**
 * Experimentation / A-B Test Engine
 * Feature Flag: ENABLE_EXPERIMENTS=true
 *
 * Provides A/B testing capabilities with deterministic user assignment,
 * variant management, metric collection, and results analysis.
 */

export * from './types';
export * from './config';
export {
  computeAssignmentHash,
  selectVariant,
  evaluateAudienceFilter,
  createExperiment,
  getExperiment,
  updateExperimentStatus,
  listExperiments,
  getActiveExperiments,
  getAssignment,
  getAssignmentForUser,
  recordMetricEvent,
  getMetricEvents,
  calculateExperimentResults,
  getExperimentationStatus,
  clearExperimentationData,
} from './engine';
export { default as experimentationRoutes } from './routes';
