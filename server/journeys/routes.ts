/**
 * User Journey & Funnel Engine - Admin Routes
 * Feature Flag: ENABLE_USER_JOURNEYS=true
 */

import { Router } from 'express';
import { createLogger } from '../lib/logger';
import { isUserJourneysEnabled } from './config';
import {
  getJourneySummary,
  analyzeFunnel,
  getAvailableFunnels,
  getJourneyEngineStatus,
  trackJourneyEvent,
} from './engine';
import type { JourneyEventType } from './types';

const logger = createLogger('journey-routes');
const router = Router();

// ============================================================================
// Middleware: Check feature flag
// ============================================================================

function requireEnabled(req: any, res: any, next: any) {
  if (!isUserJourneysEnabled()) {
    return res.status(503).json({
      error: 'User journeys feature is disabled',
      message: 'Set ENABLE_USER_JOURNEYS=true to enable',
    });
  }
  next();
}

// ============================================================================
// GET /api/admin/journeys/summary
// ============================================================================

router.get('/summary', requireEnabled, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const summary = await getJourneySummary(startDate, endDate);

    if (!summary) {
      return res.status(500).json({ error: 'Failed to get journey summary' });
    }

    res.json(summary);
  } catch (error) {
    logger.error({ error }, 'Failed to get journey summary');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/admin/journeys/funnel/:name
// ============================================================================

router.get('/funnel/:name', requireEnabled, async (req, res) => {
  try {
    const { name } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const analysis = await analyzeFunnel(name, startDate, endDate);

    if (!analysis) {
      return res.status(404).json({
        error: 'Funnel not found or analysis failed',
        funnelName: name,
      });
    }

    res.json(analysis);
  } catch (error) {
    logger.error({ error, funnel: req.params.name }, 'Failed to analyze funnel');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/admin/journeys/funnels
// ============================================================================

router.get('/funnels', requireEnabled, async (req, res) => {
  try {
    const funnels = getAvailableFunnels();
    res.json({ funnels });
  } catch (error) {
    logger.error({ error }, 'Failed to get funnels');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/admin/journeys/status
// ============================================================================

router.get('/status', async (req, res) => {
  try {
    const status = getJourneyEngineStatus();
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get status');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// POST /api/admin/journeys/track (for testing)
// ============================================================================

router.post('/track', requireEnabled, async (req, res) => {
  try {
    const {
      eventType,
      sessionId,
      visitorId,
      userId,
      pageUrl,
      referrer,
      contentId,
      searchQuery,
      affiliateId,
      conversionValue,
      metadata,
    } = req.body;

    if (!eventType || !sessionId || !visitorId || !pageUrl) {
      return res.status(400).json({
        error: 'Missing required fields: eventType, sessionId, visitorId, pageUrl',
      });
    }

    const event = await trackJourneyEvent(eventType as JourneyEventType, {
      sessionId,
      visitorId,
      userId,
      pageUrl,
      referrer,
      contentId,
      searchQuery,
      affiliateId,
      conversionValue,
      metadata,
    });

    res.json({ success: true, event });
  } catch (error) {
    logger.error({ error }, 'Failed to track event');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const journeyRoutes = router;
export default router;
