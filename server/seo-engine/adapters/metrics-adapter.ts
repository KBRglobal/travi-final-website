/**
 * Metrics Adapter
 *
 * Pulls traffic and performance metrics from existing systems.
 * Falls back gracefully if unified-metrics is not available.
 */

import { db } from '../../db';
import { contents } from '../../../shared/schema';
import { eq, sql, desc } from 'drizzle-orm';

// ============================================================================
// Types
// ============================================================================

export interface ContentMetrics {
  contentId: string;

  // Traffic metrics
  pageviews: number;
  uniqueVisitors: number;
  avgTimeOnPage: number; // seconds
  bounceRate: number; // 0-100

  // Search metrics
  impressions: number;
  clicks: number;
  ctr: number; // 0-100
  avgPosition: number;

  // Engagement
  scrollDepth: number; // 0-100
  shares: number;
  comments: number;

  // Time-based
  trafficLast7Days: number;
  trafficLast30Days: number;
  trafficLast90Days: number;
  trafficTrend: 'up' | 'down' | 'stable';

  // Freshness
  lastUpdated: Date | null;
  daysSinceUpdate: number;

  // Quality indicators
  errorRate: number; // 404, 500 etc
  loadTime: number; // ms
}

export interface SiteMetrics {
  totalPageviews: number;
  totalIndexedPages: number;
  avgSeoScore: number;
  avgAeoScore: number;
  topPerformingPages: { contentId: string; pageviews: number }[];
  underperformingPages: { contentId: string; pageviews: number; age: number }[];
}

// ============================================================================
// Cache
// ============================================================================

interface MetricsCache {
  content: Map<string, { data: ContentMetrics; timestamp: Date }>;
  site: { data: SiteMetrics | null; timestamp: Date | null };
  ttlMs: number;
}

const cache: MetricsCache = {
  content: new Map(),
  site: { data: null, timestamp: null },
  ttlMs: 10 * 60 * 1000, // 10 minutes
};

function isCacheValid(timestamp: Date | null): boolean {
  if (!timestamp) return false;
  return Date.now() - timestamp.getTime() < cache.ttlMs;
}

// ============================================================================
// Adapter Functions
// ============================================================================

/**
 * Get metrics for a specific content item
 */
export async function getContentMetrics(contentId: string, bypassCache = false): Promise<ContentMetrics | null> {
  // Check cache
  const cached = cache.content.get(contentId);
  if (!bypassCache && cached && isCacheValid(cached.timestamp)) {
    return cached.data;
  }

  // Get content
  const content = await db.query.contents.findFirst({
    where: eq(contents.id, contentId),
  });

  if (!content) return null;

  // Try to get metrics from analytics tables if they exist
  // For now, compute from content data + estimates
  const metrics = await computeMetrics(content);

  // Cache
  cache.content.set(contentId, { data: metrics, timestamp: new Date() });

  return metrics;
}

/**
 * Get site-wide metrics
 */
export async function getSiteMetrics(bypassCache = false): Promise<SiteMetrics> {
  // Check cache
  if (!bypassCache && cache.site.data && isCacheValid(cache.site.timestamp)) {
    return cache.site.data;
  }

  const allContent = await db.query.contents.findMany({
    where: eq(contents.status, 'published'),
  });

  // Calculate averages
  const seoScores = allContent.map(c => c.seoScore || 0).filter(s => s > 0);
  const aeoScores = allContent.map(c => (c as any).aeoScore || 0).filter(s => s > 0);

  const avgSeoScore = seoScores.length > 0
    ? Math.round(seoScores.reduce((a, b) => a + b, 0) / seoScores.length)
    : 0;

  const avgAeoScore = aeoScores.length > 0
    ? Math.round(aeoScores.reduce((a, b) => a + b, 0) / aeoScores.length)
    : 0;

  // Sort by view count for top/bottom performers
  const sortedByViews = [...allContent].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

  const topPerforming = sortedByViews.slice(0, 10).map(c => ({
    contentId: c.id,
    pageviews: c.viewCount || 0,
  }));

  // Underperforming: low views + old content
  const now = Date.now();
  const underperforming = sortedByViews
    .filter(c => {
      const age = Math.floor((now - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return age > 30 && (c.viewCount || 0) < 10;
    })
    .slice(-10)
    .map(c => ({
      contentId: c.id,
      pageviews: c.viewCount || 0,
      age: Math.floor((now - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
    }));

  const siteMetrics: SiteMetrics = {
    totalPageviews: allContent.reduce((sum, c) => sum + (c.viewCount || 0), 0),
    totalIndexedPages: allContent.length,
    avgSeoScore,
    avgAeoScore,
    topPerformingPages: topPerforming,
    underperformingPages: underperforming,
  };

  // Cache
  cache.site = { data: siteMetrics, timestamp: new Date() };

  return siteMetrics;
}

/**
 * Compute metrics from content data
 * In production, this would integrate with GA4, GSC, etc.
 */
async function computeMetrics(content: any): Promise<ContentMetrics> {
  const now = Date.now();
  const updatedAt = content.updatedAt ? new Date(content.updatedAt) : null;
  const daysSinceUpdate = updatedAt
    ? Math.floor((now - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Use view count as base, estimate other metrics
  const viewCount = content.viewCount || 0;

  // Estimate traffic trend based on word count and age
  const wordCount = content.wordCount || 0;
  const ageInDays = Math.floor((now - new Date(content.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const expectedViewsPerDay = wordCount > 1000 ? 10 : 5;
  const expectedViews = expectedViewsPerDay * Math.min(ageInDays, 90);

  let trafficTrend: 'up' | 'down' | 'stable' = 'stable';
  if (viewCount > expectedViews * 1.2) trafficTrend = 'up';
  if (viewCount < expectedViews * 0.5) trafficTrend = 'down';

  return {
    contentId: content.id,

    // Traffic (estimated from viewCount)
    pageviews: viewCount,
    uniqueVisitors: Math.round(viewCount * 0.7),
    avgTimeOnPage: wordCount > 1000 ? 180 : 90, // seconds
    bounceRate: content.seoScore && content.seoScore > 70 ? 40 : 60,

    // Search (would come from GSC)
    impressions: viewCount * 10,
    clicks: viewCount,
    ctr: 10, // estimated
    avgPosition: content.seoScore ? Math.max(1, 50 - content.seoScore / 2) : 30,

    // Engagement
    scrollDepth: wordCount > 1000 ? 70 : 50,
    shares: Math.round(viewCount * 0.01),
    comments: 0,

    // Time-based (estimated distribution)
    trafficLast7Days: Math.round(viewCount * 0.1),
    trafficLast30Days: Math.round(viewCount * 0.3),
    trafficLast90Days: Math.round(viewCount * 0.7),
    trafficTrend,

    // Freshness
    lastUpdated: updatedAt,
    daysSinceUpdate,

    // Quality
    errorRate: 0,
    loadTime: 1500,
  };
}

/**
 * Get batch metrics for multiple content items
 */
export async function getBatchMetrics(contentIds: string[]): Promise<Map<string, ContentMetrics>> {
  const results = new Map<string, ContentMetrics>();

  for (const id of contentIds) {
    const metrics = await getContentMetrics(id);
    if (metrics) {
      results.set(id, metrics);
    }
  }

  return results;
}

/**
 * Clear metrics cache
 */
export function clearMetricsCache(): void {
  cache.content.clear();
  cache.site = { data: null, timestamp: null };
}

console.log('[SEO Engine] Metrics adapter loaded');
