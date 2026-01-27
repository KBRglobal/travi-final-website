/**
 * Content Intelligence API Routes
 * Topic clusters, SERP gaps, recommendations, A/B testing, ROI
 */

import type { Express, Request, Response } from "express";
import { requirePermission, requireAuth } from "./security";
import { contentIntelligence } from "./content-intelligence";

export function registerContentIntelligenceRoutes(app: Express) {
  // ============================================================================
  // TOPIC CLUSTER BUILDER
  // ============================================================================

  // Get all area-based clusters
  app.get("/api/intelligence/clusters/areas", requireAuth, async (req, res) => {
    try {
      const clusters = await contentIntelligence.clusters.detectAreaClusters();
      res.json({ clusters, count: clusters.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to detect area clusters" });
    }
  });

  // Get category-based clusters
  app.get("/api/intelligence/clusters/categories", requireAuth, async (req, res) => {
    try {
      const clusters = await contentIntelligence.clusters.detectCategoryClusters();
      res.json({ clusters, count: clusters.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to detect category clusters" });
    }
  });

  // Generate pillar page structure
  app.get(
    "/api/intelligence/clusters/:clusterId/pillar-structure",
    requireAuth,
    async (req, res) => {
      try {
        const { clusterId } = req.params;
        const clusters = await contentIntelligence.clusters.detectAreaClusters();
        const cluster = clusters.find(c => c.id === clusterId);

        if (!cluster) {
          return res.status(404).json({ error: "Cluster not found" });
        }

        const structure = contentIntelligence.clusters.generatePillarPageStructure(cluster);
        res.json({ clusterId, cluster, structure });
      } catch (error) {
        res.status(500).json({ error: "Failed to generate pillar structure" });
      }
    }
  );

  // ============================================================================
  // SERP GAP FINDER
  // ============================================================================

  // Find gaps for specific content
  app.get("/api/intelligence/gaps/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const gaps = await contentIntelligence.gaps.findGaps(contentId);

      if (!gaps) {
        return res.status(404).json({ error: "Content not found" });
      }

      res.json(gaps);
    } catch (error) {
      res.status(500).json({ error: "Failed to find content gaps" });
    }
  });

  // Find all content gaps
  app.get("/api/intelligence/gaps", requireAuth, async (req, res) => {
    try {
      const gaps = await contentIntelligence.gaps.findAllGaps();
      const totalGaps = gaps.reduce((sum, g) => sum + g.gaps.length, 0);
      res.json({
        content: gaps,
        stats: {
          contentWithGaps: gaps.length,
          totalGaps,
          highPriorityGaps: gaps.reduce(
            (sum, g) => sum + g.gaps.filter(gap => gap.priority === "high").length,
            0
          ),
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to find content gaps" });
    }
  });

  // ============================================================================
  // NEXT BEST ARTICLE RECOMMENDATIONS
  // ============================================================================

  // Get recommendations for content
  app.get("/api/intelligence/recommendations/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const limit = parseInt(req.query.limit as string) || 3;
      const recommendations = await contentIntelligence.recommendations.getRecommendations(
        contentId,
        limit
      );

      if (!recommendations) {
        return res.status(404).json({ error: "Content not found" });
      }

      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  // ============================================================================
  // PRICE/HOURS WATCHLIST
  // ============================================================================

  // Get full watchlist
  app.get("/api/intelligence/watchlist", requireAuth, async (req, res) => {
    try {
      const watchlist = await contentIntelligence.priceWatch.scanForVolatileContent();
      res.json({
        items: watchlist,
        stats: {
          total: watchlist.length,
          highPriority: watchlist.filter(i => i.priority === "high").length,
          mediumPriority: watchlist.filter(i => i.priority === "medium").length,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get watchlist" });
    }
  });

  // Get urgent items only
  app.get("/api/intelligence/watchlist/urgent", requireAuth, async (req, res) => {
    try {
      const urgent = await contentIntelligence.priceWatch.getUrgentItems();
      res.json({ items: urgent, count: urgent.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to get urgent items" });
    }
  });

  // ============================================================================
  // EVENT CALENDAR SYNC
  // ============================================================================

  // Check all events
  app.get("/api/intelligence/events", requireAuth, async (req, res) => {
    try {
      const events = await contentIntelligence.events.checkEventRelevance();
      res.json({
        events,
        stats: {
          total: events.length,
          upcoming: events.filter(e => e.status === "upcoming").length,
          ongoing: events.filter(e => e.status === "ongoing").length,
          past: events.filter(e => e.status === "past").length,
          needsUpdate: events.filter(e => e.needsUpdate).length,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check events" });
    }
  });

  // Get past events
  app.get("/api/intelligence/events/past", requireAuth, async (req, res) => {
    try {
      const pastEvents = await contentIntelligence.events.getPastEvents();
      res.json({ events: pastEvents, count: pastEvents.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to get past events" });
    }
  });

  // ============================================================================
  // IMAGE CONSISTENCY
  // ============================================================================

  // Check specific content
  app.get("/api/intelligence/image-consistency/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const report = await contentIntelligence.imageConsistency.checkContent(contentId);

      if (!report) {
        return res.status(404).json({ error: "Content not found" });
      }

      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to check image consistency" });
    }
  });

  // Check all content
  app.get("/api/intelligence/image-consistency", requireAuth, async (req, res) => {
    try {
      const reports = await contentIntelligence.imageConsistency.checkAllContent();
      const avgScore = reports.reduce((sum, r) => sum + r.score, 0) / reports.length;
      res.json({
        reports,
        stats: {
          total: reports.length,
          avgScore: Math.round(avgScore),
          withIssues: reports.filter(r => r.issues.length > 0).length,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check image consistency" });
    }
  });

  // ============================================================================
  // AUTO THUMBNAILS
  // ============================================================================

  // Get thumbnail crops for content
  app.get("/api/intelligence/thumbnails/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const thumbnails = await contentIntelligence.thumbnails.getContentThumbnails(contentId);

      if (!thumbnails) {
        return res.status(404).json({ error: "Content not found or no hero image" });
      }

      res.json(thumbnails);
    } catch (error) {
      res.status(500).json({ error: "Failed to get thumbnails" });
    }
  });

  // ============================================================================
  // EDITORIAL TONE GUARD
  // ============================================================================

  // Analyze tone for specific content
  app.get("/api/intelligence/tone/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const analysis = await contentIntelligence.toneGuard.analyzeTone(contentId);

      if (!analysis) {
        return res.status(404).json({ error: "Content not found" });
      }

      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze tone" });
    }
  });

  // Check all content for tone issues
  app.get("/api/intelligence/tone", requireAuth, async (req, res) => {
    try {
      const issues = await contentIntelligence.toneGuard.checkAllContent();
      res.json({
        contentWithIssues: issues,
        count: issues.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check tones" });
    }
  });

  // ============================================================================
  // A/B TESTING
  // ============================================================================

  // Create new A/B test
  app.post("/api/intelligence/ab-tests", requirePermission("canEdit"), async (req, res) => {
    try {
      const { contentId, testType, variants } = req.body;

      if (!contentId || !testType || !variants || variants.length < 2) {
        return res.status(400).json({
          error:
            "Required: contentId, testType (title|heroImage|metaDescription), variants (array of at least 2)",
        });
      }

      const test = await contentIntelligence.abTesting.createTest(contentId, testType, variants);
      res.json(test);
    } catch (error) {
      res.status(500).json({ error: "Failed to create A/B test" });
    }
  });

  // Get variant for visitor
  app.get("/api/intelligence/ab-tests/:testId/variant", async (req, res) => {
    try {
      const { testId } = req.params;
      const visitorId = req.query.visitorId as string;
      const variant = contentIntelligence.abTesting.getVariant(testId, visitorId);

      if (!variant) {
        return res.status(404).json({ error: "Test not found or not running" });
      }

      res.json(variant);
    } catch (error) {
      res.status(500).json({ error: "Failed to get variant" });
    }
  });

  // Record impression
  app.post("/api/intelligence/ab-tests/:testId/impression", async (req, res) => {
    try {
      const { testId } = req.params;
      const { variantId } = req.body;
      contentIntelligence.abTesting.recordImpression(testId, variantId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to record impression" });
    }
  });

  // Record click
  app.post("/api/intelligence/ab-tests/:testId/click", async (req, res) => {
    try {
      const { testId } = req.params;
      const { variantId } = req.body;
      contentIntelligence.abTesting.recordClick(testId, variantId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to record click" });
    }
  });

  // Get test results
  app.get("/api/intelligence/ab-tests/:testId", requireAuth, async (req, res) => {
    try {
      const { testId } = req.params;
      const results = contentIntelligence.abTesting.getResults(testId);

      if (!results) {
        return res.status(404).json({ error: "Test not found" });
      }

      const winner = contentIntelligence.abTesting.determineWinner(testId);
      res.json({ ...results, winnerResult: winner });
    } catch (error) {
      res.status(500).json({ error: "Failed to get test results" });
    }
  });

  // Get all running tests
  app.get("/api/intelligence/ab-tests", requireAuth, async (req, res) => {
    try {
      const tests = await contentIntelligence.abTesting.getRunningTests();
      res.json({ tests, count: tests.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to get running tests" });
    }
  });

  // Get tests for content
  app.get("/api/intelligence/ab-tests/content/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const tests = await contentIntelligence.abTesting.getTestsForContent(contentId);
      res.json({ tests, count: tests.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to get content tests" });
    }
  });

  // ============================================================================
  // CONTENT ROI DASHBOARD
  // ============================================================================

  // Get ROI for specific content
  app.get("/api/intelligence/roi/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const roi = await contentIntelligence.roi.calculateROI(contentId);

      if (!roi) {
        return res.status(404).json({ error: "Content not found" });
      }

      res.json(roi);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate ROI" });
    }
  });

  // Get all content ROI
  app.get("/api/intelligence/roi", requireAuth, async (req, res) => {
    try {
      const allROI = await contentIntelligence.roi.getAllROI();
      const avgROI = allROI.reduce((sum, r) => sum + r.roi, 0) / allROI.length;
      res.json({
        content: allROI,
        stats: {
          total: allROI.length,
          avgROI: Math.round(avgROI),
          positive: allROI.filter(r => r.roi > 0).length,
          negative: allROI.filter(r => r.roi < 0).length,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get ROI data" });
    }
  });

  // Get underperformers
  app.get("/api/intelligence/roi/underperformers", requireAuth, async (req, res) => {
    try {
      const underperformers = await contentIntelligence.roi.getUnderperformers();
      res.json({ content: underperformers, count: underperformers.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to get underperformers" });
    }
  });

  // ============================================================================
  // INTELLIGENCE DASHBOARD
  // ============================================================================

  // Get full intelligence dashboard
  app.get("/api/intelligence/dashboard", requireAuth, async (req, res) => {
    try {
      const [clusters, gaps, watchlist, events, toneIssues] = await Promise.all([
        contentIntelligence.clusters.detectAreaClusters(),
        contentIntelligence.gaps.findAllGaps(),
        contentIntelligence.priceWatch.getUrgentItems(),
        contentIntelligence.events.getPastEvents(),
        contentIntelligence.toneGuard.checkAllContent(),
      ]);

      res.json({
        clusters: {
          total: clusters.length,
          withMissingLinks: clusters.filter(c => c.stats.missingLinks > 0).length,
          topAreas: clusters.slice(0, 5).map(c => ({ name: c.name, pages: c.childPages.length })),
        },
        gaps: {
          contentWithGaps: gaps.length,
          totalGaps: gaps.reduce((sum, g) => sum + g.gaps.length, 0),
          highPriority: gaps.reduce(
            (sum, g) => sum + g.gaps.filter(gap => gap.priority === "high").length,
            0
          ),
        },
        watchlist: {
          urgent: watchlist.length,
          items: watchlist.slice(0, 5).map(w => ({ title: w.title, type: w.type })),
        },
        events: {
          pastEvents: events.length,
          needsUpdate: events.filter(e => e.needsUpdate).length,
        },
        toneIssues: {
          total: toneIssues.length,
          items: toneIssues.slice(0, 3).map(t => ({ title: t.title, score: t.score })),
        },
        abTests: {
          running: (await contentIntelligence.abTesting.getRunningTests()).length,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get intelligence dashboard" });
    }
  });
}
