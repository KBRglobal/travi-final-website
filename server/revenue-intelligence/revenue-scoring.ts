/**
 * Revenue-Aware Content Scoring
 * Feature Flag: ENABLE_REVENUE_SCORING=true
 *
 * Computes revenue potential score per content based on:
 * - Entity monetizability
 * - Traffic signals
 * - Conversion history
 * - Content quality metrics
 * - Intent alignment
 */

import { createLogger } from '../lib/logger';
import { db } from '../db';
import { contents, analyticsEvents, contentViews } from '@shared/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import {
  isRevenueScoringEnabled,
  REVENUE_SCORING_CONFIG,
  CACHE_CONFIG,
  TIMEOUTS,
} from './config';
import { getAttributionSummary } from './attribution-tracking';
import type {
  ContentRevenueScore,
  EntityReference,
  CacheEntry,
  CacheStats,
} from './types';

const logger = createLogger('revenue-scoring');

// ============================================================================
// Bounded LRU Cache for Revenue Scores
// ============================================================================

class RevenueScoreCache {
  private cache = new Map<string, CacheEntry<ContentRevenueScore>>();
  private stats = { hits: 0, misses: 0 };
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize: number, ttlMs: number) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): ContentRevenueScore | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    // Move to end for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: ContentRevenueScore): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
      createdAt: Date.now(),
    });
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }
}

const scoreCache = new RevenueScoreCache(
  CACHE_CONFIG.revenueScores.maxSize,
  CACHE_CONFIG.revenueScores.ttlMs
);

// ============================================================================
// Entity Extraction (Simplified)
// ============================================================================

/**
 * Extract monetizable entities from content
 * In production, this would integrate with entity recognition system
 */
function extractEntities(content: {
  type: string;
  blocks?: unknown[];
  metadata?: Record<string, unknown>;
}): EntityReference[] {
  const entities: EntityReference[] = [];
  const contentType = content.type || 'article';

  // Extract entities from metadata if available
  const metadataEntities = ((content as any).metadata?.entities || []) as Array<{
    id: string;
    type: string;
    name: string;
    monetizable?: boolean;
    affiliateEligible?: boolean;
  }>;

  for (const entity of metadataEntities) {
    entities.push({
      id: entity.id,
      type: entity.type,
      name: entity.name,
      monetizable: entity.monetizable ?? isMonetizableType(entity.type),
      affiliateEligible: entity.affiliateEligible ?? isAffiliateEligible(entity.type),
    });
  }

  // If no entities in metadata, infer from content type
  if (entities.length === 0) {
    if (['hotel', 'accommodation'].includes(contentType)) {
      entities.push({
        id: 'inferred-hotel',
        type: 'hotel',
        name: 'Hotel',
        monetizable: true,
        affiliateEligible: true,
      });
    } else if (['experience', 'tour', 'activity'].includes(contentType)) {
      entities.push({
        id: 'inferred-experience',
        type: 'experience',
        name: 'Experience',
        monetizable: true,
        affiliateEligible: true,
      });
    }
  }

  return entities;
}

function isMonetizableType(type: string): boolean {
  const monetizableTypes = [
    'hotel', 'accommodation', 'experience', 'tour', 'activity',
    'restaurant', 'attraction', 'product', 'gear',
  ];
  return monetizableTypes.includes(type.toLowerCase());
}

function isAffiliateEligible(type: string): boolean {
  const affiliateTypes = [
    'hotel', 'accommodation', 'experience', 'tour', 'activity', 'product', 'gear',
  ];
  return affiliateTypes.includes(type.toLowerCase());
}

// ============================================================================
// Score Components Calculation
// ============================================================================

/**
 * Calculate entity monetizability score (0-100)
 */
