/**
 * Contradiction & Drift Detector
 * Identifies conflicts between platform subsystems
 * Feature flag: ENABLE_CONTRADICTION_DETECTOR (default: false)
 */

import { Router, RequestHandler } from 'express';
import { generatePlatformSnapshot, PlatformSnapshot } from '../platform-status';

// Types
export type ContradictionSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Contradiction {
  id: string;
  type: 'conflict' | 'drift' | 'inconsistency';
  severity: ContradictionSeverity;
  source1: {
    subsystem: string;
    state: string;
    value: unknown;
  };
  source2: {
    subsystem: string;
    state: string;
    value: unknown;
  };
  description: string;
  suggestedResolution: string;
  detectedAt: string;
}

export interface ContradictionReport {
  timestamp: string;
  contradictions: Contradiction[];
  totalCount: number;
  bySeverity: Record<ContradictionSeverity, number>;
  healthy: boolean;
  summary: string;
}

// Contradiction detectors
type ContradictionDetector = (snapshot: PlatformSnapshot) => Contradiction[];

const detectors: ContradictionDetector[] = [];

/**
 * Register a contradiction detector
 */
export function registerDetector(detector: ContradictionDetector): void {
  detectors.push(detector);
}

/**
 * Detect: Governance allows, Autonomy blocks
 */
registerDetector((snapshot) => {
  const contradictions: Contradiction[] = [];

  // If governance has no pending approvals but autonomy is blocked
  if (
    snapshot.governance.pendingApprovals === 0 &&
    snapshot.autonomy.mode === 'BLOCKED'
  ) {
    contradictions.push({
      id: 'CONT-GOV-AUTO-001',
      type: 'conflict',
      severity: 'high',
      source1: {
        subsystem: 'governance',
        state: 'no_pending_approvals',
        value: snapshot.governance.pendingApprovals,
      },
      source2: {
        subsystem: 'autonomy',
        state: 'blocked',
        value: snapshot.autonomy.restrictions,
      },
      description: 'Governance has no blockers but autonomy is blocked',
      suggestedResolution: 'Review autonomy restrictions - they may be outdated or misconfigured',
      detectedAt: new Date().toISOString(),
    });
  }

  return contradictions;
});

/**
 * Detect: Readiness GO but Incidents open
 */
registerDetector((snapshot) => {
  const contradictions: Contradiction[] = [];

  if (
    snapshot.readiness.level === 'GO_LIVE' &&
    snapshot.incidents.bySeverity.critical > 0
  ) {
    contradictions.push({
      id: 'CONT-READY-INC-001',
      type: 'conflict',
      severity: 'critical',
      source1: {
        subsystem: 'readiness',
        state: 'go_live',
        value: snapshot.readiness.level,
      },
      source2: {
        subsystem: 'incidents',
        state: 'critical_open',
        value: snapshot.incidents.bySeverity.critical,
      },
      description: 'Platform is at GO_LIVE but has critical incidents open',
      suggestedResolution: 'Either resolve critical incidents or downgrade readiness level',
      detectedAt: new Date().toISOString(),
    });
  }

  if (
    snapshot.readiness.level === 'GO_LIVE' &&
    snapshot.incidents.bySeverity.high > 2
  ) {
    contradictions.push({
      id: 'CONT-READY-INC-002',
      type: 'inconsistency',
      severity: 'high',
      source1: {
        subsystem: 'readiness',
        state: 'go_live',
        value: snapshot.readiness.level,
      },
      source2: {
        subsystem: 'incidents',
        state: 'multiple_high',
        value: snapshot.incidents.bySeverity.high,
      },
      description: 'Platform is at GO_LIVE but has multiple high-severity incidents',
      suggestedResolution: 'Review if GO_LIVE status is appropriate with ongoing issues',
      detectedAt: new Date().toISOString(),
    });
  }

  return contradictions;
});

/**
 * Detect: Risk score vs Readiness mismatch
 */
registerDetector((snapshot) => {
  const contradictions: Contradiction[] = [];

  // High risk score but GO_LIVE
  if (
    snapshot.risks.overallScore < 50 &&
    snapshot.readiness.level === 'GO_LIVE'
  ) {
    contradictions.push({
      id: 'CONT-RISK-READY-001',
      type: 'conflict',
      severity: 'critical',
      source1: {
        subsystem: 'risks',
        state: 'low_score',
        value: snapshot.risks.overallScore,
      },
      source2: {
        subsystem: 'readiness',
        state: 'go_live',
        value: snapshot.readiness.level,
      },
      description: `Risk score (${snapshot.risks.overallScore}/100) is too low for GO_LIVE status`,
      suggestedResolution: 'Mitigate identified risks or lower readiness level',
      detectedAt: new Date().toISOString(),
    });
  }

  // Unmitigated critical risks but no blockers
  const criticalRisks = snapshot.risks.topRisks.filter(
    r => r.severity === 'critical' && !r.mitigated
  );

  if (criticalRisks.length > 0 && snapshot.readiness.blockers.length === 0) {
    contradictions.push({
      id: 'CONT-RISK-READY-002',
      type: 'inconsistency',
      severity: 'high',
      source1: {
        subsystem: 'risks',
        state: 'critical_unmitigated',
        value: criticalRisks.length,
      },
      source2: {
        subsystem: 'readiness',
        state: 'no_blockers',
        value: snapshot.readiness.blockers.length,
      },
      description: `${criticalRisks.length} critical risk(s) unmitigated but readiness shows no blockers`,
      suggestedResolution: 'Critical risks should be added as readiness blockers',
      detectedAt: new Date().toISOString(),
    });
  }

  return contradictions;
});

