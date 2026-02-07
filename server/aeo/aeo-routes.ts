/**
 * AEO (Answer Engine Optimization) API Routes
 * Routes for managing AEO features including answer capsules, citations, and performance tracking
 */

import { Router, Request, Response } from "express";
import { db } from "../db";
import {
  contents,
  aeoAnswerCapsules,
  aeoCitations,
  aeoPerformanceMetrics,
  aeoProgrammaticContent,
  aeoAbTests,
} from "../../shared/schema";
import { eq, and, desc, gte, count } from "drizzle-orm";
import { generateLlmsTxt, generateLlmsFullTxt } from "./aeo-static-files";
import {
  generateAnswerCapsule,
  batchGenerateCapsules,
  getCapsuleStats,
} from "./answer-capsule-generator";
import { generateAEOSchema, batchGenerateSchemas, validateSchema } from "./aeo-schema-generator";
import { logCitation, getAEODashboard, getCrawlerStats, getCitationInsights } from "./aeo-tracking";
import { log } from "../lib/logger";

const aeoLogger = {
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[AEO] ${msg}`, undefined, data),
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[AEO] ${msg}`, data),
};

const router = Router();

// ============================================================================
// Static Files (llms.txt, ai-plugin.json)
// ============================================================================
// Note: robots.txt is handled in server/routes.ts to avoid duplication

/**
 * GET /.well-known/ai-plugin.json - ChatGPT/AI Plugin manifest
 */
router.get("/.well-known/ai-plugin.json", (_req: Request, res: Response) => {
  const aiPlugin = {
    schema_version: "v1",
    name_for_human: "TRAVI World",
    name_for_model: "travi_world",
    description_for_human:
      "Travel guide for 16+ destinations with attractions, hotels, and local tips.",
    description_for_model:
      "TRAVI World provides comprehensive travel information including tourist attractions, hotels, restaurants, transportation guides, and local tips for destinations like Dubai, Paris, Tokyo, London, and more. Use this for travel planning queries.",
    auth: { type: "none" },
    api: {
      type: "openapi",
      url: "https://travi.world/openapi.json",
    },
    logo_url: "https://travi.world/logo.png",
    contact_email: "info@travi.world",
    legal_info_url: "https://travi.world/terms",
  };

  res.set("Content-Type", "application/json");
  res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
  res.json(aiPlugin);
});

/**
 * GET /llms.txt - Return machine-readable site info for AI
 */
router.get("/llms.txt", (req: Request, res: Response) => {
  const siteUrl = `${req.protocol}://${req.get("host")}`;
  const llmsTxt = generateLlmsTxt(siteUrl);

  res.set("Content-Type", "text/plain; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
  res.send(llmsTxt);
});

/**
 * GET /llms-full.txt - Return extended machine-readable site info
 */
router.get("/llms-full.txt", (req: Request, res: Response) => {
  const siteUrl = `${req.protocol}://${req.get("host")}`;
  const llmsFullTxt = generateLlmsFullTxt(siteUrl);

  res.set("Content-Type", "text/plain; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(llmsFullTxt);
});

// ============================================================================
// Answer Capsules
// ============================================================================

/**
 * GET /api/aeo/capsules - List all answer capsules
 */
router.get("/api/aeo/capsules", async (req: Request, res: Response) => {
  try {
    const { locale, status, page = "1", limit = "50" } = req.query;
    const offset = (Number.parseInt(page as string) - 1) * Number.parseInt(limit as string);

    let query = db.select().from(aeoAnswerCapsules);

    if (locale) {
      query = query.where(eq(aeoAnswerCapsules.locale, locale as any)) as any;
    }

    if (status === "approved") {
      query = query.where(eq(aeoAnswerCapsules.isApproved, true)) as any;
    } else if (status === "pending") {
      query = query.where(eq(aeoAnswerCapsules.isApproved, false)) as any;
    }

    const capsules = await query
      .orderBy(desc(aeoAnswerCapsules.generatedAt))
      .limit(Number.parseInt(limit as string))
      .offset(offset);

    // Get total count
    const totalResult = await db.select({ count: count() }).from(aeoAnswerCapsules);
    const total = totalResult[0]?.count || 0;

    res.json({
      capsules,
      pagination: {
        page: Number.parseInt(page as string),
        limit: Number.parseInt(limit as string),
        total,
        pages: Math.ceil(total / Number.parseInt(limit as string)),
      },
    });
  } catch (error) {
    aeoLogger.error("Failed to list capsules", { error });
    res.status(500).json({ error: "Failed to list capsules" });
  }
});

/**
 * GET /api/aeo/capsules/:contentId - Get capsule for specific content
 */
router.get("/api/aeo/capsules/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { locale = "en" } = req.query;

    const capsule = await db.query.aeoAnswerCapsules.findFirst({
      where: and(
        eq(aeoAnswerCapsules.contentId, contentId),
        eq(aeoAnswerCapsules.locale, locale as any)
      ),
    });

    if (!capsule) {
      res.status(404).json({ error: "Capsule not found" });
      return;
    }

    res.json(capsule);
  } catch (error) {
    aeoLogger.error("Failed to get capsule", { error });
    res.status(500).json({ error: "Failed to get capsule" });
  }
});

