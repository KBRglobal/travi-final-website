/**
 * Autonomy Simulation Mode Module
 * Replay historical traffic against hypothetical policies
 */

export * from './types';
export {
  loadHistoricalDecisions,
  simulateDecision,
  runSimulation,
  getSimulationResult,
  listSimulationResults,
  clearSimulationCache,
  getActiveSimulationCount,
} from './simulator';
