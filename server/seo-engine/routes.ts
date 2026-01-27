/**
 * SEO Engine API Routes
 *
 * Provides REST API endpoints for:
 * - Schema.org generation
 * - Canonical URL management
 * - AEO score calculation
 * - Index health monitoring
 * - Content quality analysis
 * - Internal linking
 * - Re-index triggers
 * - Bot monitoring
 * - Snippet optimization
 *
 * Feature flags control access to subsystems.
 * All flags are OFF by default for safe deployment.
 */

import { Router, Request, Response, NextFunction } from "express";
import { getSEOEngine } from "./index";
import { requirePermission } from "../security";
import {
  getSEOEngineFlags,
  isFeatureEnabled,
  updateSEOEngineFlags,
  getAutopilotConfig,
  setAutopilotMode,
  type AutopilotMode,
} from "./config";

const router = Router();

// ============================================================================
// Feature Flag Middleware
// ============================================================================

/**
 * Middleware to check if SEO Engine is enabled
 */
function requireSEOEngine(req: Request, res: Response, next: NextFunction) {
  if (!isFeatureEnabled("ENABLE_SEO_ENGINE")) {
    return res.status(404).json({
      error: "SEO Engine is not enabled",
      flag: "ENABLE_SEO_ENGINE",
      message: "Set ENABLE_SEO_ENGINE=true to enable this feature",
    });
  }
  next();
}

/**
 * Middleware to check specific subsystem
 */
function requireSubsystem(flag: keyof ReturnType<typeof getSEOEngineFlags>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isFeatureEnabled(flag)) {
      return res.status(404).json({
        error: `${flag} is not enabled`,
        flag,
        message: `Set ${flag}=true to enable this feature`,
      });
    }
    next();
  };
}

// ============================================================================
// Feature Flags & Config Endpoints
// ============================================================================

/**
 * GET /api/seo-engine/flags
 * Get current feature flag status
 */
router.get("/flags", async (req: Request, res: Response) => {
  const flags = getSEOEngineFlags();
  res.json({ flags, timestamp: new Date() });
});

/**
 * POST /api/seo-engine/flags
 * Update feature flags (requires admin)
 */
router.post("/flags", requirePermission("canEdit"), async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    updateSEOEngineFlags(updates);
    const flags = getSEOEngineFlags();
    res.json({ success: true, flags });
  } catch (error) {
    res.status(500).json({ error: "Failed to update flags" });
  }
});

// ============================================================================
// Governance & Approval Endpoints
// ============================================================================

/**
 * GET /api/seo-engine/governance/approvals
 * Get pending approval requests
 */
router.get("/governance/approvals", requireSEOEngine, async (req: Request, res: Response) => {
  try {
    const { getPendingApprovals } = await import("./governance/approval-gate");
    const approvals = getPendingApprovals();
    res.json({ approvals, count: approvals.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to get approvals" });
  }
});

/**
 * POST /api/seo-engine/governance/approvals/:id/approve
 * Approve a pending request
 */
router.post(
  "/governance/approvals/:id/approve",
  requireSEOEngine,
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const reviewedBy = (req as any).user?.id || "admin";
      const { approveRequest } = await import("./governance/approval-gate");
      const result = await approveRequest(id, reviewedBy, note);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to approve request" });
    }
  }
);

/**
 * POST /api/seo-engine/governance/approvals/:id/reject
 * Reject a pending request
 */
router.post(
  "/governance/approvals/:id/reject",
  requireSEOEngine,
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const reviewedBy = (req as any).user?.id || "admin";
      const { rejectRequest } = await import("./governance/approval-gate");
      const result = await rejectRequest(id, reviewedBy, reason || "Rejected");
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to reject request" });
    }
  }
);

/**
 * POST /api/seo-engine/governance/execute
 * Execute an SEO action with governance controls
 */
router.post(
  "/governance/execute",
  requireSEOEngine,
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { actionType, contentId, data, reason, dryRun } = req.body;
      const requestedBy = (req as any).user?.id || "admin";
      const { executeAction } = await import("./governance/action-executor");
      const result = await executeAction({
        actionType,
        contentId,
        data,
        reason: reason || "Manual action",
        requestedBy,
        dryRun: dryRun === true,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to execute action" });
    }
  }
);

/**
 * POST /api/seo-engine/governance/rollback
 * Rollback an action using a token
 */
