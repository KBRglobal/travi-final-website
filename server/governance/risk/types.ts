/**
 * Systemic Risk Accumulation Model - Type Definitions
 * Tracks latent risks that don't trigger incidents yet
 */

/**
 * Risk attribution categories
 */
export type RiskAttributionType = 'team' | 'feature' | 'policy' | 'automation' | 'human';

/**
 * Risk event types that contribute to systemic risk
 */
export type RiskEventType =
  | 'warning_ignored'        // Warning was issued but not acted upon
  | 'near_miss'              // Almost had incident but avoided
  | 'budget_exhausted'       // Budget ran out
  | 'policy_bypassed'        // Policy was overridden
  | 'latency_spike'          // System slowed significantly
  | 'error_rate_elevated'    // Error rate above normal
  | 'capacity_near_limit'    // Approaching capacity limits
  | 'drift_detected'         // Policy drift detected
  | 'automation_overridden'  // Automation decision reversed
  | 'approval_forced'        // Approval granted under pressure
  | 'recovery_delayed'       // Recovery took too long
  | 'mitigation_succeeded'   // Risk was successfully mitigated (negative risk)
  | 'incident_occurred';     // Actual incident happened

/**
 * A single risk event
 */
export interface RiskEvent {
  id: string;
  type: RiskEventType;
  timestamp: Date;

  // Risk value (positive = adds risk, negative = reduces risk)
  riskDelta: number;

  // Attribution
  attribution: {
    type: RiskAttributionType;
    id: string;
    name: string;
  };

  // Context
  context: {
    feature?: string;
    team?: string;
    policy?: string;
    decisionSource?: 'automation' | 'human';
    description: string;
  };

  // Decay configuration
  decay: {
    halfLifeHours: number;
    decaysTo: number; // Minimum risk after decay
  };

  // State
  currentRisk: number;
  lastDecayAt: Date;
  mitigatedAt?: Date;
  mitigatedBy?: string;
}

/**
 * Accumulated risk for an attribution target
 */
export interface RiskAccumulation {
  attributionType: RiskAttributionType;
  attributionId: string;
  attributionName: string;

  // Current state
  currentRisk: number;
  peakRisk: number;
  peakAt: Date;

  // Components
  activeEvents: number;
  mitigatedEvents: number;
  totalEventsEver: number;

  // Trend
  trend: {
    hourlyDelta: number;
    dailyDelta: number;
    weeklyDelta: number;
  };

  // Risk breakdown by type
  riskByType: Partial<Record<RiskEventType, number>>;

  lastUpdated: Date;
}

/**
 * A latent (hidden) risk that hasn't triggered an incident yet
 */
export interface LatentRisk {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Risk score
  score: number;
  confidence: number;

  // Attribution
  primaryAttribution: RiskEvent['attribution'];
  contributingFactors: Array<{
    type: RiskEventType;
    count: number;
    contribution: number;
  }>;

  // Detection
  firstDetected: Date;
  lastUpdated: Date;
  occurrences: number;

  // Prediction
  incidentProbability: number; // Probability of incident if unaddressed
  estimatedImpact: 'low' | 'medium' | 'high' | 'critical';
  timeToIncident?: number; // Estimated hours until incident

  // Status
  status: 'active' | 'mitigating' | 'mitigated' | 'realized';
  mitigationNotes?: string;
}

/**
 * Risk contributor summary
 */
export interface RiskContributor {
  rank: number;
  attributionType: RiskAttributionType;
  attributionId: string;
  attributionName: string;
  riskScore: number;
  riskPercentage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  topRiskTypes: RiskEventType[];
}

/**
 * Systemic risk summary
 */
export interface SystemicRiskSummary {
  computedAt: Date;

  // Overall score (0-100)
  overallScore: number;
  rating: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';

  // Breakdown
  bySource: {
    automation: number;
    human: number;
  };
  byCategory: Partial<Record<RiskAttributionType, number>>;

  // Top risks
  topHiddenRisks: LatentRisk[];
  topContributors: RiskContributor[];

  // Trend
  trend: {
    direction: 'improving' | 'stable' | 'worsening';
    hourlyChange: number;
    dailyChange: number;
    weeklyChange: number;
  };

  // Action indicators
  urgentMitigations: number;
  warningsIgnored: number;
  riskDebtAge: number; // Hours since oldest unmitigated risk
}

/**
 * Risk ledger configuration
 */
export interface RiskLedgerConfig {
  enabled: boolean;
  maxEventsInMemory: number;
  maxLatentRisks: number;
  defaultDecayHalfLifeHours: number;
  decayIntervalMs: number;
  computeIntervalMs: number;

  // Risk weights by event type
  riskWeights: Record<RiskEventType, number>;

  // Thresholds
  thresholds: {
    lowRisk: number;
    moderateRisk: number;
    elevatedRisk: number;
    highRisk: number;
    criticalRisk: number;
  };
}

export const DEFAULT_RISK_WEIGHTS: Record<RiskEventType, number> = {
  warning_ignored: 5,
  near_miss: 10,
  budget_exhausted: 8,
  policy_bypassed: 7,
  latency_spike: 4,
  error_rate_elevated: 6,
  capacity_near_limit: 5,
  drift_detected: 4,
  automation_overridden: 3,
  approval_forced: 6,
  recovery_delayed: 5,
  mitigation_succeeded: -15, // Reduces risk
  incident_occurred: 25,
};

export const DEFAULT_RISK_LEDGER_CONFIG: RiskLedgerConfig = {
  enabled: process.env.ENABLE_PLATFORM_SELF_GOVERNANCE === 'true',
  maxEventsInMemory: 5000,
  maxLatentRisks: 100,
  defaultDecayHalfLifeHours: 24,
  decayIntervalMs: 15 * 60 * 1000, // 15 minutes
  computeIntervalMs: 5 * 60 * 1000, // 5 minutes
  riskWeights: DEFAULT_RISK_WEIGHTS,
  thresholds: {
    lowRisk: 20,
    moderateRisk: 40,
    elevatedRisk: 60,
    highRisk: 80,
    criticalRisk: 100,
  },
};
