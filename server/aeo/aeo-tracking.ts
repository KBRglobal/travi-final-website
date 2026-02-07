/**
 * AEO Tracking Service
 * Tracks AI crawler visits, citations, and performance metrics
 */

import { db } from "../db";
import { aeoCitations, aeoCrawlerLogs, aeoPerformanceMetrics, contents } from "../../shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { identifyAICrawler, identifyAIReferrer } from "./aeo-static-files";
import { log } from "../lib/logger";

const aeoLogger = {
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[AEO] ${msg}`, undefined, data),
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[AEO] ${msg}`, data),
};

// Types
export interface CrawlerLogInput {
  userAgent: string;
  requestPath: string;
  statusCode: number;
  responseTime?: number;
  bytesServed?: number;
  ipAddress?: string;
  referer?: string;
}

export interface CitationInput {
  contentId: string;
  platform: "chatgpt" | "perplexity" | "google_aio" | "claude" | "bing_chat" | "gemini";
  query: string;
  citationType: "direct" | "paraphrase" | "reference" | "recommendation";
  citedText?: string;
  responseContext?: string;
  url?: string;
  position?: number;
  competitorsCited?: string[];
  sessionId?: string;
  userAgent?: string;
  ipCountry?: string;
}

export interface TrafficInput {
  contentId?: string;
  platform: string;
  referrer: string;
  userAgent?: string;
  ipCountry?: string;
  isConversion?: boolean;
  revenue?: number;
}

/**
 * Log an AI crawler visit
 */
export async function logCrawlerVisit(input: CrawlerLogInput): Promise<boolean> {
  const crawlerInfo = identifyAICrawler(input.userAgent);

  if (!crawlerInfo.isAICrawler) {
    return false; // Not an AI crawler
  }

  // Find content ID from path if possible
  let contentId: string | undefined;
  const pathMatch =
    /\/(attractions|hotels|dining|districts|articles|events|transport)\/([^/?]+)/.exec(
      input.requestPath
    );
  if (pathMatch) {
    const [, , slug] = pathMatch;
    const content = await db.query.contents.findFirst({
      where: eq(contents.slug, slug),
    });
    contentId = content?.id;
  }

  try {
    await db.insert(aeoCrawlerLogs).values({
      crawler: crawlerInfo.name,
      userAgent: input.userAgent,
      requestPath: input.requestPath,
      contentId,
      statusCode: input.statusCode,
      responseTime: input.responseTime,
      bytesServed: input.bytesServed,
      ipAddress: input.ipAddress,
      referer: input.referer,
    } as any);

    aeoLogger.info(`Crawler visit logged: ${crawlerInfo.name} -> ${input.requestPath}`);
    return true;
  } catch (error) {
    aeoLogger.error("Failed to log crawler visit", { error });
    return false;
  }
}

/**
 * Log a citation from an AI platform
 */
export async function logCitation(input: CitationInput): Promise<string | null> {
  try {
    const result = await db
      .insert(aeoCitations)
      .values({
        contentId: input.contentId,
        platform: input.platform,
        query: input.query,
        citationType: input.citationType,
        citedText: input.citedText,
        responseContext: input.responseContext,
        url: input.url,
        position: input.position,
        competitorsCited: input.competitorsCited || [],
        sessionId: input.sessionId,
        userAgent: input.userAgent,
        ipCountry: input.ipCountry,
      } as any)
      .returning({ id: aeoCitations.id });

    // Update citation count in answer capsule
    await db.execute(sql`
      UPDATE aeo_answer_capsules
      SET citation_count = citation_count + 1,
          last_query = ${input.query},
          updated_at = NOW()
      WHERE content_id = ${input.contentId}
    `);

    aeoLogger.info(`Citation logged: ${input.platform} for content ${input.contentId}`);
    return result[0]?.id || null;
  } catch (error) {
    aeoLogger.error("Failed to log citation", { error });
    return null;
  }
}

/**
 * Track AI traffic and conversions
 */