/**
 * Detect: Feature state inconsistencies
 */
registerDetector((snapshot) => {
  const contradictions: Contradiction[] = [];

  // Features marked ON but in LIMITED state
  for (const [name, feature] of Object.entries(snapshot.features)) {
    if (feature.state === 'LIMITED' && feature.dependencies) {
      const missingDeps = feature.dependencies.filter(
        dep => snapshot.features[dep]?.state !== 'ON'
      );

      if (missingDeps.length > 0) {
        contradictions.push({
          id: `CONT-FEAT-DEP-${name}`,
          type: 'drift',
          severity: 'medium',
          source1: {
            subsystem: 'features',
            state: `${name}_limited`,
            value: feature.state,
          },
          source2: {
            subsystem: 'features',
            state: 'missing_dependencies',
            value: missingDeps,
          },
          description: `Feature "${name}" is LIMITED due to missing dependencies: ${missingDeps.join(', ')}`,
          suggestedResolution: `Enable dependencies: ${missingDeps.join(', ')}`,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  return contradictions;
});

/**
 * Detect: Governance state vs Autonomy state
 */
registerDetector((snapshot) => {
  const contradictions: Contradiction[] = [];

  // Active overrides but autonomy in ALLOWED mode
  if (
    snapshot.governance.activeOverrides > 0 &&
    snapshot.autonomy.mode === 'ALLOWED'
  ) {
    contradictions.push({
      id: 'CONT-GOV-AUTO-002',
      type: 'inconsistency',
      severity: 'medium',
      source1: {
        subsystem: 'governance',
        state: 'active_overrides',
        value: snapshot.governance.activeOverrides,
      },
      source2: {
        subsystem: 'autonomy',
        state: 'allowed',
        value: snapshot.autonomy.mode,
      },
      description: 'Active governance overrides exist but autonomy is fully allowed',
      suggestedResolution: 'Review if overrides should affect autonomy mode',
      detectedAt: new Date().toISOString(),
    });
  }

  return contradictions;
});

/**
 * Detect: Autonomy confidence vs decision conflicts
 */
registerDetector((snapshot) => {
  const contradictions: Contradiction[] = [];

  // High confidence but degraded mode
  if (
    snapshot.autonomy.confidenceLevel > 80 &&
    snapshot.autonomy.mode === 'DEGRADED'
  ) {
    contradictions.push({
      id: 'CONT-AUTO-CONF-001',
      type: 'inconsistency',
      severity: 'low',
      source1: {
        subsystem: 'autonomy',
        state: 'high_confidence',
        value: snapshot.autonomy.confidenceLevel,
      },
      source2: {
        subsystem: 'autonomy',
        state: 'degraded',
        value: snapshot.autonomy.mode,
      },
      description: 'Autonomy has high confidence but is in degraded mode',
      suggestedResolution: 'Consider upgrading autonomy mode if restrictions are no longer needed',
      detectedAt: new Date().toISOString(),
    });
  }

  // Low confidence but allowed mode
  if (
    snapshot.autonomy.confidenceLevel < 50 &&
    snapshot.autonomy.mode === 'ALLOWED'
  ) {
    contradictions.push({
      id: 'CONT-AUTO-CONF-002',
      type: 'conflict',
      severity: 'high',
      source1: {
        subsystem: 'autonomy',
        state: 'low_confidence',
        value: snapshot.autonomy.confidenceLevel,
      },
      source2: {
        subsystem: 'autonomy',
        state: 'allowed',
        value: snapshot.autonomy.mode,
      },
      description: 'Autonomy has low confidence but is fully allowed',
      suggestedResolution: 'Consider degrading autonomy mode until confidence improves',
      detectedAt: new Date().toISOString(),
    });
  }

  return contradictions;
});

/**
 * Generate contradiction report
 */
export async function detectContradictions(): Promise<ContradictionReport> {
  const snapshot = await generatePlatformSnapshot();

  // Run all detectors
  const allContradictions: Contradiction[] = [];

  for (const detector of detectors) {
    try {
      const found = detector(snapshot);
      allContradictions.push(...found);
    } catch {
      // Silently skip failed detectors
    }
  }

  // Count by severity
  const bySeverity: Record<ContradictionSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const c of allContradictions) {
    bySeverity[c.severity]++;
  }

  // Determine health
  const healthy = bySeverity.critical === 0 && bySeverity.high === 0;

  // Generate summary
  let summary: string;
  if (allContradictions.length === 0) {
    summary = 'No contradictions detected. All subsystems are consistent.';
  } else if (healthy) {
    summary = `${allContradictions.length} minor contradiction(s) detected. Review recommended but not blocking.`;
  } else {
    summary = `${bySeverity.critical} critical and ${bySeverity.high} high severity contradiction(s) require immediate attention.`;
  }

  return {
    timestamp: new Date().toISOString(),
    contradictions: allContradictions,
    totalCount: allContradictions.length,
    bySeverity,
    healthy,
    summary,
  };
}

// Express router
export const contradictionRoutes = Router();

const getContradictions: RequestHandler = async (_req, res) => {
  if (process.env.ENABLE_CONTRADICTION_DETECTOR !== 'true') {
    res.status(503).json({
      error: 'Contradiction detector not enabled',
      hint: 'Set ENABLE_CONTRADICTION_DETECTOR=true',
    });
    return;
  }

  try {
    const report = await detectContradictions();
    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to detect contradictions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

contradictionRoutes.get('/contradictions', getContradictions);

export default contradictionRoutes;
