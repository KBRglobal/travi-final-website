/**
 * GLCP Admin Routes
 *
 * ⚠️ EXPERIMENTAL - NOT REGISTERED ⚠️
 *
 * STATUS: This route file is NOT currently registered in server/routes.ts
 * Feature Flag: ENABLE_GLCP=true
 * Part of: go-live-control-plane/ system
 *
 * Minimal operator endpoints:
 * - /api/admin/go-live/status - Executive summary (CONFLICTS with server/go-live/)
 * - /api/admin/go-live/explain - Decision explanation
 *
 * WARNING: This route file conflicts with the registered go-live/ system which
 * already uses /api/admin/go-live. If enabling GLCP, use a different path.
 *
 * Before enabling:
 * 1. Ensure ENABLE_GLCP=true
 * 2. Choose non-conflicting path (e.g., /api/admin/go-live/glcp)
 * 3. Register routes in server/routes.ts
 * 4. Make architectural decision on which go-live system to use
 *
 * See: server/ROUTE_REGISTRATION_STATUS.md for go-live systems comparison
 */

import { Router, Request, Response } from 'express';
import { isGLCPEnabled, KNOWN_FEATURE_FLAGS } from '../capabilities/types';
import { getAllCapabilities, groupByDomain, discoverCapabilities, registerCapabilities } from '../capabilities/registry';
import { validateDependencies, detectInvalidStates, getSafeToEnable } from '../capabilities/dependency-resolver';
import { evaluateReadiness, getGoLiveReadiness, getAvailableProbes } from '../readiness/evaluator';
import { explainDecision, getEnforcementLog, getEnforcementStats, OperationContext } from './index';

export const glcpAdminRouter = Router();

// ========================================
// STATUS ENDPOINT
// ========================================

/**
 * GET /api/admin/go-live/status
 *
 * Executive summary of platform readiness
 */
