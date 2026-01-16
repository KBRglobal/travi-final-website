/**
 * Blast Radius & Impact Simulator
 * Feature Flag: ENABLE_BLAST_RADIUS=false
 *
 * Calculates impacted users, content, and revenue for a given
 * feature, entity, or locale. Provides impact breakdown and
 * dependency analysis.
 */

export { isBlastRadiusEnabled, BLAST_RADIUS_CONFIG } from './config';
export {
  simulateBlastRadius,
  simulateMultiple,
  compareScenarios,
  getSimulationHistory,
  getStatus,
  clearCache,
  clearHistory,
  clearAll,
} from './simulator';
export type {
  ImpactScope,
  ImpactSeverity,
  ImpactTarget,
  ImpactMetrics,
  ImpactBreakdown,
  BlastRadiusResult,
  DependencyNode,
  SimulationScenario,
  SimulationHistory,
  BlastRadiusStatus,
} from './types';
export { default as blastRadiusRoutes } from './routes';