/**
 * POST /api/aeo/capsules/generate - Generate capsule for content
 */
router.post("/api/aeo/capsules/generate", async (req: Request, res: Response) => {
  try {
    const { contentId, locale = "en", forceRegenerate = false } = req.body;

    if (!contentId) {
      res.status(400).json({ error: "contentId is required" });
      return;
    }

    const result = await generateAnswerCapsule({
      contentId,
      locale,
      forceRegenerate,
    });

    res.json({
      success: true,
      capsule: result,
    });
  } catch (error) {
    aeoLogger.error("Failed to generate capsule", { error });
    res.status(500).json({ error: "Failed to generate capsule" });
  }
});

/**
 * POST /api/aeo/capsules/batch - Batch generate capsules
 */
router.post("/api/aeo/capsules/batch", async (req: Request, res: Response) => {
  try {
    const { contentIds, locale = "en", skipExisting = true } = req.body;

    if (!contentIds || !Array.isArray(contentIds)) {
      res.status(400).json({ error: "contentIds array is required" });
      return;
    }

    const result = await batchGenerateCapsules(contentIds, locale, { skipExisting });

    res.json({
      ...result,
      completed: true,
    });
  } catch (error) {
    aeoLogger.error("Failed to batch generate capsules", { error });
    res.status(500).json({ error: "Failed to batch generate capsules" });
  }
});

/**
 * PUT /api/aeo/capsules/:id/approve - Approve a capsule
 */
router.put("/api/aeo/capsules/:id/approve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    await db
      .update(aeoAnswerCapsules)
      .set({
        isApproved: true,
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(aeoAnswerCapsules.id, id));

    res.json({ success: true });
  } catch (error) {
    aeoLogger.error("Failed to approve capsule", { error });
    res.status(500).json({ error: "Failed to approve capsule" });
  }
});

/**
 * PUT /api/aeo/capsules/:id - Update a capsule
 */
router.put("/api/aeo/capsules/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { capsuleText, quickAnswer, keyFacts, differentiator } = req.body;

    await db
      .update(aeoAnswerCapsules)
      .set({
        capsuleText,
        quickAnswer,
        keyFacts,
        differentiator,
        generatedByAI: false, // Mark as manually edited
        updatedAt: new Date(),
      } as any)
      .where(eq(aeoAnswerCapsules.id, id));

    res.json({ success: true });
  } catch (error) {
    aeoLogger.error("Failed to update capsule", { error });
    res.status(500).json({ error: "Failed to update capsule" });
  }
});

/**
 * GET /api/aeo/capsules/stats - Get capsule statistics
 */
router.get("/api/aeo/capsules/stats", async (req: Request, res: Response) => {
  try {
    const stats = await getCapsuleStats();
    res.json(stats);
  } catch (error) {
    aeoLogger.error("Failed to get capsule stats", { error });
    res.status(500).json({ error: "Failed to get capsule stats" });
  }
});

// ============================================================================
// Schema Management
// ============================================================================

/**
 * GET /api/aeo/schema/:contentId - Get AEO schema for content
 */
router.get("/api/aeo/schema/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const options = {
      includeAnswerCapsule: req.query.capsule !== "false",
      includeFAQ: req.query.faq !== "false",
      includeHowTo: req.query.howto !== "false",
      includeBreadcrumbs: req.query.breadcrumbs !== "false",
      siteUrl: `${req.protocol}://${req.get("host")}`,
      locale: (req.query.locale as string) || "en",
    };

    const schema = await generateAEOSchema(contentId, options);
    const validation = validateSchema(schema);

    res.json({
      schema,
      validation,
    });
  } catch (error) {
    aeoLogger.error("Failed to get schema", { error });
    res.status(500).json({ error: "Failed to get schema" });
  }
});

