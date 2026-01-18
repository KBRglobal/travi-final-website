/**
 * Octypo Admin Routes
 * 
 * Admin dashboard API for managing the AI content generation system
 */

import { Router, type Request, type Response } from 'express';
import { db } from '../../db';
import { tiqetsAttractions } from '@shared/schema';
import { eq, isNull, isNotNull, sql, desc } from 'drizzle-orm';
import { log } from '../../lib/logger';
import { 
  AgentRegistry, 
  initializeWriterAgents, 
  initializeValidatorAgents,
  generateAttractionWithOctypo,
  getOctypoOrchestrator,
} from '../../octypo';

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

    // Use raw SQL to avoid Drizzle issues with empty result sets
    const countResult = await db.execute(sql`
      SELECT count(*)::int as count 
      FROM tiqets_attractions 
      WHERE ai_content IS NULL
    `);
    const total = (countResult.rows[0] as any)?.count ?? 0;

    // Only run the main query if there are results
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
// AUTOPILOT STATE (in-memory for demo)
// ============================================================================

interface AutopilotState {
  running: boolean;
  mode: 'full' | 'content-only' | 'review-only' | 'translation-only';
  startedAt: string | null;
}

interface AutopilotConfig {
  autoExplodeContent: boolean;
  autoTranslate: boolean;
  autoFetchImages: boolean;
  autoPublish: boolean;
  rssIngestion: boolean;
  googleDriveSync: boolean;
}

