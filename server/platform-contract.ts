/**
 * Platform Contract — Single Source of Truth
 *
 * This file defines the canonical definitions for:
 * - What is a "healthy" system
 * - What is a "dangerous" system
 * - What is an "unpredictable" system
 *
 * All evaluators MUST use these definitions.
 * No exceptions. No overrides. One truth.
 */

// ============================================================
// SYSTEM HEALTH STATES
// ============================================================

export type SystemHealthState =
  | 'healthy'       // All systems nominal, full autonomy
  | 'degraded'      // Some issues, limited autonomy
  | 'at_risk'       // Significant issues, human oversight required
  | 'dangerous'     // Critical failures, block all autonomous actions
  | 'unpredictable' // Conflicting signals, cannot determine state
  | 'unknown';      // No data available

// ============================================================
// THRESHOLDS — The single source of truth for all evaluators
// ============================================================

export const CONTRACT = {
  // Readiness thresholds
  readiness: {
    healthy: 80,      // Score >= 80 is healthy
    degraded: 60,     // Score >= 60 is degraded
    dangerous: 40,    // Score < 40 is dangerous
  },

  // Autonomy thresholds
  autonomy: {
    maxDailyActions: 1000,
    maxHourlyActions: 100,
    maxPendingApprovals: 50,
    budgetWarningPercent: 80,
    budgetCriticalPercent: 95,
  },

  // Incident thresholds
  incidents: {
    maxCriticalActive: 0,     // Any critical = dangerous
    maxHighActive: 2,         // More than 2 high = at_risk
    maxMediumActive: 10,      // More than 10 medium = degraded
    recentWindowHours: 24,    // Look back window
  },

  // Risk thresholds
  risk: {
    maxCriticalRisks: 0,
    maxHighRisks: 3,
    blastRadiusThreshold: 0.3, // 30% of system affected = dangerous
  },

  // Governance thresholds
  governance: {
    maxBlockedApprovals: 10,
    maxPendingOverrides: 5,
    maxViolationsPerHour: 3,
  },

  // Cache & Performance
  performance: {
    snapshotTTLSeconds: 30,
    maxAggregationTimeoutMs: 5000,
    maxRetries: 2,
  },
} as const;

// ============================================================
// FEATURE AVAILABILITY STATES
// ============================================================

export type FeatureAvailability =
  | 'available'                 // Fully operational
  | 'available_with_constraints' // Works but with limits
  | 'blocked'                   // Cannot be used
  | 'requires_approval'         // Needs human approval
  | 'simulated_only';           // Can only run in simulation

// ============================================================
// INTENT TYPES — What users/systems can request
// ============================================================

export type IntentType =
  | 'publish_content'
  | 'unpublish_content'
  | 'go_live'
  | 'go_dark'
  | 'regenerate'
  | 'deploy'
  | 'migrate'
  | 'bulk_update'
  | 'delete_content'
  | 'override_governance'
  | 'change_autonomy'
  | 'export_data'
  | 'import_data';

// ============================================================
// INTENT RISK CLASSIFICATION
// ============================================================

export const INTENT_RISK: Record<IntentType, 'low' | 'medium' | 'high' | 'critical'> = {
  publish_content: 'low',
  unpublish_content: 'medium',
  go_live: 'critical',
  go_dark: 'critical',
  regenerate: 'medium',
  deploy: 'high',
  migrate: 'critical',
  bulk_update: 'high',
  delete_content: 'high',
  override_governance: 'critical',
  change_autonomy: 'critical',
  export_data: 'low',
  import_data: 'medium',
};

// ============================================================
// HEALTH EVALUATION RULES
// ============================================================

export interface HealthSignals {
  readinessScore: number;
  autonomyState: 'normal' | 'degraded' | 'restricted' | 'halted';
  activeCriticalIncidents: number;
  activeHighIncidents: number;
  activeMediumIncidents: number;
  criticalRisks: number;
  highRisks: number;
  blastRadius: number;
  blockedApprovals: number;
  pendingOverrides: number;
  budgetUsagePercent: number;
}

/**
 * Evaluate system health from signals
 * This is THE canonical health evaluation function
 */
export function evaluateSystemHealth(signals: HealthSignals): SystemHealthState {
  const { CONTRACT: C } = { CONTRACT };

  // DANGEROUS: Any critical incident or risk
  if (signals.activeCriticalIncidents > C.incidents.maxCriticalActive) {
    return 'dangerous';
  }
  if (signals.criticalRisks > C.risk.maxCriticalRisks) {
    return 'dangerous';
  }
  if (signals.blastRadius > C.risk.blastRadiusThreshold) {
    return 'dangerous';
  }
  if (signals.autonomyState === 'halted') {
    return 'dangerous';
  }
  if (signals.readinessScore < C.readiness.dangerous) {
    return 'dangerous';
  }

  // AT RISK: Multiple high issues
  if (signals.activeHighIncidents > C.incidents.maxHighActive) {
    return 'at_risk';
  }
  if (signals.highRisks > C.risk.maxHighRisks) {
    return 'at_risk';
  }
  if (signals.autonomyState === 'restricted') {
    return 'at_risk';
  }
  if (signals.budgetUsagePercent > C.autonomy.budgetCriticalPercent) {
    return 'at_risk';
  }

  // DEGRADED: Some issues present
  if (signals.activeMediumIncidents > C.incidents.maxMediumActive) {
    return 'degraded';
  }
  if (signals.readinessScore < C.readiness.degraded) {
    return 'degraded';
  }
  if (signals.autonomyState === 'degraded') {
    return 'degraded';
  }
  if (signals.budgetUsagePercent > C.autonomy.budgetWarningPercent) {
    return 'degraded';
  }
  if (signals.blockedApprovals > C.governance.maxBlockedApprovals) {
    return 'degraded';
  }

  // HEALTHY: All clear
  if (signals.readinessScore >= C.readiness.healthy) {
    return 'healthy';
  }

  // Between degraded and healthy thresholds
  return 'degraded';
}