/**
 * POST /api/aeo/schema/batch - Batch generate schemas
 */
router.post("/api/aeo/schema/batch", async (req: Request, res: Response) => {
  try {
    const { contentIds } = req.body;

    if (!contentIds || !Array.isArray(contentIds)) {
      res.status(400).json({ error: "contentIds array is required" });
      return;
    }

    const result = await batchGenerateSchemas(contentIds, {
      siteUrl: `${req.protocol}://${req.get("host")}`,
    });

    res.json({
      ...result,
      completed: true,
    });
  } catch (error) {
    aeoLogger.error("Failed to batch generate schemas", { error });
    res.status(500).json({ error: "Failed to batch generate schemas" });
  }
});

// ============================================================================
// Citations
// ============================================================================

/**
 * POST /api/aeo/citations - Log a citation
 */
router.post("/api/aeo/citations", async (req: Request, res: Response) => {
  try {
    const citationId = await logCitation(req.body);

    if (citationId) {
      res.json({ success: true, id: citationId });
    } else {
      res.status(500).json({ error: "Failed to log citation" });
    }
  } catch (error) {
    aeoLogger.error("Failed to log citation", { error });
    res.status(500).json({ error: "Failed to log citation" });
  }
});

/**
 * GET /api/aeo/citations - List citations
 */
router.get("/api/aeo/citations", async (req: Request, res: Response) => {
  try {
    const { platform, contentId, days = "30", page = "1", limit = "50" } = req.query;
    const offset = (Number.parseInt(page as string) - 1) * Number.parseInt(limit as string);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number.parseInt(days as string));

    let conditions = [gte(aeoCitations.detectedAt, startDate)];

    if (platform) {
      conditions.push(eq(aeoCitations.platform, platform as any));
    }
    if (contentId) {
      conditions.push(eq(aeoCitations.contentId, contentId as string));
    }

    const citations = await db
      .select()
      .from(aeoCitations)
      .where(and(...conditions))
      .orderBy(desc(aeoCitations.detectedAt))
      .limit(Number.parseInt(limit as string))
      .offset(offset);

    res.json({ citations });
  } catch (error) {
    aeoLogger.error("Failed to list citations", { error });
    res.status(500).json({ error: "Failed to list citations" });
  }
});

/**
 * GET /api/aeo/citations/insights - Get citation insights
 */
router.get("/api/aeo/citations/insights", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const insights = await getCitationInsights(Number.parseInt(days as string));
    res.json(insights);
  } catch (error) {
    aeoLogger.error("Failed to get citation insights", { error });
    res.status(500).json({ error: "Failed to get citation insights" });
  }
});

// ============================================================================
// Dashboard & Analytics
// ============================================================================

/**
 * GET /api/aeo/dashboard - Get AEO dashboard data
 */
router.get("/api/aeo/dashboard", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number.parseInt(days as string));

    const dashboard = await getAEODashboard(startDate, endDate);
    res.json(dashboard);
  } catch (error) {
    aeoLogger.error("Failed to get dashboard", { error });
    res.status(500).json({ error: "Failed to get dashboard" });
  }
});

/**
 * GET /api/aeo/crawlers - Get crawler statistics
 */
router.get("/api/aeo/crawlers", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const stats = await getCrawlerStats(Number.parseInt(days as string));
    res.json(stats);
  } catch (error) {
    aeoLogger.error("Failed to get crawler stats", { error });
    res.status(500).json({ error: "Failed to get crawler stats" });
  }
});

/**
 * GET /api/aeo/performance - Get performance metrics
 */
router.get("/api/aeo/performance", async (req: Request, res: Response) => {
  try {
    const { days = "30", platform } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number.parseInt(days as string));

    let conditions = [gte(aeoPerformanceMetrics.date, startDate)];

    if (platform) {
      conditions.push(eq(aeoPerformanceMetrics.platform, platform as any));
    }

    const metrics = await db
      .select()
      .from(aeoPerformanceMetrics)
      .where(and(...conditions))
      .orderBy(desc(aeoPerformanceMetrics.date));

    // Aggregate totals
    const totals = {
      impressions: 0,
      citations: 0,
      clickThroughs: 0,
      conversions: 0,
      revenue: 0,
    };

    for (const metric of metrics) {
      totals.impressions += metric.impressions || 0;
      totals.citations += metric.citations || 0;
      totals.clickThroughs += metric.clickThroughs || 0;
      totals.conversions += metric.conversions || 0;
      totals.revenue += metric.revenue || 0;
    }

    res.json({
      metrics,
      totals,
    });
  } catch (error) {
    aeoLogger.error("Failed to get performance metrics", { error });
    res.status(500).json({ error: "Failed to get performance metrics" });
  }
});

