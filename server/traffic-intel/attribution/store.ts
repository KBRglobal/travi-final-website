/**
 * Traffic Attribution - In-Memory Store with Periodic Persistence
 *
 * Aggregates traffic data in memory and flushes to DB periodically.
 * Feature-flagged: ENABLE_TRAFFIC_INTELLIGENCE
 */

import type { TrafficChannel, AIPlatform, TrafficAttribution } from '../types';

interface AttributionKey {
  contentId: string;
  entityId?: string;
  channel: TrafficChannel;
  source: string;
  aiPlatform?: AIPlatform;
  date: string; // YYYY-MM-DD
}

interface AttributionCounter {
  impressions: number;
  visits: number;
  uniqueVisitors: Set<string>;
  bounceCount: number;
  totalTimeOnPage: number;
  updatedAt: Date;
}

type CounterMap = Map<string, AttributionCounter>;

// Store configuration
const FLUSH_INTERVAL_MS = 60 * 1000; // 1 minute
const MAX_ENTRIES = 10000; // Bounded size

/**
 * Generate unique key for attribution entry
 */
function generateKey(key: AttributionKey): string {
  return [
    key.contentId,
    key.entityId || '_',
    key.channel,
    key.source,
    key.aiPlatform || '_',
    key.date,
  ].join('::');
}

/**
 * Parse key back to AttributionKey
 */
function parseKey(keyStr: string): AttributionKey {
  const parts = keyStr.split('::');
  return {
    contentId: parts[0],
    entityId: parts[1] === '_' ? undefined : parts[1],
    channel: parts[2] as TrafficChannel,
    source: parts[3],
    aiPlatform: parts[4] === '_' ? undefined : (parts[4] as AIPlatform),
    date: parts[5],
  };
}

/**
 * Get today's date string
 */
function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Traffic Attribution Store
 */
export class AttributionStore {
  private counters: CounterMap;
  private flushTimer: ReturnType<typeof setInterval> | null;
  private flushCallback: ((data: TrafficAttribution[]) => Promise<void>) | null;
  private isRunning: boolean;

  constructor() {
    this.counters = new Map();
    this.flushTimer = null;
    this.flushCallback = null;
    this.isRunning = false;
  }

  /**
   * Record a visit/impression
   */
  record(
    contentId: string,
    channel: TrafficChannel,
    source: string,
    options?: {
      entityId?: string;
      aiPlatform?: AIPlatform;
      visitorId?: string;
      isBounce?: boolean;
      timeOnPage?: number;
      date?: Date;
    }
  ): void {
    const date = getDateString(options?.date);
    const keyObj: AttributionKey = {
      contentId,
      entityId: options?.entityId,
      channel,
      source,
      aiPlatform: options?.aiPlatform,
      date,
    };

    const key = generateKey(keyObj);

    // Evict oldest if at capacity
    if (!this.counters.has(key) && this.counters.size >= MAX_ENTRIES) {
      const oldestKey = this.counters.keys().next().value;
      if (oldestKey) {
        this.counters.delete(oldestKey);
      }
    }

    // Get or create counter
    let counter = this.counters.get(key);
    if (!counter) {
      counter = {
        impressions: 0,
        visits: 0,
        uniqueVisitors: new Set(),
        bounceCount: 0,
        totalTimeOnPage: 0,
        updatedAt: new Date(),
      };
      this.counters.set(key, counter);
    }

    // Update counters
    counter.impressions++;
    counter.visits++;
    counter.updatedAt = new Date();

    if (options?.visitorId) {
      counter.uniqueVisitors.add(options.visitorId);
    }

    if (options?.isBounce) {
      counter.bounceCount++;
    }

    if (options?.timeOnPage) {
      counter.totalTimeOnPage += options.timeOnPage;
    }
  }

