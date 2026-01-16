/**
 * Runtime Migration & Backfill Framework - Routes
 */

import { Router, Request, Response } from 'express';
import {
  isMigrationFrameworkEnabled,
  MigrationStatus,
  MigrationType,
  MigrationPriority,
} from './types';
import {
  registerMigration,
  getMigration,
  updateMigration,
  canRunMigration,
  startMigration,
  pauseMigration,
  resumeMigration,
  completeMigration,
  failMigration,
  rollbackMigration,
  getAllMigrations,
  getMigrationBatches,
  saveCheckpoint,
  getLatestCheckpoint,
  createBackfillJob,
  getBackfillJob,
  updateBackfillProgress,
  startBackfillJob,
  completeBackfillJob,
  failBackfillJob,
  getAllBackfillJobs,
  dryRunMigration,
  getMigrationEvents,
  getMigrationStats,
  getMigrationRollbackHistory,
  retryFailedBatch,
  getPendingMigrationsInOrder,
} from './migration-engine';

const router = Router();

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isMigrationFrameworkEnabled()) {
    res.status(503).json({
      error: 'Migration Framework is disabled',
      hint: 'Set ENABLE_MIGRATION_FRAMEWORK=true to enable',
    });
    return;
  }
  next();
}

/**
 * POST /api/admin/migrations
 * Register a new migration.
 */