// ============================================================================
// Programmatic Content
// ============================================================================

/**
 * GET /api/aeo/programmatic - List programmatic content templates
 */
router.get("/api/aeo/programmatic", async (req: Request, res: Response) => {
  try {
    const templates = await db
      .select()
      .from(aeoProgrammaticContent)
      .orderBy(desc(aeoProgrammaticContent.priority));

    res.json({ templates });
  } catch (error) {
    aeoLogger.error("Failed to list programmatic templates", { error });
    res.status(500).json({ error: "Failed to list programmatic templates" });
  }
});

/**
 * POST /api/aeo/programmatic - Create programmatic content template
 */
router.post("/api/aeo/programmatic", async (req: Request, res: Response) => {
  try {
    const { format, templateName, templatePattern, variables, targetCount, priority } = req.body;

    const result = await db
      .insert(aeoProgrammaticContent)
      .values({
        format,
        templateName,
        templatePattern,
        variables: variables || {},
        targetCount: targetCount || 0,
        priority: priority || 0,
        isActive: true,
      } as any)
      .returning();

    res.json({ success: true, template: result[0] });
  } catch (error) {
    aeoLogger.error("Failed to create programmatic template", { error });
    res.status(500).json({ error: "Failed to create programmatic template" });
  }
});

// ============================================================================
// A/B Tests
// ============================================================================

/**
 * GET /api/aeo/tests - List A/B tests
 */
router.get("/api/aeo/tests", async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let query = db.select().from(aeoAbTests);

    if (status) {
      query = query.where(eq(aeoAbTests.status, status as string)) as any;
    }

    const tests = await query.orderBy(desc(aeoAbTests.createdAt));

    res.json({ tests });
  } catch (error) {
    aeoLogger.error("Failed to list A/B tests", { error });
    res.status(500).json({ error: "Failed to list A/B tests" });
  }
});

/**
 * POST /api/aeo/tests - Create A/B test
 */
router.post("/api/aeo/tests", async (req: Request, res: Response) => {
  try {
    const { name, description, contentId, variants, minSampleSize, confidenceLevel } = req.body;

    if (!contentId || !variants || variants.length < 2) {
      res.status(400).json({ error: "contentId and at least 2 variants are required" });
      return;
    }

    const result = await db
      .insert(aeoAbTests)
      .values({
        name,
        description,
        contentId,
        variants,
        status: "draft",
        minSampleSize: minSampleSize || 100,
        confidenceLevel: confidenceLevel || 95,
      } as any)
      .returning();

    res.json({ success: true, test: result[0] });
  } catch (error) {
    aeoLogger.error("Failed to create A/B test", { error });
    res.status(500).json({ error: "Failed to create A/B test" });
  }
});

/**
 * PUT /api/aeo/tests/:id/start - Start an A/B test
 */
router.put("/api/aeo/tests/:id/start", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db
      .update(aeoAbTests)
      .set({
        status: "running",
        startDate: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(aeoAbTests.id, id));

    res.json({ success: true });
  } catch (error) {
    aeoLogger.error("Failed to start A/B test", { error });
    res.status(500).json({ error: "Failed to start A/B test" });
  }
});

/**
 * PUT /api/aeo/tests/:id/stop - Stop an A/B test
 */
router.put("/api/aeo/tests/:id/stop", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { winningVariantId } = req.body;

    await db
      .update(aeoAbTests)
      .set({
        status: "completed",
        endDate: new Date(),
        winningVariantId,
        updatedAt: new Date(),
      } as any)
      .where(eq(aeoAbTests.id, id));

    res.json({ success: true });
  } catch (error) {
    aeoLogger.error("Failed to stop A/B test", { error });
    res.status(500).json({ error: "Failed to stop A/B test" });
  }
});

// ============================================================================
// Content Discovery (for content without capsules)
// ============================================================================

/**
 * GET /api/aeo/content/missing-capsules - Get content without answer capsules
 */
