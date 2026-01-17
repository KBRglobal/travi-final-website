/**
 * Automated Content Refresh Engine - Core Engine
 * Feature Flag: ENABLE_CONTENT_REFRESH_ENGINE=true
 */

import { createLogger } from '../lib/logger';
import { db } from '../db';
import { contents, contentViews, analyticsEvents } from '@shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { isContentRefreshEnabled, REFRESH_CONFIG, scoreToPriority } from './config';
import type {
  ContentRefreshAnalysis,
  RefreshSignal,
  RefreshReasonCode,
  RefreshMetrics,
  RefreshJob,
  RefreshSummary,
} from './types';

const logger = createLogger('content-refresh-engine');

// ============================================================================
// Cache
// ============================================================================

class RefreshCache {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly maxSize = 500;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  clear(): void {
    this.cache.clear();
  }
}

const refreshCache = new RefreshCache();

// ============================================================================
// Metrics Collection
// ============================================================================

async function getContentMetrics(contentId: string): Promise<RefreshMetrics | null> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get content info
    const [content] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    if (!content) return null;

    const publishedAt = content.publishedAt || content.createdAt;
    const ageInDays = Math.floor(
      (now.getTime() - publishedAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Get traffic for last 30 days
    const [trafficLast30] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contentViews)
      .where(
        and(
          eq(contentViews.contentId, contentId),
          gte((contentViews as any).createdAt, thirtyDaysAgo)
        )
      );

    // Get traffic for previous 30 days
    const [trafficPrev30] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contentViews)
      .where(
        and(
          eq(contentViews.contentId, contentId),
          gte((contentViews as any).createdAt, sixtyDaysAgo),
          lte((contentViews as any).createdAt, thirtyDaysAgo)
        )
      );

    const trafficLast = trafficLast30?.count || 0;
    const trafficPrev = trafficPrev30?.count || 0;
    const trafficChange = trafficPrev > 0
      ? ((trafficLast - trafficPrev) / trafficPrev) * 100
      : 0;

    // Get revenue events
    const [revenueLast30] = await db
      .select({ total: sql<number>`COALESCE(SUM((${(analyticsEvents as any).properties}->>'value')::numeric), 0)::int` })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.contentId, contentId),
          eq(analyticsEvents.eventType as any, 'revenue.conversion'),
          gte(analyticsEvents.timestamp, thirtyDaysAgo)
        )
      );

    const [revenuePrev30] = await db
      .select({ total: sql<number>`COALESCE(SUM((${(analyticsEvents as any).properties}->>'value')::numeric), 0)::int` })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.contentId, contentId),
          eq(analyticsEvents.eventType as any, 'revenue.conversion'),
          gte(analyticsEvents.timestamp, sixtyDaysAgo),
          lte(analyticsEvents.timestamp, thirtyDaysAgo)
        )
      );

    const revenueLast = revenueLast30?.total || 0;
    const revenuePrev = revenuePrev30?.total || 0;
    const revenueChange = revenuePrev > 0
      ? ((revenueLast - revenuePrev) / revenuePrev) * 100
      : 0;

    // Get zero search associations (searches with no results that led to this content)
    const [zeroSearches] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.contentId, contentId),
          sql`${(analyticsEvents as any).properties}->>'resultCount' = '0'`,
          gte(analyticsEvents.timestamp, thirtyDaysAgo)
        )
      );

    return {
      ageInDays,
      trafficLast30Days: trafficLast,
      trafficPrev30Days: trafficPrev,
      trafficChangePercent: Math.round(trafficChange * 100) / 100,
      zeroSearchAssociations: zeroSearches?.count || 0,
      revenueLast30Days: revenueLast,
      revenuePrev30Days: revenuePrev,
      revenueChangePercent: Math.round(revenueChange * 100) / 100,
      avgTimeOnPage: 0, // Would need more detailed tracking
      bounceRate: 0,    // Would need more detailed tracking
    };
  } catch (error) {
    logger.error({ error, contentId }, 'Failed to get content metrics');
    return null;
  }
}

// ============================================================================
// Signal Calculation
// ============================================================================

