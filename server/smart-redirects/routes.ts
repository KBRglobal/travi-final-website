/**
 * Smart Redirects - Routes
 */

import { Router, Request, Response } from 'express';
import { isSmartRedirectsEnabled, RedirectType } from './types';
import {
  createRedirect,
  getRedirect,
  updateRedirect,
  deleteRedirect,
  matchRedirect,
  findRedirectChain,
  recordUrlChange,
  getAllRedirects,
  findChainsAndLoops,
  getRedirectStats,
  bulkImport,
  exportRedirects,
  getUrlChangeHistory,
  cleanupExpired,
} from './redirect-manager';

const router = Router();

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isSmartRedirectsEnabled()) {
    res.status(503).json({
      error: 'Smart Redirects is disabled',
      hint: 'Set ENABLE_SMART_REDIRECTS=true to enable',
    });
    return;
  }
  next();
}

/**
 * GET /api/admin/redirects
 */
router.get('/', requireEnabled, async (req: Request, res: Response) => {
  try {
    const enabled = req.query.enabled === 'true' ? true : req.query.enabled === 'false' ? false : undefined;
    const type = req.query.type as RedirectType | undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    const redirects = getAllRedirects({ enabled, type, limit });
    res.json({ redirects, count: redirects.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/redirects
 */
router.post('/', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { sourceUrl, targetUrl, type, isRegex, priority, expiresAt } = req.body;

    if (!sourceUrl || !targetUrl) {
      res.status(400).json({ error: 'sourceUrl and targetUrl are required' });
      return;
    }

    const redirect = createRedirect(sourceUrl, targetUrl, type || '301', {
      isRegex,
      priority,
      createdBy: 'admin',
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    res.json({ redirect });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/redirects/:id
 */
router.get('/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const redirect = getRedirect(id);

    if (!redirect) {
      res.status(404).json({ error: 'Redirect not found' });
      return;
    }

    res.json({ redirect });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * PUT /api/admin/redirects/:id
 */
router.put('/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const redirect = updateRedirect(id, updates);

    if (!redirect) {
      res.status(404).json({ error: 'Redirect not found' });
      return;
    }

    res.json({ redirect });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * DELETE /api/admin/redirects/:id
 */
router.delete('/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = deleteRedirect(id);
    res.json({ deleted });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/redirects/match
 */
router.post('/match', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({ error: 'url is required' });
      return;
    }

    const match = matchRedirect(url);
    res.json({ match });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/redirects/chain
 */
router.post('/chain', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({ error: 'url is required' });
      return;
    }

    const chain = findRedirectChain(url);
    res.json({ chain });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/redirects/url-change
 */
router.post('/url-change', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId, oldUrl, newUrl, changeType, autoCreateRedirect } = req.body;

    if (!contentId || !oldUrl || !newUrl || !changeType) {
      res.status(400).json({ error: 'contentId, oldUrl, newUrl, and changeType are required' });
      return;
    }

    const event = recordUrlChange(contentId, oldUrl, newUrl, changeType, autoCreateRedirect);
    res.json({ event });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/redirects/chains-and-loops
 */
router.get('/chains-and-loops', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const result = findChainsAndLoops();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/redirects/stats
 */
router.get('/stats', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const stats = getRedirectStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/redirects/bulk-import
 */
router.post('/bulk-import', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { redirects } = req.body;

    if (!Array.isArray(redirects)) {
      res.status(400).json({ error: 'redirects array is required' });
      return;
    }

    const result = bulkImport(redirects);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/redirects/export
 */
router.get('/export', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const redirects = exportRedirects();
    res.json({ redirects });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/redirects/history
 */
router.get('/history', requireEnabled, async (req: Request, res: Response) => {
  try {
    const contentId = req.query.contentId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    const history = getUrlChangeHistory(contentId, limit);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/redirects/cleanup
 */
router.post('/cleanup', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const cleaned = cleanupExpired();
    res.json({ cleaned });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as smartRedirectsRoutes };
