/**
 * Audit Log v2 - Admin Routes
 * Feature Flag: ENABLE_AUDIT_V2=true
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createLogger } from '../lib/logger';
import { isAuditV2Enabled, AUDIT_V2_CONFIG } from './config';
import { queryAuditEvents, getAuditEventById, getAuditSummary, getTotalEventCount } from './repository';
import type { AuditEventType, ResourceType, AuditV2Status } from './types';

const logger = createLogger('audit-v2-routes');
const router = Router();

// ============================================================================
// Middleware
// ============================================================================

function requireAuditV2Enabled(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isAuditV2Enabled()) {
    res.status(404).json({
      error: 'Audit v2 is not enabled',
      hint: 'Set ENABLE_AUDIT_V2=true to enable this feature',
    });
    return;
  }
  next();
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/admin/audit/events
 * Query audit events with filters
 */
router.get('/events', requireAuditV2Enabled, (req: Request, res: Response) => {
  try {
    const { resourceType, resourceId, type, actorId, from, to, limit, offset } = req.query;

    const events = queryAuditEvents({
      resourceType: resourceType as ResourceType | undefined,
      resourceId: resourceId as string | undefined,
      type: type as AuditEventType | undefined,
      actorId: actorId as string | undefined,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({ events, count: events.length });
  } catch (error) {
    logger.error({ error }, 'Failed to query audit events');
    res.status(500).json({ error: 'Failed to query audit events' });
  }
});

/**
 * GET /api/admin/audit/events/:id
 * Get a specific audit event
 */
router.get('/events/:id', requireAuditV2Enabled, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = getAuditEventById(id);

    if (!event) {
      res.status(404).json({ error: 'Audit event not found' });
      return;
    }

    res.json(event);
  } catch (error) {
    logger.error({ error, eventId: req.params.id }, 'Failed to get audit event');
    res.status(500).json({ error: 'Failed to get audit event' });
  }
});

/**
 * GET /api/admin/audit/summary
 * Get audit summary statistics
 */
router.get('/summary', requireAuditV2Enabled, (req: Request, res: Response) => {
  try {
    const summary = getAuditSummary();
    res.json(summary);
  } catch (error) {
    logger.error({ error }, 'Failed to get audit summary');
    res.status(500).json({ error: 'Failed to get audit summary' });
  }
});

/**
 * GET /api/admin/audit/status
 * Get audit v2 feature status
 */
router.get('/status', requireAuditV2Enabled, (req: Request, res: Response) => {
  try {
    const status: AuditV2Status = {
      enabled: isAuditV2Enabled(),
      totalEvents: getTotalEventCount(),
      config: {
        maxEventsStored: AUDIT_V2_CONFIG.maxEventsStored,
        redactionEnabled: AUDIT_V2_CONFIG.redactionEnabled,
      },
    };
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get audit status');
    res.status(500).json({ error: 'Failed to get audit status' });
  }
});

export default router;