router.get("/api/aeo/content/missing-capsules", async (req: Request, res: Response) => {
  try {
    const { type, limit = "50" } = req.query;

    // Get content IDs that have capsules
    const capsuleContentIds = await db
      .select({ contentId: aeoAnswerCapsules.contentId })
      .from(aeoAnswerCapsules);

    const idsWithCapsules = new Set(capsuleContentIds.map(c => c.contentId));

    // Get published content with optional type filter
    const whereCondition = type
      ? and(eq(contents.status, "published"), eq(contents.type, type as any))
      : eq(contents.status, "published");

    const allContent = await db
      .select({
        id: contents.id,
        title: contents.title,
        type: contents.type,
        slug: contents.slug,
        publishedAt: contents.publishedAt,
      })
      .from(contents)
      .where(whereCondition)
      .orderBy(desc(contents.viewCount))
      .limit(Number.parseInt(limit as string));

    // Filter out content with capsules
    const contentWithoutCapsules = allContent.filter(c => !idsWithCapsules.has(c.id));

    res.json({
      content: contentWithoutCapsules,
      total: contentWithoutCapsules.length,
    });
  } catch (error) {
    aeoLogger.error("Failed to get content without capsules", { error });
    res.status(500).json({ error: "Failed to get content without capsules" });
  }
});

// ============================================================================
// A/B Testing Routes
// ============================================================================

import {
  createABTest,
  startABTest,
  stopABTest,
  getABTestResults,
  getAllABTests,
  getABTest,
  deleteABTest,
  applyWinningVariant,
} from "./aeo-ab-testing";

/**
 * GET /api/aeo/ab-tests - Get all A/B tests
 */
router.get("/api/aeo/ab-tests", async (req: Request, res: Response) => {
  try {
    const tests = getAllABTests();
    res.json({ tests });
  } catch (error) {
    aeoLogger.error("Failed to get A/B tests", { error });
    res.status(500).json({ error: "Failed to get A/B tests" });
  }
});

/**
 * GET /api/aeo/ab-tests/:id - Get specific A/B test
 */
router.get("/api/aeo/ab-tests/:id", async (req: Request, res: Response) => {
  try {
    const test = getABTest(req.params.id);
    if (!test) {
      res.status(404).json({ error: "A/B test not found" });
      return;
    }
    res.json({ test });
  } catch (error) {
    aeoLogger.error("Failed to get A/B test", { error });
    res.status(500).json({ error: "Failed to get A/B test" });
  }
});

/**
 * POST /api/aeo/ab-tests - Create new A/B test
 */
router.post("/api/aeo/ab-tests", async (req: Request, res: Response) => {
  try {
    const { name, contentId, variantA, variantB } = req.body;

    if (!name || !contentId) {
      res.status(400).json({ error: "name and contentId are required" });
      return;
    }

    const test = await createABTest(name, contentId, variantA, variantB);
    res.json({ success: true, test });
  } catch (error) {
    aeoLogger.error("Failed to create A/B test", { error });
    res.status(500).json({ error: "Failed to create A/B test" });
  }
});

/**
 * POST /api/aeo/ab-tests/:id/start - Start A/B test
 */
router.post("/api/aeo/ab-tests/:id/start", async (req: Request, res: Response) => {
  try {
    const test = await startABTest(req.params.id);
    res.json({ success: true, test });
  } catch (error) {
    aeoLogger.error("Failed to start A/B test", { error });
    res.status(500).json({ error: "Failed to start A/B test" });
  }
});

/**
 * POST /api/aeo/ab-tests/:id/stop - Stop A/B test
 */
router.post("/api/aeo/ab-tests/:id/stop", async (req: Request, res: Response) => {
  try {
    const test = await stopABTest(req.params.id);
    res.json({ success: true, test });
  } catch (error) {
    aeoLogger.error("Failed to stop A/B test", { error });
    res.status(500).json({ error: "Failed to stop A/B test" });
  }
});

/**
 * GET /api/aeo/ab-tests/:id/results - Get A/B test results
 */
router.get("/api/aeo/ab-tests/:id/results", async (req: Request, res: Response) => {
  try {
    const results = await getABTestResults(req.params.id);
    res.json({ results });
  } catch (error) {
    aeoLogger.error("Failed to get A/B test results", { error });
    res.status(500).json({ error: "Failed to get A/B test results" });
  }
});

/**
 * POST /api/aeo/ab-tests/:id/apply-winner - Apply winning variant
 */
