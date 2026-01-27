/**
 * Bot Monitor Engine - Bot Behavior Monitoring System
 *
 * Monitors and analyzes bot traffic:
 * - Identifies search engine bots
 * - Identifies AI crawlers (GPTBot, Claude, etc.)
 * - Tracks crawler behavior
 * - Detects anomalies
 * - Generates alerts
 */

import { db } from "../db";
import { aeoCrawlerLogs } from "../../shared/schema";
import { eq, and, gte, lte, desc, count, sql } from "drizzle-orm";
import { SEOEngineConfig, BotVisit, BotType, BotStats, BotBehaviorAlert } from "./types";

// Bot identification patterns
const BOT_PATTERNS: Array<{
  name: string;
  type: BotType;
  pattern: RegExp;
}> = [
  // Search engines
  { name: "Googlebot", type: "search_engine", pattern: /googlebot/i },
  { name: "Googlebot-Image", type: "search_engine", pattern: /googlebot-image/i },
  { name: "Googlebot-News", type: "search_engine", pattern: /googlebot-news/i },
  { name: "Googlebot-Video", type: "search_engine", pattern: /googlebot-video/i },
  { name: "Bingbot", type: "search_engine", pattern: /bingbot/i },
  { name: "Slurp", type: "search_engine", pattern: /slurp/i },
  { name: "DuckDuckBot", type: "search_engine", pattern: /duckduckbot/i },
  { name: "Baiduspider", type: "search_engine", pattern: /baiduspider/i },
  { name: "YandexBot", type: "search_engine", pattern: /yandexbot/i },

  // AI crawlers
  { name: "GPTBot", type: "ai_crawler", pattern: /gptbot/i },
  { name: "ChatGPT-User", type: "ai_crawler", pattern: /chatgpt-user/i },
  { name: "Claude-Web", type: "ai_crawler", pattern: /claude-web/i },
  { name: "anthropic-ai", type: "ai_crawler", pattern: /anthropic-ai/i },
  { name: "PerplexityBot", type: "ai_crawler", pattern: /perplexitybot/i },
  { name: "Google-Extended", type: "ai_crawler", pattern: /google-extended/i },
  { name: "Cohere-AI", type: "ai_crawler", pattern: /cohere-ai/i },
  { name: "Meta-ExternalAgent", type: "ai_crawler", pattern: /meta-externalagent/i },

  // Social media
  { name: "Facebookbot", type: "social_media", pattern: /facebookexternalhit|facebot/i },
  { name: "Twitterbot", type: "social_media", pattern: /twitterbot/i },
  { name: "LinkedInBot", type: "social_media", pattern: /linkedinbot/i },
  { name: "Pinterest", type: "social_media", pattern: /pinterest/i },
  { name: "WhatsApp", type: "social_media", pattern: /whatsapp/i },
  { name: "TelegramBot", type: "social_media", pattern: /telegrambot/i },
  { name: "Slackbot", type: "social_media", pattern: /slackbot/i },
  { name: "Discordbot", type: "social_media", pattern: /discordbot/i },

  // SEO tools
  { name: "AhrefsBot", type: "seo_tool", pattern: /ahrefsbot/i },
  { name: "SemrushBot", type: "seo_tool", pattern: /semrushbot/i },
  { name: "MJ12bot", type: "seo_tool", pattern: /mj12bot/i },
  { name: "DotBot", type: "seo_tool", pattern: /dotbot/i },
  { name: "Screaming Frog", type: "seo_tool", pattern: /screaming frog/i },

  // Monitoring
  { name: "UptimeRobot", type: "monitoring", pattern: /uptimerobot/i },
  { name: "Pingdom", type: "monitoring", pattern: /pingdom/i },
  { name: "StatusCake", type: "monitoring", pattern: /statuscake/i },
];

// In-memory alerts
const alerts: BotBehaviorAlert[] = [];

// Baseline data for anomaly detection
const baselineData: Map<string, number> = new Map();

export class BotMonitorEngine {
  private config: SEOEngineConfig;

  constructor(config: SEOEngineConfig) {
    this.config = config;
  }

  /**
   * Identify a bot from user agent
   */
  identifyBot(userAgent: string): {
    isBot: boolean;
    name: string;
    type: BotType;
  } {
    for (const { name, type, pattern } of BOT_PATTERNS) {
      if (pattern.test(userAgent)) {
        return { isBot: true, name, type };
      }
    }

    // Check for generic bot patterns
    if (/bot|crawler|spider|scraper/i.test(userAgent)) {
      return { isBot: true, name: "Unknown Bot", type: "unknown" };
    }

    return { isBot: false, name: "", type: "unknown" };
  }

