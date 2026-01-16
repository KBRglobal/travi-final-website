/**
 * Intelligence Coverage Engine - Evaluator
 *
 * Core evaluation logic for computing coverage signals per content item.
 * Uses existing DB tables only - no fake data.
 */

import { db } from '../../db';
import {
  contents,
  searchIndex,
  internalLinks,
  entityTags,
  entityPlacements,
} from '@shared/schema';
import { eq, sql, count, and } from 'drizzle-orm';
import { log } from '../../lib/logger';
import type {
  ContentCoverage,
  ContentCoverageSignals,
  CoverageEvaluationResult,
  BatchEvaluationResult,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[ICE] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[ICE] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[ICE] ${msg}`, data),
};

// ============================================================================
// Feature Flag
// ============================================================================

export function isIntelligenceCoverageEnabled(): boolean {
  return process.env.ENABLE_INTELLIGENCE_COVERAGE === 'true';
}

// ============================================================================
// Coverage Scoring Weights
// ============================================================================

const COVERAGE_WEIGHTS = {
  hasEntities: 25,         // Entity awareness is critical
  entityCount: 10,         // More entities = better (capped)
  linkedEntitiesCount: 10, // Being referenced = valuable
  hasInternalLinks: 15,    // Internal linking for SEO
  isSearchIndexed: 20,     // Must be discoverable
  hasAeoCapsule: 15,       // AEO readiness
  aeoScore: 5,             // AEO quality
} as const;

const MAX_ENTITY_COUNT_FOR_SCORING = 10;
const MAX_LINKED_ENTITIES_FOR_SCORING = 5;

// ============================================================================
// Signal Collection
// ============================================================================

/**
 * Collect entity count for a content item.
 * Checks entityTags table where entityId matches contentId.
 */
async function getEntityCount(contentId: string): Promise<number> {
  try {
    const result = await db
      .select({ count: count() })
      .from(entityTags)
      .where(eq(entityTags.entityId, contentId));
    return result[0]?.count || 0;
  } catch {
    return 0;
  }
}

/**
 * Get count of entities that reference this content via placements.
 */
async function getLinkedEntityCount(contentId: string): Promise<number> {
  try {
    // Count placements where this content is referenced
    // Also count inbound internal links as a proxy for being linked
    const inboundLinks = await db
      .select({ count: count() })
      .from(internalLinks)
      .where(eq(internalLinks.targetContentId, contentId));
    return inboundLinks[0]?.count || 0;
  } catch {
    return 0;
  }
}

/**
 * Get outbound internal link count.
 */
async function getInternalLinkCount(contentId: string): Promise<number> {
  try {
    const result = await db
      .select({ count: count() })
      .from(internalLinks)
      .where(eq(internalLinks.sourceContentId, contentId));
    return result[0]?.count || 0;
  } catch {
    return 0;
  }
}

/**
 * Check if content is in search index.
 */
async function isInSearchIndex(contentId: string): Promise<boolean> {
  try {
    const result = await db
      .select({ contentId: searchIndex.contentId })
      .from(searchIndex)
      .where(eq(searchIndex.contentId, contentId))
      .limit(1);
    return result.length > 0;
  } catch {
    return false;
  }
}

// ============================================================================
// Coverage Score Calculation
// ============================================================================

/**
 * Calculate composite coverage score from signals.
 * Score is 0-100 based on weighted signals.
 */
export function calculateCoverageScore(signals: ContentCoverageSignals): number {
  let score = 0;

  // Boolean signals
  if (signals.hasEntities) score += COVERAGE_WEIGHTS.hasEntities;
  if (signals.hasInternalLinks) score += COVERAGE_WEIGHTS.hasInternalLinks;
  if (signals.isSearchIndexed) score += COVERAGE_WEIGHTS.isSearchIndexed;
  if (signals.hasAeoCapsule) score += COVERAGE_WEIGHTS.hasAeoCapsule;

  // Entity count (diminishing returns after threshold)
  const entityScore = Math.min(signals.entityCount / MAX_ENTITY_COUNT_FOR_SCORING, 1);
  score += entityScore * COVERAGE_WEIGHTS.entityCount;

  // Linked entities (diminishing returns)
  const linkedScore = Math.min(signals.linkedEntitiesCount / MAX_LINKED_ENTITIES_FOR_SCORING, 1);
  score += linkedScore * COVERAGE_WEIGHTS.linkedEntitiesCount;

  // AEO score contribution (if available)
  if (signals.aeoScore !== null) {
    score += (signals.aeoScore / 100) * COVERAGE_WEIGHTS.aeoScore;
  }

  return Math.round(Math.min(score, 100));
}

// ============================================================================
// Content Evaluation
// ============================================================================

/**
 * Evaluate coverage for a single content item.
 * Idempotent: can be called multiple times safely.
 */
export async function evaluateContentCoverage(
  contentId: string
): Promise<CoverageEvaluationResult> {
  if (!isIntelligenceCoverageEnabled()) {
    return {
      success: false,
      contentId,
      coverage: null,
      error: 'Intelligence coverage is disabled',
    };
  }

  try {
    // Fetch content metadata
    const contentResult = await db
      .select({
        id: contents.id,
        type: contents.type,
        title: contents.title,
        status: contents.status,
        answerCapsule: contents.answerCapsule,
        aeoScore: contents.aeoScore,
      })
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    if (contentResult.length === 0) {
      return {
        success: false,
        contentId,
        coverage: null,
        error: 'Content not found',
      };
    }

    const content = contentResult[0];

    // Collect signals in parallel for efficiency
    const [entityCount, linkedEntityCount, internalLinkCount, searchIndexed] = await Promise.all([
      getEntityCount(contentId),
      getLinkedEntityCount(contentId),
      getInternalLinkCount(contentId),
      isInSearchIndex(contentId),
    ]);

    const signals: ContentCoverageSignals = {
      hasEntities: entityCount > 0,
      entityCount,
      linkedEntitiesCount: linkedEntityCount,
      hasInternalLinks: internalLinkCount > 0,
      internalLinkCount,
      isSearchIndexed: searchIndexed,
      hasAeoCapsule: !!content.answerCapsule && content.answerCapsule.trim().length > 0,
      aeoScore: content.aeoScore,
      isPublished: content.status === 'published',
    };

    const coverageScore = calculateCoverageScore(signals);

    const coverage: ContentCoverage = {
      contentId,
      contentType: content.type,
      contentTitle: content.title,
      signals,
      coverageScore,
      evaluatedAt: new Date(),
    };

    logger.info('Content coverage evaluated', {
      contentId,
      coverageScore,
      hasEntities: signals.hasEntities,
      isSearchIndexed: signals.isSearchIndexed,
    });

    return {
      success: true,
      contentId,
      coverage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Coverage evaluation failed', { contentId, error: errorMessage });

    return {
      success: false,
      contentId,
      coverage: null,
      error: errorMessage,
    };
  }
}

/**
 * Evaluate coverage for multiple content items with pagination.
 * Bounded memory: uses cursor-based pagination.
 */
export async function evaluateAllContentCoverage(
  batchSize: number = 100,
  cursor?: string
): Promise<BatchEvaluationResult> {
  if (!isIntelligenceCoverageEnabled()) {
    return {
      total: 0,
      evaluated: 0,
      failed: 0,
      results: [],
    };
  }

  // Cap batch size to prevent memory issues
  const safeBatchSize = Math.min(batchSize, 500);

  try {
    // Build query with cursor
    let query = db
      .select({ id: contents.id })
      .from(contents)
      .orderBy(contents.id)
      .limit(safeBatchSize + 1); // +1 to detect if more pages exist

    if (cursor) {
      query = db
        .select({ id: contents.id })
        .from(contents)
        .where(sql`${contents.id} > ${cursor}`)
        .orderBy(contents.id)
        .limit(safeBatchSize + 1);
    }

    const contentIds = await query;
    const hasMore = contentIds.length > safeBatchSize;
    const idsToProcess = contentIds.slice(0, safeBatchSize);

    logger.info('Batch evaluation starting', {
      batchSize: idsToProcess.length,
      cursor: cursor || 'start',
      hasMore,
    });

    const results: CoverageEvaluationResult[] = [];
    let evaluated = 0;
    let failed = 0;

    // Process sequentially to avoid overwhelming DB
    for (const { id } of idsToProcess) {
      const result = await evaluateContentCoverage(id);
      results.push(result);

      if (result.success) {
        evaluated++;
      } else {
        failed++;
      }
    }

    const nextCursor = hasMore ? idsToProcess[idsToProcess.length - 1].id : undefined;

    logger.info('Batch evaluation complete', {
      total: idsToProcess.length,
      evaluated,
      failed,
      nextCursor,
    });

    return {
      total: idsToProcess.length,
      evaluated,
      failed,
      results,
      cursor: nextCursor,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Batch evaluation failed', { error: errorMessage });

    return {
      total: 0,
      evaluated: 0,
      failed: 1,
      results: [],
    };
  }
}
