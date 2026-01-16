/**
 * Admin Intelligence Snapshot
 *
 * Generates a read-only JSON snapshot of system health metrics.
 * Uses existing DB tables only - no fake data.
 *
 * PHASE 17: Admin Intelligence & Visibility Layer
 */

import { db } from "../db";
import {
  contents,
  searchIndex,
  backgroundJobs,
  rssFeeds,
  searchQueries,
  internalLinks,
} from "@shared/schema";
import { eq, and, sql, gte, count, isNull } from "drizzle-orm";

// Feature flag check
export function isIntelligenceEnabled(): boolean {
  return process.env.ENABLE_INTELLIGENCE_COVERAGE === 'true';
}

/**
 * Content State Snapshot
 */
export interface ContentStateSnapshot {
  total: number;
  published: number;
  draft: number;
  failed: number;
  withoutEntities: number;  // contents without answer_capsule (proxy for entities)
  notIndexed: number;       // published but not in search_index
  withoutAeoCapsule: number;
}

async function getContentState(): Promise<ContentStateSnapshot> {
  try {
    // Get content counts by status
    const statusCounts = await db
      .select({
        status: contents.status,
        count: count(),
      })
      .from(contents)
      .where(isNull(contents.deletedAt))
      .groupBy(contents.status);

    const statusMap = new Map(statusCounts.map(s => [s.status, Number(s.count)]));
    const total = Array.from(statusMap.values()).reduce((a, b) => a + b, 0);
    const published = statusMap.get('published') || 0;
    const draft = statusMap.get('draft') || 0;

    // Count contents without answer capsule (proxy for missing entities)
    const [withoutEntitiesResult] = await db
      .select({ count: count() })
      .from(contents)
      .where(and(
        isNull(contents.deletedAt),
        eq(contents.status, 'published'),
        isNull(contents.answerCapsule)
      ));

    // Count contents without AEO capsule
    const [withoutAeoResult] = await db
      .select({ count: count() })
      .from(contents)
      .where(and(
        isNull(contents.deletedAt),
        eq(contents.status, 'published'),
        isNull(contents.answerCapsule)
      ));

    // Count published content not in search index
    const [indexedCount] = await db
      .select({ count: count() })
      .from(searchIndex);

    const notIndexed = Math.max(0, published - Number(indexedCount?.count || 0));

    return {
      total,
      published,
      draft,
      failed: 0, // No 'failed' status in enum
      withoutEntities: Number(withoutEntitiesResult?.count || 0),
      notIndexed,
      withoutAeoCapsule: Number(withoutAeoResult?.count || 0),
    };
  } catch (error) {
    console.error('[Intelligence] Error getting content state:', error);
    return {
      total: 0,
      published: 0,
      draft: 0,
      failed: 0,
      withoutEntities: 0,
      notIndexed: 0,
      withoutAeoCapsule: 0,
    };
  }
}

/**
 * AI Activity Snapshot (last 24h)
 */
export interface AIActivitySnapshot {
  jobsExecuted: Record<string, number>;
  jobsFailed: Record<string, number>;
  avgDurationByType: Record<string, string>;
}

