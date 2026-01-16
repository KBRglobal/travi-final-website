/**
 * Executive Go-Live Report - API Routes
 * Feature Flag: ENABLE_EXECUTIVE_REPORT=false
 */

import { Router, Request, Response, NextFunction } from 'express';
import { isExecutiveReportEnabled, REPORT_CONFIG } from './config';
import {
  generateReport,
  toMarkdown,
  toHtml,
  getReportHistory,
  getStatus,
  clearCache,
} from './generator';
import type { ReportFormat } from './types';

const router = Router();

// Feature flag middleware
function requireEnabled(req: Request, res: Response, next: NextFunction): void {
  if (!isExecutiveReportEnabled()) {
    res.status(503).json({ error: 'Executive report generation is not enabled' });
    return;
  }
  next();
}

// GET /api/ops/executive/report/status - Get report status
router.get('/status', (req: Request, res: Response) => {
  res.json(getStatus());
});

// GET /api/ops/executive/report/config - Get configuration
router.get('/config', (req: Request, res: Response) => {
  res.json({
    enabled: isExecutiveReportEnabled(),
    config: REPORT_CONFIG,
  });
});

// POST /api/ops/executive/report/generate - Generate new report
router.post('/generate', requireEnabled, async (req: Request, res: Response) => {
  const format = (req.query.format as ReportFormat) || REPORT_CONFIG.defaultFormat;
  const requestedBy = req.body.requestedBy as string | undefined;

  const validFormats: ReportFormat[] = ['json', 'markdown', 'html'];
  if (!validFormats.includes(format)) {
    res.status(400).json({ error: 'Invalid format. Use: json, markdown, or html' });
    return;
  }

  try {
    const report = await generateReport(format, requestedBy);

    if (format === 'markdown') {
      res.type('text/markdown').send(toMarkdown(report));
    } else if (format === 'html') {
      res.type('text/html').send(toHtml(report));
    } else {
      res.json(report);
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/ops/executive/report/latest - Get latest report
router.get('/latest', requireEnabled, async (req: Request, res: Response) => {
  const format = (req.query.format as ReportFormat) || 'json';

  try {
    const report = await generateReport(format);

    if (format === 'markdown') {
      res.type('text/markdown').send(toMarkdown(report));
    } else if (format === 'html') {
      res.type('text/html').send(toHtml(report));
    } else {
      res.json(report);
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/ops/executive/report/recommendation - Quick recommendation only
router.get('/recommendation', requireEnabled, async (req: Request, res: Response) => {
  try {
    const report = await generateReport('json');
    res.json({
      recommendation: report.summary.recommendation,
      confidence: report.summary.confidence,
      headline: report.summary.headline,
      overallScore: report.scorecard.overall,
      generatedAt: report.generatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/ops/executive/report/scorecard - Get scorecard only
router.get('/scorecard', requireEnabled, async (req: Request, res: Response) => {
  try {
    const report = await generateReport('json');
    res.json(report.scorecard);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/ops/executive/report/risks - Get risk assessment only
router.get('/risks', requireEnabled, async (req: Request, res: Response) => {
  try {
    const report = await generateReport('json');
    res.json(report.riskAssessment);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/ops/executive/report/actions - Get action items only
router.get('/actions', requireEnabled, async (req: Request, res: Response) => {
  try {
    const report = await generateReport('json');
    res.json({ actionItems: report.actionItems, count: report.actionItems.length });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/ops/executive/report/history - Get report history
router.get('/history', requireEnabled, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const history = getReportHistory(limit);
  res.json({ history, count: history.length });
});

// POST /api/ops/executive/report/cache/clear - Clear cached report
router.post('/cache/clear', requireEnabled, (req: Request, res: Response) => {
  clearCache();
  res.json({ success: true });
});

export default router;