function calculateSignals(metrics: RefreshMetrics): RefreshSignal[] {
  const signals: RefreshSignal[] = [];
  const { freshnessThresholds, trafficDropThresholds, revenueDropThresholds, signalWeights } = REFRESH_CONFIG;

  // Stale content signal
  signals.push({
    code: 'stale_content',
    weight: signalWeights.stale_content,
    description: 'Content age since last update',
    value: metrics.ageInDays,
    threshold: freshnessThresholds.medium,
    triggered: metrics.ageInDays >= freshnessThresholds.medium,
  });

  // Traffic drop signal
  signals.push({
    code: 'traffic_drop',
    weight: signalWeights.traffic_drop,
    description: 'Traffic change compared to previous period',
    value: metrics.trafficChangePercent,
    threshold: trafficDropThresholds.medium,
    triggered: metrics.trafficChangePercent <= trafficDropThresholds.medium,
  });

  // Zero search results signal
  signals.push({
    code: 'zero_search_results',
    weight: signalWeights.zero_search_results,
    description: 'Associated with searches returning no results',
    value: metrics.zeroSearchAssociations,
    threshold: 5,
    triggered: metrics.zeroSearchAssociations >= 5,
  });

  // Revenue decline signal
  signals.push({
    code: 'revenue_decline',
    weight: signalWeights.revenue_decline,
    description: 'Revenue change compared to previous period',
    value: metrics.revenueChangePercent,
    threshold: revenueDropThresholds.medium,
    triggered: metrics.revenueChangePercent <= revenueDropThresholds.medium,
  });

  // Low engagement signal
  signals.push({
    code: 'low_engagement',
    weight: signalWeights.low_engagement,
    description: 'Low user engagement metrics',
    value: metrics.bounceRate,
    threshold: 70,
    triggered: metrics.bounceRate >= 70,
  });

  return signals;
}

// ============================================================================
// Refresh Score Calculation
// ============================================================================

export function calculateRefreshScore(signals: RefreshSignal[]): number {
  let score = 0;
  let maxScore = 0;

  for (const signal of signals) {
    maxScore += signal.weight;
    if (signal.triggered) {
      // Scale contribution based on how much over threshold
      let contribution = signal.weight;

      if (signal.code === 'stale_content') {
        const severityMultiplier = Math.min(2, signal.value / signal.threshold);
        contribution *= severityMultiplier;
      } else if (signal.code === 'traffic_drop' || signal.code === 'revenue_decline') {
        const dropSeverity = Math.abs(signal.value) / Math.abs(signal.threshold);
        contribution *= Math.min(2, dropSeverity);
      }

      score += contribution;
    }
  }

  // Normalize to 0-100
  return Math.min(100, Math.round((score / maxScore) * 100));
}

// ============================================================================
// Analyze Content
// ============================================================================

export async function analyzeContent(contentId: string): Promise<ContentRefreshAnalysis | null> {
  if (!isContentRefreshEnabled()) {
    return null;
  }

  const cacheKey = `refresh:${contentId}`;
  const cached = refreshCache.get<ContentRefreshAnalysis>(cacheKey);
  if (cached) return cached;

  try {
    const [content] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    if (!content) return null;

    const metrics = await getContentMetrics(contentId);
    if (!metrics) return null;

    const signals = calculateSignals(metrics);
    const refreshScore = calculateRefreshScore(signals);
    const triggeredReasons = signals
      .filter(s => s.triggered)
      .map(s => s.code);

    const priority = scoreToPriority(refreshScore);

    // Generate recommended action
    let recommendedAction = 'No immediate action needed';
    if (priority === 'critical') {
      recommendedAction = 'Urgent content refresh required - significant decline detected';
    } else if (priority === 'high') {
      recommendedAction = 'Schedule content refresh within the next 2 weeks';
    } else if (priority === 'medium') {
      recommendedAction = 'Review content for potential improvements';
    }

    const analysis: ContentRefreshAnalysis = {
      contentId,
      contentTitle: content.title,
      contentType: content.type,
      publishedAt: content.publishedAt || content.createdAt,
      lastUpdatedAt: content.updatedAt,
      refreshScore,
      signals,
      triggeredReasons,
      priority,
      recommendedAction,
      analyzedAt: new Date(),
    };

    refreshCache.set(cacheKey, analysis, REFRESH_CONFIG.cacheTtl);

    return analysis;
  } catch (error) {
    logger.error({ error, contentId }, 'Failed to analyze content');
    return null;
  }
}

// ============================================================================
// Generate Refresh Jobs (No Mutation)
// ============================================================================