async function getAIActivity(): Promise<AIActivitySnapshot> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get jobs by type and status
    const jobCounts = await db
      .select({
        type: backgroundJobs.type,
        status: backgroundJobs.status,
        count: count(),
      })
      .from(backgroundJobs)
      .where(gte(backgroundJobs.createdAt, oneDayAgo))
      .groupBy(backgroundJobs.type, backgroundJobs.status);

    const jobsExecuted: Record<string, number> = {};
    const jobsFailed: Record<string, number> = {};

    for (const job of jobCounts) {
      if (job.status === 'completed') {
        jobsExecuted[job.type] = (jobsExecuted[job.type] || 0) + Number(job.count);
      } else if (job.status === 'failed') {
        jobsFailed[job.type] = (jobsFailed[job.type] || 0) + Number(job.count);
      }
    }

    // Calculate average duration for completed jobs
    const durationResults = await db
      .select({
        type: backgroundJobs.type,
        avgDuration: sql<number>`
          AVG(EXTRACT(EPOCH FROM (${backgroundJobs.completedAt} - ${backgroundJobs.startedAt})))
        `.as('avg_duration'),
      })
      .from(backgroundJobs)
      .where(and(
        gte(backgroundJobs.createdAt, oneDayAgo),
        eq(backgroundJobs.status, 'completed'),
        sql`${backgroundJobs.completedAt} IS NOT NULL`,
        sql`${backgroundJobs.startedAt} IS NOT NULL`
      ))
      .groupBy(backgroundJobs.type);

    const avgDurationByType: Record<string, string> = {};
    for (const result of durationResults) {
      const seconds = Number(result.avgDuration) || 0;
      avgDurationByType[result.type] = seconds > 0
        ? `${seconds.toFixed(1)}s`
        : 'unknown';
    }

    return {
      jobsExecuted,
      jobsFailed,
      avgDurationByType,
    };
  } catch (error) {
    console.error('[Intelligence] Error getting AI activity:', error);
    return {
      jobsExecuted: {},
      jobsFailed: {},
      avgDurationByType: {},
    };
  }
}

/**
 * Search Health Snapshot
 */
export interface SearchHealthSnapshot {
  indexedCount: number;
  zeroResultSearches24h: number;
  fallbackRatePercent: string;
}

async function getSearchHealth(): Promise<SearchHealthSnapshot> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Count indexed items
    const [indexedResult] = await db
      .select({ count: count() })
      .from(searchIndex);

    // Count zero-result searches in last 24h
    const [zeroResultsResult] = await db
      .select({ count: count() })
      .from(searchQueries)
      .where(and(
        gte(searchQueries.createdAt, oneDayAgo),
        eq(searchQueries.resultsCount, 0)
      ));

    // Total searches in last 24h for fallback rate
    const [totalSearchesResult] = await db
      .select({ count: count() })
      .from(searchQueries)
      .where(gte(searchQueries.createdAt, oneDayAgo));

    const totalSearches = Number(totalSearchesResult?.count || 0);
    const zeroResults = Number(zeroResultsResult?.count || 0);
    const fallbackRate = totalSearches > 0
      ? ((zeroResults / totalSearches) * 100).toFixed(1)
      : '0.0';

    return {
      indexedCount: Number(indexedResult?.count || 0),
      zeroResultSearches24h: zeroResults,
      fallbackRatePercent: `${fallbackRate}%`,
    };
  } catch (error) {
    console.error('[Intelligence] Error getting search health:', error);
    return {
      indexedCount: 0,
      zeroResultSearches24h: 0,
      fallbackRatePercent: 'unknown',
    };
  }
}

/**
 * RSS Health Snapshot
 */
export interface RSSHealthSnapshot {
  feedsCount: number;
  activeFeedsCount: number;
  itemsIngested: string;
  itemsWithoutEntities: string;
  failures: string;
}

async function getRSSHealth(): Promise<RSSHealthSnapshot> {
  try {
    // Count RSS feeds
    const [feedsResult] = await db
      .select({ count: count() })
      .from(rssFeeds);

    // Count active feeds (those with lastFetched in last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [activeFeedsResult] = await db
      .select({ count: count() })
      .from(rssFeeds)
      .where(gte(rssFeeds.lastFetched, oneDayAgo));

    return {
      feedsCount: Number(feedsResult?.count || 0),
      activeFeedsCount: Number(activeFeedsResult?.count || 0),
      itemsIngested: 'unknown', // Would need RSS items table
      itemsWithoutEntities: 'unknown',
      failures: 'unknown',
    };
  } catch (error) {
    console.error('[Intelligence] Error getting RSS health:', error);
    return {
      feedsCount: 0,
      activeFeedsCount: 0,
      itemsIngested: 'unknown',
      itemsWithoutEntities: 'unknown',
      failures: 'unknown',
    };
  }
}

