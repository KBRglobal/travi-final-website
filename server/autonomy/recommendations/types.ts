/**
 * Dynamic Budget Recommender - Types
 * Suggest optimal budgets based on patterns
 */

import { BudgetPeriod } from '../policy/types';
import { GuardedFeature } from '../enforcement/types';

// Traffic patterns
export interface TrafficMetrics {
  feature: GuardedFeature;
  period: BudgetPeriod;
  window: { start: Date; end: Date };

  // Volume metrics
  totalRequests: number;
  peakRequestsPerHour: number;
  avgRequestsPerHour: number;
  requestVariance: number;

  // Cost metrics
  totalAiSpendCents: number;
  avgCostPerRequest: number;
  peakCostPerHour: number;

  // Performance metrics
  avgLatencyMs: number;
  p95LatencyMs: number;
  failureRate: number;

  // Override frequency
  overrideCount: number;
  overrideRate: number;
}

// Time-of-day patterns
export interface TimePattern {
  hour: number;      // 0-23
  dayOfWeek: number; // 0-6
  avgRequests: number;
  avgCost: number;
  blockRate: number;
}

// Budget recommendation
export interface BudgetRecommendation {
  id: string;
  feature: GuardedFeature;
  period: BudgetPeriod;
  createdAt: Date;

  // Current values
  currentBudget: {
    maxActions: number;
    maxAiSpendCents: number;
    maxDbWrites: number;
  };

  // Recommended values
  recommendedBudget: {
    maxActions: number;
    maxAiSpendCents: number;
    maxDbWrites: number;
  };

  // Delta analysis
  delta: {
    actionsChange: number;      // % change
    aiSpendChange: number;      // % change
    dbWritesChange: number;     // % change
  };

  // Confidence and reasoning
  confidence: number;           // 0-1
  reasoning: string[];
  dataPoints: number;

  // Impact prediction
  predictedImpact: {
    blocksChange: number;
    costSavings: number;
    headroomGain: number;
  };
}

// Recommendation batch
export interface RecommendationBatch {
  generatedAt: Date;
  validUntil: Date;
  recommendations: BudgetRecommendation[];
  summary: {
    totalRecommendations: number;
    highConfidenceCount: number;
    estimatedSavings: number;
    estimatedHeadroomGain: number;
  };
}

// Configuration
export interface RecommenderConfig {
  enabled: boolean;
  minDataPoints: number;
  confidenceThreshold: number;
  maxRecommendationsPerRun: number;
  headroomTarget: number;        // Target % headroom (e.g., 0.2 = 20%)
  safetyMargin: number;          // Extra margin to prevent exhaustion
  lookbackHours: number;         // Hours of data to analyze
  refreshIntervalMs: number;
}

export const DEFAULT_RECOMMENDER_CONFIG: RecommenderConfig = {
  enabled: process.env.ENABLE_AUTONOMY_RECOMMENDER === 'true',
  minDataPoints: 100,
  confidenceThreshold: 0.7,
  maxRecommendationsPerRun: 20,
  headroomTarget: 0.2,
  safetyMargin: 0.1,
  lookbackHours: 168, // 1 week
  refreshIntervalMs: 60 * 60 * 1000, // 1 hour
};
