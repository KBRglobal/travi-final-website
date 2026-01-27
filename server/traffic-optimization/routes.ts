/**
 * Traffic Optimization - Admin API Routes
 *
 * GET  /api/admin/traffic-optimization/summary
 * GET  /api/admin/traffic-optimization/content/:id
 * GET  /api/admin/traffic-optimization/segments
 * POST /api/admin/traffic-optimization/proposals/:id/approve
 * POST /api/admin/traffic-optimization/proposals/:id/reject
 *
 * Feature Flags:
 * - ENABLE_TRAFFIC_OPTIMIZATION (main toggle)
 * - ENABLE_TRAFFIC_OPTIMIZATION_PROPOSALS (proposal generation)
 * - ENABLE_TRAFFIC_OPTIMIZATION_EXPERIMENTS (experiment recommendations)
 */

import { Router, Request, Response, NextFunction } from "express";
import { getSegmentAnalyzer } from "./segments";
import { getBottleneckDetector } from "./bottlenecks";
import { getProposalEngine } from "./proposals";
import { getExperimentRecommender } from "./experiments";
import type { OptimizationSummary, ContentOptimizationView } from "./types";

// ============================================================================
// FEATURE FLAG CHECKS
// ============================================================================

function isEnabled(): boolean {
  return process.env.ENABLE_TRAFFIC_OPTIMIZATION === "true";
}

function proposalsEnabled(): boolean {
  return process.env.ENABLE_TRAFFIC_OPTIMIZATION_PROPOSALS !== "false"; // Default true
}

function experimentsEnabled(): boolean {
  return process.env.ENABLE_TRAFFIC_OPTIMIZATION_EXPERIMENTS !== "false"; // Default true
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

function requireEnabled(req: Request, res: Response, next: NextFunction): void {
  if (!isEnabled()) {
    res.status(404).json({
      error: "Traffic optimization feature is disabled",
      hint: "Set ENABLE_TRAFFIC_OPTIMIZATION=true to enable",
    });
    return;
  }
  next();
}

function requireProposals(req: Request, res: Response, next: NextFunction): void {
  if (!proposalsEnabled()) {
    res.status(404).json({
      error: "Proposal generation is disabled",
      hint: "Set ENABLE_TRAFFIC_OPTIMIZATION_PROPOSALS=true to enable",
    });
    return;
  }
  next();
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/admin/traffic-optimization/summary
 * Returns overall optimization summary
 */
async function getSummary(req: Request, res: Response): Promise<void> {
  try {
    const segmentAnalyzer = getSegmentAnalyzer();
    const bottleneckDetector = getBottleneckDetector();
    const proposalEngine = getProposalEngine();
    const experimentRecommender = getExperimentRecommender();

    const segmentReport = segmentAnalyzer.generateReport();
    const bottleneckReport = bottleneckDetector.generateReport();
    const proposalSummary = proposalEngine.getSummary();
    const experimentSummary = experimentRecommender.getSummary();

    const pendingProposals = proposalEngine.getProposalsByStatus("pending");

    const summary: OptimizationSummary = {
      generatedAt: new Date(),
      status: {
        enabled: isEnabled(),
        proposalsEnabled: proposalsEnabled(),
        experimentsEnabled: experimentsEnabled(),
      },
      metrics: {
        totalProposals: proposalSummary.total,
        pendingProposals: proposalSummary.pending,
        approvedProposals: proposalSummary.approved,
        implementedProposals: proposalSummary.implemented,
        activeExperiments: experimentSummary.activeCount,
      },
      recentBottlenecks: bottleneckReport.topPriority.slice(0, 5),
      pendingProposals: pendingProposals.slice(0, 10),
      performanceHighlights: {
        topImprovement: null, // Would be calculated from historical data
        biggestOpportunity: bottleneckReport.topPriority[0]
          ? {
              contentId: bottleneckReport.topPriority[0].affectedContent[0]?.contentId || "",
              potentialGain: bottleneckReport.topPriority[0].affectedContent[0]?.impactScore || 0,
            }
          : null,
      },
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate optimization summary" });
  }
}

/**
 * GET /api/admin/traffic-optimization/content/:id
 * Returns optimization view for specific content
 */
async function getContentOptimization(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Content ID is required" });
      return;
    }

    const bottleneckDetector = getBottleneckDetector();
    const proposalEngine = getProposalEngine();
    const experimentRecommender = getExperimentRecommender();
    const segmentAnalyzer = getSegmentAnalyzer();

    // Get bottlenecks for content
    const bottlenecks = bottleneckDetector.getBottlenecksForContent(id);

    // Get proposals for content
    const proposals = proposalEngine.getProposalsForContent(id);

    // Get active experiments
    const experiments = experimentRecommender.getExperimentsForContent(id);

    // Generate recommendations based on bottlenecks
    const recommendations: string[] = [];
    if (bottlenecks.length === 0) {
      recommendations.push("No significant issues detected");
    } else {
      for (const bn of bottlenecks.slice(0, 3)) {
        recommendations.push(...bn.suggestedActions.slice(0, 2));
      }
    }

    // Build response
    const view: ContentOptimizationView = {
      contentId: id,
      currentPerformance: {
        visits: 0, // Would come from traffic-intel
        bounceRate: 0,
        avgTimeOnPage: 0,
        conversionRate: 0,
        aiVisibilityScore: 0,
      },
      bottlenecks,
      proposals,
      experiments: experiments.map(e => ({
        type: "ab_test",
        name: `Experiment ${e.id}`,
        description: "",
        hypothesis: "",
        variants: [],
        primaryMetric: "",
        secondaryMetrics: [],
        minimumSampleSize: 0,
        durationDays: 14,
        confidenceThreshold: 0.95,
      })),
      segmentBreakdown: [],
      recommendations,
    };

    res.json(view);
  } catch (error) {
    res.status(500).json({ error: "Failed to get content optimization view" });
  }
}

/**
 * GET /api/admin/traffic-optimization/segments
 * Returns segment performance report
 */
async function getSegments(req: Request, res: Response): Promise<void> {
  try {
    const segmentAnalyzer = getSegmentAnalyzer();
    const report = segmentAnalyzer.generateReport();

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: "Failed to get segment report" });
  }
}

