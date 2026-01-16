/**
 * Automated Content Refresh Engine - Configuration
 * Feature Flag: ENABLE_CONTENT_REFRESH_ENGINE=true
 */

// ============================================================================
// Feature Flag
// ============================================================================

export function isContentRefreshEnabled(): boolean {
  return process.env.ENABLE_CONTENT_REFRESH_ENGINE === 'true';
}

// ============================================================================
// Configuration
// ============================================================================

export const REFRESH_CONFIG = {
  // Age thresholds (days)
  freshnessThresholds: {
    critical: 365,  // Over 1 year
    high: 180,      // Over 6 months
    medium: 90,     // Over 3 months
    low: 30,        // Over 1 month
  },

  // Traffic drop thresholds (percentage)
  trafficDropThresholds: {
    critical: -50,  // 50% drop
    high: -30,      // 30% drop
    medium: -15,    // 15% drop
  },

  // Revenue drop thresholds (percentage)
  revenueDropThresholds: {
    critical: -40,
    high: -25,
    medium: -10,
  },

  // Signal weights for scoring
  signalWeights: {
    stale_content: 25,
    traffic_drop: 30,
    zero_search_results: 15,
    revenue_decline: 20,
    low_engagement: 10,
  },

  // Priority score thresholds
  priorityThresholds: {
    critical: 80,
    high: 60,
    medium: 40,
  },

  // Cache TTL
  cacheTtl: 600, // 10 minutes
} as const;

// ============================================================================
// Score to Priority
// ============================================================================

export function scoreToPriority(score: number): 'critical' | 'high' | 'medium' | 'low' {
  const { priorityThresholds } = REFRESH_CONFIG;
  if (score >= priorityThresholds.critical) return 'critical';
  if (score >= priorityThresholds.high) return 'high';
  if (score >= priorityThresholds.medium) return 'medium';
  return 'low';
}
