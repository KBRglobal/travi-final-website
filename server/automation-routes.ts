/**
 * Automation API Routes
 * Endpoints for running and monitoring automated improvements
 */

import type { Express, Request, Response } from "express";
import { requirePermission, requireAuth } from "./security";
import { automation } from "./automation";

export function registerAutomationRoutes(app: Express) {

  // ============================================================================
  // INTERNAL LINKING
  // ============================================================================

  // Get link suggestions for specific content
  app.get("/api/automation/links/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const suggestions = await automation.linking.findLinkOpportunities(contentId);
      res.json({ contentId, suggestions, count: suggestions.length });
    } catch (error) {
      console.error("[Automation] Error finding link opportunities:", error);
      res.status(500).json({ error: "Failed to find link opportunities" });
    }
  });

  // Apply link suggestions to content
  app.post("/api/automation/links/:contentId/apply", requirePermission("canEdit"), async (req, res) => {
    try {
      const { contentId } = req.params;
      const { suggestions } = req.body;

      if (!suggestions || !Array.isArray(suggestions)) {
        // Get and apply all suggestions
        const allSuggestions = await automation.linking.findLinkOpportunities(contentId);
        const linksAdded = await automation.linking.applyLinks(contentId, allSuggestions);
        return res.json({ success: true, linksAdded });
      }

      const linksAdded = await automation.linking.applyLinks(contentId, suggestions);
      res.json({ success: true, linksAdded });
    } catch (error) {
      console.error("[Automation] Error applying links:", error);
      res.status(500).json({ error: "Failed to apply links" });
    }
  });

  // Process all content for internal links
  app.post("/api/automation/links/process-all", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await automation.linking.processAllContent();
      res.json(result);
    } catch (error) {
      console.error("[Automation] Error processing all links:", error);
      res.status(500).json({ error: "Failed to process links" });
    }
  });

  // ============================================================================
  // CONTENT FRESHNESS
  // ============================================================================

  // Get freshness report
  app.get("/api/automation/freshness", requireAuth, async (req, res) => {
    try {
      const report = await automation.freshness.getReport();
      res.json(report);
    } catch (error) {
      console.error("[Automation] Error getting freshness report:", error);
      res.status(500).json({ error: "Failed to get freshness report" });
    }
  });

  // Flag content for review
  app.post("/api/automation/freshness/:contentId/flag", requirePermission("canEdit"), async (req, res) => {
    try {
      const { contentId } = req.params;
      const { reason } = req.body;
      await automation.freshness.flagForReview(contentId, reason || "Marked stale by automation");
      res.json({ success: true });
    } catch (error) {
      console.error("[Automation] Error flagging content:", error);
      res.status(500).json({ error: "Failed to flag content" });
    }
  });

  // ============================================================================
  // AUTO META GENERATION
  // ============================================================================

  // Generate meta for specific content
  app.post("/api/automation/meta/:contentId", requirePermission("canEdit"), async (req, res) => {
    try {
      const { contentId } = req.params;
      const description = await automation.meta.generateMetaDescription(contentId);
      const title = await automation.meta.generateMetaTitle(contentId);
      res.json({ contentId, metaTitle: title, metaDescription: description });
    } catch (error) {
      console.error("[Automation] Error generating meta:", error);
      res.status(500).json({ error: "Failed to generate meta" });
    }
  });

  // Generate meta for all content missing it
  app.post("/api/automation/meta/process-all", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await automation.meta.processAllMissingMeta();
      res.json(result);
    } catch (error) {
      console.error("[Automation] Error processing all meta:", error);
      res.status(500).json({ error: "Failed to process meta" });
    }
  });

  // ============================================================================
  // BROKEN LINKS
  // ============================================================================

  // Quick scan (internal links only)
  app.get("/api/automation/broken-links/quick", requireAuth, async (req, res) => {
    try {
      const brokenLinks = await automation.brokenLinks.quickScan();
      res.json({ brokenLinks, count: brokenLinks.length, scanType: "quick" });
    } catch (error) {
      console.error("[Automation] Error scanning broken links:", error);
      res.status(500).json({ error: "Failed to scan broken links" });
    }
  });

  // Full scan (includes external links - slower)
  app.get("/api/automation/broken-links/full", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const brokenLinks = await automation.brokenLinks.scanAllContent();
      res.json({ brokenLinks, count: brokenLinks.length, scanType: "full" });
    } catch (error) {
      console.error("[Automation] Error scanning broken links:", error);
      res.status(500).json({ error: "Failed to scan broken links" });
    }
  });

  // ============================================================================
  // PERFORMANCE SCORING
  // ============================================================================

  // Get score for specific content
  app.get("/api/automation/score/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const score = await automation.performance.scoreContent(contentId);
      if (!score) {
        return res.status(404).json({ error: "Content not found" });
      }
      res.json(score);
    } catch (error) {
      console.error("[Automation] Error scoring content:", error);
      res.status(500).json({ error: "Failed to score content" });
    }
  });

  // Get all scores
  app.get("/api/automation/scores", requireAuth, async (req, res) => {
    try {
      const scores = await automation.performance.scoreAllContent();
      const averageScore = scores.reduce((sum, s) => sum + s.scores.overall, 0) / scores.length;
      res.json({
        scores,
        count: scores.length,
        averageScore: Math.round(averageScore),
        underperformers: scores.filter(s => s.scores.overall < 60).length,
      });
    } catch (error) {
      console.error("[Automation] Error getting all scores:", error);
      res.status(500).json({ error: "Failed to get scores" });
    }
  });

  // Get underperformers only
  app.get("/api/automation/underperformers", requireAuth, async (req, res) => {
    try {
      const threshold = parseInt(req.query.threshold as string) || 60;
      const underperformers = await automation.performance.getUnderperformers(threshold);
      res.json({ underperformers, count: underperformers.length, threshold });
    } catch (error) {
      console.error("[Automation] Error getting underperformers:", error);
      res.status(500).json({ error: "Failed to get underperformers" });
    }
  });

  // ============================================================================
  // SOCIAL POSTS
  // ============================================================================

  // Generate social posts for content
  app.get("/api/automation/social/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const posts = await automation.social.generatePosts(contentId);
      res.json({ contentId, posts });
    } catch (error) {
      console.error("[Automation] Error generating social posts:", error);
      res.status(500).json({ error: "Failed to generate social posts" });
    }
  });

  // ============================================================================
  // SCHEMA.ORG
  // ============================================================================

  // Generate schema for content (used by SSR)
  app.get("/api/automation/schema/:contentId", async (req, res) => {
    try {
      const { contentId } = req.params;

      // Get content from database
      const { db } = await import("./db");
      const { contents } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      const schema = automation.schema.generateSchema(content);
      const breadcrumbs = automation.schema.generateBreadcrumbs(content);

      res.json({
        contentId,
        schema,
        breadcrumbs,
        jsonLd: [schema, breadcrumbs],
      });
    } catch (error) {
      console.error("[Automation] Error generating schema:", error);
      res.status(500).json({ error: "Failed to generate schema" });
    }
  });

  // ============================================================================
  // AUTOMATION RUNNER
  // ============================================================================

  // Run daily tasks manually
  app.post("/api/automation/run/daily", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await automation.runner.runDailyTasks();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[Automation] Error running daily tasks:", error);
      res.status(500).json({ error: "Failed to run daily tasks" });
    }
  });

  // Run weekly tasks manually
  app.post("/api/automation/run/weekly", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await automation.runner.runWeeklyTasks();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[Automation] Error running weekly tasks:", error);
      res.status(500).json({ error: "Failed to run weekly tasks" });
    }
  });

  // Get automation status/dashboard
  app.get("/api/automation/dashboard", requireAuth, async (req, res) => {
    try {
      const [freshness, brokenLinks, scores] = await Promise.all([
        automation.freshness.getReport(),
        automation.brokenLinks.quickScan(),
        automation.performance.scoreAllContent(),
      ]);

      const averageScore = scores.reduce((sum, s) => sum + s.scores.overall, 0) / scores.length;

      res.json({
        health: {
          freshContent: freshness.stats.fresh,
          staleContent: freshness.stats.stale,
          criticalContent: freshness.stats.critical,
          brokenLinks: brokenLinks.length,
          averagePerformanceScore: Math.round(averageScore),
          underperformingContent: scores.filter(s => s.scores.overall < 60).length,
        },
        topIssues: [
          ...freshness.staleContent.slice(0, 3).map(c => ({
            type: "stale",
            contentId: c.id,
            title: c.title,
            message: `${c.daysSinceUpdate} days since update`,
          })),
          ...brokenLinks.slice(0, 3).map(l => ({
            type: "broken-link",
            contentId: l.contentId,
            title: l.contentTitle,
            message: `Broken ${l.type} link: ${l.url}`,
          })),
          ...scores.filter(s => s.scores.overall < 50).slice(0, 3).map(s => ({
            type: "low-score",
            contentId: s.contentId,
            title: s.title,
            message: `Performance score: ${s.scores.overall}%`,
          })),
        ],
      });
    } catch (error) {
      console.error("[Automation] Error getting dashboard:", error);
      res.status(500).json({ error: "Failed to get dashboard" });
    }
  });

  console.log("[Automation] Routes registered");
}
