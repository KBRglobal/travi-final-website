/**
 * System Domain
 * Phase 1 Foundation: Complete operational control surface
 *
 * This domain provides:
 * - Health checks (liveness, readiness, full health)
 * - System information (version, uptime, build info)
 * - Configuration status (services, features)
 * - Feature flags status
 * - Aggregated diagnostics for Ops dashboards
 *
 * Legacy Endpoint Mapping:
 * - /api/health → /api/_foundation/health
 * - /api/health/live → /api/_foundation/health/live
 * - /api/health/ready → /api/_foundation/health/ready
 * - /api/version → /api/_foundation/version
 * - /api/system-status → /api/_foundation/config/status
 */

import type { Express, Router } from 'express';
import { Router as createRouter } from 'express';
import { foundationEventBus } from '../../shared/events';
import {
  asyncHandler,
  diagnosticsRateLimiter,
  healthRateLimiter,
  configRateLimiter,
} from '../../shared/middleware';
import { healthController } from './controllers/health.controller';
import { systemInfoController } from './controllers/system-info.controller';
import { configStatusController } from './controllers/config-status.controller';
import { diagnosticsController } from './controllers/diagnostics.controller';

// ============================================================================
// Feature Flags (all OFF by default)
// ============================================================================

/** Master switch for system domain */
const ENABLE_SYSTEM_DOMAIN = process.env.ENABLE_DOMAIN_SYSTEM === 'true';

/** Enable foundation ping endpoint (smoke tests) */
const ENABLE_FOUNDATION_PING = process.env.ENABLE_FOUNDATION_PING === 'true';

/** Enable health endpoints */
const ENABLE_FOUNDATION_HEALTH = process.env.ENABLE_FOUNDATION_HEALTH === 'true';

/** Enable diagnostics aggregator endpoint */
const ENABLE_SYSTEM_DIAGNOSTICS = process.env.ENABLE_SYSTEM_DIAGNOSTICS === 'true';

/** Enable config/status endpoint */
const ENABLE_SYSTEM_CONFIG_STATUS = process.env.ENABLE_SYSTEM_CONFIG_STATUS === 'true';

/** Enable feature flags endpoint */
const ENABLE_SYSTEM_FEATURE_FLAGS = process.env.ENABLE_SYSTEM_FEATURE_FLAGS === 'true';

// ============================================================================
// Helper: Feature Guard
// ============================================================================

