/**
 * Go-Live Control Plane - Executive API Routes
 *
 * ⚠️ EXPERIMENTAL - NOT REGISTERED ⚠️
 *
 * STATUS: This route file is NOT currently registered in server/routes.ts
 * Feature Flag: ENABLE_GLCP=true
 *
 * REST API for platform go-live operations
 *
 * This is the most sophisticated go-live system with:
 * - System Capability Registry
 * - Environment Readiness Evaluator
 * - Feature Rollout Simulator
 * - Safe Rollout Executor
 *
 * The authoritative/production go-live system is currently: server/go-live/
 *
 * Before enabling:
 * 1. Ensure ENABLE_GLCP=true
 * 2. Register routes in server/routes.ts (suggested path: /api/ops/glcp)
 * 3. Make architectural decision on which go-live system to use
 *
 * See: server/ROUTE_REGISTRATION_STATUS.md for go-live systems comparison
 */

import { Router, Request, Response } from 'express';
import { isGLCPEnabled, CapabilityDomain, RiskLevel } from '../capabilities/types';
import {
  getAllCapabilities,
  getCapability,
  groupByDomain,
  getCapabilityByFlag,
  createSnapshot,
} from '../capabilities/registry';
import {
  validateDependencies,
  detectInvalidStates,
  getSafeToEnable,
  calculateBlastRadius,
} from '../capabilities/dependency-resolver';
import {
  evaluateReadiness,
  quickHealthCheck,
  evaluateCategory,
  getGoLiveReadiness,
} from '../readiness/evaluator';
import { ProbeCategory } from '../readiness/results';
import {
  simulate,
  simulateBatch,
  simulateEnable,
  simulateDisable,
  compareStates,
} from '../simulator/simulator';
import { SimulationInput } from '../simulator/types';
import {
  createPlan,
  approvePlan,
  execute,
  getExecution,
  getPlan,
  listExecutions,
  cancelExecution,
  requestRollback,
  getManualRollbackInstructions,
} from '../executor/executor';
import { getAuditLog, getActivitySummary } from '../executor/audit';
import {
  serializeCapability,
  serializeReadiness,
  serializeSimulation,
  serializePlan,
  serializeExecution,
  serializeAuditEntry,
  DashboardSummary,
} from './serializers';

export const glcpRouter = Router();

// === Middleware ===

function requireGLCP(req: Request, res: Response, next: Function) {
  if (!isGLCPEnabled()) {
    return res.status(503).json({
      error: 'GLCP is not enabled',
      hint: 'Set ENABLE_GLCP=true to enable the Go-Live Control Plane',
    });
  }
  next();
}

// === Dashboard ===

/**
 * GET /api/glcp/dashboard
 * Executive dashboard summary
 */
glcpRouter.get('/dashboard', requireGLCP, async (req, res) => {
  try {
    const capabilities = getAllCapabilities();
    const readiness = await evaluateReadiness({ useCache: true });
    const executions = listExecutions({ limit: 100 });
    const domains = groupByDomain(capabilities);

    const byRisk: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const byDomain: Record<string, { enabled: number; disabled: number }> = {};

    for (const cap of capabilities) {
      byRisk[cap.riskLevel]++;
    }

    for (const [domain, caps] of Object.entries(domains)) {
      byDomain[domain] = {
        enabled: caps.filter(c => c.status === 'enabled').length,
        disabled: caps.filter(c => c.status === 'disabled').length,
      };
    }

    const summary: DashboardSummary = {
      readiness: {
        status: readiness.status,
        score: readiness.probes.length > 0
          ? Math.round(((readiness.summary.passed + readiness.summary.warned * 0.5) / readiness.summary.total) * 100)
          : 100,
        canGoLive: readiness.status !== 'BLOCKED',
      },
      capabilities: {
        total: capabilities.length,
        enabled: capabilities.filter(c => c.status === 'enabled').length,
        disabled: capabilities.filter(c => c.status === 'disabled').length,
        byRisk,
        byDomain: byDomain as Record<CapabilityDomain, { enabled: number; disabled: number }>,
      },
      recentExecutions: {
        total: executions.length,
        successful: executions.filter(e => e.success).length,
        failed: executions.filter(e => !e.success && !e.rolledBack).length,
        rolledBack: executions.filter(e => e.rolledBack).length,
      },
      issues: {
        blocking: readiness.blockingIssues.length,
        warnings: readiness.warnings.length,
      },
      lastChecked: readiness.evaluatedAt.toISOString(),
    };

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate dashboard' });
  }
});

// === Health & Readiness ===

/**
 * GET /api/glcp/health
 * Quick health check
 */
