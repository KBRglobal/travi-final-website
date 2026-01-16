/**
 * Enterprise Policy Compliance Engine - Admin API Routes
 */

import { Hono } from 'hono';
import { getPolicyManager } from './policies';
import { runScan, checkPolicy, getViolations, getIssues } from './scanner';
import { getViolationRepository } from './violations';
import type { ScanRequest, PolicyCategory, PolicyScope } from './types';

const app = new Hono();

/**
 * Check if compliance engine is enabled
 */
function checkEnabled() {
  return process.env.ENABLE_COMPLIANCE_ENGINE === 'true';
}

/**
 * GET /
 * Compliance engine status
 */
app.get('/', (c) => {
  const enabled = checkEnabled();
  const policies = getPolicyManager();

  return c.json({
    name: 'Enterprise Policy Compliance Engine',
    enabled,
    stats: enabled ? policies.count() : null,
  });
});

/**
 * GET /status
 * Get overall compliance status
 */
app.get('/status', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const result = runScan();
  const violations = getViolationRepository();

  return c.json({
    timestamp: result.timestamp,
    overallStatus: result.overallStatus,
    summary: result.summary,
    checkedPolicies: result.checkedPolicies,
    activeViolations: violations.getStats().open,
  });
});

/**
 * POST /scan
 * Run a compliance scan
 */
app.post('/scan', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const body = await c.req.json() as ScanRequest;
  const result = runScan(body);

  // Record any violations
  const violations = getViolationRepository();
  for (const r of result.results) {
    if (r.status !== 'compliant') {
      violations.recordFromResult(r);
    }
  }

  return c.json(result);
});

/**
 * GET /violations
 * Get all violations
 */
app.get('/violations', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const violations = getViolationRepository();
  const status = c.req.query('status') as any;
  const severity = c.req.query('severity') as any;
  const category = c.req.query('category') as PolicyCategory;
  const limit = parseInt(c.req.query('limit') || '50', 10);

  const results = violations.query({
    status: status?.split(','),
    severity: severity?.split(','),
    category: category?.split(',') as PolicyCategory[],
    limit,
  });

  return c.json({
    violations: results,
    count: results.length,
    stats: violations.getStats(),
  });
});

/**
 * GET /violations/open
 * Get open violations
 */
app.get('/violations/open', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const violations = getViolationRepository();
  const results = violations.getOpen();

  return c.json({
    violations: results,
    count: results.length,
  });
});

/**
 * GET /violations/critical
 * Get critical violations
 */
app.get('/violations/critical', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const violations = getViolationRepository();
  const results = violations.getCritical();

  return c.json({
    violations: results,
    count: results.length,
  });
});

/**
 * GET /violations/blocking
 * Get violations that block governor
 */
app.get('/violations/blocking', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const violations = getViolationRepository();
  const results = violations.getGovernorBlocking();

  return c.json({
    violations: results,
    count: results.length,
    message: results.length > 0
      ? 'These violations may block publishing/deployments'
      : 'No blocking violations',
  });
});

/**
 * GET /violations/:id
 * Get a specific violation
 */
app.get('/violations/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const id = c.req.param('id');
  const violations = getViolationRepository();
  const violation = violations.get(id);

  if (!violation) {
    return c.json({ error: 'Violation not found' }, 404);
  }

  return c.json(violation);
});

/**
 * POST /violations/:id/acknowledge
 * Acknowledge a violation
 */
app.post('/violations/:id/acknowledge', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const id = c.req.param('id');
  const violations = getViolationRepository();
  const success = violations.acknowledge(id);

  if (!success) {
    return c.json({ error: 'Violation not found or cannot be acknowledged' }, 400);
  }

  return c.json({ success: true, id });
});

/**
 * POST /violations/:id/resolve
 * Mark a violation as resolved
 */
app.post('/violations/:id/resolve', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const id = c.req.param('id');
  const violations = getViolationRepository();
  const success = violations.resolve(id);

  if (!success) {
    return c.json({ error: 'Violation not found or already resolved' }, 400);
  }

  return c.json({ success: true, id });
});

/**
 * POST /violations/:id/waive
 * Waive a violation
 */
app.post('/violations/:id/waive', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const id = c.req.param('id');
  const body = await c.req.json() as { waivedBy: string; reason: string };

  if (!body.waivedBy || !body.reason) {
    return c.json({ error: 'waivedBy and reason are required' }, 400);
  }

  const violations = getViolationRepository();
  const success = violations.waive(id, body.waivedBy, body.reason);

  if (!success) {
    return c.json({ error: 'Violation not found' }, 400);
  }

  return c.json({ success: true, id });
});

/**
 * GET /policies
 * Get all policies
 */
app.get('/policies', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const policies = getPolicyManager();
  const category = c.req.query('category') as PolicyCategory;
  const enabled = c.req.query('enabled');

  let results = policies.getAll();

  if (category) {
    results = results.filter(p => p.category === category);
  }

  if (enabled !== undefined) {
    const isEnabled = enabled === 'true';
    results = results.filter(p => p.enabled === isEnabled);
  }

  return c.json({
    policies: results,
    count: results.length,
    stats: policies.count(),
  });
});

/**
 * GET /policies/:id
 * Get a specific policy
 */
app.get('/policies/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const id = c.req.param('id');
  const policies = getPolicyManager();
  const policy = policies.get(id);

  if (!policy) {
    return c.json({ error: 'Policy not found' }, 404);
  }

  return c.json(policy);
});

/**
 * GET /policies/:id/check
 * Check a specific policy
 */
app.get('/policies/:id/check', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const id = c.req.param('id');
  const entityId = c.req.query('entityId');

  const result = checkPolicy(id, entityId);

  if (!result) {
    return c.json({ error: 'Policy not found or disabled' }, 404);
  }

  return c.json(result);
});

/**
 * GET /stats
 * Get compliance statistics
 */
app.get('/stats', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Compliance engine is disabled' }, 403);
  }

  const policies = getPolicyManager();
  const violations = getViolationRepository();
  const scanResult = runScan();

  return c.json({
    policies: policies.count(),
    violations: violations.getStats(),
    lastScan: {
      timestamp: scanResult.timestamp,
      overallStatus: scanResult.overallStatus,
      summary: scanResult.summary,
    },
  });
});

export default app;
