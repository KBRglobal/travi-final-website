/**
 * Continuous Readiness Monitor - Configuration
 * Feature Flag: ENABLE_CONTINUOUS_READINESS=false
 */

export function isContinuousReadinessEnabled(): boolean {
  return process.env.ENABLE_CONTINUOUS_READINESS === 'true';
}

export const READINESS_CONFIG = {
  intervalMs: parseInt(process.env.READINESS_INTERVAL_MS || '60000', 10),
  degradationThreshold: parseInt(process.env.READINESS_DEGRADATION_THRESHOLD || '70', 10),
  recoveryThreshold: parseInt(process.env.READINESS_RECOVERY_THRESHOLD || '85', 10),
  maxHistory: parseInt(process.env.READINESS_MAX_HISTORY || '500', 10),
  mttrWindowMs: parseInt(process.env.READINESS_MTTR_WINDOW_MS || '86400000', 10), // 24 hours
  eventRetentionMs: parseInt(process.env.READINESS_EVENT_RETENTION_MS || '604800000', 10), // 7 days
  version: '1.0.0',
} as const;
