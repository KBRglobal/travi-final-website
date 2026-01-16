/**
 * Enterprise Intelligence Hub - Intelligence Explainability API
 *
 * Unified API for accessing intelligence, explanations, and insights.
 * Zero coupling to internal systems — adapter-based access only.
 */

import { Hono } from 'hono';

// Signal Registry
import { getSignalRegistry, refreshAllSignals } from './signals/registry';
import type { SignalQuery } from './signals/types';

// Decision Trace Engine
import { getDecisionRepository, resolveExplanation } from './decisions';
import type { ExplanationRequest } from './decisions/types';

// Correlation Engine
import { runCorrelationAnalysis, getActiveAnomalies, getStrongCorrelations } from './correlation';
import { getSignalCorrelator } from './correlation/correlator';
import { getAnomalyDetector } from './correlation/anomaly-detector';

// Executive Summary
import executiveRoutes from './executive/routes';
import { createSummary, getSystemStatus } from './executive';

const app = new Hono();

// ============================================================
// HEALTH & STATUS
// ============================================================

/**
 * GET /
 * Hub status and capabilities
 */
app.get('/', (c) => {
  const registry = getSignalRegistry();
  const correlator = getSignalCorrelator();
  const detector = getAnomalyDetector();

  return c.json({
    name: 'Enterprise Intelligence Hub',
    version: '1.0.0',
    status: 'operational',
    capabilities: {
      signals: registry.isEnabled(),
      decisions: process.env.ENABLE_DECISION_EXPLAINABILITY === 'true',
      correlation: correlator.isEnabled(),
      anomalyDetection: detector.isEnabled(),
      executiveSummary: process.env.ENABLE_EXECUTIVE_SUMMARY === 'true',
    },
    endpoints: {
      signals: '/signals',
      decisions: '/decisions',
      correlations: '/correlations',
      anomalies: '/anomalies',
      executive: '/executive',
      explain: '/explain',
    },
  });
});

// ============================================================
// SIGNALS
// ============================================================

/**
 * GET /signals
 * Query unified signals
 */
app.get('/signals', (c) => {
  const registry = getSignalRegistry();

  const query: SignalQuery = {
    limit: parseInt(c.req.query('limit') || '100', 10),
  };

  if (c.req.query('source')) {
    query.sources = c.req.query('source')!.split(',') as SignalQuery['sources'];
  }
  if (c.req.query('category')) {
    query.categories = c.req.query('category')!.split(',') as SignalQuery['categories'];
  }
  if (c.req.query('severity')) {
    query.severities = c.req.query('severity')!.split(',') as SignalQuery['severities'];
  }
  if (c.req.query('entityId')) {
    query.entityId = c.req.query('entityId');
  }
  if (c.req.query('since')) {
    query.since = new Date(c.req.query('since')!);
  }

  const signals = registry.querySignals(query);

  return c.json({
    signals,
    count: signals.length,
    query,
  });
});

/**
 * GET /signals/:id
 * Get a specific signal
 */
app.get('/signals/:id', (c) => {
  const id = c.req.param('id');
  const registry = getSignalRegistry();
  const signal = registry.getSignal(id);

  if (!signal) {
    return c.json({ error: 'Signal not found' }, 404);
  }

  return c.json(signal);
});

/**
 * POST /signals/refresh
 * Refresh signals from all adapters
 */
app.post('/signals/refresh', async (c) => {
  const result = await refreshAllSignals();
  return c.json(result);
});

/**
 * GET /signals/sources
 * List available signal sources
 */
app.get('/signals/sources', (c) => {
  const registry = getSignalRegistry();
  const adapters = registry.listAdapters();

  return c.json({
    sources: adapters,
    count: adapters.length,
  });
});

// ============================================================
// DECISIONS
// ============================================================

/**
 * GET /decisions
 * Query decision traces
 */
app.get('/decisions', (c) => {
  const repo = getDecisionRepository();

  const query: Record<string, unknown> = {
    limit: parseInt(c.req.query('limit') || '50', 10),
  };

  if (c.req.query('type')) {
    query.types = c.req.query('type')!.split(',');
  }
  if (c.req.query('entityId')) {
    query.entityId = c.req.query('entityId');
  }
  if (c.req.query('minConfidence')) {
    query.minConfidence = parseInt(c.req.query('minConfidence')!, 10);
  }
  if (c.req.query('since')) {
    query.since = new Date(c.req.query('since')!);
  }

  const decisions = repo.query(query);

  return c.json({
    decisions,
    count: decisions.length,
  });
});

/**
 * GET /decisions/:id
 * Get a specific decision trace
 */
