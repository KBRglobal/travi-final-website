/**
 * Security Gate Adapter for Ops Actions
 *
 * Minimal adapter that wraps ops operations with security checks.
 * Respects Security Gate as the single authority.
 *
 * Actions protected:
 * - deploy.canary.start
 * - deploy.rollback
 * - ops.load_shedding
 * - ops.incident.escalate
 *
 * Security modes:
 * - monitor: Advisory logs only
 * - enforce: Allow with approval checks
 * - lockdown: Block canary & rollback, allow health only
 */

import { log } from '../lib/logger';
import type { Environment } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[SecurityGate] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[SecurityGate] ${msg}`, data),
  block: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[SecurityGate][BLOCKED] ${msg}`, data),
};

// ============================================================================
// Security Mode & Threat Level
// ============================================================================

export type SecurityMode = 'monitor' | 'enforce' | 'lockdown';
export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

interface SecurityState {
  mode: SecurityMode;
  threatLevel: ThreatLevel;
  lastUpdated: Date;
  lockdownReason?: string;
}

// Runtime state - configurable via environment or API
let securityState: SecurityState = {
  mode: (process.env.SECURITY_MODE as SecurityMode) || 'enforce',
  threatLevel: 'none',
  lastUpdated: new Date(),
};

/**
 * Get current security state
 */
export function getSecurityState(): SecurityState {
  return { ...securityState };
}

/**
 * Update security mode
 */
export function setSecurityMode(mode: SecurityMode, reason?: string): void {
  const previous = securityState.mode;
  securityState = {
    ...securityState,
    mode,
    lastUpdated: new Date(),
    lockdownReason: mode === 'lockdown' ? reason : undefined,
  };

  logger.warn('Security mode changed', {
    previous,
    new: mode,
    reason,
  });
}

/**
 * Update threat level
 */
export function setThreatLevel(level: ThreatLevel): void {
  const previous = securityState.threatLevel;
  securityState = {
    ...securityState,
    threatLevel: level,
    lastUpdated: new Date(),
  };

  if (level === 'critical' || level === 'high') {
    logger.warn('Threat level elevated', { previous, new: level });
  } else {
    logger.info('Threat level updated', { previous, new: level });
  }
}

// ============================================================================
// Override Management
// ============================================================================

interface SecurityOverride {
  id: string;
  action: string;
  environment: Environment;
  reason: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  active: boolean;
}

const MAX_OVERRIDES = 100;
const overrides: Map<string, SecurityOverride> = new Map();

/**
 * Create a security override with TTL
 */
