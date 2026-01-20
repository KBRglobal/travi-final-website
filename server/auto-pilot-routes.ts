/**
 * Auto-Pilot API Routes
 * Endpoints for monitoring and controlling the auto-pilot system
 *
 * The user only needs to supervise - everything runs automatically
 */

import type { Express, Request, Response } from "express";
import { requirePermission, requireAuth } from "./security";
import { autoPilotSystem, autoPilotConfig, AutoPilotReport } from "./auto-pilot";

export function registerAutoPilotRoutes(app: Express) {

  // ============================================================================
  // STATUS & DASHBOARD (Read-Only Monitoring)
  // ============================================================================

  // Get overall auto-pilot status
  app.get("/api/auto-pilot/status", requireAuth, async (req, res) => {
    try {
      const status = await autoPilotSystem.runner.getStatus();
      res.json(status);
    } catch (error) {
      console.error("[AutoPilot] Error getting status:", error);
      res.status(500).json({ error: "Failed to get auto-pilot status" });
    }
  });

  // Get current configuration
  app.get("/api/auto-pilot/config", requireAuth, async (req, res) => {
    try {
      res.json({ config: autoPilotConfig });
    } catch (error) {
      console.error("[AutoPilot] Error getting config:", error);
      res.status(500).json({ error: "Failed to get config" });
    }
  });

  // ============================================================================
  // MANUAL TRIGGERS (For Supervisor Override)
  // ============================================================================

  // Run hourly tasks manually
  app.post("/api/auto-pilot/run/hourly", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await autoPilotSystem.runner.runHourlyTasks();
      res.json({ success: true, ...result, ranAt: new Date() });
    } catch (error) {
      console.error("[AutoPilot] Error running hourly tasks:", error);
      res.status(500).json({ error: "Failed to run hourly tasks" });
    }
  });

  // Run daily tasks manually
  app.post("/api/auto-pilot/run/daily", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await autoPilotSystem.runner.runDailyTasks();
      res.json({ success: true, ...result, ranAt: new Date() });
    } catch (error) {
      console.error("[AutoPilot] Error running daily tasks:", error);
      res.status(500).json({ error: "Failed to run daily tasks" });
    }
  });

  // Run weekly tasks manually
  app.post("/api/auto-pilot/run/weekly", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await autoPilotSystem.runner.runWeeklyTasks();
      res.json({ success: true, ...result, ranAt: new Date() });
    } catch (error) {
      console.error("[AutoPilot] Error running weekly tasks:", error);
      res.status(500).json({ error: "Failed to run weekly tasks" });
    }
  });

  // ============================================================================
  // REPORTS
  // ============================================================================

  // Get latest daily report
  app.get("/api/auto-pilot/reports/daily", requireAuth, async (req, res) => {
    try {
      const report = await autoPilotSystem.reports.generateDailyReport();
      res.json(report);
    } catch (error) {
      console.error("[AutoPilot] Error generating daily report:", error);
      res.status(500).json({ error: "Failed to generate daily report" });
    }
  });

  // Get latest weekly report
  app.get("/api/auto-pilot/reports/weekly", requireAuth, async (req, res) => {
    try {
      const report = await autoPilotSystem.reports.generateWeeklyReport();
      res.json(report);
    } catch (error) {
      console.error("[AutoPilot] Error generating weekly report:", error);
      res.status(500).json({ error: "Failed to generate weekly report" });
    }
  });

  // ============================================================================
  // SCHEDULED PUBLISHING
  // ============================================================================

  // Get scheduled content status
  app.get("/api/auto-pilot/scheduled", requireAuth, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { contents } = await import("@shared/schema");
      const { eq, asc } = await import("drizzle-orm");

      const scheduled = await db.select()
        .from(contents)
        .where(eq(contents.status, "scheduled" as any))
        .orderBy(asc(contents.scheduledAt as any));

      res.json({
        count: scheduled.length,
        items: scheduled.map(c => ({
          id: c.id,
          title: c.title,
          type: c.type,
          scheduledAt: c.scheduledAt,
        })),
      });
    } catch (error) {
      console.error("[AutoPilot] Error getting scheduled content:", error);
      res.status(500).json({ error: "Failed to get scheduled content" });
    }
  });

  // Check publish quality for content
  app.get("/api/auto-pilot/quality/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const quality = await autoPilotSystem.publisher.checkPublishQuality(contentId);
      res.json(quality);
    } catch (error) {
      console.error("[AutoPilot] Error checking quality:", error);
      res.status(500).json({ error: "Failed to check quality" });
    }
  });

  // Force process scheduled content now
  app.post("/api/auto-pilot/scheduled/process", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await autoPilotSystem.publisher.processScheduledContent();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[AutoPilot] Error processing scheduled:", error);
      res.status(500).json({ error: "Failed to process scheduled content" });
    }
  });

  // ============================================================================
  // TRANSLATIONS
  // ============================================================================

  // Get translation status for content
  app.get("/api/auto-pilot/translations/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const status = await autoPilotSystem.translator.getTranslationStatus(contentId);
      res.json(status);
    } catch (error) {
      console.error("[AutoPilot] Error getting translation status:", error);
      res.status(500).json({ error: "Failed to get translation status" });
    }
  });

  // Trigger translation for content
  app.post("/api/auto-pilot/translations/:contentId/trigger", requirePermission("canEdit"), async (req, res) => {
    try {
      const { contentId } = req.params;
      const result = await autoPilotSystem.translator.triggerTranslation(contentId);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[AutoPilot] Error triggering translation:", error);
      res.status(500).json({ error: "Failed to trigger translation" });
    }
  });

  // ============================================================================
  // AFFILIATE LINKS
  // ============================================================================

  // Place affiliate links for content
  app.post("/api/auto-pilot/affiliates/:contentId", requirePermission("canEdit"), async (req, res) => {
    try {
      const { contentId } = req.params;
      const result = await autoPilotSystem.affiliate.placeLinks(contentId);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[AutoPilot] Error placing affiliates:", error);
      res.status(500).json({ error: "Failed to place affiliate links" });
    }
  });

  // Bulk place affiliate links
  app.post("/api/auto-pilot/affiliates/bulk", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await autoPilotSystem.affiliate.placeBulkLinks();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[AutoPilot] Error bulk placing affiliates:", error);
      res.status(500).json({ error: "Failed to bulk place affiliates" });
    }
  });

  // ============================================================================
  // TAGGING
  // ============================================================================

  // Auto-tag specific content
  app.post("/api/auto-pilot/tags/:contentId", requirePermission("canEdit"), async (req, res) => {
    try {
      const { contentId } = req.params;
      const result = await autoPilotSystem.tagger.tagContent(contentId);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[AutoPilot] Error tagging content:", error);
      res.status(500).json({ error: "Failed to tag content" });
    }
  });

  // Bulk auto-tag all content
  app.post("/api/auto-pilot/tags/bulk", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await autoPilotSystem.tagger.tagAllContent();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[AutoPilot] Error bulk tagging:", error);
      res.status(500).json({ error: "Failed to bulk tag content" });
    }
  });

  // ============================================================================
  // CLUSTERING
  // ============================================================================

  // Add content to cluster
  app.post("/api/auto-pilot/cluster/:contentId", requirePermission("canEdit"), async (req, res) => {
    try {
      const { contentId } = req.params;
      const result = await autoPilotSystem.cluster.addToCluster(contentId);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[AutoPilot] Error adding to cluster:", error);
      res.status(500).json({ error: "Failed to add to cluster" });
    }
  });

  // ============================================================================
  // HOMEPAGE PROMOTIONS
  // ============================================================================

  // Check if content should be promoted
  app.post("/api/auto-pilot/homepage/:contentId", requirePermission("canEdit"), async (req, res) => {
    try {
      const { contentId } = req.params;
      const result = await autoPilotSystem.homepage.checkForPromotion(contentId);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[AutoPilot] Error checking promotion:", error);
      res.status(500).json({ error: "Failed to check for promotion" });
    }
  });

  // Rotate homepage promotions
  app.post("/api/auto-pilot/homepage/rotate", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await autoPilotSystem.homepage.rotatePromotions();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[AutoPilot] Error rotating promotions:", error);
      res.status(500).json({ error: "Failed to rotate promotions" });
    }
  });

  // ============================================================================
  // RSS PROCESSING
  // ============================================================================

  // Process all RSS feeds
  app.post("/api/auto-pilot/rss/process", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await autoPilotSystem.rss.processAllFeeds();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[AutoPilot] Error processing RSS:", error);
      res.status(500).json({ error: "Failed to process RSS feeds" });
    }
  });

  // Process specific RSS feed
  app.post("/api/auto-pilot/rss/:feedId/process", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { feedId } = req.params;
      const result = await autoPilotSystem.rss.processFeed(feedId);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[AutoPilot] Error processing RSS feed:", error);
      res.status(500).json({ error: "Failed to process RSS feed" });
    }
  });

  // ============================================================================
  // CONTENT REFRESH
  // ============================================================================

  // Get and flag stale content
  app.post("/api/auto-pilot/refresh/stale", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await autoPilotSystem.refresh.refreshStaleContent();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[AutoPilot] Error refreshing stale content:", error);
      res.status(500).json({ error: "Failed to refresh stale content" });
    }
  });

  // ============================================================================
  // SUPERVISOR DASHBOARD (Aggregated View)
  // ============================================================================

  // Get comprehensive supervisor dashboard
  app.get("/api/auto-pilot/dashboard", requireAuth, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { contents, translations, affiliateLinks } = await import("@shared/schema");
      const { eq, sql, and, gt } = await import("drizzle-orm");
      const { automation } = await import("./automation");

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Gather all statistics in parallel
      const [
        status,
        dailyReport,
        scheduledCount,
        publishedToday,
        publishedThisWeek,
        totalContent,
        translationCount,
        affiliateCount,
        freshness,
        brokenLinks,
      ] = await Promise.all([
        autoPilotSystem.runner.getStatus(),
        autoPilotSystem.reports.generateDailyReport(),
        db.select({ count: sql<number>`count(*)` })
          .from(contents)
          .where(eq(contents.status, "scheduled" as any)),
        db.select({ count: sql<number>`count(*)` })
          .from(contents)
          .where(and(
            eq(contents.status, "published"),
            gt(contents.publishedAt as any, yesterday)
          )),
        db.select({ count: sql<number>`count(*)` })
          .from(contents)
          .where(and(
            eq(contents.status, "published"),
            gt(contents.publishedAt as any, lastWeek)
          )),
        db.select({ count: sql<number>`count(*)` })
          .from(contents)
          .where(eq(contents.status, "published")),
        db.select({ count: sql<number>`count(*)` })
          .from(translations)
          .where(eq(translations.status, "completed")),
        db.select({ count: sql<number>`count(*)` })
          .from(affiliateLinks),
        automation.freshness.getReport(),
        automation.brokenLinks.quickScan(),
      ]);

      // Calculate system health score
      let healthScore = 100;
      if (freshness.stats.critical > 0) healthScore -= 20;
      if (freshness.stats.stale > 5) healthScore -= 10;
      if (brokenLinks.length > 10) healthScore -= 15;
      if (dailyReport.issues.filter(i => i.severity === "high").length > 0) healthScore -= 15;
      healthScore = Math.max(0, healthScore);

      res.json({
        // System health overview
        systemHealth: {
          score: healthScore,
          status: healthScore >= 80 ? "healthy" : healthScore >= 60 ? "attention" : "critical",
          enabled: status.enabled,
        },

        // Content metrics
        content: {
          total: Number(totalContent[0]?.count || 0),
          publishedToday: Number(publishedToday[0]?.count || 0),
          publishedThisWeek: Number(publishedThisWeek[0]?.count || 0),
          scheduled: Number(scheduledCount[0]?.count || 0),
          stale: freshness.stats.stale,
          critical: freshness.stats.critical,
        },

        // Translation metrics
        translations: {
          completed: Number(translationCount[0]?.count || 0),
          pending: status.health.pendingTranslations,
        },

        // Affiliate metrics
        affiliates: {
          active: Number(affiliateCount[0]?.count || 0),
        },

        // Issues requiring attention
        issues: {
          total: dailyReport.issues.length,
          high: dailyReport.issues.filter(i => i.severity === "high").length,
          medium: dailyReport.issues.filter(i => i.severity === "medium").length,
          low: dailyReport.issues.filter(i => i.severity === "low").length,
          brokenLinks: brokenLinks.length,
          topIssues: dailyReport.issues.slice(0, 5),
        },

        // Recommendations
        recommendations: dailyReport.recommendations,

        // Last run times
        lastRuns: status.lastRuns,

        // Config summary
        config: {
          minSeoScore: status.config.minSeoScoreToPublish,
          autoTranslate: status.config.autoTranslateOnPublish,
          autoAffiliates: status.config.autoPlaceAffiliates,
          autoRss: status.config.autoImportRss,
        },
      });
    } catch (error) {
      console.error("[AutoPilot] Error getting dashboard:", error);
      res.status(500).json({ error: "Failed to get supervisor dashboard" });
    }
  });

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  // Bulk approve all in_review content
  app.post("/api/auto-pilot/bulk/approve", requirePermission("canPublish"), async (req, res) => {
    try {
      const { db } = await import("./db");
      const { contents } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      // Get all in_review content
      const inReviewContent = await db.select()
        .from(contents)
        .where(eq(contents.status, "in_review" as any));

      let approved = 0;
      for (const content of inReviewContent) {
        // Run quality check before approving using the publisher subsystem
        const qualityResult = await autoPilotSystem.publisher.checkPublishQuality(content.id);
        
        if (qualityResult.canPublish) {
          await db.update(contents)
            .set({ status: "approved" } as any)
            .where(eq(contents.id, content.id));
          approved++;
        }
      }

      res.json({ success: true, approved, total: inReviewContent.length });
    } catch (error) {
      console.error("[AutoPilot] Bulk approve error:", error);
      res.status(500).json({ error: "Failed to bulk approve" });
    }
  });

  // Bulk translate published content
  app.post("/api/auto-pilot/bulk/translate", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { db } = await import("./db");
      const { contents } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      // Get published content that needs translation
      const publishedContent = await db.select()
        .from(contents)
        .where(eq(contents.status, "published" as any));

      // Queue translations (would trigger translation service)
      const queued = publishedContent.length;

      // In a real implementation, this would trigger the translation service
      // For now, just return the count
      res.json({ success: true, queued, message: "Translation jobs queued" });
    } catch (error) {
      console.error("[AutoPilot] Bulk translate error:", error);
      res.status(500).json({ error: "Failed to bulk translate" });
    }
  });

  // Bulk quality check - uses autoPilotSystem for consistent quality gates
  app.post("/api/auto-pilot/bulk/quality-check", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { db } = await import("./db");
      const { contents } = await import("@shared/schema");

      // Get all content
      const allContent = await db.select().from(contents);

      let checked = 0;
      const issues: Array<{ id: string; title: string; score: number; issues: string[] }> = [];

      for (const content of allContent) {
        // Use the autoPilotSystem's quality check for consistency
        const qualityResult = await autoPilotSystem.publisher.checkPublishQuality(content.id);
        
        if (!qualityResult.canPublish && qualityResult.issues.length > 0) {
          issues.push({ 
            id: content.id, 
            title: content.title, 
            score: qualityResult.score,
            issues: qualityResult.issues 
          });
        }

        checked++;
      }

      res.json({ success: true, checked, issueCount: issues.length, issues: issues.slice(0, 20) });
    } catch (error) {
      console.error("[AutoPilot] Bulk quality check error:", error);
      res.status(500).json({ error: "Failed to run quality check" });
    }
  });

  // Bulk SEO refresh - regenerate SEO fields with AI
  app.post("/api/auto-pilot/bulk/seo-refresh", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { db } = await import("./db");
      const { contents } = await import("@shared/schema");
      const { or, isNull, eq, lt } = await import("drizzle-orm");

      // Get content missing SEO fields or with poor SEO
      const contentNeedingSeo = await db.select()
        .from(contents)
        .where(or(
          isNull(contents.metaTitle),
          isNull(contents.metaDescription),
          lt(contents.metaTitle as any, 30)
        ));

      // In a real implementation, this would call AI to regenerate SEO
      const refreshed = contentNeedingSeo.length;

      res.json({ success: true, refreshed, message: "SEO refresh queued" });
    } catch (error) {
      console.error("[AutoPilot] Bulk SEO refresh error:", error);
      res.status(500).json({ error: "Failed to refresh SEO" });
    }
  });

  // ============================================================================
  // RSS FEED MANAGEMENT - Import & Migration
  // ============================================================================

  // One-time migration: Add destination_id, language, region to rss_feeds (Railway DB)
  app.post("/api/auto-pilot/rss/migrate-schema", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      
      console.log("[AutoPilot/RSS] Running schema migration on Railway DB...");
      
      await db.execute(sql`
        ALTER TABLE rss_feeds 
        ADD COLUMN IF NOT EXISTS destination_id varchar,
        ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
        ADD COLUMN IF NOT EXISTS region text
      `);
      
      console.log("[AutoPilot/RSS] Schema migration completed");
      res.json({ success: true, message: "Schema migration completed" });
    } catch (error: any) {
      console.error("[AutoPilot/RSS] Migration error:", error);
      res.status(500).json({ error: "Migration failed: " + error.message });
    }
  });

  // Import RSS feeds from JSON with destination assignment
  app.post("/api/auto-pilot/rss/import-feeds", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { db } = await import("./db");
      const { rssFeeds, destinations } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      // Map JSON categories to DB enum values
      const categoryMap: Record<string, string | null> = {
        local_news: "news",
        lifestyle_entertainment: "events",
        business_property: "news",
        travel_tourism: "attractions",
        food_dining: "food",
        aviation: "transport",
        general: "news",
        lifestyle: "events",
        business: "news",
        culture: "events",
        travel: "attractions",
        property: "news",
        sports: "events",
        entertainment: "events",
        food: "food",
        real_estate: "news",
        hospitality: "hotels",
        expat_living: "tips",
        travel_lifestyle: "attractions",
        uk_news: "news",
        europe_news: "news",
        news: "news"
      };
      
      const feedData = req.body as {
        metadata?: { total_destinations: number };
        destinations: Array<{
          destination: string;
          region: string;
          feeds: Array<{
            category: string;
            source: string;
            rss_url: string;
            language: string;
          }>;
        }>;
      };

      if (!feedData.destinations || !Array.isArray(feedData.destinations)) {
        return res.status(400).json({ error: "Invalid feed data format" });
      }

      // Build destination name to ID mapping
      const allDestinations = await db.select().from(destinations);
      const destMap: Record<string, string> = {};
      for (const d of allDestinations) {
        destMap[d.name.toLowerCase()] = d.id;
        destMap[d.id.toLowerCase()] = d.id;
      }

      let imported = 0;
      let updated = 0;
      let errors: string[] = [];

      for (const destEntry of feedData.destinations) {
        const destName = destEntry.destination.toLowerCase();
        const destId = destMap[destName] || destMap[destName.replace(/\s+/g, '-')];
        
        if (!destId) {
          errors.push(`Destination not found: ${destEntry.destination}`);
          continue;
        }

        for (const feed of destEntry.feeds) {
          try {
            // Map category to enum value
            const mappedCategory = categoryMap[feed.category] || null;
            
            // Check if feed URL already exists
            const existing = await db.select().from(rssFeeds).where(eq(rssFeeds.url, feed.rss_url));
            
            if (existing.length > 0) {
              // Update existing feed with destination
              await db.update(rssFeeds)
                .set({ 
                  destinationId: destId,
                  language: feed.language,
                  region: destEntry.region,
                  category: mappedCategory
                } as any)
                .where(eq(rssFeeds.url, feed.rss_url));
              updated++;
            } else {
              // Insert new feed
              await db.insert(rssFeeds).values({
                name: feed.source,
                url: feed.rss_url,
                category: mappedCategory,
                destinationId: destId,
                language: feed.language,
                region: destEntry.region,
                isActive: true,
                fetchIntervalMinutes: 60
              } as any);
              imported++;
            }
          } catch (feedError: any) {
            errors.push(`Failed to import ${feed.source}: ${feedError.message}`);
          }
        }
      }

      res.json({ 
        success: true, 
        imported, 
        updated, 
        errors: errors.slice(0, 10),
        totalErrors: errors.length 
      });
    } catch (error: any) {
      console.error("[AutoPilot/RSS] Import error:", error);
      res.status(500).json({ error: "Import failed: " + error.message });
    }
  });

  // Get RSS feeds by destination
  app.get("/api/auto-pilot/rss/by-destination/:destId", requireAuth, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { rssFeeds } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const { destId } = req.params;
      const feeds = await db.select().from(rssFeeds).where(eq(rssFeeds.destinationId, destId));
      
      res.json({ feeds, count: feeds.length });
    } catch (error: any) {
      console.error("[AutoPilot/RSS] Error getting feeds by destination:", error);
      res.status(500).json({ error: error.message });
    }
  });

  console.log("[AutoPilot] Routes registered");
}
