/**
 * Search Telemetry
 *
 * Lightweight in-memory tracking for search analytics:
 * - Tracks query text, result count, fallback triggered, timestamp
 * - 24-hour rolling window with automatic cleanup
 * - Provides metrics: top queries, zero-result rate, etc.
 */

interface SearchEvent {
  query: string;
  resultCount: number;
  fallback: boolean;
  timestamp: number;
  responseTimeMs?: number;
}

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_EVENTS = 10000; // Cap memory usage
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Cleanup every hour

/** Determine health status from zero-result rate */
function determineHealth(zeroResultRate: number): {
  status: "healthy" | "warning" | "critical";
  message: string;
} {
  const pct = (zeroResultRate * 100).toFixed(1);
  if (zeroResultRate > 0.3) {
    return {
      status: "critical",
      message: `Critical: ${pct}% of searches return zero results. Review search index and fallback chain.`,
    };
  }
  if (zeroResultRate > 0.2) {
    return {
      status: "warning",
      message: `Warning: ${pct}% of searches return zero results (threshold: 20%). Consider expanding dictionary.`,
    };
  }
  return { status: "healthy", message: `Search quality is healthy. Zero result rate: ${pct}%` };
}

/** Aggregate search events into summary counts */
function aggregateEvents(events: SearchEvent[]) {
  const queryFrequency = new Map<string, number>();
  const zeroResultQueries = new Set<string>();
  let zeroResultCount = 0;
  let fallbackCount = 0;
  let totalResultCount = 0;
  let totalResponseTime = 0;
  let responseTimeCount = 0;

  for (const event of events) {
    const normalizedQuery = event.query.toLowerCase().trim();
    if (normalizedQuery) {
      queryFrequency.set(normalizedQuery, (queryFrequency.get(normalizedQuery) || 0) + 1);
    }
    if (event.resultCount === 0) {
      zeroResultCount++;
      if (normalizedQuery) zeroResultQueries.add(normalizedQuery);
    }
    if (event.fallback) fallbackCount++;
    totalResultCount += event.resultCount;
    if (event.responseTimeMs !== undefined) {
      totalResponseTime += event.responseTimeMs;
      responseTimeCount++;
    }
  }

  return {
    queryFrequency,
    zeroResultQueries,
    zeroResultCount,
    fallbackCount,
    totalResultCount,
    totalResponseTime,
    responseTimeCount,
  };
}

class SearchTelemetry {
  private events: SearchEvent[] = [];
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  private cleanup(): void {
    const cutoff = Date.now() - WINDOW_MS;
    this.events = this.events.filter(e => e.timestamp > cutoff);

    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }
  }

  track(event: Omit<SearchEvent, "timestamp">): void {
    this.events.push({
      ...event,
      timestamp: Date.now(),
    });

    if (this.events.length > MAX_EVENTS * 1.1) {
      this.cleanup();
    }

    // Check zero result rate periodically (every 100 events)
    if (this.events.length % 100 === 0) {
      this.checkZeroResultRate();
    }
  }

  /**
   * Check zero result rate and log warning if exceeds threshold
   * Threshold: 20% - indicates search quality issues
   */
  private checkZeroResultRate(): void {
    const cutoff = Date.now() - WINDOW_MS;
    const recentEvents = this.events.filter(e => e.timestamp > cutoff);

    if (recentEvents.length < 50) return; // Need minimum sample size

    const zeroResultCount = recentEvents.filter(e => e.resultCount === 0).length;
    const zeroResultRate = zeroResultCount / recentEvents.length;

    if (zeroResultRate > 0.2) {
      console.error(
        `[SearchTelemetry] High zero result rate: ${(zeroResultRate * 100).toFixed(1)}%`
      );
    }
  }

  getMetrics(): SearchMetrics {
    const cutoff = Date.now() - WINDOW_MS;
    const recentEvents = this.events.filter(e => e.timestamp > cutoff);
    const periodStart = new Date(cutoff).toISOString();
    const periodEnd = new Date().toISOString();

    if (recentEvents.length === 0) {
      return {
        totalSearches: 0,
        uniqueQueries: 0,
        zeroResultCount: 0,
        zeroResultRate: 0,
        fallbackRate: 0,
        averageResultCount: 0,
        averageResponseTimeMs: 0,
        topQueries: [],
        zeroResultQueries: [],
        periodStart,
        periodEnd,
        healthStatus: "healthy",
        healthMessage: "No search data in the last 24 hours",
      };
    }

    const agg = aggregateEvents(recentEvents);
    const total = recentEvents.length;
    const zeroResultRate = agg.zeroResultCount / total;
    const health = determineHealth(zeroResultRate);

    const topQueries = Array.from(agg.queryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([query, count]) => ({ query, count }));

    return {
      totalSearches: total,
      uniqueQueries: agg.queryFrequency.size,
      zeroResultCount: agg.zeroResultCount,
      zeroResultRate,
      fallbackRate: agg.fallbackCount / total,
      averageResultCount: agg.totalResultCount / total,
      averageResponseTimeMs:
        agg.responseTimeCount > 0 ? agg.totalResponseTime / agg.responseTimeCount : 0,
      topQueries,
      zeroResultQueries: Array.from(agg.zeroResultQueries).slice(0, 50),
      periodStart,
      periodEnd,
      healthStatus: health.status,
      healthMessage: health.message,
    };
  }

  getRecentEvents(limit: number = 100): SearchEvent[] {
    return this.events.slice(-limit).reverse();
  }

  clear(): void {
    this.events = [];
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.events = [];
  }
}

export interface SearchMetrics {
  totalSearches: number;
  uniqueQueries: number;
  zeroResultCount: number;
  zeroResultRate: number;
  fallbackRate: number;
  averageResultCount: number;
  averageResponseTimeMs: number;
  topQueries: { query: string; count: number }[];
  zeroResultQueries: string[];
  periodStart: string;
  periodEnd: string;
  healthStatus: "healthy" | "warning" | "critical";
  healthMessage: string;
}

export const searchTelemetry = new SearchTelemetry();
