/**
 * Content Performance - Issue Evaluator
 *
 * Detects underperforming content.
 */

import {
  PerformanceMetrics,
  PerformanceIssue,
  PerformanceIssueType,
  IssueSeverity,
  PERFORMANCE_THRESHOLDS,
} from './types';
import { getContentMetrics, getAllContentMetrics } from './metrics';

/**
 * Evaluate content for performance issues.
 */
export async function evaluateContent(contentId: string): Promise<PerformanceIssue[]> {
  const metrics = await getContentMetrics(contentId);

  if (!metrics) {
    return [];
  }

  return detectIssues(metrics);
}

/**
 * Detect issues from metrics.
 */
function detectIssues(metrics: PerformanceMetrics): PerformanceIssue[] {
  const issues: PerformanceIssue[] = [];
  let issueCounter = 0;

  // Low CTR
  if (
    metrics.impressions >= PERFORMANCE_THRESHOLDS.MIN_IMPRESSIONS &&
    metrics.ctr < PERFORMANCE_THRESHOLDS.LOW_CTR
  ) {
    issues.push(createIssue(
      `issue-${metrics.contentId}-${++issueCounter}`,
      metrics.contentId,
      'low_ctr',
      calculateSeverity('low_ctr', metrics),
      'Low Click-Through Rate',
      `CTR is ${(metrics.ctr * 100).toFixed(2)}% (threshold: ${PERFORMANCE_THRESHOLDS.LOW_CTR * 100}%)`,
      { impressions: metrics.impressions, clicks: metrics.clicks, ctr: metrics.ctr }
    ));
  }

  // High Bounce Rate
  if (metrics.bounceRate >= PERFORMANCE_THRESHOLDS.HIGH_BOUNCE) {
    issues.push(createIssue(
      `issue-${metrics.contentId}-${++issueCounter}`,
      metrics.contentId,
      'high_bounce',
      calculateSeverity('high_bounce', metrics),
      'High Bounce Rate',
      `Bounce rate is ${(metrics.bounceRate * 100).toFixed(1)}% (threshold: ${PERFORMANCE_THRESHOLDS.HIGH_BOUNCE * 100}%)`,
      { bounceRate: metrics.bounceRate }
    ));
  }

  // Low Dwell Time
  if (metrics.avgDwellTime < PERFORMANCE_THRESHOLDS.LOW_DWELL) {
    issues.push(createIssue(
      `issue-${metrics.contentId}-${++issueCounter}`,
      metrics.contentId,
      'low_dwell',
      calculateSeverity('low_dwell', metrics),
      'Low Dwell Time',
      `Average dwell time is ${metrics.avgDwellTime}s (threshold: ${PERFORMANCE_THRESHOLDS.LOW_DWELL}s)`,
      { avgDwellTime: metrics.avgDwellTime }
    ));
  }

  // No Clicks (but has impressions)
  if (
    metrics.impressions >= PERFORMANCE_THRESHOLDS.MIN_IMPRESSIONS &&
    metrics.clicks === 0
  ) {
    issues.push(createIssue(
      `issue-${metrics.contentId}-${++issueCounter}`,
      metrics.contentId,
      'no_clicks',
      'critical',
      'Impressions Without Clicks',
      `${metrics.impressions} impressions but 0 clicks`,
      { impressions: metrics.impressions, clicks: 0 }
    ));
  }

  // Poor Position
  if (metrics.avgPosition >= PERFORMANCE_THRESHOLDS.POOR_POSITION) {
    issues.push(createIssue(
      `issue-${metrics.contentId}-${++issueCounter}`,
      metrics.contentId,
      'poor_position',
      calculateSeverity('poor_position', metrics),
      'Poor Search Position',
      `Average position is ${metrics.avgPosition.toFixed(1)} (threshold: ${PERFORMANCE_THRESHOLDS.POOR_POSITION})`,
      { avgPosition: metrics.avgPosition }
    ));
  }

  return issues;
}

/**
 * Create an issue object.
 */
function createIssue(
  id: string,
  contentId: string,
  type: PerformanceIssueType,
  severity: IssueSeverity,
  title: string,
  description: string,
  metrics: Partial<PerformanceMetrics>
): PerformanceIssue {
  return {
    id,
    contentId,
    type,
    severity,
    title,
    description,
    metrics,
    recommendations: [], // Will be filled by recommender
    detectedAt: new Date(),
  };
}

/**
 * Calculate issue severity.
 */
function calculateSeverity(
  type: PerformanceIssueType,
  metrics: PerformanceMetrics
): IssueSeverity {
  switch (type) {
    case 'low_ctr':
      if (metrics.ctr < 0.005) return 'critical';
      if (metrics.ctr < 0.01) return 'high';
      if (metrics.ctr < 0.015) return 'medium';
      return 'low';

    case 'high_bounce':
      if (metrics.bounceRate >= 0.95) return 'critical';
      if (metrics.bounceRate >= 0.90) return 'high';
      if (metrics.bounceRate >= 0.85) return 'medium';
      return 'low';

    case 'low_dwell':
      if (metrics.avgDwellTime < 10) return 'critical';
      if (metrics.avgDwellTime < 20) return 'high';
      if (metrics.avgDwellTime < 25) return 'medium';
      return 'low';

    case 'no_clicks':
      if (metrics.impressions >= 500) return 'critical';
      if (metrics.impressions >= 200) return 'high';
      return 'medium';

    case 'poor_position':
      if (metrics.avgPosition >= 50) return 'high';
      if (metrics.avgPosition >= 30) return 'medium';
      return 'low';

    case 'declining_traffic':
      return 'medium';

    default:
      return 'low';
  }
}

/**
 * Get all content with issues.
 */
export async function getContentWithIssues(
  limit: number = 100
): Promise<Map<string, PerformanceIssue[]>> {
  const allMetrics = await getAllContentMetrics(30, limit);
  const issueMap = new Map<string, PerformanceIssue[]>();

  for (const metrics of allMetrics) {
    const issues = detectIssues(metrics);
    if (issues.length > 0) {
      issueMap.set(metrics.contentId, issues);
    }
  }

  return issueMap;
}

/**
 * Get issues summary.
 */
export async function getIssuesSummary(): Promise<{
  totalIssues: number;
  bySeverity: Record<IssueSeverity, number>;
  byType: Record<PerformanceIssueType, number>;
  contentAffected: number;
}> {
  const issueMap = await getContentWithIssues(500);

  const bySeverity: Record<IssueSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const byType: Record<PerformanceIssueType, number> = {
    low_ctr: 0,
    high_bounce: 0,
    low_dwell: 0,
    no_clicks: 0,
    poor_position: 0,
    declining_traffic: 0,
  };

  let totalIssues = 0;

  for (const issues of issueMap.values()) {
    for (const issue of issues) {
      totalIssues++;
      bySeverity[issue.severity]++;
      byType[issue.type]++;
    }
  }

  return {
    totalIssues,
    bySeverity,
    byType,
    contentAffected: issueMap.size,
  };
}
