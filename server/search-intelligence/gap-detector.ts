/**
 * Search Intelligence - Gap Detector
 *
 * Identifies content gaps based on search query patterns.
 */

import { getZeroResultQueries, getLowClickQueries, QueryStats } from './query-collector';
import { normalizeQuery, clusterQueries, NormalizedQuery } from './normalizer';

export interface ContentGap {
  id: string;
  type: 'zero_results' | 'low_engagement' | 'missing_entity' | 'underserved_topic';
  queries: string[];
  normalizedQuery: string;
  intent: NormalizedQuery['intent'];
  totalSearches: number;
  avgResultsCount: number;
  avgClickRate: number;
  priority: 'high' | 'medium' | 'low';
  detectedAt: Date;
}

export interface GapAnalysis {
  gaps: ContentGap[];
  totalZeroResultQueries: number;
  totalLowEngagementQueries: number;
  topMissingTopics: string[];
  analyzedAt: Date;
}

/**
 * Detect content gaps from search query data.
 */
export async function detectGaps(
  sinceDays: number = 7,
  minSearches: number = 3
): Promise<GapAnalysis> {
  // Get problematic queries
  const [zeroResultQueries, lowClickQueries] = await Promise.all([
    getZeroResultQueries(100, sinceDays),
    getLowClickQueries(100, sinceDays, minSearches),
  ]);

  const gaps: ContentGap[] = [];
  let gapIdCounter = 0;

  // Process zero-result queries
  const zeroResultGaps = processQueryGroup(
    zeroResultQueries,
    'zero_results',
    () => `gap-zr-${++gapIdCounter}`
  );
  gaps.push(...zeroResultGaps);

  // Process low-engagement queries
  const lowEngagementGaps = processQueryGroup(
    lowClickQueries.filter(q => (q as any).avgResultsCount > 0), // Has results but low clicks
    'low_engagement',
    () => `gap-le-${++gapIdCounter}`
  );
  gaps.push(...lowEngagementGaps);

  // Extract top missing topics from gaps
  const topMissingTopics = extractTopTopics(gaps, 10);

  return {
    gaps: sortGapsByPriority(gaps),
    totalZeroResultQueries: zeroResultQueries.reduce((sum, q) => sum + (q as any).searchCount, 0),
    totalLowEngagementQueries: lowClickQueries.reduce((sum, q) => sum + (q as any).searchCount, 0),
    topMissingTopics,
    analyzedAt: new Date(),
  };
}

/**
 * Process a group of queries into content gaps.
 */
function processQueryGroup(
  queries: QueryStats[],
  gapType: ContentGap['type'],
  generateId: () => string
): ContentGap[] {
  if (queries.length === 0) return [];

  // Cluster similar queries
  const queryStrings = queries.map(q => q.query);
  const clusters = clusterQueries(queryStrings, 0.4);

  const gaps: ContentGap[] = [];

  for (const [normalizedQuery, clusterQueries] of clusters) {
    // Get stats for this cluster
    const clusterStats = queries.filter(q => clusterQueries.includes(q.query));
    const totalSearches = clusterStats.reduce((sum, q) => sum + (q as any).searchCount, 0);
    const avgResultsCount =
      clusterStats.reduce((sum, q) => sum + (q as any).avgResultsCount * (q as any).searchCount, 0) / totalSearches;
    const avgClickRate =
      clusterStats.reduce((sum, q) => sum + q.clickRate * (q as any).searchCount, 0) / totalSearches;

    // Skip low-volume clusters
    if (totalSearches < 2) continue;

    // Determine priority
    const priority = calculatePriority(totalSearches, avgClickRate, gapType);

    // Get normalized query info
    const normalizedInfo = normalizeQuery(clusterQueries[0]);

    gaps.push({
      id: generateId(),
      type: gapType,
      queries: clusterQueries,
      normalizedQuery,
      intent: normalizedInfo.intent,
      totalSearches,
      avgResultsCount,
      avgClickRate,
      priority,
      detectedAt: new Date(),
    });
  }

  return gaps;
}

/**
 * Calculate gap priority based on volume and engagement.
 */
function calculatePriority(
  totalSearches: number,
  clickRate: number,
  gapType: ContentGap['type']
): ContentGap['priority'] {
  // Zero results with high volume = high priority
  if (gapType === 'zero_results') {
    if (totalSearches >= 20) return 'high';
    if (totalSearches >= 5) return 'medium';
    return 'low';
  }

  // Low engagement with high volume and very low click rate = high priority
  if (gapType === 'low_engagement') {
    if (totalSearches >= 20 && clickRate < 0.05) return 'high';
    if (totalSearches >= 10 && clickRate < 0.1) return 'medium';
    return 'low';
  }

  return 'medium';
}

/**
 * Extract top topics from gaps.
 */
function extractTopTopics(gaps: ContentGap[], limit: number): string[] {
  const topicCounts = new Map<string, number>();

  for (const gap of gaps) {
    const normalized = normalizeQuery(gap.queries[0]);
    for (const token of normalized.tokens) {
      const count = topicCounts.get(token) || 0;
      topicCounts.set(token, count + gap.totalSearches);
    }
  }

  // Sort by count and take top N
  return Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([topic]) => topic);
}

/**
 * Sort gaps by priority (high first).
 */
function sortGapsByPriority(gaps: ContentGap[]): ContentGap[] {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return gaps.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.totalSearches - a.totalSearches;
  });
}

/**
 * Get gaps filtered by type.
 */
export async function getGapsByType(
  type: ContentGap['type'],
  sinceDays: number = 7
): Promise<ContentGap[]> {
  const analysis = await detectGaps(sinceDays);
  return analysis.gaps.filter(g => g.type === type);
}

/**
 * Get high-priority gaps only.
 */
export async function getHighPriorityGaps(sinceDays: number = 7): Promise<ContentGap[]> {
  const analysis = await detectGaps(sinceDays);
  return analysis.gaps.filter(g => g.priority === 'high');
}
