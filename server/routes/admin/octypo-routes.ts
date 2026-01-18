/**
 * Octypo Admin Routes
 * 
 * Admin dashboard API for managing the AI content generation system
 */

import { Router, type Request, type Response } from 'express';
import { db } from '../../db';
import { tiqetsAttractions, contents, workflowInstances, aiWriters } from '@shared/schema';
import { eq, isNull, isNotNull, sql, desc, and, gte } from 'drizzle-orm';
import { log } from '../../lib/logger';
import { 
  AgentRegistry, 
  initializeWriterAgents, 
  initializeValidatorAgents,
  generateAttractionWithOctypo,
  getOctypoOrchestrator,
} from '../../octypo';
import { octypoState } from '../../octypo/state';
import { EngineRegistry } from '../../services/engine-registry';
import { getQueueStats } from '../../ai/request-queue';
import { jobQueue } from '../../job-queue';

const router = Router();

let initialized = false;

function ensureInitialized() {
  if (!initialized) {
    initializeWriterAgents();
    initializeValidatorAgents();
    initialized = true;
  }
}

interface WriterAgentInfo {
  id: string;
  name: string;
  specialty: string;
  expertise: string[];
  contentCount: number;
}

interface ValidatorAgentInfo {
  id: string;
  name: string;
  specialty: string;
}

interface OctypoStats {
  totalAttractions: number;
  pendingContent: number;
  generatedContent: number;
  writerAgentCount: number;
  validatorAgentCount: number;
  avgQualityScore: number;
}

/**
 * GET /api/octypo/stats
 * Returns system stats for the dashboard
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    ensureInitialized();

    const [totalResult, pendingResult, generatedResult, avgScoreResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(tiqetsAttractions)
        .then(r => r[0]?.count ?? 0),
      
      db.select({ count: sql<number>`count(*)::int` })
        .from(tiqetsAttractions)
        .where(isNull(tiqetsAttractions.aiContent))
        .then(r => r[0]?.count ?? 0),
      
      db.select({ count: sql<number>`count(*)::int` })
        .from(tiqetsAttractions)
        .where(isNotNull(tiqetsAttractions.aiContent))
        .then(r => r[0]?.count ?? 0),
      
      db.select({ 
        avgScore: sql<number>`COALESCE(AVG((ai_content->>'qualityScore')::numeric), 0)::numeric(5,2)` 
      })
        .from(tiqetsAttractions)
        .where(isNotNull(tiqetsAttractions.aiContent))
        .then(r => parseFloat(String(r[0]?.avgScore ?? 0))),
    ]);

    const writers = AgentRegistry.getAllWriters();
    const validators = AgentRegistry.getAllValidators();

    const stats: OctypoStats = {
      totalAttractions: totalResult,
      pendingContent: pendingResult,
      generatedContent: generatedResult,
      writerAgentCount: writers.length,
      validatorAgentCount: validators.length,
      avgQualityScore: avgScoreResult,
    };

    res.json(stats);
  } catch (error) {
    log.error('[Octypo] Failed to get stats', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

/**
 * GET /api/octypo/agents/writers
 * Returns all writer agents with their specialties and expertise
 */
router.get('/agents/writers', async (_req: Request, res: Response) => {
  try {
    ensureInitialized();

    const writers = AgentRegistry.getAllWriters();
    
    const writerInfos: WriterAgentInfo[] = writers.map(writer => ({
      id: writer.id,
      name: writer.name,
      specialty: writer.specialty,
      expertise: (writer as any).persona?.expertise || [],
      contentCount: 0,
    }));

    res.json(writerInfos);
  } catch (error) {
    log.error('[Octypo] Failed to get writers', error);
    res.status(500).json({ error: 'Failed to retrieve writers' });
  }
});

/**
 * GET /api/octypo/agents/validators
 * Returns all validator agents
 */
router.get('/agents/validators', async (_req: Request, res: Response) => {
  try {
    ensureInitialized();

    const validators = AgentRegistry.getAllValidators();
    
    const validatorInfos: ValidatorAgentInfo[] = validators.map(validator => ({
      id: validator.id,
      name: validator.name,
      specialty: validator.specialty,
    }));

    res.json(validatorInfos);
  } catch (error) {
    log.error('[Octypo] Failed to get validators', error);
    res.status(500).json({ error: 'Failed to retrieve validators' });
  }
});

/**
 * GET /api/octypo/queue
 * Returns attractions pending content generation
 */
