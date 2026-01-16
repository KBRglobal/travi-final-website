/**
 * Content Inventory Exporter - Admin Routes
 * Feature Flag: ENABLE_EXPORTS=true
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createLogger } from '../lib/logger';
import { isExportsEnabled, EXPORTS_CONFIG } from './config';
import { exportContentsAsCSV, exportContentsAsJSON } from './content-exporter';
import { exportEntitiesAsCSV, exportEntitiesAsJSON } from './entity-exporter';
import type { ExportsStatus } from './types';
import { exportGuard } from '../security/middleware/security-guards';

const logger = createLogger('exports-routes');
const router = Router();

// Apply Security Gate to all export routes (except status)
router.use((req, res, next) => {
  if (req.path === '/status') return next();
  return exportGuard(req, res, next);
});

// ============================================================================
// Middleware
// ============================================================================

function requireExportsEnabled(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isExportsEnabled()) {
    res.status(404).json({
      error: 'Exports feature is not enabled',
      hint: 'Set ENABLE_EXPORTS=true to enable this feature',
    });
    return;
  }
  next();
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/admin/exports/status
 * Get exports feature status
 */
router.get('/status', requireExportsEnabled, (req: Request, res: Response) => {
  try {
    const status: ExportsStatus = {
      enabled: isExportsEnabled(),
      config: {
        maxExportRows: EXPORTS_CONFIG.maxExportRows,
        supportedFormats: [...EXPORTS_CONFIG.supportedFormats],
      },
    };
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get exports status');
    res.status(500).json({ error: 'Failed to get status' });
  }
});

/**
 * GET /api/admin/exports/contents.csv
 * Export content inventory as CSV
 */
router.get('/contents.csv', requireExportsEnabled, (req: Request, res: Response) => {
  try {
    const { limit, offset, status, type, locale } = req.query;

    const result = exportContentsAsCSV({
      format: 'csv',
      includeHeaders: true,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
      filters: {
        status: status as string | undefined,
        type: type as string | undefined,
        locale: locale as string | undefined,
      },
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    logger.error({ error }, 'Failed to export contents as CSV');
    res.status(500).json({ error: 'Failed to export contents' });
  }
});

/**
 * GET /api/admin/exports/contents.json
 * Export content inventory as JSON
 */
router.get('/contents.json', requireExportsEnabled, (req: Request, res: Response) => {
  try {
    const { limit, offset, status, type, locale } = req.query;

    const result = exportContentsAsJSON({
      format: 'json',
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
      filters: {
        status: status as string | undefined,
        type: type as string | undefined,
        locale: locale as string | undefined,
      },
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    logger.error({ error }, 'Failed to export contents as JSON');
    res.status(500).json({ error: 'Failed to export contents' });
  }
});

/**
 * GET /api/admin/exports/entities/:type.csv
 * Export entities of a type as CSV
 */
router.get('/entities/:type.csv', requireExportsEnabled, (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { limit, offset, destinationId } = req.query;

    const validTypes = ['hotels', 'attractions', 'dining', 'transports', 'districts'];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        error: 'Invalid entity type',
        validTypes,
      });
      return;
    }

    const result = exportEntitiesAsCSV(type, {
      format: 'csv',
      includeHeaders: true,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
      filters: {
        destinationId: destinationId as string | undefined,
      },
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    logger.error({ error, entityType: req.params.type }, 'Failed to export entities');
    res.status(500).json({ error: 'Failed to export entities' });
  }
});

/**
 * GET /api/admin/exports/entities/:type.json
 * Export entities of a type as JSON
 */
router.get('/entities/:type.json', requireExportsEnabled, (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { limit, offset, destinationId } = req.query;

    const validTypes = ['hotels', 'attractions', 'dining', 'transports', 'districts'];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        error: 'Invalid entity type',
        validTypes,
      });
      return;
    }

    const result = exportEntitiesAsJSON(type, {
      format: 'json',
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
      filters: {
        destinationId: destinationId as string | undefined,
      },
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    logger.error({ error, entityType: req.params.type }, 'Failed to export entities');
    res.status(500).json({ error: 'Failed to export entities' });
  }
});

export default router;