export async function trackAITraffic(input: TrafficInput): Promise<void> {
  const referrerInfo = identifyAIReferrer(input.referrer);

  if (!referrerInfo.isAIReferrer) {
    return; // Not AI traffic
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Upsert daily metrics
    const existingMetric = await db.query.aeoPerformanceMetrics.findFirst({
      where: and(
        eq(aeoPerformanceMetrics.date, today),
        eq(aeoPerformanceMetrics.platform, referrerInfo.platform as any),
        input.contentId
          ? eq(aeoPerformanceMetrics.contentId, input.contentId)
          : sql`${aeoPerformanceMetrics.contentId} IS NULL`
      ),
    });

    if (existingMetric) {
      await db
        .update(aeoPerformanceMetrics)
        .set({
          clickThroughs: sql`${aeoPerformanceMetrics.clickThroughs} + 1`,
          conversions: input.isConversion
            ? sql`${aeoPerformanceMetrics.conversions} + 1`
            : aeoPerformanceMetrics.conversions,
          revenue: input.revenue
            ? sql`${aeoPerformanceMetrics.revenue} + ${input.revenue}`
            : aeoPerformanceMetrics.revenue,
        } as any)
        .where(eq(aeoPerformanceMetrics.id, existingMetric.id));
    } else {
      await db.insert(aeoPerformanceMetrics).values({
        date: today,
        platform: referrerInfo.platform as any,
        contentId: input.contentId,
        clickThroughs: 1,
        conversions: input.isConversion ? 1 : 0,
        revenue: input.revenue || 0,
      } as any);
    }
  } catch (error) {
    aeoLogger.error("Failed to track AI traffic", { error });
  }
}

/**
 * Get AEO performance dashboard data
 */
export async function getAEODashboard(
  startDate: Date,
  endDate: Date
): Promise<{
  overview: {
    totalCitations: number;
    totalClickThroughs: number;
    totalConversions: number;
    totalRevenue: number;
    avgPosition: number;
  };
  byPlatform: Array<{
    platform: string;
    citations: number;
    clickThroughs: number;
    conversions: number;
    conversionRate: number;
  }>;
  topContent: Array<{
    contentId: string;
    title: string;
    citations: number;
    clickThroughs: number;
  }>;
  topQueries: Array<{
    query: string;
    count: number;
    platform: string;
  }>;
  crawlerActivity: Array<{
    crawler: string;
    visits: number;
    lastVisit: Date;
  }>;
  trends: Array<{
    date: string;
    citations: number;
    clickThroughs: number;
  }>;
}> {
  // Get metrics for date range
  const metrics = await db
    .select()
    .from(aeoPerformanceMetrics)
    .where(
      and(gte(aeoPerformanceMetrics.date, startDate), lte(aeoPerformanceMetrics.date, endDate))
    );

  // Get citations for date range
  const citations = await db
    .select()
    .from(aeoCitations)
    .where(and(gte(aeoCitations.detectedAt, startDate), lte(aeoCitations.detectedAt, endDate)));

  // Get crawler logs for date range
  const crawlerLogs = await db
    .select()
    .from(aeoCrawlerLogs)
    .where(and(gte(aeoCrawlerLogs.crawledAt, startDate), lte(aeoCrawlerLogs.crawledAt, endDate)));

  // Calculate overview
  const overview = {
    totalCitations: citations.length,
    totalClickThroughs: metrics.reduce((sum, m) => sum + (m.clickThroughs || 0), 0),
    totalConversions: metrics.reduce((sum, m) => sum + (m.conversions || 0), 0),
    totalRevenue: metrics.reduce((sum, m) => sum + (m.revenue || 0), 0),
    avgPosition: calculateAvgPosition(metrics),
  };

  // Aggregate by platform
  const platformMap = new Map<
    string,
    { citations: number; clickThroughs: number; conversions: number }
  >();
  for (const metric of metrics) {
    const existing = platformMap.get(metric.platform) || {
      citations: 0,
      clickThroughs: 0,
      conversions: 0,
    };
    platformMap.set(metric.platform, {
      citations: existing.citations + (metric.citations || 0),
      clickThroughs: existing.clickThroughs + (metric.clickThroughs || 0),
      conversions: existing.conversions + (metric.conversions || 0),
    });
  }
  for (const citation of citations) {
    const existing = platformMap.get(citation.platform) || {
      citations: 0,
      clickThroughs: 0,
      conversions: 0,
    };
    platformMap.set(citation.platform, {
      ...existing,
      citations: existing.citations + 1,
    });
  }

  const byPlatform = Array.from(platformMap.entries()).map(([platform, data]) => ({
    platform,
    ...data,
    conversionRate: data.clickThroughs > 0 ? (data.conversions / data.clickThroughs) * 100 : 0,
  }));

  // Get top content by citations
  const contentCitations = new Map<string, number>();
  for (const citation of citations) {
    contentCitations.set(citation.contentId, (contentCitations.get(citation.contentId) || 0) + 1);
  }

  const topContentIds = Array.from(contentCitations.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  const topContentData = await Promise.all(
    topContentIds.map(async contentId => {
      const content = await db.query.contents.findFirst({
        where: eq(contents.id, contentId),
      });
      const clickThroughs = metrics
        .filter(m => m.contentId === contentId)
        .reduce((sum, m) => sum + (m.clickThroughs || 0), 0);

      return {
        contentId,
        title: content?.title || "Unknown",
        citations: contentCitations.get(contentId) || 0,
        clickThroughs,
      };
    })
  );

  // Get top queries
  const queryMap = new Map<string, { count: number; platform: string }>();
  for (const citation of citations) {
    const key = citation.query.toLowerCase().trim();
    const existing = queryMap.get(key);
    if (!existing || existing.count < (queryMap.get(key)?.count || 0) + 1) {
      queryMap.set(key, {
        count: (existing?.count || 0) + 1,
        platform: citation.platform,
      });
    }
  }

  const topQueries = Array.from(queryMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([query, data]) => ({
      query,
      count: data.count,
      platform: data.platform,
    }));

  // Aggregate crawler activity
  const crawlerMap = new Map<string, { visits: number; lastVisit: Date }>();
  for (const log of crawlerLogs) {
    const existing = crawlerMap.get(log.crawler) || { visits: 0, lastVisit: new Date(0) };
    crawlerMap.set(log.crawler, {
      visits: existing.visits + 1,
      lastVisit: log.crawledAt! > existing.lastVisit ? log.crawledAt! : existing.lastVisit,
    });
  }

  const crawlerActivity = Array.from(crawlerMap.entries())
    .map(([crawler, data]) => ({
      crawler,
      visits: data.visits,
      lastVisit: data.lastVisit,
    }))
    .sort((a, b) => b.visits - a.visits);

  // Calculate daily trends
  const trendMap = new Map<string, { citations: number; clickThroughs: number }>();
  for (const metric of metrics) {
    const dateKey = metric.date.toISOString().split("T")[0];
    const existing = trendMap.get(dateKey) || { citations: 0, clickThroughs: 0 };
    trendMap.set(dateKey, {
      citations: existing.citations + (metric.citations || 0),
      clickThroughs: existing.clickThroughs + (metric.clickThroughs || 0),
    });
  }
  for (const citation of citations) {
    const dateKey = citation.detectedAt!.toISOString().split("T")[0];
    const existing = trendMap.get(dateKey) || { citations: 0, clickThroughs: 0 };
    trendMap.set(dateKey, {
      ...existing,
      citations: existing.citations + 1,
    });
  }

  const trends = Array.from(trendMap.entries())
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    overview,
    byPlatform,
    topContent: topContentData,
    topQueries,
    crawlerActivity,
    trends,
  };
}

