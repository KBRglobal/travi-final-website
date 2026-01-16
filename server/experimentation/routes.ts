/**
 * Experimentation / A-B Test Engine - Admin Routes
 * Feature Flag: ENABLE_EXPERIMENTS=true
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createLogger } from '../lib/logger';
import { isExperimentationEnabled } from './config';
import {
  getExperimentationStatus,
  createExperiment,
  getExperiment,
  updateExperimentStatus,
  listExperiments,
  getAssignment,
  recordMetricEvent,
  calculateExperimentResults,
  clearExperimentationData,
} from './engine';
import type { ExperimentStatus } from './types';

const logger = createLogger('experimentation-routes');

const router = Router();

// ============================================================================
// Middleware
// ============================================================================

function requireExperimentation(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isExperimentationEnabled()) {
    res.status(404).json({
      error: 'Experimentation is not enabled',
      hint: 'Set ENABLE_EXPERIMENTS=true to enable this feature',
    });
    return;
  }
  next();
}

// ============================================================================
// Status Routes
// ============================================================================

/**
 * GET /api/admin/experiments/status
 * Get experimentation engine status
 */
router.get('/status', requireExperimentation, async (req: Request, res: Response) => {
  try {
    const status = getExperimentationStatus();
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get experimentation status');
    res.status(500).json({ error: 'Failed to get experimentation status' });
  }
});

// ============================================================================
// Experiment CRUD Routes
// ============================================================================

/**
 * GET /api/admin/experiments
 * List all experiments
 */
router.get('/', requireExperimentation, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as ExperimentStatus | undefined;
    const experiments = listExperiments(status);
    res.json({ experiments, total: experiments.length });
  } catch (error) {
    logger.error({ error }, 'Failed to list experiments');
    res.status(500).json({ error: 'Failed to list experiments' });
  }
});

/**
 * POST /api/admin/experiments
 * Create a new experiment
 */
router.post('/', requireExperimentation, async (req: Request, res: Response) => {
  try {
    const { name, description, variants, metrics, targetAudience, status = 'draft' } = req.body;

    if (!name || !variants || !Array.isArray(variants) || variants.length < 2) {
      res.status(400).json({
        error: 'Invalid experiment data',
        details: 'Name and at least 2 variants are required',
      });
      return;
    }

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      res.status(400).json({
        error: 'Invalid experiment data',
        details: 'At least one metric is required',
      });
      return;
    }

    const experiment = createExperiment({
      name,
      description,
      status,
      variants,
      metrics,
      targetAudience,
    });

    res.status(201).json(experiment);
  } catch (error) {
    logger.error({ error }, 'Failed to create experiment');
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create experiment' });
    }
  }
});

/**
 * GET /api/admin/experiments/:id
 * Get a specific experiment
 */
router.get('/:id', requireExperimentation, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const experiment = getExperiment(id);

    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    res.json(experiment);
  } catch (error) {
    logger.error({ error, experimentId: req.params.id }, 'Failed to get experiment');
    res.status(500).json({ error: 'Failed to get experiment' });
  }
});

/**
 * PATCH /api/admin/experiments/:id/status
 * Update experiment status
 */
router.patch('/:id/status', requireExperimentation, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses: ExperimentStatus[] = ['draft', 'running', 'paused', 'completed', 'archived'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: 'Invalid status',
        validStatuses,
      });
      return;
    }

    const experiment = updateExperimentStatus(id, status);
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    res.json(experiment);
  } catch (error) {
    logger.error({ error, experimentId: req.params.id }, 'Failed to update experiment status');
    res.status(500).json({ error: 'Failed to update experiment status' });
  }
});

/**
 * GET /api/admin/experiments/:id/results
 * Get experiment results
 */
router.get('/:id/results', requireExperimentation, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const results = calculateExperimentResults(id);

    if (!results) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    res.json(results);
  } catch (error) {
    logger.error({ error, experimentId: req.params.id }, 'Failed to get experiment results');
    res.status(500).json({ error: 'Failed to get experiment results' });
  }
});

// ============================================================================
// Assignment Routes
// ============================================================================

/**
 * POST /api/admin/experiments/:id/assign
 * Get or create an assignment for a user
 */
router.post('/:id/assign', requireExperimentation, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, sessionId, attributes } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const assignment = getAssignment(id, { userId, sessionId, attributes });

    if (!assignment) {
      res.status(404).json({
        error: 'Could not assign user',
        details: 'Experiment may not be running or user does not match audience',
      });
      return;
    }

    res.json(assignment);
  } catch (error) {
    logger.error({ error, experimentId: req.params.id }, 'Failed to assign user');
    res.status(500).json({ error: 'Failed to assign user' });
  }
});

// ============================================================================
// Metric Routes
// ============================================================================

/**
 * POST /api/admin/experiments/:id/metrics
 * Record a metric event
 */
router.post('/:id/metrics', requireExperimentation, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { variantId, userId, metricId, value, metadata } = req.body;

    if (!variantId || !userId || !metricId || value === undefined) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['variantId', 'userId', 'metricId', 'value'],
      });
      return;
    }

    recordMetricEvent({
      experimentId: id,
      variantId,
      userId,
      metricId,
      value: Number(value),
      metadata,
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error, experimentId: req.params.id }, 'Failed to record metric');
    res.status(500).json({ error: 'Failed to record metric' });
  }
});

// ============================================================================
// Admin Routes
// ============================================================================

/**
 * POST /api/admin/experiments/clear
 * Clear all experimentation data (for testing)
 */
router.post('/clear', requireExperimentation, async (req: Request, res: Response) => {
  try {
    clearExperimentationData();
    res.json({ success: true, message: 'Experimentation data cleared' });
  } catch (error) {
    logger.error({ error }, 'Failed to clear experimentation data');
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

export default router;
