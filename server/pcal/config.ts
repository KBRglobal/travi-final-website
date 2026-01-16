/**
 * Platform Command & Accountability Layer (PCAL) - Configuration
 * Feature Flag: ENABLE_PCAL=false
 */

export function isPCALEnabled(): boolean {
  return process.env.ENABLE_PCAL === 'true';
}

export const PCAL_CONFIG = {
  // Decision stream limits
  maxDecisions: parseInt(process.env.PCAL_MAX_DECISIONS || '50000', 10),
  decisionRetentionDays: parseInt(process.env.PCAL_RETENTION_DAYS || '180', 10),

  // Pattern detection
  patternThreshold: parseInt(process.env.PCAL_PATTERN_THRESHOLD || '3', 10),
  patternWindowMs: parseInt(process.env.PCAL_PATTERN_WINDOW_MS || '604800000', 10), // 7 days

  // Feedback loop
  overrideThreshold: parseInt(process.env.PCAL_OVERRIDE_THRESHOLD || '5', 10),
  incidentCorrelationWindowMs: parseInt(process.env.PCAL_INCIDENT_WINDOW_MS || '3600000', 10), // 1 hour
  flappingThreshold: parseInt(process.env.PCAL_FLAPPING_THRESHOLD || '5', 10),
  flappingWindowMs: parseInt(process.env.PCAL_FLAPPING_WINDOW_MS || '86400000', 10), // 24 hours

  // Confidence adjustments
  confidenceDecayRate: parseFloat(process.env.PCAL_CONFIDENCE_DECAY || '0.1'),
  minConfidence: parseInt(process.env.PCAL_MIN_CONFIDENCE || '20', 10),

  // Override TTL adjustments
  defaultOverrideTtlMs: parseInt(process.env.PCAL_DEFAULT_OVERRIDE_TTL_MS || '3600000', 10), // 1 hour
  minOverrideTtlMs: parseInt(process.env.PCAL_MIN_OVERRIDE_TTL_MS || '300000', 10), // 5 minutes

  // Silent regression detection
  regressionThresholdPercent: parseInt(process.env.PCAL_REGRESSION_THRESHOLD || '10', 10),

  version: '1.0.0',
} as const;
