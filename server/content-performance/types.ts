/**
 * Content Performance Feedback Loop - Type Definitions
 *
 * Feature flag: ENABLE_CONTENT_PERFORMANCE_LOOP=true
 */

export function isContentPerformanceLoopEnabled(): boolean {
  return process.env.ENABLE_CONTENT_PERFORMANCE_LOOP === 'true';
}

/**
 * Performance metrics for content.
 */
export interface PerformanceMetrics {
  contentId: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
  bounceRate: number;
  avgDwellTime: number; // seconds
  pageviews: number;
  uniqueVisitors: number;
  measuredAt: Date;
  periodDays: number;
}

/**
 * Issue type.
 */
export type PerformanceIssueType =
  | 'low_ctr'
  | 'high_bounce'
  | 'low_dwell'
  | 'no_clicks'
  | 'poor_position'
  | 'declining_traffic';

/**
 * Issue severity.
 */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Detected performance issue.
 */
export interface PerformanceIssue {
  id: string;
  contentId: string;
  type: PerformanceIssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  metrics: Partial<PerformanceMetrics>;
  recommendations: Recommendation[];
  detectedAt: Date;
}

/**
 * Recommendation type.
 */
export type RecommendationType =
  | 'improve_title'
  | 'improve_meta'
  | 'add_entities'
  | 'regenerate_intro'
  | 'add_internal_links'
  | 'improve_content'
  | 'add_images'
  | 'optimize_keywords';

/**
 * Recommendation for fixing an issue.
 */
export interface Recommendation {
  type: RecommendationType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedImpact: string;
  actionable: boolean;
}

/**
 * Performance thresholds.
 */
export const PERFORMANCE_THRESHOLDS = {
  LOW_CTR: 0.02,           // 2%
  HIGH_BOUNCE: 0.80,       // 80%
  LOW_DWELL: 30,           // 30 seconds
  POOR_POSITION: 20,       // Position 20+
  MIN_IMPRESSIONS: 100,    // Need at least 100 impressions to analyze
  DECLINING_THRESHOLD: 0.2, // 20% decline
} as const;