router.post(
  "/governance/rollback",
  requireSEOEngine,
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { rollbackToken } = req.body;
      const executedBy = (req as any).user?.id || "admin";
      const { rollbackAction } = await import("./governance/action-executor");
      const result = await rollbackAction(rollbackToken, executedBy);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to rollback action" });
    }
  }
);

/**
 * GET /api/seo-engine/governance/rollback-tokens
 * Get active rollback tokens
 */
router.get(
  "/governance/rollback-tokens",
  requireSEOEngine,
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { getActiveRollbackTokens } = await import("./governance/action-executor");
      const tokens = getActiveRollbackTokens();
      res.json({ tokens, count: tokens.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to get rollback tokens" });
    }
  }
);

// ============================================================================
// Adapter Endpoints
// ============================================================================

/**
 * GET /api/seo-engine/adapters/content/:contentId
 * Get normalized content data
 */
router.get(
  "/adapters/content/:contentId",
  requireSEOEngine,
  async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      const { getContent } = await import("./adapters/content-adapter");
      const content = await getContent(contentId);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Failed to get content" });
    }
  }
);

/**
 * GET /api/seo-engine/adapters/metrics/:contentId
 * Get content metrics
 */
router.get(
  "/adapters/metrics/:contentId",
  requireSEOEngine,
  async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      const { getContentMetrics } = await import("./adapters/metrics-adapter");
      const metrics = await getContentMetrics(contentId);
      if (!metrics) {
        return res.status(404).json({ error: "Metrics not found" });
      }
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to get metrics" });
    }
  }
);

/**
 * GET /api/seo-engine/adapters/indexing/:contentId
 * Get indexing state
 */
router.get(
  "/adapters/indexing/:contentId",
  requireSEOEngine,
  async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      const { getIndexingState } = await import("./adapters/indexing-adapter");
      const state = await getIndexingState(contentId);
      if (!state) {
        return res.status(404).json({ error: "Indexing state not found" });
      }
      res.json(state);
    } catch (error) {
      res.status(500).json({ error: "Failed to get indexing state" });
    }
  }
);

/**
 * GET /api/seo-engine/adapters/links/:contentId
 * Get link summary
 */
router.get("/adapters/links/:contentId", requireSEOEngine, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { extractLinksFromContent } = await import("./adapters/link-adapter");
    const links = await extractLinksFromContent(contentId);
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: "Failed to get links" });
  }
});

/**
 * GET /api/seo-engine/adapters/comprehensive/:contentId
 * Get comprehensive report using all adapters
 */
router.get(
  "/adapters/comprehensive/:contentId",
  requireSEOEngine,
  async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      const { getComprehensiveReport } = await import("./adapters");
      const report = await getComprehensiveReport(contentId);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to get comprehensive report" });
    }
  }
);

// ============================================================================
// Dashboard & Overview
// ============================================================================

/**
 * GET /api/seo-engine/status
 * Get overall SEO Engine status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const engine = getSEOEngine();
    const status = await engine.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: "Failed to get SEO Engine status" });
  }
});

/**
 * GET /api/seo-engine/dashboard
 * Get comprehensive SEO dashboard data
 */
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const engine = getSEOEngine();
    const [indexHealth, botStats, qualitySummary] = await Promise.all([
      engine.indexHealth.getDashboard(),
      engine.botMonitor.getStats(30),
      engine.contentQuality.getSummary(),
    ]);

    res.json({
      indexHealth,
      botStats,
      qualitySummary,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get dashboard data" });
  }
});

/**
 * GET /api/seo-engine/content/:contentId/report
 * Get full SEO report for specific content
 */
router.get("/content/:contentId/report", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const engine = getSEOEngine();
    const report = await engine.generateContentReport(contentId);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate content report" });
  }
});

// ============================================================================
// Schema.org
// ============================================================================

/**
 * GET /api/seo-engine/schema/:contentId
 * Generate Schema.org structured data for content
 */
router.get("/schema/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const engine = getSEOEngine();
    const result = await engine.schema.generateForContent(contentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate schema" });
  }
});

// ============================================================================
// Canonical URLs
// ============================================================================

/**
 * GET /api/seo-engine/canonical/:contentId
 * Get canonical URL and alternates for content
 */
router.get("/canonical/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { locale } = req.query;
    const engine = getSEOEngine();
    const result = await engine.canonical.getCanonicalUrl(contentId, locale as string);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to get canonical URL" });
  }
});

