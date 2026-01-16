/**
 * Admin Monetization Dashboard Routes
 * Feature Flag: ENABLE_MONETIZATION_DASHBOARD=true
 *
 * Endpoints:
 * - GET /api/admin/monetization/summary
 * - GET /api/admin/monetization/content/:id
 * - GET /api/admin/monetization/affiliates
 */

import { Router } from 'express';
import { createLogger } from '../lib/logger';
import { db } from '../db';
import { contents } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import {
  isMonetizationDashboardEnabled,
  getFeatureFlags,
  CACHE_CONFIG,
  TIMEOUTS,
  AFFILIATE_PARTNERS,
} from './config';
import {
  getZoneEngineStatus,
  resolveZones,
  getAllZones,
} from './commercial-zones-engine';
import {
  getAffiliateEngineStatus,
  makeAffiliateDecisions,
  getAllActivePartners,
} from './affiliate-decision-engine';
import {
  getTrackingStatus,
  getAggregateStats,
  getAttributionSummary,
  getRecentEvents,
} from './attribution-tracking';
import {
  getScoringStatus,
  calculateRevenueScore,
  getTopRevenueContent,
  classifyScore,
} from './revenue-scoring';
import type {
  MonetizationSummary,
  ContentMonetizationDetails,
  AffiliatePerformance,
  EntityReference,
  CacheEntry,
} from './types';

const logger = createLogger('monetization-admin');
const router = Router();

// ============================================================================
// Simple TTL Cache for Dashboard Data
// ============================================================================

class DashboardCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs = CACHE_CONFIG.dashboardSummary.ttlMs;
  private readonly maxSize = CACHE_CONFIG.dashboardSummary.maxSize;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set(key: string, value: unknown): void {
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

  clear(): void {
    this.cache.clear();
  }
}

const dashboardCache = new DashboardCache();

// ============================================================================
// Middleware: Check if dashboard is enabled
// ============================================================================

function requireDashboard(req: any, res: any, next: any) {
  if (!isMonetizationDashboardEnabled()) {
    return res.status(503).json({
      error: 'Monetization dashboard is disabled',
      message: 'Set ENABLE_MONETIZATION_DASHBOARD=true to enable',
    });
  }
  next();
}

// ============================================================================
// GET /api/admin/monetization/summary
// ============================================================================