export function createOverride(
  action: string,
  environment: Environment,
  reason: string,
  createdBy: string,
  ttlMinutes: number = 60
): SecurityOverride {
  const id = `${action}:${environment}:${Date.now()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  const override: SecurityOverride = {
    id,
    action,
    environment,
    reason,
    createdBy,
    createdAt: now,
    expiresAt,
    active: true,
  };

  // Bounded storage
  if (overrides.size >= MAX_OVERRIDES) {
    const oldest = Array.from(overrides.entries())
      .filter(([_, o]) => !o.active || o.expiresAt < now)
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())[0];
    if (oldest) {
      overrides.delete(oldest[0]);
    }
  }

  overrides.set(id, override);

  logger.warn('Security override created', {
    id,
    action,
    environment,
    ttlMinutes,
    createdBy,
    reason,
  });

  return override;
}

/**
 * Check if an override exists and is valid
 */
export function hasValidOverride(action: string, environment: Environment): SecurityOverride | null {
  const now = new Date();

  for (const override of overrides.values()) {
    if (
      override.action === action &&
      override.environment === environment &&
      override.active &&
      override.expiresAt > now
    ) {
      return override;
    }
  }

  return null;
}

/**
 * Revoke an override
 */
export function revokeOverride(id: string): boolean {
  const override = overrides.get(id);
  if (!override) return false;

  override.active = false;
  logger.info('Security override revoked', { id });
  return true;
}

/**
 * List active overrides
 */
export function listOverrides(): SecurityOverride[] {
  const now = new Date();
  return Array.from(overrides.values())
    .filter(o => o.active && o.expiresAt > now)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ============================================================================
// Security Gate Check
// ============================================================================

export interface SecurityCheckResult {
  allowed: boolean;
  reason: string;
  mode: SecurityMode;
  requiresOverride: boolean;
  override?: SecurityOverride;
  advisory: boolean;
}

export type OpsAction =
  | 'deploy.canary.start'
  | 'deploy.rollback'
  | 'ops.load_shedding'
  | 'ops.incident.escalate';

/**
 * Check if an ops action is allowed by the security gate
 */
export async function checkSecurityGate(
  action: OpsAction,
  environment: Environment,
  context?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    requesterId?: string;
  }
): Promise<SecurityCheckResult> {
  const { mode, threatLevel } = securityState;

  // Check for high-severity incidents blocking actions
  const hasBlockingIncidents = await checkForBlockingIncidents();

  // LOCKDOWN MODE: Block canary & rollback
  if (mode === 'lockdown') {
    // Allow health-only actions
    if (action === 'ops.incident.escalate') {
      return {
        allowed: true,
        reason: 'Incident escalation allowed in lockdown',
        mode,
        requiresOverride: false,
        advisory: false,
      };
    }

    logger.block(`Action blocked in lockdown mode`, {
      action,
      environment,
      lockdownReason: securityState.lockdownReason,
    });

    return {
      allowed: false,
      reason: `Blocked: System is in lockdown mode. ${securityState.lockdownReason || ''}`.trim(),
      mode,
      requiresOverride: true,
      advisory: false,
    };
  }

  // Environment restrictions (production requires special handling)
  if (environment === 'production') {
    // Check for active high-severity incidents
    if (hasBlockingIncidents && (action === 'deploy.canary.start' || action === 'deploy.rollback')) {
      // Check for override
      const override = hasValidOverride(action, environment);
      if (override) {
        logger.info('Override applied for production action with active incidents', {
          action,
          overrideId: override.id,
        });
        return {
          allowed: true,
          reason: `Allowed via override: ${override.reason}`,
          mode,
          requiresOverride: false,
          override,
          advisory: false,
        };
      }

      logger.block('Action blocked due to active high-severity incidents', {
        action,
        environment,
      });

      return {
        allowed: false,
        reason: 'Blocked: Cannot perform action in production with active high-severity incidents',
        mode,
        requiresOverride: true,
        advisory: false,
      };
    }

    // Check for override
    const override = hasValidOverride(action, environment);
    if (!override) {
      if (mode === 'enforce') {
        logger.block('Production action requires override', {
          action,
          environment,
        });

        return {
          allowed: false,
          reason: 'Blocked: Production actions require explicit override with TTL',
          mode,
          requiresOverride: true,
          advisory: false,
        };
      }
    } else {
      logger.info('Override applied for production action', {
        action,
        overrideId: override.id,
      });
      return {
        allowed: true,
        reason: `Allowed via override: ${override.reason}`,
        mode,
        requiresOverride: false,
        override,
        advisory: false,
      };
    }
  }

  // MONITOR MODE: Advisory only
  if (mode === 'monitor') {
    logger.info('Advisory: Action would require approval in enforce mode', {
      action,
      environment,
    });

    return {
      allowed: true,
      reason: 'Allowed (monitor mode - advisory only)',
      mode,
      requiresOverride: false,
      advisory: true,
    };
  }

  // ENFORCE MODE for non-production: Check threat level
  if (threatLevel === 'critical' || threatLevel === 'high') {
    const override = hasValidOverride(action, environment);
    if (!override) {
      logger.block('Action blocked due to elevated threat level', {
        action,
        environment,
        threatLevel,
      });

      return {
        allowed: false,
        reason: `Blocked: Threat level is ${threatLevel}. Override required.`,
        mode,
        requiresOverride: true,
        advisory: false,
      };
    }
  }

  // Incident escalation special handling
  if (action === 'ops.incident.escalate') {
    // Only block if severity is high/critical and we're already at critical threat
    if (context?.severity === 'critical' && threatLevel === 'critical') {
      logger.warn('Critical incident escalation during critical threat level', {
        action,
        severity: context.severity,
        threatLevel,
      });
    }
  }

  // Default: Allow in staging/development
  return {
    allowed: true,
    reason: 'Allowed',
    mode,
    requiresOverride: false,
    advisory: false,
  };
}

/**
 * Check for active high-severity incidents
 */
async function checkForBlockingIncidents(): Promise<boolean> {
  try {
    const { getIncidentStats } = await import('./incident-lifecycle');
    const stats = getIncidentStats();
    return (stats.bySeverity.critical || 0) > 0 || (stats.bySeverity.high || 0) > 0;
  } catch {
    // If incident system unavailable, don't block
    return false;
  }
}

// ============================================================================
// Wrapped Ops Actions
// ============================================================================

/**
 * Secure wrapper for starting canary deployment
 */
export async function secureStartCanary(
  version: string,
  baselineVersion: string,
  environment: Environment,
  config?: unknown,
  requesterId?: string
): Promise<{ result: unknown } | { blocked: true; reason: string }> {
  const check = await checkSecurityGate('deploy.canary.start', environment, { requesterId });

  if (!check.allowed) {
    return { blocked: true, reason: check.reason };
  }

  const { startCanary } = await import('./canary-deployment');
  const result = startCanary(version, baselineVersion, environment, config as any);

  logger.info('Canary started via security gate', {
    version,
    environment,
    mode: check.mode,
    override: check.override?.id,
  });

  return { result };
}

/**
 * Secure wrapper for creating rollback
 */
export async function secureCreateRollback(
  fromVersion: string,
  toVersion: string,
  environment: Environment,
  trigger: string,
  actor?: string
): Promise<{ result: unknown } | { blocked: true; reason: string }> {
  const check = await checkSecurityGate('deploy.rollback', environment, { requesterId: actor });

  if (!check.allowed) {
    return { blocked: true, reason: check.reason };
  }

  const { createRollbackPlan } = await import('./rollback-manager');
  const result = createRollbackPlan(fromVersion, toVersion, environment, trigger as any, actor);

  logger.info('Rollback created via security gate', {
    fromVersion,
    toVersion,
    environment,
    trigger,
    mode: check.mode,
    override: check.override?.id,
  });

  return { result };
}

/**
 * Secure wrapper for activating load shedding
 */
export async function secureActivateLoadShedding(
  level: 'warning' | 'critical' | 'emergency',
  reason: string,
  requesterId?: string
): Promise<{ result: unknown } | { blocked: true; reason: string }> {
  // Load shedding affects all environments
  const environment: Environment = (process.env.NODE_ENV as Environment) || 'development';
  const check = await checkSecurityGate('ops.load_shedding', environment, { requesterId });

  if (!check.allowed) {
    return { blocked: true, reason: check.reason };
  }

  const { forceLevel } = await import('./load-shedding');
  forceLevel(level, reason);

  logger.info('Load shedding activated via security gate', {
    level,
    reason,
    mode: check.mode,
  });

  return { result: { level, activated: true } };
}

/**
 * Secure wrapper for escalating incident
 */
export async function secureEscalateIncident(
  incidentId: string,
  actor: string,
  severity: 'low' | 'medium' | 'high' | 'critical'
): Promise<{ result: unknown } | { blocked: true; reason: string }> {
  // Only gate high/critical escalations
  if (severity !== 'high' && severity !== 'critical') {
    const { escalateIncident } = await import('./incident-lifecycle');
    const result = escalateIncident(incidentId, actor);
    return { result };
  }

  const environment: Environment = (process.env.NODE_ENV as Environment) || 'development';
  const check = await checkSecurityGate('ops.incident.escalate', environment, { severity, requesterId: actor });

  if (!check.allowed) {
    return { blocked: true, reason: check.reason };
  }

  const { escalateIncident } = await import('./incident-lifecycle');
  const result = escalateIncident(incidentId, actor);

  logger.info('Incident escalated via security gate', {
    incidentId,
    severity,
    mode: check.mode,
  });

  return { result };
}

// ============================================================================
// Auto-lockdown Triggers
// ============================================================================

/**
 * Trigger lockdown based on threat conditions
 */
export function evaluateAutoLockdown(): void {
  const { threatLevel } = securityState;

  // Auto-lockdown on critical threat
  if (threatLevel === 'critical' && securityState.mode !== 'lockdown') {
    setSecurityMode('lockdown', 'Auto-triggered: Critical threat level detected');
  }
}

/**
 * Subscribe to incident events for auto-lockdown
 */
export async function initSecurityGateListeners(): Promise<void> {
  try {
    const { subscribeToIncidentEvents } = await import('./incident-lifecycle');

    subscribeToIncidentEvents((incident, event) => {
      // Elevate threat on critical incidents
      if (event === 'created' && incident.severity === 'critical') {
        setThreatLevel('critical');
        evaluateAutoLockdown();
      }

      // Lower threat when critical incidents resolve
      if (event === 'phase_resolution' && incident.severity === 'critical') {
        // Check if any other critical incidents exist
        import('./incident-lifecycle').then(({ listIncidents }) => {
          const criticalOpen = listIncidents({ status: 'open', severity: 'critical' });
          if (criticalOpen.length === 0) {
            setThreatLevel('high'); // Step down, not remove
          }
        });
      }
    });

    logger.info('Security gate listeners initialized');
  } catch (err) {
    logger.warn('Failed to initialize security gate listeners', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// ============================================================================
// API Helpers
// ============================================================================

/**
 * Get security gate status for API
 */
export function getSecurityGateStatus(): {
  mode: SecurityMode;
  threatLevel: ThreatLevel;
  lockdownReason?: string;
  activeOverrides: number;
  lastUpdated: Date;
} {
  return {
    mode: securityState.mode,
    threatLevel: securityState.threatLevel,
    lockdownReason: securityState.lockdownReason,
    activeOverrides: listOverrides().length,
    lastUpdated: securityState.lastUpdated,
  };
}
