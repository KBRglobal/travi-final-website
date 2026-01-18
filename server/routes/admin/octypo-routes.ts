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

export default router;