function calculateEntityMonetizabilityScore(entities: EntityReference[]): number {
  if (entities.length === 0) return 0;

  const monetizableCount = entities.filter(e => e.monetizable).length;
  const affiliateCount = entities.filter(e => e.affiliateEligible).length;

  // Score based on count and eligibility
  const baseScore = Math.min(100, monetizableCount * 20);
  const affiliateBonus = Math.min(50, affiliateCount * 15);

  return Math.min(100, baseScore + affiliateBonus);
}

/**
 * Calculate traffic signals score (0-100)
 */
async function calculateTrafficScore(contentId: string): Promise<{
  score: number;
  avgSessionDuration?: number;
  bounceRate?: number;
}> {
  try {
    // Get recent views
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [viewStats] = await db
      .select({
        views: sql<number>`count(*)::int`,
        avgDuration: sql<number>`avg(EXTRACT(EPOCH FROM (${contentViews.createdAt} - ${contentViews.createdAt})))::int`,
      })
      .from(contentViews)
      .where(
        and(
          eq(contentViews.contentId, contentId),
          gte(contentViews.createdAt, thirtyDaysAgo)
        )
      );

    const viewCount = viewStats?.views || 0;

    // Score based on view volume (logarithmic scale)
    let score = 0;
    if (viewCount > 0) {
      score = Math.min(100, Math.log10(viewCount + 1) * 30);
    }

    return {
      score,
      avgSessionDuration: viewStats?.avgDuration || undefined,
    };
  } catch (error) {
    logger.warn({ contentId, error }, 'Failed to calculate traffic score');
    return { score: 0 };
  }
}

/**
 * Calculate conversion history score (0-100)
 */
async function calculateConversionScore(contentId: string): Promise<{
  score: number;
  clicks: number;
  conversions: number;
  revenue: number;
}> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const attribution = await getAttributionSummary(contentId, thirtyDaysAgo, now);

    if (!attribution) {
      return { score: 0, clicks: 0, conversions: 0, revenue: 0 };
    }

    // Score based on conversion rate and revenue
    let score = 0;

    // Conversion rate contribution (up to 40 points)
    score += Math.min(40, attribution.conversionRate * 4);

    // Revenue contribution (up to 40 points, logarithmic)
    if (attribution.revenue > 0) {
      score += Math.min(40, Math.log10(attribution.revenue + 1) * 15);
    }

    // Click volume contribution (up to 20 points)
    if (attribution.clicks > 0) {
      score += Math.min(20, Math.log10(attribution.clicks + 1) * 10);
    }

    return {
      score: Math.min(100, score),
      clicks: attribution.clicks,
      conversions: attribution.conversions,
      revenue: attribution.revenue,
    };
  } catch (error) {
    logger.warn({ contentId, error }, 'Failed to calculate conversion score');
    return { score: 0, clicks: 0, conversions: 0, revenue: 0 };
  }
}

/**
 * Calculate content quality score (0-100)
 * Based on length, structure, and completeness
 */
function calculateContentQualityScore(content: {
  blocks?: unknown[];
  title?: string;
  metaDescription?: string;
}): number {
  let score = 0;

  // Title presence and quality
  if (content.title) {
    score += 10;
    if (content.title.length >= 30 && content.title.length <= 60) {
      score += 10;
    }
  }

  // Meta description
  if (content.metaDescription) {
    score += 10;
    if (content.metaDescription.length >= 120 && content.metaDescription.length <= 160) {
      score += 10;
    }
  }

  // Content blocks/length
  const blockCount = (content.blocks as unknown[])?.length || 0;
  if (blockCount > 0) {
    score += Math.min(40, blockCount * 2);
  }

  // Completeness bonus
  if (content.title && content.metaDescription && blockCount >= 5) {
    score += 20;
  }

  return Math.min(100, score);
}

/**
 * Calculate intent alignment score (0-100)
 * How well the content aligns with commercial intent
 */
