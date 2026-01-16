/**
 * Platform Command & Accountability Layer (PCAL) - API Routes
 * Feature Flag: ENABLE_PCAL=false
 */

import { Router, Request, Response, NextFunction } from 'express';
import { isPCALEnabled, PCAL_CONFIG } from './config';
import {
  ingestDecision,
  ingestManualDecision,
  ingestOverride,
  getDecision,
  getRecentDecisions,
  getDecisionsBySource,
  getDecisionsByOutcome,
  getOverrides,
  getHighRiskDecisions,
  getDecisionStats,
  exportDecisions,
} from './decision-stream';
import {
  resolveAuthorityChain,
  answerAccountability,
  recordApproval,
  getRecentApprovals,
  getAuthorityStats,
  getActiveOverrides,
  recordOverride as recordAuthorityOverride,
} from './authority-chain';
import {
  detectPatterns,
  getPatterns,
  captureMemorySnapshot,
  getRepeatedMistakes,
  getSilentRegressions,
  getAllSubsystemHealth,
  autoLinkIncidents,
} from './platform-memory';
import {
  generateNarrative,
  generateRiskReport,
  getNarrativeHistory,
  getRiskReportHistory,
} from './narrative';
import {
  runFeedbackCycle,
  getPendingRecommendations,
  getAppliedRecommendations,
  acknowledgeRecommendation,
  getFeedbackStats,
  getState as getFeedbackState,
} from './feedback-loop';
import type { DecisionScope, DecisionOutcome, DecisionSource, NarrativeQuery } from './types';

const router = Router();

// Feature flag middleware
function requireEnabled(req: Request, res: Response, next: NextFunction): void {
  if (!isPCALEnabled()) {
    res.status(503).json({ error: 'PCAL is not enabled' });
    return;
  }
  next();
}

// ============================================================================
// Status & Configuration
// ============================================================================

router.get('/status', (req: Request, res: Response) => {
  const stats = isPCALEnabled() ? getDecisionStats() : null;
  res.json({
    enabled: isPCALEnabled(),
    decisionsTracked: stats?.total || 0,
    config: PCAL_CONFIG,
  });
});

router.get('/config', (req: Request, res: Response) => {
  res.json({ enabled: isPCALEnabled(), config: PCAL_CONFIG });
});

// ============================================================================
// Decision Stream (Phase 1)
// ============================================================================

router.post('/decisions', requireEnabled, (req: Request, res: Response) => {
  const { source, scope, outcome, reason, options } = req.body;

  if (!source || !scope || !outcome || !reason) {
    res.status(400).json({ error: 'source, scope, outcome, and reason are required' });
    return;
  }

  try {
    const decision = ingestDecision(
      source as DecisionSource,
      scope as DecisionScope,
      outcome as DecisionOutcome,
      reason,
      options || {}
    );
    res.status(201).json(decision);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/decisions/manual', requireEnabled, (req: Request, res: Response) => {
  const { scope, outcome, reason, actor, scopeId } = req.body;

  if (!scope || !outcome || !reason || !actor) {
    res.status(400).json({ error: 'scope, outcome, reason, and actor are required' });
    return;
  }

  const decision = ingestManualDecision(scope, outcome, reason, actor, scopeId);
  res.status(201).json(decision);
});

router.get('/decisions', requireEnabled, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ decisions: getRecentDecisions(limit) });
});

router.get('/decisions/:id', requireEnabled, (req: Request, res: Response) => {
  const decision = getDecision(req.params.id);
  if (!decision) {
    res.status(404).json({ error: 'Decision not found' });
    return;
  }
  res.json(decision);
});

router.get('/decisions/source/:source', requireEnabled, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ decisions: getDecisionsBySource(req.params.source as DecisionSource, limit) });
});

router.get('/decisions/outcome/:outcome', requireEnabled, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ decisions: getDecisionsByOutcome(req.params.outcome as DecisionOutcome, limit) });
});

router.get('/decisions/overrides', requireEnabled, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ overrides: getOverrides(limit) });
});

router.get('/decisions/high-risk', requireEnabled, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ decisions: getHighRiskDecisions(limit) });
});

router.get('/decisions/stats', requireEnabled, (req: Request, res: Response) => {
  res.json(getDecisionStats());
});

router.get('/decisions/export', requireEnabled, (req: Request, res: Response) => {
  res.json({ decisions: exportDecisions(), exportedAt: new Date() });
});

// ============================================================================
// Authority Chain (Phase 2)
// ============================================================================

router.get('/authority/:decisionId', requireEnabled, async (req: Request, res: Response) => {
  try {
    const chain = await resolveAuthorityChain(req.params.decisionId);
    if (!chain) {
      res.status(404).json({ error: 'Decision not found' });
      return;
    }
    res.json(chain);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/accountability/:decisionId', requireEnabled, (req: Request, res: Response) => {
  const answers = answerAccountability(req.params.decisionId);
  if (answers.length === 0) {
    res.status(404).json({ error: 'Decision not found' });
    return;
  }
  res.json({ decisionId: req.params.decisionId, answers });
});

router.post('/approvals', requireEnabled, (req: Request, res: Response) => {
  const { approvedBy, type, scope, reason } = req.body;

  if (!approvedBy || !type || !scope) {
    res.status(400).json({ error: 'approvedBy, type, and scope are required' });
    return;
  }

  const approval = recordApproval(approvedBy, type, scope, reason);
  res.status(201).json(approval);
});

router.get('/approvals', requireEnabled, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ approvals: getRecentApprovals(limit) });
});