router.get('/summary', requireDashboard, async (req, res) => {
  try {
    // Check cache
    const cached = dashboardCache.get<MonetizationSummary>('summary');
    if (cached) {
      return res.json(cached);
    }

    // Calculate summary with timeout
    const summaryPromise = new Promise<MonetizationSummary>(async (resolve) => {
      const timeoutId = setTimeout(() => {
        logger.warn({}, 'Summary calculation timeout');
        resolve(getEmptySummary());
      }, TIMEOUTS.dashboardQuery);

      try {
        const summary = await calculateSummary();
        clearTimeout(timeoutId);
        resolve(summary);
      } catch (error) {
        clearTimeout(timeoutId);
        logger.error({ error }, 'Summary calculation error');
        resolve(getEmptySummary());
      }
    });

    const summary = await summaryPromise;
    dashboardCache.set('summary', summary);

    res.json(summary);
  } catch (error) {
    logger.error({ error }, 'Failed to get monetization summary');
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

async function calculateSummary(): Promise<MonetizationSummary> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Get current period stats
  const currentStats = await getAggregateStats(thirtyDaysAgo, now);

  // Get previous period stats for growth calculation
  const previousStats = await getAggregateStats(sixtyDaysAgo, thirtyDaysAgo);

  // Calculate revenue growth
  let revenueGrowth = 0;
  if (previousStats && previousStats.revenue > 0 && currentStats) {
    revenueGrowth = ((currentStats.revenue - previousStats.revenue) / previousStats.revenue) * 100;
  }

  // Get top content
  const topContent = await getTopRevenueContent(10);

  // Get affiliate breakdown from recent events
  const recentEvents = getRecentEvents(1000);
  const byAffiliate = new Map<string, {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }>();

  for (const event of recentEvents) {
    const current = byAffiliate.get(event.affiliateId) || {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    };

    if (event.eventType === 'impression') current.impressions++;
    if (event.eventType === 'click') current.clicks++;
    if (event.eventType === 'conversion') {
      current.conversions++;
      current.revenue += event.value || 0;
    }

    byAffiliate.set(event.affiliateId, current);
  }

  // Get zone breakdown
  const zones = getAllZones();
  const byZone = new Map<string, { impressions: number; clicks: number; revenue: number }>();

  for (const event of recentEvents) {
    const current = byZone.get(event.zoneId) || { impressions: 0, clicks: 0, revenue: 0 };

    if (event.eventType === 'impression') current.impressions++;
    if (event.eventType === 'click') current.clicks++;
    if (event.eventType === 'conversion') current.revenue += event.value || 0;

    byZone.set(event.zoneId, current);
  }

  return {
    overview: {
      totalRevenue: currentStats?.revenue || 0,
      totalImpressions: currentStats?.impressions || 0,
      totalClicks: currentStats?.clicks || 0,
      totalConversions: currentStats?.conversions || 0,
      avgCTR: currentStats?.ctr || 0,
      avgConversionRate: currentStats?.conversionRate || 0,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
    },
    byAffiliate: Array.from(byAffiliate.entries()).map(([affiliateId, data]) => {
      const partner = AFFILIATE_PARTNERS[affiliateId as keyof typeof AFFILIATE_PARTNERS];
      return {
        affiliateId: affiliateId as any,
        affiliateName: partner?.name || affiliateId,
        ...data,
        ctr: data.impressions > 0 ? Math.round((data.clicks / data.impressions) * 10000) / 100 : 0,
        conversionRate: data.clicks > 0 ? Math.round((data.conversions / data.clicks) * 10000) / 100 : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue),
    byZone: Array.from(byZone.entries()).map(([zoneId, data]) => {
      const zone = zones.find(z => z.id === zoneId);
      return {
        zoneId,
        zoneName: zone?.id || zoneId,
        ...data,
      };
    }).sort((a, b) => b.revenue - a.revenue),
    topContent: topContent.map(score => ({
      contentId: score.contentId,
      title: score.contentId, // Would need content lookup for actual title
      revenue: score.factors.historicalRevenue,
      conversions: score.factors.historicalConversions,
      revenueScore: score.overallScore,
    })),
    period: {
      start: thirtyDaysAgo,
      end: now,
    },
    generatedAt: now,
  };
}

function getEmptySummary(): MonetizationSummary {
  const now = new Date();
  return {
    overview: {
      totalRevenue: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalConversions: 0,
      avgCTR: 0,
      avgConversionRate: 0,
      revenueGrowth: 0,
    },
    byAffiliate: [],
    byZone: [],
    topContent: [],
    period: {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      end: now,
    },
    generatedAt: now,
  };
}

// ============================================================================
// GET /api/admin/monetization/content/:id
// ============================================================================

router.get('/content/:id', requireDashboard, async (req, res) => {
  try {
    const { id } = req.params;

    // Get content info
    const [content] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, id))
      .limit(1);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Get revenue score
    const revenueScore = await calculateRevenueScore(id);

    // Get attribution
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const attribution = await getAttributionSummary(id, thirtyDaysAgo, now);

    // Resolve zones
    const entities: EntityReference[] = [];
    const blocks = content.blocks as unknown[];
    const zones = await resolveZones({
      contentId: id,
      contentType: content.type,
      contentLength: JSON.stringify(blocks).length,
      entities,
      pageUrl: `/${content.slug}`,
    });

    // Get affiliate decisions
    const affiliateResult = await makeAffiliateDecisions({
      contentId: id,
      contentType: content.type,
      entities,
    });

    // Generate recommendations
    const recommendations: string[] = [];
    if (revenueScore) {
      recommendations.push(...revenueScore.recommendations);
    }
    if (zones.length === 0) {
      recommendations.push('No commercial zones available - consider adding monetizable entities');
    }
    if (affiliateResult.decisions.length === 0) {
      recommendations.push('No affiliate partners matched - check entity types');
    }

    const details: ContentMonetizationDetails = {
      contentId: id,
      title: content.title,
      contentType: content.type,
      revenueScore: revenueScore || {
        contentId: id,
        overallScore: 0,
        components: {
          entityMonetizability: 0,
          trafficSignals: 0,
          conversionHistory: 0,
          contentQuality: 0,
          intentAlignment: 0,
        },
        factors: {
          monetizableEntityCount: 0,
          affiliateEligibleEntityCount: 0,
          historicalClicks: 0,
          historicalConversions: 0,
          historicalRevenue: 0,
        },
        recommendations: [],
        calculatedAt: new Date(),
      },
      attribution: attribution || {
        contentId: id,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        ctr: 0,
        conversionRate: 0,
        revenuePerImpression: 0,
        topAffiliates: [],
        byEntity: [],
        period: { start: thirtyDaysAgo, end: now },
      },
      activeZones: zones,
      affiliateDecisions: affiliateResult.decisions,
      recommendations,
    };

    res.json(details);
  } catch (error) {
    logger.error({ contentId: req.params.id, error }, 'Failed to get content monetization details');
    res.status(500).json({ error: 'Failed to get content details' });
  }
});

// ============================================================================
// GET /api/admin/monetization/affiliates
// ============================================================================

router.get('/affiliates', requireDashboard, async (req, res) => {
  try {
    const partners = getAllActivePartners();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get events for each partner
    const recentEvents = getRecentEvents(5000);

    const affiliatePerformance: AffiliatePerformance[] = partners.map(partner => {
      const partnerEvents = recentEvents.filter(e => e.affiliateId === partner.id);

      let impressions = 0;
      let clicks = 0;
      let conversions = 0;
      let revenue = 0;

      const byContent = new Map<string, { clicks: number; revenue: number }>();
      const byDate = new Map<string, { impressions: number; clicks: number; revenue: number }>();

      for (const event of partnerEvents) {
        if (event.eventType === 'impression') impressions++;
        if (event.eventType === 'click') clicks++;
        if (event.eventType === 'conversion') {
          conversions++;
          revenue += event.value || 0;
        }

        // By content
        if (event.eventType === 'click' || event.eventType === 'conversion') {
          const current = byContent.get(event.contentId) || { clicks: 0, revenue: 0 };
          if (event.eventType === 'click') current.clicks++;
          if (event.eventType === 'conversion') current.revenue += event.value || 0;
          byContent.set(event.contentId, current);
        }

        // By date
        const dateKey = event.timestamp.toISOString().split('T')[0];
        const dateStats = byDate.get(dateKey) || { impressions: 0, clicks: 0, revenue: 0 };
        if (event.eventType === 'impression') dateStats.impressions++;
        if (event.eventType === 'click') dateStats.clicks++;
        if (event.eventType === 'conversion') dateStats.revenue += event.value || 0;
        byDate.set(dateKey, dateStats);
      }

      return {
        affiliateId: partner.id,
        affiliateName: partner.name,
        status: partner.active ? 'active' : 'inactive',
        performance: {
          impressions,
          clicks,
          conversions,
          revenue,
          ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
          conversionRate: clicks > 0 ? Math.round((conversions / clicks) * 10000) / 100 : 0,
          avgOrderValue: conversions > 0 ? Math.round((revenue / conversions) * 100) / 100 : 0,
        },
        topContent: Array.from(byContent.entries())
          .map(([contentId, data]) => ({
            contentId,
            title: contentId, // Would need content lookup
            ...data,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        trend: Array.from(byDate.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      } as AffiliatePerformance;
    });

    res.json({
      affiliates: affiliatePerformance.sort((a, b) => b.performance.revenue - a.performance.revenue),
      generatedAt: now,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get affiliate performance');
    res.status(500).json({ error: 'Failed to get affiliate data' });
  }
});

// ============================================================================
// GET /api/admin/monetization/status
// ============================================================================

router.get('/status', async (req, res) => {
  try {
    const status = {
      features: getFeatureFlags(),
      engines: {
        zones: getZoneEngineStatus(),
        affiliate: getAffiliateEngineStatus(),
        tracking: getTrackingStatus(),
        scoring: getScoringStatus(),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get monetization status');
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// ============================================================================
// POST /api/admin/monetization/cache/clear
// ============================================================================

router.post('/cache/clear', requireDashboard, async (req, res) => {
  try {
    dashboardCache.clear();

    // Import cache clearing functions dynamically to avoid circular deps
    const { clearZoneCache } = await import('./commercial-zones-engine');
    const { clearDecisionCache } = await import('./affiliate-decision-engine');
    const { clearScoreCache } = await import('./revenue-scoring');

    clearZoneCache();
    clearDecisionCache();
    clearScoreCache();

    logger.info({}, 'All monetization caches cleared');

    res.json({ success: true, message: 'All caches cleared' });
  } catch (error) {
    logger.error({ error }, 'Failed to clear caches');
    res.status(500).json({ error: 'Failed to clear caches' });
  }
});

// ============================================================================
// GET /api/admin/monetization/top-content
// ============================================================================

router.get('/top-content', requireDashboard, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const topContent = await getTopRevenueContent(limit);

    // Enrich with content titles
    const enrichedContent = await Promise.all(
      topContent.map(async (score) => {
        const [content] = await db
          .select({ title: contents.title, slug: contents.slug })
          .from(contents)
          .where(eq(contents.id, score.contentId))
          .limit(1);

        return {
          ...score,
          title: content?.title || 'Unknown',
          slug: content?.slug || '',
          classification: classifyScore(score.overallScore),
        };
      })
    );

    res.json({
      content: enrichedContent,
      generatedAt: new Date(),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get top content');
    res.status(500).json({ error: 'Failed to get top content' });
  }
});

// ============================================================================
// Export Router
// ============================================================================

export const monetizationAdminRouter = router;
export default router;
