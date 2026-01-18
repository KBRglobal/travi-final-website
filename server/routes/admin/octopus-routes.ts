/**
 * Octopus API Routes
 * Connects the frontend dashboard to the local Octypo content generation engine
 */

import { Router, Request, Response } from "express";
import { db } from "../../db";
import { octopusJobs, contents, tiqetsAttractions } from "@shared/schema";
import { eq, desc, sql, count, and, isNotNull } from "drizzle-orm";
import { requireAuth } from "../../security";

const router = Router();

// Stats endpoint - returns aggregated statistics
router.get("/stats", requireAuth, async (_req: Request, res: Response) => {
  try {
    // Get job counts
    const [jobStats] = await db.select({
      totalJobs: count(),
      completedJobs: sql<number>`COUNT(*) FILTER (WHERE status = 'completed')`,
      failedJobs: sql<number>`COUNT(*) FILTER (WHERE status = 'failed')`,
    }).from(octopusJobs);

    // Get content counts from tiqets_attractions (our actual content source)
    const [contentStats] = await db.select({
      entitiesExtracted: count(),
      pagesGenerated: sql<number>`COUNT(*) FILTER (WHERE ai_content IS NOT NULL)`,
    }).from(tiqetsAttractions);

    // Get articles created
    const [articleStats] = await db.select({
      articlesGenerated: count(),
    }).from(contents).where(eq(contents.type, 'article'));

    // Calculate average scores from content with scores
    const [scoreStats] = await db.select({
      avgSeoScore: sql<number>`COALESCE(AVG(seo_score), 0)`,
      avgQualityScore: sql<number>`COALESCE(AVG(aeo_score), 0)`,
    }).from(contents).where(isNotNull(contents.seoScore));

    res.json({
      success: true,
      data: {
        totalJobs: jobStats?.totalJobs || 0,
        completedJobs: jobStats?.completedJobs || 0,
        failedJobs: jobStats?.failedJobs || 0,
        entitiesExtracted: contentStats?.entitiesExtracted || 0,
        pagesGenerated: contentStats?.pagesGenerated || 0,
        articlesGenerated: articleStats?.articlesGenerated || 0,
        tasksCreated: 0,
        avgSeoScore: scoreStats?.avgSeoScore || null,
        avgQualityScore: scoreStats?.avgQualityScore || null,
        processingRate: null,
      },
    });
  } catch (error) {
    console.error("[Octopus] Stats error:", error);
    res.json({
      success: false,
      data: {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        entitiesExtracted: 0,
        pagesGenerated: 0,
        articlesGenerated: 0,
        tasksCreated: 0,
        avgSeoScore: null,
        avgQualityScore: null,
        processingRate: null,
      },
    });
  }
});

// Capabilities endpoint - returns what features are available
router.get("/capabilities", requireAuth, async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      documentParsing: true,
      entityExtraction: true,
      googleMapsEnrichment: false,
      webSearchEnrichment: true,
      pageGeneration: true,
      articleGeneration: true,
      aeoOptimization: true,
      localization: true,
    },
  });
});

// Jobs list endpoint
router.get("/jobs", requireAuth, async (_req: Request, res: Response) => {
  try {
    const jobs = await db.select().from(octopusJobs).orderBy(desc(octopusJobs.createdAt)).limit(50);
    
    const formattedJobs = jobs.map(job => ({
      id: job.id,
      status: job.status,
      progress: {
        stage: job.currentStage || job.status,
        stageProgress: job.progressPct || 0,
        overallProgress: job.progressPct || 0,
        currentStep: job.currentStage || job.status,
        stats: {},
      },
      input: {
        filename: job.filename || 'Unknown',
        fileSize: job.fileSize || 0,
      },
      createdAt: job.createdAt?.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      error: job.error,
      result: job.options || {},
    }));

    res.json({ success: true, data: formattedJobs });
  } catch (error) {
    console.error("[Octopus] Jobs list error:", error);
    res.json({ success: false, data: [] });
  }
});

// Single job details
router.get("/jobs/:jobId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const [job] = await db.select().from(octopusJobs).where(eq(octopusJobs.id, jobId));
    
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        progress: {
          stage: job.currentStage || job.status,
          stageProgress: job.progressPct || 0,
          overallProgress: job.progressPct || 0,
          currentStep: job.currentStage || job.status,
          stats: {},
        },
        input: {
          filename: job.filename,
          fileSize: job.fileSize,
        },
        createdAt: job.createdAt?.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        error: job.error,
        result: job.options || {},
      },
    });
  } catch (error) {
    console.error("[Octopus] Job detail error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch job" });
  }
});