router.post("/api/aeo/ab-tests/:id/apply-winner", async (req: Request, res: Response) => {
  try {
    await applyWinningVariant(req.params.id);
    res.json({ success: true });
  } catch (error) {
    aeoLogger.error("Failed to apply winning variant", { error });
    res.status(500).json({ error: "Failed to apply winning variant" });
  }
});

/**
 * DELETE /api/aeo/ab-tests/:id - Delete A/B test
 */
router.delete("/api/aeo/ab-tests/:id", async (req: Request, res: Response) => {
  try {
    const deleted = deleteABTest(req.params.id);
    res.json({ success: deleted });
  } catch (error) {
    aeoLogger.error("Failed to delete A/B test", { error });
    res.status(500).json({ error: "Failed to delete A/B test" });
  }
});

// ============================================================================
// Jobs Routes
// ============================================================================

import {
  runAutoGenerateCapsules,
  runRegenerateLowQualityCapsules,
  runCitationScan,
  runPerformanceReport,
  getJobStatuses,
} from "./aeo-jobs";

/**
 * GET /api/aeo/jobs/status - Get job statuses
 */
router.get("/api/aeo/jobs/status", async (req: Request, res: Response) => {
  try {
    const statuses = getJobStatuses();
    res.json({ statuses });
  } catch (error) {
    aeoLogger.error("Failed to get job statuses", { error });
    res.status(500).json({ error: "Failed to get job statuses" });
  }
});

/**
 * POST /api/aeo/jobs/auto-generate - Trigger auto-generate job
 */
router.post("/api/aeo/jobs/auto-generate", async (req: Request, res: Response) => {
  try {
    const result = await runAutoGenerateCapsules();
    res.json({ success: true, result });
  } catch (error) {
    aeoLogger.error("Failed to run auto-generate job", { error });
    res.status(500).json({ error: "Failed to run auto-generate job" });
  }
});

/**
 * POST /api/aeo/jobs/regenerate-low-quality - Trigger low-quality regeneration
 */
router.post("/api/aeo/jobs/regenerate-low-quality", async (req: Request, res: Response) => {
  try {
    const result = await runRegenerateLowQualityCapsules();
    res.json({ success: true, result });
  } catch (error) {
    aeoLogger.error("Failed to run regeneration job", { error });
    res.status(500).json({ error: "Failed to run regeneration job" });
  }
});

/**
 * POST /api/aeo/jobs/citation-scan - Trigger citation scan
 */
router.post("/api/aeo/jobs/citation-scan", async (req: Request, res: Response) => {
  try {
    const result = await runCitationScan();
    res.json({ success: true, result });
  } catch (error) {
    aeoLogger.error("Failed to run citation scan", { error });
    res.status(500).json({ error: "Failed to run citation scan" });
  }
});

/**
 * POST /api/aeo/jobs/performance-report - Trigger performance report
 */
router.post("/api/aeo/jobs/performance-report", async (req: Request, res: Response) => {
  try {
    const result = await runPerformanceReport();
    res.json({ success: true, result });
  } catch (error) {
    aeoLogger.error("Failed to run performance report", { error });
    res.status(500).json({ error: "Failed to run performance report" });
  }
});

// ============================================================================
// Analytics Routes
// ============================================================================

import {
  calculateROI,
  mapQueriesToContent,
  analyzeContentGaps,
  analyzePlatformPerformance,
  getAnalyticsDashboard,
} from "./aeo-analytics";

/**
 * GET /api/aeo/analytics/roi - Get ROI metrics
 */
router.get("/api/aeo/analytics/roi", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate
      ? new Date(startDate as string)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const roi = await calculateROI(start, end);
    res.json({ roi });
  } catch (error) {
    aeoLogger.error("Failed to get ROI metrics", { error });
    res.status(500).json({ error: "Failed to get ROI metrics" });
  }
});

/**
 * GET /api/aeo/analytics/content-gaps - Get content gap analysis
 */
router.get("/api/aeo/analytics/content-gaps", async (req: Request, res: Response) => {
  try {
    const gaps = await analyzeContentGaps();
    res.json({ gaps });
  } catch (error) {
    aeoLogger.error("Failed to analyze content gaps", { error });
    res.status(500).json({ error: "Failed to analyze content gaps" });
  }
});

/**
 * GET /api/aeo/analytics/query-mapping - Get query to content mapping
 */
router.get("/api/aeo/analytics/query-mapping", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const mappings = await mapQueriesToContent(Number.parseInt(days as string));
    res.json({ mappings });
  } catch (error) {
    aeoLogger.error("Failed to get query mapping", { error });
    res.status(500).json({ error: "Failed to get query mapping" });
  }
});

