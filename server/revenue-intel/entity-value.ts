/**
 * Revenue Intelligence Layer - Entity Value
 * Calculates revenue contribution per entity
 */

import { db } from '../db';
import { contents } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import {
  EntityValueScore,
  DEFAULT_REVENUE_CONFIG,
} from './types';
import { getRevenueEvents, calculateAttribution } from './attribution';

// Cache for entity value scores
const entityValueCache = new Map<string, { score: EntityValueScore; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Entity to content mapping cache
const entityContentMap = new Map<string, Set<string>>();

export function registerEntityContent(entityId: string, contentId: string): void {
  const contentIds = entityContentMap.get(entityId) || new Set();
  contentIds.add(contentId);
  entityContentMap.set(entityId, contentIds);
}

export function getContentForEntity(entityId: string): string[] {
  return Array.from(entityContentMap.get(entityId) || []);
}

export async function calculateEntityValue(
  entityId: string,
  entityName: string,
  startDate?: Date,
  endDate?: Date
): Promise<EntityValueScore> {
  // Check cache
  const cacheKey = `${entityId}-${startDate?.getTime()}-${endDate?.getTime()}`;
  const cached = entityValueCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.score;
  }

  const contentIds = getContentForEntity(entityId);
  let directRevenue = 0;
  let assistedRevenue = 0;
  let conversions = 0;

  // Get events associated with this entity's content
  const events = getRevenueEvents({
    entityId,
    startDate,
    endDate,
  });

  // Calculate attribution for entity-linked events
  for (const event of events) {
    if (event.entityId === entityId) {
      // Direct entity attribution
      directRevenue += event.amount;
      conversions++;
    } else {
      // Check if any touchpoint contains entity content
      for (const tp of event.touchpoints) {
        if (contentIds.includes(tp.contentId)) {
          const attribution = calculateAttribution(event);
          const attributedAmount = attribution.get(tp.contentId) || 0;
          assistedRevenue += attributedAmount;
        }
      }
    }
  }

  // Get total pageviews across entity content
  let totalPageviews = 0;
  for (const contentId of contentIds) {
    const [content] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    const metadata = (content as any)?.metadata || {};
    totalPageviews += metadata.pageviews || 0;
  }

  const totalRevenue = directRevenue + assistedRevenue;
  const conversionRate = totalPageviews > 0 ? (conversions / totalPageviews) * 100 : 0;

  const score: EntityValueScore = {
    entityId,
    entityName,
    directRevenue,
    assistedRevenue,
    totalRevenue,
    contentCount: contentIds.length,
    conversionRate,
    roiScore: calculateEntityRoiScore(totalRevenue, contentIds.length),
    lastUpdated: new Date(),
  };

  // Cache result
  entityValueCache.set(cacheKey, {
    score,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return score;
}

function calculateEntityRoiScore(revenue: number, contentCount: number): number {
  if (contentCount === 0) return 0;

  // Score based on revenue per content piece
  const revenuePerContent = revenue / contentCount;

  // Assume $100 per content is excellent (100 score)
  return Math.min(100, Math.round(revenuePerContent));
}

export async function getTopEntities(limit = 20): Promise<EntityValueScore[]> {
  const entityScores: EntityValueScore[] = [];

  for (const [entityId, contentIds] of entityContentMap) {
    // Get entity name from first content piece
    const firstContentId = Array.from(contentIds)[0];
    let entityName = entityId;

    if (firstContentId) {
      const [content] = await db
        .select()
        .from(contents)
        .where(eq(contents.id, firstContentId))
        .limit(1);

      entityName = (content as any)?.metadata?.entityName || entityId;
    }

    const score = await calculateEntityValue(entityId, entityName);
    if (score.totalRevenue > 0) {
      entityScores.push(score);
    }
  }

  return entityScores
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

export async function getUnderperformingEntities(limit = 20): Promise<EntityValueScore[]> {
  const entityScores: EntityValueScore[] = [];

  for (const [entityId, contentIds] of entityContentMap) {
    const firstContentId = Array.from(contentIds)[0];
    let entityName = entityId;

    if (firstContentId) {
      const [content] = await db
        .select()
        .from(contents)
        .where(eq(contents.id, firstContentId))
        .limit(1);

      entityName = (content as any)?.metadata?.entityName || entityId;
    }

    const score = await calculateEntityValue(entityId, entityName);

    // Has content but low revenue
    if (score.contentCount >= 3 && score.roiScore < 20) {
      entityScores.push(score);
    }
  }

  return entityScores
    .sort((a, b) => a.roiScore - b.roiScore)
    .slice(0, limit);
}

export function getEntityPerformanceComparison(entityIds: string[]): Promise<EntityValueScore[]> {
  return Promise.all(
    entityIds.map(async id => {
      const score = await calculateEntityValue(id, id);
      return score;
    })
  );
}

export function invalidateEntityValueCache(entityId?: string): void {
  if (entityId) {
    for (const key of entityValueCache.keys()) {
      if (key.startsWith(entityId)) {
        entityValueCache.delete(key);
      }
    }
  } else {
    entityValueCache.clear();
  }
}

export function getEntityStats(): {
  totalEntities: number;
  entitiesWithContent: number;
  averageContentPerEntity: number;
} {
  const totalEntities = entityContentMap.size;
  const entitiesWithContent = Array.from(entityContentMap.values()).filter(s => s.size > 0).length;
  const totalContent = Array.from(entityContentMap.values()).reduce((sum, s) => sum + s.size, 0);

  return {
    totalEntities,
    entitiesWithContent,
    averageContentPerEntity: totalEntities > 0 ? totalContent / totalEntities : 0,
  };
}
