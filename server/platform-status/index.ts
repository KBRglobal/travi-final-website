/**
 * Platform Status Module
 * Single atomic snapshot of the entire system state
 * Feature flag: ENABLE_PLATFORM_STATUS (default: false)
 */

import { Router, RequestHandler } from 'express';

// Types
export interface GovernanceStatus {
  totalRoles: number;
  activeRoles: number;
  pendingApprovals: number;
  activeOverrides: number;
  lastAuditEntry: string | null;
}

export interface ReadinessStatus {
  level: 'GO_LIVE' | 'CUTOVER' | 'STAGING' | 'BLOCKED';
  blockers: string[];
  checksCompleted: number;
  checksFailed: number;
  lastCheck: string;
}

export interface AutonomyStatus {
  mode: 'ALLOWED' | 'DEGRADED' | 'BLOCKED';
  restrictions: string[];
  confidenceLevel: number;
  lastDecision: string | null;
}

export interface IncidentStatus {
  open: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  oldestOpen: string | null;
  meanTimeToResolve: number | null;
}

export interface RiskSummary {
  overallScore: number; // 0-100
  topRisks: Array<{
    id: string;
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    mitigated: boolean;
  }>;
}

export type FeatureState = 'ON' | 'LIMITED' | 'BLOCKED' | 'OFF';

export interface FeatureAvailability {
  [featureName: string]: {
    state: FeatureState;
    reason?: string;
    dependencies?: string[];
  };
}

export interface PlatformSnapshot {
  timestamp: string;
  version: string;
  governance: GovernanceStatus;
  readiness: ReadinessStatus;
  autonomy: AutonomyStatus;
  incidents: IncidentStatus;
  risks: RiskSummary;
  features: FeatureAvailability;
  healthy: boolean;
  summary: string;
}

// In-memory state (bounded, no DB)
const state = {
  lastSnapshot: null as PlatformSnapshot | null,
  snapshotTTL: 30000, // 30 seconds
  lastSnapshotTime: 0,
};

// Aggregators with timeouts
const AGGREGATION_TIMEOUT = 5000; // 5 seconds max per aggregation

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

async function aggregateGovernance(): Promise<GovernanceStatus> {
  // Aggregate from governance subsystem (in-memory simulation)
  return withTimeout(
    (async () => {
      // In production, this would query the governance module
      const enableGovernance = process.env.ENABLE_ENTERPRISE_GOVERNANCE === 'true';
      if (!enableGovernance) {
        return {
          totalRoles: 0,
          activeRoles: 0,
          pendingApprovals: 0,
          activeOverrides: 0,
          lastAuditEntry: null,
        };
      }

      return {
        totalRoles: 6,
        activeRoles: 6,
        pendingApprovals: 0,
        activeOverrides: 0,
        lastAuditEntry: new Date().toISOString(),
      };
    })(),
    AGGREGATION_TIMEOUT,
    {
      totalRoles: 0,
      activeRoles: 0,
      pendingApprovals: 0,
      activeOverrides: 0,
      lastAuditEntry: null,
    }
  );
}

async function aggregateReadiness(): Promise<ReadinessStatus> {
  return withTimeout(
    (async () => {
      const blockers: string[] = [];

      // Check critical feature flags
      if (process.env.ENABLE_ENTERPRISE_GOVERNANCE !== 'true') {
        blockers.push('Enterprise governance not enabled');
      }
      if (process.env.ENABLE_POLICY_ENFORCEMENT !== 'true') {
        blockers.push('Policy enforcement not enabled');
      }

      const level: ReadinessStatus['level'] =
        blockers.length > 2 ? 'BLOCKED' :
        blockers.length > 0 ? 'STAGING' :
        'GO_LIVE';

      return {
        level,
        blockers,
        checksCompleted: 10 - blockers.length,
        checksFailed: blockers.length,
        lastCheck: new Date().toISOString(),
      };
    })(),
    AGGREGATION_TIMEOUT,
    {
      level: 'BLOCKED' as const,
      blockers: ['Aggregation timeout'],
      checksCompleted: 0,
      checksFailed: 1,
      lastCheck: new Date().toISOString(),
    }
  );
}

async function aggregateAutonomy(): Promise<AutonomyStatus> {
  return withTimeout(
    (async () => {
      const restrictions: string[] = [];

      // Check autonomy constraints
      const enableAutonomy = process.env.ENABLE_AUTONOMY_MATRIX === 'true';
      if (!enableAutonomy) {
        restrictions.push('Autonomy matrix not enabled');
      }

      const mode: AutonomyStatus['mode'] =
        restrictions.length > 1 ? 'BLOCKED' :
        restrictions.length > 0 ? 'DEGRADED' :
        'ALLOWED';

      return {
        mode,
        restrictions,
        confidenceLevel: mode === 'ALLOWED' ? 95 : mode === 'DEGRADED' ? 60 : 0,
        lastDecision: new Date().toISOString(),
      };
    })(),
    AGGREGATION_TIMEOUT,
    {
      mode: 'BLOCKED' as const,
      restrictions: ['Aggregation timeout'],
      confidenceLevel: 0,
      lastDecision: null,
    }
  );
}

async function aggregateIncidents(): Promise<IncidentStatus> {
  return withTimeout(
    (async () => {
      // In production, this would query incident tracking
      return {
        open: 0,
        bySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        oldestOpen: null,
        meanTimeToResolve: null,
      };
    })(),
    AGGREGATION_TIMEOUT,
    {
      open: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      oldestOpen: null,
      meanTimeToResolve: null,
    }
  );
}

