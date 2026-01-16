/**
 * Revenue Intelligence Layer - Content Value
 * Calculates revenue contribution per content
 */

import { db } from '../db';
import { contents } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  ContentValueScore,
  DEFAULT_REVENUE_CONFIG,
} from './types';
import { getAttributionForContent, getRevenueEvents, getTotalRevenue } from './attribution';

// Cache for content value scores
const contentValueCache = new Map<string, { score: ContentValueScore; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function calculateContentValue(
  contentId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ContentValueScore> {
  // Check cache
  const cacheKey = `${contentId}-${startDate?.getTime()}-${endDate?.getTime()}`;
  const cached = contentValueCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.score;
  }

  const attribution = getAttributionForContent(contentId, startDate, endDate);

  // Get pageview data from content metadata (simplified)
  const [content] = await db
    .select()
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  const metadata = (content as any)?.metadata || {};
  const pageviews = metadata.pageviews || 1;

  const score: ContentValueScore = {
    contentId,
    directRevenue: attribution.directRevenue,
    assistedRevenue: attribution.assistedRevenue,
    totalRevenue: attribution.totalRevenue,
    conversions: attribution.conversions,
    assists: attribution.assists,
    averageOrderValue: attribution.conversions > 0
      ? attribution.directRevenue / attribution.conversions
      : 0,
    roiScore: calculateRoiScore(attribution.totalRevenue, pageviews),
    valuePerView: pageviews > 0 ? attribution.totalRevenue / pageviews : 0,
    lastUpdated: new Date(),
  };

  // Cache result
  contentValueCache.set(cacheKey, {
    score,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return score;
}

function calculateRoiScore(revenue: number, pageviews: number): number {
  // Simple ROI score based on revenue per view
  // Normalized to 0-100 scale
  const valuePerView = pageviews > 0 ? revenue / pageviews : 0;

  // Assume $1 per view is excellent (100 score)
  return Math.min(100, Math.round(valuePerView * 100));
}

export async function getTopEarners(limit = 20): Promise<ContentValueScore[]> {
  // Get all content IDs
  const allContent = await db
    .select({ id: contents.id })
    .from(contents)
    .where(eq(contents.status, 'published'))
    .limit(500);

  const scores: ContentValueScore[] = [];

  for (const content of allContent) {
    const score = await calculateContentValue(content.id);
    if (score.totalRevenue > 0) {
      scores.push(score);
    }
  }

  return scores
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

export async function getZeroConverters(limit = 50): Promise<string[]> {
  // Get content with traffic but no conversions
  const allContent = await db
    .select({ id: contents.id })
    .from(contents)
    .where(eq(contents.status, 'published'))
    .limit(500);

  const zeroConverters: string[] = [];

  for (const content of allContent) {
    const score = await calculateContentValue(content.id);
    const metadata = (content as any)?.metadata || {};
    const pageviews = metadata.pageviews || 0;

    // Has traffic but no revenue
    if (pageviews > 100 && score.totalRevenue === 0) {
      zeroConverters.push(content.id);
    }
  }

  return zeroConverters.slice(0, limit);
}

export async function getContentRoiReport(): Promise<{
  highRoi: ContentValueScore[];
  lowRoi: ContentValueScore[];
  averageRoi: number;
}> {
  const allContent = await db
    .select({ id: contents.id })
    .from(contents)
    .where(eq(contents.status, 'published'))
    .limit(500);

  const allScores: ContentValueScore[] = [];

  for (const content of allContent) {
    const score = await calculateContentValue(content.id);
    allScores.push(score);
  }

  const scoredContent = allScores.filter(s => s.conversions >= DEFAULT_REVENUE_CONFIG.minConversionsForRoi);

  const averageRoi = scoredContent.length > 0
    ? scoredContent.reduce((sum, s) => sum + s.roiScore, 0) / scoredContent.length
    : 0;

  return {
    highRoi: scoredContent
      .filter(s => s.roiScore > averageRoi)
      .sort((a, b) => b.roiScore - a.roiScore)
      .slice(0, 20),
    lowRoi: scoredContent
      .filter(s => s.roiScore < averageRoi)
      .sort((a, b) => a.roiScore - b.roiScore)
      .slice(0, 20),
    averageRoi,
  };
}

export async function getContentValueTrend(
  contentId: string,
  periodDays = 30
): Promise<Array<{ date: string; revenue: number; conversions: number }>> {
  const trend: Array<{ date: string; revenue: number; conversions: number }> = [];

  for (let i = periodDays - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const events = getRevenueEvents({
      contentId,
      startDate: date,
      endDate,
    });

    trend.push({
      date: date.toISOString().split('T')[0],
      revenue: events.reduce((sum, e) => sum + e.amount, 0),
      conversions: events.length,
    });
  }

  return trend;
}

export function invalidateContentValueCache(contentId?: string): void {
  if (contentId) {
    for (const key of contentValueCache.keys()) {
      if (key.startsWith(contentId)) {
        contentValueCache.delete(key);
      }
    }
  } else {
    contentValueCache.clear();
  }
}
