/**
 * Go-Live Switch v2 - Routes
 *
 * ⚠️ EXPERIMENTAL - NOT REGISTERED ⚠️
 *
 * STATUS: This route file is NOT currently registered in server/routes.ts
 * Feature Flag: ENABLE_GO_LIVE_V2=false (disabled by default)
 *
 * This is an experimental alternative to the main go-live system.
 * The authoritative/production go-live system is: server/go-live/
 *
 * Purpose: Simplified "Go-Live Switch v2" - single endpoint to check readiness
 *
 * Before enabling:
 * 1. Ensure ENABLE_GO_LIVE_V2=true
 * 2. Register routes in server/routes.ts
 * 3. Coordinate with go-live/, go-live-forensics/, and go-live-control-plane/
 *
 * See: server/ROUTE_REGISTRATION_STATUS.md for go-live systems comparison
 */

import { Hono } from 'hono';
import { getGoLiveService } from './service';
import type { OverrideRequest } from './types';

const app = new Hono();

/**
 * Check if enabled
 */
function checkEnabled() {
  return process.env.ENABLE_GO_LIVE_V2 === 'true';
}

/**
 * GET /
 * Get basic service info
 */
app.get('/', (c) => {
  const enabled = checkEnabled();

  return c.json({
    name: 'Go-Live Switch v2',
    enabled,
    endpoints: enabled ? {
      status: 'GET /status',
      override: 'POST /override',
      clearOverride: 'DELETE /override',
      history: 'GET /history',
    } : null,
  });
});

/**
 * GET /status
 * Get go-live status with all checks
 */
app.get('/status', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Go-Live Switch is disabled' }, 403);
  }

  const service = getGoLiveService();
  const status = await service.getStatus();

  return c.json(status);
});

/**
 * GET /ready
 * Simple ready check (returns 200 if ready, 503 if not)
 */
app.get('/ready', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Go-Live Switch is disabled' }, 403);
  }

  const service = getGoLiveService();
  const status = await service.getStatus();

  if (status.ready) {
    return c.json({ ready: true, status: status.status });
  }

  return c.json(
    { ready: false, status: status.status, blockers: status.blockers.length },
    503
  );
});

/**
 * POST /override
 * Set manual override
 */
app.post('/override', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Go-Live Switch is disabled' }, 403);
  }

  const body = await c.req.json() as OverrideRequest;

  if (!body.reason || !body.overriddenBy) {
    return c.json({ error: 'reason and overriddenBy are required' }, 400);
  }

  if (body.reason.length < 10) {
    return c.json({ error: 'reason must be at least 10 characters' }, 400);
  }

  const service = getGoLiveService();
  const override = service.setOverride(body);

  return c.json({
    success: true,
    override,
    message: 'Go-live override has been set',
  });
});

/**
 * DELETE /override
 * Clear override
 */
app.delete('/override', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Go-Live Switch is disabled' }, 403);
  }

  const service = getGoLiveService();
  const cleared = service.clearOverride();

  if (!cleared) {
    return c.json({ error: 'No active override to clear' }, 400);
  }

  return c.json({
    success: true,
    message: 'Override has been cleared',
  });
});

/**
 * GET /override
 * Get current override status
 */
app.get('/override', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Go-Live Switch is disabled' }, 403);
  }

  const service = getGoLiveService();
  const override = service.getOverride();

  return c.json({
    active: !!override,
    override,
  });
});

/**
 * GET /history
 * Get status history
 */
app.get('/history', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Go-Live Switch is disabled' }, 403);
  }

  const limit = parseInt(c.req.query('limit') || '20', 10);
  const service = getGoLiveService();
  const history = service.getHistory(limit);

  return c.json({
    history,
    count: history.length,
  });
});

/**
 * GET /checks
 * Run and return individual checks
 */
app.get('/checks', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Go-Live Switch is disabled' }, 403);
  }

  const service = getGoLiveService();
  const status = await service.getStatus();

  return c.json({
    checks: status.checks,
    summary: status.summary,
  });
});

export default app;