function calculateIntentAlignmentScore(content: {
  type: string;
  title?: string;
  metadata?: Record<string, unknown>;
}): number {
  let score = 50; // Baseline

  // Content type alignment
  const highIntentTypes = ['hotel', 'experience', 'tour', 'activity', 'product'];
  if (highIntentTypes.includes(content.type)) {
    score += 30;
  }

  // Title keywords
  const commercialKeywords = [
    'book', 'buy', 'best', 'top', 'review', 'compare', 'price',
    'deal', 'discount', 'guide', 'how to',
  ];
  const titleLower = (content.title || '').toLowerCase();
  const keywordMatches = commercialKeywords.filter(kw => titleLower.includes(kw));
  score += Math.min(20, keywordMatches.length * 5);

  return Math.min(100, score);
}

// ============================================================================
// Main Scoring Function
// ============================================================================

/**
 * Calculate revenue potential score for content
 */
export async function calculateRevenueScore(
  contentId: string
): Promise<ContentRevenueScore | null> {
  if (!isRevenueScoringEnabled()) {
    logger.debug({ contentId }, 'Revenue scoring disabled');
    return null;
  }

  // Check cache
  const cached = scoreCache.get(contentId);
  if (cached) {
    logger.debug({ contentId, cached: true }, 'Revenue score cache hit');
    return cached;
  }

  // Calculate with timeout
  const calculateWithTimeout = new Promise<ContentRevenueScore | null>((resolve) => {
    const timeoutId = setTimeout(() => {
      logger.warn({ contentId }, 'Revenue score calculation timeout');
      resolve(null);
    }, TIMEOUTS.scoringCalculation);

    calculateScoreInternal(contentId)
      .then((score) => {
        clearTimeout(timeoutId);
        resolve(score);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        logger.error({ contentId, error }, 'Revenue score calculation error');
        resolve(null);
      });
  });

  const result = await calculateWithTimeout;

  if (result) {
    scoreCache.set(contentId, result);
  }

  return result;
}

async function calculateScoreInternal(contentId: string): Promise<ContentRevenueScore | null> {
  // Fetch content
  const [content] = await db
    .select()
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  if (!content) {
    logger.warn({ contentId }, 'Content not found for scoring');
    return null;
  }

  // Extract entities
  const entities = extractEntities({
    type: content.type,
    blocks: content.blocks as unknown[],
    metadata: content.seoScore as Record<string, unknown>,
  });

  // Calculate component scores
  const entityScore = calculateEntityMonetizabilityScore(entities);
  const trafficResult = await calculateTrafficScore(contentId);
  const conversionResult = await calculateConversionScore(contentId);
  const qualityScore = calculateContentQualityScore({
    blocks: content.blocks as unknown[],
    title: content.title,
    metaDescription: content.metaDescription || undefined,
  });
  const intentScore = calculateIntentAlignmentScore({
    type: content.type,
    title: content.title,
    metadata: content.seoScore as Record<string, unknown>,
  });

  // Weighted overall score
  const { weights } = REVENUE_SCORING_CONFIG;
  const overallScore =
    entityScore * weights.entityMonetizability +
    trafficResult.score * weights.trafficSignals +
    conversionResult.score * weights.conversionHistory +
    qualityScore * weights.contentQuality +
    intentScore * weights.intentAlignment;

  // Generate recommendations
  const recommendations: string[] = [];

  if (entityScore < 50) {
    recommendations.push('Add more monetizable entities (hotels, experiences, products)');
  }
  if (trafficResult.score < 30) {
    recommendations.push('Improve SEO to increase organic traffic');
  }
  if (conversionResult.score < 30 && conversionResult.clicks > 10) {
    recommendations.push('Optimize affiliate placements for better conversion');
  }
  if (qualityScore < 50) {
    recommendations.push('Improve content quality: add more sections, better meta description');
  }
  if (intentScore < 50) {
    recommendations.push('Align content with commercial intent keywords');
  }

  const score: ContentRevenueScore = {
    contentId,
    overallScore: Math.round(overallScore * 100) / 100,
    components: {
      entityMonetizability: Math.round(entityScore),
      trafficSignals: Math.round(trafficResult.score),
      conversionHistory: Math.round(conversionResult.score),
      contentQuality: Math.round(qualityScore),
      intentAlignment: Math.round(intentScore),
    },
    factors: {
      monetizableEntityCount: entities.filter(e => e.monetizable).length,
      affiliateEligibleEntityCount: entities.filter(e => e.affiliateEligible).length,
      historicalClicks: conversionResult.clicks,
      historicalConversions: conversionResult.conversions,
      historicalRevenue: conversionResult.revenue,
      avgSessionDuration: trafficResult.avgSessionDuration,
    },
    recommendations,
    calculatedAt: new Date(),
  };

  logger.info({
    contentId,
    overallScore: score.overallScore,
    components: score.components,
  }, 'Revenue score calculated');

  return score;
}