glcpRouter.get('/health', async (req, res) => {
  try {
    const health = await quickHealthCheck();
    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (err) {
    res.status(500).json({ healthy: false, status: 'BLOCKED', message: 'Health check failed' });
  }
});

/**
 * GET /api/glcp/readiness
 * Full readiness evaluation
 */
glcpRouter.get('/readiness', requireGLCP, async (req, res) => {
  try {
    const categories = req.query.categories
      ? (req.query.categories as string).split(',') as ProbeCategory[]
      : undefined;

    const result = await evaluateReadiness({
      useCache: req.query.fresh !== 'true',
      categories,
    });

    res.json(serializeReadiness(result));
  } catch (err) {
    res.status(500).json({ error: 'Readiness evaluation failed' });
  }
});

/**
 * GET /api/glcp/readiness/:category
 * Evaluate specific category
 */
glcpRouter.get('/readiness/:category', requireGLCP, async (req, res) => {
  try {
    const category = req.params.category as ProbeCategory;
    const result = await evaluateCategory(category);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Category evaluation failed' });
  }
});

/**
 * GET /api/glcp/go-live-check
 * Go-live readiness check
 */
glcpRouter.get('/go-live-check', requireGLCP, async (req, res) => {
  try {
    const result = await getGoLiveReadiness();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Go-live check failed' });
  }
});

// === Capabilities ===

/**
 * GET /api/glcp/capabilities
 * List all capabilities
 */
glcpRouter.get('/capabilities', requireGLCP, (req, res) => {
  try {
    const capabilities = getAllCapabilities();
    const domain = req.query.domain as CapabilityDomain | undefined;
    const status = req.query.status as 'enabled' | 'disabled' | undefined;
    const risk = req.query.risk as RiskLevel | undefined;

    let filtered = capabilities;

    if (domain) {
      filtered = filtered.filter(c => c.domain === domain);
    }
    if (status) {
      filtered = filtered.filter(c => c.status === status);
    }
    if (risk) {
      filtered = filtered.filter(c => c.riskLevel === risk);
    }

    res.json({
      total: filtered.length,
      capabilities: filtered.map(serializeCapability),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list capabilities' });
  }
});

/**
 * GET /api/glcp/capabilities/:id
 * Get specific capability
 */
glcpRouter.get('/capabilities/:id', requireGLCP, (req, res) => {
  try {
    const cap = getCapability(req.params.id);
    if (!cap) {
      return res.status(404).json({ error: 'Capability not found' });
    }

    const blastRadius = calculateBlastRadius(cap.id);

    res.json({
      ...serializeCapability(cap),
      blastRadius: {
        directImpact: blastRadius.directImpact.map(c => c.id),
        transitiveImpact: blastRadius.transitiveImpact.map(c => c.id),
        totalAffected: blastRadius.totalAffected,
        riskLevel: blastRadius.riskLevel,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get capability' });
  }
});

/**
 * GET /api/glcp/capabilities/safe-to-enable
 * Get capabilities that can be safely enabled
 */
glcpRouter.get('/capabilities/actions/safe-to-enable', requireGLCP, (req, res) => {
  try {
    const safeToEnable = getSafeToEnable();
    res.json({
      count: safeToEnable.length,
      capabilities: safeToEnable.map(serializeCapability),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get safe-to-enable capabilities' });
  }
});

/**
 * GET /api/glcp/dependencies/validate
 * Validate dependency graph
 */
glcpRouter.get('/dependencies/validate', requireGLCP, (req, res) => {
  try {
    const validation = validateDependencies();
    const invalidStates = detectInvalidStates();

    res.json({
      valid: validation.valid && !invalidStates.hasInvalidStates,
      dependencies: validation,
      invalidStates: invalidStates.issues,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate dependencies' });
  }
});

/**
 * GET /api/glcp/snapshot
 * Get current system snapshot
 */
glcpRouter.get('/snapshot', requireGLCP, (req, res) => {
  try {
    const snapshot = createSnapshot();
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

// === Simulation ===

/**
 * POST /api/glcp/simulate
 * Simulate capability changes
 */
glcpRouter.post('/simulate', requireGLCP, (req, res) => {
  try {
    const { actions, options } = req.body as {
      actions: SimulationInput[];
      options?: { includeTransitive?: boolean; checkResources?: boolean };
    };

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({ error: 'actions array is required' });
    }

    const result = simulateBatch(actions, options);
    res.json(serializeSimulation(result));
  } catch (err) {
    res.status(500).json({ error: 'Simulation failed' });
  }
});

/**
 * POST /api/glcp/simulate/enable/:id
 * Simulate enabling a capability
 */
glcpRouter.post('/simulate/enable/:id', requireGLCP, (req, res) => {
  try {
    const result = simulateEnable(req.params.id);
    res.json(serializeSimulation(result));
  } catch (err) {
    res.status(500).json({ error: 'Simulation failed' });
  }
});

/**
 * POST /api/glcp/simulate/disable/:id
 * Simulate disabling a capability
 */
glcpRouter.post('/simulate/disable/:id', requireGLCP, (req, res) => {
  try {
    const result = simulateDisable(req.params.id);
    res.json(serializeSimulation(result));
  } catch (err) {
    res.status(500).json({ error: 'Simulation failed' });
  }
});

/**
 * POST /api/glcp/simulate/compare
 * Compare current state with proposed changes
 */
glcpRouter.post('/simulate/compare', requireGLCP, (req, res) => {
  try {
    const { actions } = req.body as { actions: SimulationInput[] };

    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({ error: 'actions array is required' });
    }

    const comparison = compareStates(actions);
    res.json(comparison);
  } catch (err) {
    res.status(500).json({ error: 'Comparison failed' });
  }
});

// === Execution ===

/**
 * POST /api/glcp/plans
 * Create an execution plan
 */
glcpRouter.post('/plans', requireGLCP, (req, res) => {
  try {
    const { simulationId, name, description, scheduledFor, expiresAt, actor } = req.body;

    if (!simulationId || !name) {
      return res.status(400).json({ error: 'simulationId and name are required' });
    }

    // First, run the simulation to get the result
    const { actions } = req.body;
    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({ error: 'actions array is required' });
    }

    const simulation = simulateBatch(actions);

    const plan = createPlan(simulation, name, actor || 'api', {
      description,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    res.status(201).json(serializePlan(plan));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

/**
 * GET /api/glcp/plans/:id
 * Get execution plan
 */
glcpRouter.get('/plans/:id', requireGLCP, (req, res) => {
  try {
    const plan = getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.json(serializePlan(plan));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get plan' });
  }
});

/**
 * POST /api/glcp/plans/:id/approve
 * Approve an execution plan
 */
glcpRouter.post('/plans/:id/approve', requireGLCP, (req, res) => {
  try {
    const { actor } = req.body;
    if (!actor) {
      return res.status(400).json({ error: 'actor is required' });
    }

    const plan = approvePlan(req.params.id, actor);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(serializePlan(plan));
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve plan' });
  }
});

/**
 * POST /api/glcp/plans/:id/execute
 * Execute a plan
 */
glcpRouter.post('/plans/:id/execute', requireGLCP, async (req, res) => {
  try {
    const { dryRun, stopOnError, autoRollback, actor } = req.body;

    const result = await execute(req.params.id, {
      dryRun: dryRun ?? false,
      stopOnError: stopOnError ?? true,
      autoRollback: autoRollback ?? true,
      actor: actor || 'api',
    });

    res.json(serializeExecution(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Execution failed';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/glcp/executions
 * List executions
 */
glcpRouter.get('/executions', requireGLCP, (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string | undefined;

    const executions = listExecutions({ limit, status: status as any });
    res.json({
      total: executions.length,
      executions: executions.map(serializeExecution),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list executions' });
  }
});

/**
 * GET /api/glcp/executions/:id
 * Get execution result
 */
glcpRouter.get('/executions/:id', requireGLCP, (req, res) => {
  try {
    const result = getExecution(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.json(serializeExecution(result));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get execution' });
  }
});

/**
 * POST /api/glcp/executions/:id/cancel
 * Cancel an execution
 */
glcpRouter.post('/executions/:id/cancel', requireGLCP, (req, res) => {
  try {
    const { actor } = req.body;
    const result = cancelExecution(req.params.id, actor || 'api');

    if (!result) {
      return res.status(404).json({ error: 'Execution not found or cannot be cancelled' });
    }

    res.json(serializeExecution(result));
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel execution' });
  }
});

/**
 * POST /api/glcp/executions/:id/rollback
 * Rollback an execution
 */
glcpRouter.post('/executions/:id/rollback', requireGLCP, async (req, res) => {
  try {
    const { reason, actor } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'reason is required' });
    }

    const result = await requestRollback(req.params.id, reason, actor || 'api');

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(serializeExecution(result.result!));
  } catch (err) {
    res.status(500).json({ error: 'Rollback failed' });
  }
});

/**
 * GET /api/glcp/executions/:id/rollback-instructions
 * Get manual rollback instructions
 */
glcpRouter.get('/executions/:id/rollback-instructions', requireGLCP, (req, res) => {
  try {
    const instructions = getManualRollbackInstructions(req.params.id);

    if (!instructions) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({ instructions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get rollback instructions' });
  }
});

// === Audit ===

/**
 * GET /api/glcp/audit
 * Get audit log
 */
glcpRouter.get('/audit', requireGLCP, (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const actor = req.query.actor as string | undefined;
    const action = req.query.action as string | undefined;

    const entries = getAuditLog({ limit, offset, actor, action: action as any });

    res.json({
      total: entries.length,
      entries: entries.map(serializeAuditEntry),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

/**
 * GET /api/glcp/audit/summary
 * Get activity summary
 */
glcpRouter.get('/audit/summary', requireGLCP, (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const summary = getActivitySummary(hours);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get activity summary' });
  }
});

export default glcpRouter;
