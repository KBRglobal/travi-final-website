/**
 * Platform Decision Simulator (PDS)
 *
 * Answers: "If we change X — what WILL happen to the system?"
 *
 * Features:
 * - Scenario modeling for hypothetical changes
 * - Impact propagation engine
 * - Deterministic simulation (pure functions)
 * - Admin API for simulation management
 *
 * Feature flag: ENABLE_DECISION_SIMULATOR=false
 */

export * from './types';
export * from './scenarios';
export * from './impact-engine';
export * from './repository';

export { default as simulatorRoutes } from './routes';

import { getScenarioManager } from './scenarios';
import { getSimulatorRepository } from './repository';
import { runSimulation, quickImpactCheck } from './impact-engine';
import type { Scenario, ScenarioChange, SimulationOptions } from './types';

/**
 * Check if simulator is enabled
 */
export function isSimulatorEnabled(): boolean {
  return process.env.ENABLE_DECISION_SIMULATOR === 'true';
}

/**
 * Run a simulation with a scenario
 */
export function simulate(
  scenario: Scenario,
  options?: SimulationOptions
) {
  if (!isSimulatorEnabled()) {
    throw new Error('Decision Simulator is disabled');
  }

  const result = runSimulation(scenario, options);
  const repo = getSimulatorRepository();
  repo.store(result);

  return result;
}

/**
 * Run simulation using a template
 */
export function simulateTemplate(
  templateId: string,
  options?: SimulationOptions
) {
  const scenarios = getScenarioManager();
  const scenario = scenarios.get(templateId);

  if (!scenario) {
    throw new Error(`Scenario template '${templateId}' not found`);
  }

  return simulate(scenario, options);
}

/**
 * Quick impact check for changes
 */
export function checkImpact(changes: ScenarioChange[]) {
  return quickImpactCheck(changes);
}

/**
 * Get simulator status
 */
export function getSimulatorStatus() {
  const enabled = isSimulatorEnabled();

  if (!enabled) {
    return { enabled, stats: null };
  }

  const repo = getSimulatorRepository();
  const scenarios = getScenarioManager();

  return {
    enabled,
    stats: {
      resultCount: repo.count(),
      templateCount: scenarios.listTemplates().length,
      ...repo.getStats(),
    },
  };
}