/**
 * GET /api/seo-engine/canonical/:contentId/duplicates
 * Find potential duplicate content
 */
router.get("/canonical/:contentId/duplicates", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const engine = getSEOEngine();
    const result = await engine.canonical.findDuplicates(contentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to find duplicates" });
  }
});

/**
 * POST /api/seo-engine/canonical/:contentId/set
 * Set canonical source for content
 */
router.post(
  "/canonical/:contentId/set",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      const { canonicalContentId } = req.body;
      const engine = getSEOEngine();
      const success = await engine.canonical.setCanonicalSource(contentId, canonicalContentId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to set canonical" });
    }
  }
);

// ============================================================================
// AEO Score
// ============================================================================

/**
 * GET /api/seo-engine/aeo-score/:contentId
 * Calculate AEO score for content
 */
router.get("/aeo-score/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const engine = getSEOEngine();
    const result = await engine.aeoScore.calculate(contentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate AEO score" });
  }
});

/**
 * POST /api/seo-engine/aeo-score/batch
 * Calculate AEO scores for multiple content
 */
router.post(
  "/aeo-score/batch",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { contentIds } = req.body;
      const engine = getSEOEngine();
      const results = await engine.aeoScore.batchCalculate(contentIds);
      res.json({
        results: Object.fromEntries(results),
        count: results.size,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate AEO scores" });
    }
  }
);

// ============================================================================
// Index Health
// ============================================================================

/**
 * GET /api/seo-engine/index-health
 * Get index health summary
 */
router.get("/index-health", async (req: Request, res: Response) => {
  try {
    const engine = getSEOEngine();
    const summary = await engine.indexHealth.getSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to get index health" });
  }
});

/**
 * GET /api/seo-engine/index-health/dashboard
 * Get full index health dashboard
 */
router.get("/index-health/dashboard", async (req: Request, res: Response) => {
  try {
    const engine = getSEOEngine();
    const dashboard = await engine.indexHealth.getDashboard();
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: "Failed to get index health dashboard" });
  }
});

/**
 * GET /api/seo-engine/index-health/content/:contentId
 * Check health of specific content
 */
router.get("/index-health/content/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const engine = getSEOEngine();
    const health = await engine.indexHealth.checkContentHealth(contentId);
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: "Failed to check content health" });
  }
});

// ============================================================================
// Content Quality
// ============================================================================

/**
 * GET /api/seo-engine/quality/:contentId
 * Analyze content quality
 */
router.get("/quality/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const engine = getSEOEngine();
    const result = await engine.contentQuality.analyze(contentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to analyze content quality" });
  }
});

/**
 * GET /api/seo-engine/quality/thin-content
 * Find all thin content
 */
router.get("/quality/issues/thin-content", async (req: Request, res: Response) => {
  try {
    const { type, limit = "50" } = req.query;
    const engine = getSEOEngine();
    const content = await engine.contentQuality.findThinContent(
      type as string,
      parseInt(limit as string)
    );
    res.json({ content, count: content.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to find thin content" });
  }
});

/**
 * GET /api/seo-engine/quality/zero-result
 * Find zero-result content
 */
router.get("/quality/issues/zero-result", async (req: Request, res: Response) => {
  try {
    const { limit = "50" } = req.query;
    const engine = getSEOEngine();
    const content = await engine.contentQuality.findZeroResultContent(parseInt(limit as string));
    res.json({ content, count: content.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to find zero-result content" });
  }
});

/**
 * GET /api/seo-engine/quality/summary
 * Get content quality summary
 */
router.get("/quality/summary", async (req: Request, res: Response) => {
  try {
    const engine = getSEOEngine();
    const summary = await engine.contentQuality.getSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to get quality summary" });
  }
});

// ============================================================================
// Internal Linking
// ============================================================================

/**
 * GET /api/seo-engine/links/:contentId
 * Get internal links for content
 */
router.get("/links/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const engine = getSEOEngine();
    const analysis = await engine.internalLinking.getLinksForContent(contentId);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: "Failed to get internal links" });
  }
});

/**
 * GET /api/seo-engine/links/orphans
 * Find orphan pages
 */
