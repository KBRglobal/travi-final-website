/**
 * Unified Metrics API Routes
 *
 * REST API for accessing metrics, dashboards, and insights.
 */

import { Router, Request, Response } from 'express';
import { log } from '../lib/logger';
import {
  isUnifiedMetricsEnabled,
  getUnifiedMetricsStatus,
  runMetricsAnalysisCycle,
  getMetricsRegistry,
  getMetricDefinition,
  getMetricsByCategory,
  getMetricsForDashboard,
  calculateContentPerformance,
  createEmptySignals,
  getFunnelSystem,
  analyzeFunnel,
  PREDEFINED_FUNNELS,
  getOpportunitiesEngine,
  getTopOpportunities,
  getOpportunitySummary,
  getAnomalyDetector,
  detectAnomalies,
  getAnomalies,
  getSnapshotStore,
  createSnapshot,
  analyzeTrend,
  compareWeekOverWeek,
  getExplainabilityService,
  getDashboardService,
  generateDashboard,
} from './index';

const router = Router();
const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[MetricsAPI] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[MetricsAPI] ${msg}`, data),
};

// Middleware to check if unified metrics is enabled
const requireEnabled = (req: Request, res: Response, next: () => void) => {
  if (!isUnifiedMetricsEnabled()) {
    return res.status(503).json({
      error: 'Unified Metrics is not enabled',
      message: 'Set ENABLE_UNIFIED_METRICS=true to enable',
    });
  }
  next();
};

// =====================================================
// SYSTEM STATUS
// =====================================================

/**
 * GET /api/metrics/status
 * Get unified metrics system status
 */
router.get('/status', (req, res) => {
  const status = getUnifiedMetricsStatus();
  res.json(status);
});

/**
 * POST /api/metrics/analyze
 * Run metrics analysis cycle
 */
router.post('/analyze', requireEnabled, async (req, res) => {
  try {
    const result = await runMetricsAnalysisCycle();
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Analysis cycle failed', { error });
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// =====================================================
// METRICS REGISTRY
// =====================================================

/**
 * GET /api/metrics/definitions
 * Get all metric definitions
 */
router.get('/definitions', requireEnabled, (req, res) => {
  const registry = getMetricsRegistry();
  const definitions = registry.getAllDefinitions();
  res.json({ definitions, count: definitions.length });
});

/**
 * GET /api/metrics/definitions/:id
 * Get specific metric definition
 */
router.get('/definitions/:id', requireEnabled, (req, res) => {
  const definition = getMetricDefinition(req.params.id);
  if (!definition) {
    return res.status(404).json({ error: 'Metric not found' });
  }
  res.json(definition);
});

/**
 * GET /api/metrics/definitions/category/:category
 * Get metrics by category
 */
router.get('/definitions/category/:category', requireEnabled, (req, res) => {
  const metrics = getMetricsByCategory(req.params.category);
  res.json({ metrics, count: metrics.length });
});

/**
 * GET /api/metrics/values/:id
 * Get current value for a metric
 */
router.get('/values/:id', requireEnabled, (req, res) => {
  const registry = getMetricsRegistry();
  const { entityType = 'system', entityId } = req.query;

  const value = registry.getCurrentValue(
    req.params.id,
    entityType as any,
    entityId as string | undefined
  );

  if (!value) {
    return res.status(404).json({ error: 'No data for metric' });
  }

  const snapshot = registry.createSnapshot(
    req.params.id,
    entityType as any,
    entityId as string | undefined
  );

  res.json({ value, snapshot });
});

// =====================================================
// DASHBOARDS
// =====================================================

/**
 * GET /api/metrics/dashboards/:role
 * Get dashboard data for role (pm, seo, ops)
 */
router.get('/dashboards/:role', requireEnabled, async (req, res) => {
  const role = req.params.role as 'pm' | 'seo' | 'ops';
  if (!['pm', 'seo', 'ops'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Use: pm, seo, or ops' });
  }

  try {
    const dashboard = await generateDashboard(role);
    res.json(dashboard);
  } catch (error) {
    logger.error('Dashboard generation failed', { role, error });
    res.status(500).json({ error: 'Dashboard generation failed' });
  }
});

/**
 * GET /api/metrics/dashboards/:role/config
 * Get dashboard configuration
 */
router.get('/dashboards/:role/config', requireEnabled, (req, res) => {
  const role = req.params.role as 'pm' | 'seo' | 'ops';
  const config = getDashboardService().getConfig(role);
  res.json(config);
});

// =====================================================
// CONTENT PERFORMANCE
// =====================================================

/**
 * POST /api/metrics/content/:id/performance
 * Calculate content performance
 */
router.post('/content/:id/performance', requireEnabled, (req, res) => {
  const contentId = req.params.id;
  const signals = { ...createEmptySignals(), ...req.body };

  try {
    const result = calculateContentPerformance(contentId, signals);
    res.json(result);
  } catch (error) {
    logger.error('Performance calculation failed', { contentId, error });
    res.status(500).json({ error: 'Performance calculation failed' });
  }
});

// =====================================================
// FUNNELS
// =====================================================

/**
 * GET /api/metrics/funnels
 * Get all funnel definitions
 */
router.get('/funnels', requireEnabled, (req, res) => {
  const funnels = getFunnelSystem().getAllFunnels();
  res.json({ funnels, count: funnels.length });
});

/**
 * GET /api/metrics/funnels/:id
 * Get funnel definition
 */
router.get('/funnels/:id', requireEnabled, (req, res) => {
  const funnel = getFunnelSystem().getFunnel(req.params.id);
  if (!funnel) {
    return res.status(404).json({ error: 'Funnel not found' });
  }
  res.json(funnel);
});

/**
 * GET /api/metrics/funnels/:id/analysis
 * Analyze funnel performance
 */
router.get('/funnels/:id/analysis', requireEnabled, (req, res) => {
  const { days = '7' } = req.query;
  const daysNum = parseInt(days as string, 10);

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - daysNum * 24 * 60 * 60 * 1000);

  const analysis = analyzeFunnel(req.params.id, startDate, endDate);
  if (!analysis) {
    return res.status(404).json({ error: 'Funnel not found or no data' });
  }

  res.json(analysis);
});

/**
 * POST /api/metrics/funnels/:id/event
 * Record a funnel event
 */
router.post('/funnels/:id/event', requireEnabled, (req, res) => {
  const { stageId, sessionId, userId, contentId, channel, metadata } = req.body;

  if (!stageId || !sessionId) {
    return res.status(400).json({ error: 'stageId and sessionId are required' });
  }

  getFunnelSystem().recordEvent({
    funnelId: req.params.id,
    stageId,
    sessionId,
    userId,
    contentId,
    channel,
    timestamp: new Date(),
    metadata,
  });

  res.json({ success: true });
});

// =====================================================
// OPPORTUNITIES
// =====================================================

/**
 * GET /api/metrics/opportunities
 * Get growth opportunities
 */
router.get('/opportunities', requireEnabled, (req, res) => {
  const { limit = '10', category, status } = req.query;
  const engine = getOpportunitiesEngine();

  let opportunities = engine.getAllOpportunities();

  if (category) {
    opportunities = opportunities.filter(o => o.category === category);
  }
  if (status) {
    opportunities = opportunities.filter(o => o.status === status);
  }

  opportunities = opportunities
    .sort((a, b) => b.score - a.score)
    .slice(0, parseInt(limit as string, 10));

  res.json({
    opportunities,
    count: opportunities.length,
    summary: getOpportunitySummary(),
  });
});

/**
 * GET /api/metrics/opportunities/:id
 * Get specific opportunity
 */
router.get('/opportunities/:id', requireEnabled, (req, res) => {
  const opportunities = getOpportunitiesEngine().getAllOpportunities();
  const opportunity = opportunities.find(o => o.id === req.params.id);

  if (!opportunity) {
    return res.status(404).json({ error: 'Opportunity not found' });
  }

  res.json(opportunity);
});

/**
 * PATCH /api/metrics/opportunities/:id/status
 * Update opportunity status
 */
router.patch('/opportunities/:id/status', requireEnabled, (req, res) => {
  const { status } = req.body;
  if (!['new', 'acknowledged', 'in_progress', 'completed', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const success = getOpportunitiesEngine().updateStatus(req.params.id, status);
  if (!success) {
    return res.status(404).json({ error: 'Opportunity not found' });
  }

  res.json({ success: true });
});

// =====================================================
// ANOMALIES
// =====================================================

/**
 * GET /api/metrics/anomalies
 * Get detected anomalies
 */
router.get('/anomalies', requireEnabled, (req, res) => {
  const { severity } = req.query;
  let anomalies = getAnomalies();

  if (severity && ['info', 'warning', 'critical'].includes(severity as string)) {
    anomalies = getAnomalyDetector().getBySeverity(severity as any);
  }

  res.json({
    anomalies,
    count: anomalies.length,
  });
});

/**
 * POST /api/metrics/anomalies/detect
 * Run anomaly detection
 */
router.post('/anomalies/detect', requireEnabled, (req, res) => {
  const result = detectAnomalies();
  res.json({
    success: true,
    ...result,
  });
});

// =====================================================
// SNAPSHOTS & TRENDS
// =====================================================

/**
 * GET /api/metrics/trends/:id
 * Get trend analysis for a metric
 */
router.get('/trends/:id', requireEnabled, (req, res) => {
  const { days = '30' } = req.query;
  const trend = analyzeTrend(req.params.id, parseInt(days as string, 10));

  if (!trend) {
    return res.status(404).json({ error: 'No trend data available' });
  }

  res.json(trend);
});

/**
 * GET /api/metrics/comparison/wow
 * Week over week comparison
 */
router.get('/comparison/wow', requireEnabled, (req, res) => {
  const { metrics } = req.query;
  let metricIds: string[];

  if (metrics) {
    metricIds = (metrics as string).split(',');
  } else {
    // Default metrics
    metricIds = [
      'traffic.total_sessions',
      'engagement.bounce_rate',
      'seo.clicks',
      'aeo.citations',
      'conversion.conversion_rate',
    ];
  }

  const comparison = compareWeekOverWeek(metricIds);
  res.json(comparison);
});

/**
 * POST /api/metrics/snapshots
 * Create a point-in-time snapshot
 */
router.post('/snapshots', requireEnabled, (req, res) => {
  const { metrics, description } = req.body;

  if (!metrics || !Array.isArray(metrics)) {
    return res.status(400).json({ error: 'metrics array is required' });
  }

  const snapshot = createSnapshot(metrics, description);
  res.json(snapshot);
});

/**
 * GET /api/metrics/snapshots
 * Get all snapshots
 */
router.get('/snapshots', requireEnabled, (req, res) => {
  const { type } = req.query;
  const store = getSnapshotStore();

  let snapshots = store.getAllSnapshots();
  if (type && ['point', 'aggregated', 'comparative'].includes(type as string)) {
    snapshots = store.getSnapshotsByType(type as any);
  }

  res.json({
    snapshots,
    count: snapshots.length,
  });
});

// =====================================================
// EXPLAINABILITY
// =====================================================

/**
 * GET /api/metrics/explanations/:id
 * Get explanation by ID
 */
router.get('/explanations/:id', requireEnabled, (req, res) => {
  const explanation = getExplainabilityService().getExplanation(req.params.id);

  if (!explanation) {
    return res.status(404).json({ error: 'Explanation not found' });
  }

  res.json(explanation);
});

/**
 * GET /api/metrics/explanations
 * Get all explanations
 */
router.get('/explanations', requireEnabled, (req, res) => {
  const explanations = getExplainabilityService().getAllExplanations();
  res.json({
    explanations,
    count: explanations.length,
  });
});

export default router;