  /**
   * Log a bot visit
   */
  async logVisit(visit: BotVisit): Promise<boolean> {
    if (!this.config.enableBotMonitoring) {
      return false;
    }

    try {
      await db.insert(aeoCrawlerLogs).values({
        crawler: visit.botName,
        userAgent: visit.userAgent,
        requestPath: visit.requestPath,
        statusCode: visit.statusCode,
        responseTime: visit.responseTime,
        ipAddress: visit.ipAddress,
        contentId: visit.contentId,
      } as any);

      // Check for anomalies
      await this.checkForAnomalies(visit);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get bot statistics
   */
  async getStats(days: number = 30): Promise<BotStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await db.query.aeoCrawlerLogs.findMany({
      where: gte(aeoCrawlerLogs.crawledAt, startDate),
    });

    const totalVisits = logs.length;

    // Count by bot
    const byBot: Record<string, number> = {};
    for (const log of logs) {
      byBot[log.crawler] = (byBot[log.crawler] || 0) + 1;
    }

    // Count by type
    const byType: Record<BotType, number> = {
      search_engine: 0,
      ai_crawler: 0,
      social_media: 0,
      seo_tool: 0,
      monitoring: 0,
      unknown: 0,
    };

    for (const log of logs) {
      const botInfo = this.identifyBot(log.userAgent);
      byType[botInfo.type] = (byType[botInfo.type] || 0) + 1;
    }

    // Count by path
    const pathCounts = new Map<string, number>();
    for (const log of logs) {
      const pathMatch = log.requestPath.match(/^\/([^\/]+)/);
      const pathKey = pathMatch ? pathMatch[1] : "root";
      pathCounts.set(pathKey, (pathCounts.get(pathKey) || 0) + 1);
    }
    const byPath = Array.from(pathCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Count by status
    const byStatus: Record<number, number> = {};
    for (const log of logs) {
      byStatus[log.statusCode] = (byStatus[log.statusCode] || 0) + 1;
    }

    // Average response time
    const responseTimes = logs
      .map(l => l.responseTime)
      .filter((t): t is number => t !== null && t !== undefined);
    const avgResponseTime =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

    // AI crawler share
    const aiCrawlerShare =
      totalVisits > 0 ? Math.round((byType.ai_crawler / totalVisits) * 100) : 0;

    // Last visit
    const lastLog = logs.sort(
      (a, b) => (b.crawledAt?.getTime() || 0) - (a.crawledAt?.getTime() || 0)
    )[0];

    return {
      totalVisits,
      byBot,
      byType,
      byPath,
      byStatus,
      avgResponseTime,
      aiCrawlerShare,
      lastVisit: lastLog?.crawledAt || null,
    };
  }

  /**
   * Check for anomalies in bot behavior
   */
  private async checkForAnomalies(visit: BotVisit): Promise<void> {
    const botName = visit.botName;
    const now = new Date();
    const hourKey = `${botName}:${now.toISOString().slice(0, 13)}`;

    // Get current hour count
    const currentCount = (baselineData.get(hourKey) || 0) + 1;
    baselineData.set(hourKey, currentCount);

    // Check for spike (more than 10x normal in an hour)
    const baselineKey = `${botName}:baseline`;
    const baseline = baselineData.get(baselineKey) || 100;

    if (currentCount > baseline * 10) {
      this.createAlert({
        type: "spike",
        botName,
        message: `Unusual spike in ${botName} activity: ${currentCount} visits this hour`,
        severity: "warning",
        timestamp: now,
        details: { currentCount, baseline },
      });
    }

    // Check for high error rate
    if (visit.statusCode >= 400) {
      const errorKey = `${botName}:errors:${now.toISOString().slice(0, 10)}`;
      const errorCount = (baselineData.get(errorKey) || 0) + 1;
      baselineData.set(errorKey, errorCount);

      if (errorCount > 50) {
        this.createAlert({
          type: "error_rate",
          botName,
          message: `High error rate for ${botName}: ${errorCount} errors today`,
          severity: "warning",
          timestamp: now,
          details: { errorCount, statusCode: visit.statusCode },
        });
      }
    }

    // Check for new bot
    const isNewBot = !baselineData.has(`${botName}:seen`);
    if (isNewBot) {
      baselineData.set(`${botName}:seen`, 1);
      this.createAlert({
        type: "new_bot",
        botName,
        message: `New bot detected: ${botName}`,
        severity: "info",
        timestamp: now,
        details: { userAgent: visit.userAgent },
      });
    }
  }

  /**
   * Create an alert
   */
  private createAlert(alert: BotBehaviorAlert): void {
    // Deduplicate recent alerts
    const recentSimilar = alerts.find(
      a =>
        a.type === alert.type &&
        a.botName === alert.botName &&
        Date.now() - a.timestamp.getTime() < 60 * 60 * 1000 // Within 1 hour
    );

    if (!recentSimilar) {
      alerts.push(alert);
      // Keep only last 100 alerts
      if (alerts.length > 100) {
        alerts.shift();
      }
    }
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 20): BotBehaviorAlert[] {
    return alerts.slice(-limit).reverse();
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThanDays: number = 7): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const initialLength = alerts.length;
    const filtered = alerts.filter(a => a.timestamp >= cutoff);

    alerts.length = 0;
    alerts.push(...filtered);

    return initialLength - alerts.length;
  }

  /**
   * Get AI crawler activity specifically
   */
  async getAICrawlerActivity(days: number = 30): Promise<{
    totalVisits: number;
    byCrawler: Array<{ name: string; visits: number; percentage: number }>;
    byContent: Array<{ contentId: string; visits: number }>;
    trend: Array<{ date: string; visits: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get AI crawler names
    const aiCrawlerNames = BOT_PATTERNS.filter(b => b.type === "ai_crawler").map(b => b.name);

    const logs = await db.query.aeoCrawlerLogs.findMany({
      where: gte(aeoCrawlerLogs.crawledAt, startDate),
    });

    // Filter to AI crawlers only
    const aiLogs = logs.filter(l =>
      aiCrawlerNames.some(name => l.crawler.toLowerCase().includes(name.toLowerCase()))
    );

    const totalVisits = aiLogs.length;

    // By crawler
    const crawlerCounts = new Map<string, number>();
    for (const log of aiLogs) {
      crawlerCounts.set(log.crawler, (crawlerCounts.get(log.crawler) || 0) + 1);
    }
    const byCrawler = Array.from(crawlerCounts.entries())
      .map(([name, visits]) => ({
        name,
        visits,
        percentage: totalVisits > 0 ? Math.round((visits / totalVisits) * 100) : 0,
      }))
      .sort((a, b) => b.visits - a.visits);

    // By content
    const contentCounts = new Map<string, number>();
    for (const log of aiLogs) {
      if (log.contentId) {
        contentCounts.set(log.contentId, (contentCounts.get(log.contentId) || 0) + 1);
      }
    }
    const byContent = Array.from(contentCounts.entries())
      .map(([contentId, visits]) => ({ contentId, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 20);

    // Trend by day
    const trendMap = new Map<string, number>();
    for (const log of aiLogs) {
      if (log.crawledAt) {
        const dateKey = log.crawledAt.toISOString().split("T")[0];
        trendMap.set(dateKey, (trendMap.get(dateKey) || 0) + 1);
      }
    }
    const trend = Array.from(trendMap.entries())
      .map(([date, visits]) => ({ date, visits }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalVisits,
      byCrawler,
      byContent,
      trend,
    };
  }

  /**
   * Check if a user agent is an AI crawler
   */
  isAICrawler(userAgent: string): boolean {
    const botInfo = this.identifyBot(userAgent);
    return botInfo.isBot && botInfo.type === "ai_crawler";
  }

  /**
   * Get bot middleware for Express
   */
  getMiddleware() {
    const engine = this;

    return async (req: any, res: any, next: any) => {
      const userAgent = req.headers["user-agent"] || "";
      const botInfo = engine.identifyBot(userAgent);

      if (botInfo.isBot) {
        const startTime = Date.now();

        // Store original end function
        const originalEnd = res.end;

        res.end = function (...args: any[]) {
          const responseTime = Date.now() - startTime;

          // Log bot visit asynchronously
          engine
            .logVisit({
              botName: botInfo.name,
              botType: botInfo.type,
              userAgent,
              requestPath: req.path,
              statusCode: res.statusCode,
              responseTime,
              timestamp: new Date(),
              ipAddress: req.ip,
              contentId: req.params?.contentId,
            })
            .catch(() => {});

          return originalEnd.apply(res, args);
        };
      }

      next();
    };
  }
}
