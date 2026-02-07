/**
 * Autonomy Learning Engine - Types
 * Learn from past decisions and track outcomes
 */

import { PolicyDecision } from "../policy/types";

import { GuardedFeature } from "../enforcement/types";

// Outcome tracking
export type DecisionOutcome =
  | "confirmed_correct" // Decision was appropriate
  | "override_applied" // Block was manually overridden
  | "incident_after_allow" // Allowed but caused incident
  | "recovery_success" // Degraded mode recovered
  | "recovery_failed" // Degraded mode failed
  | "unknown"; // No outcome data

export interface OutcomeRecord {
  decisionId: string;
  decision: PolicyDecision;
  outcome: DecisionOutcome;
  feature: GuardedFeature;
  targetKey: string;
  decisionAt: Date;
  outcomeAt: Date;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}

// Learning metrics
export interface LearningMetrics {
  period: { start: Date; end: Date };
  totalDecisions: number;

  // Accuracy metrics
  truePositives: number; // Correctly blocked
  trueNegatives: number; // Correctly allowed
  falsePositives: number; // Blocked but overridden (over-blocking)
  falseNegatives: number; // Allowed but caused incident

  // Rates
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;

  // Patterns
  overBlockingRate: number;
  incidentRate: number;
  overrideRate: number;
  degradedRecoveryRate: number;
}

// Feature-level learning
export interface FeatureLearning {
  feature: GuardedFeature;
  metrics: LearningMetrics;
  patterns: LearningPattern[];
  recommendations: LearningRecommendation[];
}

// Detected patterns
export interface LearningPattern {
  id: string;
  type: PatternType;
  description: string;
  confidence: number; // 0-1
  significance: number; // 0-1
  firstDetected: Date;
  lastSeen: Date;
  occurrences: number;
  evidence: PatternEvidence[];
}

export type PatternType =
  | "time_cluster" // Blocks cluster at certain times
  | "entity_cluster" // Same entity repeatedly blocked
  | "budget_exhaustion" // Budget runs out predictably
  | "override_pattern" // Same rule overridden frequently
  | "degraded_frequency" // Too many degraded responses
  | "cost_spike" // Unusual cost patterns
  | "success_streak" // Long period without issues
  | "failure_cascade"; // Failures trigger more failures

export interface PatternEvidence {
  timestamp: Date;
  dataPoint: string;
  value: number;
}

// Recommendations
export interface LearningRecommendation {
  id: string;
  type: RecommendationType;
  priority: "low" | "medium" | "high" | "critical";
  confidence: number;
  description: string;
  rationale: string;
  suggestedChange: SuggestedChange;
  estimatedImpact: ImpactEstimate;
  createdAt: Date;
  expiresAt: Date;
  status: "pending" | "applied" | "rejected" | "expired";
}

export type RecommendationType =
  | "loosen_budget"
  | "tighten_budget"
  | "shorten_window"
  | "extend_window"
  | "widen_scope"
  | "narrow_scope"
  | "add_exception"
  | "remove_exception"
  | "change_approval_level";

export interface SuggestedChange {
  targetPolicy?: string;
  targetFeature?: GuardedFeature;
  field: string;
  currentValue: unknown;
  suggestedValue: unknown;
  delta?: number;
}

export interface ImpactEstimate {
  blocksChange: number; // % change in blocks
  incidentsChange: number; // % change in incidents
  costChange: number; // % change in AI spend
  overridesChange: number; // % change in overrides
  confidence: number;
}

// Aggregation windows
export interface AggregationWindow {
  start: Date;
  end: Date;
  granularity: "hour" | "day" | "week";
}

// Configuration
export interface LearningConfig {
  enabled: boolean;
  aggregationIntervalMs: number;
  minDataPoints: number;
  patternConfidenceThreshold: number;
  recommendationConfidenceThreshold: number;
  maxPatternsPerFeature: number;
  maxRecommendationsPerFeature: number;
  outcomeTrackingWindowMs: number;
}

export const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  enabled: process.env.ENABLE_AUTONOMY_LEARNING === "true",
  aggregationIntervalMs: 60 * 60 * 1000, // 1 hour
  minDataPoints: 50,
  patternConfidenceThreshold: 0.7,
  recommendationConfidenceThreshold: 0.8,
  maxPatternsPerFeature: 20,
  maxRecommendationsPerFeature: 10,
  outcomeTrackingWindowMs: 24 * 60 * 60 * 1000, // 24 hours
};
