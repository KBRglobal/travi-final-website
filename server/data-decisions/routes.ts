/**
 * Data Decisions API Routes
 * Role-based endpoints for the Decision Operating System
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type {
  Decision,
  AutopilotMode,
  DecisionQueueResponse,
  ExecutiveDecisionView,
  DomainDecisionView,
} from './types';
import { decisionEngine, bindingsRegistry } from './engine';
import { confidenceEngine, dataTrustScorer } from './confidence';
import { autonomousLoop } from './loop';
import { systemHealthMonitor, dataDriftDetector } from './health';
import { autopilotController, unifiedAutopilotGate } from './governance';
import { adapterRegistry } from './adapters';
import { collisionResolver } from './conflicts';
import { executiveExplainer } from './explainability';

const router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const approveDecisionSchema = z.object({
  decisionId: z.string(),
  approvedBy: z.string(),
  notes: z.string().optional(),
});

const rejectDecisionSchema = z.object({
  decisionId: z.string(),
  rejectedBy: z.string(),
  reason: z.string().optional(),
});

const modeTransitionSchema = z.object({
  toMode: z.enum(['off', 'supervised', 'full']),
  requestedBy: z.string(),
  reason: z.string(),
  duration: z.number().optional(),
});

const overrideSchema = z.object({
  scope: z.enum(['decision', 'category', 'all']),
  targetId: z.string().optional(),
  reason: z.string(),
  createdBy: z.string(),
  durationHours: z.number().min(1).max(168),
});

// =============================================================================
// DECISION QUEUE ENDPOINTS
// =============================================================================

/**
 * GET /api/decisions/queue
 * Get all pending decisions requiring approval
 */
