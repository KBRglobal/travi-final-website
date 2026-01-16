/**
 * Operations & Reliability - Admin API Routes
 *
 * Exposes admin endpoints for all ops features:
 * - Incident Management
 * - Release Guards
 * - AI Failover
 * - Data Integrity
 * - System Snapshots
 */

import { Router, Request, Response } from 'express';
import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[OpsAdmin] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[OpsAdmin] ${msg}`, data),
};

const router = Router();

// ============ FEATURE 1: Incident Management ============

/**
 * GET /api/admin/incidents
 */
router.get('/incidents', async (req: Request, res: Response) => {
  try {
    const { getIncidentManager } = await import('./incidents');
    const manager = getIncidentManager();

    const filter: Record<string, unknown> = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.limit) filter.limit = parseInt(req.query.limit as string, 10);

    const incidents = manager.listIncidents(filter as never);
    const stats = manager.getStats();

    res.json({
      incidents,
      stats,
      count: incidents.length,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch incidents',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/admin/incidents/:id/ack
 */
router.post('/incidents/:id/ack', async (req: Request, res: Response) => {
  try {
    const { getIncidentManager } = await import('./incidents');
    const manager = getIncidentManager();

    const success = manager.acknowledge(req.params.id, req.body.acknowledgedBy);

    if (!success) {
      res.status(404).json({ error: 'Incident not found or already acknowledged' });
      return;
    }

    logger.info('Incident acknowledged via API', { id: req.params.id });
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/incidents/:id/resolve
 */
router.post('/incidents/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { getIncidentManager } = await import('./incidents');
    const manager = getIncidentManager();

    const success = manager.resolve(
      req.params.id,
      req.body.resolvedBy,
      req.body.notes
    );

    if (!success) {
      res.status(404).json({ error: 'Incident not found or already resolved' });
      return;
    }

    logger.info('Incident resolved via API', { id: req.params.id });
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ============ FEATURE 2: Release Guards ============

/**
 * GET /api/admin/release/safety
 */
router.get('/release/safety', async (_req: Request, res: Response) => {
  try {
    const { getReleaseGuard } = await import('../platform/release-guards');
    const guard = getReleaseGuard();

    const report = await guard.runChecks();

    res.json({
      report,
      canDeploy: report.canProceed,
      overallSeverity: report.overallSeverity,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to run safety checks',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============ FEATURE 3: AI Failover ============

/**
 * GET /api/admin/ai/providers
 */
router.get('/ai/providers', async (_req: Request, res: Response) => {
  try {
    const { getAIFailoverController } = await import('./ai-failover');
    const controller = getAIFailoverController();

    const statuses = controller.getProviderStatuses();
    const state = controller.getState();

    res.json({
      currentProvider: state.currentProvider,
      primaryProvider: state.primaryProvider,
      concurrencyLevel: state.concurrencyLevel,
      nonCriticalEnabled: state.nonCriticalEnabled,
      providers: statuses,
      recentActions: state.recentActions,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/ai/providers/:name/disable
 */
router.post('/ai/providers/:name/disable', async (req: Request, res: Response) => {
  try {
    const { getAIFailoverController } = await import('./ai-failover');
    const controller = getAIFailoverController();

    const success = controller.disableProvider(
      req.params.name as never,
      req.body.reason || 'Manual disable via admin API'
    );

    if (!success) {
      res.status(404).json({ error: 'Provider not found' });
      return;
    }

    logger.warn('AI provider disabled via API', { provider: req.params.name });
    res.json({ success: true, provider: req.params.name });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/ai/providers/:name/enable
 */
router.post('/ai/providers/:name/enable', async (req: Request, res: Response) => {
  try {
    const { getAIFailoverController } = await import('./ai-failover');
    const controller = getAIFailoverController();

    const success = controller.enableProvider(req.params.name as never);

    if (!success) {
      res.status(404).json({ error: 'Provider not found' });
      return;
    }

    logger.info('AI provider enabled via API', { provider: req.params.name });
    res.json({ success: true, provider: req.params.name });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ============ FEATURE 4: Data Integrity ============

/**
 * GET /api/admin/data-integrity/issues
 */
router.get('/data-integrity/issues', async (req: Request, res: Response) => {
  try {
    const { getDataIntegrityWatchdog } = await import('../monitoring/data-integrity');
    const watchdog = getDataIntegrityWatchdog();

    const includeResolved = req.query.includeResolved === 'true';
    const issues = watchdog.getIssues(includeResolved);
    const reports = watchdog.getReports();

    res.json({
      issues,
      issueCount: issues.length,
      recentReports: reports,
      isScanning: watchdog.isScanInProgress(),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/data-integrity/run
 */
router.post('/data-integrity/run', async (_req: Request, res: Response) => {
  try {
    const { getDataIntegrityWatchdog } = await import('../monitoring/data-integrity');
    const watchdog = getDataIntegrityWatchdog();

    if (watchdog.isScanInProgress()) {
      res.status(409).json({ error: 'Scan already in progress' });
      return;
    }

    logger.info('Data integrity scan triggered via API');
    const report = await watchdog.runScan('manual');

    res.json({
      report,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/data-integrity/issues/:id/resolve
 */
router.post('/data-integrity/issues/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { getDataIntegrityWatchdog } = await import('../monitoring/data-integrity');
    const watchdog = getDataIntegrityWatchdog();

    const success = watchdog.resolveIssue(req.params.id);

    if (!success) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }

    res.json({ success: true, id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ============ FEATURE 5: System Snapshots ============

/**
 * GET /api/admin/snapshots
 */
router.get('/snapshots', async (req: Request, res: Response) => {
  try {
    const { getSnapshotManager } = await import('./snapshots');
    const manager = getSnapshotManager();

    const query: Record<string, unknown> = {};
    if (req.query.trigger) query.trigger = req.query.trigger;
    if (req.query.limit) query.limit = parseInt(req.query.limit as string, 10);
    if (req.query.since) query.since = new Date(req.query.since as string);

    const snapshots = manager.querySnapshots(query as never);

    res.json({
      snapshots,
      count: snapshots.length,
      totalStored: manager.getSnapshotCount(),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/snapshots/:id
 */
router.get('/snapshots/:id', async (req: Request, res: Response) => {
  try {
    const { getSnapshotManager } = await import('./snapshots');
    const manager = getSnapshotManager();

    const snapshot = manager.getSnapshot(req.params.id);

    if (!snapshot) {
      res.status(404).json({ error: 'Snapshot not found' });
      return;
    }

    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/snapshots
 */
router.post('/snapshots', async (req: Request, res: Response) => {
  try {
    const { getSnapshotManager } = await import('./snapshots');
    const manager = getSnapshotManager();

    logger.info('Snapshot capture triggered via API');
    const snapshot = await manager.captureSnapshot(
      'manual',
      req.body.triggeredBy,
      req.body.metadata
    );

    res.json({
      success: true,
      snapshot,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/snapshots/compare/:id1/:id2
 */
router.get('/snapshots/compare/:id1/:id2', async (req: Request, res: Response) => {
  try {
    const { getSnapshotManager } = await import('./snapshots');
    const manager = getSnapshotManager();

    const comparison = manager.compareSnapshots(req.params.id1, req.params.id2);

    if (!comparison) {
      res.status(404).json({ error: 'One or both snapshots not found' });
      return;
    }

    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
