/**
 * SEO Technical Health Engine - Configuration
 * Feature Flag: ENABLE_SEO_HEALTH=true
 */

// ============================================================================
// Feature Flag
// ============================================================================

export function isSeoHealthEnabled(): boolean {
  return process.env.ENABLE_SEO_HEALTH === 'true';
}

// ============================================================================
// Configuration
// ============================================================================

export const SEO_HEALTH_CONFIG = {
  // Title constraints
  title: {
    minLength: 30,
    maxLength: 60,
    optimalMin: 50,
    optimalMax: 60,
  },

  // Description constraints
  description: {
    minLength: 120,
    maxLength: 160,
    optimalMin: 150,
    optimalMax: 160,
  },

  // Content constraints
  content: {
    minWordCount: 300,
    thinContentThreshold: 200,
  },

  // Health score weights
  scoreWeights: {
    critical: 30,
    warning: 15,
    info: 5,
  },

  // Cache TTL
  cacheTtl: 600, // 10 minutes

  // Batch size for analysis
  batchSize: 50,
} as const;

// ============================================================================
// Severity Mapping
// ============================================================================

export const ISSUE_SEVERITY: Record<string, 'critical' | 'warning' | 'info'> = {
  missing_title: 'critical',
  missing_description: 'critical',
  duplicate_title: 'warning',
  duplicate_description: 'warning',
  missing_h1: 'critical',
  multiple_h1: 'warning',
  broken_internal_link: 'critical',
  orphan_page: 'warning',
  missing_alt_text: 'info',
  title_too_long: 'warning',
  title_too_short: 'warning',
  description_too_long: 'warning',
  description_too_short: 'warning',
  missing_canonical: 'info',
  thin_content: 'warning',
};