async function aggregateRisks(): Promise<RiskSummary> {
  return withTimeout(
    (async () => {
      const risks: RiskSummary['topRisks'] = [];

      // Evaluate top risks based on system state
      if (process.env.ENABLE_POLICY_ENFORCEMENT !== 'true') {
        risks.push({
          id: 'RISK-001',
          category: 'security',
          severity: 'high',
          description: 'Policy enforcement disabled - actions not gated',
          mitigated: false,
        });
      }

      if (process.env.ENABLE_APPROVAL_ESCALATION !== 'true') {
        risks.push({
          id: 'RISK-002',
          category: 'governance',
          severity: 'medium',
          description: 'Approval escalation disabled - SLA breaches not auto-escalated',
          mitigated: false,
        });
      }

      const overallScore = Math.max(0, 100 - (risks.filter(r => !r.mitigated).length * 15));

      return {
        overallScore,
        topRisks: risks.slice(0, 5),
      };
    })(),
    AGGREGATION_TIMEOUT,
    {
      overallScore: 0,
      topRisks: [],
    }
  );
}

async function aggregateFeatures(): Promise<FeatureAvailability> {
  return withTimeout(
    (async () => {
      const features: FeatureAvailability = {};

      // Core features
      features['governance'] = {
        state: process.env.ENABLE_ENTERPRISE_GOVERNANCE === 'true' ? 'ON' : 'OFF',
        dependencies: ['rbac', 'approvals', 'audit'],
      };

      features['rbac'] = {
        state: process.env.ENABLE_RBAC === 'true' ? 'ON' : 'OFF',
      };

      features['policy_enforcement'] = {
        state: process.env.ENABLE_POLICY_ENFORCEMENT === 'true' ? 'ON' : 'OFF',
        dependencies: ['governance'],
      };

      features['export_center'] = {
        state: process.env.ENABLE_EXPORT_CENTER_V2 === 'true' ? 'ON' : 'OFF',
        dependencies: ['governance', 'approvals'],
      };

      features['approval_notifications'] = {
        state: process.env.ENABLE_APPROVAL_NOTIFICATIONS === 'true' ? 'ON' : 'OFF',
      };

      features['approval_escalation'] = {
        state: process.env.ENABLE_APPROVAL_ESCALATION === 'true' ? 'ON' : 'OFF',
        dependencies: ['approval_notifications'],
      };

      features['autonomy_matrix'] = {
        state: process.env.ENABLE_AUTONOMY_MATRIX === 'true' ? 'ON' : 'OFF',
      };

      features['platform_status'] = {
        state: process.env.ENABLE_PLATFORM_STATUS === 'true' ? 'ON' : 'LIMITED',
        reason: 'Self-referential - always available when accessed',
      };

      // Check for blocked features due to missing dependencies
      for (const [name, feature] of Object.entries(features)) {
        if (feature.state === 'ON' && feature.dependencies) {
          const missingDeps = feature.dependencies.filter(
            dep => features[dep]?.state !== 'ON'
          );
          if (missingDeps.length > 0) {
            features[name] = {
              ...feature,
              state: 'LIMITED',
              reason: `Missing dependencies: ${missingDeps.join(', ')}`,
            };
          }
        }
      }

      return features;
    })(),
    AGGREGATION_TIMEOUT,
    {}
  );
}

/**
 * Generate a single atomic platform snapshot
 */
export async function generatePlatformSnapshot(): Promise<PlatformSnapshot> {
  // Check cache
  const now = Date.now();
  if (state.lastSnapshot && (now - state.lastSnapshotTime) < state.snapshotTTL) {
    return state.lastSnapshot;
  }

  // Aggregate all subsystems in parallel with individual timeouts
  const [governance, readiness, autonomy, incidents, risks, features] = await Promise.all([
    aggregateGovernance(),
    aggregateReadiness(),
    aggregateAutonomy(),
    aggregateIncidents(),
    aggregateRisks(),
    aggregateFeatures(),
  ]);

  // Calculate overall health
  const healthy =
    readiness.level !== 'BLOCKED' &&
    autonomy.mode !== 'BLOCKED' &&
    incidents.bySeverity.critical === 0 &&
    risks.overallScore >= 50;

  // Generate summary
  const summary = healthy
    ? `Platform operational. Readiness: ${readiness.level}, Autonomy: ${autonomy.mode}, Risk score: ${risks.overallScore}/100`
    : `Platform degraded. Blockers: ${readiness.blockers.length}, Open incidents: ${incidents.open}, Risk score: ${risks.overallScore}/100`;

  const snapshot: PlatformSnapshot = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    governance,
    readiness,
    autonomy,
    incidents,
    risks,
    features,
    healthy,
    summary,
  };

  // Cache
  state.lastSnapshot = snapshot;
  state.lastSnapshotTime = now;

  return snapshot;
}

/**
 * Clear cached snapshot (for testing)
 */
export function clearSnapshotCache(): void {
  state.lastSnapshot = null;
  state.lastSnapshotTime = 0;
}

// Express router
export const platformStatusRoutes = Router();

const getPlatformStatus: RequestHandler = async (_req, res) => {
  if (process.env.ENABLE_PLATFORM_STATUS !== 'true') {
    res.status(503).json({
      error: 'Platform status not enabled',
      hint: 'Set ENABLE_PLATFORM_STATUS=true',
    });
    return;
  }

  try {
    const snapshot = await generatePlatformSnapshot();
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate platform snapshot',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

platformStatusRoutes.get('/status', getPlatformStatus);

export default platformStatusRoutes;
