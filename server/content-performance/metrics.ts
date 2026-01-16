/**
 * Content Performance - Metrics Collection
 *
 * Collects and processes performance metrics.
 */

import { db } from '@db';
import { content, contentToSearchIndex } from '@db/schema';
import { eq } from 'drizzle-orm';
import { PerformanceMetrics } from './types';

/**
 * Get performance metrics for content.
 */
export async function getContentMetrics(
  contentId: string,
  periodDays: number = 30
): Promise<PerformanceMetrics | null> {
  // Get content
  const contentRecord = await db.query.content.findFirst({
    where: eq(content.id, contentId),
  });

  if (!contentRecord) {
    return null;
  }

  // Get search index data
  const searchData = await db.query.contentToSearchIndex.findFirst({
    where: eq(contentToSearchIndex.contentId, contentId),
  });

  // Build metrics from available data
  // In production, this would query analytics services
  const metrics: PerformanceMetrics = {
    contentId,
    impressions: (searchData as { impressions?: number })?.impressions ?? 0,
    clicks: (searchData as { clicks?: number })?.clicks ?? 0,
    ctr: 0,
    avgPosition: (searchData as { avgPosition?: number })?.avgPosition ?? 0,
    bounceRate: 0.5, // Default/mock
    avgDwellTime: 60, // Default/mock in seconds
    pageviews: 0,
    uniqueVisitors: 0,
    measuredAt: new Date(),
    periodDays,
  };

  // Calculate CTR
  if (metrics.impressions > 0) {
    metrics.ctr = metrics.clicks / metrics.impressions;
  }

  return metrics;
}

/**
 * Get metrics for all published content.
 */
export async function getAllContentMetrics(
  periodDays: number = 30,
  limit: number = 100
): Promise<PerformanceMetrics[]> {
  const publishedContent = await db.query.content.findMany({
    where: eq(content.status, 'published'),
    columns: { id: true },
    limit,
  });

  const metrics: PerformanceMetrics[] = [];

  for (const item of publishedContent) {
    const itemMetrics = await getContentMetrics(item.id, periodDays);
    if (itemMetrics) {
      metrics.push(itemMetrics);
    }
  }

  return metrics;
}

/**
 * Get content with low CTR.
 */
export async function getLowCtrContent(
  threshold: number = 0.02,
  minImpressions: number = 100,
  limit: number = 50
): Promise<PerformanceMetrics[]> {
  const allMetrics = await getAllContentMetrics(30, limit * 2);

  return allMetrics
    .filter(m => m.impressions >= minImpressions && m.ctr < threshold)
    .sort((a, b) => a.ctr - b.ctr)
    .slice(0, limit);
}

/**
 * Get content with high bounce rate.
 */
export async function getHighBounceContent(
  threshold: number = 0.80,
  limit: number = 50
): Promise<PerformanceMetrics[]> {
  const allMetrics = await getAllContentMetrics(30, limit * 2);

  return allMetrics
    .filter(m => m.bounceRate >= threshold)
    .sort((a, b) => b.bounceRate - a.bounceRate)
    .slice(0, limit);
}

/**
 * Get content with low dwell time.
 */
export async function getLowDwellContent(
  threshold: number = 30,
  limit: number = 50
): Promise<PerformanceMetrics[]> {
  const allMetrics = await getAllContentMetrics(30, limit * 2);

  return allMetrics
    .filter(m => m.avgDwellTime < threshold)
    .sort((a, b) => a.avgDwellTime - b.avgDwellTime)
    .slice(0, limit);
}

/**
 * Get content with impressions but no clicks.
 */
export async function getNoClickContent(
  minImpressions: number = 100,
  limit: number = 50
): Promise<PerformanceMetrics[]> {
  const allMetrics = await getAllContentMetrics(30, limit * 2);

  return allMetrics
    .filter(m => m.impressions >= minImpressions && m.clicks === 0)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, limit);
}

/**
 * Calculate aggregate metrics.
 */
export async function getAggregateMetrics(): Promise<{
  totalContent: number;
  avgCtr: number;
  avgBounceRate: number;
  avgDwellTime: number;
  totalImpressions: number;
  totalClicks: number;
}> {
  const allMetrics = await getAllContentMetrics(30, 1000);

  if (allMetrics.length === 0) {
    return {
      totalContent: 0,
      avgCtr: 0,
      avgBounceRate: 0,
      avgDwellTime: 0,
      totalImpressions: 0,
      totalClicks: 0,
    };
  }

  const totalImpressions = allMetrics.reduce((sum, m) => sum + m.impressions, 0);
  const totalClicks = allMetrics.reduce((sum, m) => sum + m.clicks, 0);

  return {
    totalContent: allMetrics.length,
    avgCtr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
    avgBounceRate: allMetrics.reduce((sum, m) => sum + m.bounceRate, 0) / allMetrics.length,
    avgDwellTime: allMetrics.reduce((sum, m) => sum + m.avgDwellTime, 0) / allMetrics.length,
    totalImpressions,
    totalClicks,
  };
}