/**
 * GET /api/aeo/analytics/platform-performance - Get platform performance
 */
router.get("/api/aeo/analytics/platform-performance", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const performance = await analyzePlatformPerformance(Number.parseInt(days as string));
    res.json({ performance });
  } catch (error) {
    aeoLogger.error("Failed to get platform performance", { error });
    res.status(500).json({ error: "Failed to get platform performance" });
  }
});

/**
 * GET /api/aeo/analytics/dashboard - Get complete analytics dashboard
 */
router.get("/api/aeo/analytics/dashboard", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate
      ? new Date(startDate as string)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dashboard = await getAnalyticsDashboard(start, end);
    res.json({ dashboard });
  } catch (error) {
    aeoLogger.error("Failed to get analytics dashboard", { error });
    res.status(500).json({ error: "Failed to get analytics dashboard" });
  }
});

// ============================================================================
// Multi-language Routes
// ============================================================================

import {
  translateCapsule,
  translateToAllLocales,
  getTranslationCoverage,
  getSupportedLocales,
} from "./aeo-multilang";

/**
 * GET /api/aeo/locales - Get supported locales
 */
router.get("/api/aeo/locales", async (req: Request, res: Response) => {
  try {
    const locales = getSupportedLocales();
    res.json({ locales });
  } catch (error) {
    aeoLogger.error("Failed to get locales", { error });
    res.status(500).json({ error: "Failed to get locales" });
  }
});

/**
 * GET /api/aeo/capsules/:contentId/translations - Get translation coverage
 */
router.get("/api/aeo/capsules/:contentId/translations", async (req: Request, res: Response) => {
  try {
    const coverage = await getTranslationCoverage(req.params.contentId);
    res.json({ coverage });
  } catch (error) {
    aeoLogger.error("Failed to get translation coverage", { error });
    res.status(500).json({ error: "Failed to get translation coverage" });
  }
});

/**
 * POST /api/aeo/capsules/:contentId/translate - Translate capsule
 */
router.post("/api/aeo/capsules/:contentId/translate", async (req: Request, res: Response) => {
  try {
    const { sourceLocale = "en", targetLocale } = req.body;

    if (!targetLocale) {
      res.status(400).json({ error: "targetLocale is required" });
      return;
    }

    const translation = await translateCapsule(req.params.contentId, sourceLocale, targetLocale);
    res.json({ success: true, translation });
  } catch (error) {
    aeoLogger.error("Failed to translate capsule", { error });
    res.status(500).json({ error: "Failed to translate capsule" });
  }
});

/**
 * POST /api/aeo/capsules/:contentId/translate-all - Translate to all locales
 */
router.post("/api/aeo/capsules/:contentId/translate-all", async (req: Request, res: Response) => {
  try {
    const { sourceLocale = "en" } = req.body;
    const result = await translateToAllLocales(req.params.contentId, sourceLocale);
    res.json({ completed: true, ...result });
  } catch (error) {
    aeoLogger.error("Failed to translate to all locales", { error });
    res.status(500).json({ error: "Failed to translate to all locales" });
  }
});

// ============================================================================
// Integrations Routes
// ============================================================================

import {
  getIntegrationStatus,
  configureSlack,
  registerWebhook,
  removeWebhook,
  getWebhooks,
} from "./aeo-integrations";

/**
 * GET /api/aeo/integrations/status - Get integration status
 */
router.get("/api/aeo/integrations/status", async (req: Request, res: Response) => {
  try {
    const status = getIntegrationStatus();
    res.json({ status });
  } catch (error) {
    aeoLogger.error("Failed to get integration status", { error });
    res.status(500).json({ error: "Failed to get integration status" });
  }
});

/**
 * POST /api/aeo/integrations/slack - Configure Slack
 */
router.post("/api/aeo/integrations/slack", async (req: Request, res: Response) => {
  try {
    const { webhookUrl, channel, username } = req.body;

    if (!webhookUrl) {
      res.status(400).json({ error: "webhookUrl is required" });
      return;
    }

    configureSlack({ webhookUrl, channel, username });
    res.json({ success: true });
  } catch (error) {
    aeoLogger.error("Failed to configure Slack", { error });
    res.status(500).json({ error: "Failed to configure Slack" });
  }
});

/**
 * GET /api/aeo/integrations/webhooks - Get webhooks
 */