// ============================================================================
// Batch Scoring
// ============================================================================

/**
 * Calculate scores for multiple content items
 */
export async function calculateBatchScores(
  contentIds: string[],
  concurrency: number = 5
): Promise<Map<string, ContentRevenueScore>> {
  const results = new Map<string, ContentRevenueScore>();

  // Process in batches
  for (let i = 0; i < contentIds.length; i += concurrency) {
    const batch = contentIds.slice(i, i + concurrency);
    const batchPromises = batch.map(id =>
      calculateRevenueScore(id).then(score => ({ id, score }))
    );

    const batchResults = await Promise.all(batchPromises);

    for (const { id, score } of batchResults) {
      if (score) {
        results.set(id, score);
      }
    }
  }

  return results;
}

/**
 * Get top revenue potential content
 */
export async function getTopRevenueContent(
  limit: number = 20
): Promise<ContentRevenueScore[]> {
  if (!isRevenueScoringEnabled()) {
    return [];
  }

  try {
    // Get published content
    const recentContent = await db
      .select({ id: contents.id })
      .from(contents)
      .where(eq(contents.status, 'published'))
      .orderBy(desc(contents.updatedAt))
      .limit(100); // Score top 100 recent content

    const contentIds = recentContent.map(c => c.id);
    const scores = await calculateBatchScores(contentIds, 10);

    // Sort by overall score
    return Array.from(scores.values())
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);
  } catch (error) {
    logger.error({ error }, 'Failed to get top revenue content');
    return [];
  }
}

// ============================================================================
// Cache Management
// ============================================================================

export function getScoreCacheStats(): CacheStats {
  return scoreCache.getStats();
}

export function clearScoreCache(): void {
  scoreCache.clear();
  logger.info({}, 'Revenue score cache cleared');
}

export function invalidateScore(contentId: string): void {
  scoreCache.clear(); // Simple approach - clear all (could optimize to single key)
  logger.debug({ contentId }, 'Revenue score invalidated');
}

// ============================================================================
// Scoring Status
// ============================================================================

export interface ScoringStatus {
  enabled: boolean;
  config: typeof REVENUE_SCORING_CONFIG;
  cacheStats: CacheStats;
}

export function getScoringStatus(): ScoringStatus {
  return {
    enabled: isRevenueScoringEnabled(),
    config: REVENUE_SCORING_CONFIG,
    cacheStats: getScoreCacheStats(),
  };
}

// ============================================================================
// Score Classification
// ============================================================================

export function classifyScore(score: number): 'high' | 'medium' | 'low' {
  const { thresholds } = REVENUE_SCORING_CONFIG;

  if (score >= thresholds.highPotential) return 'high';
  if (score >= thresholds.mediumPotential) return 'medium';
  return 'low';
}

export function getScoreColor(score: number): string {
  const classification = classifyScore(score);
  switch (classification) {
    case 'high': return '#22c55e'; // green
    case 'medium': return '#f59e0b'; // amber
    case 'low': return '#ef4444'; // red
  }
}