router.get("/links/issues/orphans", async (req: Request, res: Response) => {
  try {
    const { limit = "50" } = req.query;
    const engine = getSEOEngine();
    const orphans = await engine.internalLinking.findOrphanPages(parseInt(limit as string));
    res.json({ orphans, count: orphans.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to find orphan pages" });
  }
});

/**
 * GET /api/seo-engine/links/equity
 * Get link equity distribution
 */
router.get("/links/equity", async (req: Request, res: Response) => {
  try {
    const engine = getSEOEngine();
    const distribution = await engine.internalLinking.getLinkEquityDistribution();
    res.json({ distribution });
  } catch (error) {
    res.status(500).json({ error: "Failed to get link equity" });
  }
});

/**
 * POST /api/seo-engine/links
 * Create internal link
 */
router.post("/links", requirePermission("canEdit"), async (req: Request, res: Response) => {
  try {
    const { sourceId, targetId, anchorText } = req.body;
    const engine = getSEOEngine();
    const success = await engine.internalLinking.createLink(sourceId, targetId, anchorText);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: "Failed to create link" });
  }
});

/**
 * DELETE /api/seo-engine/links
 * Delete internal link
 */
router.delete("/links", requirePermission("canEdit"), async (req: Request, res: Response) => {
  try {
    const { sourceId, targetId } = req.body;
    const engine = getSEOEngine();
    const success = await engine.internalLinking.deleteLink(sourceId, targetId);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete link" });
  }
});

// ============================================================================
// Re-index Triggers
// ============================================================================

/**
 * GET /api/seo-engine/reindex/stats
 * Get re-index statistics
 */
router.get("/reindex/stats", async (req: Request, res: Response) => {
  try {
    const engine = getSEOEngine();
    const stats = engine.reindex.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to get reindex stats" });
  }
});

/**
 * GET /api/seo-engine/reindex/pending
 * Get pending re-index triggers
 */
router.get("/reindex/pending", async (req: Request, res: Response) => {
  try {
    const engine = getSEOEngine();
    const pending = engine.reindex.getPendingTriggers();
    res.json({ pending, count: pending.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to get pending triggers" });
  }
});

/**
 * POST /api/seo-engine/reindex/:contentId
 * Manually trigger re-index for content
 */
router.post(
  "/reindex/:contentId",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      const engine = getSEOEngine();
      const result = await engine.reindex.manualReindex(contentId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to trigger re-index" });
    }
  }
);

/**
 * POST /api/seo-engine/reindex/bulk
 * Bulk trigger re-index
 */
router.post("/reindex/bulk", requirePermission("canEdit"), async (req: Request, res: Response) => {
  try {
    const { contentIds } = req.body;
    const engine = getSEOEngine();
    const result = await engine.reindex.bulkReindex(contentIds);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to bulk trigger re-index" });
  }
});

/**
 * POST /api/seo-engine/reindex/process
 * Process pending re-index queue
 */
router.post(
  "/reindex/process",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { maxItems = 10 } = req.body;
      const engine = getSEOEngine();
      const result = await engine.reindex.processQueue(maxItems);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to process queue" });
    }
  }
);

// ============================================================================
// Bot Monitoring
// ============================================================================

/**
 * GET /api/seo-engine/bots/stats
 * Get bot statistics
 */
router.get("/bots/stats", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const engine = getSEOEngine();
    const stats = await engine.botMonitor.getStats(parseInt(days as string));
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to get bot stats" });
  }
});

/**
 * GET /api/seo-engine/bots/ai-crawlers
 * Get AI crawler activity
 */
router.get("/bots/ai-crawlers", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const engine = getSEOEngine();
    const activity = await engine.botMonitor.getAICrawlerActivity(parseInt(days as string));
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: "Failed to get AI crawler activity" });
  }
});

/**
 * GET /api/seo-engine/bots/alerts
 * Get bot behavior alerts
 */
router.get("/bots/alerts", async (req: Request, res: Response) => {
  try {
    const { limit = "20" } = req.query;
    const engine = getSEOEngine();
    const alerts = engine.botMonitor.getAlerts(parseInt(limit as string));
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to get alerts" });
  }
});

// ============================================================================
// Snippet Optimization
// ============================================================================

/**
 * GET /api/seo-engine/snippet/:contentId
 * Get snippet readiness for content
 */
router.get("/snippet/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const engine = getSEOEngine();
    const readiness = await engine.snippet.analyzeReadiness(contentId);
    res.json(readiness);
  } catch (error) {
    res.status(500).json({ error: "Failed to analyze snippet readiness" });
  }
});

/**
 * POST /api/seo-engine/snippet/:contentId/generate
 * Generate answer capsule for content
 */