/**
 * Calculate average position from metrics
 */
function calculateAvgPosition(metrics: any[]): number {
  const positions = metrics
    .map(m => m.avgPosition)
    .filter((p): p is number => p !== null && p !== undefined);

  if (positions.length === 0) return 0;
  return Math.round(positions.reduce((a, b) => a + b, 0) / positions.length) / 100;
}

/**
 * Get crawler statistics
 */
export async function getCrawlerStats(days: number = 30): Promise<{
  byCrawler: Array<{ crawler: string; count: number; percentage: number }>;
  byPath: Array<{ path: string; count: number }>;
  byStatus: Array<{ status: number; count: number }>;
  avgResponseTime: number;
  totalVisits: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await db
    .select()
    .from(aeoCrawlerLogs)
    .where(gte(aeoCrawlerLogs.crawledAt, startDate));

  const totalVisits = logs.length;

  // By crawler
  const crawlerCounts = new Map<string, number>();
  for (const log of logs) {
    crawlerCounts.set(log.crawler, (crawlerCounts.get(log.crawler) || 0) + 1);
  }
  const byCrawler = Array.from(crawlerCounts.entries())
    .map(([crawler, count]) => ({
      crawler,
      count,
      percentage: totalVisits > 0 ? (count / totalVisits) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // By path (aggregate to content types)
  const pathCounts = new Map<string, number>();
  for (const log of logs) {
    const pathMatch = /^\/([^/]+)/.exec(log.requestPath);
    const pathKey = pathMatch ? pathMatch[1] : "other";
    pathCounts.set(pathKey, (pathCounts.get(pathKey) || 0) + 1);
  }
  const byPath = Array.from(pathCounts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // By status
  const statusCounts = new Map<number, number>();
  for (const log of logs) {
    statusCounts.set(log.statusCode, (statusCounts.get(log.statusCode) || 0) + 1);
  }
  const byStatus = Array.from(statusCounts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => a.status - b.status);

  // Average response time
  const responseTimes = logs
    .map(l => l.responseTime)
    .filter((t): t is number => t !== null && t !== undefined);
  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  return {
    byCrawler,
    byPath,
    byStatus,
    avgResponseTime,
    totalVisits,
  };
}

/**
 * Get citation insights
 */
export async function getCitationInsights(days: number = 30): Promise<{
  totalCitations: number;
  byType: Array<{ type: string; count: number }>;
  byPlatform: Array<{ platform: string; count: number }>;
  topCitedContent: Array<{ contentId: string; title: string; count: number }>;
  commonQueries: Array<{ query: string; count: number }>;
  averagePosition: number;
  competitorMentions: Array<{ competitor: string; count: number }>;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const citationData = await db
    .select()
    .from(aeoCitations)
    .where(gte(aeoCitations.detectedAt, startDate));

  const totalCitations = citationData.length;

  // By type
  const typeCounts = new Map<string, number>();
  for (const c of citationData) {
    typeCounts.set(c.citationType, (typeCounts.get(c.citationType) || 0) + 1);
  }
  const byType = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // By platform
  const platformCounts = new Map<string, number>();
  for (const c of citationData) {
    platformCounts.set(c.platform, (platformCounts.get(c.platform) || 0) + 1);
  }
  const byPlatform = Array.from(platformCounts.entries())
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  // Top cited content
  const contentCounts = new Map<string, number>();
  for (const c of citationData) {
    contentCounts.set(c.contentId, (contentCounts.get(c.contentId) || 0) + 1);
  }
  const topContentIds = Array.from(contentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topCitedContent = await Promise.all(
    topContentIds.map(async ([contentId, count]) => {
      const content = await db.query.contents.findFirst({
        where: eq(contents.id, contentId),
      });
      return {
        contentId,
        title: content?.title || "Unknown",
        count,
      };
    })
  );

  // Common queries
  const queryCounts = new Map<string, number>();
  for (const c of citationData) {
    const normalized = c.query.toLowerCase().trim();
    queryCounts.set(normalized, (queryCounts.get(normalized) || 0) + 1);
  }
  const commonQueries = Array.from(queryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([query, count]) => ({ query, count }));

  // Average position
  const positions = citationData
    .map(c => c.position)
    .filter((p): p is number => p !== null && p !== undefined);
  const averagePosition =
    positions.length > 0
      ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
      : 0;

  // Competitor mentions
  const competitorCounts = new Map<string, number>();
  for (const c of citationData) {
    const competitors = (c.competitorsCited as string[]) || [];
    for (const comp of competitors) {
      competitorCounts.set(comp, (competitorCounts.get(comp) || 0) + 1);
    }
  }
  const competitorMentions = Array.from(competitorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([competitor, count]) => ({ competitor, count }));

  return {
    totalCitations,
    byType,
    byPlatform,
    topCitedContent,
    commonQueries,
    averagePosition,
    competitorMentions,
  };
}

/**
 * Express middleware for tracking AI crawler visits
 */
export function aeoTrackingMiddleware() {
  return async (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Store original end function
    const originalEnd = res.end;

    res.end = function (...args: any[]) {
      const responseTime = Date.now() - startTime;

      // Log crawler visit asynchronously
      logCrawlerVisit({
        userAgent: req.headers["user-agent"] || "",
        requestPath: req.path,
        statusCode: res.statusCode,
        responseTime,
        bytesServed: res.get("content-length")
          ? Number.parseInt(res.get("content-length"))
          : undefined,
        ipAddress: req.ip || req.connection?.remoteAddress,
        referer: req.headers["referer"],
      }).catch(() => {}); // Ignore errors

      // Track AI referrer traffic
      if (req.headers["referer"]) {
        trackAITraffic({
          contentId: req.params?.contentId,
          platform: identifyAIReferrer(req.headers["referer"]).platform,
          referrer: req.headers["referer"],
          userAgent: req.headers["user-agent"],
        }).catch(() => {}); // Ignore errors
      }

      return originalEnd.apply(res, args);
    };

    next();
  };
}