// ============================================================
// INTENT PERMISSION RULES
// ============================================================

export interface IntentPermission {
  allowed: boolean;
  confidence: number;  // 0-100
  reason: string;
  requiredActions: string[];
  constraints?: string[];
}

/**
 * Evaluate if an intent is allowed given current health
 */
export function evaluateIntentPermission(
  intent: IntentType,
  health: SystemHealthState,
  signals: HealthSignals
): IntentPermission {
  const risk = INTENT_RISK[intent];

  // DANGEROUS: Block everything except low-risk read operations
  if (health === 'dangerous') {
    if (risk === 'low' && intent === 'export_data') {
      return {
        allowed: true,
        confidence: 70,
        reason: 'System in dangerous state, only read operations allowed',
        requiredActions: [],
        constraints: ['Read-only mode active'],
      };
    }
    return {
      allowed: false,
      confidence: 95,
      reason: `System in dangerous state. ${intent} is blocked.`,
      requiredActions: ['Resolve critical incidents', 'Restore system health'],
    };
  }

  // UNPREDICTABLE: Block high-risk, require approval for medium
  if (health === 'unpredictable') {
    if (risk === 'critical' || risk === 'high') {
      return {
        allowed: false,
        confidence: 60,
        reason: 'System state unpredictable. High-risk operations blocked.',
        requiredActions: ['Resolve signal contradictions', 'Manual verification required'],
      };
    }
    return {
      allowed: false,
      confidence: 50,
      reason: 'System state unpredictable. Manual approval required.',
      requiredActions: ['Obtain manual approval'],
    };
  }

  // AT RISK: Block critical, require approval for high
  if (health === 'at_risk') {
    if (risk === 'critical') {
      return {
        allowed: false,
        confidence: 85,
        reason: 'System at risk. Critical operations blocked.',
        requiredActions: ['Reduce active incidents', 'Lower risk profile'],
      };
    }
    if (risk === 'high') {
      return {
        allowed: false,
        confidence: 75,
        reason: 'System at risk. High-risk operations require approval.',
        requiredActions: ['Obtain explicit approval'],
      };
    }
    return {
      allowed: true,
      confidence: 65,
      reason: 'Allowed with monitoring',
      requiredActions: [],
      constraints: ['Enhanced monitoring active', 'Rate limits applied'],
    };
  }

  // DEGRADED: Require approval for critical, allow with constraints for high
  if (health === 'degraded') {
    if (risk === 'critical') {
      return {
        allowed: false,
        confidence: 80,
        reason: 'System degraded. Critical operations require approval.',
        requiredActions: ['Obtain leadership approval'],
      };
    }
    if (risk === 'high') {
      return {
        allowed: true,
        confidence: 70,
        reason: 'Allowed with constraints',
        requiredActions: [],
        constraints: ['Reduced blast radius', 'Rollback plan required'],
      };
    }
    return {
      allowed: true,
      confidence: 80,
      reason: 'Allowed',
      requiredActions: [],
    };
  }

  // HEALTHY: Allow everything with appropriate confidence
  return {
    allowed: true,
    confidence: risk === 'critical' ? 85 : risk === 'high' ? 90 : 95,
    reason: 'System healthy. Operation allowed.',
    requiredActions: [],
  };
}

// ============================================================
// CONTRADICTION DEFINITIONS
// ============================================================

export type ContradictionType =
  | 'readiness_vs_autonomy'
  | 'governance_vs_risk'
  | 'reports_vs_incidents'
  | 'health_vs_availability'
  | 'budget_vs_activity'
  | 'approval_vs_block';

export interface ContradictionDefinition {
  type: ContradictionType;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detection: (signals: HealthSignals, extras?: Record<string, unknown>) => boolean;
  suggestedResolution: string;
}

export const CONTRADICTION_RULES: ContradictionDefinition[] = [
  {
    type: 'readiness_vs_autonomy',
    description: 'Readiness says GO but autonomy is restricted',
    severity: 'high',
    detection: (s) => s.readinessScore >= CONTRACT.readiness.healthy &&
                      (s.autonomyState === 'restricted' || s.autonomyState === 'halted'),
    suggestedResolution: 'Review autonomy restrictions — readiness indicates system is ready',
  },
  {
    type: 'governance_vs_risk',
    description: 'Governance allows action but risk is high',
    severity: 'high',
    detection: (s) => s.blockedApprovals === 0 && s.highRisks > CONTRACT.risk.maxHighRisks,
    suggestedResolution: 'Review risk assessment — governance may be too permissive',
  },
  {
    type: 'budget_vs_activity',
    description: 'Budget nearly exhausted but system expects high activity',
    severity: 'medium',
    detection: (s) => s.budgetUsagePercent > CONTRACT.autonomy.budgetCriticalPercent,
    suggestedResolution: 'Increase budget or reduce planned activity',
  },
  {
    type: 'health_vs_availability',
    description: 'System reports healthy but features are blocked',
    severity: 'medium',
    detection: (s) => s.readinessScore >= CONTRACT.readiness.healthy && s.blockedApprovals > 5,
    suggestedResolution: 'Review blocked approvals — may be stale',
  },
];

// ============================================================
// EXPORTS
// ============================================================

export default {
  CONTRACT,
  INTENT_RISK,
  CONTRADICTION_RULES,
  evaluateSystemHealth,
  evaluateIntentPermission,
};