router.post('/overrides', requireEnabled, (req: Request, res: Response) => {
  const { decisionId, overriddenBy, reason, justification, ttlMs } = req.body;

  if (!decisionId || !overriddenBy || !reason || !justification) {
    res.status(400).json({ error: 'decisionId, overriddenBy, reason, and justification are required' });
    return;
  }

  const override = recordAuthorityOverride(decisionId, overriddenBy, reason, justification, ttlMs);
  res.status(201).json(override);
});

router.get('/overrides/active', requireEnabled, (req: Request, res: Response) => {
  res.json({ overrides: getActiveOverrides() });
});

router.get('/authority/stats', requireEnabled, (req: Request, res: Response) => {
  res.json(getAuthorityStats());
});

// ============================================================================
// Platform Memory (Phase 3)
// ============================================================================

router.post('/memory/detect-patterns', requireEnabled, (req: Request, res: Response) => {
  const patterns = detectPatterns();
  res.json({ detected: patterns.length, patterns });
});

router.get('/memory/patterns', requireEnabled, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  res.json({ patterns: getPatterns(limit) });
});

router.get('/memory/snapshot', requireEnabled, (req: Request, res: Response) => {
  const snapshot = captureMemorySnapshot();
  res.json(snapshot);
});

router.get('/memory/mistakes', requireEnabled, (req: Request, res: Response) => {
  res.json({ mistakes: getRepeatedMistakes() });
});

router.get('/memory/regressions', requireEnabled, (req: Request, res: Response) => {
  res.json({ regressions: getSilentRegressions() });
});

router.get('/memory/health', requireEnabled, (req: Request, res: Response) => {
  res.json({ subsystems: getAllSubsystemHealth() });
});

router.post('/memory/link-incidents', requireEnabled, async (req: Request, res: Response) => {
  try {
    const links = await autoLinkIncidents();
    res.json({ linked: links.length, links });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============================================================================
// Narrative Generation (Phase 4)
// ============================================================================

router.post('/narrative', requireEnabled, (req: Request, res: Response) => {
  const { query, context, timeRange } = req.body;

  if (!query) {
    res.status(400).json({ error: 'query is required' });
    return;
  }

  try {
    const narrative = generateNarrative({
      query: query as NarrativeQuery,
      context,
      timeRange: timeRange ? {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end),
      } : undefined,
    });
    res.json(narrative);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/narrative/why-rollout-failed', requireEnabled, (req: Request, res: Response) => {
  const rolloutId = req.query.rolloutId as string;
  const narrative = generateNarrative({
    query: 'why_rollout_failed',
    context: rolloutId ? { rolloutId } : undefined,
  });
  res.json(narrative);
});

router.get('/narrative/why-feature-blocked', requireEnabled, (req: Request, res: Response) => {
  const featureId = req.query.featureId as string;
  const narrative = generateNarrative({
    query: 'why_feature_blocked',
    context: featureId ? { featureId } : undefined,
  });
  res.json(narrative);
});

router.get('/narrative/riskiest-area', requireEnabled, (req: Request, res: Response) => {
  const narrative = generateNarrative({ query: 'riskiest_area' });
  res.json(narrative);
});

router.get('/narrative/safety-trend', requireEnabled, (req: Request, res: Response) => {
  const narrative = generateNarrative({ query: 'safety_trend' });
  res.json(narrative);
});

router.get('/narrative/history', requireEnabled, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  res.json({ narratives: getNarrativeHistory(limit) });
});

router.get('/risk-report', requireEnabled, (req: Request, res: Response) => {
  const report = generateRiskReport();
  res.json(report);
});

router.get('/risk-report/history', requireEnabled, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  res.json({ reports: getRiskReportHistory(limit) });
});

// ============================================================================
// Feedback Loop (Phase 5)
// ============================================================================

router.post('/feedback/cycle', requireEnabled, (req: Request, res: Response) => {
  const result = runFeedbackCycle();
  res.json(result);
});

router.get('/feedback/recommendations', requireEnabled, (req: Request, res: Response) => {
  res.json({
    pending: getPendingRecommendations(),
    applied: getAppliedRecommendations(),
  });
});

router.post('/feedback/acknowledge/:id', requireEnabled, (req: Request, res: Response) => {
  const { acknowledgedBy } = req.body;

  if (!acknowledgedBy) {
    res.status(400).json({ error: 'acknowledgedBy is required' });
    return;
  }

  const success = acknowledgeRecommendation(req.params.id, acknowledgedBy);
  if (!success) {
    res.status(404).json({ error: 'Recommendation not found' });
    return;
  }

  res.json({ success: true });
});

router.get('/feedback/stats', requireEnabled, (req: Request, res: Response) => {
  res.json(getFeedbackStats());
});

router.get('/feedback/state', requireEnabled, (req: Request, res: Response) => {
  res.json(getFeedbackState());
});

export default router;