function featureGuard(enabled: boolean, featureName: string) {
  return (_req: any, res: any, next: any) => {
    if (!enabled) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Feature '${featureName}' is disabled`,
      });
    }
    next();
  };
}

// ============================================================================
// Routes
// ============================================================================

export function createSystemRouter(): Router {
  const router = createRouter();

  // --------------------------------------------------------------------------
  // Domain metadata endpoint (always available when domain is enabled)
  // --------------------------------------------------------------------------
  router.get('/_domain/health', (_req, res) => {
    res.json({
      domain: 'system',
      enabled: ENABLE_SYSTEM_DOMAIN,
      features: {
        ping: ENABLE_FOUNDATION_PING,
        health: ENABLE_FOUNDATION_HEALTH,
        diagnostics: ENABLE_SYSTEM_DIAGNOSTICS,
        configStatus: ENABLE_SYSTEM_CONFIG_STATUS,
        featureFlags: ENABLE_SYSTEM_FEATURE_FLAGS,
      },
      status: 'active',
    });
  });

  // --------------------------------------------------------------------------
  // Foundation ping (smoke tests)
  // --------------------------------------------------------------------------
  router.get('/ping', featureGuard(ENABLE_FOUNDATION_PING, 'ping'), (req, res) => {
    res.json({
      pong: true,
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
    });
  });

  // --------------------------------------------------------------------------
  // Health endpoints
  // Mirrors legacy: /api/health, /api/health/live, /api/health/ready
  // Rate limited when ENABLE_FOUNDATION_RATE_LIMIT=true (default: OFF)
  // --------------------------------------------------------------------------
  router.get(
    '/health',
    featureGuard(ENABLE_FOUNDATION_HEALTH, 'health'),
    healthRateLimiter,
    asyncHandler(async (req, res) => healthController.getHealth(req, res))
  );

  router.get(
    '/health/live',
    featureGuard(ENABLE_FOUNDATION_HEALTH, 'health'),
    healthRateLimiter,
    (req, res) => healthController.getLiveness(req, res)
  );

  router.get(
    '/health/ready',
    featureGuard(ENABLE_FOUNDATION_HEALTH, 'health'),
    healthRateLimiter,
    asyncHandler(async (req, res) => healthController.getReadiness(req, res))
  );

  // --------------------------------------------------------------------------
  // System Info endpoints
  // Mirrors legacy: /api/version
  // Rate limited when ENABLE_FOUNDATION_RATE_LIMIT=true (default: OFF)
  // --------------------------------------------------------------------------
  router.get(
    '/version',
    featureGuard(ENABLE_SYSTEM_CONFIG_STATUS, 'version'),
    configRateLimiter,
    (req, res) => systemInfoController.getVersion(req, res)
  );

  router.get(
    '/uptime',
    featureGuard(ENABLE_SYSTEM_CONFIG_STATUS, 'uptime'),
    configRateLimiter,
    (req, res) => systemInfoController.getUptime(req, res)
  );

  router.get(
    '/build-info',
    featureGuard(ENABLE_SYSTEM_CONFIG_STATUS, 'build-info'),
    configRateLimiter,
    (req, res) => systemInfoController.getBuildInfo(req, res)
  );

  // --------------------------------------------------------------------------
  // Config Status endpoints
  // Mirrors legacy: /api/system-status
  // Rate limited when ENABLE_FOUNDATION_RATE_LIMIT=true (default: OFF)
  // --------------------------------------------------------------------------
  router.get(
    '/config/status',
    featureGuard(ENABLE_SYSTEM_CONFIG_STATUS, 'config-status'),
    configRateLimiter,
    (req, res) => configStatusController.getConfigStatus(req, res)
  );

  router.get(
    '/features',
    featureGuard(ENABLE_SYSTEM_CONFIG_STATUS, 'features'),
    configRateLimiter,
    (req, res) => configStatusController.getFeatures(req, res)
  );

  router.get(
    '/domains',
    featureGuard(ENABLE_SYSTEM_CONFIG_STATUS, 'domains'),
    configRateLimiter,
    (req, res) => configStatusController.getDomains(req, res)
  );

  // --------------------------------------------------------------------------
  // Feature Flags endpoint
  // Rate limited when ENABLE_FOUNDATION_RATE_LIMIT=true (default: OFF)
  // --------------------------------------------------------------------------
  router.get(
    '/flags',
    featureGuard(ENABLE_SYSTEM_FEATURE_FLAGS, 'feature-flags'),
    configRateLimiter,
    (req, res) => configStatusController.getFlags(req, res)
  );

  // --------------------------------------------------------------------------
  // Diagnostics Aggregator endpoint
  // For Ops dashboards and monitoring
  // Rate limited when ENABLE_FOUNDATION_RATE_LIMIT=true (default: OFF)
  // Security: Never leaks secrets, only exposes configured: true/false
  // --------------------------------------------------------------------------
  router.get(
    '/diagnostics',
    featureGuard(ENABLE_SYSTEM_DIAGNOSTICS, 'diagnostics'),
    diagnosticsRateLimiter,
    asyncHandler(async (req, res) => diagnosticsController.getDiagnostics(req, res))
  );

  // --------------------------------------------------------------------------
  // Event Bus Stats (debugging, always available)
  // --------------------------------------------------------------------------
  router.get('/events/stats', (_req, res) => {
    const stats = foundationEventBus.getStats();
    res.json(stats);
  });

  return router;
}

// ============================================================================
// Domain Registration
// ============================================================================

export function registerSystemDomain(app: Express): void {
  if (!ENABLE_SYSTEM_DOMAIN) {
    return;
  }

  const router = createSystemRouter();
  app.use('/api/_foundation', router);
}

// ============================================================================
// Domain Metadata
// ============================================================================

export const systemDomainInfo = {
  name: 'system',
  description: 'System domain - health, diagnostics, config, flags',
  enabled: ENABLE_SYSTEM_DOMAIN,
  features: {
    ping: ENABLE_FOUNDATION_PING,
    health: ENABLE_FOUNDATION_HEALTH,
    diagnostics: ENABLE_SYSTEM_DIAGNOSTICS,
    configStatus: ENABLE_SYSTEM_CONFIG_STATUS,
    featureFlags: ENABLE_SYSTEM_FEATURE_FLAGS,
  },
  routes: {
    base: '/api/_foundation',
    endpoints: [
      // Always available
      'GET /api/_foundation/_domain/health',
      'GET /api/_foundation/events/stats',
      // Feature-flagged
      'GET /api/_foundation/ping',
      'GET /api/_foundation/health',
      'GET /api/_foundation/health/live',
      'GET /api/_foundation/health/ready',
      'GET /api/_foundation/version',
      'GET /api/_foundation/uptime',
      'GET /api/_foundation/build-info',
      'GET /api/_foundation/config/status',
      'GET /api/_foundation/features',
      'GET /api/_foundation/domains',
      'GET /api/_foundation/flags',
      'GET /api/_foundation/diagnostics',
    ],
  },
  legacyMapping: {
    '/api/health': '/api/_foundation/health',
    '/api/health/live': '/api/_foundation/health/live',
    '/api/health/ready': '/api/_foundation/health/ready',
    '/api/version': '/api/_foundation/version',
    '/api/system-status': '/api/_foundation/config/status',
  },
};

// ============================================================================
// Exports
// ============================================================================

export * from './dto';
export * from './services';
export * from './controllers';
