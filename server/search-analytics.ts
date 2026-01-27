/**
 * Internal Search Analytics
 *
 * Track what people search on the site to:
 * - Identify content gaps
 * - Improve navigation
 * - Understand user intent
 *
 * Now persisted to PostgreSQL for production reliability.
 */

import { db } from "./db";
import { sql, eq, gte, desc, count } from "drizzle-orm";
import { cache } from "./cache";
import { searchQueries } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

interface SearchQueryData {
  id: string;
  query: string;
  resultsCount: number;
  clickedResultId?: string;
  timestamp: Date;
  locale: string;
  sessionId?: string;
}

// ============================================================================
// SEARCH TRACKING - Database Persistence
// ============================================================================

export const searchAnalytics = {
  /**
   * Log a search query
   */
  async logSearch(
    query: string,
    resultsCount: number,
    locale: string = "en",
    sessionId?: string
  ): Promise<string> {
    const [row] = await db
      .insert(searchQueries)
      .values({
        query: query.toLowerCase().trim(),
        resultsCount,
        locale,
        sessionId: sessionId || null,
      } as any)
      .returning();

    // Invalidate analytics cache
    await cache.invalidate("search-analytics:*");

    // Periodically clean up old searches (older than 90 days)
    if (Math.random() < 0.01) {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      db.delete(searchQueries)
        .where(sql`${searchQueries.createdAt} < ${cutoff}`)
        .catch(err => {});
    }

    return row.id;
  },

  /**
   * Log when user clicks a search result
   */
  async logClick(searchId: string, resultId: string): Promise<void> {
    await db
      .update(searchQueries)
      .set({ clickedResultId: resultId } as any)
      .where(eq(searchQueries.id, searchId));
  },

  /**
   * Get popular searches
   */
  async getPopularSearches(
    limit: number = 20,
    days: number = 30
  ): Promise<
    Array<{
      query: string;
      count: number;
      avgResults: number;
      clickRate: number;
    }>
  > {
    const cacheKey = `search-analytics:popular:${limit}:${days}`;
    const cached = await cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Query from database with aggregation
    const rows = await db.select().from(searchQueries).where(gte(searchQueries.createdAt, cutoff));

    // Group searches by query
    const queryStats = new Map<
      string,
      {
        count: number;
        totalResults: number;
        clicks: number;
      }
    >();

    for (const search of rows) {
      const existing = queryStats.get(search.query);
      if (existing) {
        existing.count++;
        existing.totalResults += search.resultsCount;
        if (search.clickedResultId) existing.clicks++;
      } else {
        queryStats.set(search.query, {
          count: 1,
          totalResults: search.resultsCount,
          clicks: search.clickedResultId ? 1 : 0,
        });
      }
    }

    // Convert to array and sort
    const result = [...queryStats.entries()]
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgResults: Math.round(stats.totalResults / stats.count),
        clickRate: Math.round((stats.clicks / stats.count) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    await cache.set(cacheKey, result, 3600);
    return result;
  },

  /**
   * Get zero-result searches (content gaps)
   */
  async getZeroResultSearches(
    limit: number = 50,
    days: number = 30
  ): Promise<
    Array<{
      query: string;
      count: number;
      lastSearched: Date;
    }>
  > {
    const cacheKey = `search-analytics:zero-results:${limit}:${days}`;
    const cached = await cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Query from database
    const rows = await db
      .select()
      .from(searchQueries)
      .where(sql`${searchQueries.createdAt} >= ${cutoff} AND ${searchQueries.resultsCount} = 0`);

    // Find searches with 0 results
    const zeroResults = new Map<string, { count: number; lastSearched: Date }>();

    for (const search of rows) {
      const existing = zeroResults.get(search.query);
      if (existing) {
        existing.count++;
        if (search.createdAt > existing.lastSearched) {
          existing.lastSearched = search.createdAt;
        }
      } else {
        zeroResults.set(search.query, {
          count: 1,
          lastSearched: search.createdAt,
        });
      }
    }

    const result = [...zeroResults.entries()]
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        lastSearched: stats.lastSearched,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    await cache.set(cacheKey, result, 3600);
    return result;
  },

  /**
   * Get low-click searches (poor results quality)
   */
  async getLowClickSearches(
    limit: number = 30,
    minSearches: number = 5
  ): Promise<
    Array<{
      query: string;
      searchCount: number;
      clickRate: number;
      avgResults: number;
    }>
  > {
    const popular = await this.getPopularSearches(100, 30);

    return popular
      .filter(s => s.count >= minSearches && s.avgResults > 0 && s.clickRate < 20)
      .map(s => ({
        query: s.query,
        searchCount: s.count,
        clickRate: s.clickRate,
        avgResults: s.avgResults,
      }))
      .slice(0, limit);
  },

  /**
   * Get search trends over time
   */
  async getSearchTrends(days: number = 14): Promise<
    Array<{
      date: string;
      totalSearches: number;
      uniqueQueries: number;
      avgResults: number;
      avgClickRate: number;
    }>
  > {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Query from database
    const rows = await db.select().from(searchQueries).where(gte(searchQueries.createdAt, cutoff));

    const trends: Map<
      string,
      {
        searches: number;
        queries: Set<string>;
        results: number;
        clicks: number;
      }
    > = new Map();

    for (const search of rows) {
      const dateKey = search.createdAt.toISOString().split("T")[0];
      const existing = trends.get(dateKey);

      if (existing) {
        existing.searches++;
        existing.queries.add(search.query);
        existing.results += search.resultsCount;
        if (search.clickedResultId) existing.clicks++;
      } else {
        trends.set(dateKey, {
          searches: 1,
          queries: new Set([search.query]),
          results: search.resultsCount,
          clicks: search.clickedResultId ? 1 : 0,
        });
      }
    }

    return [...trends.entries()]
      .map(([date, stats]) => ({
        date,
        totalSearches: stats.searches,
        uniqueQueries: stats.queries.size,
        avgResults: Math.round(stats.results / stats.searches),
        avgClickRate: Math.round((stats.clicks / stats.searches) * 100),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Get content suggestions based on search data
   */
  async getContentSuggestions(): Promise<
    Array<{
      topic: string;
      reason: string;
      priority: "high" | "medium" | "low";
      searchCount: number;
    }>
  > {
    const zeroResults = await this.getZeroResultSearches(30, 30);
    const lowClick = await this.getLowClickSearches(30, 5);

    const suggestions: Array<{
      topic: string;
      reason: string;
      priority: "high" | "medium" | "low";
      searchCount: number;
    }> = [];

    // High priority: frequently searched with no results
    for (const zr of zeroResults.filter(z => z.count >= 10)) {
      suggestions.push({
        topic: zr.query,
        reason: `${zr.count} searches with no results`,
        priority: "high",
        searchCount: zr.count,
      });
    }

    // Medium priority: decent volume, no results
    for (const zr of zeroResults.filter(z => z.count >= 3 && z.count < 10)) {
      suggestions.push({
        topic: zr.query,
        reason: `${zr.count} searches with no results`,
        priority: "medium",
        searchCount: zr.count,
      });
    }

    // Medium priority: results exist but low engagement
    for (const lc of lowClick) {
      suggestions.push({
        topic: lc.query,
        reason: `${lc.searchCount} searches, only ${lc.clickRate}% click rate - improve existing content`,
        priority: "medium",
        searchCount: lc.searchCount,
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] || b.searchCount - a.searchCount;
    });
  },

  /**
   * Get search analytics dashboard
   */
  async getDashboard(): Promise<{
    summary: {
      totalSearches: number;
      uniqueQueries: number;
      avgClickRate: number;
      zeroResultRate: number;
    };
    topSearches: Array<{ query: string; count: number }>;
    contentGaps: Array<{ query: string; count: number }>;
    trends: Array<{ date: string; searches: number }>;
  }> {
    const [popular, zeroResults, trends] = await Promise.all([
      this.getPopularSearches(10, 30),
      this.getZeroResultSearches(10, 30),
      this.getSearchTrends(7),
    ]);

    // Query for unique queries and zero results from DB
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalCount] = await db
      .select({ count: count() })
      .from(searchQueries)
      .where(gte(searchQueries.createdAt, cutoff));

    const uniqueQueriesResult = await db
      .selectDistinct({ query: searchQueries.query })
      .from(searchQueries)
      .where(gte(searchQueries.createdAt, cutoff));

    const [zeroResultCount] = await db
      .select({ count: count() })
      .from(searchQueries)
      .where(sql`${searchQueries.createdAt} >= ${cutoff} AND ${searchQueries.resultsCount} = 0`);

    const totalSearches = totalCount?.count || 0;
    const uniqueQueries = uniqueQueriesResult.length;
    const avgClickRate =
      popular.length > 0
        ? Math.round(popular.reduce((sum, p) => sum + p.clickRate, 0) / popular.length)
        : 0;
    const zeroResultRate =
      totalSearches > 0 ? Math.round(((zeroResultCount?.count || 0) / totalSearches) * 100) : 0;

    return {
      summary: {
        totalSearches,
        uniqueQueries,
        avgClickRate,
        zeroResultRate,
      },
      topSearches: popular.map(p => ({ query: p.query, count: p.count })),
      contentGaps: zeroResults.map(z => ({ query: z.query, count: z.count })),
      trends: trends.map(t => ({ date: t.date, searches: t.totalSearches })),
    };
  },
};

export default searchAnalytics;