router.post(
  "/snippet/:contentId/generate",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      const engine = getSEOEngine();
      const capsule = await engine.snippet.generateCapsule(contentId);
      res.json({ success: true, capsule });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate capsule" });
    }
  }
);

// ============================================================================
// Page Classification (MEGA MISSION)
// ============================================================================

/**
 * GET /api/seo-engine/classification/:contentId
 * Get classification for specific content
 */
router.get("/classification/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { PageClassifier } = await import("./page-classifier");
    const classifier = new PageClassifier();
    const result = await classifier.classifyContent(contentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to classify content" });
  }
});

/**
 * GET /api/seo-engine/classification/distribution
 * Get classification distribution across all content
 */
router.get("/classification/distribution", async (req: Request, res: Response) => {
  try {
    const { PageClassifier } = await import("./page-classifier");
    const classifier = new PageClassifier();
    const distribution = await classifier.getDistribution();
    res.json(distribution);
  } catch (error) {
    res.status(500).json({ error: "Failed to get distribution" });
  }
});

/**
 * GET /api/seo-engine/classification/risk-pages
 * Get all SEO_RISK classified pages
 */
router.get("/classification/risk-pages", async (req: Request, res: Response) => {
  try {
    const { PageClassifier } = await import("./page-classifier");
    const classifier = new PageClassifier();
    const riskPages = await classifier.getRiskPages();
    res.json({ pages: riskPages, count: riskPages.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to get risk pages" });
  }
});

/**
 * POST /api/seo-engine/classification/:contentId/override
 * Override classification for content
 */
router.post(
  "/classification/:contentId/override",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      const { classification, reason, approvedBy } = req.body;
      const { PageClassifier } = await import("./page-classifier");
      const classifier = new PageClassifier();
      await classifier.overrideClassification(contentId, classification, reason, approvedBy);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to override classification" });
    }
  }
);

// ============================================================================
// AEO Validation (MEGA MISSION)
// ============================================================================

/**
 * GET /api/seo-engine/aeo-validation/:contentId
 * Validate content against AEO standards
 */
router.get("/aeo-validation/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { AEOContentValidator } = await import("./aeo-content-validator");
    const validator = new AEOContentValidator();
    const result = await validator.validateContent(contentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to validate AEO readiness" });
  }
});

/**
 * GET /api/seo-engine/aeo-validation/needs-enhancement
 * Get content needing AEO enhancement
 */
router.get("/aeo-validation/needs-enhancement", async (req: Request, res: Response) => {
  try {
    const { AEOContentValidator } = await import("./aeo-content-validator");
    const validator = new AEOContentValidator();
    const content = await validator.getContentNeedingEnhancement();
    res.json({ content, count: content.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to get enhancement needs" });
  }
});

// ============================================================================
// Link Graph (MEGA MISSION)
// ============================================================================

/**
 * GET /api/seo-engine/link-graph/stats
 * Get link graph statistics
 */
router.get("/link-graph/stats", async (req: Request, res: Response) => {
  try {
    const { LinkGraphEngine } = await import("./link-graph-engine");
    const engine = new LinkGraphEngine();
    if (engine.needsRebuild()) {
      await engine.buildGraph();
    }
    const stats = engine.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to get link graph stats" });
  }
});

/**
 * GET /api/seo-engine/link-graph/flow/:contentId
 * Analyze link flow for specific content
 */
router.get("/link-graph/flow/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { LinkGraphEngine } = await import("./link-graph-engine");
    const engine = new LinkGraphEngine();
    const analysis = await engine.analyzeLinkFlow(contentId);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: "Failed to analyze link flow" });
  }
});

/**
 * GET /api/seo-engine/link-graph/optimizations
 * Get link optimization suggestions
 */
