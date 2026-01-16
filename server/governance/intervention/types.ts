/**
 * Governance Intervention Engine - Type Definitions
 * Recommends adjustments but NEVER hard-blocks
 */

import { GovernanceSignal } from '../metrics/types';
import { RiskEventType, LatentRisk } from '../risk/types';

/**
 * Types of interventions the system can recommend
 */
export type InterventionType =
  | 'tighten_budget'           // Reduce autonomy budget
  | 'loosen_budget'            // Increase autonomy budget
  | 'raise_approval_level'     // Require higher approval authority
  | 'lower_approval_level'     // Reduce approval requirements
  | 'extend_cooldown'          // Increase time between actions
  | 'reduce_cooldown'          // Decrease time between actions
  | 'require_simulation'       // Force simulation before approval
  | 'increase_monitoring'      // Add more monitoring
  | 'decrease_monitoring'      // Reduce monitoring overhead
  | 'adjust_confidence'        // Modify confidence thresholds
  | 'prioritize_review'        // Move to front of review queue
  | 'deprioritize_review'      // Move to back of review queue
  | 'escalate_attention'       // Notify higher authority
  | 'suggest_policy_review';   // Recommend policy examination

/**
 * Priority of an intervention
 */
export type InterventionPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Status of an intervention
 */
export type InterventionStatus =
  | 'proposed'     // Recommended but not acted upon
  | 'accepted'     // Accepted and applied
  | 'rejected'     // Rejected by operator
  | 'expired'      // No longer relevant
  | 'superseded';  // Replaced by newer intervention

/**
 * A recommended intervention
 */
export interface Intervention {
  id: string;
  type: InterventionType;
  priority: InterventionPriority;
  status: InterventionStatus;

  // Target
  target: {
    type: 'feature' | 'team' | 'policy' | 'global';
    id: string;
    name: string;
  };

  // What to adjust
  adjustment: {
    parameter: string;
    currentValue: unknown;
    recommendedValue: unknown;
    percentChange?: number;
  };

  // Why
  rationale: {
    summary: string;
    triggeringSignals: GovernanceSignal[];
    triggeringRisks: string[];
    dataPoints: number;
    confidence: number;
  };

  // Reversibility
  reversibility: {
    isReversible: boolean;
    rollbackProcedure?: string;
    rollbackTimeMinutes?: number;
  };

  // Timeline
  createdAt: Date;
  expiresAt: Date;
  actedUponAt?: Date;
  actedUponBy?: string;

  // Outcome tracking
  outcome?: {
    measuredAt: Date;
    wasEffective: boolean;
    signalImpact: Record<GovernanceSignal, number>;
    notes?: string;
  };
}

/**
 * Auto-adjustment that happens without human approval
 */
export interface AutoAdjustment {
  id: string;
  type: 'confidence_score' | 'recommendation_priority' | 'monitoring_level';

  target: {
    type: 'feature' | 'team' | 'policy';
    id: string;
  };

  adjustment: {
    from: number;
    to: number;
    reason: string;
  };

  appliedAt: Date;
  expiresAt?: Date;
  wasReverted: boolean;
  revertedAt?: Date;
}

/**
 * Intervention trigger rule
 */
export interface InterventionRule {
  id: string;
  name: string;
  enabled: boolean;

  // Conditions (all must be true)
  conditions: Array<{
    type: 'signal_below' | 'signal_above' | 'risk_above' | 'pattern_detected';
    target: GovernanceSignal | RiskEventType | string;
    threshold: number;
    window: 'hour' | 'day' | 'week';
  }>;

  // Action to take
  action: {
    interventionType: InterventionType;
    priority: InterventionPriority;
    adjustmentPercent?: number;
  };

  // Rate limiting
  cooldown: {
    minIntervalHours: number;
    maxPerDay: number;
  };

  lastTriggered?: Date;
  triggerCount: number;
}

/**
 * Intervention engine configuration
 */
export interface InterventionEngineConfig {
  enabled: boolean;
  maxActiveInterventions: number;
  maxAutoAdjustments: number;
  interventionExpiryHours: number;
  autoAdjustmentExpiryHours: number;
  evaluationIntervalMs: number;