router.get('/queue', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const countResult = await db.execute(sql`
      SELECT count(*)::int as count 
      FROM tiqets_attractions 
      WHERE ai_content IS NULL
    `);
    const total = (countResult.rows[0] as any)?.count ?? 0;

    let attractions: any[] = [];
    if (total > 0) {
      attractions = await db.select({
        id: tiqetsAttractions.id,
        title: tiqetsAttractions.title,
        cityName: tiqetsAttractions.cityName,
        primaryCategory: tiqetsAttractions.primaryCategory,
        priceFrom: tiqetsAttractions.priceFrom,
        rating: tiqetsAttractions.rating,
        reviewCount: tiqetsAttractions.reviewCount,
      })
        .from(tiqetsAttractions)
        .where(isNull(tiqetsAttractions.aiContent))
        .orderBy(desc(tiqetsAttractions.reviewCount))
        .limit(limit)
        .offset(offset);
    }

    res.json({
      queue: attractions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    log.error('[Octypo] Failed to get queue', error);
    res.status(500).json({ error: 'Failed to retrieve queue' });
  }
});

/**
 * POST /api/octypo/generate/:attractionId
 * Triggers content generation for a single attraction
 */
router.post('/generate/:attractionId', async (req: Request, res: Response) => {
  try {
    ensureInitialized();

    const attractionId = parseInt(req.params.attractionId, 10);
    if (isNaN(attractionId)) {
      return res.status(400).json({ error: 'Invalid attraction ID' });
    }

    const [attraction] = await db.select()
      .from(tiqetsAttractions)
      .where(eq(tiqetsAttractions.id, attractionId))
      .limit(1);

    if (!attraction) {
      return res.status(404).json({ error: 'Attraction not found' });
    }

    const attractionData = {
      id: attraction.id,
      title: attraction.title || '',
      cityName: attraction.cityName || '',
      venueName: attraction.venueName || undefined,
      duration: attraction.duration || undefined,
      primaryCategory: attraction.primaryCategory || undefined,
      secondaryCategories: attraction.secondaryCategories || undefined,
      languages: attraction.languages || undefined,
      wheelchairAccess: attraction.wheelchairAccess || undefined,
      tiqetsDescription: attraction.tiqetsDescription || undefined,
      tiqetsHighlights: attraction.tiqetsHighlights || undefined,
      priceFrom: attraction.priceFrom || undefined,
      rating: attraction.rating ? parseFloat(String(attraction.rating)) : undefined,
      reviewCount: attraction.reviewCount || undefined,
      address: attraction.address || undefined,
      coordinates: attraction.latitude && attraction.longitude 
        ? { lat: parseFloat(String(attraction.latitude)), lng: parseFloat(String(attraction.longitude)) }
        : undefined,
    };

    log.info(`[Octypo] Starting content generation for attraction ${attractionId}: ${attraction.title}`);

    const result = await generateAttractionWithOctypo(attractionData);

    if (result.success && result.content) {
      await db.update(tiqetsAttractions)
        .set({
          aiContent: {
            ...result.content,
            qualityScore: result.qualityScore?.overallScore || 0,
            quality108: result.quality108 || null,
            writerUsed: result.writerId,
            generatedAt: new Date().toISOString(),
            processingTimeMs: result.generationTimeMs,
          },
          contentGenerationStatus: 'completed',
        })
        .where(eq(tiqetsAttractions.id, attractionId as any));

      log.info(`[Octypo] Content generation completed for attraction ${attractionId}`);
    } else {
      await db.update(tiqetsAttractions)
        .set({
          contentGenerationStatus: 'failed',
        })
        .where(eq(tiqetsAttractions.id, attractionId));
    }

    res.json({
      success: result.success,
      attractionId,
      qualityScore: result.qualityScore?.overallScore,
      quality108: result.quality108,
      writerUsed: result.writerUsed,
      processingTimeMs: result.processingTimeMs,
      errors: result.errors,
    });
  } catch (error) {
    log.error('[Octypo] Generation failed', error);
    res.status(500).json({ error: 'Content generation failed', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/octypo/jobs/recent
 * Returns recent content generation jobs
 */
router.get('/jobs/recent', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const recentJobs = await db.select({
      id: tiqetsAttractions.id,
      title: tiqetsAttractions.title,
      cityName: tiqetsAttractions.cityName,
      status: tiqetsAttractions.contentGenerationStatus,
      aiContent: tiqetsAttractions.aiContent,
    })
      .from(tiqetsAttractions)
      .where(isNotNull(tiqetsAttractions.contentGenerationStatus))
      .orderBy(desc(tiqetsAttractions.id))
      .limit(limit);

    const jobs = recentJobs.map(job => {
      const content = job.aiContent as any;
      return {
        id: job.id,
        title: job.title,
        cityName: job.cityName,
        status: job.status,
        qualityScore: content?.qualityScore || null,
        quality108: content?.quality108 || null,
        writerUsed: content?.writerUsed || null,
        generatedAt: content?.generatedAt || null,
        processingTimeMs: content?.processingTimeMs || null,
      };
    });

    res.json({ jobs });
  } catch (error) {
    log.error('[Octypo] Failed to get recent jobs', error);
    res.status(500).json({ error: 'Failed to retrieve jobs' });
  }
});

/**
 * GET /api/octypo/jobs/:jobId
 * Returns status of a specific job
 */
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const [job] = await db.select({
      id: tiqetsAttractions.id,
      title: tiqetsAttractions.title,
      cityName: tiqetsAttractions.cityName,
      status: tiqetsAttractions.contentGenerationStatus,
      aiContent: tiqetsAttractions.aiContent,
    })
      .from(tiqetsAttractions)
      .where(eq(tiqetsAttractions.id, jobId as any))
      .limit(1);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const content = job.aiContent as any;
    res.json({
      id: job.id,
      title: job.title,
      cityName: job.cityName,
      status: job.status,
      qualityScore: content?.qualityScore || null,
      quality108: content?.quality108 || null,
      writerUsed: content?.writerUsed || null,
      generatedAt: content?.generatedAt || null,
      processingTimeMs: content?.processingTimeMs || null,
      content: content?.content || null,
    });
  } catch (error) {
    log.error('[Octypo] Failed to get job', error);
    res.status(500).json({ error: 'Failed to retrieve job' });
  }
});