router.get("/link-graph/optimizations", async (req: Request, res: Response) => {
  try {
    const { LinkGraphEngine } = await import("./link-graph-engine");
    const engine = new LinkGraphEngine();
    const optimizations = await engine.getOptimizations();
    res.json({ optimizations, count: optimizations.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to get optimizations" });
  }
});

/**
 * GET /api/seo-engine/link-graph/top-pages
 * Get top pages by PageRank
 */
router.get("/link-graph/top-pages", async (req: Request, res: Response) => {
  try {
    const { limit = "20" } = req.query;
    const { LinkGraphEngine } = await import("./link-graph-engine");
    const engine = new LinkGraphEngine();
    if (engine.needsRebuild()) {
      await engine.buildGraph();
    }
    const pages = engine.getTopPagesByRank(parseInt(limit as string));
    res.json({ pages, count: pages.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to get top pages" });
  }
});

/**
 * POST /api/seo-engine/link-graph/rebuild
 * Force rebuild of link graph
 */
router.post(
  "/link-graph/rebuild",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { LinkGraphEngine } = await import("./link-graph-engine");
      const engine = new LinkGraphEngine();
      const graph = await engine.buildGraph();
      res.json({
        success: true,
        nodes: graph.nodes.size,
        edges: graph.edges.length,
        orphans: graph.orphans.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to rebuild link graph" });
    }
  }
);

// ============================================================================
// Content Pipeline (MEGA MISSION)
// ============================================================================

/**
 * GET /api/seo-engine/pipeline/run
 * Run content pipeline scan
 */
router.get("/pipeline/run", async (req: Request, res: Response) => {
  try {
    const { ContentPipeline } = await import("./content-pipeline");
    const pipeline = new ContentPipeline();
    const result = await pipeline.runPipeline();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to run pipeline" });
  }
});

/**
 * GET /api/seo-engine/pipeline/issues/:type
 * Get issues by type
 */
router.get("/pipeline/issues/:type", async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { ContentPipeline } = await import("./content-pipeline");
    const pipeline = new ContentPipeline();
    const issues = await pipeline.getIssuesByType(type as any);
    res.json({ issues, count: issues.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to get issues" });
  }
});

/**
 * GET /api/seo-engine/pipeline/urgent
 * Get urgent issues requiring action
 */
router.get("/pipeline/urgent", async (req: Request, res: Response) => {
  try {
    const { ContentPipeline } = await import("./content-pipeline");
    const pipeline = new ContentPipeline();
    const issues = await pipeline.getUrgentIssues();
    res.json({ issues, count: issues.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to get urgent issues" });
  }
});

// ============================================================================
// Risk Monitor (MEGA MISSION)
// ============================================================================

/**
 * GET /api/seo-engine/risks
 * Get all active risk alerts
 */
router.get("/risks", async (req: Request, res: Response) => {
  try {
    const { RiskMonitor } = await import("./risk-monitor");
    const monitor = new RiskMonitor();
    const alerts = monitor.getActiveAlerts();
    const summary = monitor.getSummary();
    res.json({ alerts, summary });
  } catch (error) {
    res.status(500).json({ error: "Failed to get risks" });
  }
});

/**
 * POST /api/seo-engine/risks/check
 * Run risk check
 */
router.post("/risks/check", requirePermission("canEdit"), async (req: Request, res: Response) => {
  try {
    const { RiskMonitor } = await import("./risk-monitor");
    const monitor = new RiskMonitor();
    const alerts = await monitor.runRiskCheck();
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to run risk check" });
  }
});

/**
 * POST /api/seo-engine/risks/:alertId/acknowledge
 * Acknowledge a risk alert
 */
router.post(
  "/risks/:alertId/acknowledge",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const { acknowledgedBy } = req.body;
      const { RiskMonitor } = await import("./risk-monitor");
      const monitor = new RiskMonitor();
      const success = monitor.acknowledgeAlert(alertId, acknowledgedBy);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  }
);

/**
 * POST /api/seo-engine/risks/:alertId/resolve
 * Resolve a risk alert
 */
router.post(
  "/risks/:alertId/resolve",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const { RiskMonitor } = await import("./risk-monitor");
      const monitor = new RiskMonitor();
      const success = monitor.resolveAlert(alertId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  }
);

// ============================================================================
// Executive Dashboard (MEGA MISSION)
// ============================================================================

/**
 * GET /api/seo-engine/executive
 * Get full executive dashboard
 */
router.get("/executive", async (req: Request, res: Response) => {
  try {
    const { ExecutiveDashboardAPI } = await import("./executive-dashboard");
    const dashboard = new ExecutiveDashboardAPI();
    const data = await dashboard.generateDashboard();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate executive dashboard" });
  }
});

/**
 * GET /api/seo-engine/executive/quick-health
 * Get quick health check
 */
router.get("/executive/quick-health", async (req: Request, res: Response) => {
  try {
    const { ExecutiveDashboardAPI } = await import("./executive-dashboard");
    const dashboard = new ExecutiveDashboardAPI();
    const health = await dashboard.getQuickHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: "Failed to get quick health" });
  }
});

/**
 * GET /api/seo-engine/executive/metric/:metric
 * Get specific metric
 */
router.get("/executive/metric/:metric", async (req: Request, res: Response) => {
  try {
    const { metric } = req.params;
    const { ExecutiveDashboardAPI } = await import("./executive-dashboard");
    const dashboard = new ExecutiveDashboardAPI();
    const data = await dashboard.getMetric(metric as any);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to get metric" });
  }
});

// ============================================================================
// Autopilot (MEGA MISSION)
// ============================================================================

/**
 * GET /api/seo-engine/autopilot/status
 * Get autopilot status
 */
router.get("/autopilot/status", async (req: Request, res: Response) => {
  try {
    const { getAutopilot } = await import("./autopilot");
    const autopilot = getAutopilot();
    const status = autopilot.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: "Failed to get autopilot status" });
  }
});

/**
 * GET /api/seo-engine/autopilot/config
 * Get autopilot configuration
 */
router.get("/autopilot/config", async (req: Request, res: Response) => {
  try {
    const { getAutopilot } = await import("./autopilot");
    const autopilot = getAutopilot();
    const config = autopilot.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Failed to get autopilot config" });
  }
});

/**
 * POST /api/seo-engine/autopilot/mode
 * Set autopilot mode
 */
router.post(
  "/autopilot/mode",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { mode } = req.body;
      if (!["off", "supervised", "full"].includes(mode)) {
        return res.status(400).json({ error: "Invalid mode. Must be: off, supervised, or full" });
      }
      const { getAutopilot } = await import("./autopilot");
      const autopilot = getAutopilot();
      autopilot.setMode(mode);
      res.json({ success: true, mode });
    } catch (error) {
      res.status(500).json({ error: "Failed to set autopilot mode" });
    }
  }
);

