/**
 * Production Cutover Engine - Configuration
 * Feature Flag: ENABLE_PRODUCTION_CUTOVER=false
 */

export function isProductionCutoverEnabled(): boolean {
  return process.env.ENABLE_PRODUCTION_CUTOVER === 'true';
}

export const CUTOVER_CONFIG = {
  minReadinessScore: parseInt(process.env.CUTOVER_MIN_READINESS || '70', 10),
  maxSoftBlockers: parseInt(process.env.CUTOVER_MAX_SOFT_BLOCKERS || '3', 10),
  approvalDurationMs: parseInt(process.env.CUTOVER_APPROVAL_DURATION_MS || '14400000', 10),
  overrideExpiryMs: parseInt(process.env.CUTOVER_OVERRIDE_EXPIRY_MS || '3600000', 10),
  cacheDurationMs: parseInt(process.env.CUTOVER_CACHE_MS || '30000', 10),
  costWarningThreshold: parseFloat(process.env.CUTOVER_COST_WARNING || '0.8'),
  backpressureQueueMax: parseInt(process.env.CUTOVER_QUEUE_MAX || '500', 10),
  backpressureMemoryMax: parseInt(process.env.CUTOVER_MEMORY_MAX || '85', 10),
  version: '1.0.0',
} as const;