  // Thresholds for auto-adjustments
  autoAdjustThresholds: {
    minConfidenceAdjustment: number;
    maxConfidenceAdjustment: number;
    confidenceStepSize: number;
  };
}

export const DEFAULT_INTERVENTION_CONFIG: InterventionEngineConfig = {
  enabled: process.env.ENABLE_PLATFORM_SELF_GOVERNANCE === 'true',
  maxActiveInterventions: 50,
  maxAutoAdjustments: 100,
  interventionExpiryHours: 72,
  autoAdjustmentExpiryHours: 24,
  evaluationIntervalMs: 10 * 60 * 1000, // 10 minutes

  autoAdjustThresholds: {
    minConfidenceAdjustment: -0.2,
    maxConfidenceAdjustment: 0.2,
    confidenceStepSize: 0.05,
  },
};

/**
 * Default intervention rules
 */
export const DEFAULT_INTERVENTION_RULES: InterventionRule[] = [
  {
    id: 'rule-override-accuracy-low',
    name: 'Low Override Accuracy',
    enabled: true,
    conditions: [
      { type: 'signal_below', target: 'override_accuracy', threshold: 0.7, window: 'day' },
    ],
    action: {
      interventionType: 'raise_approval_level',
      priority: 'high',
    },
    cooldown: { minIntervalHours: 24, maxPerDay: 1 },
    triggerCount: 0,
  },
  {
    id: 'rule-autonomy-trust-erosion',
    name: 'Autonomy Trust Erosion',
    enabled: true,
    conditions: [
      { type: 'signal_below', target: 'autonomy_trust_score', threshold: 0.6, window: 'day' },
    ],
    action: {
      interventionType: 'tighten_budget',
      priority: 'medium',
      adjustmentPercent: -20,
    },
    cooldown: { minIntervalHours: 48, maxPerDay: 1 },
    triggerCount: 0,
  },
  {
    id: 'rule-incident-preventability-low',
    name: 'Low Incident Preventability',
    enabled: true,
    conditions: [
      { type: 'signal_below', target: 'incident_preventability', threshold: 0.6, window: 'week' },
    ],
    action: {
      interventionType: 'increase_monitoring',
      priority: 'high',
    },
    cooldown: { minIntervalHours: 72, maxPerDay: 1 },
    triggerCount: 0,
  },
  {
    id: 'rule-executive-surprise-high',
    name: 'High Executive Surprise',
    enabled: true,
    conditions: [
      { type: 'signal_above', target: 'executive_surprise_index', threshold: 0.3, window: 'week' },
    ],
    action: {
      interventionType: 'require_simulation',
      priority: 'urgent',
    },
    cooldown: { minIntervalHours: 24, maxPerDay: 2 },
    triggerCount: 0,
  },
  {
    id: 'rule-systemic-risk-elevated',
    name: 'Elevated Systemic Risk',
    enabled: true,
    conditions: [
      { type: 'risk_above', target: 'systemic_risk', threshold: 60, window: 'day' },
    ],
    action: {
      interventionType: 'escalate_attention',
      priority: 'urgent',
    },
    cooldown: { minIntervalHours: 12, maxPerDay: 2 },
    triggerCount: 0,
  },
  {
    id: 'rule-budget-waste-high',
    name: 'High Budget Waste',
    enabled: true,
    conditions: [
      { type: 'signal_above', target: 'budget_waste_ratio', threshold: 0.4, window: 'week' },
    ],
    action: {
      interventionType: 'loosen_budget',
      priority: 'low',
      adjustmentPercent: 15,
    },
    cooldown: { minIntervalHours: 168, maxPerDay: 1 },
    triggerCount: 0,
  },
  {
    id: 'rule-approval-effectiveness-low',
    name: 'Low Approval Effectiveness',
    enabled: true,
    conditions: [
      { type: 'signal_below', target: 'approval_effectiveness', threshold: 0.8, window: 'week' },
    ],
    action: {
      interventionType: 'suggest_policy_review',
      priority: 'medium',
    },
    cooldown: { minIntervalHours: 168, maxPerDay: 1 },
    triggerCount: 0,
  },
];
