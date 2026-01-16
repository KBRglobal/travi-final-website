/**
 * Longitudinal Learning System - Type Definitions
 * Answers: "Are we governing ourselves better over time?"
 */

import { GovernanceSignal } from '../metrics/types';

/**
 * Comparison period types
 */
export type ComparisonPeriod = 'week' | 'month' | 'quarter';

/**
 * Learning dimension types
 */
export type LearningDimension =
  | 'governance_quality'  // Overall governance signals
  | 'rule_effectiveness'  // Which rules got better/worse
  | 'team_learning'       // Which teams improved
  | 'automation_health'   // Automation getting better/worse
  | 'risk_patterns';      // Recurring risks

/**
 * Period comparison result
 */
export interface PeriodComparison {
  dimension: LearningDimension;
  currentPeriod: { start: Date; end: Date; label: string };
  previousPeriod: { start: Date; end: Date; label: string };

  // Overall assessment
  verdict: 'safer' | 'same' | 'worse';
  confidence: number;

  // Delta
  delta: {
    value: number;
    percentChange: number;
    isSignificant: boolean;
  };

  // Components
  components: Array<{
    name: string;
    currentValue: number;
    previousValue: number;
    delta: number;
    trend: 'improving' | 'stable' | 'degrading';
    weight: number;
  }>;

  // Reasons (not vibes)
  reasons: string[];
}

/**
 * Rule learning record
 */
export interface RuleLearning {
  ruleId: string;
  ruleName: string;

  // Effectiveness over time
  periods: Array<{
    period: string; // e.g., "2024-W03"
    triggerCount: number;
    acceptedCount: number;
    effectiveCount: number;
    effectivenessRate: number;
  }>;

  // Trend
  trend: 'improving' | 'stable' | 'degrading';
  trendConfidence: number;

  // Recommendation
  recommendation?: 'keep' | 'adjust' | 'disable' | 'review';
  recommendationReason?: string;
}

/**
 * Team learning record
 */
export interface TeamLearning {
  teamId: string;
  teamName: string;

  // Metrics over time
  periods: Array<{
    period: string;
    incidentCount: number;
    overrideCount: number;
    approvalSuccessRate: number;
    riskContribution: number;
    governanceScore: number;
  }>;

  // Trend
  trend: 'improving' | 'stable' | 'degrading';
  learningRate: number; // Positive = learning, negative = regressing

  // Insights
  strengths: string[];
  areasForImprovement: string[];
}

/**
 * Automation health record
 */
export interface AutomationHealth {
  featureId: string;
  featureName: string;

  // Metrics over time
  periods: Array<{
    period: string;
    decisionCount: number;
    accuracyRate: number;
    revertRate: number;
    incidentRate: number;
    humanTrustScore: number;
  }>;

  // Trend
  trend: 'improving' | 'stable' | 'degrading';
  degradationRate: number; // Positive = degrading, negative = improving

  // Assessment
  verdict: 'healthy' | 'concerning' | 'degrading' | 'critical';
  verdictReason: string;
}

/**
 * Recurring risk pattern
 */
export interface RecurringRisk {
  patternId: string;
  description: string;

  // Occurrences
  occurrences: Array<{
    period: string;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    wasMitigated: boolean;
  }>;

  // Pattern analysis
  isRecurring: boolean;
  recurrenceInterval: number; // Average periods between occurrences
  lastOccurred: Date;
  predictedNextOccurrence?: Date;

  // Mitigation effectiveness
  mitigationAttempts: number;
  successfulMitigations: number;
  mitigationEffectiveness: number;
}

/**
 * Governance trend report
 */
export interface GovernanceTrendReport {
  generatedAt: Date;
  period: ComparisonPeriod;

  // Overall verdict
  overallVerdict: 'safer' | 'same' | 'worse';
  overallConfidence: number;
  overallReasons: string[];

  // Per-dimension comparisons
  dimensionComparisons: PeriodComparison[];

  // Specific insights
  ruleLearnings: RuleLearning[];
  teamLearnings: TeamLearning[];
  automationHealth: AutomationHealth[];
  recurringRisks: RecurringRisk[];

  // Key findings
  keyFindings: Array<{
    type: 'positive' | 'negative' | 'neutral';
    finding: string;
    evidence: string;
    actionable: boolean;
    suggestedAction?: string;
  }>;

  // Predictions
  predictions: Array<{
    prediction: string;
    probability: number;
    timeframe: string;
    basis: string;
  }>;
}

/**
 * Learning configuration
 */
export interface LongitudinalLearningConfig {
  enabled: boolean;
  maxPeriodsToTrack: number;
  maxRuleLearnings: number;
  maxTeamLearnings: number;
  significanceThreshold: number; // Minimum change to be "significant"
  computeIntervalMs: number;
}

export const DEFAULT_LEARNING_CONFIG: LongitudinalLearningConfig = {
  enabled: process.env.ENABLE_PLATFORM_SELF_GOVERNANCE === 'true',
  maxPeriodsToTrack: 12, // 12 months or 12 weeks
  maxRuleLearnings: 50,
  maxTeamLearnings: 50,
  significanceThreshold: 0.1, // 10% change
  computeIntervalMs: 24 * 60 * 60 * 1000, // Daily
};
