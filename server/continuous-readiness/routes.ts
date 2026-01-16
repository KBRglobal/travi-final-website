/**
 * Continuous Readiness Monitor - API Routes
 * Feature Flag: ENABLE_CONTINUOUS_READINESS=false
 */

import { Router, Request, Response, NextFunction } from 'express';
import { isContinuousReadinessEnabled, READINESS_CONFIG } from './config';
import {
  checkNow,
  startMonitor,
  stopMonitor,
  getMonitorStatus,
  getCurrentState,
  getLastSnapshot,
  getSnapshotHistory,
  getActiveDegradations,
  getAllDegradations,
  getMTTRStats,
  getEvents,
} from './monitor';

const router = Router();

// Feature flag middleware
function requireEnabled(req: Request, res: Response, next: NextFunction): void {
  if (!isContinuousReadinessEnabled()) {
    res.status(503).json({ error: 'Continuous readiness is not enabled' });
    return;
  }
  next();
}

// GET /api/ops/readiness/status - Get monitor status
router.get('/status', (req: Request, res: Response) => {
  res.json(getMonitorStatus());
});

// GET /api/ops/readiness/config - Get configuration
router.get('/config', (req: Request, res: Response) => {
  res.json({
    enabled: isContinuousReadinessEnabled(),
    config: READINESS_CONFIG,
  });
});

// GET /api/ops/readiness/state - Get current state
router.get('/state', requireEnabled, (req: Request, res: Response) => {
  res.json({
    state: getCurrentState(),
    snapshot: getLastSnapshot(),
  });
});

// POST /api/ops/readiness/check - Run immediate check
router.post('/check', requireEnabled, async (req: Request, res: Response) => {
  try {
    const snapshot = await checkNow();
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/ops/readiness/monitor/start - Start periodic monitoring
router.post('/monitor/start', requireEnabled, (req: Request, res: Response) => {
  try {
    startMonitor();
    res.json(getMonitorStatus());
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/ops/readiness/monitor/stop - Stop periodic monitoring
router.post('/monitor/stop', requireEnabled, (req: Request, res: Response) => {
  stopMonitor();
  res.json(getMonitorStatus());
});

// GET /api/ops/readiness/snapshot - Get latest snapshot
router.get('/snapshot', requireEnabled, (req: Request, res: Response) => {
  const snapshot = getLastSnapshot();
  if (!snapshot) {
    res.status(404).json({ error: 'No snapshot available' });
    return;
  }
  res.json(snapshot);
});

// GET /api/ops/readiness/history - Get snapshot history
router.get('/history', requireEnabled, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const history = getSnapshotHistory(limit);
  res.json({ history, count: history.length });
});

// GET /api/ops/readiness/degradations - Get degradations
router.get('/degradations', requireEnabled, (req: Request, res: Response) => {
  const activeOnly = req.query.active === 'true';
  const limit = parseInt(req.query.limit as string) || 100;
  const degradations = activeOnly ? getActiveDegradations() : getAllDegradations(limit);
  res.json({ degradations, count: degradations.length });
});

// GET /api/ops/readiness/mttr - Get MTTR stats
router.get('/mttr', requireEnabled, (req: Request, res: Response) => {
  res.json(getMTTRStats());
});

// GET /api/ops/readiness/events - Get events
router.get('/events', requireEnabled, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const evts = getEvents(limit);
  res.json({ events: evts, count: evts.length });
});

export default router;
