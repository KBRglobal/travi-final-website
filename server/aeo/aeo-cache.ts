/**
 * AEO Caching Layer
 * Provides caching for answer capsules, dashboard data, and crawler stats
 */

import { cache } from "../cache";

// AEO-specific cache keys
export const aeoCacheKeys = {
  // Answer capsules
  capsule: (contentId: string, locale: string) => `aeo:capsule:${contentId}:${locale}`,
  capsuleStats: () => "aeo:capsule:stats",

  // Dashboard data
  dashboard: (startDate: string, endDate: string) => `aeo:dashboard:${startDate}:${endDate}`,
  dashboardOverview: () => "aeo:dashboard:overview",

  // Crawler stats
  crawlerStats: (days: number) => `aeo:crawler:stats:${days}`,
  crawlerActivity: () => "aeo:crawler:activity",

  // Citation data
  citations: (days: number) => `aeo:citations:${days}`,
  citationInsights: (days: number) => `aeo:citations:insights:${days}`,
  topQueries: (days: number) => `aeo:citations:queries:${days}`,

  // Performance metrics
  platformPerformance: (platform: string, days: number) => `aeo:performance:${platform}:${days}`,
  contentPerformance: (contentId: string) => `aeo:performance:content:${contentId}`,

  // A/B testing
  abTest: (testId: string) => `aeo:abtest:${testId}`,
  abTestResults: (testId: string) => `aeo:abtest:results:${testId}`,

  // Analytics
  roiMetrics: (period: string) => `aeo:analytics:roi:${period}`,
  contentGaps: () => "aeo:analytics:gaps",

  // Patterns for invalidation
  patterns: {
    allCapsules: "aeo:capsule:*",
    allDashboard: "aeo:dashboard:*",
    allCrawler: "aeo:crawler:*",
    allCitations: "aeo:citations:*",
    allPerformance: "aeo:performance:*",
    allAnalytics: "aeo:analytics:*",
    allAEO: "aeo:*",
  },
};

// Cache TTL values (in seconds)
export const AEO_CACHE_TTL = {
  capsule: 3600, // 1 hour - capsules don't change often
  capsuleStats: 300, // 5 minutes
  dashboard: 300, // 5 minutes
  crawlerStats: 600, // 10 minutes
  citations: 300, // 5 minutes
  performance: 600, // 10 minutes
  abTest: 60, // 1 minute - needs to be fresh for testing
  analytics: 900, // 15 minutes
  contentGaps: 3600, // 1 hour
};

/**
 * Get cached answer capsule
 */
export async function getCachedCapsule(contentId: string, locale: string): Promise<any> {
  const key = aeoCacheKeys.capsule(contentId, locale);
  return cache.get(key);
}

/**
 * Set cached answer capsule
 */
export async function setCachedCapsule(
  contentId: string,
  locale: string,
  capsule: any
): Promise<void> {
  const key = aeoCacheKeys.capsule(contentId, locale);
  await cache.set(key, capsule, AEO_CACHE_TTL.capsule);
}

/**
 * Get or compute cached dashboard data
 */
export async function getCachedDashboard<T>(
  startDate: Date,
  endDate: Date,
  compute: () => Promise<T>
): Promise<T> {
  const key = aeoCacheKeys.dashboard(
    startDate.toISOString().split("T")[0],
    endDate.toISOString().split("T")[0]
  );
  return cache.getOrSet(key, compute, AEO_CACHE_TTL.dashboard);
}

/**
 * Get or compute cached crawler stats
 */
export async function getCachedCrawlerStats<T>(
  days: number,
  compute: () => Promise<T>
): Promise<T> {
  const key = aeoCacheKeys.crawlerStats(days);
  return cache.getOrSet(key, compute, AEO_CACHE_TTL.crawlerStats);
}

/**
 * Get or compute cached citation insights
 */
export async function getCachedCitationInsights<T>(
  days: number,
  compute: () => Promise<T>
): Promise<T> {
  const key = aeoCacheKeys.citationInsights(days);
  return cache.getOrSet(key, compute, AEO_CACHE_TTL.citations);
}

/**
 * Get or compute cached ROI metrics
 */
export async function getCachedROIMetrics<T>(
  period: string,
  compute: () => Promise<T>
): Promise<T> {
  const key = aeoCacheKeys.roiMetrics(period);
  return cache.getOrSet(key, compute, AEO_CACHE_TTL.analytics);
}

/**
 * Invalidate capsule cache
 */
export async function invalidateCapsuleCache(contentId?: string, locale?: string): Promise<void> {
  if (contentId && locale) {
    await cache.del(aeoCacheKeys.capsule(contentId, locale));
  } else if (contentId) {
    // Invalidate all locales for this content
    await cache.invalidate(`aeo:capsule:${contentId}:*`);
  } else {
    // Invalidate all capsules
    await cache.invalidate(aeoCacheKeys.patterns.allCapsules);
  }
  // Also invalidate stats
  await cache.del(aeoCacheKeys.capsuleStats());
}

/**
 * Invalidate dashboard cache
 */
export async function invalidateDashboardCache(): Promise<void> {
  await cache.invalidate(aeoCacheKeys.patterns.allDashboard);
}

/**
 * Invalidate citation cache
 */
export async function invalidateCitationCache(): Promise<void> {
  await cache.invalidate(aeoCacheKeys.patterns.allCitations);
}

/**
 * Invalidate all AEO caches
 */
export async function invalidateAllAEOCache(): Promise<void> {
  await cache.invalidate(aeoCacheKeys.patterns.allAEO);
}

/**
 * Get cache statistics for AEO
 */
export async function getAEOCacheStats(): Promise<{
  type: "redis" | "memory";
  connected: boolean;
}> {
  return cache.getStats();
}
