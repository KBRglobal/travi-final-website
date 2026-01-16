/**
 * Policy Drift Detector - Type Definitions
 * Detects when policies are misaligned with operational reality
 */

import { GuardedFeature } from '../enforcement/types';
import { BudgetPeriod } from '../policy/types';

/**
 * Types of drift that can be detected
 */
export type DriftType =
  | 'budget_exhaustion'      // Budget consistently depleted
  | 'budget_underutilization' // Budget rarely used
  | 'override_spike'         // Override rate increasing
  | 'incident_spike'         // Incident rate increasing
  | 'cost_drift'             // Actual costs diverging from predictions
  | 'latency_degradation'    // Response times increasing
  | 'traffic_shift'          // Traffic patterns changed significantly
  | 'accuracy_decline';      // Decision accuracy declining

/**
 * Severity of detected drift
 */
export type DriftSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * A detected drift instance
 */
export interface DriftSignal {
  id: string;
  type: DriftType;
  severity: DriftSeverity;
  feature: GuardedFeature;
  period?: BudgetPeriod;
  detectedAt: Date;

  // What we observed
  observation: {
    metric: string;
    currentValue: number;
    expectedValue: number;
    deviation: number; // Percentage deviation
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    windowHours: number;
  };

  // Context
  context: {
    dataPoints: number;
    confidence: number;
    startedAt?: Date; // When drift started
    affectedEntities?: string[];
  };

  // Recommended action
  recommendation?: {
    action: 'increase_budget' | 'decrease_budget' | 'review_policy' | 'investigate' | 'no_action';
    suggestedValue?: number;
    urgency: 'immediate' | 'soon' | 'scheduled' | 'optional';
    reason: string;
  };

  // Status
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

/**
 * Drift detection thresholds
 */
export interface DriftThresholds {
  // Budget exhaustion: percentage of periods where budget is depleted
  budgetExhaustionRate: number; // Default: 0.5 (50% of periods)

  // Budget underutilization: percentage of budget typically unused
  budgetUnderutilizationRate: number; // Default: 0.8 (80% unused)

  // Override spike: percentage increase in override rate
  overrideSpikeThreshold: number; // Default: 0.5 (50% increase)

  // Incident spike: percentage increase in incident rate
  incidentSpikeThreshold: number; // Default: 0.25 (25% increase)

  // Cost drift: percentage deviation from expected costs
  costDriftThreshold: number; // Default: 0.3 (30% deviation)

  // Latency degradation: percentage increase in P95 latency
  latencyDegradationThreshold: number; // Default: 0.5 (50% increase)

  // Traffic shift: percentage change in traffic volume
  trafficShiftThreshold: number; // Default: 0.5 (50% change)

  // Accuracy decline: decrease in decision accuracy
  accuracyDeclineThreshold: number; // Default: 0.1 (10% decline)
}

/**
 * Drift analysis result for a feature
 */
export interface FeatureDriftAnalysis {
  feature: GuardedFeature;
  analyzedAt: Date;
  windowHours: number;
  dataPoints: number;

  // Current state
  metrics: {
    budgetUtilization: number; // 0-1
    exhaustionRate: number; // How often budget is depleted
    overrideRate: number;
    incidentRate: number;
    avgCostPerAction: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
  };

  // Baseline comparison (from earlier period)
  baseline?: {
    windowHours: number;
    budgetUtilization: number;
    overrideRate: number;
    incidentRate: number;
    avgCostPerAction: number;
    avgLatencyMs: number;
  };

  // Detected drifts
  drifts: DriftSignal[];

  // Overall health score (0-1, higher is better)
  healthScore: number;
}

/**
 * Drift detection run result
 */
export interface DriftDetectionResult {
  id: string;
  ranAt: Date;
  duration: number;

  featuresAnalyzed: number;
  driftsDetected: number;
  criticalDrifts: number;

  signals: DriftSignal[];
  featureAnalyses: FeatureDriftAnalysis[];

  summary: {
    healthyFeatures: GuardedFeature[];
    driftingFeatures: GuardedFeature[];
    criticalFeatures: GuardedFeature[];
    overallHealthScore: number;
  };
}

/**
 * Drift detector configuration
 */
export interface DriftDetectorConfig {
  enabled: boolean;
  analysisWindowHours: number;
  baselineWindowHours: number;
  minDataPointsForAnalysis: number;
  runIntervalMs: number;
  maxSignalsPerFeature: number;
  thresholds: DriftThresholds;
}

export const DEFAULT_DRIFT_THRESHOLDS: DriftThresholds = {
  budgetExhaustionRate: 0.5,
  budgetUnderutilizationRate: 0.8,
  overrideSpikeThreshold: 0.5,
  incidentSpikeThreshold: 0.25,
  costDriftThreshold: 0.3,
  latencyDegradationThreshold: 0.5,
  trafficShiftThreshold: 0.5,
  accuracyDeclineThreshold: 0.1,
};

export const DEFAULT_DRIFT_DETECTOR_CONFIG: DriftDetectorConfig = {
  enabled: process.env.ENABLE_AUTONOMY_DRIFT_DETECTOR === 'true',
  analysisWindowHours: 24,
  baselineWindowHours: 168, // 1 week
  minDataPointsForAnalysis: 50,
  runIntervalMs: 60 * 60 * 1000, // 1 hour
  maxSignalsPerFeature: 10,
  thresholds: DEFAULT_DRIFT_THRESHOLDS,
};
