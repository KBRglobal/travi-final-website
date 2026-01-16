/**
 * Platform State — Routes
 *
 * Single Source of Truth API endpoints
 */

import { Hono } from 'hono';
import { getPlatformStateService } from './service';
import type { IntentRequest } from './types';
import type { IntentType } from '../platform-contract';

const app = new Hono();

/**
 * Check if service is enabled
 */
function checkEnabled(): boolean {
  return getPlatformStateService().isEnabled();
}

// ============================================================
// SNAPSHOT ENDPOINTS
// ============================================================

/**
 * GET /api/platform/snapshot
 * Get full platform state snapshot
 */
app.get('/snapshot', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Platform State not enabled' }, 503);
  }

  try {
    const forceRefresh = c.req.query('refresh') === 'true';
    const snapshot = await getPlatformStateService().getSnapshot(forceRefresh);
    return c.json(snapshot);
  } catch (error) {
    return c.json({
      error: 'Failed to get snapshot',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/platform/health
 * Quick health summary
 */
app.get('/health', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Platform State not enabled' }, 503);
  }

  try {
    const summary = await getPlatformStateService().getHealthSummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to get health',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================================
// AVAILABILITY ENDPOINTS
// ============================================================

/**
 * GET /api/platform/availability
 * Get feature availability matrix
 */
app.get('/availability', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Platform State not enabled' }, 503);
  }

  try {
    const matrix = await getPlatformStateService().getAvailability();
    return c.json(matrix);
  } catch (error) {
    return c.json({
      error: 'Failed to get availability',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/platform/availability/:featureId
 * Get availability for specific feature
 */
app.get('/availability/:featureId', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Platform State not enabled' }, 503);
  }

  try {
    const featureId = c.req.param('featureId');
    const matrix = await getPlatformStateService().getAvailability();
    const feature = matrix.features.find(f => f.featureId === featureId);

    if (!feature) {
      return c.json({ error: 'Feature not found' }, 404);
    }

    return c.json({
      systemHealth: matrix.systemHealth,
      feature,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to get feature availability',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================================
// INTENT GATE (can-i API)
// ============================================================

const VALID_INTENTS: IntentType[] = [
  'publish_content',
  'unpublish_content',
  'go_live',
  'go_dark',
  'regenerate',
  'deploy',
  'migrate',
  'bulk_update',
  'delete_content',
  'override_governance',
  'change_autonomy',
  'export_data',
  'import_data',
];

/**
 * POST /api/platform/can-i
 * Evaluate if an intent is allowed
 */
app.post('/can-i', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Platform State not enabled' }, 503);
  }

  try {
    const body = await c.req.json() as IntentRequest;

    // Validate intent
    if (!body.intent) {
      return c.json({ error: 'intent is required' }, 400);
    }

    if (!VALID_INTENTS.includes(body.intent)) {
      return c.json({
        error: 'Invalid intent',
        validIntents: VALID_INTENTS,
      }, 400);
    }

    const response = await getPlatformStateService().canI(body);
    return c.json(response);
  } catch (error) {
    return c.json({
      error: 'Failed to evaluate intent',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/platform/can-i/:intent
 * Quick intent check (GET version)
 */
app.get('/can-i/:intent', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Platform State not enabled' }, 503);
  }

  try {
    const intent = c.req.param('intent') as IntentType;

    if (!VALID_INTENTS.includes(intent)) {
      return c.json({
        error: 'Invalid intent',
        validIntents: VALID_INTENTS,
      }, 400);
    }

    const response = await getPlatformStateService().canI({ intent });
    return c.json(response);
  } catch (error) {
    return c.json({
      error: 'Failed to evaluate intent',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================================
// CONTRADICTION ENDPOINTS
// ============================================================

/**
 * GET /api/platform/contradictions
 * Get contradiction report
 */
app.get('/contradictions', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Platform State not enabled' }, 503);
  }

  try {
    const report = await getPlatformStateService().getContradictions();
    return c.json(report);
  } catch (error) {
    return c.json({
      error: 'Failed to get contradictions',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================================
// COHERENCE ENDPOINTS
// ============================================================

/**
 * GET /api/platform/coherence
 * Get overall system coherence
 */
app.get('/coherence', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Platform State not enabled' }, 503);
  }

  try {
    const [snapshot, contradictions] = await Promise.all([
      getPlatformStateService().getSnapshot(),
      getPlatformStateService().getContradictions(),
    ]);

    return c.json({
      timestamp: new Date(),
      health: snapshot.health,
      healthScore: snapshot.healthScore,
      coherence: contradictions.overallCoherence,
      coherenceScore: contradictions.coherenceScore,
      contradictionCount: contradictions.contradictions.length,
      summary: snapshot.summary,
      canOperate: snapshot.summary.canOperate,
      canGoLive: snapshot.summary.canGoLive,
      requiresAttention: snapshot.summary.requiresAttention,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to get coherence',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================================
// DEGRADED MODE CHECK
// ============================================================

/**
 * GET /api/platform/degraded
 * Check if system is in degraded mode
 */
app.get('/degraded', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Platform State not enabled' }, 503);
  }

  try {
    const snapshot = await getPlatformStateService().getSnapshot();
    const isDegraded = snapshot.health !== 'healthy';

    return c.json({
      degraded: isDegraded,
      health: snapshot.health,
      reasons: isDegraded ? [
        snapshot.incidents.activeCritical > 0 ? 'Active critical incidents' : null,
        snapshot.incidents.activeHigh > 0 ? 'Active high-severity incidents' : null,
        snapshot.autonomy.mode !== 'normal' ? `Autonomy in ${snapshot.autonomy.mode} mode` : null,
        snapshot.readiness.score < 80 ? `Low readiness score (${snapshot.readiness.score})` : null,
      ].filter(Boolean) : [],
      restrictions: snapshot.autonomy.restrictions,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to check degraded status',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export default app;