let autopilotState: AutopilotState = {
  running: true,
  mode: 'full',
  startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

let autopilotConfig: AutopilotConfig = {
  autoExplodeContent: true,
  autoTranslate: true,
  autoFetchImages: true,
  autoPublish: false,
  rssIngestion: true,
  googleDriveSync: false,
};

// ============================================================================
// DESTINATIONS ENDPOINTS
// ============================================================================

/**
 * GET /api/octypo/destinations
 * Returns list of destinations with health metrics
 */
router.get('/destinations', async (_req: Request, res: Response) => {
  try {
    const destinations = [
      {
        id: 'tel-aviv',
        name: 'Tel Aviv',
        health: 94,
        status: 'Running',
        coverage: 87,
        budgetToday: 12.50,
        budgetLimit: 50.00,
        alerts: 0,
        contentCount: 156,
        lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: 'jerusalem',
        name: 'Jerusalem',
        health: 78,
        status: 'Growing',
        coverage: 65,
        budgetToday: 8.75,
        budgetLimit: 50.00,
        alerts: 2,
        contentCount: 89,
        lastUpdated: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'haifa',
        name: 'Haifa',
        health: 45,
        status: 'Initializing',
        coverage: 23,
        budgetToday: 3.20,
        budgetLimit: 50.00,
        alerts: 5,
        contentCount: 34,
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'dubai',
        name: 'Dubai',
        health: 98,
        status: 'Running',
        coverage: 95,
        budgetToday: 18.90,
        budgetLimit: 75.00,
        alerts: 0,
        contentCount: 312,
        lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        id: 'barcelona',
        name: 'Barcelona',
        health: 91,
        status: 'Running',
        coverage: 82,
        budgetToday: 14.30,
        budgetLimit: 60.00,
        alerts: 1,
        contentCount: 198,
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ];

    res.json({ destinations });
  } catch (error) {
    log.error('[Octypo] Failed to get destinations', error);
    res.status(500).json({ error: 'Failed to retrieve destinations' });
  }
});

// ============================================================================
// AUTOPILOT ENDPOINTS
// ============================================================================

/**
 * GET /api/octypo/autopilot/status
 * Returns autopilot status and stats
 */
router.get('/autopilot/status', async (_req: Request, res: Response) => {
  try {
    const status = {
      running: autopilotState.running,
      mode: autopilotState.mode,
      startedAt: autopilotState.startedAt,
      stats: {
        contentGeneratedToday: 47,
        translationsToday: 124,
        publishedToday: 23,
        tasksCompletedToday: 89,
        imagesProcessedToday: 156,
        errorsToday: 2,
      },
      uptime: autopilotState.startedAt 
        ? Math.floor((Date.now() - new Date(autopilotState.startedAt).getTime()) / 1000)
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
    
    autopilotState = {
      running: true,
      mode: mode as AutopilotState['mode'],
      startedAt: new Date().toISOString(),
    };

    log.info(`[Octypo] Autopilot started in ${mode} mode`);
    
    res.json({ 
      success: true, 
      message: `Autopilot started in ${mode} mode`,
      state: autopilotState,
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
    autopilotState = {
      running: false,
      mode: autopilotState.mode,
      startedAt: null,
    };

    log.info('[Octypo] Autopilot stopped');
    
    res.json({ 
      success: true, 
      message: 'Autopilot stopped',
      state: autopilotState,
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
 * Returns pipeline status for each processing stage
 */
router.get('/autopilot/pipeline', async (_req: Request, res: Response) => {
  try {
    const pipeline = [
      {
        id: 'rss-ingestion',
        name: 'RSS Ingestion',
        status: 'running',
        itemsProcessed: 156,
        itemsPending: 23,
        lastRun: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        avgProcessingTime: 2.3,
        errorRate: 0.5,
      },
      {
        id: 'entity-extraction',
        name: 'Entity Extraction',
        status: 'running',
        itemsProcessed: 142,
        itemsPending: 37,
        lastRun: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        avgProcessingTime: 4.7,
        errorRate: 1.2,
      },
      {
        id: 'translation',
        name: 'Translation',
        status: 'running',
        itemsProcessed: 89,
        itemsPending: 67,
        lastRun: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        avgProcessingTime: 8.2,
        errorRate: 0.3,
      },
      {
        id: 'image-fetching',
        name: 'Image Fetching',
        status: 'idle',
        itemsProcessed: 234,
        itemsPending: 12,
        lastRun: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        avgProcessingTime: 3.1,
        errorRate: 2.1,
      },
      {
        id: 'quality-check',
        name: 'Quality Check',
        status: 'running',
        itemsProcessed: 78,
        itemsPending: 45,
        lastRun: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        avgProcessingTime: 1.5,
        errorRate: 0.0,
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
 * Returns active task queue with progress
 */
router.get('/autopilot/tasks', async (_req: Request, res: Response) => {
  try {
    const tasks = [
      {
        id: 'task-001',
        title: 'Barcelona Travel Guide',
        type: 'content-generation',
        progress: 85,
        status: 'running',
        writer: 'Sarah Mitchell',
        startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        estimatedCompletion: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
      },
      {
        id: 'task-002',
        title: 'Tokyo Hotels Collection',
        type: 'content-generation',
        progress: 62,
        status: 'running',
        writer: 'Michael Chen',
        startedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        estimatedCompletion: new Date(Date.now() + 7 * 60 * 1000).toISOString(),
      },
      {
        id: 'task-003',
        title: 'Paris Restaurants Guide',
        type: 'content-generation',
        progress: 45,
        status: 'running',
        writer: 'Fatima Al-Rashid',
        startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
      {
        id: 'task-004',
        title: 'Dubai Desert Safari',
        type: 'translation',
        progress: 78,
        status: 'running',
        targetLanguages: ['ar', 'fr', 'de', 'es'],
        startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
      {
        id: 'task-005',
        title: 'London Museums Guide',
        type: 'image-fetching',
        progress: 92,
        status: 'running',
        imagesFound: 23,
        imagesNeeded: 25,
        startedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        estimatedCompletion: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      },
      {
        id: 'task-006',
        title: 'Rome Historical Sites',
        type: 'quality-check',
        progress: 30,
        status: 'pending',
        startedAt: null,
        estimatedCompletion: null,
      },
      {
        id: 'task-007',
        title: 'Singapore Street Food',
        type: 'content-generation',
        progress: 0,
        status: 'pending',
        writer: 'David Rodriguez',
        startedAt: null,
        estimatedCompletion: null,
      },
    ];

    res.json({ 
      tasks,
      summary: {
        running: tasks.filter(t => t.status === 'running').length,
        pending: tasks.filter(t => t.status === 'pending').length,
        completed: 89,
      },
    });
  } catch (error) {
    log.error('[Octypo] Failed to get tasks', error);
    res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
});

// ============================================================================
// CONTENT ENDPOINTS
// ============================================================================

/**
 * GET /api/octypo/content
 * Returns content list with metadata
 */
router.get('/content', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;
    const type = req.query.type as string;

    const contentItems = [
      {
        id: 'content-001',
        title: 'Ultimate Guide to Barcelona Architecture',
        type: 'Guide',
        status: 'Published',
        writer: 'Sarah Mitchell',
        writerId: 'writer-sarah',
        score: 96,
        seoScore: 94,
        wordCount: 2450,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'content-002',
        title: 'Tokyo Street Food: Hidden Gems',
        type: 'Article',
        status: 'Published',
        writer: 'Fatima Al-Rashid',
        writerId: 'writer-fatima',
        score: 92,
        seoScore: 89,
        wordCount: 1850,
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'content-003',
        title: 'Dubai Luxury Hotels 2026',
        type: 'Guide',
        status: 'Draft',
        writer: 'Michael Chen',
        writerId: 'writer-michael',
        score: 78,
        seoScore: 72,
        wordCount: 1200,
        publishedAt: null,
        updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'content-004',
        title: 'Paris Walking Tours: Left Bank',
        type: 'Article',
        status: 'Needs Review',
        writer: 'Ahmed Mansour',
        writerId: 'writer-ahmed',
        score: 85,
        seoScore: 88,
        wordCount: 1650,
        publishedAt: null,
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'content-005',
        title: 'Adventure Activities in Tel Aviv',
        type: 'Guide',
        status: 'Published',
        writer: 'Omar Hassan',
        writerId: 'writer-omar',
        score: 94,
        seoScore: 91,
        wordCount: 2100,
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'content-006',
        title: 'Jerusalem Heritage Sites',
        type: 'Guide',
        status: 'Needs Review',
        writer: 'Ahmed Mansour',
        writerId: 'writer-ahmed',
        score: 82,
        seoScore: 86,
        wordCount: 1890,
        publishedAt: null,
        updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'content-007',
        title: 'Budget Travel in Southeast Asia',
        type: 'Article',
        status: 'Published',
        writer: 'David Rodriguez',
        writerId: 'writer-david',
        score: 90,
        seoScore: 93,
        wordCount: 2300,
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'content-008',
        title: 'Eco-Friendly Hotels in Costa Rica',
        type: 'Guide',
        status: 'Draft',
        writer: 'Layla Nasser',
        writerId: 'writer-layla',
        score: 75,
        seoScore: 68,
        wordCount: 980,
        publishedAt: null,
        updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'content-009',
        title: 'Family Adventures in Orlando',
        type: 'Guide',
        status: 'Published',
        writer: 'Rebecca Thompson',
        writerId: 'writer-rebecca',
        score: 97,
        seoScore: 95,
        wordCount: 2780,
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'content-010',
        title: 'Rome Colosseum Skip-the-Line Tips',
        type: 'Article',
        status: 'Needs Review',
        writer: 'Sarah Mitchell',
        writerId: 'writer-sarah',
        score: 88,
        seoScore: 90,
        wordCount: 1420,
        publishedAt: null,
        updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ];

    let filteredContent = contentItems;
    if (status) {
      filteredContent = filteredContent.filter(c => c.status.toLowerCase() === status.toLowerCase());
    }
    if (type) {
      filteredContent = filteredContent.filter(c => c.type.toLowerCase() === type.toLowerCase());
    }

    const paginatedContent = filteredContent.slice(offset, offset + limit);

    res.json({
      content: paginatedContent,
      total: filteredContent.length,
      limit,
      offset,
    });
  } catch (error) {
    log.error('[Octypo] Failed to get content', error);
    res.status(500).json({ error: 'Failed to retrieve content' });
  }
});

// ============================================================================
// REVIEW QUEUE ENDPOINTS
// ============================================================================

/**
 * GET /api/octypo/review-queue
 * Returns items pending review
 */
router.get('/review-queue', async (_req: Request, res: Response) => {
  try {
    const reviewItems = [
      {
        id: 'review-001',
        contentId: 'content-004',
        title: 'Paris Walking Tours: Left Bank',
        type: 'Article',
        priority: 'high',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        quality: 85,
        seo: 88,
        issues: ['Missing meta description', 'Low image count'],
        writer: 'Ahmed Mansour',
        wordCount: 1650,
      },
      {
        id: 'review-002',
        contentId: 'content-006',
        title: 'Jerusalem Heritage Sites',
        type: 'Guide',
        priority: 'medium',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        quality: 82,
        seo: 86,
        issues: ['Needs cultural sensitivity review', 'Add more FAQs'],
        writer: 'Ahmed Mansour',
        wordCount: 1890,
      },
      {
        id: 'review-003',
        contentId: 'content-010',
        title: 'Rome Colosseum Skip-the-Line Tips',
        type: 'Article',
        priority: 'high',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        quality: 88,
        seo: 90,
        issues: ['Verify pricing information', 'Check opening hours'],
        writer: 'Sarah Mitchell',
        wordCount: 1420,
      },
      {
        id: 'review-004',
        contentId: 'content-011',
        title: 'Bangkok Temple Etiquette',
        type: 'Guide',
        priority: 'low',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        quality: 91,
        seo: 87,
        issues: ['Minor grammar fixes'],
        writer: 'Fatima Al-Rashid',
        wordCount: 1340,
      },
      {
        id: 'review-005',
        contentId: 'content-012',
        title: 'New York Budget Eats',
        type: 'Article',
        priority: 'medium',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        quality: 79,
        seo: 82,
        issues: ['Add more restaurant options', 'Update prices', 'Add subway directions'],
        writer: 'David Rodriguez',
        wordCount: 1560,
      },
    ];

    res.json({
      queue: reviewItems,
      total: reviewItems.length,
      byPriority: {
        high: reviewItems.filter(r => r.priority === 'high').length,
        medium: reviewItems.filter(r => r.priority === 'medium').length,
        low: reviewItems.filter(r => r.priority === 'low').length,
      },
    });
  } catch (error) {
    log.error('[Octypo] Failed to get review queue', error);
    res.status(500).json({ error: 'Failed to retrieve review queue' });
  }
});

/**
 * POST /api/octypo/review-queue/:id/approve
 * Approve a review item
 */
router.post('/review-queue/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, publishImmediately = false } = req.body;

    log.info(`[Octypo] Review item ${id} approved`, { notes, publishImmediately });

    res.json({
      success: true,
      message: `Review item ${id} approved`,
      action: publishImmediately ? 'Published' : 'Moved to drafts',
      reviewedAt: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[Octypo] Failed to approve review item', error);
    res.status(500).json({ error: 'Failed to approve review item' });
  }
});

/**
 * POST /api/octypo/review-queue/:id/reject
 * Reject a review item
 */
router.post('/review-queue/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, sendBackToWriter = true } = req.body;

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
// AGENT ENDPOINTS (DETAILED)
// ============================================================================

/**
 * GET /api/octypo/agents/writers/detailed
 * Returns writers with full personality info and stats
 */
router.get('/agents/writers/detailed', async (_req: Request, res: Response) => {
  try {
    ensureInitialized();

    const writerDetails = [
      {
        id: 'writer-sarah',
        name: 'Sarah Mitchell',
        specialty: 'International Travel & Luxury Experiences',
        experienceYears: 15,
        languagesCount: 4,
        traits: ['Sophisticated', 'Warm', 'Detail-oriented', 'Cultured'],
        quote: 'Travel is the only thing you buy that makes you richer.',
        avatar: null,
        stats: {
          generated: 156,
          successRate: 98.2,
          avgQuality: 94.5,
          avgSEO: 91.3,
          avgWordCount: 2150,
        },
        expertise: ['luxury hotels', 'fine dining', 'cultural landmarks', 'first-class experiences'],
        tone: 'Sophisticated yet approachable',
        preferredDestinations: ['Paris', 'Tokyo', 'Dubai', 'Barcelona'],
      },
      {
        id: 'writer-omar',
        name: 'Omar Hassan',
        specialty: 'Adventure & Active Travel',
        experienceYears: 12,
        languagesCount: 3,
        traits: ['Energetic', 'Inspiring', 'Safety-conscious', 'Adventurous'],
        quote: 'Adventure is worthwhile in itself.',
        avatar: null,
        stats: {
          generated: 132,
          successRate: 96.8,
          avgQuality: 92.1,
          avgSEO: 88.7,
          avgWordCount: 1980,
        },
        expertise: ['outdoor activities', 'adventure sports', 'hiking', 'water sports', 'desert experiences'],
        tone: 'Energetic and inspiring',
        preferredDestinations: ['Dubai', 'New Zealand', 'Costa Rica', 'Iceland'],
      },
      {
        id: 'writer-fatima',
        name: 'Fatima Al-Rashid',
        specialty: 'Culinary & Food Tourism',
        experienceYears: 10,
        languagesCount: 5,
        traits: ['Warm', 'Sensory-rich', 'Cultural', 'Passionate'],
        quote: 'Food is the universal language of hospitality.',
        avatar: null,
        stats: {
          generated: 145,
          successRate: 97.5,
          avgQuality: 95.2,
          avgSEO: 90.8,
          avgWordCount: 2050,
        },
        expertise: ['local cuisine', 'food markets', 'cooking classes', 'restaurant reviews', 'food history'],
        tone: 'Warm and sensory-rich',
        preferredDestinations: ['Tokyo', 'Bangkok', 'Rome', 'Istanbul'],
      },
      {
        id: 'writer-michael',
        name: 'Michael Chen',
        specialty: 'Business & MICE Travel',
        experienceYears: 18,
        languagesCount: 3,
        traits: ['Professional', 'Efficient', 'Detail-focused', 'Executive'],
        quote: 'The world is a book, and business travelers read it cover to cover.',
        avatar: null,
        stats: {
          generated: 89,
          successRate: 99.1,
          avgQuality: 91.8,
          avgSEO: 93.2,
          avgWordCount: 1850,
        },
        expertise: ['business hotels', 'conference venues', 'networking spots', 'executive experiences'],
        tone: 'Professional and efficient',
        preferredDestinations: ['Singapore', 'Hong Kong', 'London', 'New York'],
      },
      {
        id: 'writer-rebecca',
        name: 'Rebecca Thompson',
        specialty: 'Family & Multigenerational Travel',
        experienceYears: 14,
        languagesCount: 2,
        traits: ['Friendly', 'Practical', 'Patient', 'Organized'],
        quote: 'The best family memories are made on vacation.',
        avatar: null,
        stats: {
          generated: 167,
          successRate: 97.8,
          avgQuality: 96.1,
          avgSEO: 92.4,
          avgWordCount: 2280,
        },
        expertise: ['family attractions', 'kid-friendly venues', 'accessibility', 'multigenerational trips'],
        tone: 'Friendly and practical',
        preferredDestinations: ['Orlando', 'London', 'Tokyo Disneyland', 'San Diego'],
      },
      {
        id: 'writer-ahmed',
        name: 'Ahmed Mansour',
        specialty: 'Heritage & Cultural Tourism',
        experienceYears: 20,
        languagesCount: 6,
        traits: ['Scholarly', 'Accessible', 'Respectful', 'Deep'],
        quote: 'History is not the past, it is the present traveling with us.',
        avatar: null,
        stats: {
          generated: 178,
          successRate: 95.4,
          avgQuality: 93.7,
          avgSEO: 89.1,
          avgWordCount: 2420,
        },
        expertise: ['historical sites', 'museums', 'architecture', 'religious sites', 'traditional crafts'],
        tone: 'Scholarly yet accessible',
        preferredDestinations: ['Jerusalem', 'Rome', 'Cairo', 'Athens'],
      },
      {
        id: 'writer-david',
        name: 'David Rodriguez',
        specialty: 'Budget & Backpacker Travel',
        experienceYears: 8,
        languagesCount: 4,
        traits: ['Resourceful', 'Enthusiastic', 'Street-smart', 'Authentic'],
        quote: 'The best things in travel are often free.',
        avatar: null,
        stats: {
          generated: 198,
          successRate: 94.2,
          avgQuality: 89.4,
          avgSEO: 91.8,
          avgWordCount: 1780,
        },
        expertise: ['budget tips', 'hostels', 'street food', 'free attractions', 'local transport'],
        tone: 'Resourceful and enthusiastic',
        preferredDestinations: ['Southeast Asia', 'South America', 'Eastern Europe', 'India'],
      },
      {
        id: 'writer-layla',
        name: 'Layla Nasser',
        specialty: 'Sustainable & Eco Tourism',
        experienceYears: 11,
        languagesCount: 3,
        traits: ['Thoughtful', 'Conscious', 'Responsible', 'Ethical'],
        quote: 'Travel light, leave only footprints.',
        avatar: null,
        stats: {
          generated: 112,
          successRate: 96.5,
          avgQuality: 92.8,
          avgSEO: 88.3,
          avgWordCount: 2100,
        },
        expertise: ['eco-lodges', 'conservation', 'responsible tourism', 'local communities', 'carbon footprint'],
        tone: 'Thoughtful and conscious',
        preferredDestinations: ['Costa Rica', 'Norway', 'Bhutan', 'New Zealand'],
      },
    ];

    res.json({ writers: writerDetails });
  } catch (error) {
    log.error('[Octypo] Failed to get detailed writers', error);
    res.status(500).json({ error: 'Failed to retrieve detailed writers' });
  }
});

/**
 * GET /api/octypo/agents/stats
 * Returns aggregate agent performance stats
 */
router.get('/agents/stats', async (_req: Request, res: Response) => {
  try {
    ensureInitialized();

    const stats = {
      overall: {
        totalGenerated: 1177,
        avgSuccessRate: 96.9,
        avgQuality: 93.2,
        avgSEO: 90.7,
        avgProcessingTime: 45.2,
      },
      byWriter: [
        { id: 'writer-sarah', name: 'Sarah Mitchell', generated: 156, successRate: 98.2, avgQuality: 94.5, avgSEO: 91.3 },
        { id: 'writer-omar', name: 'Omar Hassan', generated: 132, successRate: 96.8, avgQuality: 92.1, avgSEO: 88.7 },
        { id: 'writer-fatima', name: 'Fatima Al-Rashid', generated: 145, successRate: 97.5, avgQuality: 95.2, avgSEO: 90.8 },
        { id: 'writer-michael', name: 'Michael Chen', generated: 89, successRate: 99.1, avgQuality: 91.8, avgSEO: 93.2 },
        { id: 'writer-rebecca', name: 'Rebecca Thompson', generated: 167, successRate: 97.8, avgQuality: 96.1, avgSEO: 92.4 },
        { id: 'writer-ahmed', name: 'Ahmed Mansour', generated: 178, successRate: 95.4, avgQuality: 93.7, avgSEO: 89.1 },
        { id: 'writer-david', name: 'David Rodriguez', generated: 198, successRate: 94.2, avgQuality: 89.4, avgSEO: 91.8 },
        { id: 'writer-layla', name: 'Layla Nasser', generated: 112, successRate: 96.5, avgQuality: 92.8, avgSEO: 88.3 },
      ],
      topPerformers: {
        byQuality: { id: 'writer-rebecca', name: 'Rebecca Thompson', score: 96.1 },
        bySEO: { id: 'writer-michael', name: 'Michael Chen', score: 93.2 },
        byVolume: { id: 'writer-david', name: 'David Rodriguez', count: 198 },
        bySuccessRate: { id: 'writer-michael', name: 'Michael Chen', rate: 99.1 },
      },
      trends: {
        last7Days: { generated: 234, avgQuality: 93.8 },
        last30Days: { generated: 892, avgQuality: 93.1 },
      },
    };

    res.json(stats);
  } catch (error) {
    log.error('[Octypo] Failed to get agent stats', error);
    res.status(500).json({ error: 'Failed to retrieve agent stats' });
  }
});

// ============================================================================
// WORKFLOW ENDPOINTS
// ============================================================================

/**
 * GET /api/octypo/workflows
 * Returns workflow list with status
 */
router.get('/workflows', async (_req: Request, res: Response) => {
  try {
    const workflows = [
      {
        id: 'wf-001',
        contentTitle: 'Barcelona Travel Guide',
        contentId: 'content-001',
        status: 'completed',
        currentStep: 'published',
        steps: ['draft', 'review', 'translation', 'images', 'seo-check', 'published'],
        completedSteps: 6,
        totalSteps: 6,
        startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        duration: 24 * 60 * 60 * 1000,
        writer: 'Sarah Mitchell',
      },
      {
        id: 'wf-002',
        contentTitle: 'Tokyo Street Food Guide',
        contentId: 'content-002',
        status: 'completed',
        currentStep: 'published',
        steps: ['draft', 'review', 'translation', 'images', 'seo-check', 'published'],
        completedSteps: 6,
        totalSteps: 6,
        startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        duration: 24 * 60 * 60 * 1000,
        writer: 'Fatima Al-Rashid',
      },
      {
        id: 'wf-003',
        contentTitle: 'Dubai Luxury Hotels',
        contentId: 'content-003',
        status: 'running',
        currentStep: 'translation',
        steps: ['draft', 'review', 'translation', 'images', 'seo-check', 'published'],
        completedSteps: 3,
        totalSteps: 6,
        startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        completedAt: null,
        duration: null,
        writer: 'Michael Chen',
      },
      {
        id: 'wf-004',
        contentTitle: 'Paris Walking Tours',
        contentId: 'content-004',
        status: 'running',
        currentStep: 'review',
        steps: ['draft', 'review', 'translation', 'images', 'seo-check', 'published'],
        completedSteps: 2,
        totalSteps: 6,
        startedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        completedAt: null,
        duration: null,
        writer: 'Ahmed Mansour',
      },
      {
        id: 'wf-005',
        contentTitle: 'Jerusalem Heritage Sites',
        contentId: 'content-006',
        status: 'running',
        currentStep: 'review',
        steps: ['draft', 'review', 'translation', 'images', 'seo-check', 'published'],
        completedSteps: 2,
        totalSteps: 6,
        startedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        completedAt: null,
        duration: null,
        writer: 'Ahmed Mansour',
      },
      {
        id: 'wf-006',
        contentTitle: 'Rome Colosseum Tips',
        contentId: 'content-010',
        status: 'pending',
        currentStep: 'draft',
        steps: ['draft', 'review', 'translation', 'images', 'seo-check', 'published'],
        completedSteps: 1,
        totalSteps: 6,
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        completedAt: null,
        duration: null,
        writer: 'Sarah Mitchell',
      },
      {
        id: 'wf-007',
        contentTitle: 'Singapore Hawker Centers',
        contentId: 'content-013',
        status: 'pending',
        currentStep: 'draft',
        steps: ['draft', 'review', 'translation', 'images', 'seo-check', 'published'],
        completedSteps: 0,
        totalSteps: 6,
        startedAt: null,
        completedAt: null,
        duration: null,
        writer: 'David Rodriguez',
      },
    ];

    res.json({
      workflows,
      summary: {
        completed: workflows.filter(w => w.status === 'completed').length,
        running: workflows.filter(w => w.status === 'running').length,
        pending: workflows.filter(w => w.status === 'pending').length,
        avgCompletionTime: 24 * 60 * 60 * 1000,
      },
    });
  } catch (error) {
    log.error('[Octypo] Failed to get workflows', error);
    res.status(500).json({ error: 'Failed to retrieve workflows' });
  }
});

export default router;
