/**
 * Content Readiness - Type Definitions
 *
 * Feature flag: ENABLE_CONTENT_READINESS=true
 */

export function isContentReadinessEnabled(): boolean {
  return process.env.ENABLE_CONTENT_READINESS === 'true';
}

/**
 * Individual readiness dimension.
 */
export interface ReadinessDimension {
  name: string;
  score: number; // 0-100
  weight: number; // Contribution weight
  status: 'excellent' | 'good' | 'needs_work' | 'poor';
  details: string;
}

/**
 * Complete readiness report for content.
 */
export interface ReadinessReport {
  contentId: string;
  overallScore: number; // 0-100
  status: 'ready' | 'almost_ready' | 'needs_work' | 'not_ready';
  dimensions: {
    iceScore: ReadinessDimension;
    entityCoverage: ReadinessDimension;
    searchIndex: ReadinessDimension;
    aeoScore: ReadinessDimension;
    freshness: ReadinessDimension;
    internalLinks: ReadinessDimension;
  };
  recommendations: string[];
  calculatedAt: Date;
}

/**
 * Readiness thresholds.
 */
export const READINESS_THRESHOLDS = {
  // Overall score thresholds
  READY: 80,
  ALMOST_READY: 60,
  NEEDS_WORK: 40,

  // Individual dimension thresholds
  EXCELLENT: 90,
  GOOD: 70,
  NEEDS_WORK_DIM: 50,
} as const;

/**
 * Dimension weights (must sum to 1.0).
 */
export const DIMENSION_WEIGHTS = {
  iceScore: 0.25,        // ICE is important
  entityCoverage: 0.20,  // Entities matter for SEO
  searchIndex: 0.15,     // Must be indexed
  aeoScore: 0.20,        // AEO for answer engines
  freshness: 0.10,       // Fresh content ranks better
  internalLinks: 0.10,   // Internal linking helps discovery
} as const;

/**
 * Get status from score.
 */
export function getStatusFromScore(
  score: number,
  thresholds = READINESS_THRESHOLDS
): ReadinessDimension['status'] {
  if (score >= thresholds.EXCELLENT) return 'excellent';
  if (score >= thresholds.GOOD) return 'good';
  if (score >= thresholds.NEEDS_WORK_DIM) return 'needs_work';
  return 'poor';
}

/**
 * Get overall status from score.
 */
export function getOverallStatus(
  score: number,
  thresholds = READINESS_THRESHOLDS
): ReadinessReport['status'] {
  if (score >= thresholds.READY) return 'ready';
  if (score >= thresholds.ALMOST_READY) return 'almost_ready';
  if (score >= thresholds.NEEDS_WORK) return 'needs_work';
  return 'not_ready';
}