/**
 * GET /api/admin/traffic-optimization/bottlenecks
 * Returns bottleneck report
 */
async function getBottlenecks(req: Request, res: Response): Promise<void> {
  try {
    const bottleneckDetector = getBottleneckDetector();
    const report = bottleneckDetector.generateReport();

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: "Failed to get bottleneck report" });
  }
}

/**
 * GET /api/admin/traffic-optimization/proposals
 * Returns all proposals
 */
async function getProposals(req: Request, res: Response): Promise<void> {
  try {
    const { status, contentId } = req.query;
    const proposalEngine = getProposalEngine();

    let proposals = proposalEngine.getAllProposals();

    if (status && typeof status === "string") {
      proposals = proposals.filter(p => p.status === status);
    }

    if (contentId && typeof contentId === "string") {
      proposals = proposals.filter(p => p.contentId === contentId);
    }

    res.json({
      total: proposals.length,
      proposals,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get proposals" });
  }
}

/**
 * POST /api/admin/traffic-optimization/proposals/:id/approve
 * Approve a pending proposal
 */
async function approveProposal(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    if (!id) {
      res.status(400).json({ error: "Proposal ID is required" });
      return;
    }

    if (!approvedBy) {
      res.status(400).json({ error: "approvedBy is required in request body" });
      return;
    }

    const proposalEngine = getProposalEngine();
    const proposal = proposalEngine.approveProposal(id, approvedBy);

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found or not in pending status" });
      return;
    }

    res.json({
      success: true,
      message: "Proposal approved",
      proposal,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to approve proposal" });
  }
}

/**
 * POST /api/admin/traffic-optimization/proposals/:id/reject
 * Reject a pending proposal
 */
async function rejectProposal(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { rejectedBy, reason } = req.body;

    if (!id) {
      res.status(400).json({ error: "Proposal ID is required" });
      return;
    }

    if (!rejectedBy || !reason) {
      res.status(400).json({ error: "rejectedBy and reason are required in request body" });
      return;
    }

    const proposalEngine = getProposalEngine();
    const proposal = proposalEngine.rejectProposal(id, rejectedBy, reason);

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found or not in pending status" });
      return;
    }

    res.json({
      success: true,
      message: "Proposal rejected",
      proposal,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to reject proposal" });
  }
}

/**
 * POST /api/admin/traffic-optimization/proposals/:id/implement
 * Mark an approved proposal as implemented
 */
async function implementProposal(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Proposal ID is required" });
      return;
    }

    const proposalEngine = getProposalEngine();
    const proposal = proposalEngine.markImplemented(id);

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found or not in approved status" });
      return;
    }

    res.json({
      success: true,
      message: "Proposal marked as implemented",
      proposal,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark proposal as implemented" });
  }
}

/**
 * POST /api/admin/traffic-optimization/proposals/:id/rollback
 * Roll back an implemented proposal
 */
async function rollbackProposal(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id) {
      res.status(400).json({ error: "Proposal ID is required" });
      return;
    }

    if (!reason) {
      res.status(400).json({ error: "reason is required in request body" });
      return;
    }

    const proposalEngine = getProposalEngine();
    const proposal = proposalEngine.rollback(id, reason);

    if (!proposal) {
      res.status(404).json({
        error: "Proposal not found, not implemented, or not reversible",
      });
      return;
    }

    res.json({
      success: true,
      message: "Proposal rolled back",
      proposal,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to roll back proposal" });
  }
}

/**
 * GET /api/admin/traffic-optimization/experiments
 * Returns experiment summary
 */
async function getExperiments(req: Request, res: Response): Promise<void> {
  try {
    const experimentRecommender = getExperimentRecommender();

    const active = experimentRecommender.getActiveExperiments();
    const summary = experimentRecommender.getSummary();

    res.json({
      active,
      summary,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get experiments" });
  }
}

/**
 * GET /api/admin/traffic-optimization/status
 * Returns feature status
 */
function getStatus(req: Request, res: Response): void {
  res.json({
    enabled: isEnabled(),
    proposalsEnabled: proposalsEnabled(),
    experimentsEnabled: experimentsEnabled(),
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// ROUTER
// ============================================================================

export function createTrafficOptimizationRouter(): Router {
  const router = Router();

  // Status endpoint (always available)
  router.get("/status", getStatus);

  // All other routes require feature to be enabled
  router.use(requireEnabled);

  // Summary and analytics
  router.get("/summary", getSummary);
  router.get("/segments", getSegments);
  router.get("/bottlenecks", getBottlenecks);
  router.get("/experiments", getExperiments);

  // Content-specific
  router.get("/content/:id", getContentOptimization);

  // Proposals (require proposals enabled)
  router.get("/proposals", requireProposals, getProposals);
  router.post("/proposals/:id/approve", requireProposals, approveProposal);
  router.post("/proposals/:id/reject", requireProposals, rejectProposal);
  router.post("/proposals/:id/implement", requireProposals, implementProposal);
  router.post("/proposals/:id/rollback", requireProposals, rollbackProposal);

  return router;
}

export default createTrafficOptimizationRouter;
