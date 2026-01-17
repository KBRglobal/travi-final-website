/**
 * Search Intelligence - Query Collector
 *
 * Collects and stores search queries for analysis.
 */

import { db } from '../db';
import { searchQueries } from '@shared/schema';
import { desc, sql, count, eq, and, gte } from 'drizzle-orm';
import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[SearchIntel] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[SearchIntel] ${msg}`, undefined, data),
};

export interface QueryRecord {
  query: string;
  resultsCount: number;
  clickedResultId: string | null;
  locale: string;
  createdAt: Date;
}

export interface QueryStats {
  query: string;
  totalSearches: number;
  zeroResults: number;
  avgResults: number;
  clickRate: number;
}

export function isSearchIntelligenceEnabled(): boolean {
  return process.env.ENABLE_SEARCH_INTELLIGENCE === 'true';
}

/**
 * Record a search query.
 */
export async function recordQuery(
  query: string,
  resultsCount: number,
  clickedResultId: string | null = null,
  locale: string = 'en',
  sessionId?: string
): Promise<void> {
  if (!isSearchIntelligenceEnabled()) return;

  try {
    await db.insert(searchQueries).values({
      query: query.toLowerCase().trim(),
      resultsCount,
      clickedResultId,
      locale,
      sessionId,
    } as any);
  } catch (error) {
    logger.error('Failed to record query', {
      query,
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}

/**
 * Get zero-result queries (gap candidates).
 */
export async function getZeroResultQueries(
  limit: number = 50,
  sinceDays: number = 7
): Promise<QueryStats[]> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  const results = await db
    .select({
      query: searchQueries.query,
      totalSearches: count(),
      zeroResults: sql<number>`SUM(CASE WHEN ${searchQueries.resultsCount} = 0 THEN 1 ELSE 0 END)`,
    })
    .from(searchQueries)
    .where(gte(searchQueries.createdAt, since))
    .groupBy(searchQueries.query)
    .having(sql`SUM(CASE WHEN ${searchQueries.resultsCount} = 0 THEN 1 ELSE 0 END) > 0`)
    .orderBy(desc(sql`SUM(CASE WHEN ${searchQueries.resultsCount} = 0 THEN 1 ELSE 0 END)`))
    .limit(limit);

  return results.map(r => ({
    query: r.query,
    totalSearches: Number(r.totalSearches),
    zeroResults: Number(r.zeroResults),
    avgResults: 0,
    clickRate: 0,
  }));
}

/**
 * Get low-click queries (poor ranking candidates).
 */
export async function getLowClickQueries(
  limit: number = 50,
  sinceDays: number = 7,
  minSearches: number = 5
): Promise<QueryStats[]> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  const results = await db
    .select({
      query: searchQueries.query,
      totalSearches: count(),
      clicks: sql<number>`SUM(CASE WHEN ${searchQueries.clickedResultId} IS NOT NULL THEN 1 ELSE 0 END)`,
      avgResults: sql<number>`AVG(${searchQueries.resultsCount})`,
    })
    .from(searchQueries)
    .where(gte(searchQueries.createdAt, since))
    .groupBy(searchQueries.query)
    .having(sql`COUNT(*) >= ${minSearches}`)
    .orderBy(sql`SUM(CASE WHEN ${searchQueries.clickedResultId} IS NOT NULL THEN 1 ELSE 0 END)::float / COUNT(*) ASC`)
    .limit(limit);

  return results.map(r => ({
    query: r.query,
    totalSearches: Number(r.totalSearches),
    zeroResults: 0,
    avgResults: Number(r.avgResults),
    clickRate: Number(r.clicks) / Number(r.totalSearches),
  }));
}

/**
 * Get most frequent queries.
 */
export async function getTopQueries(
  limit: number = 100,
  sinceDays: number = 7
): Promise<QueryStats[]> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  const results = await db
    .select({
      query: searchQueries.query,
      totalSearches: count(),
      zeroResults: sql<number>`SUM(CASE WHEN ${searchQueries.resultsCount} = 0 THEN 1 ELSE 0 END)`,
      clicks: sql<number>`SUM(CASE WHEN ${searchQueries.clickedResultId} IS NOT NULL THEN 1 ELSE 0 END)`,
      avgResults: sql<number>`AVG(${searchQueries.resultsCount})`,
    })
    .from(searchQueries)
    .where(gte(searchQueries.createdAt, since))
    .groupBy(searchQueries.query)
    .orderBy(desc(count()))
    .limit(limit);

  return results.map(r => ({
    query: r.query,
    totalSearches: Number(r.totalSearches),
    zeroResults: Number(r.zeroResults),
    avgResults: Number(r.avgResults),
    clickRate: Number(r.totalSearches) > 0 ? Number(r.clicks) / Number(r.totalSearches) : 0,
  }));
}
