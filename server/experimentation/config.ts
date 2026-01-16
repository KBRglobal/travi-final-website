/**
 * Experimentation / A-B Test Engine - Configuration
 * Feature Flag: ENABLE_EXPERIMENTS=true
 */

// ============================================================================
// Feature Flag
// ============================================================================

export function isExperimentationEnabled(): boolean {
  return process.env.ENABLE_EXPERIMENTS === 'true';
}

// ============================================================================
// Configuration
// ============================================================================

export const EXPERIMENTATION_CONFIG = {
  // Maximum number of concurrent active experiments
  maxActiveExperiments: parseInt(process.env.MAX_ACTIVE_EXPERIMENTS || '10', 10),

  // Default minimum sample size per variant
  defaultSampleSize: parseInt(process.env.EXPERIMENT_SAMPLE_SIZE || '100', 10),

  // Statistical significance threshold (95% = 0.95)
  significanceThreshold: parseFloat(process.env.SIGNIFICANCE_THRESHOLD || '0.95'),

  // Assignment cache TTL in seconds
  assignmentCacheTtl: 3600, // 1 hour

  // Event buffer size
  eventBufferSize: 10000,

  // Hash seed for deterministic assignment
  hashSeed: process.env.EXPERIMENT_HASH_SEED || 'exp-seed-2024',

  // Metric aggregation window in minutes
  aggregationWindowMinutes: 60,
} as const;

// ============================================================================
// Default Metrics
// ============================================================================

export const DEFAULT_METRICS = {
  pageView: {
    name: 'Page View',
    type: 'engagement' as const,
    eventName: 'page_view',
    aggregation: 'count' as const,
  },
  click: {
    name: 'Click',
    type: 'click' as const,
    eventName: 'click',
    aggregation: 'count' as const,
  },
  conversion: {
    name: 'Conversion',
    type: 'conversion' as const,
    eventName: 'conversion',
    aggregation: 'count' as const,
  },
  revenue: {
    name: 'Revenue',
    type: 'revenue' as const,
    eventName: 'purchase',
    aggregation: 'sum' as const,
  },
} as const;
