/**
 * Multi-Locale Content Governance - Admin Routes
 * Feature Flag: ENABLE_LOCALIZATION_GOVERNANCE=true
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createLogger } from '../lib/logger';
import { isLocalizationGovernanceEnabled } from './config';
import {
  getLocalizationGovernanceStatus,
  getLocalizationSummary,
  getContentTranslationStatus,
  analyzeContentLocalization,
  clearLocalizationCache,
} from './engine';

const logger = createLogger('localization-governance-routes');

const router = Router();

// ============================================================================
// Middleware
// ============================================================================

function requireLocalizationGovernance(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isLocalizationGovernanceEnabled()) {
    res.status(404).json({
      error: 'Localization governance is not enabled',
      hint: 'Set ENABLE_LOCALIZATION_GOVERNANCE=true to enable this feature',
    });
    return;
  }
  next();
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/admin/localization/status
 * Get overall localization governance status and configuration
 */
router.get('/status', requireLocalizationGovernance, async (req: Request, res: Response) => {
  try {
    const status = getLocalizationGovernanceStatus();
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get localization status');
    res.status(500).json({ error: 'Failed to get localization status' });
  }
});

/**
 * GET /api/admin/localization/summary
 * Get summary of all content localization across the site
 */
router.get('/summary', requireLocalizationGovernance, async (req: Request, res: Response) => {
  try {
    const summary = await getLocalizationSummary();
    if (!summary) {
      res.status(500).json({ error: 'Failed to generate localization summary' });
      return;
    }
    res.json(summary);
  } catch (error) {
    logger.error({ error }, 'Failed to get localization summary');
    res.status(500).json({ error: 'Failed to get localization summary' });
  }
});

/**
 * GET /api/admin/localization/content/:id
 * Get detailed localization status for a specific content item
 */
router.get('/content/:id', requireLocalizationGovernance, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Content ID is required' });
      return;
    }

    const status = await getContentTranslationStatus(id);
    if (!status) {
      res.status(404).json({ error: 'Content not found or analysis failed' });
      return;
    }

    res.json(status);
  } catch (error) {
    logger.error({ error, contentId: req.params.id }, 'Failed to get content localization status');
    res.status(500).json({ error: 'Failed to get content localization status' });
  }
});

/**
 * GET /api/admin/localization/content/:id/details
 * Get full localization analysis details for a content item
 */
router.get('/content/:id/details', requireLocalizationGovernance, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Content ID is required' });
      return;
    }

    const details = await analyzeContentLocalization(id);
    if (!details) {
      res.status(404).json({ error: 'Content not found or analysis failed' });
      return;
    }

    res.json(details);
  } catch (error) {
    logger.error({ error, contentId: req.params.id }, 'Failed to analyze content localization');
    res.status(500).json({ error: 'Failed to analyze content localization' });
  }
});

/**
 * POST /api/admin/localization/cache/clear
 * Clear the localization analysis cache
 */
router.post('/cache/clear', requireLocalizationGovernance, async (req: Request, res: Response) => {
  try {
    clearLocalizationCache();
    logger.info('Localization cache cleared');
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    logger.error({ error }, 'Failed to clear localization cache');
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;
