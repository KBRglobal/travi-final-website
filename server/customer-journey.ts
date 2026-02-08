/**
 * Customer Journey Analytics
 * Comprehensive tracking system for user behavior and conversion optimization
 */

import { db } from "./db";
import { sql, eq, desc, and, gte, lte, count, avg } from "drizzle-orm";
import { analyticsEvents, type InsertAnalyticsEvent } from "@shared/schema";

// ============================================================================
// ANALYTICS EVENT TYPES
// ============================================================================

export type EventType =
  | "page_view"
  | "click"
  | "scroll"
  | "form_start"
  | "form_submit"
  | "form_abandon"
  | "cta_click"
  | "outbound_link"
  | "search"
  | "filter"
  | "share"
  | "video_play"
  | "video_complete"
  | "download"
  | "copy"
  | "print"
  | "add_to_favorites"
  | "exit_intent"
  | "conversion"
  | "engagement";

export interface AnalyticsEvent {
  sessionId: string;
  visitorId: string;
  eventType: EventType;
  eventName: string;
  timestamp: Date;
  pageUrl: string;
  pagePath: string;
  pageTitle?: string;
  referrer?: string;

  // Element details
  elementId?: string;
  elementClass?: string;
  elementText?: string;
  elementHref?: string;

  // Position data
  scrollDepth?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  clickX?: number;
  clickY?: number;

  // Session data
  timeOnPage?: number;
  pageLoadTime?: number;
  isNewSession?: boolean;
  isNewVisitor?: boolean;

  // User context
  userAgent?: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  browser?: string;
  os?: string;
  language?: string;
  country?: string;
  city?: string;

  // Content context
  contentId?: string;
  contentType?: string;
  contentTitle?: string;

  // UTM parameters
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  // Custom data
  metadata?: Record<string, any>;
}

export interface PageViewSummary {
  pagePath: string;
  pageTitle: string;
  views: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
  avgScrollDepth: number;
  bounceRate: number;
  exitRate: number;
}

export interface UserJourney {
  visitorId: string;
  sessionId: string;
  startTime: Date;
  endTime: Date;
  totalPages: number;
  totalEvents: number;
  duration: number;
  events: AnalyticsEvent[];
  conversionPath: string[];
  converted: boolean;
  conversionType?: string;
}

export interface ConversionFunnel {
  name: string;
  steps: Array<{
    name: string;
    visitors: number;
    dropoff: number;
    dropoffRate: number;
  }>;
  overallConversionRate: number;
}

// ============================================================================
// IN-MEMORY EVENT STORE (for real-time + batch to DB)
// ============================================================================

interface EventBatch {
  events: AnalyticsEvent[];
  lastFlushed: Date;
}

const eventStore: EventBatch = {
  events: [],
  lastFlushed: new Date(),
};

const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 30000; // 30 seconds

// ============================================================================
// HELPERS
// ============================================================================

/** Map a DB analytics event row to the AnalyticsEvent type */
function mapDbEventToAnalyticsEvent(e: typeof analyticsEvents.$inferSelect): AnalyticsEvent {
  return {
    sessionId: e.sessionId,
    visitorId: e.visitorId,
    eventType: e.eventType as EventType,
    eventName: e.eventName || "",
    timestamp: e.timestamp,
    pageUrl: e.pageUrl || "",
    pagePath: e.pagePath || "",
    pageTitle: e.pageTitle || undefined,
    referrer: e.referrer || undefined,
    elementId: e.elementId || undefined,
    elementClass: e.elementClass || undefined,
    elementText: e.elementText || undefined,
    elementHref: e.elementHref || undefined,
    scrollDepth: e.scrollDepth || undefined,
    viewportWidth: e.viewportWidth || undefined,
    viewportHeight: e.viewportHeight || undefined,
    clickX: e.clickX || undefined,
    clickY: e.clickY || undefined,
    timeOnPage: e.timeOnPage || undefined,
    pageLoadTime: e.pageLoadTime || undefined,
    isNewSession: e.isNewSession || undefined,
    isNewVisitor: e.isNewVisitor || undefined,
    userAgent: e.userAgent || undefined,
    deviceType: e.deviceType as AnalyticsEvent["deviceType"],
    browser: e.browser || undefined,
    os: e.os || undefined,
    language: e.language || undefined,
    country: e.country || undefined,
    city: e.city || undefined,
    contentId: e.contentId || undefined,
    contentType: e.contentType || undefined,
    contentTitle: e.contentTitle || undefined,
    utmSource: e.utmSource || undefined,
    utmMedium: e.utmMedium || undefined,
    utmCampaign: e.utmCampaign || undefined,
    utmTerm: e.utmTerm || undefined,
    utmContent: e.utmContent || undefined,
    metadata: e.metadata as Record<string, any>,
  };
}