// ============================================================================
// AUTOPILOT CONFIG (in-memory state for config options)
// ============================================================================

interface AutopilotConfig {
  autoExplodeContent: boolean;
  autoTranslate: boolean;
  autoFetchImages: boolean;
  autoPublish: boolean;
  rssIngestion: boolean;
  googleDriveSync: boolean;
}

let autopilotConfig: AutopilotConfig = {
  autoExplodeContent: true,
  autoTranslate: true,
  autoFetchImages: true,
  autoPublish: false,
  rssIngestion: true,
  googleDriveSync: false,
};

// ============================================================================
// DESTINATIONS ENDPOINTS - REAL DATA
// ============================================================================

/**
 * GET /api/octypo/destinations
 * Returns list of destinations with health metrics from real database
 */
router.get('/destinations', async (_req: Request, res: Response) => {
  try {
    const destinationStats = await db.execute(sql`
      SELECT 
        city_name,
        COUNT(*)::int as total_attractions,
        COUNT(CASE WHEN ai_content IS NOT NULL THEN 1 END)::int as with_content,
        COALESCE(AVG(CASE WHEN ai_content IS NOT NULL THEN (ai_content->>'qualityScore')::numeric END), 0)::numeric(5,2) as avg_quality,
        MAX(CASE WHEN ai_content IS NOT NULL THEN ai_content->>'generatedAt' END) as last_updated
      FROM tiqets_attractions
      WHERE city_name IS NOT NULL AND city_name != ''
      GROUP BY city_name
      ORDER BY total_attractions DESC
      LIMIT 50
    `);

    const destinations = (destinationStats.rows as any[]).map(row => {
      const total = row.total_attractions || 0;
      const withContent = row.with_content || 0;
      const health = total > 0 ? Math.round((withContent / total) * 100) : 0;
      const coverage = total > 0 ? Math.round((withContent / total) * 100) : 0;
      
      let status = 'Initializing';
      if (health >= 90) status = 'Running';
      else if (health >= 50) status = 'Growing';
      else if (health >= 20) status = 'Initializing';
      else status = 'New';

      return {
        id: row.city_name.toLowerCase().replace(/\s+/g, '-'),
        name: row.city_name,
        health,
        status,
        coverage,
        budgetToday: 0,
        budgetLimit: 50.00,
        alerts: health < 50 ? Math.floor((100 - health) / 20) : 0,
        contentCount: withContent,
        totalAttractions: total,
        avgQuality: parseFloat(row.avg_quality) || 0,
        lastUpdated: row.last_updated || null,
      };
    });

    res.json({ destinations });
  } catch (error) {
    log.error('[Octypo] Failed to get destinations', error);
    res.status(500).json({ error: 'Failed to retrieve destinations' });
  }
});

// ============================================================================
// AUTOPILOT ENDPOINTS - REAL STATE
// ============================================================================

/**
 * GET /api/octypo/autopilot/status
 * Returns autopilot status using real OctypoRunState
 */
