/**
 * Media Intelligence v2 - Admin Routes
 *
 * Mount at: /api/admin/media-intelligence
 */

import { Router, Request, Response } from 'express';
import { isMediaIntelligenceEnabled, BatchScanRequest, RemediationActionRequest } from './types-v2';
import {
  registerAsset,
  getAsset,
  trackAssetUsage,
  updatePerformanceSignals,
  scoreAsset,
  batchScanAssets,
  createScanJob,
  getScanJobStatus,
  getWorstAssets,
  getOrphanedAssets,
  findDuplicates,
  getAssetsMissingAlt,
  getMediaStatsV2,
  getCacheStats,
  pruneCaches,
} from './asset-manager';
import { generateAltText, batchGenerateAltText, getAltGenerationStats } from './alt-generator';
import { executeRemediation, batchRemediate, getRemediationPlan } from './remediation';

const router = Router();

// Middleware to check if feature is enabled
function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isMediaIntelligenceEnabled()) {
    res.status(503).json({
      error: 'Media Intelligence is disabled',
      hint: 'Set ENABLE_MEDIA_INTELLIGENCE=true to enable',
    });
    return;
  }
  next();
}

router.use(requireEnabled);

/**
 * GET /stats
 * Get overall media intelligence stats
 */
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = getMediaStatsV2();
    const cacheStats = getCacheStats();
    res.json({ stats, cache: cacheStats });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /assets
 * Register or update a media asset
 */
router.post('/assets', (req: Request, res: Response) => {
  try {
    const { id, url, filename, ...metadata } = req.body;

    if (!id || !url || !filename) {
      res.status(400).json({ error: 'id, url, and filename are required' });
      return;
    }

    const asset = registerAsset(id, url, filename, metadata);
    res.json({ asset });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /assets/:id
 * Get asset details
 */
router.get('/assets/:id', (req: Request, res: Response) => {
  try {
    const asset = getAsset(req.params.id);
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    res.json({ asset });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /assets/:id/usage
 * Track content reference to asset
 */
router.post('/assets/:id/usage', (req: Request, res: Response) => {
  try {
    const { contentId, field, locale, blockType, position } = req.body;

    if (!contentId || !field || !locale) {
      res.status(400).json({ error: 'contentId, field, and locale are required' });
      return;
    }

    trackAssetUsage(req.params.id, contentId, field, locale, blockType, position);
    const asset = getAsset(req.params.id);
    res.json({ asset });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /assets/:id/performance
 * Update performance signals
 */
router.post('/assets/:id/performance', (req: Request, res: Response) => {
  try {
    const { impressions, clicks } = req.body;

    if (impressions === undefined || clicks === undefined) {
      res.status(400).json({ error: 'impressions and clicks are required' });
      return;
    }

    updatePerformanceSignals(req.params.id, impressions, clicks);
    const asset = getAsset(req.params.id);
    res.json({ asset });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /assets/:id/score
 * Get quality score for asset
 */
router.get('/assets/:id/score', (req: Request, res: Response) => {
  try {
    const forceRescore = req.query.force === 'true';
    const score = scoreAsset(req.params.id, forceRescore);

    if (!score) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    res.json({ score });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /scan
 * Batch scan assets
 */
router.post('/scan', (req: Request, res: Response) => {
  try {
    const request: BatchScanRequest = req.body;
    const result = batchScanAssets(request);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /scan/job
 * Create async scan job
 */
router.post('/scan/job', (req: Request, res: Response) => {
  try {
    const request: BatchScanRequest = req.body;
    const jobId = createScanJob(request);
    res.json({ jobId });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /scan/job/:jobId
 * Get scan job status
 */
router.get('/scan/job/:jobId', (req: Request, res: Response) => {
  try {
    const status = getScanJobStatus(req.params.jobId);
    if (!status) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ status });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /worst
 * Get worst scoring assets
 */
router.get('/worst', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const assets = getWorstAssets(limit);
    res.json({ assets, count: assets.length });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /orphans
 * Get orphaned assets
 */
router.get('/orphans', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const orphans = getOrphanedAssets(limit);
    res.json({ orphans, count: orphans.length });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /duplicates
 * Find potential duplicates
 */
router.get('/duplicates', (_req: Request, res: Response) => {
  try {
    const duplicates = findDuplicates();
    res.json({ duplicates, count: duplicates.length });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /missing-alt
 * Get assets missing alt text
 */
router.get('/missing-alt', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const assets = getAssetsMissingAlt(limit);
    res.json({ assets, count: assets.length });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /assets/:id/generate-alt
 * Generate alt text suggestions
 */
router.post('/assets/:id/generate-alt', async (req: Request, res: Response) => {
  try {
    const { useAI, tags, objects } = req.body;
    const result = await generateAltText(req.params.id, { useAI, tags, objects });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /generate-alt/batch
 * Batch generate alt text
 */
router.post('/generate-alt/batch', async (req: Request, res: Response) => {
  try {
    const { assetIds, useAI, concurrency } = req.body;

    if (!Array.isArray(assetIds)) {
      res.status(400).json({ error: 'assetIds array is required' });
      return;
    }

    const result = await batchGenerateAltText(assetIds, { useAI, concurrency });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /alt-stats
 * Get alt generation stats
 */
router.get('/alt-stats', (_req: Request, res: Response) => {
  try {
    const stats = getAltGenerationStats();
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /assets/:id/remediation-plan
 * Get remediation recommendations for asset
 */
router.get('/assets/:id/remediation-plan', (req: Request, res: Response) => {
  try {
    const plan = getRemediationPlan(req.params.id);
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /assets/:id/remediate
 * Execute remediation action
 */
router.post('/assets/:id/remediate', async (req: Request, res: Response) => {
  try {
    const request: RemediationActionRequest = {
      assetId: req.params.id,
      action: req.body.action,
      dryRun: req.body.dryRun !== false, // Default to dry-run
      confirmToken: req.body.confirmToken,
    };

    if (!request.action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    const result = await executeRemediation(request);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /remediate/batch
 * Batch remediation (dry-run only)
 */
router.post('/remediate/batch', async (req: Request, res: Response) => {
  try {
    const { assetIds, action } = req.body;

    if (!Array.isArray(assetIds) || !action) {
      res.status(400).json({ error: 'assetIds array and action are required' });
      return;
    }

    const result = await batchRemediate(assetIds, action);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /cache/prune
 * Prune expired cache entries
 */
router.post('/cache/prune', (_req: Request, res: Response) => {
  try {
    const result = pruneCaches();
    const stats = getCacheStats();
    res.json({ ...result, cache: stats });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export { router as mediaIntelligenceRoutesV2 };