app.get('/decisions/:id', (c) => {
  const id = c.req.param('id');
  const repo = getDecisionRepository();
  const decision = repo.get(id);

  if (!decision) {
    return c.json({ error: 'Decision not found' }, 404);
  }

  return c.json(decision);
});

// ============================================================
// EXPLAINABILITY (Core API)
// ============================================================

/**
 * POST /explain
 * Explain why something happened
 */
app.post('/explain', async (c) => {
  const body = await c.req.json() as ExplanationRequest;

  if (!body.question) {
    return c.json({ error: 'question is required' }, 400);
  }

  const response = await resolveExplanation(body);

  return c.json(response);
});

/**
 * GET /explain/entity/:entityId
 * Explain all decisions for an entity
 */
app.get('/explain/entity/:entityId', (c) => {
  const entityId = c.req.param('entityId');
  const repo = getDecisionRepository();
  const decisions = repo.query({ entityId });

  if (decisions.length === 0) {
    return c.json({
      entityId,
      message: 'No decisions recorded for this entity',
      decisions: [],
    });
  }

  return c.json({
    entityId,
    decisionCount: decisions.length,
    decisions: decisions.map(d => ({
      id: d.id,
      type: d.decision.type,
      outcome: d.decision.outcome,
      summary: d.summary,
      timestamp: d.decision.timestamp,
    })),
  });
});

/**
 * GET /explain/decision/:decisionId
 * Get full explanation for a decision
 */
app.get('/explain/decision/:decisionId', (c) => {
  const decisionId = c.req.param('decisionId');
  const repo = getDecisionRepository();
  const trace = repo.get(decisionId);

  if (!trace) {
    return c.json({ error: 'Decision not found' }, 404);
  }

  return c.json({
    decision: trace.decision,
    explanation: {
      summary: trace.summary,
      causalChain: trace.causalChain,
      recommendations: trace.recommendations,
      confidence: trace.confidence,
    },
    relatedSignals: trace.relatedSignals,
    timestamp: trace.decision.timestamp,
  });
});

// ============================================================
// CORRELATIONS
// ============================================================

/**
 * GET /correlations
 * Get detected correlations
 */
app.get('/correlations', (c) => {
  const minStrength = parseInt(c.req.query('minStrength') || '50', 10);
  const correlations = getStrongCorrelations(minStrength);

  return c.json({
    correlations,
    count: correlations.length,
    minStrength,
  });
});

/**
 * POST /correlations/analyze
 * Run correlation analysis
 */
app.post('/correlations/analyze', async (c) => {
  const lookbackHours = parseInt(c.req.query('lookback') || '24', 10);
  const lookbackMs = lookbackHours * 3600000;

  const { correlations, anomalies } = await runCorrelationAnalysis(lookbackMs);

  return c.json({
    correlations,
    anomalies,
    correlationCount: correlations.length,
    anomalyCount: anomalies.length,
    lookbackHours,
  });
});

// ============================================================
// ANOMALIES
// ============================================================

/**
 * GET /anomalies
 * Get active anomalies
 */
app.get('/anomalies', (c) => {
  const detector = getAnomalyDetector();

  const severities = c.req.query('severity')?.split(',');
  const minDeviation = c.req.query('minDeviation')
    ? parseFloat(c.req.query('minDeviation')!)
    : undefined;

  let anomalies = getActiveAnomalies();

  if (severities) {
    anomalies = anomalies.filter(a => severities.includes(a.severity));
  }
  if (minDeviation !== undefined) {
    anomalies = anomalies.filter(a => a.deviation >= minDeviation);
  }

  return c.json({
    anomalies,
    count: anomalies.length,
  });
});

/**
 * POST /anomalies/:id/resolve
 * Mark an anomaly as resolved
 */
app.post('/anomalies/:id/resolve', (c) => {
  const id = c.req.param('id');
  const detector = getAnomalyDetector();
  const resolved = detector.resolve(id);

  if (!resolved) {
    return c.json({ error: 'Anomaly not found' }, 404);
  }

  return c.json({ success: true, id });
});

// ============================================================
// EXECUTIVE SUMMARY (sub-router)
// ============================================================

app.route('/executive', executiveRoutes);

// ============================================================
// QUICK STATUS
// ============================================================

/**
 * GET /status
 * Quick system status
 */
app.get('/status', (c) => {
  const status = getSystemStatus();
  return c.json(status);
});

/**
 * POST /summary
 * Generate a new executive summary
 */
app.post('/summary', async (c) => {
  const lookbackDays = parseInt(c.req.query('lookback') || '7', 10);
  const summary = await createSummary(lookbackDays);
  return c.json(summary);
});

export default app;
