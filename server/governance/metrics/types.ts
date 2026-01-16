/**
 * Platform Self-Governance System - Governance Quality Metrics Types
 * Defines the signals that measure governance quality over time
 */

/**
 * Time windows for metric computation
 */
export type MetricWindow = 'hour' | 'day' | 'week' | 'month';

/**
 * Source of a decision
 */
export type DecisionSource = 'automation' | 'human' | 'hybrid';

/**
 * Governance quality signal identifiers
 */
export type GovernanceSignal =
  | 'override_accuracy'           // Overrides that avoided incidents vs caused them
  | 'policy_precision'            // False blocks vs false allows
  | 'approval_effectiveness'      // Approved changes that degraded system
  | 'autonomy_trust_score'        // How often humans revert automation
  | 'readiness_volatility'        // Flapping rate of readiness states
  | 'incident_preventability'     // Incidents that had prior warning signals
  | 'budget_waste_ratio'          // Unused budget allocation
  | 'decision_latency_drift'      // How decision times change over time
  | 'executive_surprise_index'    // Incidents without prior warning
  | 'escalation_effectiveness'    // Escalations that changed outcomes
  | 'automation_degradation_rate' // Automation decisions getting worse
  | 'governance_response_time'    // Time from signal to intervention
  | 'recovery_efficiency'         // Time to recover from governance failures
  | 'false_alarm_rate'            // Warnings that weren't real issues
  | 'intervention_success_rate';  // Interventions that improved outcomes

/**
 * A computed governance quality score
 */
export interface GovernanceScore {
  signal: GovernanceSignal;
  window: MetricWindow;
  windowStart: Date;
  windowEnd: Date;

  // Core value (0-1 normalized)
  value: number;

  // Components that make up the score
  components: {
    numerator: number;
    denominator: number;
    formula: string;
  };

  // Trend compared to previous window
  trend: {
    direction: 'improving' | 'stable' | 'degrading';
    delta: number;
    previousValue: number;
  };

  // Interpretation
  rating: 'excellent' | 'good' | 'acceptable' | 'concerning' | 'critical';
  threshold: {
    excellent: number;
    good: number;
    acceptable: number;
    concerning: number;
  };

  // Metadata
  dataPoints: number;
  confidence: number;
  computedAt: Date;
}

/**
 * Historical score record for persistence
 */
export interface HistoricalScore {
  id: string;
  signal: GovernanceSignal;
  window: MetricWindow;
  periodKey: string; // e.g., "2024-01-15-hour-14" or "2024-W03"
  value: number;
  components: GovernanceScore['components'];
  rating: GovernanceScore['rating'];
  dataPoints: number;
  recordedAt: Date;
}

/**
 * Raw event types for metric computation
 */
export interface GovernanceEvent {
  id: string;
  type: GovernanceEventType;
  timestamp: Date;
  source: DecisionSource;
  feature?: string;
  team?: string;

  // Event-specific data
  data: Record<string, unknown>;

  // Outcome (if known)
  outcome?: {
    resolved: boolean;
    hadIncident: boolean;
    wasReverted: boolean;
    degradedSystem: boolean;
    latencyMs?: number;
  };
}

export type GovernanceEventType =
  | 'decision_made'
  | 'override_applied'
  | 'approval_granted'
  | 'approval_denied'
  | 'incident_occurred'
  | 'warning_issued'
  | 'budget_allocated'
  | 'budget_consumed'
  | 'escalation_triggered'
  | 'readiness_changed'
  | 'intervention_applied'
  | 'revert_executed';

/**
 * Aggregate metrics for a time window
 */
export interface WindowAggregate {
  window: MetricWindow;
  start: Date;
  end: Date;

  counts: {
    totalDecisions: number;
    automationDecisions: number;
    humanDecisions: number;
    overrides: number;
    approvals: number;
    denials: number;
    incidents: number;
    warnings: number;
    escalations: number;
    reverts: number;
  };

  outcomes: {
    incidentsAfterAllow: number;
    incidentsAfterDeny: number;
    overridesThatAvoided: number;
    overridesThatCaused: number;
    approvalsThaDegraded: number;
    warningsBeforeIncidents: number;
    warningsWithoutIncidents: number;
  };

  latencies: {
    avgDecisionMs: number;
    p95DecisionMs: number;
    avgRecoveryMs: number;
  };

  budgets: {
    allocated: number;
    consumed: number;
    wasted: number;
  };
}

/**
 * Configuration for the metrics system
 */
export interface GovernanceMetricsConfig {
  enabled: boolean;
  maxEventsInMemory: number;
  maxHistoricalScores: number;
  computeIntervalMs: number;
  retentionDays: number;

  // Thresholds for ratings
  thresholds: Record<GovernanceSignal, {
    excellent: number;
    good: number;
    acceptable: number;
    concerning: number;
  }>;
}

export const DEFAULT_THRESHOLDS: GovernanceMetricsConfig['thresholds'] = {
  override_accuracy: { excellent: 0.9, good: 0.8, acceptable: 0.7, concerning: 0.5 },
  policy_precision: { excellent: 0.95, good: 0.9, acceptable: 0.8, concerning: 0.6 },
  approval_effectiveness: { excellent: 0.95, good: 0.9, acceptable: 0.85, concerning: 0.7 },
  autonomy_trust_score: { excellent: 0.9, good: 0.8, acceptable: 0.7, concerning: 0.5 },
  readiness_volatility: { excellent: 0.1, good: 0.2, acceptable: 0.3, concerning: 0.5 }, // Lower is better
  incident_preventability: { excellent: 0.9, good: 0.8, acceptable: 0.7, concerning: 0.5 },
  budget_waste_ratio: { excellent: 0.1, good: 0.2, acceptable: 0.3, concerning: 0.5 }, // Lower is better
  decision_latency_drift: { excellent: 0.1, good: 0.2, acceptable: 0.3, concerning: 0.5 }, // Lower is better
  executive_surprise_index: { excellent: 0.05, good: 0.1, acceptable: 0.2, concerning: 0.4 }, // Lower is better
  escalation_effectiveness: { excellent: 0.9, good: 0.8, acceptable: 0.7, concerning: 0.5 },
  automation_degradation_rate: { excellent: 0.05, good: 0.1, acceptable: 0.2, concerning: 0.4 }, // Lower is better
  governance_response_time: { excellent: 0.9, good: 0.8, acceptable: 0.7, concerning: 0.5 },
  recovery_efficiency: { excellent: 0.9, good: 0.8, acceptable: 0.7, concerning: 0.5 },
  false_alarm_rate: { excellent: 0.1, good: 0.2, acceptable: 0.3, concerning: 0.5 }, // Lower is better
  intervention_success_rate: { excellent: 0.9, good: 0.8, acceptable: 0.7, concerning: 0.5 },
};

export const DEFAULT_METRICS_CONFIG: GovernanceMetricsConfig = {
  enabled: process.env.ENABLE_PLATFORM_SELF_GOVERNANCE === 'true',
  maxEventsInMemory: 10000,
  maxHistoricalScores: 5000,
  computeIntervalMs: 5 * 60 * 1000, // 5 minutes
  retentionDays: 90,
  thresholds: DEFAULT_THRESHOLDS,
};

/**
 * Signals where lower values are better
 */
export const INVERTED_SIGNALS: GovernanceSignal[] = [
  'readiness_volatility',
  'budget_waste_ratio',
  'decision_latency_drift',
  'executive_surprise_index',
  'automation_degradation_rate',
  'false_alarm_rate',
];