export async function generateRefreshJobs(limit: number = 50): Promise<RefreshJob[]> {
  if (!isContentRefreshEnabled()) {
    return [];
  }

  try {
    // Get published content
    const contentList = await db
      .select({ id: contents.id, title: contents.title })
      .from(contents)
      .where(eq(contents.status, 'published'))
      .orderBy(desc(contents.updatedAt))
      .limit(limit * 2); // Analyze more to find ones needing refresh

    const jobs: RefreshJob[] = [];

    for (const content of contentList) {
      if (jobs.length >= limit) break;

      const analysis = await analyzeContent(content.id);
      if (analysis && analysis.priority !== 'low') {
        jobs.push({
          id: `job_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
          contentId: content.id,
          contentTitle: content.title,
          priority: analysis.priority,
          reasons: analysis.triggeredReasons,
          suggestedActions: generateSuggestedActions(analysis),
          estimatedImpact: estimateImpact(analysis),
          createdAt: new Date(),
        });
      }
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    jobs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return jobs;
  } catch (error) {
    logger.error({ error }, 'Failed to generate refresh jobs');
    return [];
  }
}

function generateSuggestedActions(analysis: ContentRefreshAnalysis): string[] {
  const actions: string[] = [];

  if (analysis.triggeredReasons.includes('stale_content')) {
    actions.push('Update content with fresh information and current data');
  }
  if (analysis.triggeredReasons.includes('traffic_drop')) {
    actions.push('Review SEO optimization and keyword targeting');
    actions.push('Update internal linking structure');
  }
  if (analysis.triggeredReasons.includes('zero_search_results')) {
    actions.push('Add content addressing related search queries');
  }
  if (analysis.triggeredReasons.includes('revenue_decline')) {
    actions.push('Review affiliate links and CTAs');
    actions.push('Update product recommendations');
  }

  return actions.length > 0 ? actions : ['General content review and update'];
}

function estimateImpact(analysis: ContentRefreshAnalysis): string {
  if (analysis.priority === 'critical') {
    return 'High potential for traffic and revenue recovery';
  }
  if (analysis.priority === 'high') {
    return 'Moderate improvement expected in engagement metrics';
  }
  return 'Incremental improvement in content quality';
}

// ============================================================================
// Get Refresh Summary
// ============================================================================

export async function getRefreshSummary(): Promise<RefreshSummary | null> {
  if (!isContentRefreshEnabled()) {
    return null;
  }

  const cacheKey = 'refresh:summary';
  const cached = refreshCache.get<RefreshSummary>(cacheKey);
  if (cached) return cached;

  try {
    const contentList = await db
      .select({ id: contents.id })
      .from(contents)
      .where(eq(contents.status, 'published'))
      .limit(200);

    const analyses: ContentRefreshAnalysis[] = [];

    for (const content of contentList) {
      const analysis = await analyzeContent(content.id);
      if (analysis) analyses.push(analysis);
    }

    const needsRefresh = analyses.filter(a => a.priority !== 'low').length;
    const byPriority = {
      critical: analyses.filter(a => a.priority === 'critical').length,
      high: analyses.filter(a => a.priority === 'high').length,
      medium: analyses.filter(a => a.priority === 'medium').length,
      low: analyses.filter(a => a.priority === 'low').length,
    };

    const reasonCounts = new Map<RefreshReasonCode, number>();
    for (const analysis of analyses) {
      for (const reason of analysis.triggeredReasons) {
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
      }
    }

    const topReasons = Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    const avgScore = analyses.length > 0
      ? analyses.reduce((sum, a) => sum + a.refreshScore, 0) / analyses.length
      : 0;

    const summary: RefreshSummary = {
      totalAnalyzed: analyses.length,
      needsRefresh,
      byPriority,
      topReasons,
      avgRefreshScore: Math.round(avgScore),
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    };

    refreshCache.set(cacheKey, summary, REFRESH_CONFIG.cacheTtl);

    return summary;
  } catch (error) {
    logger.error({ error }, 'Failed to get refresh summary');
    return null;
  }
}

// ============================================================================
// Engine Status
// ============================================================================

export function getRefreshEngineStatus() {
  return {
    enabled: isContentRefreshEnabled(),
    config: {
      freshnessThresholds: REFRESH_CONFIG.freshnessThresholds,
      priorityThresholds: REFRESH_CONFIG.priorityThresholds,
    },
  };
}

export function clearRefreshCache(): void {
  refreshCache.clear();
}
