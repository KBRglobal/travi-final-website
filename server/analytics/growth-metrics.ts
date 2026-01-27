/**
 * Growth Loop Metrics Tracking
 *
 * Tracks metrics for self-reinforcing growth loops:
 * - Search Loop: search → content discovery → internal links → rankings → traffic
 * - Chat Loop: chat → exploration → deep dive → retention → return visits
 * - Content Loop: content creation → SEO indexing → traffic → metrics → improvement
 *
 * ARCHITECTURE:
 * - In-memory aggregation with periodic logging
 * - Lightweight, non-blocking event recording
 * - Server-side only, no UI dependencies
 *
 * USAGE:
 * ```typescript
 * import { recordLoopEvent, getLoopMetrics } from './analytics';
 *
 * recordLoopEvent('search', 'content_discovery', 'dubai');
 * recordLoopEvent('chat', 'chat_exploration', 'article-123');
 *
 * const metrics = getLoopMetrics();
 * ```
 */

import { log } from "../lib/logger";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[GrowthMetrics] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[GrowthMetrics] ${msg}`, data),
};

/**
 * Growth loop types
 */
export type LoopType = "search" | "chat" | "content";

/**
 * Search loop stages
 */
export type SearchLoopStage =
  | "search_entry"
  | "content_discovery"
  | "internal_link_click"
  | "session_depth"
  | "search_ranking_signal";

/**
 * Chat loop stages
 */
export type ChatLoopStage =
  | "chat_start"
  | "chat_exploration"
  | "chat_deep_dive"
  | "chat_retention"
  | "chat_return";

/**
 * Content loop stages
 */
export type ContentLoopStage =
  | "content_created"
  | "content_indexed"
  | "content_traffic"
  | "content_performance"
  | "content_improved";

/**
 * Union of all stage types
 */
export type LoopStage = SearchLoopStage | ChatLoopStage | ContentLoopStage;

/**
 * Stage counts for each loop
 */
interface StageCounts {
  [stage: string]: number;
}

/**
 * Metrics for a single loop
 */
interface LoopMetricsData {
  stages: StageCounts;
  conversions: number;
  totalEvents: number;
  lastEventAt: Date | null;
}

/**
 * Aggregated metrics for all loops
 */
interface GrowthMetrics {
  search: {
    stages: StageCounts;
    search_to_content_rate: number;
    internal_link_ctr: number;
    totalEvents: number;
  };
  chat: {
    stages: StageCounts;
    chat_to_exploration_rate: number;
    chat_conversion_rate: number;
    totalEvents: number;
  };
  content: {
    stages: StageCounts;
    content_to_retention_rate: number;
    content_freshness_score: number;
    totalEvents: number;
  };
  aggregatedAt: Date;
  windowStartAt: Date;
}

/**
 * In-memory storage for loop metrics
 */
class GrowthMetricsStore {
  private searchMetrics: LoopMetricsData = {
    stages: {},
    conversions: 0,
    totalEvents: 0,
    lastEventAt: null,
  };

  private chatMetrics: LoopMetricsData = {
    stages: {},
    conversions: 0,
    totalEvents: 0,
    lastEventAt: null,
  };

  private contentMetrics: LoopMetricsData = {
    stages: {},
    conversions: 0,
    totalEvents: 0,
    lastEventAt: null,
  };

  private windowStartAt: Date = new Date();
  private logIntervalMs: number = 5 * 60 * 1000; // 5 minutes
  private logIntervalId: NodeJS.Timeout | null = null;

  // Entry point tracking for funnel analysis
  private entryPoints: Record<
    LoopType,
    { totalEntries: number; byEntryPoint: Record<string, number> }
  > = {
    search: { totalEntries: 0, byEntryPoint: {} },
    chat: { totalEntries: 0, byEntryPoint: {} },
    content: { totalEntries: 0, byEntryPoint: {} },
  };

  constructor() {
    this.startPeriodicLogging();
  }

  /**
   * Record a loop entry for funnel tracking
   */
  recordEntry(loopType: LoopType, entryPoint: string): void {
    if (this.entryPoints[loopType]) {
      this.entryPoints[loopType].totalEntries++;
      this.entryPoints[loopType].byEntryPoint[entryPoint] =
        (this.entryPoints[loopType].byEntryPoint[entryPoint] || 0) + 1;
    }
  }

  /**
   * Get entry data for a specific loop type
   */
  getEntryData(loopType: LoopType): { totalEntries: number; byEntryPoint: Record<string, number> } {
    return this.entryPoints[loopType] || { totalEntries: 0, byEntryPoint: {} };
  }

  /**
   * Start periodic logging of metrics
   */
  private startPeriodicLogging(): void {
    if (this.logIntervalId) {
      clearInterval(this.logIntervalId);
    }

    this.logIntervalId = setInterval(() => {
      this.logMetricsSummary();
    }, this.logIntervalMs);

    // Don't block process exit
    if (this.logIntervalId.unref) {
      this.logIntervalId.unref();
    }
  }

  /**
   * Log a summary of current metrics
   */
  private logMetricsSummary(): void {
    const metrics = this.getMetrics();

    if (
      metrics.search.totalEvents > 0 ||
      metrics.chat.totalEvents > 0 ||
      metrics.content.totalEvents > 0
    ) {
      logger.info("Growth metrics summary", {
        search: {
          events: metrics.search.totalEvents,
          search_to_content_rate: metrics.search.search_to_content_rate,
          internal_link_ctr: metrics.search.internal_link_ctr,
        },
        chat: {
          events: metrics.chat.totalEvents,
          chat_to_exploration_rate: metrics.chat.chat_to_exploration_rate,
          chat_conversion_rate: metrics.chat.chat_conversion_rate,
        },
        content: {
          events: metrics.content.totalEvents,
          content_to_retention_rate: metrics.content.content_to_retention_rate,
        },
        windowDurationMinutes: Math.round((Date.now() - this.windowStartAt.getTime()) / 60000),
      });
    }
  }

  /**
   * Record an event in a growth loop
   */
  recordEvent(loopType: LoopType, stage: LoopStage, entityId?: string): void {
    const now = new Date();
    let metrics: LoopMetricsData;

    switch (loopType) {
      case "search":
        metrics = this.searchMetrics;
        break;
      case "chat":
        metrics = this.chatMetrics;
        break;
      case "content":
        metrics = this.contentMetrics;
        break;
      default:
        logger.warn("Unknown loop type", { loopType });
        return;
    }

    // Increment stage count
    metrics.stages[stage] = (metrics.stages[stage] || 0) + 1;
    metrics.totalEvents++;
    metrics.lastEventAt = now;

    // Track conversions (end-of-funnel stages)
    if (this.isConversionStage(loopType, stage)) {
      metrics.conversions++;
    }

    // Debug logging for individual events (only in development)
    if (process.env.NODE_ENV === "development") {
      logger.info("Loop event recorded", {
        loopType,
        stage,
        entityId: entityId || "unknown",
      });
    }
  }

  /**
   * Check if a stage represents a conversion
   */
  private isConversionStage(loopType: LoopType, stage: LoopStage): boolean {
    switch (loopType) {
      case "search":
        return stage === "session_depth" || stage === "search_ranking_signal";
      case "chat":
        return stage === "chat_retention" || stage === "chat_return";
      case "content":
        return stage === "content_improved";
      default:
        return false;
    }
  }

  /**
   * Calculate rate between two stages (funnel conversion)
   */
  private calculateRate(numerator: number, denominator: number): number {
    if (denominator === 0) return 0;
    return Math.round((numerator / denominator) * 100) / 100;
  }

  /**
   * Get aggregated metrics for all loops
   */
  getMetrics(): GrowthMetrics {
    const searchEntry = this.searchMetrics.stages["search_entry"] || 0;
    const contentDiscovery = this.searchMetrics.stages["content_discovery"] || 0;
    const internalLinkClick = this.searchMetrics.stages["internal_link_click"] || 0;

    const chatStart = this.chatMetrics.stages["chat_start"] || 0;
    const chatExploration = this.chatMetrics.stages["chat_exploration"] || 0;
    const chatDeepDive = this.chatMetrics.stages["chat_deep_dive"] || 0;

    const contentTraffic = this.contentMetrics.stages["content_traffic"] || 0;
    const contentPerformance = this.contentMetrics.stages["content_performance"] || 0;
    const contentCreated = this.contentMetrics.stages["content_created"] || 0;
    const contentImproved = this.contentMetrics.stages["content_improved"] || 0;

    return {
      search: {
        stages: { ...this.searchMetrics.stages },
        search_to_content_rate: this.calculateRate(contentDiscovery, searchEntry),
        internal_link_ctr: this.calculateRate(internalLinkClick, contentDiscovery),
        totalEvents: this.searchMetrics.totalEvents,
      },
      chat: {
        stages: { ...this.chatMetrics.stages },
        chat_to_exploration_rate: this.calculateRate(chatExploration, chatStart),
        chat_conversion_rate: this.calculateRate(chatDeepDive, chatExploration),
        totalEvents: this.chatMetrics.totalEvents,
      },
      content: {
        stages: { ...this.contentMetrics.stages },
        content_to_retention_rate: this.calculateRate(contentPerformance, contentTraffic),
        content_freshness_score: this.calculateFreshnessScore(contentCreated, contentImproved),
        totalEvents: this.contentMetrics.totalEvents,
      },
      aggregatedAt: new Date(),
      windowStartAt: this.windowStartAt,
    };
  }

  /**
   * Calculate content freshness score
   * Higher score = more content being created and improved
   */
  private calculateFreshnessScore(created: number, improved: number): number {
    const total = created + improved;
    if (total === 0) return 0;

    // Score is weighted: improvements count more than new content
    // (indicates active content optimization)
    const score = (created * 1.0 + improved * 1.5) / 10;
    return Math.min(Math.round(score * 100) / 100, 10); // Cap at 10
  }

  /**
   * Reset metrics (typically at window boundaries)
   */
  reset(): void {
    this.searchMetrics = {
      stages: {},
      conversions: 0,
      totalEvents: 0,
      lastEventAt: null,
    };
    this.chatMetrics = {
      stages: {},
      conversions: 0,
      totalEvents: 0,
      lastEventAt: null,
    };
    this.contentMetrics = {
      stages: {},
      conversions: 0,
      totalEvents: 0,
      lastEventAt: null,
    };
    this.entryPoints = {
      search: { totalEntries: 0, byEntryPoint: {} },
      chat: { totalEntries: 0, byEntryPoint: {} },
      content: { totalEntries: 0, byEntryPoint: {} },
    };
    this.windowStartAt = new Date();

    logger.info("Metrics reset", { windowStartAt: this.windowStartAt });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.logIntervalId) {
      clearInterval(this.logIntervalId);
      this.logIntervalId = null;
    }
  }
}

// Singleton instance
const metricsStore = new GrowthMetricsStore();

/**
 * Record a growth loop event
 *
 * @param loopType - The type of growth loop (search, chat, content)
 * @param stage - The stage within the loop
 * @param entityId - Optional entity identifier (destination slug, article ID, etc.)
 *
 * @example
 * recordLoopEvent('search', 'content_discovery', 'dubai');
 * recordLoopEvent('chat', 'chat_exploration', 'paris-guide');
 * recordLoopEvent('content', 'content_created', 'article-456');
 */
export function recordLoopEvent(loopType: LoopType, stage: LoopStage, entityId?: string): void {
  try {
    metricsStore.recordEvent(loopType, stage, entityId);
  } catch (error) {
    // Non-blocking - don't throw on analytics failures
    logger.warn("Failed to record loop event", {
      loopType,
      stage,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Get current growth loop metrics
 *
 * @returns Aggregated metrics for all growth loops
 *
 * @example
 * const metrics = getLoopMetrics();
 *
 *
 */
export function getLoopMetrics(): GrowthMetrics {
  return metricsStore.getMetrics();
}

/**
 * Reset growth metrics (for testing or window boundaries)
 */
export function resetLoopMetrics(): void {
  metricsStore.reset();
}

/**
 * Record a loop entry (convenience wrapper for recordLoopEvent)
 * Entry points are the first stage in each loop funnel
 *
 * @param loopType - The type of growth loop (search, chat, content)
 * @param entryPoint - The entry point identifier (e.g., 'organic', 'direct', 'referral')
 *
 * @example
 * recordLoopEntry('search', 'organic_search');
 * recordLoopEntry('chat', 'homepage_widget');
 */
export function recordLoopEntry(loopType: LoopType, entryPoint: string): void {
  // Map entry points to first stage of each loop
  const entryStage: LoopStage =
    loopType === "search" ? "search_entry" : loopType === "chat" ? "chat_start" : "content_created";

  recordLoopEvent(loopType, entryStage, entryPoint);

  // Track entry count in separate metric for funnel analysis
  metricsStore.recordEntry(loopType, entryPoint);
}

/**
 * Record a loop step (convenience wrapper for recordLoopEvent)
 * Steps are intermediate stages in the funnel
 *
 * @param loopType - The type of growth loop (search, chat, content)
 * @param step - The step/stage identifier
 *
 * @example
 * recordLoopStep('search', 'content_discovery');
 * recordLoopStep('chat', 'chat_exploration');
 */
export function recordLoopStep(loopType: LoopType, step: LoopStage): void {
  recordLoopEvent(loopType, step);
}

/**
 * Get metrics for a specific loop type
 *
 * @param loopType - The type of growth loop to get metrics for
 * @returns Metrics for the specified loop including entry count, completion rate, and revenue attribution
 *
 * @example
 * const searchMetrics = getLoopMetricsByType('search');
 *
 *
 */
export function getLoopMetricsByType(loopType: LoopType): {
  entryCount: number;
  completionRate: number;
  revenueAttribution: number; // Placeholder - always 0 until monetization integration
  stages: StageCounts;
  totalEvents: number;
  entryPoints: Record<string, number>;
} {
  const allMetrics = metricsStore.getMetrics();
  const entryData = metricsStore.getEntryData(loopType);

  let loopData: { stages: StageCounts; totalEvents: number };
  let completionRate: number;

  switch (loopType) {
    case "search":
      loopData = { stages: allMetrics.search.stages, totalEvents: allMetrics.search.totalEvents };
      completionRate = allMetrics.search.internal_link_ctr; // Completion = internal link click
      break;
    case "chat":
      loopData = { stages: allMetrics.chat.stages, totalEvents: allMetrics.chat.totalEvents };
      completionRate = allMetrics.chat.chat_conversion_rate; // Completion = suggestion clicked
      break;
    case "content":
      loopData = { stages: allMetrics.content.stages, totalEvents: allMetrics.content.totalEvents };
      completionRate = allMetrics.content.content_to_retention_rate; // Completion = performance tracked
      break;
    default:
      loopData = { stages: {}, totalEvents: 0 };
      completionRate = 0;
  }

  return {
    entryCount: entryData.totalEntries,
    completionRate,
    revenueAttribution: 0, // Placeholder for future monetization integration
    stages: loopData.stages,
    totalEvents: loopData.totalEvents,
    entryPoints: entryData.byEntryPoint,
  };
}

// Export types for consumers
export type { GrowthMetrics, LoopMetricsData, StageCounts };
