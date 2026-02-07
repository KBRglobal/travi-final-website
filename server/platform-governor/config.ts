/**
 * Autonomous Platform Governor - Configuration
 * Feature Flag: ENABLE_PLATFORM_GOVERNOR=false
 */

export function isPlatformGovernorEnabled(): boolean {
  return process.env.ENABLE_PLATFORM_GOVERNOR === "true";
}

export const GOVERNOR_CONFIG = {
  // How often to evaluate rules (ms)
  evaluationIntervalMs: Number.parseInt(process.env.GOVERNOR_EVAL_INTERVAL_MS || "30000", 10),

  // Max decisions to store
  maxDecisionsStored: Number.parseInt(process.env.GOVERNOR_MAX_DECISIONS || "1000", 10),

  // Default cooldown between rule triggers
  defaultCooldownMs: Number.parseInt(process.env.GOVERNOR_DEFAULT_COOLDOWN_MS || "60000", 10),

  // Thresholds
  thresholds: {
    aiCostBudget: Number.parseFloat(process.env.AI_DAILY_BUDGET || "100"),
    errorRateSpike: Number.parseFloat(process.env.GOVERNOR_ERROR_RATE_THRESHOLD || "0.1"),
    queueBacklogMax: Number.parseInt(process.env.GOVERNOR_QUEUE_BACKLOG_MAX || "1000", 10),
    memoryPressurePercent: Number.parseInt(process.env.GOVERNOR_MEMORY_THRESHOLD || "90", 10),
    dbSlowMs: Number.parseInt(process.env.GOVERNOR_DB_SLOW_MS || "5000", 10),
  },
} as const;
