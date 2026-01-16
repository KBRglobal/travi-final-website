/**
 * Technical SEO Audit - Admin Routes
 */

import { Router, Request, Response } from 'express';
import { isSeoAuditEnabled, DEFAULT_CHECKS, SeoCheckType } from './types';
import { runFullAudit, runSingleCheck, getLatestAudit, getAllAudits, getAudit } from './runner';
import {
  getLatestIssues,
  getIssuesBySeverity,
  getIssuesByType,
  getCriticalIssues,
  getIssuesForContent,
  getIssueStats,
  compareAudits,
  getAuditHistory,
  getScoreTrend,
} from './repository';

const router = Router();

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isSeoAuditEnabled()) {
    res.status(503).json({
      error: 'SEO Audit is disabled',
      hint: 'Set ENABLE_SEO_AUDIT=true to enable',
    });
    return;
  }
  next();
}

/**
 * POST /api/admin/seo-audit/run
 * Run a full SEO audit.
 */
router.post('/run', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { checks: enabledChecks } = req.body;

    const audit = await runFullAudit(enabledChecks);

    res.json({
      audit,
      message: 'Audit completed',
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/seo-audit/results
 * Get latest audit results.
 */
router.get('/results', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const audit = getLatestAudit();

    if (!audit) {
      res.status(404).json({ error: 'No audit results available. Run an audit first.' });
      return;
    }

    res.json({ audit });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/seo-audit/results/:auditId
 * Get specific audit results.
 */
router.get('/results/:auditId', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { auditId } = req.params;
    const audit = getAudit(auditId);

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    res.json({ audit });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/seo-audit/issues
 * Get all issues from latest audit.
 */
router.get('/issues', requireEnabled, async (req: Request, res: Response) => {
  try {
    const severity = req.query.severity as string | undefined;
    const type = req.query.type as string | undefined;

    let issues;

    if (severity) {
      issues = getIssuesBySeverity(severity as 'critical' | 'high' | 'medium' | 'low');
    } else if (type) {
      issues = getIssuesByType(type as SeoCheckType);
    } else {
      issues = getLatestIssues();
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    res.json({
      issues,
      count: issues.length,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/seo-audit/issues/critical
 * Get critical issues only.
 */
router.get('/issues/critical', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const issues = getCriticalIssues();

    res.json({
      issues,
      count: issues.length,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/seo-audit/content/:contentId
 * Get issues for specific content.
 */
router.get('/content/:contentId', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const issues = getIssuesForContent(contentId);

    res.json({
      contentId,
      issues,
      count: issues.length,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/seo-audit/stats
 * Get issue statistics.
 */
router.get('/stats', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const stats = getIssueStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/seo-audit/checks
 * Get available checks.
 */
router.get('/checks', requireEnabled, async (_req: Request, res: Response) => {
  try {
    res.json({
      checks: DEFAULT_CHECKS,
      count: DEFAULT_CHECKS.length,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/seo-audit/check/:type
 * Run a single check.
 */
router.post('/check/:type', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    const result = await runSingleCheck(type as SeoCheckType);

    if (!result) {
      res.status(400).json({ error: 'Invalid check type' });
      return;
    }

    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/seo-audit/history
 * Get audit history.
 */
router.get('/history', requireEnabled, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const history = getAuditHistory(limit);

    res.json({
      history,
      count: history.length,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/seo-audit/trend
 * Get score trend.
 */
router.get('/trend', requireEnabled, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const trend = getScoreTrend(limit);

    res.json({ trend });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/seo-audit/compare
 * Compare two audits.
 */
router.post('/compare', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { auditId1, auditId2 } = req.body;

    if (!auditId1 || !auditId2) {
      res.status(400).json({ error: 'auditId1 and auditId2 are required' });
      return;
    }

    const comparison = compareAudits(auditId1, auditId2);

    if (!comparison) {
      res.status(404).json({ error: 'One or both audits not found' });
      return;
    }

    res.json({ comparison });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as seoAuditRoutes };