router.get('/queue', (req: Request, res: Response) => {
  try {
    const pending = decisionEngine.getPendingDecisions();
    const byCategory: Record<string, number> = {
      auto_execute: 0,
      supervised: 0,
      escalation_only: 0,
      forbidden: 0,
    };

    for (const decision of pending) {
      byCategory[decision.category]++;
    }

    const oldestDecision = pending.length > 0
      ? pending.reduce((oldest, d) => d.createdAt < oldest.createdAt ? d : oldest).createdAt
      : undefined;

    const nextExpiring = pending
      .filter(d => d.expiresAt)
      .sort((a, b) => (a.expiresAt?.getTime() || 0) - (b.expiresAt?.getTime() || 0))[0];

    const response: DecisionQueueResponse = {
      pending,
      totalCount: pending.length,
      byCategory: byCategory as DecisionQueueResponse['byCategory'],
      oldestDecision,
      nextExpiring,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch decision queue' });
  }
});

/**
 * GET /api/decisions/queue/:category
 * Get pending decisions by category
 */
router.get('/queue/:category', (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const validCategories = ['auto_execute', 'supervised', 'escalation_only', 'forbidden'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const decisions = decisionEngine.getPendingByCategory(category as Decision['category']);
    res.json({ decisions, count: decisions.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch decisions by category' });
  }
});

/**
 * POST /api/decisions/approve
 * Approve a pending decision
 */
router.post('/approve', (req: Request, res: Response) => {
  try {
    const parsed = approveDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const { decisionId, approvedBy, notes } = parsed.data;
    const decision = decisionEngine.approveDecision(decisionId, approvedBy, notes);

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    res.json({ success: true, decision });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve decision' });
  }
});

/**
 * POST /api/decisions/reject
 * Reject a pending decision
 */
router.post('/reject', (req: Request, res: Response) => {
  try {
    const parsed = rejectDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const { decisionId, rejectedBy, reason } = parsed.data;
    const decision = decisionEngine.rejectDecision(decisionId, rejectedBy, reason);

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    res.json({ success: true, decision });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject decision' });
  }
});

/**
 * GET /api/decisions/:id
 * Get a specific decision
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const decision = decisionEngine.getDecision(req.params.id);

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    res.json(decision);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch decision' });
  }
});

// =============================================================================
// EXECUTIVE VIEW ENDPOINTS
// =============================================================================

/**
 * GET /api/decisions/executive/overview
 * Executive-level view of the decision system
 */
router.get('/executive/overview', async (req: Request, res: Response) => {
  try {
    const pending = decisionEngine.getPendingDecisions();
    const executed = decisionEngine.getExecutedDecisions(20);

    const criticalDecisions = pending.filter(
      d => d.authority === 'blocking' || d.category === 'escalation_only'
    );

    const escalations = pending.filter(d => d.escalation);

    const systemHealth = systemHealthMonitor.getStatus();
    const circuitBreaker = systemHealthMonitor.getCircuitBreakerState();

    // Get recent conflicts
    const lastCycle = autonomousLoop.getLastCycle();
    const conflicts = (lastCycle?.phases.decide?.output?.conflicts as any[]) || [];

    const response: ExecutiveDecisionView = {
      criticalDecisions,
      escalations,
      recentExecutions: executed,
      systemHealth,
      conflicts,
      autopilotMode: decisionEngine.getAutopilotMode(),
      circuitBreaker,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch executive overview' });
  }
});

// =============================================================================
// DOMAIN-SPECIFIC ENDPOINTS
// =============================================================================

/**
 * GET /api/decisions/domain/:domain
 * Domain-specific decision view (seo, content, ops, etc.)
 */
router.get('/domain/:domain', (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    const validDomains = ['seo', 'aeo', 'content', 'growth', 'ops', 'revenue'];

    if (!validDomains.includes(domain)) {
      return res.status(400).json({ error: 'Invalid domain' });
    }

    const pending = decisionEngine.getPendingDecisions();
    const executed = decisionEngine.getExecutedDecisions(50);

    // Filter by domain (based on metric prefix or task category)
    const domainPending = pending.filter(
      d => d.signal.metricId.startsWith(domain) || d.taskConfig?.category === domain
    );

    const domainExecuted = executed.filter(
      d => d.signal.metricId.startsWith(domain) || d.taskConfig?.category === domain
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const decisionsToday = domainExecuted.filter(
      d => d.executedAt && d.executedAt >= todayStart
    ).length;

    const autoExecuted = domainExecuted.filter(d => d.executedBy === 'system').length;
    const successful = domainExecuted.filter(d => d.outcome === 'success').length;

    const response: DomainDecisionView = {
      domain,
      pendingDecisions: domainPending,
      recentDecisions: domainExecuted.slice(0, 20),
      metrics: {
        decisionsToday,
        autoExecuted,
        pendingApproval: domainPending.length,
        successRate: domainExecuted.length > 0 ? (successful / domainExecuted.length) * 100 : 0,
      },
      alerts: systemHealthMonitor.getAlerts(true).filter(a => a.component.includes(domain)),
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch domain view' });
  }
});

// =============================================================================
// SYSTEM HEALTH ENDPOINTS
// =============================================================================

/**
 * GET /api/decisions/health
 * Get system health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await systemHealthMonitor.performHealthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health status' });
  }
});

/**
 * GET /api/decisions/health/drift
 * Get data drift status
 */
router.get('/health/drift', (req: Request, res: Response) => {
  try {
    const drift = dataDriftDetector.detectDrift();
    res.json(drift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect data drift' });
  }
});

/**
 * GET /api/decisions/health/alerts
 * Get system alerts
 */
router.get('/health/alerts', (req: Request, res: Response) => {
  try {
    const unacknowledgedOnly = req.query.unacknowledged === 'true';
    const alerts = systemHealthMonitor.getAlerts(unacknowledgedOnly);
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * POST /api/decisions/health/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post('/health/alerts/:id/acknowledge', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy } = req.body;

    if (!acknowledgedBy) {
      return res.status(400).json({ error: 'acknowledgedBy is required' });
    }

    const success = systemHealthMonitor.acknowledgeAlert(id, acknowledgedBy);

    if (!success) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// =============================================================================
// AUTOPILOT ENDPOINTS
// =============================================================================

/**
 * GET /api/decisions/autopilot/status
 * Get autopilot status
 */
router.get('/autopilot/status', (req: Request, res: Response) => {
  try {
    const status = autopilotController.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch autopilot status' });
  }
});

/**
 * POST /api/decisions/autopilot/transition
 * Request autopilot mode transition
 */
router.post('/autopilot/transition', (req: Request, res: Response) => {
  try {
    const parsed = modeTransitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const { toMode, requestedBy, reason, duration } = parsed.data;
    const currentMode = autopilotController.getMode();

    const result = autopilotController.requestModeTransition({
      fromMode: currentMode,
      toMode: toMode as AutopilotMode,
      requestedBy,
      reason,
      duration,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to transition autopilot mode' });
  }
});

/**
 * GET /api/decisions/autopilot/history
 * Get autopilot mode history
 */
router.get('/autopilot/history', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const history = autopilotController.getModeHistory(limit);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch autopilot history' });
  }
});

/**
 * POST /api/decisions/autopilot/override
 * Create an override
 */
router.post('/autopilot/override', (req: Request, res: Response) => {
  try {
    const parsed = overrideSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const { scope, targetId, reason, createdBy, durationHours } = parsed.data;

    const override = autopilotController.createOverride(
      scope,
      targetId,
      reason,
      createdBy,
      durationHours
    );

    res.json({ success: true, override });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create override' });
  }
});

/**
 * GET /api/decisions/autopilot/overrides
 * Get active overrides
 */
router.get('/autopilot/overrides', (req: Request, res: Response) => {
  try {
    const overrides = autopilotController.getActiveOverrides();
    res.json({ overrides, count: overrides.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overrides' });
  }
});

// =============================================================================
// LOOP CONTROL ENDPOINTS
// =============================================================================

/**
 * GET /api/decisions/loop/status
 * Get autonomous loop status
 */
router.get('/loop/status', (req: Request, res: Response) => {
  try {
    const state = autonomousLoop.getState();
    const statistics = autonomousLoop.getStatistics();
    res.json({ state, statistics });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch loop status' });
  }
});

/**
 * GET /api/decisions/loop/cycles
 * Get recent loop cycles
 */
router.get('/loop/cycles', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const cycles = autonomousLoop.getCycles(limit);
    res.json({ cycles, count: cycles.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch loop cycles' });
  }
});

/**
 * POST /api/decisions/loop/start
 * Start the autonomous loop
 */
router.post('/loop/start', (req: Request, res: Response) => {
  try {
    if (autonomousLoop.isRunning()) {
      return res.status(400).json({ error: 'Loop is already running' });
    }

    autonomousLoop.start();
    res.json({ success: true, message: 'Autonomous loop started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start loop' });
  }
});

/**
 * POST /api/decisions/loop/stop
 * Stop the autonomous loop
 */
router.post('/loop/stop', (req: Request, res: Response) => {
  try {
    autonomousLoop.stop();
    res.json({ success: true, message: 'Autonomous loop stopped' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop loop' });
  }
});

/**
 * POST /api/decisions/loop/trigger
 * Manually trigger a loop cycle
 */
router.post('/loop/trigger', async (req: Request, res: Response) => {
  try {
    const cycle = await autonomousLoop.runCycle();
    res.json({ success: true, cycle });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger loop cycle' });
  }
});

// =============================================================================
// BINDINGS ENDPOINTS
// =============================================================================

/**
 * GET /api/decisions/bindings
 * Get all bindings
 */
router.get('/bindings', (req: Request, res: Response) => {
  try {
    const bindings = bindingsRegistry.getAll();
    res.json({ bindings, count: bindings.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bindings' });
  }
});

/**
 * GET /api/decisions/bindings/:id
 * Get a specific binding
 */
router.get('/bindings/:id', (req: Request, res: Response) => {
  try {
    const binding = bindingsRegistry.get(req.params.id);

    if (!binding) {
      return res.status(404).json({ error: 'Binding not found' });
    }

    res.json(binding);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch binding' });
  }
});

// =============================================================================
// STATISTICS ENDPOINTS
// =============================================================================

/**
 * GET /api/decisions/stats
 * Get decision engine statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const decisionStats = decisionEngine.getStatistics();
    const confidenceStats = confidenceEngine.getStatistics();
    const loopStats = autonomousLoop.getStatistics();

    res.json({
      decisions: decisionStats,
      confidence: confidenceStats,
      loop: loopStats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// =============================================================================
// GLOBAL AUTOPILOT ENDPOINTS
// =============================================================================

/**
 * GET /api/decisions/autopilot/global-status
 * Get unified global autopilot status across all systems
 */
router.get('/autopilot/global-status', (req: Request, res: Response) => {
  try {
    const globalState = unifiedAutopilotGate.getGlobalState();
    res.json(globalState);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch global autopilot status' });
  }
});

/**
 * POST /api/decisions/autopilot/global/enable
 * Enable global autopilot
 */
router.post('/autopilot/global/enable', (req: Request, res: Response) => {
  try {
    const { mode, changedBy, reason } = req.body;

    if (!mode || !changedBy || !reason) {
      return res.status(400).json({
        error: 'mode, changedBy, and reason are required',
      });
    }

    const success = unifiedAutopilotGate.enableGlobal(mode, changedBy, reason);

    if (!success) {
      return res.status(400).json({
        error: 'Cannot enable - check emergency stop or circuit breaker status',
      });
    }

    res.json({ success: true, state: unifiedAutopilotGate.getGlobalState() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to enable global autopilot' });
  }
});

/**
 * POST /api/decisions/autopilot/global/disable
 * Disable global autopilot
 */
router.post('/autopilot/global/disable', (req: Request, res: Response) => {
  try {
    const { changedBy, reason } = req.body;

    if (!changedBy || !reason) {
      return res.status(400).json({
        error: 'changedBy and reason are required',
      });
    }

    unifiedAutopilotGate.disableGlobal(changedBy, reason);
    res.json({ success: true, state: unifiedAutopilotGate.getGlobalState() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disable global autopilot' });
  }
});

/**
 * POST /api/decisions/autopilot/emergency-stop
 * Trigger emergency stop - halts ALL autonomous behavior immediately
 */
router.post('/autopilot/emergency-stop', (req: Request, res: Response) => {
  try {
    const { triggeredBy, reason } = req.body;

    if (!triggeredBy || !reason) {
      return res.status(400).json({
        error: 'triggeredBy and reason are required',
      });
    }

    unifiedAutopilotGate.emergencyStop(triggeredBy, reason);
    res.json({
      success: true,
      message: 'Emergency stop activated',
      state: unifiedAutopilotGate.getGlobalState(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger emergency stop' });
  }
});

/**
 * POST /api/decisions/autopilot/domain/:domain
 * Set domain-specific autopilot state
 */
router.post('/autopilot/domain/:domain', (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    const { mode, enabled, changedBy, reason } = req.body;

    if (mode === undefined || enabled === undefined || !changedBy) {
      return res.status(400).json({
        error: 'mode, enabled, and changedBy are required',
      });
    }

    const success = unifiedAutopilotGate.setDomainState(
      domain,
      mode,
      enabled,
      changedBy,
      reason
    );

    if (!success) {
      return res.status(400).json({
        error: 'Failed to set domain state - check global enabled status',
      });
    }

    res.json({
      success: true,
      domain: unifiedAutopilotGate.getDomainState(domain),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set domain autopilot state' });
  }
});

/**
 * GET /api/decisions/autopilot/gate/:domain
 * Check if autopilot is allowed for a domain
 */
router.get('/autopilot/gate/:domain', (req: Request, res: Response) => {
  try {
    const result = unifiedAutopilotGate.checkGate(req.params.domain);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check autopilot gate' });
  }
});

// =============================================================================
// EXECUTIVE EXPLAINABILITY ENDPOINTS
// =============================================================================

/**
 * GET /api/decisions/executive/explain/:id
 * Get plain English explanation of a decision for non-technical stakeholders
 */
router.get('/executive/explain/:id', (req: Request, res: Response) => {
  try {
    const decision = decisionEngine.getDecision(req.params.id);

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    const explanation = executiveExplainer.explain(decision);
    res.json(explanation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

// =============================================================================
// ADAPTER ENDPOINTS
// =============================================================================

/**
 * GET /api/decisions/adapters
 * Get all registered adapters
 */
router.get('/adapters', (req: Request, res: Response) => {
  try {
    const adapters = adapterRegistry.getAll().map(a => ({
      id: a.id,
      name: a.name,
      supportedActions: a.supportedActions,
      health: a.getHealth(),
      config: a.config,
    }));

    res.json({ adapters, count: adapters.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch adapters' });
  }
});

/**
 * GET /api/decisions/adapters/health
 * Get health status of all adapters
 */
router.get('/adapters/health', async (req: Request, res: Response) => {
  try {
    const health = await adapterRegistry.checkAllHealth();
    const summary = adapterRegistry.getHealthSummary();

    res.json({
      summary,
      adapters: Object.fromEntries(health),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch adapter health' });
  }
});

/**
 * POST /api/decisions/execute/:id
 * Execute a decision through adapters
 */
router.post('/execute/:id', async (req: Request, res: Response) => {
  try {
    const { dryRun = true } = req.body;
    const decision = decisionEngine.getDecision(req.params.id);

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    // Check for collisions with other pending decisions
    const pending = decisionEngine.getPendingDecisions();
    const canExecute = collisionResolver.canExecute(decision, pending);

    if (!canExecute.canExecute) {
      return res.status(409).json({
        error: 'Decision blocked by conflict',
        blockedBy: canExecute.blockedBy?.id,
        reason: canExecute.reason,
      });
    }

    // Execute through adapters
    const results = await adapterRegistry.executeDecision(decision, dryRun);

    res.json({
      decision: decision.id,
      dryRun,
      results,
      executedAt: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute decision' });
  }
});

// =============================================================================
// COLLISION ENDPOINTS
// =============================================================================

/**
 * GET /api/decisions/collisions/history
 * Get collision resolution history
 */
router.get('/collisions/history', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = collisionResolver.getCollisionHistory(limit);
    const analysis = collisionResolver.analyzeConflictPatterns();

    res.json({ history, analysis });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch collision history' });
  }
});

/**
 * POST /api/decisions/collisions/check
 * Check for potential collisions before approving
 */
router.post('/collisions/check', (req: Request, res: Response) => {
  try {
    const { decisionId } = req.body;

    if (!decisionId) {
      return res.status(400).json({ error: 'decisionId is required' });
    }

    const decision = decisionEngine.getDecision(decisionId);
    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    const pending = decisionEngine.getPendingDecisions();
    const collisions = collisionResolver.detectCollisions(decision, pending);

    res.json({
      hasCollisions: collisions.length > 0,
      collisions: collisions.map(c => ({
        type: c.type,
        conflictingDecisions: c.decisions.map(d => d.id),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check collisions' });
  }
});

export default router;