// Job contents (entities, tasks, etc.)
router.get("/jobs/:jobId/contents", requireAuth, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const [job] = await db.select().from(octopusJobs).where(eq(octopusJobs.id, jobId));
    
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Return any stored entities and tasks from the job options
    res.json({
      success: true,
      data: {
        entities: (job.options as any)?.entities || [],
        tasks: (job.options as any)?.tasks || [],
      },
    });
  } catch (error) {
    console.error("[Octopus] Job contents error:", error);
    res.json({ success: false, data: { entities: [], tasks: [] } });
  }
});

// Delete job
router.delete("/jobs/:jobId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    await db.delete(octopusJobs).where(eq(octopusJobs.id, jobId));
    res.json({ success: true });
  } catch (error) {
    console.error("[Octopus] Delete job error:", error);
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// Queue status endpoint
router.get("/queue-status", requireAuth, async (_req: Request, res: Response) => {
  try {
    // Get pending jobs count
    const [pending] = await db.select({
      count: count(),
    }).from(octopusJobs).where(eq(octopusJobs.status, 'pending'));

    // Count jobs that are actively being processed (any status between pending and completed)
    const [processing] = await db.select({
      count: sql<number>`COUNT(*) FILTER (WHERE status IN ('parsing', 'extracting', 'enriching', 'graph_resolution', 'entity_upsert', 'generating', 'quality_check', 'fact_check', 'publish_queue'))`,
    }).from(octopusJobs);

    res.json({
      success: true,
      data: {
        queueLength: pending?.count || 0,
        processing: (processing?.count || 0) > 0,
        activeRequests: processing?.count || 0,
        completedRequests: 0,
        failedRequests: 0,
        estimatedWaitSeconds: 0,
        estimatedWait: "0s",
        providers: [
          {
            name: "Anthropic",
            available: !!process.env.ANTHROPIC_API_KEY,
            tokens: 200000,
            maxTokens: 200000,
            requestsThisMinute: 0,
            requestsThisHour: 0,
            blockedUntil: null,
            waitTimeSeconds: 0,
            status: process.env.ANTHROPIC_API_KEY ? "available" : "not configured",
          },
          {
            name: "OpenAI",
            available: !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY),
            tokens: 128000,
            maxTokens: 128000,
            requestsThisMinute: 0,
            requestsThisHour: 0,
            blockedUntil: null,
            waitTimeSeconds: 0,
            status: (process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY) ? "available" : "not configured",
          },
        ],
      },
    });
  } catch (error) {
    console.error("[Octopus] Queue status error:", error);
    res.json({
      success: false,
      data: {
        queueLength: 0,
        processing: false,
        activeRequests: 0,
        completedRequests: 0,
        failedRequests: 0,
        estimatedWaitSeconds: 0,
        estimatedWait: "0s",
        providers: [],
      },
    });
  }
});

// Upload document endpoint (stub for now)
router.post("/upload", requireAuth, async (req: Request, res: Response) => {
  try {
    // For now, return a stub response
    // Full implementation would parse document and create a job
    res.json({
      success: true,
      message: "Document upload not fully implemented yet",
      jobId: null,
    });
  } catch (error) {
    console.error("[Octopus] Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Entities endpoint (from tiqets_attractions)
router.get("/entities", requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Get attractions that serve as entities
    const attractions = await db.select({
      id: tiqetsAttractions.id,
      title: tiqetsAttractions.title,
      cityName: tiqetsAttractions.cityName,
      slug: tiqetsAttractions.slug,
      aiContent: tiqetsAttractions.aiContent,
    }).from(tiqetsAttractions).limit(limit);

    const entities = attractions.map(a => ({
      id: a.id,
      name: a.title,
      type: 'attraction',
      location: a.cityName,
      status: a.aiContent ? 'completed' : 'pending',
      slug: a.slug,
    }));

    res.json({ success: true, data: { entities } });
  } catch (error) {
    console.error("[Octopus] Entities error:", error);
    res.json({ success: false, data: { entities: [] } });
  }
});

// Pipeline endpoint (alias for entities)
router.get("/pipeline", requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Get attractions that could serve as entities
    const attractions = await db.select({
      id: tiqetsAttractions.id,
      title: tiqetsAttractions.title,
      cityName: tiqetsAttractions.cityName,
      slug: tiqetsAttractions.slug,
      aiContent: tiqetsAttractions.aiContent,
    }).from(tiqetsAttractions).limit(limit);

    const entities = attractions.map(a => ({
      id: a.id,
      name: a.title,
      type: 'attraction',
      location: a.cityName,
      status: a.aiContent ? 'completed' : 'pending',
    }));

    res.json({ success: true, data: { entities } });
  } catch (error) {
    console.error("[Octopus] Pipeline error:", error);
    res.json({ success: false, data: { entities: [] } });
  }
});

export default router;
