/**
 * Operations & Reliability - Configuration
 *
 * Feature flags and configuration for all ops components.
 * All features are OFF by default and require explicit enablement.
 */

import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[OpsConfig] ${msg}`, data),
};

export interface OpsConfig {
  // Feature flags
  systemHealthEnabled: boolean;
  costGuardsEnabled: boolean;
  backpressureEnabled: boolean;
  selfHealingEnabled: boolean;
  killSwitchesEnabled: boolean;

  // Health aggregator config
  health: {
    checkIntervalMs: number;
    memoryThresholdPercent: number;
    queueDepthThreshold: number;
    aiLatencyThresholdMs: number;
  };

  // Cost guards config
  cost: {
    defaultDailyLimitUsd: number;
    defaultMonthlyLimitUsd: number;
    warningThresholdPercent: number;
    hardCeilingPercent: number;
  };

  // Backpressure config
  backpressure: {
    cpuThresholdPercent: number;
    memoryThresholdPercent: number;
    queueDepthThreshold: number;
    aiLatencyThresholdMs: number;
    cooldownMs: number;
  };

  // Self-healing config
  selfHealing: {
    stuckJobThresholdMs: number;
    maxRetries: number;
    baseBackoffMs: number;
    maxBackoffMs: number;
    poisonThreshold: number;
  };
}

const DEFAULT_CONFIG: OpsConfig = {
  systemHealthEnabled: false,
  costGuardsEnabled: false,
  backpressureEnabled: false,
  selfHealingEnabled: false,
  killSwitchesEnabled: false,

  health: {
    checkIntervalMs: 30000,
    memoryThresholdPercent: 85,
    queueDepthThreshold: 100,
    aiLatencyThresholdMs: 5000,
  },

  cost: {
    defaultDailyLimitUsd: 50,
    defaultMonthlyLimitUsd: 500,
    warningThresholdPercent: 80,
    hardCeilingPercent: 100,
  },

  backpressure: {
    cpuThresholdPercent: 80,
    memoryThresholdPercent: 85,
    queueDepthThreshold: 50,
    aiLatencyThresholdMs: 3000,
    cooldownMs: 30000,
  },

  selfHealing: {
    stuckJobThresholdMs: 300000, // 5 minutes
    maxRetries: 5,
    baseBackoffMs: 1000,
    maxBackoffMs: 60000,
    poisonThreshold: 3,
  },
};

/**
 * Load configuration from environment variables
 */
export function loadOpsConfig(): OpsConfig {
  const config: OpsConfig = { ...DEFAULT_CONFIG };

  // Feature flags from environment
  config.systemHealthEnabled = process.env.ENABLE_SYSTEM_HEALTH === 'true';
  config.costGuardsEnabled = process.env.ENABLE_COST_GUARDS === 'true';
  config.backpressureEnabled = process.env.ENABLE_BACKPRESSURE === 'true';
  config.selfHealingEnabled = process.env.ENABLE_SELF_HEALING === 'true';
  config.killSwitchesEnabled = process.env.ENABLE_KILL_SWITCHES === 'true';

  // Health config
  if (process.env.OPS_HEALTH_CHECK_INTERVAL_MS) {
    config.health.checkIntervalMs = parseInt(process.env.OPS_HEALTH_CHECK_INTERVAL_MS, 10);
  }
  if (process.env.OPS_MEMORY_THRESHOLD_PERCENT) {
    config.health.memoryThresholdPercent = parseInt(process.env.OPS_MEMORY_THRESHOLD_PERCENT, 10);
  }

  // Cost config
  if (process.env.OPS_DAILY_LIMIT_USD) {
    config.cost.defaultDailyLimitUsd = parseFloat(process.env.OPS_DAILY_LIMIT_USD);
  }
  if (process.env.OPS_MONTHLY_LIMIT_USD) {
    config.cost.defaultMonthlyLimitUsd = parseFloat(process.env.OPS_MONTHLY_LIMIT_USD);
  }

  // Backpressure config
  if (process.env.OPS_BACKPRESSURE_CPU_THRESHOLD) {
    config.backpressure.cpuThresholdPercent = parseInt(process.env.OPS_BACKPRESSURE_CPU_THRESHOLD, 10);
  }
  if (process.env.OPS_BACKPRESSURE_COOLDOWN_MS) {
    config.backpressure.cooldownMs = parseInt(process.env.OPS_BACKPRESSURE_COOLDOWN_MS, 10);
  }

  // Self-healing config
  if (process.env.OPS_STUCK_JOB_THRESHOLD_MS) {
    config.selfHealing.stuckJobThresholdMs = parseInt(process.env.OPS_STUCK_JOB_THRESHOLD_MS, 10);
  }
  if (process.env.OPS_MAX_RETRIES) {
    config.selfHealing.maxRetries = parseInt(process.env.OPS_MAX_RETRIES, 10);
  }

  logger.info('Ops configuration loaded', {
    systemHealthEnabled: config.systemHealthEnabled,
    costGuardsEnabled: config.costGuardsEnabled,
    backpressureEnabled: config.backpressureEnabled,
    selfHealingEnabled: config.selfHealingEnabled,
    killSwitchesEnabled: config.killSwitchesEnabled,
  });

  return config;
}

// Singleton config instance
let configInstance: OpsConfig | null = null;

export function getOpsConfig(): OpsConfig {
  if (!configInstance) {
    configInstance = loadOpsConfig();
  }
  return configInstance;
}

export function resetOpsConfig(): void {
  configInstance = null;
}

// For testing
export function setOpsConfigForTest(config: Partial<OpsConfig>): void {
  configInstance = { ...DEFAULT_CONFIG, ...config };
}
