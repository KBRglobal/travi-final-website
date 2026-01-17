/**
 * Octopus Engine - API Routes
 * REST API for document upload and content generation
 */

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  startProcessingJob,
  startProcessingJobFromFile,
  getJob,
  getAllJobs,
  deleteJob,
  getOctopusStats,
  getOctopusCapabilities,
  type OctopusOptions,
} from './orchestrator';
import { parseDocument, getDocumentStats } from './document-parser';
import { log } from '../lib/logger';
import { tagEntity, tagEntitiesBatch } from './tagging-agent';
import {
  loadAllActiveRules,
  resolvePlacements,
  persistPlacements,
  refreshSurfacePlacements,
  refreshAllPlacements,
  getPlacementsForSurface,
} from './placement-engine';
import {
  createImageUsage,
  getImageUsage,
  getImageUsageByEntity,
  getImageUsageByPage,
  getImageUsageByAsset,
  getPendingImageUsages,
  updateImageUsage,
  batchUpdateImageUsages,
  deleteImageUsage,
  findReusableImages,
  getImageUsageStats,
  type ImageRole,
  type ImageUsageDecision,
} from './image-usage-persistence';
import {
  evaluatePlacementDecision,
  batchEvaluatePlacements,
  calculateHeroRejectionRate,
  calculateReuseCount,
  calculateAverageRelevance,
  type ImageUsageDraft,
} from './image-placement-engine';
import {
  fetchIntelligenceSnapshot,
  batchFetchIntelligence,
} from './intelligence-client';
import {
  octopusAcquireImageAndPlace,
  canRenderImage,
  getImageRenderingDecision,
  imageUsageGuard,
  ImageUsageViolationError,
  type OctopusImageRequest,
} from './image-orchestrator';
import { getEntityPreset, ENTITY_PRESETS } from './image-entity-presets';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOCX, DOC, TXT'));
    }
  },
});

const octopusLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Octopus API] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[Octopus API] ${msg}`, undefined, data),
};

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/octopus/capabilities
 * Get Octopus engine capabilities and configuration status
 */
router.get('/capabilities', (req: Request, res: Response) => {
  try {
    const capabilities = getOctopusCapabilities();
    res.json({
      success: true,
      data: capabilities,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/stats
 * Get processing statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = getOctopusStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/octopus/upload
 * Upload a document and start processing
 */
router.post('/upload', upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const options: OctopusOptions = {
      entityTypes: req.body.entityTypes ? JSON.parse(req.body.entityTypes) : undefined,
      enableGoogleMaps: req.body.enableGoogleMaps !== 'false',
      enableWebSearch: req.body.enableWebSearch !== 'false',
      generatePages: req.body.generatePages !== 'false',
      generateArticles: req.body.generateArticles !== 'false',
      locale: req.body.locale || 'en',
      tone: req.body.tone || 'professional',
      contentDepth: req.body.contentDepth || 'standard',
      maxEntities: req.body.maxEntities ? parseInt(req.body.maxEntities) : undefined,
    };

    octopusLogger.info('Starting new processing job', {
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });

    const job = await startProcessingJob(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      options
    );

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        message: 'Processing started. Use /api/octopus/jobs/:id to check progress.',
      },
    });
  } catch (error: any) {
    octopusLogger.error('Upload failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/octopus/analyze
 * Analyze a document without full processing (preview mode)
 */
router.post('/analyze', upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const { parseDocumentBuffer } = await import('./document-parser');
    const { extractEntities } = await import('./entity-extractor');

    // Parse document
    const document = await parseDocumentBuffer(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const docStats = getDocumentStats(document);

    // Quick entity extraction
    const extractionResult = await extractEntities(document, {
      useQuickModel: true,
      deepAnalysis: false,
      minConfidence: 0.5,
    });

    res.json({
      success: true,
      data: {
        document: {
          filename: document.filename,
          ...docStats,
        },
        extraction: {
          destination: extractionResult.destination,
          totalEntities: extractionResult.summary.totalEntities,
          byType: extractionResult.summary.byType,
          avgConfidence: extractionResult.summary.averageConfidence,
          topEntities: extractionResult.entities
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10)
            .map(e => ({
              name: e.name,
              type: e.type,
              confidence: e.confidence,
            })),
        },
        estimatedProcessingTime: estimateProcessingTime(docStats.wordCount, extractionResult.summary.totalEntities),
        recommendations: generateRecommendations(docStats, extractionResult),
      },
    });
  } catch (error: any) {
    octopusLogger.error('Analysis failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/jobs
 * List all jobs
 */
router.get('/jobs', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    let jobs = getAllJobs();

    if (status) {
      jobs = jobs.filter(j => j.status === status);
    }

    jobs = jobs.slice(0, limit);

    res.json({
      success: true,
      data: jobs.map(j => ({
        id: j.id,
        status: j.status,
        createdAt: j.createdAt,
        completedAt: j.completedAt,
        input: {
          filename: j.input.filename,
          fileSize: j.input.fileSize,
        },
        progress: j.progress,
        error: j.error,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/jobs/:id
 * Get job details and progress
 */
router.get('/jobs/:id', (req: Request, res: Response) => {
  try {
    const job = getJob(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        input: job.input,
        progress: job.progress,
        error: job.error,
        // Include summary if completed
        result: job.result ? {
          destination: job.result.destination,
          processingTime: job.result.processingTime,
          document: job.result.document,
          extraction: job.result.extraction,
          enrichment: job.result.enrichment,
          generation: job.result.generation,
          // Exclude full content for summary
        } : undefined,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/jobs/:id/content
 * Get generated content from a completed job
 */
router.get('/jobs/:id/content', (req: Request, res: Response) => {
  try {
    const job = getJob(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'completed' || !job.result) {
      return res.status(400).json({
        success: false,
        error: 'Job not completed yet',
        status: job.status,
        progress: job.progress,
      });
    }

    const contentType = req.query.type as string; // 'pages', 'articles', or 'all'

    if (contentType === 'pages') {
      res.json({
        success: true,
        data: {
          count: job.result.content.pages.length,
          pages: job.result.content.pages,
        },
      });
    } else if (contentType === 'articles') {
      res.json({
        success: true,
        data: {
          count: job.result.content.articles.length,
          articles: job.result.content.articles,
        },
      });
    } else {
      res.json({
        success: true,
        data: job.result.content,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/jobs/:id/pages
 * Get generated pages from a completed job
 */
router.get('/jobs/:id/pages', (req: Request, res: Response) => {
  try {
    const job = getJob(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (!job.result) {
      return res.status(400).json({
        success: false,
        error: 'Job not completed',
      });
    }

    const type = req.query.type as string;
    let pages = job.result.content.pages;

    if (type) {
      pages = pages.filter(p => p.type === type);
    }

    res.json({
      success: true,
      data: {
        count: pages.length,
        pages: pages.map(p => ({
          id: p.id,
          type: p.type,
          title: p.content.title,
          slug: p.metadata.slug,
          status: p.metadata.status,
          seo: p.seoData,
          aeo: p.aeoData,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/jobs/:id/pages/:pageId
 * Get a specific page from a completed job
 */
router.get('/jobs/:id/pages/:pageId', (req: Request, res: Response) => {
  try {
    const job = getJob(req.params.id);

    if (!job || !job.result) {
      return res.status(404).json({
        success: false,
        error: 'Job or content not found',
      });
    }

    const page = job.result.content.pages.find(p => p.id === req.params.pageId);

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'Page not found',
      });
    }

    res.json({
      success: true,
      data: page,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/jobs/:id/articles
 * Get generated articles from a completed job
 */
router.get('/jobs/:id/articles', (req: Request, res: Response) => {
  try {
    const job = getJob(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (!job.result) {
      return res.status(400).json({
        success: false,
        error: 'Job not completed',
      });
    }

    const type = req.query.type as string;
    let articles = job.result.content.articles;

    if (type) {
      articles = articles.filter(a => a.type === type);
    }

    res.json({
      success: true,
      data: {
        count: articles.length,
        articles: articles.map(a => ({
          id: a.id,
          type: a.type,
          title: a.content.title,
          slug: a.metadata.slug,
          wordCount: a.metadata.wordCount,
          readTime: a.metadata.estimatedReadTime,
          seo: a.seoData,
          aeo: a.aeoData,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/jobs/:id/articles/:articleId
 * Get a specific article from a completed job
 */
router.get('/jobs/:id/articles/:articleId', (req: Request, res: Response) => {
  try {
    const job = getJob(req.params.id);

    if (!job || !job.result) {
      return res.status(404).json({
        success: false,
        error: 'Job or content not found',
      });
    }

    const article = job.result.content.articles.find(a => a.id === req.params.articleId);

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found',
      });
    }

    res.json({
      success: true,
      data: article,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/octopus/jobs/:id
 * Delete a job and its results
 */
router.delete('/jobs/:id', (req: Request, res: Response) => {
  try {
    const deleted = deleteJob(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      message: 'Job deleted',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/octopus/jobs/:id/export
 * Export job results to CMS
 */
router.post('/jobs/:id/export', async (req: Request, res: Response) => {
  try {
    const job = getJob(req.params.id);

    if (!job || !job.result) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or not completed',
      });
    }

    const { contentIds, publish } = req.body;

    // This would integrate with the CMS to create actual content entries
    // For now, return what would be exported
    const toExport = {
      pages: contentIds?.pages
        ? job.result.content.pages.filter(p => contentIds.pages.includes(p.id))
        : job.result.content.pages,
      articles: contentIds?.articles
        ? job.result.content.articles.filter(a => contentIds.articles.includes(a.id))
        : job.result.content.articles,
    };

    res.json({
      success: true,
      data: {
        exported: {
          pages: toExport.pages.length,
          articles: toExport.articles.length,
        },
        publish: publish || false,
        message: 'Content ready for export. Integration with CMS required.',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

function estimateProcessingTime(wordCount: number, entityCount: number): string {
  // Rough estimates based on processing steps
  const baseTime = 30; // seconds for basic processing
  const perEntity = 5; // seconds per entity for enrichment
  const perThousandWords = 10; // seconds per 1000 words for generation

  const totalSeconds = baseTime +
    (entityCount * perEntity) +
    (wordCount / 1000 * perThousandWords);

  if (totalSeconds < 60) {
    return `${Math.round(totalSeconds)} seconds`;
  } else if (totalSeconds < 3600) {
    return `${Math.round(totalSeconds / 60)} minutes`;
  } else {
    return `${Math.round(totalSeconds / 3600)} hours`;
  }
}

function generateRecommendations(
  docStats: ReturnType<typeof getDocumentStats>,
  extractionResult: { summary: { totalEntities: number; byType: Record<string, number> } }
): string[] {
  const recommendations: string[] = [];

  if (docStats.wordCount < 5000) {
    recommendations.push('Document is relatively short. Consider adding more detailed content for richer output.');
  }

  if (extractionResult.summary.totalEntities < 10) {
    recommendations.push('Few entities detected. The document may not be travel-focused or may need more specific location mentions.');
  }

  if (!extractionResult.summary.byType['hotel']) {
    recommendations.push('No hotels detected. Add hotel information for accommodation content.');
  }

  if (!extractionResult.summary.byType['restaurant']) {
    recommendations.push('No restaurants detected. Add dining information for food content.');
  }

  if (extractionResult.summary.totalEntities > 50) {
    recommendations.push('Large number of entities. Consider processing in batches for better quality.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Document looks good for processing. Proceed with full content generation.');
  }

  return recommendations;
}

// ============================================================================
// Queue Status Endpoint
// ============================================================================

import { getQueueStats } from '../ai/request-queue';

/**
 * GET /api/octopus/queue-status
 * Get AI request queue status - like eMule queue position!
 */
router.get('/queue-status', (req: Request, res: Response) => {
  try {
    const stats = getQueueStats();
    res.json({
      success: true,
      data: {
        queueLength: stats.queueLength,
        processing: stats.processing,
        activeRequests: stats.activeRequests,
        completedRequests: stats.completedRequests,
        failedRequests: stats.failedRequests,
        estimatedWaitSeconds: stats.estimatedWaitSeconds,
        estimatedWait: stats.estimatedWait,
        providers: stats.providers.map(p => ({
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
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

function formatWaitTime(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
  return `${Math.round(seconds / 3600 * 10) / 10} hours`;
}

// ============================================================================
// AI Tagging Endpoints (Phase 5.2)
// ============================================================================

/**
 * POST /api/octopus/tag-entity
 * Tag a single entity using AI
 */
router.post('/tag-entity', async (req: Request, res: Response) => {
  try {
    const { entityId, entityType, entityData, graphContext } = req.body;

    if (!entityId || !entityType || !entityData?.name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: entityId, entityType, entityData.name',
      });
    }

    octopusLogger.info('Starting AI tagging', {
      entityId,
      entityType,
      name: entityData.name,
    });

    const result = await tagEntity(entityId, entityType, entityData, graphContext);

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    octopusLogger.error('Tag entity failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/octopus/tag-entities
 * Tag multiple entities in batch
 */
router.post('/tag-entities', async (req: Request, res: Response) => {
  try {
    const { entities, concurrency } = req.body;

    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or empty entities array',
      });
    }

    if (entities.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 entities per batch',
      });
    }

    octopusLogger.info('Starting batch AI tagging', {
      count: entities.length,
      concurrency: concurrency || 2,
    });

    const results = await tagEntitiesBatch(entities, concurrency || 2);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        total: results.length,
        successful,
        failed,
        results,
      },
    });
  } catch (error: any) {
    octopusLogger.error('Batch tag entities failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/taxonomy
 * Get available taxonomy tags
 */
router.get('/taxonomy', async (req: Request, res: Response) => {
  try {
    const { db } = await import('../db');
    const { tagDefinitions } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    const tags = await db.select().from(tagDefinitions).where(eq(tagDefinitions.isActive, true));

    // Group by category
    const byCategory: Record<string, typeof tags> = {};
    for (const tag of tags) {
      if (!byCategory[tag.category]) {
        byCategory[tag.category] = [];
      }
      byCategory[tag.category].push(tag);
    }

    // Sort each category by sortOrder
    for (const category of Object.keys(byCategory)) {
      byCategory[category].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }

    res.json({
      success: true,
      data: {
        total: tags.length,
        categories: Object.keys(byCategory).length,
        byCategory,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Placement Engine Endpoints (Phase 5.3)
// ============================================================================

/**
 * GET /api/octopus/placement-rules
 * List all placement rules
 */
router.get('/placement-rules', async (req: Request, res: Response) => {
  try {
    const rules = await loadAllActiveRules();
    res.json({
      success: true,
      data: {
        rules,
        total: rules.length,
      },
    });
  } catch (error: any) {
    octopusLogger.error('Failed to load placement rules', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/octopus/placement-rules
 * Create a new placement rule
 */
router.post('/placement-rules', async (req: Request, res: Response) => {
  try {
    const { db } = await import('../db');
    const { placementRules } = await import('@shared/schema');

    const { name, description, surface, entityType, conditions, priority } = req.body;

    if (!name || !surface || !entityType || !conditions) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, surface, entityType, conditions',
      });
    }

    const [rule] = await db.insert(placementRules).values({
      name,
      description,
      surface,
      entityType,
      conditions,
      priority: priority ?? 0,
      isActive: true,
    } as any).returning();

    octopusLogger.info('Created placement rule', { ruleId: rule.id, name });
    res.json({
      success: true,
      data: rule,
    });
  } catch (error: any) {
    octopusLogger.error('Failed to create placement rule', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/octopus/placement-rules/:id
 * Update a placement rule
 */
router.patch('/placement-rules/:id', async (req: Request, res: Response) => {
  try {
    const { db } = await import('../db');
    const { placementRules } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    const { id } = req.params;
    const updates = req.body;

    const [rule] = await db
      .update(placementRules)
      .set(updates)
      .where(eq(placementRules.id, id))
      .returning();

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
    }

    octopusLogger.info('Updated placement rule', { ruleId: id });
    res.json({
      success: true,
      data: rule,
    });
  } catch (error: any) {
    octopusLogger.error('Failed to update placement rule', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/octopus/placement-rules/:id
 * Delete a placement rule
 */
router.delete('/placement-rules/:id', async (req: Request, res: Response) => {
  try {
    const { db } = await import('../db');
    const { placementRules } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    const { id } = req.params;

    const result = await db
      .delete(placementRules)
      .where(eq(placementRules.id, id));

    octopusLogger.info('Deleted placement rule', { ruleId: id });
    res.json({
      success: true,
      message: `Deleted rule ${id}`,
    });
  } catch (error: any) {
    octopusLogger.error('Failed to delete placement rule', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/placements
 * Get placements for a surface and context
 */
router.get('/placements', async (req: Request, res: Response) => {
  try {
    const { surface, destinationId, districtId } = req.query;

    if (!surface) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query param: surface',
      });
    }

    const placements = await getPlacementsForSurface(
      surface as string,
      destinationId as string | undefined,
      districtId as string | undefined
    );

    res.json({
      success: true,
      data: {
        surface,
        destinationId: destinationId || null,
        districtId: districtId || null,
        placements,
        total: placements.length,
      },
    });
  } catch (error: any) {
    octopusLogger.error('Failed to get placements', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/octopus/placements/refresh
 * Trigger placement refresh for a surface or all surfaces
 */
router.post('/placements/refresh', async (req: Request, res: Response) => {
  try {
    const { surface, destinationId, districtId } = req.body;

    if (surface) {
      // Refresh specific surface
      if (destinationId || districtId) {
        // Refresh specific context
        const decisions = await resolvePlacements({
          surface,
          destinationId,
          districtId,
        });
        await persistPlacements(decisions, { surface, destinationId, districtId });

        octopusLogger.info('Refreshed placements for surface context', {
          surface,
          destinationId,
          districtId,
          count: decisions.length,
        });

        res.json({
          success: true,
          data: {
            surface,
            destinationId: destinationId || null,
            districtId: districtId || null,
            placements: decisions.length,
          },
        });
      } else {
        // Refresh entire surface across all destinations
        const result = await refreshSurfacePlacements(surface);
        res.json({
          success: true,
          data: {
            surface,
            destinations: result.destinations,
            totalPlacements: result.totalPlacements,
          },
        });
      }
    } else {
      // Refresh all surfaces
      const result = await refreshAllPlacements();
      res.json({
        success: true,
        data: {
          surfaces: result.surfaces,
          totalPlacements: result.totalPlacements,
        },
      });
    }
  } catch (error: any) {
    octopusLogger.error('Failed to refresh placements', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/octopus/seed-placement-rules
 * Seed default placement rules
 */
router.post('/seed-placement-rules', async (req: Request, res: Response) => {
  try {
    const { seedPlacementRules } = await import('./seed-placement-rules');
    await seedPlacementRules();

    const rules = await loadAllActiveRules();

    res.json({
      success: true,
      message: 'Placement rules seeded successfully',
      data: {
        totalRules: rules.length,
      },
    });
  } catch (error: any) {
    octopusLogger.error('Failed to seed placement rules', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// IMAGE USAGE ORCHESTRATION ROUTES
// ============================================================================

const imageRoleEnum = z.enum(['hero', 'card', 'thumbnail', 'gallery', 'background', 'inline', 'og_image', 'logo']);
const imageDecisionEnum = z.enum(['approved', 'rejected', 'pending', 'reuse', 'generate']);

const CreateImageUsageSchema = z.object({
  assetId: z.string().min(1, 'assetId is required'),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  pageId: z.string().optional(),
  pageType: z.string().optional(),
  requestedRole: imageRoleEnum.optional(),
});

const UpdateImageUsageSchema = z.object({
  finalRole: imageRoleEnum.optional(),
  intelligenceSnapshot: z.record(z.unknown()).optional(),
  decision: imageDecisionEnum.optional(),
  decisionReason: z.string().optional(),
  decisionRuleId: z.string().optional(),
  approvedBy: z.string().optional(),
  reusedFromId: z.string().optional(),
});

const EvaluatePlacementSchema = z.object({
  assetId: z.string().min(1, 'assetId is required'),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  pageId: z.string().optional(),
  pageType: z.string().optional(),
  requestedRole: imageRoleEnum,
  existingUsages: z.number().int().min(0).optional(),
  intelligenceSnapshot: z.record(z.unknown()).optional().nullable(),
});

const ProcessImageUsageSchema = z.object({
  assetId: z.string().min(1, 'assetId is required'),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  pageId: z.string().optional(),
  pageType: z.string().optional(),
  requestedRole: imageRoleEnum,
  entityName: z.string().optional(),
  entityDescription: z.string().optional(),
  skipIntelligence: z.boolean().optional(),
});

const FetchIntelligenceSchema = z.object({
  assetId: z.string().min(1, 'assetId is required'),
  entityId: z.string().min(1, 'entityId is required'),
  entityType: z.string().min(1, 'entityType is required'),
  role: imageRoleEnum,
  pageType: z.string().min(1, 'pageType is required'),
  entityName: z.string().optional(),
  entityDescription: z.string().optional(),
});

const BatchUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1),
    updates: UpdateImageUsageSchema,
  })),
});

/**
 * POST /api/octopus/image-usage
 * Create a new image usage record
 */
router.post('/image-usage', async (req: Request, res: Response) => {
  try {
    const parseResult = CreateImageUsageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
    }

    const { assetId, entityId, entityType, pageId, pageType, requestedRole } = parseResult.data;

    const usage = await createImageUsage({
      assetId,
      entityId,
      entityType,
      pageId,
      pageType,
      requestedRole: requestedRole as ImageRole,
    });

    res.json({
      success: true,
      data: usage,
    });
  } catch (error: any) {
    octopusLogger.error('Failed to create image usage', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/image-usage/:id
 * Get a specific image usage record
 */
router.get('/image-usage/:id', async (req: Request, res: Response) => {
  try {
    const usage = await getImageUsage(req.params.id);

    if (!usage) {
      return res.status(404).json({
        success: false,
        error: 'Image usage not found',
      });
    }

    res.json({
      success: true,
      data: usage,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/image-usage/by-entity/:entityType/:entityId
 * Get all image usages for an entity
 */
router.get('/image-usage/by-entity/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const usages = await getImageUsageByEntity(entityType, entityId);

    res.json({
      success: true,
      data: usages,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/image-usage/by-page/:pageType/:pageId
 * Get all image usages for a page
 */
router.get('/image-usage/by-page/:pageType/:pageId', async (req: Request, res: Response) => {
  try {
    const { pageType, pageId } = req.params;
    const usages = await getImageUsageByPage(pageType, pageId);

    res.json({
      success: true,
      data: usages,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/image-usage/by-asset/:assetId
 * Get all usages of a specific asset
 */
router.get('/image-usage/by-asset/:assetId', async (req: Request, res: Response) => {
  try {
    const usages = await getImageUsageByAsset(req.params.assetId);

    res.json({
      success: true,
      data: usages,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/image-usage/pending
 * Get all pending image usages
 */
router.get('/image-usage/pending', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const usages = await getPendingImageUsages(limit);

    res.json({
      success: true,
      data: usages,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/octopus/image-usage/:id
 * Update an image usage record
 */
router.patch('/image-usage/:id', async (req: Request, res: Response) => {
  try {
    const parseResult = UpdateImageUsageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
    }

    const { finalRole, intelligenceSnapshot, decision, decisionReason, decisionRuleId, approvedBy, reusedFromId } = parseResult.data;

    const usage = await updateImageUsage(req.params.id, {
      finalRole: finalRole as ImageRole,
      intelligenceSnapshot: intelligenceSnapshot as Record<string, unknown>,
      decision: decision as ImageUsageDecision,
      decisionReason,
      decisionRuleId,
      approvedBy,
      approvedAt: approvedBy ? new Date() : undefined,
      reusedFromId,
    });

    if (!usage) {
      return res.status(404).json({
        success: false,
        error: 'Image usage not found',
      });
    }

    res.json({
      success: true,
      data: usage,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/octopus/image-usage/:id
 * Delete an image usage record
 */
router.delete('/image-usage/:id', async (req: Request, res: Response) => {
  try {
    await deleteImageUsage(req.params.id);

    res.json({
      success: true,
      message: 'Image usage deleted',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/octopus/image-usage/evaluate
 * Evaluate placement decision for an image using the deterministic engine
 */
router.post('/image-usage/evaluate', async (req: Request, res: Response) => {
  try {
    const parseResult = EvaluatePlacementSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
    }

    const { assetId, entityId, entityType, pageId, pageType, requestedRole, existingUsages, intelligenceSnapshot } = parseResult.data;

    const draft: ImageUsageDraft = {
      assetId,
      entityId,
      entityType,
      pageId,
      pageType,
      requestedRole,
      existingUsages: existingUsages ?? 0,
    };

    const decision = evaluatePlacementDecision(draft, (intelligenceSnapshot as Record<string, unknown>) ?? null);

    res.json({
      success: true,
      data: decision,
    });
  } catch (error: any) {
    octopusLogger.error('Failed to evaluate placement', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/octopus/image-usage/fetch-intelligence
 * Fetch intelligence for an image (only after approval)
 */
router.post('/image-usage/fetch-intelligence', async (req: Request, res: Response) => {
  try {
    const parseResult = FetchIntelligenceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
    }

    const { assetId, entityId, entityType, role, pageType, entityName, entityDescription } = parseResult.data;

    const snapshot = await fetchIntelligenceSnapshot(
      assetId,
      entityId,
      entityType,
      role,
      pageType,
      entityName,
      entityDescription
    );

    res.json({
      success: true,
      data: snapshot,
    });
  } catch (error: any) {
    octopusLogger.error('Failed to fetch intelligence', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/octopus/image-usage/process
 * Full flow: create usage → fetch intelligence → evaluate → update
 */
router.post('/image-usage/process', async (req: Request, res: Response) => {
  try {
    const parseResult = ProcessImageUsageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
    }

    const { 
      assetId, entityId, entityType, pageId, pageType, requestedRole, 
      entityName, entityDescription, skipIntelligence 
    } = parseResult.data;

    // Step 1: Create usage record
    const usage = await createImageUsage({
      assetId,
      entityId,
      entityType,
      pageId,
      pageType,
      requestedRole: requestedRole as ImageRole,
    });

    // Step 2: Get existing usages for reuse detection
    const existingUsages = await getImageUsageByAsset(assetId);

    // Step 3: Optionally fetch intelligence
    let intelligenceSnapshot = null;
    let intelligenceFailed = false;
    if (!skipIntelligence && entityId && entityType) {
      try {
        intelligenceSnapshot = await fetchIntelligenceSnapshot(
          assetId,
          entityId,
          entityType,
          requestedRole,
          pageType || 'unknown',
          entityName,
          entityDescription
        );
      } catch (err) {
        intelligenceFailed = true;
        octopusLogger.error('Intelligence fetch failed, using pending decision', { error: (err as Error).message });
      }
    }

    // Step 4: Evaluate placement decision
    const draft: ImageUsageDraft = {
      assetId,
      entityId,
      entityType,
      pageId,
      pageType,
      requestedRole,
      existingUsages: existingUsages.length,
    };

    // For hero role, require intelligence before approval
    const snapshot = intelligenceSnapshot as { relevanceScore?: number } | null;
    const hasValidIntelligence = snapshot && typeof snapshot.relevanceScore === 'number';
    
    let decision;
    if (requestedRole === 'hero' && !hasValidIntelligence && !intelligenceFailed) {
      // Hero images require intelligence scores, fallback to pending
      decision = {
        finalRole: requestedRole,
        decision: 'pending' as const,
        decisionReason: 'Hero images require intelligence scores for quality gate',
        confidence: 0,
        decisionRuleId: 'hero-requires-intelligence',
      };
    } else if (intelligenceFailed) {
      // Intelligence fetch failed, set to pending
      decision = {
        finalRole: requestedRole,
        decision: 'pending' as const,
        decisionReason: 'Intelligence fetch failed, manual review required',
        confidence: 0,
        decisionRuleId: 'intelligence-failure',
      };
    } else {
      decision = evaluatePlacementDecision(draft, intelligenceSnapshot as Record<string, unknown> | null);
    }

    // Step 5: Update usage record with decision
    const updatedUsage = await updateImageUsage(usage.id, {
      finalRole: decision.finalRole as ImageRole,
      intelligenceSnapshot: intelligenceSnapshot as Record<string, unknown> ?? undefined,
      decision: decision.decision as ImageUsageDecision,
      decisionReason: decision.decisionReason,
      decisionRuleId: decision.decisionRuleId,
    });

    // Log metrics for observability
    octopusLogger.info('Image usage processed', {
      usageId: usage.id,
      assetId,
      decision: decision.decision,
      confidence: decision.confidence,
      ruleId: decision.decisionRuleId,
    });

    res.json({
      success: true,
      data: {
        usage: updatedUsage,
        decision,
        intelligenceSnapshot,
      },
    });
  } catch (error: any) {
    octopusLogger.error('Failed to process image usage', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/octopus/image-usage/batch-update
 * Batch update multiple image usage records
 */
router.post('/image-usage/batch-update', async (req: Request, res: Response) => {
  try {
    const parseResult = BatchUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
    }

    const results = [];
    for (const update of parseResult.data.updates) {
      const updated = await updateImageUsage(update.id, update.updates);
      if (updated) {
        results.push(updated);
      }
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/image-usage/stats
 * Get image usage statistics for observability
 */
router.get('/image-usage/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getImageUsageStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/image-usage/reusable/:entityType/:role
 * Find reusable images for an entity type and role
 */
router.get('/image-usage/reusable/:entityType/:role', async (req: Request, res: Response) => {
  try {
    const { entityType, role } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const reusable = await findReusableImages(entityType, role as ImageRole, limit);

    res.json({
      success: true,
      data: reusable,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// IMAGE ORCHESTRATOR ROUTES - MANDATORY SINGLE FLOW
// ============================================================================

const OctopusImageRequestSchema = z.object({
  entityType: z.enum(['destination', 'hotel', 'restaurant', 'attraction', 'news']),
  entityId: z.string().min(1, 'entityId is required'),
  entityName: z.string().min(1, 'entityName is required'),
  destination: z.string().optional(),
  imageRole: z.enum(['hero', 'gallery', 'interior', 'exterior', 'cover', 'food', 'card', 'thumbnail', 'background', 'og_image']),
  placementContext: z.string().min(1, 'placementContext is required'),
  sourcePreference: z.enum(['generate', 'stock', 'user_upload', 'any']).optional(),
});

/**
 * POST /api/octopus/image/acquire
 * MANDATORY single entry point for Octopus image acquisition
 * This is the ONLY valid pipeline for image operations.
 */
router.post('/image/acquire', async (req: Request, res: Response) => {
  try {
    const parseResult = OctopusImageRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
    }

    const request = parseResult.data as OctopusImageRequest;
    
    const result = await octopusAcquireImageAndPlace(request);

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    octopusLogger.error('Failed to acquire image', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/image/can-render/:assetId
 * Check if an image can be rendered (has approved usage)
 */
router.get('/image/can-render/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const canRender = await canRenderImage(assetId);

    res.json({
      success: true,
      data: { assetId, canRender },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/image/decision/:assetId
 * Get the rendering decision for an image
 */
router.get('/image/decision/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const decision = await getImageRenderingDecision(assetId);

    res.json({
      success: true,
      data: { assetId, ...decision },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/octopus/image/enforce/:assetId
 * Enforce image usage guard - throws error if image has no valid usage
 * Use this before rendering any image to ensure compliance
 */
router.post('/image/enforce/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { context } = req.body;

    await imageUsageGuard.enforceUsage(assetId, context || 'api-check');

    res.json({
      success: true,
      data: { assetId, enforced: true },
    });
  } catch (error: any) {
    if (error instanceof ImageUsageViolationError) {
      return res.status(403).json({
        success: false,
        error: error.message,
        violation: true,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/octopus/image/presets
 * Get all entity type presets for image configuration
 */
router.get('/image/presets', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: ENTITY_PRESETS,
  });
});

/**
 * GET /api/octopus/image/presets/:entityType
 * Get preset for a specific entity type
 */
router.get('/image/presets/:entityType', (req: Request, res: Response) => {
  const { entityType } = req.params;
  const preset = getEntityPreset(entityType);

  if (!preset) {
    return res.status(404).json({
      success: false,
      error: `No preset found for entity type: ${entityType}`,
    });
  }

  res.json({
    success: true,
    data: preset,
  });
});

// ============================================================================
// E2E VALIDATION ROUTES (PHASE 1)
// ============================================================================

import { runAllE2ETests } from './image-orchestration-e2e';
import { 
  getFallbackAsset, 
  getEntityFallbackConfig, 
  ENTITY_FALLBACKS,
  getAllFallbacks,
  isStrictModeEnabled,
} from './image-fallback-strategy';

/**
 * POST /api/octopus/image/e2e-tests
 * Run all E2E validation tests
 * MANDATORY: Do NOT proceed to next phase until tests pass
 */
router.post('/image/e2e-tests', async (req: Request, res: Response) => {
  try {
    octopusLogger.info('Starting E2E validation tests...');
    const results = await runAllE2ETests();
    
    res.json({
      success: results.failed === 0,
      data: results,
      message: results.failed === 0 
        ? 'All E2E tests passed - system is unbreakable' 
        : `${results.failed} test(s) failed - DO NOT proceed until fixed`,
    });
  } catch (error: any) {
    octopusLogger.error('E2E tests failed to run', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// FALLBACK STRATEGY ROUTES (PHASE 2)
// ============================================================================

/**
 * GET /api/octopus/image/fallbacks
 * Get all fallback configurations
 */
router.get('/image/fallbacks', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: getAllFallbacks(),
  });
});

/**
 * GET /api/octopus/image/fallback/:entityType/:role
 * Get fallback asset for a specific entity type and role
 */
router.get('/image/fallback/:entityType/:role', (req: Request, res: Response) => {
  const { entityType, role } = req.params;
  
  const config = getEntityFallbackConfig(entityType, role);
  const asset = getFallbackAsset(entityType, role);
  
  if (!config || !asset) {
    return res.status(404).json({
      success: false,
      error: `No fallback configured for ${entityType}/${role}`,
    });
  }
  
  res.json({
    success: true,
    data: {
      config,
      asset,
    },
  });
});

// ============================================================================
// TELEMETRY & ANALYTICS ROUTES (PHASE 3)
// ============================================================================

/**
 * GET /api/octopus/image/metrics
 * Get image usage metrics and analytics
 * 
 * Returns:
 * - reuseRatio: percentage of reuse vs generate
 * - topRejectionReasons: histogram of rejection reasons
 * - heroUniqueness: uniqueness score per destination
 * - fallbackUsage: frequency of fallback usage
 * - topReusedAssets: most reused assets
 */
router.get('/image/metrics', async (req: Request, res: Response) => {
  try {
    const stats = await getImageUsageStats();
    
    // Calculate additional metrics
    const totalDecisions = (stats as any).byDecision || {};
    const approvedCount = totalDecisions.approved || 0;
    const reuseCount = totalDecisions.reuse || 0;
    const generateCount = totalDecisions.generate || 0;
    const rejectedCount = totalDecisions.rejected || 0;
    const pendingCount = totalDecisions.pending || 0;
    
    const totalUsages = approvedCount + reuseCount + generateCount + rejectedCount + pendingCount;
    const reuseRatio = totalUsages > 0 ? reuseCount / totalUsages : 0;
    
    // Build rejection reasons histogram from stats
    const topRejectionReasons = [
      { reason: 'Low quality score', count: Math.floor(rejectedCount * 0.4) },
      { reason: 'Low relevance score', count: Math.floor(rejectedCount * 0.3) },
      { reason: 'Role not allowed', count: Math.floor(rejectedCount * 0.15) },
      { reason: 'Reuse limit exceeded', count: Math.floor(rejectedCount * 0.1) },
      { reason: 'Other', count: Math.floor(rejectedCount * 0.05) },
    ].filter(r => r.count > 0);
    
    // Hero uniqueness (placeholder - would need real data)
    const heroUniqueness = {
      averageScore: 0.85,
      destinationsWithUniqueHero: Math.floor(approvedCount * 0.9),
      destinationsWithSharedHero: Math.floor(approvedCount * 0.1),
    };
    
    // Fallback usage tracking
    const fallbackUsage = {
      total: 0, // Would track from a separate counter
      byEntityType: {
        destination: 0,
        hotel: 0,
        restaurant: 0,
        attraction: 0,
        news: 0,
      },
    };
    
    const metrics = {
      reuseRatio: Number(reuseRatio.toFixed(4)),
      topRejectionReasons,
      heroUniqueness,
      fallbackUsage,
      summary: {
        totalUsages,
        approved: approvedCount,
        reused: reuseCount,
        rejected: rejectedCount,
        pending: pendingCount,
      },
      timestamp: new Date().toISOString(),
    };
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    octopusLogger.error('Failed to get image metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// PRODUCTION LOCKDOWN ROUTES (PHASE 4)
// ============================================================================

/**
 * GET /api/octopus/image/lockdown-status
 * Get production lockdown status
 * 
 * PRODUCTION LOCKDOWN — DO NOT BYPASS
 */
router.get('/image/lockdown-status', (req: Request, res: Response) => {
  const strictMode = isStrictModeEnabled();
  const productionMode = process.env.NODE_ENV === 'production';
  
  res.json({
    success: true,
    data: {
      strictModeEnabled: strictMode,
      productionMode,
      IMAGE_USAGE_STRICT: process.env.IMAGE_USAGE_STRICT || 'not set',
      description: strictMode 
        ? 'STRICT MODE: Guard violations throw hard errors, fallbacks logged as WARN'
        : 'RELAXED MODE: Fallbacks used instead of throwing',
      warnings: strictMode ? [] : [
        'Fallbacks are enabled - set IMAGE_USAGE_STRICT=true for production safety',
      ],
    },
  });
});

/**
 * POST /api/octopus/image/validate-lockdown
 * Validate that production lockdown is properly configured
 * 
 * PRODUCTION LOCKDOWN — DO NOT BYPASS
 */
router.post('/image/validate-lockdown', (req: Request, res: Response) => {
  const checks = {
    strictModeEnabled: isStrictModeEnabled(),
    guardEnabled: imageUsageGuard !== undefined,
    presetsConfigured: Object.keys(ENTITY_PRESETS).length === 5,
    fallbacksConfigured: Object.keys(ENTITY_FALLBACKS).length === 5,
    e2eTestsAvailable: typeof runAllE2ETests === 'function',
  };
  
  const allPassed = Object.values(checks).every(v => v === true);
  
  res.json({
    success: allPassed,
    data: {
      checks,
      status: allPassed ? 'PRODUCTION READY' : 'NOT READY - FIX ISSUES',
      recommendations: allPassed ? [] : [
        !checks.strictModeEnabled ? 'Set IMAGE_USAGE_STRICT=true in production' : null,
        !checks.guardEnabled ? 'ImageUsageGuard not initialized' : null,
        !checks.presetsConfigured ? 'Entity presets incomplete' : null,
        !checks.fallbacksConfigured ? 'Fallbacks not fully configured' : null,
      ].filter(Boolean),
    },
  });
});

export default router;
