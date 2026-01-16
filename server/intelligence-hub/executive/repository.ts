/**
 * Enterprise Intelligence Hub - Summary Repository
 *
 * Stores and retrieves executive summaries.
 */

import { log } from '../../lib/logger';
import type { ExecutiveSummary, SummaryQuery, HealthBreakdown } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[SummaryRepository] ${msg}`, data),
};

// Bounded storage
const MAX_SUMMARIES = 100;

class SummaryRepository {
  private summaries: Map<string, ExecutiveSummary> = new Map();
  private latestHealthScore: HealthBreakdown | null = null;
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_EXECUTIVE_SUMMARY === 'true';
    if (this.enabled) {
      logger.info('Summary Repository initialized');
    }
  }

  /**
   * Store a summary
   */
  store(summary: ExecutiveSummary): void {
    this.summaries.set(summary.id, summary);
    this.latestHealthScore = summary.healthScore;

    // Enforce bounds
    if (this.summaries.size > MAX_SUMMARIES) {
      const sorted = Array.from(this.summaries.entries())
        .sort((a, b) => a[1].generatedAt.getTime() - b[1].generatedAt.getTime());

      for (const [id] of sorted.slice(0, MAX_SUMMARIES / 4)) {
        this.summaries.delete(id);
      }
    }
  }

  /**
   * Get a summary by ID
   */
  get(id: string): ExecutiveSummary | undefined {
    return this.summaries.get(id);
  }

  /**
   * Get the most recent summary
   */
  getLatest(): ExecutiveSummary | undefined {
    const all = Array.from(this.summaries.values());
    if (all.length === 0) return undefined;

    return all.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())[0];
  }

  /**
   * Get latest health score
   */
  getLatestHealth(): HealthBreakdown | null {
    return this.latestHealthScore;
  }

  /**
   * Query summaries
   */
  query(query: SummaryQuery = {}): ExecutiveSummary[] {
    let results = Array.from(this.summaries.values());

    if (query.since) {
      results = results.filter(s => s.generatedAt >= query.since!);
    }

    // Sort by date descending
    results.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get health trend over time
   */
  getHealthTrend(count = 10): { date: Date; score: number }[] {
    const summaries = this.query({ limit: count });

    return summaries.map(s => ({
      date: s.generatedAt,
      score: s.healthScore.overall,
    }));
  }

  /**
   * Get summary count
   */
  count(): number {
    return this.summaries.size;
  }

  /**
   * Clear all (for testing)
   */
  clear(): void {
    this.summaries.clear();
    this.latestHealthScore = null;
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: SummaryRepository | null = null;

export function getSummaryRepository(): SummaryRepository {
  if (!instance) {
    instance = new SummaryRepository();
  }
  return instance;
}

export function resetSummaryRepository(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}

export { SummaryRepository };