router.get('/autopilot/status', async (_req: Request, res: Response) => {
  try {
    const isRunning = octypoState.isRunning();
    const lastCompleted = octypoState.getLastCompleted();
    const lastActivity = octypoState.getLastActivity();
    const stateStats = octypoState.getStats();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString().split('T')[0];
    
    const todayStats = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN ai_content->>'generatedAt' >= ${todayIso} THEN 1 END)::int as content_generated_today,
        COUNT(CASE WHEN content_generation_status = 'failed' AND ai_content->>'generatedAt' >= ${todayIso} THEN 1 END)::int as errors_today
      FROM tiqets_attractions
      WHERE ai_content IS NOT NULL
    `);
    
    const statsRow = (todayStats.rows[0] as any) || {};

    const status = {
      running: isRunning,
      mode: 'full' as const,
      startedAt: lastActivity?.toISOString() || null,
      lastCompleted: lastCompleted?.toISOString() || null,
      stats: {
        contentGeneratedToday: statsRow.content_generated_today || 0,
        translationsToday: 0,
        publishedToday: 0,
        tasksCompletedToday: statsRow.content_generated_today || 0,
        imagesProcessedToday: 0,
        errorsToday: statsRow.errors_today || stateStats.failedCount,
        failedQueueSize: stateStats.failedCount,
        successRate: Math.round(stateStats.successRate * 100),
        concurrency: stateStats.concurrency,
      },
      uptime: lastActivity 
        ? Math.floor((Date.now() - lastActivity.getTime()) / 1000)
        : 0,
    };

    res.json(status);
  } catch (error) {
    log.error('[Octypo] Failed to get autopilot status', error);
    res.status(500).json({ error: 'Failed to retrieve autopilot status' });
  }
});

/**
 * POST /api/octypo/autopilot/start
 * Start the autopilot
 */
router.post('/autopilot/start', async (req: Request, res: Response) => {
  try {
    const { mode = 'full' } = req.body;
    
    octypoState.setRunning(true);
    
    log.info(`[Octypo] Autopilot started in ${mode} mode`);
    
    res.json({ 
      success: true, 
      message: `Autopilot started in ${mode} mode`,
      state: {
        running: true,
        mode,
        startedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('[Octypo] Failed to start autopilot', error);
    res.status(500).json({ error: 'Failed to start autopilot' });
  }
});

/**
 * POST /api/octypo/autopilot/stop
 * Stop the autopilot
 */
router.post('/autopilot/stop', async (_req: Request, res: Response) => {
  try {
    octypoState.setRunning(false);

    log.info('[Octypo] Autopilot stopped');
    
    res.json({ 
      success: true, 
      message: 'Autopilot stopped',
      state: {
        running: false,
        mode: 'full',
        startedAt: null,
      },
    });
  } catch (error) {
    log.error('[Octypo] Failed to stop autopilot', error);
    res.status(500).json({ error: 'Failed to stop autopilot' });
  }
});

/**
 * GET /api/octypo/autopilot/config
 * Returns autopilot configuration
 */
router.get('/autopilot/config', async (_req: Request, res: Response) => {
  try {
    res.json(autopilotConfig);
  } catch (error) {
    log.error('[Octypo] Failed to get autopilot config', error);
    res.status(500).json({ error: 'Failed to retrieve autopilot config' });
  }
});

/**
 * PATCH /api/octypo/autopilot/config
 * Update autopilot configuration
 */
router.patch('/autopilot/config', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    const validKeys: (keyof AutopilotConfig)[] = [
      'autoExplodeContent',
      'autoTranslate',
      'autoFetchImages',
      'autoPublish',
      'rssIngestion',
      'googleDriveSync',
    ];

    for (const key of validKeys) {
      if (typeof updates[key] === 'boolean') {
        autopilotConfig[key] = updates[key];
      }
    }

    log.info('[Octypo] Autopilot config updated', updates);
    
    res.json({ 
      success: true, 
      config: autopilotConfig,
    });
  } catch (error) {
    log.error('[Octypo] Failed to update autopilot config', error);
    res.status(500).json({ error: 'Failed to update autopilot config' });
  }
});

/**
 * GET /api/octypo/autopilot/pipeline
 * Returns pipeline status based on real queue state
 */
router.get('/autopilot/pipeline', async (_req: Request, res: Response) => {
  try {
    const queueStats = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN ai_content IS NULL THEN 1 END)::int as pending,
        COUNT(CASE WHEN ai_content IS NOT NULL THEN 1 END)::int as processed,
        COUNT(CASE WHEN content_generation_status = 'failed' THEN 1 END)::int as failed
      FROM tiqets_attractions
    `);
    
    const stats = (queueStats.rows[0] as any) || {};
    const failedQueue = octypoState.getFailedQueue();

    const pipeline = [
      {
        id: 'content-generation',
        name: 'Content Generation',
        status: octypoState.isRunning() ? 'running' : 'idle',
        itemsProcessed: stats.processed || 0,
        itemsPending: stats.pending || 0,
        lastRun: octypoState.getLastActivity()?.toISOString() || null,
        avgProcessingTime: 45.0,
        errorRate: stats.processed > 0 ? ((stats.failed / stats.processed) * 100) : 0,
      },
      {
        id: 'failed-retry',
        name: 'Failed Retry Queue',
        status: failedQueue.length > 0 ? 'pending' : 'idle',
        itemsProcessed: 0,
        itemsPending: failedQueue.length,
        lastRun: null,
        avgProcessingTime: 0,
        errorRate: 0,
      },
    ];

    res.json({ pipeline });
  } catch (error) {
    log.error('[Octypo] Failed to get pipeline status', error);
    res.status(500).json({ error: 'Failed to retrieve pipeline status' });
  }
});

/**
 * GET /api/octypo/autopilot/tasks
 * Returns active tasks from the failed queue
 */
