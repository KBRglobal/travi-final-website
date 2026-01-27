/**
 * Revenue Intelligence Layer Module
 * Ties content, entities, and journeys to revenue
 *
 * Enable with: ENABLE_REVENUE_INTEL=true
 */

export * from "./types";
export {
  getAttributionModel,
  assignTouchpointTypes,
  calculateAttribution,
  recordRevenueEvent,
  getRevenueEvents,
  getEventById,
  getAttributionForContent,
  getTotalRevenue,
  getConversionPaths,
} from "./attribution";
export {
  calculateContentValue,
  getTopEarners,
  getZeroConverters,
  getContentRoiReport,
  getContentValueTrend,
  invalidateContentValueCache,
} from "./content-value";
export {
  registerEntityContent,
  getContentForEntity,
  calculateEntityValue,
  getTopEntities,
  getUnderperformingEntities,
  getEntityPerformanceComparison,
  invalidateEntityValueCache,
  getEntityStats,
} from "./entity-value";
export {
  generateReport,
  getRevenueMetrics,
  getExecutiveSummary,
  invalidateReportCache,
  getReportCacheStats,
} from "./reports";

function isEnabled(): boolean {
  return process.env.ENABLE_REVENUE_INTEL === "true";
}

/**
 * Initialize revenue intelligence module
 */
export function initRevenueIntel(): void {
  const enabled = isEnabled();
}

/**
 * Shutdown revenue intelligence module
 */
export function shutdownRevenueIntel(): void {}

/**
 * Get revenue intel status
 */
export function getRevenueIntelStatus(): {
  enabled: boolean;
  cacheStats: { contentCache: number; entityCache: number; reportCache: number };
} {
  return {
    enabled: isEnabled(),
    cacheStats: {
      contentCache: 0, // Would need to expose cache size from content-value
      entityCache: 0, // Would need to expose cache size from entity-value
      reportCache: 0, // Would need to expose cache size from reports
    },
  };
}
