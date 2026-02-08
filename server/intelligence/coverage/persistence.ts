/**
 * Intelligence Coverage Engine - Persistence
 *
 * Stores and retrieves coverage evaluation results.
 * Uses in-memory cache with DB fallback for production readiness.
 */

import { db } from '../../db';
import { contents } from '@shared/schema';
import { eq, sql, count, isNotNull } from 'drizzle-orm';





import { log } from '../../lib/logger';
import type { ContentCoverage, CoverageSummary } from './types';
import { isIntelligenceCoverageEnabled } from './evaluator';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[ICE-Persist] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[ICE-Persist] ${msg}`, undefined, data),
};

// ============================================================================
// In-Memory Cache (TTL-bounded, size-bounded)
// ============================================================================

interface CacheEntry {
  coverage: ContentCoverage;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

const coverageCache = new Map<string, CacheEntry>();

/**
 * Prune expired entries from cache.
 */
function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of coverageCache.entries()) {
    if (entry.expiresAt < now) {
      coverageCache.delete(key);
    }
  }

  // If still over limit, remove oldest entries
  if (coverageCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(coverageCache.entries())
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt);

    const toRemove = entries.slice(0, coverageCache.size - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      coverageCache.delete(key);
    }
  }
}

/**
 * Store coverage result in cache.
 */
export function cacheCoverage(coverage: ContentCoverage): void {
  pruneCache();

  coverageCache.set(coverage.contentId, {
    coverage,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Get cached coverage for a content item.
 */
export function getCachedCoverage(contentId: string): ContentCoverage | null {
  const entry = coverageCache.get(contentId);
  if (!entry) return null;

  if (entry.expiresAt < Date.now()) {
    coverageCache.delete(contentId);
    return null;
  }

  return entry.coverage;
}

/**
 * Clear all cached coverage data.
 */
export function clearCoverageCache(): void {
  coverageCache.clear();
  logger.info('Coverage cache cleared');
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return {
    size: coverageCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL_MS,
  };
}

// ============================================================================
// Summary Computation (Direct from DB)
// ============================================================================

/**
 * Compute coverage summary across all content.
 * This queries the database directly for accurate counts.
 */
export async function computeCoverageSummary(): Promise<CoverageSummary> {
  if (!isIntelligenceCoverageEnabled()) {
    return {
      totalContent: 0,
      zeroEntityCount: 0,
      publishedNotIndexed: 0,
      aeoWithoutEntities: 0,
      averageCoverageScore: 0,
      scoreDistribution: {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
        critical: 0,
      },
      lastEvaluatedAt: null,
    };
  }

  try {
    // Total content count
    const totalResult = await db
      .select({ count: count() })
      .from(contents);
    const totalContent = totalResult[0]?.count || 0;

    // Published content count
    await db
      .select({ count: count() })
      .from(contents)
      .where(eq(contents.status, 'published'));
    // Content with AEO capsule
    await db
      .select({ count: count() })
      .from(contents)
      .where(isNotNull(contents.answerCapsule));
    // For entity counts, we need to check the entityTags table
    // This is a simplified query - in production we'd use a subquery
    const entityTagsQuery = await db.execute(sql`
      SELECT COUNT(DISTINCT et.entity_id) as count
      FROM entity_tags et
      INNER JOIN contents c ON c.id = et.entity_id
    `);
    const contentWithEntities = Number((entityTagsQuery.rows[0] as any)?.count || 0);

    // Published but not in search index
    const notIndexedQuery = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM contents c
      LEFT JOIN search_index si ON si.content_id = c.id
      WHERE c.status = 'published' AND si.content_id IS NULL
    `);
    const publishedNotIndexed = Number((notIndexedQuery.rows[0] as any)?.count || 0);

    // AEO without entities (content has answer_capsule but no entity tags)
    const aeoNoEntitiesQuery = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM contents c
      WHERE c.answer_capsule IS NOT NULL
        AND c.answer_capsule != ''
        AND NOT EXISTS (
          SELECT 1 FROM entity_tags et WHERE et.entity_id = c.id
        )
    `);
    const aeoWithoutEntities = Number((aeoNoEntitiesQuery.rows[0] as any)?.count || 0);

    // Zero entity content
    const zeroEntityCount = totalContent - contentWithEntities;

    // For score distribution, we use cached data if available
    // Otherwise return zeros (scores computed on-demand via evaluator)
    const cachedCoverages = Array.from(coverageCache.values())
      .map(e => e.coverage.coverageScore);

    const scoreDistribution = {
      excellent: cachedCoverages.filter(s => s >= 80).length,
      good: cachedCoverages.filter(s => s >= 60 && s < 80).length,
      fair: cachedCoverages.filter(s => s >= 40 && s < 60).length,
      poor: cachedCoverages.filter(s => s >= 20 && s < 40).length,
      critical: cachedCoverages.filter(s => s < 20).length,
    };

    const averageCoverageScore = cachedCoverages.length > 0
      ? Math.round(cachedCoverages.reduce((a, b) => a + b, 0) / cachedCoverages.length)
      : 0;

    // Find most recent evaluation timestamp from cache
    const lastEvaluatedAt = cachedCoverages.length > 0
      ? Array.from(coverageCache.values())
          .map(e => e.coverage.evaluatedAt)
          .sort((a, b) => b.getTime() - a.getTime())[0]
      : null;

    logger.info('Coverage summary computed', {
      totalContent,
      zeroEntityCount,
      publishedNotIndexed,
      aeoWithoutEntities,
    });

    return {
      totalContent,
      zeroEntityCount,
      publishedNotIndexed,
      aeoWithoutEntities,
      averageCoverageScore,
      scoreDistribution,
      lastEvaluatedAt,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to compute coverage summary', { error: errorMessage });

    return {
      totalContent: 0,
      zeroEntityCount: 0,
      publishedNotIndexed: 0,
      aeoWithoutEntities: 0,
      averageCoverageScore: 0,
      scoreDistribution: {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
        critical: 0,
      },
      lastEvaluatedAt: null,
    };
  }
}