router.get('/autopilot/tasks', async (_req: Request, res: Response) => {
  try {
    const failedQueue = octypoState.getFailedQueue();
    
    const tasks = failedQueue.map((item, idx) => ({
      id: `task-${item.id}`,
      title: item.title,
      type: 'content-generation',
      progress: 0,
      status: 'pending',
      retryCount: item.retryCount,
      lastError: item.lastError,
      failedAt: item.failedAt.toISOString(),
    }));

    res.json({ 
      tasks,
      summary: {
        running: 0,
        pending: tasks.length,
        completed: 0,
      },
    });
  } catch (error) {
    log.error('[Octypo] Failed to get tasks', error);
    res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
});

// ============================================================================
// CONTENT ENDPOINTS - REAL DATA
// ============================================================================

/**
 * GET /api/octypo/content
 * Returns content list from real contents table
 */
router.get('/content', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const statusFilter = req.query.status as string;
    const typeFilter = req.query.type as string;

    let whereConditions: any[] = [];
    
    if (statusFilter) {
      whereConditions.push(eq(contents.status, statusFilter as any));
    }
    if (typeFilter) {
      whereConditions.push(eq(contents.type, typeFilter as any));
    }

    const whereClause = whereConditions.length > 0 
      ? and(...whereConditions)
      : undefined;

    const [contentItems, countResult] = await Promise.all([
      db.select({
        id: contents.id,
        title: contents.title,
        type: contents.type,
        status: contents.status,
        seoScore: contents.seoScore,
        wordCount: contents.wordCount,
        writerId: contents.writerId,
        publishedAt: contents.publishedAt,
        updatedAt: contents.updatedAt,
        createdAt: contents.createdAt,
      })
        .from(contents)
        .where(whereClause)
        .orderBy(desc(contents.updatedAt))
        .limit(limit)
        .offset(offset),
      
      db.select({ count: sql<number>`count(*)::int` })
        .from(contents)
        .where(whereClause)
        .then(r => r[0]?.count ?? 0),
    ]);

    const formattedContent = contentItems.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      seoScore: item.seoScore || 0,
      wordCount: item.wordCount || 0,
      writerId: item.writerId,
      publishedAt: item.publishedAt?.toISOString() || null,
      updatedAt: item.updatedAt?.toISOString() || null,
      createdAt: item.createdAt?.toISOString() || null,
    }));

    res.json({
      content: formattedContent,
      total: countResult,
      limit,
      offset,
    });
  } catch (error) {
    log.error('[Octypo] Failed to get content', error);
    res.status(500).json({ error: 'Failed to retrieve content' });
  }
});

// ============================================================================
// REVIEW QUEUE ENDPOINTS - REAL DATA
// ============================================================================

/**
 * GET /api/octypo/review-queue
 * Returns items pending review from real contents table
 */
router.get('/review-queue', async (_req: Request, res: Response) => {
  try {
    const reviewItems = await db.select({
      id: contents.id,
      title: contents.title,
      type: contents.type,
      status: contents.status,
      seoScore: contents.seoScore,
      wordCount: contents.wordCount,
      writerId: contents.writerId,
      createdAt: contents.createdAt,
      updatedAt: contents.updatedAt,
    })
      .from(contents)
      .where(eq(contents.status, 'in_review'))
      .orderBy(desc(contents.createdAt))
      .limit(100);

    const formattedItems = reviewItems.map(item => ({
      id: item.id,
      contentId: item.id,
      title: item.title,
      type: item.type,
      priority: item.seoScore && item.seoScore < 70 ? 'high' : 'medium',
      createdAt: item.createdAt?.toISOString() || null,
      quality: item.seoScore || 0,
      seo: item.seoScore || 0,
      issues: [],
      writerId: item.writerId,
      wordCount: item.wordCount || 0,
    }));

    const byPriority = {
      high: formattedItems.filter(r => r.priority === 'high').length,
      medium: formattedItems.filter(r => r.priority === 'medium').length,
      low: formattedItems.filter(r => r.priority === 'low').length,
    };

    res.json({
      queue: formattedItems,
      total: formattedItems.length,
      byPriority,
    });
  } catch (error) {
    log.error('[Octypo] Failed to get review queue', error);
    res.status(500).json({ error: 'Failed to retrieve review queue' });
  }
});

/**
 * POST /api/octypo/review-queue/:id/approve
 * Approve a review item - updates real content status
 */