  /**
   * Get aggregated data for flushing
   */
  getAggregatedData(): TrafficAttribution[] {
    const results: TrafficAttribution[] = [];

    for (const [keyStr, counter] of this.counters) {
      const key = parseKey(keyStr);

      results.push({
        id: keyStr,
        contentId: key.contentId,
        entityId: key.entityId,
        channel: key.channel,
        source: key.source,
        aiPlatform: key.aiPlatform,
        impressions: counter.impressions,
        visits: counter.visits,
        uniqueVisitors: counter.uniqueVisitors.size,
        bounceCount: counter.bounceCount,
        totalTimeOnPage: counter.totalTimeOnPage,
        date: key.date,
        createdAt: new Date(),
        updatedAt: counter.updatedAt,
      });
    }

    return results;
  }

  /**
   * Get stats for a specific content
   */
  getContentStats(contentId: string): TrafficAttribution[] {
    const results: TrafficAttribution[] = [];

    for (const [keyStr, counter] of this.counters) {
      const key = parseKey(keyStr);
      if (key.contentId === contentId) {
        results.push({
          id: keyStr,
          contentId: key.contentId,
          entityId: key.entityId,
          channel: key.channel,
          source: key.source,
          aiPlatform: key.aiPlatform,
          impressions: counter.impressions,
          visits: counter.visits,
          uniqueVisitors: counter.uniqueVisitors.size,
          bounceCount: counter.bounceCount,
          totalTimeOnPage: counter.totalTimeOnPage,
          date: key.date,
          createdAt: new Date(),
          updatedAt: counter.updatedAt,
        });
      }
    }

    return results;
  }

  /**
   * Get summary stats
   */
  getSummary(): {
    totalEntries: number;
    totalVisits: number;
    channelBreakdown: Record<TrafficChannel, number>;
  } {
    const channelBreakdown: Record<TrafficChannel, number> = {
      organic_search: 0,
      ai_search: 0,
      referral: 0,
      social: 0,
      direct: 0,
      email: 0,
      paid: 0,
      unknown: 0,
    };

    let totalVisits = 0;

    for (const [keyStr, counter] of this.counters) {
      const key = parseKey(keyStr);
      channelBreakdown[key.channel] += counter.visits;
      totalVisits += counter.visits;
    }

    return {
      totalEntries: this.counters.size,
      totalVisits,
      channelBreakdown,
    };
  }

  /**
   * Set flush callback
   */
  setFlushCallback(callback: (data: TrafficAttribution[]) => Promise<void>): void {
    this.flushCallback = callback;
  }

  /**
   * Flush data to persistent storage
   */
  async flush(): Promise<number> {
    if (!this.flushCallback) {
      return 0;
    }

    const data = this.getAggregatedData();
    if (data.length === 0) {
      return 0;
    }

    try {
      await this.flushCallback(data);
      // Clear flushed data
      this.counters.clear();
      return data.length;
    } catch (error) {
      console.error('[TrafficAttribution] Flush failed:', error);
      throw error;
    }
  }

  /**
   * Start periodic flushing
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.flushTimer = setInterval(async () => {
      try {
        const flushed = await this.flush();
        if (flushed > 0) {
          console.log(`[TrafficAttribution] Flushed ${flushed} entries`);
        }
      } catch (error) {
        console.error('[TrafficAttribution] Flush error:', error);
      }
    }, FLUSH_INTERVAL_MS);

    console.log('[TrafficAttribution] Store started');
  }

  /**
   * Stop periodic flushing
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.isRunning = false;
    console.log('[TrafficAttribution] Store stopped');
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.counters.clear();
  }

  /**
   * Get running status
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
let storeInstance: AttributionStore | null = null;

export function getAttributionStore(): AttributionStore {
  if (!storeInstance) {
    storeInstance = new AttributionStore();
  }
  return storeInstance;
}

export function resetAttributionStore(): void {
  if (storeInstance) {
    storeInstance.stop();
    storeInstance.clear();
  }
  storeInstance = null;
}
