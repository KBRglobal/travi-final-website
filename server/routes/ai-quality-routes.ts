/**
 * AI Content Quality API Routes - Update 9987
 * Exposes hallucination detection, readability analysis, content paraphrasing,
 * feedback collection, and prompt A/B testing via REST API
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { log } from "../lib/logger";
import {
  checkHallucinations,
  analyzeReadability,
  paraphrase,
  generateVariations,
  submitFeedback,
  quickReview,
  getFeedbackStats,
  createExperiment,
  getVariantForContent,
  recordExperimentResult,
  getExperimentSummary,
  type HallucinationReport,
  type ReadabilityMetrics,
  type ParaphraseResult,
  type ParaphraseStyle,
} from "../ingestion/update-9987";

const router = Router();

const hallucinationAnalyzeSchema = z.object({
  content: z.string().min(1, "Content is required"),
  contentId: z.string().optional(),
  options: z
    .object({
      strictMode: z.boolean().optional(),
      sourceContext: z.string().optional(),
    })
    .optional(),
});

const readabilityAnalyzeSchema = z.object({
  content: z.string().min(1, "Content is required"),
  options: z
    .object({
      targetAudience: z.enum(["general", "travel", "academic", "business"]).optional(),
      locale: z.string().optional(),
    })
    .optional(),
});

const paraphraseSchema = z.object({
  content: z.string().min(1, "Content is required"),
  style: z
    .enum(["formal", "casual", "professional", "engaging", "informative", "concise", "detailed"])
    .optional(),
  tone: z.enum(["neutral", "positive", "enthusiastic", "authoritative"]).optional(),
  seoOptimized: z.boolean().optional(),
  preserveKeywords: z.array(z.string()).optional(),
});

const variationsSchema = z.object({
  content: z.string().min(1, "Content is required"),
  count: z.number().int().min(1).max(5).optional().default(3),
  style: z
    .enum(["formal", "casual", "professional", "engaging", "informative", "concise", "detailed"])
    .optional(),
  tone: z.enum(["neutral", "positive", "enthusiastic", "authoritative"]).optional(),
  seoOptimized: z.boolean().optional(),
  preserveKeywords: z.array(z.string()).optional(),
});

const feedbackSubmitSchema = z.object({
  contentId: z.string().min(1, "Content ID is required"),
  contentType: z.enum(["article", "attraction", "hotel", "translation", "image_caption"]),
  rating: z.enum(["good", "bad", "needs_work"]),
  issues: z
    .array(
      z.enum([
        "factual_error",
        "grammar_issue",
        "style_mismatch",
        "missing_info",
        "outdated_info",
        "wrong_translation",
        "wrong_image",
        "poor_formatting",
        "duplicate_content",
        "hallucination",
        "inappropriate_tone",
        "seo_violation",
        "other",
      ])
    )
    .optional(),
  comment: z.string().optional(),
  reviewerId: z.string().optional(),
});

const quickReviewSchema = z.object({
  contentId: z.string().min(1, "Content ID is required"),
  contentType: z.enum(["article", "attraction", "hotel", "translation", "image_caption"]),
  approved: z.boolean(),
  reviewerId: z.string().optional(),
});

const experimentCreateSchema = z.object({
  name: z.string().min(1, "Experiment name is required"),
  description: z.string().optional().default(""),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        prompt: z.string().min(1),
        isControl: z.boolean().optional().default(false),
        trafficWeight: z.number().min(0).max(100).optional().default(50),
      })
    )
    .min(2, "At least 2 variants required"),
  targetContentType: z.string().min(1, "Target content type is required"),
  targetSampleSize: z.number().int().min(10).optional(),
});

const experimentResultSchema = z.object({
  contentId: z.string().min(1, "Content ID is required"),
  variantId: z.string().min(1, "Variant ID is required"),
  success: z.boolean(),
  metrics: z
    .object({
      qualityScore: z.number().optional(),
      latencyMs: z.number().optional(),
      tokensUsed: z.number().optional(),
      estimatedCost: z.number().optional(),
    })
    .optional(),
});

router.post("/hallucinations/analyze", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const parseResult = hallucinationAnalyzeSchema.safeParse(req.body);

    if (!parseResult.success) {
      log.warn("[AI-Quality] Invalid hallucination analysis request", {
        errors: parseResult.error.flatten(),
      });
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { content, contentId, options } = parseResult.data;

    log.info("[AI-Quality] Analyzing content for hallucinations", {
      contentId: contentId || "anonymous",
      contentLength: content.length,
      strictMode: options?.strictMode,
    });

    const report: HallucinationReport = await checkHallucinations(content);

    log.info("[AI-Quality] Hallucination analysis complete", {
      contentId: contentId || "anonymous",
      hasHallucinations: report.hasHallucinations,
      issuesCount: report.issues.length,
      processingTimeMs: Date.now() - startTime,
    });

    return res.json({ success: true, data: report });
  } catch (error) {
    log.error("[AI-Quality] Hallucination analysis failed", error);
    return res.status(500).json({
      success: false,
      error: "Failed to analyze content for hallucinations",
    });
  }
});

router.post("/readability/analyze", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const parseResult = readabilityAnalyzeSchema.safeParse(req.body);

    if (!parseResult.success) {
      log.warn("[AI-Quality] Invalid readability analysis request", {
        errors: parseResult.error.flatten(),
      });
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { content, options } = parseResult.data;

    log.info("[AI-Quality] Analyzing content readability", {
      contentLength: content.length,
      targetAudience: options?.targetAudience,
    });

    const metrics: ReadabilityMetrics = await analyzeReadability(content);

    log.info("[AI-Quality] Readability analysis complete", {
      score: metrics.score,
      grade: metrics.grade,
      processingTimeMs: Date.now() - startTime,
    });

    return res.json({ success: true, data: metrics });
  } catch (error) {
    log.error("[AI-Quality] Readability analysis failed", error);
    return res.status(500).json({
      success: false,
      error: "Failed to analyze content readability",
    });
  }
});

router.post("/paraphrase", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const parseResult = paraphraseSchema.safeParse(req.body);

    if (!parseResult.success) {
      log.warn("[AI-Quality] Invalid paraphrase request", { errors: parseResult.error.flatten() });
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { content, style, tone, seoOptimized } = parseResult.data;

    log.info("[AI-Quality] Paraphrasing content", {
      contentLength: content.length,
      style,
      tone,
      seoOptimized,
    });

    const result: ParaphraseResult = await paraphrase(content, style as ParaphraseStyle);

    log.info("[AI-Quality] Paraphrase complete", {
      originalLength: content.length,
      paraphrasedLength: result.paraphrased.length,
      processingTimeMs: Date.now() - startTime,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    log.error("[AI-Quality] Paraphrase failed", error);
    return res.status(500).json({
      success: false,
      error: "Failed to paraphrase content",
    });
  }
});

router.post("/paraphrase/variations", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const parseResult = variationsSchema.safeParse(req.body);

    if (!parseResult.success) {
      log.warn("[AI-Quality] Invalid variations request", { errors: parseResult.error.flatten() });
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { content, count, style, tone, seoOptimized, preserveKeywords } = parseResult.data;

    log.info("[AI-Quality] Generating content variations", {
      contentLength: content.length,
      requestedCount: count,
      style,
      tone,
    });

    // If specific options are provided, generate variations with those options
    // Otherwise fall back to default generateVariations behavior
    let results: ParaphraseResult[];
    if (style || tone || seoOptimized || preserveKeywords?.length) {
      const styles: ParaphraseStyle[] = style
        ? [style as ParaphraseStyle]
        : ["formal", "casual", "technical"];
      results = [];
      for (let i = 0; i < count; i++) {
        const variationStyle = styles[i % styles.length] as ParaphraseStyle;
        const paraphraseResult = await paraphrase(content, variationStyle);
        results.push(paraphraseResult);
      }
    } else {
      const variations = await generateVariations(content);
      results = variations.map(v => ({ original: content, paraphrased: v }));
    }

    log.info("[AI-Quality] Variations generation complete", {
      originalLength: content.length,
      variationsGenerated: results.length,
      processingTimeMs: Date.now() - startTime,
    });

    return res.json({ success: true, data: results });
  } catch (error) {
    log.error("[AI-Quality] Variations generation failed", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate content variations",
    });
  }
});

router.post("/feedback/submit", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const parseResult = feedbackSubmitSchema.safeParse(req.body);

    if (!parseResult.success) {
      log.warn("[AI-Quality] Invalid feedback submit request", {
        errors: parseResult.error.flatten(),
      });
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { contentId, contentType, rating, issues } = parseResult.data;

    const ratingToNumeric: Record<string, number> = { good: 5, needs_work: 3, bad: 1 };

    log.info("[AI-Quality] Submitting feedback", {
      contentId,
      contentType,
      rating,
      issuesCount: issues?.length || 0,
    });

    await submitFeedback({
      id: crypto.randomUUID(),
      contentId,
      rating: ratingToNumeric[rating],
    });

    log.info("[AI-Quality] Feedback submitted", {
      contentId,
      processingTimeMs: Date.now() - startTime,
    });

    return res.json({ success: true, data: { contentId } });
  } catch (error) {
    log.error("[AI-Quality] Feedback submission failed", error);
    return res.status(500).json({
      success: false,
      error: "Failed to submit feedback",
    });
  }
});

router.post("/feedback/quick-review", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const parseResult = quickReviewSchema.safeParse(req.body);

    if (!parseResult.success) {
      log.warn("[AI-Quality] Invalid quick review request", {
        errors: parseResult.error.flatten(),
      });
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { contentId, contentType, approved } = parseResult.data;

    log.info("[AI-Quality] Quick review", {
      contentId,
      contentType,
      approved,
    });

    const feedback = await quickReview(contentId);

    log.info("[AI-Quality] Quick review complete", {
      contentId,
      passed: feedback.passed,
      processingTimeMs: Date.now() - startTime,
    });

    return res.json({ success: true, data: { contentId, passed: feedback.passed } });
  } catch (error) {
    log.error("[AI-Quality] Quick review failed", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process quick review",
    });
  }
});

router.get("/feedback/stats", async (req: Request, res: Response) => {
  try {
    const { contentType, days } = req.query;

    log.info("[AI-Quality] Fetching feedback stats", {
      contentType,
      days,
    });

    const query: { contentType?: string; startDate?: Date } = {};

    if (contentType && typeof contentType === "string") {
      query.contentType = contentType;
    }

    if (days && typeof days === "string") {
      const daysNum = Number.parseInt(days, 10);
      if (!Number.isNaN(daysNum) && daysNum > 0) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);
        query.startDate = startDate;
      }
    }

    const stats = await getFeedbackStats();

    log.info("[AI-Quality] Feedback stats retrieved", {
      total: stats.total,
      average: stats.average,
    });

    return res.json({ success: true, data: stats });
  } catch (error) {
    log.error("[AI-Quality] Failed to fetch feedback stats", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch feedback statistics",
    });
  }
});

router.post("/experiments/create", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const parseResult = experimentCreateSchema.safeParse(req.body);

    if (!parseResult.success) {
      log.warn("[AI-Quality] Invalid experiment create request", {
        errors: parseResult.error.flatten(),
      });
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { name, variants, targetContentType } = parseResult.data;

    log.info("[AI-Quality] Creating experiment", {
      name,
      variantCount: variants.length,
      targetContentType,
    });

    const experiment = await createExperiment(name);

    log.info("[AI-Quality] Experiment created", {
      experimentId: experiment.id,
      name,
      processingTimeMs: Date.now() - startTime,
    });

    return res.json({ success: true, data: experiment });
  } catch (error) {
    log.error("[AI-Quality] Experiment creation failed", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create experiment",
    });
  }
});

router.get("/experiments/:experimentId/variant", async (req: Request, res: Response) => {
  try {
    const { experimentId } = req.params;
    const { contentId } = req.query;

    if (!contentId || typeof contentId !== "string") {
      return res.status(400).json({
        success: false,
        error: "contentId query parameter is required",
      });
    }

    log.info("[AI-Quality] Getting variant for content", {
      experimentId,
      contentId,
    });

    const variant = await getVariantForContent(experimentId, contentId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        error: "Experiment not found or not running",
      });
    }

    log.info("[AI-Quality] Variant assigned", {
      experimentId,
      contentId,
      variantId: variant.id,
      variantPrompt: variant.prompt,
    });

    return res.json({ success: true, data: variant });
  } catch (error) {
    log.error("[AI-Quality] Failed to get variant", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get experiment variant",
    });
  }
});

router.post("/experiments/:experimentId/result", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { experimentId } = req.params;
    const parseResult = experimentResultSchema.safeParse(req.body);

    if (!parseResult.success) {
      log.warn("[AI-Quality] Invalid experiment result request", {
        errors: parseResult.error.flatten(),
      });
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { contentId, variantId, success, metrics } = parseResult.data;

    log.info("[AI-Quality] Recording experiment result", {
      experimentId,
      contentId,
      variantId,
      success,
    });

    await recordExperimentResult(experimentId, variantId, metrics?.qualityScore ?? 0);

    log.info("[AI-Quality] Experiment result recorded", {
      experimentId,
      contentId,
      processingTimeMs: Date.now() - startTime,
    });

    return res.json({ success: true, message: "Result recorded successfully" });
  } catch (error) {
    log.error("[AI-Quality] Failed to record experiment result", error);
    return res.status(500).json({
      success: false,
      error: "Failed to record experiment result",
    });
  }
});

router.get("/experiments/:experimentId/summary", async (req: Request, res: Response) => {
  try {
    const { experimentId } = req.params;

    log.info("[AI-Quality] Getting experiment summary", { experimentId });

    const summary = await getExperimentSummary(experimentId);

    log.info("[AI-Quality] Experiment summary retrieved", {
      experimentId,
      resultsCount: summary.results.length,
    });

    return res.json({ success: true, data: summary });
  } catch (error) {
    log.error("[AI-Quality] Failed to get experiment summary", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get experiment summary",
    });
  }
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    log.info("[AI-Quality] Fetching AI quality tools stats");

    const stats = {
      version: "9987.2.3",
      tools: {
        hallucinationDetector: {
          name: "Hallucination Detector",
          description:
            "Detects potential hallucinations in AI-generated content using pattern analysis, claim extraction, and consistency checks",
          capabilities: [
            "Uncertainty quantification (confidence scoring)",
            "Claim extraction and verification",
            "Source grounding checks",
            "Consistency analysis",
          ],
          riskLevels: ["low (0-20)", "medium (21-50)", "high (51-80)", "critical (81-100)"],
          endpoint: "POST /api/ai-quality/hallucinations/analyze",
        },
        readabilityAnalyzer: {
          name: "Readability Analyzer",
          description: "Comprehensive readability metrics for content quality assessment",
          capabilities: [
            "Flesch Reading Ease (60-70 ideal for travel)",
            "Flesch-Kincaid Grade Level",
            "Gunning Fog Index",
            "SMOG Index",
            "Coleman-Liau Index",
            "Automated Readability Index (ARI)",
            "Dale-Chall Readability Score",
            "Vocabulary diversity analysis",
          ],
          targetAudiences: ["general", "travel", "academic", "business"],
          endpoint: "POST /api/ai-quality/readability/analyze",
        },
        contentParaphraser: {
          name: "Content Paraphraser",
          description: "Style transfer and content variation for SEO and multi-language quality",
          capabilities: [
            "Style transfer (formal/casual/professional)",
            "Tone adjustment",
            "Sentence restructuring",
            "Vocabulary enrichment",
            "SEO-optimized variations",
            "Keyword preservation",
          ],
          styles: [
            "formal",
            "casual",
            "professional",
            "engaging",
            "informative",
            "concise",
            "detailed",
          ],
          tones: ["neutral", "positive", "enthusiastic", "authoritative"],
          endpoints: [
            "POST /api/ai-quality/paraphrase",
            "POST /api/ai-quality/paraphrase/variations",
          ],
        },
        contentFeedbackCollector: {
          name: "Content Feedback Collector",
          description: "Human-in-the-loop feedback system for AI content quality tracking",
          capabilities: [
            "Content quality ratings (good/bad/needs_work)",
            "Binary accept/reject decisions",
            "Multi-label issue tagging",
            "Free-text corrections and notes",
            "Feedback aggregation and statistics",
            "Reviewer agreement scoring",
          ],
          issueLabels: [
            "factual_error",
            "grammar_issue",
            "style_mismatch",
            "missing_info",
            "outdated_info",
            "wrong_translation",
            "wrong_image",
            "poor_formatting",
            "duplicate_content",
            "hallucination",
            "inappropriate_tone",
            "seo_violation",
            "other",
          ],
          contentTypes: ["article", "attraction", "hotel", "translation", "image_caption"],
          endpoints: [
            "POST /api/ai-quality/feedback/submit",
            "POST /api/ai-quality/feedback/quick-review",
            "GET /api/ai-quality/feedback/stats",
          ],
        },
        promptABTesting: {
          name: "Prompt A/B Testing",
          description: "Experiment framework for prompt optimization with statistical analysis",
          capabilities: [
            "Experiment creation with control/treatment variants",
            "Traffic allocation with deterministic hashing",
            "Metric collection (quality, cost, latency)",
            "Statistical significance calculation",
            "Winner determination with confidence intervals",
            "Gradual rollout controls",
          ],
          experimentStatuses: ["draft", "running", "paused", "completed", "archived"],
          recommendations: ["continue", "stop_winner", "stop_no_winner", "needs_more_data"],
          endpoints: [
            "POST /api/ai-quality/experiments/create",
            "GET /api/ai-quality/experiments/:experimentId/variant",
            "POST /api/ai-quality/experiments/:experimentId/result",
            "GET /api/ai-quality/experiments/:experimentId/summary",
          ],
        },
      },
      status: "operational",
      lastUpdated: new Date().toISOString(),
    };

    return res.json({ success: true, data: stats });
  } catch (error) {
    log.error("[AI-Quality] Failed to fetch stats", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch AI quality tools stats",
    });
  }
});

export default router;