router.post('/review-queue/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, publishImmediately = false } = req.body;

    const newStatus = publishImmediately ? 'published' : 'approved';
    
    await db.update(contents)
      .set({
        status: newStatus as any,
        approvedAt: new Date(),
        publishedAt: publishImmediately ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(contents.id, id));

    log.info(`[Octypo] Review item ${id} approved`, { notes, publishImmediately });

    res.json({
      success: true,
      message: `Review item ${id} approved`,
      action: publishImmediately ? 'Published' : 'Approved',
      reviewedAt: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[Octypo] Failed to approve review item', error);
    res.status(500).json({ error: 'Failed to approve review item' });
  }
});

/**
 * POST /api/octypo/review-queue/:id/reject
 * Reject a review item - updates real content status
 */
router.post('/review-queue/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, sendBackToWriter = true } = req.body;

    const newStatus = sendBackToWriter ? 'draft' : 'archived';
    
    await db.update(contents)
      .set({
        status: newStatus as any,
        updatedAt: new Date(),
      })
      .where(eq(contents.id, id));

    log.info(`[Octypo] Review item ${id} rejected`, { reason, sendBackToWriter });

    res.json({
      success: true,
      message: `Review item ${id} rejected`,
      action: sendBackToWriter ? 'Sent back to writer' : 'Archived',
      reviewedAt: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[Octypo] Failed to reject review item', error);
    res.status(500).json({ error: 'Failed to reject review item' });
  }
});

// ============================================================================
// AGENT ENDPOINTS (DETAILED) - REAL DATA
// ============================================================================

/**
 * GET /api/octypo/agents/writers/detailed
 * Returns writers with full personality info and real stats from database
 */
router.get('/agents/writers/detailed', async (_req: Request, res: Response) => {
  try {
    ensureInitialized();

    const writers = AgentRegistry.getAllWriters();
    
    const writerStatsResult = await db.execute(sql`
      SELECT 
        ai_content->>'writerUsed' as writer_id,
        COUNT(*)::int as generated,
        COUNT(CASE WHEN content_generation_status = 'completed' THEN 1 END)::int as successful,
        COALESCE(AVG((ai_content->>'qualityScore')::numeric), 0)::numeric(5,2) as avg_quality,
        COALESCE(AVG((ai_content->>'processingTimeMs')::numeric), 0)::numeric(10,0) as avg_time
      FROM tiqets_attractions
      WHERE ai_content IS NOT NULL AND ai_content->>'writerUsed' IS NOT NULL
      GROUP BY ai_content->>'writerUsed'
    `);
    
    const statsMap = new Map<string, any>();
    for (const row of writerStatsResult.rows as any[]) {
      statsMap.set(row.writer_id, row);
    }

    const writerDetails = writers.map(writer => {
      const persona = (writer as any).persona || {};
      const stats = statsMap.get(writer.id) || { generated: 0, successful: 0, avg_quality: 0, avg_time: 0 };
      const successRate = stats.generated > 0 ? (stats.successful / stats.generated) * 100 : 0;

      return {
        id: writer.id,
        name: writer.name,
        specialty: writer.specialty,
        experienceYears: 10,
        languagesCount: 3,
        traits: persona.tone ? [persona.tone] : [],
        quote: '',
        avatar: null,
        stats: {
          generated: parseInt(stats.generated) || 0,
          successRate: Math.round(successRate * 10) / 10,
          avgQuality: parseFloat(stats.avg_quality) || 0,
          avgSEO: 0,
          avgWordCount: 0,
          avgProcessingTimeMs: parseInt(stats.avg_time) || 0,
        },
        expertise: persona.expertise || [],
        tone: persona.tone || '',
        preferredDestinations: [],
      };
    });

    res.json({ writers: writerDetails });
  } catch (error) {
    log.error('[Octypo] Failed to get detailed writers', error);
    res.status(500).json({ error: 'Failed to retrieve detailed writers' });
  }
});

/**
 * GET /api/octypo/agents/stats
 * Returns aggregate agent performance stats from real database
 */
router.get('/agents/stats', async (_req: Request, res: Response) => {
  try {
    ensureInitialized();

    const [overallStats, writerStats, recentStats] = await Promise.all([
      db.execute(sql`
        SELECT 
          COUNT(*)::int as total_generated,
          COUNT(CASE WHEN content_generation_status = 'completed' THEN 1 END)::int as successful,
          COALESCE(AVG((ai_content->>'qualityScore')::numeric), 0)::numeric(5,2) as avg_quality,
          COALESCE(AVG((ai_content->>'processingTimeMs')::numeric), 0)::numeric(10,0) as avg_time
        FROM tiqets_attractions
        WHERE ai_content IS NOT NULL
      `).then(r => r.rows[0] as any),

      db.execute(sql`
        SELECT 
          ai_content->>'writerUsed' as writer_id,
          COUNT(*)::int as generated,
          COUNT(CASE WHEN content_generation_status = 'completed' THEN 1 END)::int as successful,
          COALESCE(AVG((ai_content->>'qualityScore')::numeric), 0)::numeric(5,2) as avg_quality
        FROM tiqets_attractions
        WHERE ai_content IS NOT NULL AND ai_content->>'writerUsed' IS NOT NULL
        GROUP BY ai_content->>'writerUsed'
        ORDER BY generated DESC
      `).then(r => r.rows as any[]),

      db.execute(sql`
        SELECT 
          COUNT(CASE WHEN ai_content->>'generatedAt' >= NOW() - INTERVAL '7 days' THEN 1 END)::int as last_7_days,
          COUNT(CASE WHEN ai_content->>'generatedAt' >= NOW() - INTERVAL '30 days' THEN 1 END)::int as last_30_days,
          COALESCE(AVG(CASE WHEN ai_content->>'generatedAt' >= NOW() - INTERVAL '7 days' THEN (ai_content->>'qualityScore')::numeric END), 0)::numeric(5,2) as quality_7_days,
          COALESCE(AVG(CASE WHEN ai_content->>'generatedAt' >= NOW() - INTERVAL '30 days' THEN (ai_content->>'qualityScore')::numeric END), 0)::numeric(5,2) as quality_30_days
        FROM tiqets_attractions
        WHERE ai_content IS NOT NULL
      `).then(r => r.rows[0] as any),
    ]);

    const writers = AgentRegistry.getAllWriters();
    const writerNameMap = new Map(writers.map(w => [w.id, w.name]));

    const totalGenerated = parseInt(overallStats.total_generated) || 0;
    const successRate = totalGenerated > 0 ? (parseInt(overallStats.successful) / totalGenerated) * 100 : 0;

    const byWriter = writerStats.map(row => {
      const generated = parseInt(row.generated) || 0;
      const successful = parseInt(row.successful) || 0;
      return {
        id: row.writer_id,
        name: writerNameMap.get(row.writer_id) || row.writer_id,
        generated,
        successRate: generated > 0 ? Math.round((successful / generated) * 1000) / 10 : 0,
        avgQuality: parseFloat(row.avg_quality) || 0,
        avgSEO: 0,
      };
    });

    const topByQuality = byWriter.length > 0 
      ? byWriter.reduce((a, b) => a.avgQuality > b.avgQuality ? a : b)
      : null;
    const topByVolume = byWriter.length > 0 
      ? byWriter.reduce((a, b) => a.generated > b.generated ? a : b)
      : null;
    const topBySuccessRate = byWriter.length > 0 
      ? byWriter.reduce((a, b) => a.successRate > b.successRate ? a : b)
      : null;

    const stats = {
      overall: {
        totalGenerated,
        avgSuccessRate: Math.round(successRate * 10) / 10,
        avgQuality: parseFloat(overallStats.avg_quality) || 0,
        avgSEO: 0,
        avgProcessingTime: parseFloat(overallStats.avg_time) || 0,
      },
      byWriter,
      topPerformers: {
        byQuality: topByQuality ? { id: topByQuality.id, name: topByQuality.name, score: topByQuality.avgQuality } : null,
        bySEO: null,
        byVolume: topByVolume ? { id: topByVolume.id, name: topByVolume.name, count: topByVolume.generated } : null,
        bySuccessRate: topBySuccessRate ? { id: topBySuccessRate.id, name: topBySuccessRate.name, rate: topBySuccessRate.successRate } : null,
      },
      trends: {
        last7Days: { generated: parseInt(recentStats.last_7_days) || 0, avgQuality: parseFloat(recentStats.quality_7_days) || 0 },
        last30Days: { generated: parseInt(recentStats.last_30_days) || 0, avgQuality: parseFloat(recentStats.quality_30_days) || 0 },
      },
    };

    res.json(stats);
  } catch (error) {
    log.error('[Octypo] Failed to get agent stats', error);
    res.status(500).json({ error: 'Failed to retrieve agent stats' });
  }
});

// ============================================================================
// WORKFLOW ENDPOINTS - REAL DATA
// ============================================================================

/**
 * GET /api/octypo/workflows
 * Returns workflow list from real workflow_instances table
 */
router.get('/workflows', async (_req: Request, res: Response) => {
  try {
    const workflowData = await db.select({
      id: workflowInstances.id,
      contentId: workflowInstances.contentId,
      status: workflowInstances.status,
      currentStep: workflowInstances.currentStep,
      submittedAt: workflowInstances.submittedAt,
      completedAt: workflowInstances.completedAt,
      metadata: workflowInstances.metadata,
      contentTitle: contents.title,
      contentType: contents.type,
      writerId: contents.writerId,
    })
      .from(workflowInstances)
      .leftJoin(contents, eq(workflowInstances.contentId, contents.id))
      .orderBy(desc(workflowInstances.submittedAt))
      .limit(100);

    const workflows = workflowData.map(wf => {
      const steps = ['draft', 'review', 'translation', 'images', 'seo-check', 'published'];
      const completedSteps = wf.currentStep || 0;
      const duration = wf.submittedAt && wf.completedAt 
        ? wf.completedAt.getTime() - wf.submittedAt.getTime()
        : null;

      return {
        id: wf.id,
        contentTitle: wf.contentTitle || 'Untitled',
        contentId: wf.contentId,
        status: wf.status || 'pending',
        currentStep: steps[Math.min(completedSteps, steps.length - 1)],
        steps,
        completedSteps,
        totalSteps: steps.length,
        startedAt: wf.submittedAt?.toISOString() || null,
        completedAt: wf.completedAt?.toISOString() || null,
        duration,
        writerId: wf.writerId,
      };
    });

    const summary = {
      completed: workflows.filter(w => w.status === 'completed' || w.status === 'approved').length,
      running: workflows.filter(w => w.status === 'in_progress' || w.status === 'pending').length,
      pending: workflows.filter(w => w.status === 'pending').length,
      avgCompletionTime: workflows
        .filter(w => w.duration)
        .reduce((sum, w) => sum + (w.duration || 0), 0) / (workflows.filter(w => w.duration).length || 1),
    };

    res.json({
      workflows,
      summary,
    });
  } catch (error) {
    log.error('[Octypo] Failed to get workflows', error);
    res.status(500).json({ error: 'Failed to retrieve workflows' });
  }
});

/**
 * GET /api/octypo/engines
 * Returns all AI engines with their status
 */
router.get('/engines', async (_req: Request, res: Response) => {
  try {
    EngineRegistry.initialize();
    const engines = EngineRegistry.getAllEngines();
    const stats = EngineRegistry.getStats();
    
    const engineList = engines.map(engine => ({
      id: engine.id,
      name: engine.name,
      provider: engine.provider,
      model: engine.model,
      isHealthy: engine.isHealthy,
      errorCount: engine.errorCount,
      successCount: engine.successCount,
      lastError: engine.lastError || null,
      lastUsed: engine.lastUsed?.toISOString() || null,
    }));

    res.json({
      engines: engineList,
      stats: {
        total: stats.total,
        healthy: stats.healthy,
        unhealthy: stats.total - stats.healthy,
        byProvider: stats.byProvider,
      },
      _meta: { apiVersion: 'v1' },
    });
  } catch (error) {
    log.error('[Octypo] Failed to get engines', error);
    res.status(500).json({ error: 'Failed to retrieve engines' });
  }
});

/**
 * GET /api/octypo/engines/stats
 * Returns aggregate engine statistics
 */
router.get('/engines/stats', async (_req: Request, res: Response) => {
  try {
    EngineRegistry.initialize();
    const engines = EngineRegistry.getAllEngines();
    const stats = EngineRegistry.getStats();
    
    const totalRequests = engines.reduce((sum, e) => sum + e.successCount + e.errorCount, 0);
    const totalSuccess = engines.reduce((sum, e) => sum + e.successCount, 0);
    const successRate = totalRequests > 0 ? (totalSuccess / totalRequests * 100).toFixed(1) : '100.0';

    res.json({
      total: stats.total,
      healthy: stats.healthy,
      unhealthy: stats.total - stats.healthy,
      byProvider: stats.byProvider,
      performance: {
        totalRequests,
        successfulRequests: totalSuccess,
        failedRequests: totalRequests - totalSuccess,
        successRate: parseFloat(successRate),
      },
      _meta: { apiVersion: 'v1' },
    });
  } catch (error) {
    log.error('[Octypo] Failed to get engine stats', error);
    res.status(500).json({ error: 'Failed to retrieve engine stats' });
  }
});

/**
 * GET /api/octypo/ai-queue/status
 * Returns AI request queue status with rate limiting info
 */
router.get('/ai-queue/status', async (_req: Request, res: Response) => {
  try {
    const queueStats = getQueueStats();
    
    res.json({
      queue: {
        length: queueStats.queueLength,
        processing: queueStats.processing,
        activeRequests: queueStats.activeRequests,
        completedRequests: queueStats.completedRequests,
        failedRequests: queueStats.failedRequests,
      },
      providers: queueStats.providers.map(p => ({
        name: p.name,
        available: p.available,
        tokens: p.tokens,
        maxTokens: p.maxTokens,
        requestsThisMinute: p.requestsThisMinute,
        requestsThisHour: p.requestsThisHour,
        blockedUntil: p.blockedUntil,
        waitTimeSeconds: p.waitTimeSeconds,
        status: p.status,
      })),
      estimatedWait: queueStats.estimatedWait,
      estimatedWaitSeconds: queueStats.estimatedWaitSeconds,
      _meta: { apiVersion: 'v1' },
    });
  } catch (error) {
    log.error('[Octypo] Failed to get AI queue status', error);
    res.status(500).json({ error: 'Failed to retrieve AI queue status' });
  }
});

/**
 * GET /api/octypo/job-queue/status
 * Returns background job queue status from PostgreSQL
 */
router.get('/job-queue/status', async (_req: Request, res: Response) => {
  try {
    const stats = await jobQueue.getStats();
    const recentJobs = await jobQueue.getRecentJobs(20);
    
    res.json({
      stats,
      recentJobs: recentJobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        priority: job.priority,
        retries: job.retries,
        maxRetries: job.maxRetries,
        error: job.error || null,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString() || null,
        completedAt: job.completedAt?.toISOString() || null,
      })),
      _meta: { apiVersion: 'v1' },
    });
  } catch (error) {
    log.error('[Octypo] Failed to get job queue status', error);
    res.status(500).json({ error: 'Failed to retrieve job queue status' });
  }
});

export default router;