glcpAdminRouter.get('/status', async (req, res) => {
  try {
    // Ensure capabilities are discovered
    if (getAllCapabilities().length === 0) {
      const discovered = discoverCapabilities();
      registerCapabilities(discovered);
    }

    const capabilities = getAllCapabilities();
    const domainGroups = groupByDomain();
    const readiness = await getGoLiveReadiness();
    const invalidStates = detectInvalidStates();
    const safeToEnable = getSafeToEnable();
    const probes = getAvailableProbes();
    const enforcementStats = getEnforcementStats();

    // Calculate domain health
    const domainHealth: Record<string, { enabled: number; disabled: number; risk: string }> = {};
    for (const group of domainGroups) {
      domainHealth[group.domain] = {
        enabled: group.totalEnabled,
        disabled: group.totalDisabled,
        risk: group.overallRisk,
      };
    }

    // Summary
    const summary = {
      glcp: {
        enabled: isGLCPEnabled(),
        version: '1.0.0',
        emergencyStop: process.env.EMERGENCY_STOP_ENABLED === 'true',
      },
      readiness: {
        status: readiness.status,
        canGoLive: readiness.canGoLive,
        score: readiness.score,
        recommendation: readiness.recommendation,
        blockers: readiness.blockers.length,
        warnings: readiness.warnings.length,
      },
      capabilities: {
        total: capabilities.length,
        enabled: capabilities.filter(c => c.status === 'enabled').length,
        disabled: capabilities.filter(c => c.status === 'disabled').length,
        safeToEnable: safeToEnable.length,
        invalidStates: invalidStates.issues.length,
      },
      domains: domainHealth,
      enforcement: {
        decisionsLogged: enforcementStats.total,
        allowed: enforcementStats.allowed,
        blocked: enforcementStats.blocked,
        warned: enforcementStats.warned,
      },
      probes: {
        available: probes.length,
        categories: [...new Set(probes.map(p => p.category))],
      },
      timestamp: new Date().toISOString(),
    };

    res.json(summary);
  } catch (err) {
    console.error('[GLCP] Status error:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// ========================================
// EXPLAIN ENDPOINT
// ========================================

/**
 * POST /api/admin/go-live/explain
 *
 * Explains why an operation would be allowed/blocked
 */
glcpAdminRouter.post('/explain', async (req, res) => {
  try {
    const { type, resourceId, metadata } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Operation type is required' });
    }

    const validTypes = ['publish', 'schedule', 'job', 'ai_call', 'regeneration', 'rollout', 'bulk_change', 'destructive'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid operation type. Valid types: ${validTypes.join(', ')}`,
      });
    }

    const context: OperationContext = {
      type,
      resourceId,
      metadata,
    };

    const explanation = await explainDecision(context);

    res.json({
      operation: type,
      resourceId: resourceId || null,
      decision: {
        action: explanation.decision.action,
        reason: explanation.decision.reason,
        riskLevel: explanation.decision.riskLevel,
      },
      systemStatus: explanation.systemStatus,
      blockers: explanation.blockerDetails,
      affectedCapabilities: explanation.capabilityStatus.filter(c => c.status !== 'enabled').slice(0, 10),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[GLCP] Explain error:', err);
    res.status(500).json({ error: 'Failed to explain decision' });
  }
});

// ========================================
// BLOCKERS ENDPOINT
// ========================================

/**
 * GET /api/admin/go-live/blockers
 *
 * Lists all current blockers
 */
glcpAdminRouter.get('/blockers', async (req, res) => {
  try {
    const readiness = await getGoLiveReadiness();
    const invalidStates = detectInvalidStates();

    const blockers = [
      ...readiness.blockers.map(b => ({ type: 'readiness', message: b })),
      ...invalidStates.issues.map(i => ({
        type: 'capability',
        message: i.details,
        capability: i.capabilityId,
        severity: i.severity,
        fix: i.suggestedFix,
      })),
    ];

    res.json({
      count: blockers.length,
      canGoLive: readiness.canGoLive,
      blockers,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get blockers' });
  }
});

// ========================================
// ENFORCEMENT LOG ENDPOINT
// ========================================

/**
 * GET /api/admin/go-live/enforcement-log
 *
 * Recent enforcement decisions
 */
glcpAdminRouter.get('/enforcement-log', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const log = getEnforcementLog(limit);

    res.json({
      count: log.length,
      entries: log.map(e => ({
        timestamp: e.timestamp.toISOString(),
        operation: e.context.type,
        resourceId: e.context.resourceId,
        action: e.decision.action,
        reason: e.decision.reason,
        riskLevel: e.decision.riskLevel,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get enforcement log' });
  }
});

// ========================================
// CAPABILITIES ENDPOINT
// ========================================

/**
 * GET /api/admin/go-live/capabilities
 *
 * List all registered capabilities
 */
glcpAdminRouter.get('/capabilities', (req, res) => {
  try {
    // Ensure capabilities are discovered
    if (getAllCapabilities().length === 0) {
      const discovered = discoverCapabilities();
      registerCapabilities(discovered);
    }

    const capabilities = getAllCapabilities();
    const safeToEnable = getSafeToEnable();
    const safeIds = new Set(safeToEnable.map(c => c.id));

    const domain = req.query.domain as string;
    const status = req.query.status as string;

    let filtered = capabilities;
    if (domain) {
      filtered = filtered.filter(c => c.domain === domain);
    }
    if (status) {
      filtered = filtered.filter(c => c.status === status);
    }

    res.json({
      total: filtered.length,
      capabilities: filtered.map(c => ({
        id: c.id,
        name: c.name,
        flag: c.flagName,
        domain: c.domain,
        status: c.status,
        riskLevel: c.riskLevel,
        safeToEnable: safeIds.has(c.id),
        dependencies: c.dependencies.length,
        dependents: c.dependents.length,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get capabilities' });
  }
});

// ========================================
// ROLLOUT CHECK ENDPOINT
// ========================================

/**
 * GET /api/admin/go-live/can-enable/:flag
 *
 * Check if a specific flag can be enabled
 */
glcpAdminRouter.get('/can-enable/:flag', async (req, res) => {
  try {
    const { flag } = req.params;

    // Ensure capabilities are discovered
    if (getAllCapabilities().length === 0) {
      const discovered = discoverCapabilities();
      registerCapabilities(discovered);
    }

    const safeToEnable = getSafeToEnable();
    const isSafe = safeToEnable.some(c => c.flagName === flag);

    const invalidStates = detectInvalidStates();
    const issues = invalidStates.issues.filter(i =>
      i.capabilityId.includes(flag.toLowerCase().replace(/_/g, '-'))
    );

    const readiness = await getGoLiveReadiness();

    res.json({
      flag,
      canEnable: isSafe && readiness.canGoLive,
      safeToEnable: isSafe,
      systemReady: readiness.canGoLive,
      issues: issues.map(i => ({
        type: i.issue,
        details: i.details,
        fix: i.suggestedFix,
      })),
      recommendation: isSafe && readiness.canGoLive
        ? 'PROCEED'
        : !isSafe
          ? 'RESOLVE_DEPENDENCIES'
          : 'WAIT_FOR_SYSTEM',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check flag' });
  }
});

export default glcpAdminRouter;