/**
 * POST /api/seo-engine/autopilot/run
 * Run autopilot cycle
 */
router.post("/autopilot/run", requirePermission("canEdit"), async (req: Request, res: Response) => {
  try {
    const { getAutopilot } = await import("./autopilot");
    const autopilot = getAutopilot();
    const result = await autopilot.runCycle();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to run autopilot cycle" });
  }
});

/**
 * POST /api/seo-engine/autopilot/pre-publish/:contentId
 * Pre-publish check
 */
router.post("/autopilot/pre-publish/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { getAutopilot } = await import("./autopilot");
    const autopilot = getAutopilot();
    const result = await autopilot.prePublishCheck(contentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to run pre-publish check" });
  }
});

/**
 * POST /api/seo-engine/autopilot/post-publish/:contentId
 * Post-publish actions
 */
router.post(
  "/autopilot/post-publish/:contentId",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      const { getAutopilot } = await import("./autopilot");
      const autopilot = getAutopilot();
      const result = await autopilot.postPublishActions(contentId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to run post-publish actions" });
    }
  }
);

// ============================================================================
// Actions Engine (MEGA MISSION)
// ============================================================================

/**
 * GET /api/seo-engine/actions/:contentId/evaluate
 * Evaluate content for actions
 */
router.get("/actions/:contentId/evaluate", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { SEOActionEngine } = await import("../seo-actions/action-engine");
    const engine = new SEOActionEngine();
    const decision = await engine.evaluateContent(contentId);
    res.json(decision);
  } catch (error) {
    res.status(500).json({ error: "Failed to evaluate content" });
  }
});

/**
 * POST /api/seo-engine/actions/:contentId/execute
 * Execute actions for content
 */
router.post(
  "/actions/:contentId/execute",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      const { SEOActionEngine } = await import("../seo-actions/action-engine");
      const engine = new SEOActionEngine();
      const result = await engine.executeActions(contentId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to execute actions" });
    }
  }
);

/**
 * GET /api/seo-engine/actions/pending
 * Get all pending actions
 */
router.get("/actions/pending", async (req: Request, res: Response) => {
  try {
    const { SEOActionEngine } = await import("../seo-actions/action-engine");
    const engine = new SEOActionEngine();
    const pending = await engine.getPendingActions();
    res.json({
      pending: Object.fromEntries(pending),
      count: pending.size,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get pending actions" });
  }
});

export default router;

/**
 * Register SEO Engine routes
 */
export function registerSEOEngineRoutes(app: any) {
  app.use("/api/seo-engine", router);
}