/**
 * System Warnings
 */
export interface SystemWarningsSnapshot {
  stalledJobs: number;
  retryingJobs: number;
  queuesOverThreshold: string[];
  disabledFeatureFlags: string[];
}

async function getSystemWarnings(): Promise<SystemWarningsSnapshot> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Count stalled jobs (processing for > 1 hour)
    const [stalledResult] = await db
      .select({ count: count() })
      .from(backgroundJobs)
      .where(and(
        eq(backgroundJobs.status, 'processing'),
        sql`${backgroundJobs.startedAt} < ${oneHourAgo}`
      ));

    // Count jobs with retries
    const [retryingResult] = await db
      .select({ count: count() })
      .from(backgroundJobs)
      .where(and(
        eq(backgroundJobs.status, 'pending'),
        sql`${backgroundJobs.retries} > 0`
      ));

    // Check feature flags
    const disabledFlags: string[] = [];
    if (process.env.ENABLE_INTELLIGENCE_COVERAGE !== 'true') {
      disabledFlags.push('ENABLE_INTELLIGENCE_COVERAGE');
    }

    return {
      stalledJobs: Number(stalledResult?.count || 0),
      retryingJobs: Number(retryingResult?.count || 0),
      queuesOverThreshold: [], // Would need queue monitoring
      disabledFeatureFlags: disabledFlags,
    };
  } catch (error) {
    console.error('[Intelligence] Error getting system warnings:', error);
    return {
      stalledJobs: 0,
      retryingJobs: 0,
      queuesOverThreshold: [],
      disabledFeatureFlags: [],
    };
  }
}

/**
 * Coverage metrics for a specific content item
 */
export interface ContentCoverageMetrics {
  contentId: string;
  hasEntities: boolean;
  entityCount: number;
  linkedEntitiesCount: number;
  hasInternalLinks: boolean;
  isSearchIndexed: boolean;
  hasAeoCapsule: boolean;
  lastEvaluatedAt: Date;
  coverageScore: number;
}

/**
 * Evaluate coverage for a single content item
 */
export async function evaluateContentCoverage(contentId: string): Promise<ContentCoverageMetrics | null> {
  if (!isIntelligenceEnabled()) {
    return null;
  }

  try {
    // Get content details
    const [content] = await db
      .select({
        id: contents.id,
        answerCapsule: contents.answerCapsule,
        aeoScore: contents.aeoScore,
        seoScore: contents.seoScore,
      })
      .from(contents)
      .where(eq(contents.id, contentId));

    if (!content) {
      return null;
    }

    // Check if indexed
    const [indexed] = await db
      .select({ contentId: searchIndex.contentId })
      .from(searchIndex)
      .where(eq(searchIndex.contentId, contentId));

    // Count internal links
    const [linksResult] = await db
      .select({ count: count() })
      .from(internalLinks)
      .where(eq(internalLinks.sourceContentId, contentId));

    const hasAeo = !!content.answerCapsule;
    const isIndexed = !!indexed;
    const linkCount = Number(linksResult?.count || 0);
    const hasLinks = linkCount > 0;

    // Calculate coverage score (0-100)
    let score = 0;
    if (hasAeo) score += 30;
    if (isIndexed) score += 30;
    if (hasLinks) score += 20;
    if (content.seoScore && content.seoScore > 50) score += 10;
    if (content.aeoScore && content.aeoScore > 50) score += 10;

    return {
      contentId,
      hasEntities: hasAeo, // Using AEO capsule as proxy for entity extraction
      entityCount: hasAeo ? 1 : 0,
      linkedEntitiesCount: linkCount,
      hasInternalLinks: hasLinks,
      isSearchIndexed: isIndexed,
      hasAeoCapsule: hasAeo,
      lastEvaluatedAt: new Date(),
      coverageScore: Math.min(100, score),
    };
  } catch (error) {
    console.error('[Intelligence] Error evaluating coverage:', error);
    return null;
  }
}

