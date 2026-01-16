/**
 * Phase 6: Localization API Routes
 * 
 * Endpoints for translation jobs management and AEO generation.
 * All endpoints require admin authentication using platform security.
 */

import { Router } from 'express';
import { z } from 'zod';
import { log } from '../lib/logger';
import { requireAuth, requirePermission } from '../security';
import {
  enqueueTranslationJobs,
  getQueueStatus,
  getJobsForContent,
  getJobsByStatus,
  retryJob,
  cancelJob,
  startQueue,
  stopQueue,
  manualPause,
  resumeQueue,
} from './translation-queue';
import { generateFullAeo, calculateAeoScore } from './aeo-generator';
import { 
  triggerHooksManually, 
  batchProcessPublishedContent,
  onContentStatusChange,
} from './publish-hooks';

const router = Router();

// Apply platform's authentication middleware to all routes
router.use(requireAuth);

// Apply admin-level permission check (canManageSettings) to all routes
// This ensures consistent RBAC with the rest of the platform
router.use(requirePermission('canManageSettings'));

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[LocalizationAPI] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => 
    log.error(`[LocalizationAPI] ${msg}`, undefined, data),
};

// =============================================================================
// Queue Management
// =============================================================================

/**
 * GET /api/localization/queue/status
 * Get queue status including counts by status
 */
router.get('/queue/status', async (req, res) => {
  try {
    const status = await getQueueStatus();
    res.json(status);
  } catch (error) {
    logger.error('Failed to get queue status', { error: String(error) });
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

/**
 * POST /api/localization/queue/start
 * Start the translation queue worker
 */
router.post('/queue/start', async (req, res) => {
  try {
    startQueue();
    res.json({ success: true, message: 'Queue started' });
  } catch (error) {
    logger.error('Failed to start queue', { error: String(error) });
    res.status(500).json({ error: 'Failed to start queue' });
  }
});

/**
 * POST /api/localization/queue/stop
 * Stop the translation queue worker
 */
router.post('/queue/stop', async (req, res) => {
  try {
    stopQueue();
    res.json({ success: true, message: 'Queue stopped' });
  } catch (error) {
    logger.error('Failed to stop queue', { error: String(error) });
    res.status(500).json({ error: 'Failed to stop queue' });
  }
});

/**
 * POST /api/localization/queue/pause
 * Manually pause the translation queue (persists until explicitly resumed)
 */
router.post('/queue/pause', async (req, res) => {
  try {
    const { reason } = req.body || {};
    manualPause(reason || 'Admin manual pause');
    res.json({ success: true, message: 'Queue paused (will persist until resumed)' });
  } catch (error) {
    logger.error('Failed to pause queue', { error: String(error) });
    res.status(500).json({ error: 'Failed to pause queue' });
  }
});

/**
 * POST /api/localization/queue/resume
 * Resume the translation queue
 */
router.post('/queue/resume', async (req, res) => {
  try {
    resumeQueue();
    res.json({ success: true, message: 'Queue resumed' });
  } catch (error) {
    logger.error('Failed to resume queue', { error: String(error) });
    res.status(500).json({ error: 'Failed to resume queue' });
  }
});

// =============================================================================
// Translation Jobs
// =============================================================================

/**
 * GET /api/localization/jobs
 * Get translation jobs by status
 */
router.get('/jobs', async (req, res) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const limit = parseInt(req.query.limit as string) || 50;
    
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'needs_review'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const jobs = await getJobsByStatus(
      status as 'pending' | 'in_progress' | 'completed' | 'failed' | 'needs_review',
      limit
    );
    res.json({ jobs });
  } catch (error) {
    logger.error('Failed to get jobs', { error: String(error) });
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

/**
 * GET /api/localization/jobs/content/:contentId
 * Get translation jobs for a specific content
 */
router.get('/jobs/content/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const jobs = await getJobsForContent(contentId);
    res.json({ jobs });
  } catch (error) {
    logger.error('Failed to get jobs for content', { error: String(error) });
    res.status(500).json({ error: 'Failed to get jobs for content' });
  }
});

/**
 * POST /api/localization/jobs/enqueue/:contentId
 * Manually enqueue translation jobs for a content
 */
router.post('/jobs/enqueue/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { priority, fields } = req.body || {};
    
    const jobs = await enqueueTranslationJobs(
      contentId,
      'en',
      priority || 10,
      fields
    );
    
    res.json({ 
      success: true, 
      message: `Enqueued ${jobs.length} translation jobs`,
      jobCount: jobs.length,
    });
  } catch (error) {
    logger.error('Failed to enqueue jobs', { error: String(error) });
    res.status(500).json({ error: 'Failed to enqueue translation jobs' });
  }
});

/**
 * POST /api/localization/jobs/:jobId/retry
 * Retry a failed translation job
 */
router.post('/jobs/:jobId/retry', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await retryJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ success: true, job });
  } catch (error) {
    logger.error('Failed to retry job', { error: String(error) });
    res.status(500).json({ error: 'Failed to retry job' });
  }
});

/**
 * DELETE /api/localization/jobs/:jobId
 * Cancel a pending translation job
 */
router.delete('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const success = await cancelJob(jobId);
    
    if (!success) {
      return res.status(404).json({ error: 'Job not found or not pending' });
    }
    
    res.json({ success: true, message: 'Job cancelled' });
  } catch (error) {
    logger.error('Failed to cancel job', { error: String(error) });
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// =============================================================================
// AEO Generation
// =============================================================================

/**
 * POST /api/localization/aeo/generate/:contentId
 * Generate AEO content (answer capsule, FAQ, JSON-LD)
 */
router.post('/aeo/generate/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const result = await generateFullAeo(contentId);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Failed to generate AEO', { error: String(error) });
    res.status(500).json({ error: 'Failed to generate AEO content' });
  }
});

/**
 * GET /api/localization/aeo/score/:contentId
 * Get/recalculate AEO score for a content
 */
router.get('/aeo/score/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const score = await calculateAeoScore(contentId);
    res.json({ contentId, aeoScore: score });
  } catch (error) {
    logger.error('Failed to calculate AEO score', { error: String(error) });
    res.status(500).json({ error: 'Failed to calculate AEO score' });
  }
});

// =============================================================================
// Manual Triggers
// =============================================================================

/**
 * POST /api/localization/trigger/:contentId
 * Manually trigger all localization hooks for a content
 */
router.post('/trigger/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const result = await triggerHooksManually(contentId);
    res.json(result);
  } catch (error) {
    logger.error('Failed to trigger hooks', { error: String(error) });
    res.status(500).json({ error: 'Failed to trigger localization hooks' });
  }
});

/**
 * POST /api/localization/batch-process
 * Batch process all published content
 */
router.post('/batch-process', async (req, res) => {
  try {
    const { limit } = req.body || {};
    const processed = await batchProcessPublishedContent(limit || 100);
    res.json({ success: true, processed });
  } catch (error) {
    logger.error('Failed to batch process', { error: String(error) });
    res.status(500).json({ error: 'Failed to batch process content' });
  }
});

/**
 * POST /api/localization/content-status-change
 * Hook endpoint for content status changes
 */
router.post('/content-status-change', async (req, res) => {
  try {
    const { contentId, newStatus, previousStatus } = req.body;
    
    if (!contentId || !newStatus) {
      return res.status(400).json({ error: 'contentId and newStatus required' });
    }
    
    await onContentStatusChange(contentId, newStatus, previousStatus);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to handle status change', { error: String(error) });
    res.status(500).json({ error: 'Failed to handle content status change' });
  }
});

export default router;