router.get("/api/aeo/integrations/webhooks", async (req: Request, res: Response) => {
  try {
    const webhooks = getWebhooks();
    res.json({ webhooks });
  } catch (error) {
    aeoLogger.error("Failed to get webhooks", { error });
    res.status(500).json({ error: "Failed to get webhooks" });
  }
});

/**
 * POST /api/aeo/integrations/webhooks - Register webhook
 */
router.post("/api/aeo/integrations/webhooks", async (req: Request, res: Response) => {
  try {
    const { url, secret, events } = req.body;

    if (!url || !events || !Array.isArray(events)) {
      res.status(400).json({ error: "url and events array are required" });
      return;
    }

    registerWebhook({ url, secret, events });
    res.json({ success: true });
  } catch (error) {
    aeoLogger.error("Failed to register webhook", { error });
    res.status(500).json({ error: "Failed to register webhook" });
  }
});

/**
 * DELETE /api/aeo/integrations/webhooks - Remove webhook
 */
router.delete("/api/aeo/integrations/webhooks", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({ error: "url is required" });
      return;
    }

    const removed = removeWebhook(url);
    res.json({ success: removed });
  } catch (error) {
    aeoLogger.error("Failed to remove webhook", { error });
    res.status(500).json({ error: "Failed to remove webhook" });
  }
});

// ============================================================================
// Cache Management Routes
// ============================================================================

import {
  invalidateCapsuleCache,
  invalidateDashboardCache,
  invalidateAllAEOCache,
  getAEOCacheStats,
} from "./aeo-cache";

/**
 * GET /api/aeo/cache/stats - Get cache stats
 */
router.get("/api/aeo/cache/stats", async (req: Request, res: Response) => {
  try {
    const stats = await getAEOCacheStats();
    res.json({ stats });
  } catch (error) {
    aeoLogger.error("Failed to get cache stats", { error });
    res.status(500).json({ error: "Failed to get cache stats" });
  }
});

/**
 * POST /api/aeo/cache/invalidate - Invalidate cache
 */
router.post("/api/aeo/cache/invalidate", async (req: Request, res: Response) => {
  try {
    const { type = "all" } = req.body;

    switch (type) {
      case "capsules":
        await invalidateCapsuleCache();
        break;
      case "dashboard":
        await invalidateDashboardCache();
        break;
      case "all":
      default:
        await invalidateAllAEOCache();
    }

    res.json({ success: true, invalidated: type });
  } catch (error) {
    aeoLogger.error("Failed to invalidate cache", { error });
    res.status(500).json({ error: "Failed to invalidate cache" });
  }
});

// ============================================================================
// SEO-AEO Validation Routes
// ============================================================================

import {
  validateSEOAEOCompatibility,
  batchValidateSEOAEO,
  getValidationSummary,
} from "./seo-aeo-validator";

/**
 * GET /api/aeo/validate/:contentId - Validate SEO-AEO compatibility
 */
router.get("/api/aeo/validate/:contentId", async (req: Request, res: Response) => {
  try {
    const result = await validateSEOAEOCompatibility(req.params.contentId);
    res.json({ result });
  } catch (error) {
    aeoLogger.error("Failed to validate content", { error });
    res.status(500).json({ error: "Failed to validate content" });
  }
});

/**
 * POST /api/aeo/validate/batch - Batch validate multiple content
 */
router.post("/api/aeo/validate/batch", async (req: Request, res: Response) => {
  try {
    const { contentIds } = req.body;

    if (!contentIds || !Array.isArray(contentIds)) {
      res.status(400).json({ error: "contentIds array is required" });
      return;
    }

    const results = await batchValidateSEOAEO(contentIds);
    res.json({
      results: Object.fromEntries(results),
    });
  } catch (error) {
    aeoLogger.error("Failed to batch validate", { error });
    res.status(500).json({ error: "Failed to batch validate" });
  }
});

/**
 * POST /api/aeo/validate/summary - Get validation summary
 */
router.post("/api/aeo/validate/summary", async (req: Request, res: Response) => {
  try {
    const { contentIds } = req.body;

    if (!contentIds || !Array.isArray(contentIds)) {
      res.status(400).json({ error: "contentIds array is required" });
      return;
    }

    const summary = await getValidationSummary(contentIds);
    res.json({ summary });
  } catch (error) {
    aeoLogger.error("Failed to get validation summary", { error });
    res.status(500).json({ error: "Failed to get validation summary" });
  }
});

export default router;
