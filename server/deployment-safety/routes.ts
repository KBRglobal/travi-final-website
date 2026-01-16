/**
 * Deployment Safety API Routes
 *
 * REST endpoints for the deployment safety system
 */

import { Router, Request, Response, NextFunction } from 'express';
import { log } from '../lib/logger';

// Import all modules
import * as releaseGates from './release-gates';
import * as canary from './canary-deployment';
import * as rollback from './rollback-manager';
import * as healthProbes from './health-probes';
import * as envParity from './environment-parity';
import * as incidents from './incident-lifecycle';
import * as loadShedding from './load-shedding';
import * as costAnomaly from './cost-anomaly';
import * as securityGate from './security-gate-adapter';
import { getDeploymentSafetyStatus } from './index';

const router = Router();

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[DeploySafetyAPI] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[DeploySafetyAPI] ${msg}`, undefined, data),
};

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ============================================================================
// Overall Status
// ============================================================================

/**
 * GET /api/deploy-safety/status
 * Get overall deployment safety status
 */
router.get('/status', asyncHandler(async (_req, res) => {
  const status = await getDeploymentSafetyStatus();
  res.json(status);
}));

// ============================================================================
// Release Gates
// ============================================================================

/**
 * POST /api/deploy-safety/gates/validate
 * Start a new release validation
 */
router.post('/gates/validate', asyncHandler(async (req, res) => {
  const { version, environment } = req.body;

  if (!version || !environment) {
    res.status(400).json({ error: 'version and environment required' });
    return;
  }

  const validation = releaseGates.startValidation(version, environment);
  res.json(validation);
}));

/**
 * POST /api/deploy-safety/gates/:id/run
 * Run all gates for a validation
 */
router.post('/gates/:id/run', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { previousVersion } = req.body;

  const validation = await releaseGates.runGates(id, { previousVersion });
  res.json(validation);
}));

/**
 * GET /api/deploy-safety/gates/:id
 * Get validation status
 */
router.get('/gates/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validation = releaseGates.getValidation(id);

  if (!validation) {
    res.status(404).json({ error: 'Validation not found' });
    return;
  }

  res.json(validation);
}));

/**
 * GET /api/deploy-safety/gates
 * List validations
 */
router.get('/gates', asyncHandler(async (req, res) => {
  const { environment, status, limit } = req.query;

  const validations = releaseGates.listValidations({
    environment: environment as any,
    status: status as any,
    limit: limit ? parseInt(limit as string, 10) : undefined,
  });

  res.json(validations);
}));

/**
 * GET /api/deploy-safety/gates/stats
 * Get gate statistics
 */
router.get('/gates/stats', asyncHandler(async (_req, res) => {
  const stats = releaseGates.getGateStats();
  res.json(stats);
}));

/**
 * POST /api/deploy-safety/gates/:id/skip/:gateId
 * Skip a gate
 */
router.post('/gates/:id/skip/:gateId', asyncHandler(async (req, res) => {
  const { id, gateId } = req.params;
  const { reason } = req.body;

  const gate = releaseGates.skipGate(id, gateId, reason || 'Manually skipped');

  if (!gate) {
    res.status(400).json({ error: 'Cannot skip gate (not found or required)' });
    return;
  }

  res.json(gate);
}));

/**
 * POST /api/deploy-safety/gates/:id/approve/:gateId
 * Add manual approval
 */
router.post('/gates/:id/approve/:gateId', asyncHandler(async (req, res) => {
  const { id, gateId } = req.params;
  const { approver, approved, notes } = req.body;

  const gate = releaseGates.addManualApproval(id, gateId, approver, approved !== false, notes);

  if (!gate) {
    res.status(404).json({ error: 'Gate not found' });
    return;
  }

  res.json(gate);
}));

// ============================================================================
// Canary Deployment
// ============================================================================

/**
 * POST /api/deploy-safety/canary/start
 * Start a canary deployment (Security Gate protected)
 */
router.post('/canary/start', asyncHandler(async (req, res) => {
  const { version, baselineVersion, environment, config } = req.body;
  const requesterId = (req as any).user?.id;

  if (!version || !baselineVersion || !environment) {
    res.status(400).json({ error: 'version, baselineVersion, and environment required' });
    return;
  }

  // Use secure wrapper with security gate check
  const result = await securityGate.secureStartCanary(
    version,
    baselineVersion,
    environment,
    config,
    requesterId
  );

  if ('blocked' in result) {
    res.status(403).json({
      error: 'Action blocked by security gate',
      code: 'SECURITY_GATE_BLOCKED',
      reason: result.reason,
    });
    return;
  }

  res.json(result.result);
}));

/**
 * GET /api/deploy-safety/canary/:id
 * Get canary deployment
 */
router.get('/canary/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deployment = canary.getCanary(id);

  if (!deployment) {
    res.status(404).json({ error: 'Canary deployment not found' });
    return;
  }

  res.json(deployment);
}));

/**
 * GET /api/deploy-safety/canary/active/:environment
 * Get active canary for environment
 */
router.get('/canary/active/:environment', asyncHandler(async (req, res) => {
  const { environment } = req.params;
  const deployment = canary.getActiveCanary(environment as any);

  if (!deployment) {
    res.status(404).json({ error: 'No active canary deployment' });
    return;
  }

  res.json(deployment);
}));

/**
 * POST /api/deploy-safety/canary/:id/promote
 * Promote canary
 */
router.post('/canary/:id/promote', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { actor } = req.body;

  const deployment = canary.promoteCanary(id, actor);

  if (!deployment) {
    res.status(400).json({ error: 'Cannot promote canary' });
    return;
  }

  res.json(deployment);
}));

/**
 * POST /api/deploy-safety/canary/:id/rollback
 * Rollback canary
 */
router.post('/canary/:id/rollback', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, actor } = req.body;

  const deployment = canary.rollbackCanary(id, reason || 'Manual rollback', actor);

  if (!deployment) {
    res.status(400).json({ error: 'Cannot rollback canary' });
    return;
  }

  res.json(deployment);
}));

/**
 * GET /api/deploy-safety/canary/stats
 * Get canary statistics
 */
router.get('/canary/stats', asyncHandler(async (_req, res) => {
  const stats = canary.getCanaryStats();
  res.json(stats);
}));

// ============================================================================
// Rollback
// ============================================================================

/**
 * POST /api/deploy-safety/rollback/create
 * Create rollback plan (Security Gate protected)
 */
router.post('/rollback/create', asyncHandler(async (req, res) => {
  const { fromVersion, toVersion, environment, trigger, actor } = req.body;

  if (!fromVersion || !toVersion || !environment) {
    res.status(400).json({ error: 'fromVersion, toVersion, and environment required' });
    return;
  }

  // Use secure wrapper with security gate check
  const result = await securityGate.secureCreateRollback(
    fromVersion,
    toVersion,
    environment,
    trigger || 'manual',
    actor
  );

  if ('blocked' in result) {
    res.status(403).json({
      error: 'Action blocked by security gate',
      code: 'SECURITY_GATE_BLOCKED',
      reason: result.reason,
    });
    return;
  }

  res.json(result.result);
}));

/**
 * POST /api/deploy-safety/rollback/:id/execute
 * Execute rollback
 */
router.post('/rollback/:id/execute', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plan = await rollback.executeRollback(id);
  res.json(plan);
}));

/**
 * GET /api/deploy-safety/rollback/:id
 * Get rollback plan
 */
router.get('/rollback/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = rollback.getRollbackPlan(id);

  if (!plan) {
    res.status(404).json({ error: 'Rollback plan not found' });
    return;
  }

  res.json(plan);
}));

/**
 * GET /api/deploy-safety/rollback
 * List rollback plans
 */
router.get('/rollback', asyncHandler(async (req, res) => {
  const { environment, status, limit } = req.query;

  const plans = rollback.listRollbackPlans({
    environment: environment as any,
    status: status as any,
    limit: limit ? parseInt(limit as string, 10) : undefined,
  });

  res.json(plans);
}));

/**
 * GET /api/deploy-safety/rollback/stats
 * Get rollback statistics
 */
router.get('/rollback/stats', asyncHandler(async (_req, res) => {
  const stats = rollback.getRollbackStats();
  res.json(stats);
}));

// ============================================================================
// Health Probes
// ============================================================================

/**
 * GET /api/deploy-safety/health
 * Get system health
 */
router.get('/health', asyncHandler(async (req, res) => {
  const environment = (req.query.environment as any) || envParity.getCurrentEnvironment();
  const health = healthProbes.getSystemHealth(environment);
  res.json(health);
}));

/**
 * GET /api/deploy-safety/health/probes
 * Get all probes
 */
router.get('/health/probes', asyncHandler(async (_req, res) => {
  const probes = healthProbes.getAllProbes();
  res.json(probes);
}));

/**
 * GET /api/deploy-safety/health/probes/:id
 * Get specific probe
 */
router.get('/health/probes/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const probe = healthProbes.getProbe(id);

  if (!probe) {
    res.status(404).json({ error: 'Probe not found' });
    return;
  }

  res.json(probe);
}));

/**
 * POST /api/deploy-safety/health/probes/:id/run
 * Run a specific probe
 */
router.post('/health/probes/:id/run', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await healthProbes.runProbe(id);

  if (!result) {
    res.status(404).json({ error: 'Probe not found' });
    return;
  }

  res.json(result);
}));

/**
 * POST /api/deploy-safety/health/probes/run-all
 * Run all probes
 */
router.post('/health/probes/run-all', asyncHandler(async (_req, res) => {
  const results = await healthProbes.runAllProbes();
  res.json(Object.fromEntries(results));
}));

/**
 * GET /api/deploy-safety/health/stats
 * Get probe statistics
 */
router.get('/health/stats', asyncHandler(async (_req, res) => {
  const stats = healthProbes.getProbeStats();
  res.json(stats);
}));

// ============================================================================
// Environment Parity
// ============================================================================

/**
 * POST /api/deploy-safety/parity/check
 * Run parity check
 */
router.post('/parity/check', asyncHandler(async (req, res) => {
  const { environments } = req.body;
  const report = await envParity.runParityCheck(environments);
  res.json(report);
}));

/**
 * GET /api/deploy-safety/parity/latest
 * Get latest parity report
 */
router.get('/parity/latest', asyncHandler(async (_req, res) => {
  const report = envParity.getLatestParityReport();

  if (!report) {
    res.status(404).json({ error: 'No parity reports available' });
    return;
  }

  res.json(report);
}));

/**
 * GET /api/deploy-safety/parity/:id
 * Get specific parity report
 */
router.get('/parity/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const report = envParity.getParityReport(id);

  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  res.json(report);
}));

/**
 * GET /api/deploy-safety/parity/ready/:environment
 * Check if environment is ready
 */
router.get('/parity/ready/:environment', asyncHandler(async (req, res) => {
  const { environment } = req.params;
  const result = await envParity.isEnvironmentReady(environment as any);
  res.json(result);
}));

/**
 * GET /api/deploy-safety/parity/stats
 * Get parity statistics
 */
router.get('/parity/stats', asyncHandler(async (_req, res) => {
  const stats = envParity.getParityStats();
  res.json(stats);
}));

// ============================================================================
// Incidents
// ============================================================================

/**
 * POST /api/deploy-safety/incidents
 * Create incident
 */
router.post('/incidents', asyncHandler(async (req, res) => {
  const { title, description, severity, type, affectedSystems, tags } = req.body;

  if (!title || !description || !severity || !type) {
    res.status(400).json({ error: 'title, description, severity, and type required' });
    return;
  }

  const incident = incidents.createIncident({
    title,
    description,
    severity,
    type,
    affectedSystems,
    tags,
  });

  res.status(201).json(incident);
}));

/**
 * GET /api/deploy-safety/incidents
 * List incidents
 */
router.get('/incidents', asyncHandler(async (req, res) => {
  const { status, severity, phase, limit } = req.query;

  const list = incidents.listIncidents({
    status: status as any,
    severity: severity as any,
    phase: phase as any,
    limit: limit ? parseInt(limit as string, 10) : undefined,
  });

  res.json(list);
}));

/**
 * GET /api/deploy-safety/incidents/:id
 * Get incident
 */
router.get('/incidents/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const incident = incidents.getIncident(id);

  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }

  res.json(incident);
}));

/**
 * POST /api/deploy-safety/incidents/:id/acknowledge
 * Acknowledge incident
 */
router.post('/incidents/:id/acknowledge', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { actor } = req.body;

  const incident = incidents.acknowledgeIncident(id, actor || 'unknown');

  if (!incident) {
    res.status(400).json({ error: 'Cannot acknowledge incident' });
    return;
  }

  res.json(incident);
}));

/**
 * POST /api/deploy-safety/incidents/:id/transition
 * Transition incident phase
 */
router.post('/incidents/:id/transition', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { phase, actor } = req.body;

  const incident = incidents.transitionPhase(id, phase, actor || 'unknown');

  if (!incident) {
    res.status(400).json({ error: 'Cannot transition incident' });
    return;
  }

  res.json(incident);
}));

/**
 * POST /api/deploy-safety/incidents/:id/escalate
 * Escalate incident (Security Gate protected for high/critical severity)
 */
router.post('/incidents/:id/escalate', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { actor, severity } = req.body;

  // Use secure wrapper for high/critical severity escalations
  const result = await securityGate.secureEscalateIncident(
    id,
    actor || 'unknown',
    severity || 'medium'
  );

  if ('blocked' in result) {
    res.status(403).json({
      error: 'Action blocked by security gate',
      code: 'SECURITY_GATE_BLOCKED',
      reason: result.reason,
    });
    return;
  }

  if (!result.result) {
    res.status(400).json({ error: 'Cannot escalate incident' });
    return;
  }

  res.json(result.result);
}));

/**
 * GET /api/deploy-safety/incidents/stats
 * Get incident statistics
 */
router.get('/incidents/stats', asyncHandler(async (_req, res) => {
  const stats = incidents.getIncidentStats();
  res.json(stats);
}));

/**
 * POST /api/deploy-safety/incidents/:id/postmortem
 * Create postmortem
 */
router.post('/incidents/:id/postmortem', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { author } = req.body;

  const postmortem = incidents.createPostmortem(id, author || 'unknown');

  if (!postmortem) {
    res.status(400).json({ error: 'Cannot create postmortem' });
    return;
  }

  res.json(postmortem);
}));

/**
 * GET /api/deploy-safety/incidents/:id/postmortem
 * Get postmortem
 */
router.get('/incidents/:id/postmortem', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const postmortem = incidents.getPostmortem(id);

  if (!postmortem) {
    res.status(404).json({ error: 'Postmortem not found' });
    return;
  }

  res.json(postmortem);
}));

// ============================================================================
// Load Shedding
// ============================================================================

/**
 * GET /api/deploy-safety/load-shedding/state
 * Get load shedding state
 */
router.get('/load-shedding/state', asyncHandler(async (_req, res) => {
  const state = loadShedding.getState();
  res.json(state);
}));

/**
 * GET /api/deploy-safety/load-shedding/stats
 * Get load shedding statistics
 */
router.get('/load-shedding/stats', asyncHandler(async (_req, res) => {
  const stats = loadShedding.getStats();
  res.json(stats);
}));

/**
 * GET /api/deploy-safety/load-shedding/decisions
 * Get recent decisions
 */
router.get('/load-shedding/decisions', asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const decisions = loadShedding.getDecisionHistory(
    limit ? parseInt(limit as string, 10) : 100
  );
  res.json(decisions);
}));

/**
 * POST /api/deploy-safety/load-shedding/force
 * Force a load shedding level (Security Gate protected)
 */
router.post('/load-shedding/force', asyncHandler(async (req, res) => {
  const { level, reason } = req.body;
  const requesterId = (req as any).user?.id;

  if (!level) {
    res.status(400).json({ error: 'level required' });
    return;
  }

  // Use secure wrapper with security gate check
  const result = await securityGate.secureActivateLoadShedding(
    level,
    reason || 'API request',
    requesterId
  );

  if ('blocked' in result) {
    res.status(403).json({
      error: 'Action blocked by security gate',
      code: 'SECURITY_GATE_BLOCKED',
      reason: result.reason,
    });
    return;
  }

  res.json({ success: true, state: loadShedding.getState() });
}));

/**
 * POST /api/deploy-safety/load-shedding/clear
 * Clear forced level
 */
router.post('/load-shedding/clear', asyncHandler(async (_req, res) => {
  loadShedding.clearForcedLevel();
  res.json({ success: true, state: loadShedding.getState() });
}));

// ============================================================================
// Cost Anomaly
// ============================================================================

/**
 * GET /api/deploy-safety/cost/anomalies
 * List anomalies
 */
router.get('/cost/anomalies', asyncHandler(async (req, res) => {
  const { feature, severity, unresolved, limit } = req.query;

  const anomalies = costAnomaly.listAnomalies({
    feature: feature as string,
    severity: severity as any,
    unresolved: unresolved === 'true',
    limit: limit ? parseInt(limit as string, 10) : undefined,
  });

  res.json(anomalies);
}));

/**
 * GET /api/deploy-safety/cost/anomalies/:id
 * Get anomaly
 */
router.get('/cost/anomalies/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const anomaly = costAnomaly.getAnomaly(id);

  if (!anomaly) {
    res.status(404).json({ error: 'Anomaly not found' });
    return;
  }

  res.json(anomaly);
}));

/**
 * POST /api/deploy-safety/cost/anomalies/:id/acknowledge
 * Acknowledge anomaly
 */
router.post('/cost/anomalies/:id/acknowledge', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const anomaly = costAnomaly.acknowledgeAnomaly(id);

  if (!anomaly) {
    res.status(404).json({ error: 'Anomaly not found' });
    return;
  }

  res.json(anomaly);
}));

/**
 * POST /api/deploy-safety/cost/anomalies/:id/resolve
 * Resolve anomaly
 */
router.post('/cost/anomalies/:id/resolve', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const anomaly = costAnomaly.resolveAnomaly(id);

  if (!anomaly) {
    res.status(404).json({ error: 'Anomaly not found' });
    return;
  }

  res.json(anomaly);
}));

/**
 * GET /api/deploy-safety/cost/forecast/:feature
 * Get cost forecast
 */
router.get('/cost/forecast/:feature', asyncHandler(async (req, res) => {
  const { feature } = req.params;
  const forecast = await costAnomaly.generateForecast(feature as any);

  if (!forecast) {
    res.status(404).json({ error: 'Not enough data for forecast' });
    return;
  }

  res.json(forecast);
}));

/**
 * GET /api/deploy-safety/cost/alerts
 * Get recent alerts
 */
router.get('/cost/alerts', asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const alerts = costAnomaly.getRecentAlerts(
    limit ? parseInt(limit as string, 10) : 100
  );
  res.json(alerts);
}));

/**
 * GET /api/deploy-safety/cost/stats
 * Get anomaly statistics
 */
router.get('/cost/stats', asyncHandler(async (_req, res) => {
  const stats = costAnomaly.getAnomalyStats();
  res.json(stats);
}));

/**
 * POST /api/deploy-safety/cost/detect
 * Trigger anomaly detection
 */
router.post('/cost/detect', asyncHandler(async (_req, res) => {
  const anomalies = await costAnomaly.runAnomalyDetection();
  res.json({ detected: anomalies.length, anomalies });
}));

// ============================================================================
// Security Gate Management
// ============================================================================

/**
 * GET /api/deploy-safety/security-gate/status
 * Get security gate status
 */
router.get('/security-gate/status', asyncHandler(async (_req, res) => {
  const status = securityGate.getSecurityGateStatus();
  res.json(status);
}));

/**
 * POST /api/deploy-safety/security-gate/mode
 * Set security mode (monitor/enforce/lockdown)
 */
router.post('/security-gate/mode', asyncHandler(async (req, res) => {
  const { mode, reason } = req.body;

  if (!mode || !['monitor', 'enforce', 'lockdown'].includes(mode)) {
    res.status(400).json({ error: 'Valid mode required (monitor/enforce/lockdown)' });
    return;
  }

  securityGate.setSecurityMode(mode, reason);
  res.json({ success: true, status: securityGate.getSecurityGateStatus() });
}));

/**
 * POST /api/deploy-safety/security-gate/threat-level
 * Set threat level
 */
router.post('/security-gate/threat-level', asyncHandler(async (req, res) => {
  const { level } = req.body;

  if (!level || !['none', 'low', 'medium', 'high', 'critical'].includes(level)) {
    res.status(400).json({ error: 'Valid level required (none/low/medium/high/critical)' });
    return;
  }

  securityGate.setThreatLevel(level);
  res.json({ success: true, status: securityGate.getSecurityGateStatus() });
}));

/**
 * POST /api/deploy-safety/security-gate/override
 * Create a security override
 */
router.post('/security-gate/override', asyncHandler(async (req, res) => {
  const { action, environment, reason, ttlMinutes } = req.body;
  const createdBy = (req as any).user?.id || 'api';

  if (!action || !environment || !reason) {
    res.status(400).json({ error: 'action, environment, and reason required' });
    return;
  }

  const override = securityGate.createOverride(
    action,
    environment,
    reason,
    createdBy,
    ttlMinutes || 60
  );

  res.status(201).json(override);
}));

/**
 * GET /api/deploy-safety/security-gate/overrides
 * List active overrides
 */
router.get('/security-gate/overrides', asyncHandler(async (_req, res) => {
  const overrides = securityGate.listOverrides();
  res.json(overrides);
}));

/**
 * DELETE /api/deploy-safety/security-gate/override/:id
 * Revoke an override
 */
router.delete('/security-gate/override/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const success = securityGate.revokeOverride(id);

  if (!success) {
    res.status(404).json({ error: 'Override not found' });
    return;
  }

  res.json({ success: true });
}));

/**
 * POST /api/deploy-safety/security-gate/check
 * Check if an action is allowed
 */
router.post('/security-gate/check', asyncHandler(async (req, res) => {
  const { action, environment, severity } = req.body;
  const requesterId = (req as any).user?.id;

  if (!action || !environment) {
    res.status(400).json({ error: 'action and environment required' });
    return;
  }

  const result = await securityGate.checkSecurityGate(action, environment, { severity, requesterId });
  res.json(result);
}));

// Error handler
router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('API error', {
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

export default router;
