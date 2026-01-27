/**
 * SEO Engine Adapters
 *
 * Unified export for all data adapters.
 * These adapters normalize data from various sources for use by SEO Engine.
 */

// Content Adapter
export {
  getContent,
  getAllPublishedContent,
  getContentByType,
  getContentBySlug,
  normalizeContent,
  clearContentCache,
  getCacheStats as getContentCacheStats,
  type NormalizedContent,
} from "./content-adapter";

// Metrics Adapter
export {
  getContentMetrics,
  getSiteMetrics,
  getBatchMetrics,
  clearMetricsCache,
  type ContentMetrics,
  type SiteMetrics,
} from "./metrics-adapter";

// Indexing Adapter
export {
  getIndexingState,
  getIndexingSummary,
  setNoindex,
  removeNoindex,
  queueForReindex,
  getPendingReindex,
  rollbackIndexingAction,
  type IndexingState,
  type IndexingSummary,
} from "./indexing-adapter";

// Link Adapter
export {
  extractLinksFromContent,
  getSiteLinksOverview,
  validateInternalLink,
  type ExtractedLink,
  type LinkSummary,
  type SiteLinksOverview,
} from "./link-adapter";

/**
 * Clear all adapter caches
 */
export async function clearAllCaches(): Promise<void> {
  const { clearContentCache } = await import("./content-adapter");
  const { clearMetricsCache } = await import("./metrics-adapter");

  clearContentCache();
  clearMetricsCache();
}

/**
 * Get comprehensive content report using all adapters
 */
export async function getComprehensiveReport(contentId: string): Promise<{
  content: import("./content-adapter").NormalizedContent | null;
  metrics: import("./metrics-adapter").ContentMetrics | null;
  indexing: import("./indexing-adapter").IndexingState | null;
  links: import("./link-adapter").LinkSummary;
}> {
  const [content, metrics, indexing, links] = await Promise.all([
    import("./content-adapter").then(m => m.getContent(contentId)),
    import("./metrics-adapter").then(m => m.getContentMetrics(contentId)),
    import("./indexing-adapter").then(m => m.getIndexingState(contentId)),
    import("./link-adapter").then(m => m.extractLinksFromContent(contentId)),
  ]);

  return { content, metrics, indexing, links };
}