router.post('/', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { name, type, version, description, priority, dependencies, batchSize, totalItems, metadata } = req.body;

    if (!name || !type || !version) {
      res.status(400).json({ error: 'name, type, and version are required' });
      return;
    }

    const migration = registerMigration(name, type as MigrationType, version, {
      description,
      priority: priority as MigrationPriority,
      dependencies,
      batchSize,
      totalItems,
      metadata,
    });

    res.json({ migration });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/migrations
 * Get all migrations.
 */
router.get('/', requireEnabled, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as MigrationStatus | undefined;
    const type = req.query.type as MigrationType | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const migrations = getAllMigrations({ status, type, limit, offset });
    res.json({ migrations, count: migrations.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/migrations/pending
 * Get pending migrations in execution order.
 */
router.get('/pending', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const migrations = getPendingMigrationsInOrder();
    res.json({ migrations });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/migrations/stats
 * Get migration stats.
 */
router.get('/stats', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const stats = getMigrationStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/migrations/events
 * Get all migration events.
 */
router.get('/events', requireEnabled, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const events = getMigrationEvents(undefined, limit);
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/migrations/rollback-history
 * Get rollback history.
 */
router.get('/rollback-history', requireEnabled, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = getMigrationRollbackHistory(limit);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/migrations/:id
 * Get migration by ID.
 */
router.get('/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const migration = getMigration(id);

    if (!migration) {
      res.status(404).json({ error: 'Migration not found' });
      return;
    }

    res.json({ migration });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * PUT /api/admin/migrations/:id
 * Update migration.
 */
router.put('/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const migration = updateMigration(id, updates);

    if (!migration) {
      res.status(404).json({ error: 'Migration not found' });
      return;
    }

    res.json({ migration });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/migrations/:id/can-run
 * Check if migration can run.
 */
router.get('/:id/can-run', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = canRunMigration(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/migrations/:id/start
 * Start a migration.
 */
router.post('/:id/start', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const migration = startMigration(id);

    if (!migration) {
      res.status(404).json({ error: 'Migration not found' });
      return;
    }

    res.json({ migration });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/migrations/:id/pause
 * Pause a migration.
 */
router.post('/:id/pause', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const migration = pauseMigration(id);

    if (!migration) {
      res.status(404).json({ error: 'Migration not found' });
      return;
    }

    res.json({ migration });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/migrations/:id/resume
 * Resume a migration.
 */
router.post('/:id/resume', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const migration = resumeMigration(id);

    if (!migration) {
      res.status(404).json({ error: 'Migration not found' });
      return;
    }

    res.json({ migration });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/migrations/:id/complete
 * Complete a migration.
 */
router.post('/:id/complete', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const migration = completeMigration(id);

    if (!migration) {
      res.status(404).json({ error: 'Migration not found' });
      return;
    }

    res.json({ migration });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/migrations/:id/fail
 * Fail a migration.
 */
router.post('/:id/fail', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error: errorMsg } = req.body;

    if (!errorMsg) {
      res.status(400).json({ error: 'error message is required' });
      return;
    }

    const migration = failMigration(id, errorMsg);

    if (!migration) {
      res.status(404).json({ error: 'Migration not found' });
      return;
    }

    res.json({ migration });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/migrations/:id/rollback
 * Rollback a migration.
 */
router.post('/:id/rollback', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, triggeredBy } = req.body;

    if (!reason) {
      res.status(400).json({ error: 'reason is required' });
      return;
    }

    const migration = rollbackMigration(id, reason, triggeredBy || 'admin');

    if (!migration) {
      res.status(404).json({ error: 'Migration not found' });
      return;
    }

    res.json({ migration });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/migrations/:id/dry-run
 * Dry run a migration.
 */
router.post('/:id/dry-run', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sampleSize = parseInt(req.query.sampleSize as string) || 10;

    const result = dryRunMigration(id, sampleSize);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/migrations/:id/batches
 * Get migration batches.
 */
router.get('/:id/batches', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const batches = getMigrationBatches(id, limit);
    res.json({ batches });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/migrations/:id/checkpoint
 * Save a checkpoint.
 */
router.post('/:id/checkpoint', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { processedCount, lastProcessedId } = req.body;

    if (processedCount === undefined) {
      res.status(400).json({ error: 'processedCount is required' });
      return;
    }

    const checkpoint = saveCheckpoint(id, processedCount, lastProcessedId);
    res.json({ checkpoint });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/migrations/:id/checkpoint
 * Get latest checkpoint.
 */
router.get('/:id/checkpoint', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const checkpoint = getLatestCheckpoint(id);

    if (!checkpoint) {
      res.status(404).json({ error: 'No checkpoint found' });
      return;
    }

    res.json({ checkpoint });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/migrations/:id/events
 * Get migration events.
 */
router.get('/:id/events', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const events = getMigrationEvents(id, limit);
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/migrations/batches/:batchId/retry
 * Retry failed batch.
 */
router.post('/batches/:batchId/retry', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;

    const batch = retryFailedBatch(batchId);

    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    res.json({ batch });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Backfill job routes

/**
 * POST /api/admin/backfill-jobs
 * Create a backfill job.
 */
router.post('/backfill-jobs', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { name, targetCollection, query, transformFn, batchSize, totalItems, concurrency, maxRetries } = req.body;

    if (!name || !targetCollection) {
      res.status(400).json({ error: 'name and targetCollection are required' });
      return;
    }

    const job = createBackfillJob(name, targetCollection, {
      query,
      transformFn,
      batchSize,
      totalItems,
      concurrency,
      maxRetries,
    });

    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/backfill-jobs
 * Get all backfill jobs.
 */
router.get('/backfill-jobs', requireEnabled, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as MigrationStatus | undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    const jobs = getAllBackfillJobs({ status, limit });
    res.json({ jobs, count: jobs.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/backfill-jobs/:id
 * Get backfill job by ID.
 */
router.get('/backfill-jobs/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = getBackfillJob(id);

    if (!job) {
      res.status(404).json({ error: 'Backfill job not found' });
      return;
    }

    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/backfill-jobs/:id/start
 * Start a backfill job.
 */
router.post('/backfill-jobs/:id/start', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = startBackfillJob(id);

    if (!job) {
      res.status(404).json({ error: 'Backfill job not found' });
      return;
    }

    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * PUT /api/admin/backfill-jobs/:id/progress
 * Update backfill job progress.
 */
router.put('/backfill-jobs/:id/progress', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { processedItems, failedItems } = req.body;

    const job = updateBackfillProgress(id, processedItems || 0, failedItems || 0);

    if (!job) {
      res.status(404).json({ error: 'Backfill job not found' });
      return;
    }

    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/backfill-jobs/:id/complete
 * Complete a backfill job.
 */
router.post('/backfill-jobs/:id/complete', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = completeBackfillJob(id);

    if (!job) {
      res.status(404).json({ error: 'Backfill job not found' });
      return;
    }

    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/backfill-jobs/:id/fail
 * Fail a backfill job.
 */
router.post('/backfill-jobs/:id/fail', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error: errorMsg } = req.body;

    if (!errorMsg) {
      res.status(400).json({ error: 'error message is required' });
      return;
    }

    const job = failBackfillJob(id, errorMsg);

    if (!job) {
      res.status(404).json({ error: 'Backfill job not found' });
      return;
    }

    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as migrationFrameworkRoutes };
