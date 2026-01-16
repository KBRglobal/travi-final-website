/**
 * Operations & Reliability Layer
 *
 * Unified module for production operations:
 * - System Health Aggregator
 * - Cost & Usage Guardrails
 * - Backpressure & Load Shedding
 * - Self-Healing Jobs
 * - Kill Switch Framework
 *
 * All features are disabled by default and require explicit enablement
 * via environment variables.
 */

import { log } from '../lib/logger';
import { getOpsConfig, loadOpsConfig } from './config';
import { getHealthAggregator, resetHealthAggregator } from './health-aggregator';
import { getCostGuards, resetCostGuards } from './cost-guards';
import { getBackpressureController, resetBackpressureController } from './backpressure';
import { getSelfHealingJobManager, resetSelfHealingJobManager } from './self-healing';
import { getKillSwitchManager, resetKillSwitchManager } from './kill-switches';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Ops] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[Ops] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[Ops] ${msg}`, undefined, data),
};

/**
 * Initialize all ops components
 * Should be called during server startup
 */
export function initializeOps(): void {
  const config = loadOpsConfig();

  logger.info('Initializing Operations & Reliability layer', {
    systemHealthEnabled: config.systemHealthEnabled,
    costGuardsEnabled: config.costGuardsEnabled,
    backpressureEnabled: config.backpressureEnabled,
    selfHealingEnabled: config.selfHealingEnabled,
    killSwitchesEnabled: config.killSwitchesEnabled,
  });

  // Start enabled components
  if (config.systemHealthEnabled) {
    getHealthAggregator().start();
  }

  if (config.backpressureEnabled) {
    getBackpressureController().start();
  }

  if (config.selfHealingEnabled) {
    getSelfHealingJobManager().start();
  }

  if (config.killSwitchesEnabled) {
    getKillSwitchManager().start();
  }

  // Cost guards start automatically when accessed

  logger.info('Ops layer initialized');
}

/**
 * Shutdown all ops components
 * Should be called during graceful shutdown
 */
export function shutdownOps(): void {
  logger.info('Shutting down ops layer');

  resetHealthAggregator();
  resetCostGuards();
  resetBackpressureController();
  resetSelfHealingJobManager();
  resetKillSwitchManager();

  logger.info('Ops layer shutdown complete');
}

/**
 * Get comprehensive ops status
 */
export async function getOpsStatus(): Promise<{
  config: {
    systemHealthEnabled: boolean;
    costGuardsEnabled: boolean;
    backpressureEnabled: boolean;
    selfHealingEnabled: boolean;
    killSwitchesEnabled: boolean;
  };
  health: Awaited<ReturnType<typeof getHealthAggregator>>['getLastSnapshot'] extends () => infer R ? R : never;
  costs: ReturnType<typeof getCostGuards>['getAllUsage'] extends () => infer R ? R : never;
  backpressure: ReturnType<typeof getBackpressureController>['getState'] extends () => infer R ? R : never;
  selfHealing: ReturnType<typeof getSelfHealingJobManager>['getStats'] extends () => infer R ? R : never;
  killSwitches: ReturnType<typeof getKillSwitchManager>['getAllStates'] extends () => infer R ? R : never;
}> {
  const config = getOpsConfig();

  return {
    config: {
      systemHealthEnabled: config.systemHealthEnabled,
      costGuardsEnabled: config.costGuardsEnabled,
      backpressureEnabled: config.backpressureEnabled,
      selfHealingEnabled: config.selfHealingEnabled,
      killSwitchesEnabled: config.killSwitchesEnabled,
    },
    health: getHealthAggregator().getLastSnapshot(),
    costs: getCostGuards().getAllUsage(),
    backpressure: getBackpressureController().getState(),
    selfHealing: getSelfHealingJobManager().getStats(),
    killSwitches: getKillSwitchManager().getAllStates(),
  };
}

// Re-export all components for direct access
export * from './types';
export * from './config';
export * from './health-aggregator';
export * from './cost-guards';
export * from './backpressure';
export * from './self-healing';
export * from './kill-switches';