// ============================================================================
// CUSTOMER JOURNEY ANALYTICS SERVICE
// ============================================================================

export const customerJourney = {
  /**
   * Track a single event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Validate required fields
    if (!event.sessionId || !event.visitorId || !event.eventType) {
      return;
    }

    // Add to batch
    eventStore.events.push({
      ...event,
      timestamp: event.timestamp || new Date(),
    });

    // Auto-flush if batch is full
    if (eventStore.events.length >= BATCH_SIZE) {
      await this.flushEvents();
    }
  },

  /**
   * Track page view with automatic engagement metrics
   */
  async trackPageView(data: {
    sessionId: string;
    visitorId: string;
    pageUrl: string;
    pagePath: string;
    pageTitle?: string;
    referrer?: string;
    contentId?: string;
    contentType?: string;
    userAgent?: string;
    language?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }): Promise<void> {
    const event: AnalyticsEvent = {
      sessionId: data.sessionId,
      visitorId: data.visitorId,
      eventType: "page_view",
      eventName: `View: ${data.pageTitle || data.pagePath}`,
      timestamp: new Date(),
      pageUrl: data.pageUrl,
      pagePath: data.pagePath,
      pageTitle: data.pageTitle,
      referrer: data.referrer,
      contentId: data.contentId,
      contentType: data.contentType,
      userAgent: data.userAgent,
      language: data.language,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      deviceType: this.getDeviceType(data.userAgent),
      browser: this.getBrowser(data.userAgent),
      os: this.getOS(data.userAgent),
    };

    await this.trackEvent(event);
  },

  /**
   * Track click event
   */
  async trackClick(data: {
    sessionId: string;
    visitorId: string;
    pageUrl: string;
    pagePath: string;
    elementId?: string;
    elementClass?: string;
    elementText?: string;
    elementHref?: string;
    clickX?: number;
    clickY?: number;
    eventName?: string;
  }): Promise<void> {
    const event: AnalyticsEvent = {
      sessionId: data.sessionId,
      visitorId: data.visitorId,
      eventType: "click",
      eventName: data.eventName || `Click: ${data.elementText || data.elementId || "element"}`,
      timestamp: new Date(),
      pageUrl: data.pageUrl,
      pagePath: data.pagePath,
      elementId: data.elementId,
      elementClass: data.elementClass,
      elementText: data.elementText?.substring(0, 100),
      elementHref: data.elementHref,
      clickX: data.clickX,
      clickY: data.clickY,
    };

    await this.trackEvent(event);
  },

  /**
   * Track CTA click (booking, signup, etc.)
   */
  async trackCtaClick(data: {
    sessionId: string;
    visitorId: string;
    pageUrl: string;
    pagePath: string;
    ctaName: string;
    ctaDestination?: string;
    contentId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const event: AnalyticsEvent = {
      sessionId: data.sessionId,
      visitorId: data.visitorId,
      eventType: "cta_click",
      eventName: `CTA: ${data.ctaName}`,
      timestamp: new Date(),
      pageUrl: data.pageUrl,
      pagePath: data.pagePath,
      elementHref: data.ctaDestination,
      contentId: data.contentId,
      metadata: data.metadata,
    };

    await this.trackEvent(event);
  },

  /**
   * Track scroll depth
   */
  async trackScroll(data: {
    sessionId: string;
    visitorId: string;
    pageUrl: string;
    pagePath: string;
    scrollDepth: number;
    timeOnPage: number;
  }): Promise<void> {
    const event: AnalyticsEvent = {
      sessionId: data.sessionId,
      visitorId: data.visitorId,
      eventType: "scroll",
      eventName: `Scroll: ${data.scrollDepth}%`,
      timestamp: new Date(),
      pageUrl: data.pageUrl,
      pagePath: data.pagePath,
      scrollDepth: data.scrollDepth,
      timeOnPage: data.timeOnPage,
    };

    await this.trackEvent(event);
  },

  /**
   * Track conversion
   */
  async trackConversion(data: {
    sessionId: string;
    visitorId: string;
    pageUrl: string;
    pagePath: string;
    conversionType: string;
    conversionValue?: number;
    contentId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const event: AnalyticsEvent = {
      sessionId: data.sessionId,
      visitorId: data.visitorId,
      eventType: "conversion",
      eventName: `Conversion: ${data.conversionType}`,
      timestamp: new Date(),
      pageUrl: data.pageUrl,
      pagePath: data.pagePath,
      contentId: data.contentId,
      metadata: {
        ...data.metadata,
        conversionType: data.conversionType,
        conversionValue: data.conversionValue,
      },
    };

    await this.trackEvent(event);
  },

  /**
   * Flush events to database
   */
  async flushEvents(): Promise<number> {
    if (eventStore.events.length === 0) return 0;

    const eventsToFlush = [...eventStore.events];
    eventStore.events = [];
    eventStore.lastFlushed = new Date();

    try {
      // Map events to database schema format
      const dbEvents: InsertAnalyticsEvent[] = eventsToFlush.map(event => ({
        sessionId: event.sessionId,
        visitorId: event.visitorId,
        eventType: event.eventType as InsertAnalyticsEvent["eventType"],
        eventName: event.eventName,
        timestamp: event.timestamp,
        pageUrl: event.pageUrl,
        pagePath: event.pagePath,
        pageTitle: event.pageTitle,
        referrer: event.referrer,
        elementId: event.elementId,
        elementClass: event.elementClass,
        elementText: event.elementText,
        elementHref: event.elementHref,
        scrollDepth: event.scrollDepth,
        viewportWidth: event.viewportWidth,
        viewportHeight: event.viewportHeight,
        clickX: event.clickX,
        clickY: event.clickY,
        timeOnPage: event.timeOnPage,
        pageLoadTime: event.pageLoadTime,
        isNewSession: event.isNewSession,
        isNewVisitor: event.isNewVisitor,
        userAgent: event.userAgent,
        deviceType: event.deviceType,
        browser: event.browser,
        os: event.os,
        language: event.language,
        country: event.country,
        city: event.city,
        contentId: event.contentId,
        contentType: event.contentType,
        contentTitle: event.contentTitle,
        utmSource: event.utmSource,
        utmMedium: event.utmMedium,
        utmCampaign: event.utmCampaign,
        utmTerm: event.utmTerm,
        utmContent: event.utmContent,
        metadata: event.metadata as Record<string, unknown>,
      }));

      // Batch insert events to database
      await db.insert(analyticsEvents).values(dbEvents);

      return eventsToFlush.length;
    } catch {
      // On error, put events back

      eventStore.events.unshift(...eventsToFlush);
      return 0;
    }
  },

  /**
   * Get page analytics summary from database
   */
  async getPageAnalytics(options: {
    startDate?: Date;
    endDate?: Date;
    pagePath?: string;
    limit?: number;
  }): Promise<PageViewSummary[]> {
    const conditions = [eq(analyticsEvents.eventType, "page_view")];

    if (options.startDate) {
      conditions.push(gte(analyticsEvents.timestamp, options.startDate));
    }
    if (options.endDate) {
      conditions.push(lte(analyticsEvents.timestamp, options.endDate));
    }
    if (options.pagePath) {
      conditions.push(eq(analyticsEvents.pagePath, options.pagePath));
    }

    // Query database for aggregated stats
    const results = await db
      .select({
        pagePath: analyticsEvents.pagePath,
        pageTitle: analyticsEvents.pageTitle,
        views: count(),
        avgTimeOnPage: avg(analyticsEvents.timeOnPage),
        avgScrollDepth: avg(analyticsEvents.scrollDepth),
      })
      .from(analyticsEvents)
      .where(and(...conditions))
      .groupBy(analyticsEvents.pagePath, analyticsEvents.pageTitle)
      .orderBy(desc(count()))
      .limit(options.limit || 50);

    // Also get unique visitors count for each page
    const summaries: PageViewSummary[] = await Promise.all(
      results.map(async row => {
        const uniqueResult = await db
          .select({
            uniqueVisitors: sql<number>`COUNT(DISTINCT ${analyticsEvents.visitorId})::int`,
          })
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.eventType, "page_view"),
              eq(analyticsEvents.pagePath, row.pagePath || "")
            )
          );

        return {
          pagePath: row.pagePath || "",
          pageTitle: row.pageTitle || row.pagePath || "",
          views: Number(row.views) || 0,
          uniqueVisitors: uniqueResult[0]?.uniqueVisitors || 0,
          avgTimeOnPage: Math.round(Number(row.avgTimeOnPage) || 0),
          avgScrollDepth: Math.round(Number(row.avgScrollDepth) || 0),
          bounceRate: 0, // Session-based calculation deferred
          exitRate: 0, // Session-based calculation deferred
        };
      })
    );

    return summaries;
  },

  /**
   * Get user journey for a specific visitor from database
   */
  async getUserJourney(visitorId: string, sessionId?: string): Promise<UserJourney | null> {
    const conditions = [eq(analyticsEvents.visitorId, visitorId)];
    if (sessionId) {
      conditions.push(eq(analyticsEvents.sessionId, sessionId));
    }

    const dbEvents = await db
      .select()
      .from(analyticsEvents)
      .where(and(...conditions))
      .orderBy(analyticsEvents.timestamp);

    if (dbEvents.length === 0) return null;

    const events: AnalyticsEvent[] = dbEvents.map(mapDbEventToAnalyticsEvent);
    const pageViews = events.filter(e => e.eventType === "page_view");
    const conversions = events.filter(e => e.eventType === "conversion");

    return {
      visitorId,
      sessionId: events[0].sessionId,
      startTime: events[0].timestamp,
      endTime: events.at(-1)!.timestamp,
      totalPages: pageViews.length,
      totalEvents: events.length,
      duration: events.at(-1)!.timestamp.getTime() - events[0].timestamp.getTime(),
      events,
      conversionPath: pageViews.map(e => e.pagePath),
      converted: conversions.length > 0,
      conversionType: conversions[0]?.metadata?.conversionType,
    };
  },

  /**
   * Get conversion funnel analysis
   */
  async getConversionFunnel(steps: string[]): Promise<ConversionFunnel> {
    const stepStats: Array<{ name: string; visitors: number }> = [];

    for (const step of steps) {
      const stepVisitors = new Set(
        eventStore.events
          .filter(e => e.pagePath.includes(step) || e.eventName.includes(step))
          .map(e => e.visitorId)
      ).size;

      stepStats.push({
        name: step,
        visitors: stepVisitors,
      });
    }

    const funnelSteps = stepStats.map((stat, index) => ({
      name: stat.name,
      visitors: stat.visitors,
      dropoff: index > 0 ? stepStats[index - 1].visitors - stat.visitors : 0,
      dropoffRate:
        index > 0 && stepStats[index - 1].visitors > 0
          ? Math.round(
              ((stepStats[index - 1].visitors - stat.visitors) / stepStats[index - 1].visitors) *
                100
            )
          : 0,
    }));

    const firstStep = stepStats[0]?.visitors || 0;
    const lastStep = stepStats.at(-1)?.visitors || 0;

    return {
      name: "Conversion Funnel",
      steps: funnelSteps,
      overallConversionRate: firstStep > 0 ? Math.round((lastStep / firstStep) * 100) : 0,
    };
  },

  /**
   * Get real-time active users
   */
  getActiveUsers(minutes: number = 5): number {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const activeVisitors = new Set(
      eventStore.events.filter(e => e.timestamp >= cutoff).map(e => e.visitorId)
    );
    return activeVisitors.size;
  },

  /**
   * Get click heatmap data
   */
  async getClickHeatmap(pagePath: string): Promise<Array<{ x: number; y: number; count: number }>> {
    const clicks = eventStore.events.filter(
      e => e.eventType === "click" && e.pagePath === pagePath && e.clickX && e.clickY
    );

    // Aggregate clicks by position (grid of 10x10 pixels)
    const grid = new Map<string, number>();
    for (const click of clicks) {
      const x = Math.round(click.clickX! / 10) * 10;
      const y = Math.round(click.clickY! / 10) * 10;
      const key = `${x},${y}`;
      grid.set(key, (grid.get(key) || 0) + 1);
    }

    return Array.from(grid.entries()).map(([key, count]) => {
      const [x, y] = key.split(",").map(Number);
      return { x, y, count };
    });
  },

  /**
   * Get analytics summary for dashboard
   */
  async getDashboardSummary(hours: number = 24): Promise<{
    totalPageViews: number;
    uniqueVisitors: number;
    avgSessionDuration: number;
    bounceRate: number;
    topPages: PageViewSummary[];
    topReferrers: Array<{ referrer: string; visits: number }>;
    deviceBreakdown: Record<string, number>;
    hourlyTraffic: Array<{ hour: number; views: number }>;
    ctaClicks: Array<{ name: string; clicks: number }>;
  }> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentEvents = eventStore.events.filter(e => e.timestamp >= cutoff);

    const pageViews = recentEvents.filter(e => e.eventType === "page_view");
    const uniqueVisitors = new Set(recentEvents.map(e => e.visitorId)).size;

    // Device breakdown
    const deviceBreakdown: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
    for (const event of pageViews) {
      if (event.deviceType) {
        deviceBreakdown[event.deviceType] = (deviceBreakdown[event.deviceType] || 0) + 1;
      }
    }

    // Top referrers
    const referrerCounts = new Map<string, number>();
    for (const event of pageViews) {
      if (event.referrer) {
        try {
          const domain = new URL(event.referrer).hostname;
          referrerCounts.set(domain, (referrerCounts.get(domain) || 0) + 1);
        } catch {
          void 0;
        }
      }
    }

    const topReferrers = Array.from(referrerCounts.entries())
      .map(([referrer, visits]) => ({ referrer, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);

    // Hourly traffic
    const hourlyTraffic: Array<{ hour: number; views: number }> = [];
    for (let h = 0; h < 24; h++) {
      const hourStart = new Date(cutoff);
      hourStart.setHours(hourStart.getHours() + h);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourEnd.getHours() + 1);

      const views = pageViews.filter(e => e.timestamp >= hourStart && e.timestamp < hourEnd).length;

      hourlyTraffic.push({ hour: h, views });
    }

    // CTA clicks
    const ctaEvents = recentEvents.filter(e => e.eventType === "cta_click");
    const ctaCounts = new Map<string, number>();
    for (const event of ctaEvents) {
      const name = event.eventName.replace("CTA: ", "");
      ctaCounts.set(name, (ctaCounts.get(name) || 0) + 1);
    }

    const ctaClicks = Array.from(ctaCounts.entries())
      .map(([name, clicks]) => ({ name, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    return {
      totalPageViews: pageViews.length,
      uniqueVisitors,
      avgSessionDuration: 0, // Calculate from sessions
      bounceRate: 0, // Calculate from sessions
      topPages: await this.getPageAnalytics({ limit: 10 }),
      topReferrers,
      deviceBreakdown,
      hourlyTraffic,
      ctaClicks,
    };
  },

  // Helper functions
  getDeviceType(userAgent?: string): "desktop" | "mobile" | "tablet" | undefined {
    if (!userAgent) return undefined;
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || (ua.includes("android") && !ua.includes("tablet")))
      return "mobile";
    if (ua.includes("tablet") || ua.includes("ipad")) return "tablet";
    return "desktop";
  },

  getBrowser(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    const ua = userAgent.toLowerCase();
    if (ua.includes("chrome") && !ua.includes("edge")) return "Chrome";
    if (ua.includes("firefox")) return "Firefox";
    if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
    if (ua.includes("edge")) return "Edge";
    if (ua.includes("opera") || ua.includes("opr")) return "Opera";
    return "Other";
  },

  getOS(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    const ua = userAgent.toLowerCase();
    if (ua.includes("windows")) return "Windows";
    if (ua.includes("mac os") || ua.includes("macos")) return "macOS";
    if (ua.includes("linux") && !ua.includes("android")) return "Linux";
    if (ua.includes("android")) return "Android";
    if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) return "iOS";
    return "Other";
  },
};

// Start periodic flush - only when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== "true" && process.env.REPLIT_DEPLOYMENT !== "1") {
  setInterval(() => {
    customerJourney.flushEvents().catch(() => {});
  }, FLUSH_INTERVAL_MS);
}

export default customerJourney;