/**
 * Batch evaluate coverage for all content
 */
export async function evaluateAllContentCoverage(
  batchSize: number = 100,
  cursor?: string
): Promise<{ results: ContentCoverageMetrics[]; nextCursor?: string }> {
  if (!isIntelligenceEnabled()) {
    return { results: [] };
  }

  try {
    // Get batch of content IDs
    let query = db
      .select({ id: contents.id })
      .from(contents)
      .where(and(
        isNull(contents.deletedAt),
        eq(contents.status, 'published')
      ))
      .orderBy(contents.id)
      .limit(batchSize + 1);

    if (cursor) {
      query = db
        .select({ id: contents.id })
        .from(contents)
        .where(and(
          isNull(contents.deletedAt),
          eq(contents.status, 'published'),
          sql`${contents.id} > ${cursor}`
        ))
        .orderBy(contents.id)
        .limit(batchSize + 1);
    }

    const contentIds = await query;
    const hasMore = contentIds.length > batchSize;
    const idsToProcess = hasMore ? contentIds.slice(0, batchSize) : contentIds;

    const results: ContentCoverageMetrics[] = [];
    for (const { id } of idsToProcess) {
      const coverage = await evaluateContentCoverage(id);
      if (coverage) {
        results.push(coverage);
      }
    }

    return {
      results,
      nextCursor: hasMore ? idsToProcess[idsToProcess.length - 1].id : undefined,
    };
  } catch (error) {
    console.error('[Intelligence] Error in batch evaluation:', error);
    return { results: [] };
  }
}

/**
 * Full Intelligence Snapshot
 */
export interface IntelligenceSnapshot {
  generatedAt: string;
  featureEnabled: boolean;
  content: ContentStateSnapshot;
  aiActivity: AIActivitySnapshot;
  searchHealth: SearchHealthSnapshot;
  rssHealth: RSSHealthSnapshot;
  systemWarnings: SystemWarningsSnapshot;
}

/**
 * Generate the full intelligence snapshot
 * Wrapped in timeout for safety
 */
export async function generateIntelligenceSnapshot(): Promise<IntelligenceSnapshot> {
  const timeoutMs = 5000;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Snapshot generation timeout')), timeoutMs);
  });

  try {
    const snapshotPromise = Promise.all([
      getContentState(),
      getAIActivity(),
      getSearchHealth(),
      getRSSHealth(),
      getSystemWarnings(),
    ]);

    const [content, aiActivity, searchHealth, rssHealth, systemWarnings] =
      await Promise.race([snapshotPromise, timeoutPromise]);

    return {
      generatedAt: new Date().toISOString(),
      featureEnabled: isIntelligenceEnabled(),
      content,
      aiActivity,
      searchHealth,
      rssHealth,
      systemWarnings,
    };
  } catch (error) {
    console.error('[Intelligence] Error generating snapshot:', error);

    // Return safe fallback on error
    return {
      generatedAt: new Date().toISOString(),
      featureEnabled: isIntelligenceEnabled(),
      content: {
        total: 0,
        published: 0,
        draft: 0,
        failed: 0,
        withoutEntities: 0,
        notIndexed: 0,
        withoutAeoCapsule: 0,
      },
      aiActivity: {
        jobsExecuted: {},
        jobsFailed: {},
        avgDurationByType: {},
      },
      searchHealth: {
        indexedCount: 0,
        zeroResultSearches24h: 0,
        fallbackRatePercent: 'unknown',
      },
      rssHealth: {
        feedsCount: 0,
        activeFeedsCount: 0,
        itemsIngested: 'unknown',
        itemsWithoutEntities: 'unknown',
        failures: 'unknown',
      },
      systemWarnings: {
        stalledJobs: 0,
        retryingJobs: 0,
        queuesOverThreshold: [],
        disabledFeatureFlags: [],
      },
    };
  }
}
