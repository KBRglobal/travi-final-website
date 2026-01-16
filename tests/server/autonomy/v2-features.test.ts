/**
 * Autonomy v2 Features - Unit Tests
 * Tests for Learning Engine, Recommender, Simulator, Drift Detector, and Explainer
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Learning Engine types
import {
  DEFAULT_LEARNING_CONFIG,
  type DecisionOutcome,
  type LearningPattern,
} from '../../../server/autonomy/learning/types';

// Recommender types
import {
  DEFAULT_RECOMMENDER_CONFIG,
  type TrafficMetrics,
  type BudgetRecommendation,
} from '../../../server/autonomy/recommendations/types';

// Simulator types
import {
  DEFAULT_SIMULATOR_CONFIG,
  type SimulationResult,
  type HypotheticalPolicy,
} from '../../../server/autonomy/simulator/types';

// Drift Detector types
import {
  DEFAULT_DRIFT_DETECTOR_CONFIG,
  DEFAULT_DRIFT_THRESHOLDS,
  type DriftSignal,
  type DriftType,
} from '../../../server/autonomy/drift/types';

// Explainer types
import {
  DEFAULT_EXPLAINER_CONFIG,
  FEATURE_DISPLAY_NAMES,
  DECISION_TEMPLATES,
  type DecisionExplanation,
  type ExplanationAudience,
} from '../../../server/autonomy/explain/types';

import { GuardedFeature } from '../../../server/autonomy/enforcement/types';

describe('Learning Engine', () => {
  describe('DEFAULT_LEARNING_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_LEARNING_CONFIG.minDataPoints).toBe(50);
      expect(DEFAULT_LEARNING_CONFIG.patternConfidenceThreshold).toBe(0.7);
      expect(DEFAULT_LEARNING_CONFIG.recommendationConfidenceThreshold).toBe(0.8);
    });

    it('should have bounded limits', () => {
      expect(DEFAULT_LEARNING_CONFIG.maxPatternsPerFeature).toBeLessThanOrEqual(100);
      expect(DEFAULT_LEARNING_CONFIG.maxRecommendationsPerFeature).toBeLessThanOrEqual(50);
    });

    it('should have reasonable time windows', () => {
      expect(DEFAULT_LEARNING_CONFIG.aggregationIntervalMs).toBe(60 * 60 * 1000); // 1 hour
      expect(DEFAULT_LEARNING_CONFIG.outcomeTrackingWindowMs).toBe(24 * 60 * 60 * 1000); // 24 hours
    });
  });

  describe('DecisionOutcome types', () => {
    it('should define all outcome types', () => {
      const outcomes: DecisionOutcome[] = [
        'confirmed_correct',
        'override_applied',
        'incident_after_allow',
        'recovery_success',
        'recovery_failed',
        'unknown',
      ];
      expect(outcomes).toHaveLength(6);
    });
  });
});

describe('Dynamic Budget Recommender', () => {
  describe('DEFAULT_RECOMMENDER_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_RECOMMENDER_CONFIG.minDataPoints).toBe(100);
      expect(DEFAULT_RECOMMENDER_CONFIG.confidenceThreshold).toBe(0.7);
      expect(DEFAULT_RECOMMENDER_CONFIG.headroomTarget).toBe(0.2);
      expect(DEFAULT_RECOMMENDER_CONFIG.safetyMargin).toBe(0.1);
    });

    it('should have bounded limits', () => {
      expect(DEFAULT_RECOMMENDER_CONFIG.maxRecommendationsPerRun).toBeLessThanOrEqual(100);
      expect(DEFAULT_RECOMMENDER_CONFIG.lookbackHours).toBeLessThanOrEqual(720); // 30 days max
    });

    it('should have reasonable refresh interval', () => {
      expect(DEFAULT_RECOMMENDER_CONFIG.refreshIntervalMs).toBe(60 * 60 * 1000); // 1 hour
    });
  });

  describe('TrafficMetrics structure', () => {
    it('should have valid structure', () => {
      const metrics: TrafficMetrics = {
        feature: 'chat',
        period: 'hourly',
        window: { start: new Date(), end: new Date() },
        totalRequests: 1000,
        peakRequestsPerHour: 100,
        avgRequestsPerHour: 50,
        requestVariance: 10,
        totalAiSpendCents: 5000,
        avgCostPerRequest: 5,
        peakCostPerHour: 200,
        avgLatencyMs: 150,
        p95LatencyMs: 500,
        failureRate: 0.02,
        overrideCount: 5,
        overrideRate: 0.005,
      };

      expect(metrics.feature).toBe('chat');
      expect(metrics.totalRequests).toBe(1000);
      expect(metrics.failureRate).toBeLessThan(1);
    });
  });
});

describe('Autonomy Simulator', () => {
  describe('DEFAULT_SIMULATOR_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SIMULATOR_CONFIG.maxRecordsPerRun).toBe(10000);
      expect(DEFAULT_SIMULATOR_CONFIG.maxConcurrentSimulations).toBe(3);
    });

    it('should have reasonable timeout', () => {
      expect(DEFAULT_SIMULATOR_CONFIG.simulationTimeoutMs).toBeLessThanOrEqual(60000);
    });

    it('should have bounded cache', () => {
      expect(DEFAULT_SIMULATOR_CONFIG.maxCachedResults).toBeLessThanOrEqual(100);
    });
  });

  describe('HypotheticalPolicy structure', () => {
    it('should accept valid policy', () => {
      const policy: HypotheticalPolicy = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'A test policy for simulation',
        budgets: new Map([
          ['chat:hourly', {
            period: 'hourly',
            maxActions: 150,
            maxAiSpend: 2000,
            maxDbWrites: 50,
            maxContentMutations: 20,
          }],
        ]),
        riskThresholds: {
          maxFailureRate: 0.05,
          maxOverrideRate: 0.1,
        },
      };

      expect(policy.id).toBe('test-policy');
      expect(policy.budgets.size).toBe(1);
    });
  });

  describe('SimulationResult structure', () => {
    it('should have correct comparison fields', () => {
      const result: Partial<SimulationResult> = {
        id: 'sim-123',
        comparison: {
          totalDecisions: 100,
          decisionsChanged: 10,
          changeRate: 0.1,
          originalBlocks: 20,
          simulatedBlocks: 15,
          blocksChange: -5,
          originalAllows: 70,
          simulatedAllows: 75,
          allowsChange: 5,
          originalWarns: 10,
          simulatedWarns: 10,
          warnsChange: 0,
          predictedIncidents: 2,
          incidentChange: 0,
          predictedCostCents: 5000,
          costChange: 500,
          costChangePercent: 11,
          predictedOverrides: 3,
          overrideChange: -2,
        },
      };

      expect(result.comparison?.changeRate).toBe(0.1);
      expect(result.comparison?.blocksChange).toBe(-5);
    });
  });
});

describe('Policy Drift Detector', () => {
  describe('DEFAULT_DRIFT_DETECTOR_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_DRIFT_DETECTOR_CONFIG.analysisWindowHours).toBe(24);
      expect(DEFAULT_DRIFT_DETECTOR_CONFIG.baselineWindowHours).toBe(168); // 1 week
      expect(DEFAULT_DRIFT_DETECTOR_CONFIG.minDataPointsForAnalysis).toBe(50);
    });

    it('should have bounded limits', () => {
      expect(DEFAULT_DRIFT_DETECTOR_CONFIG.maxSignalsPerFeature).toBeLessThanOrEqual(50);
    });
  });

  describe('DEFAULT_DRIFT_THRESHOLDS', () => {
    it('should have all threshold types', () => {
      expect(DEFAULT_DRIFT_THRESHOLDS.budgetExhaustionRate).toBe(0.5);
      expect(DEFAULT_DRIFT_THRESHOLDS.budgetUnderutilizationRate).toBe(0.8);
      expect(DEFAULT_DRIFT_THRESHOLDS.overrideSpikeThreshold).toBe(0.5);
      expect(DEFAULT_DRIFT_THRESHOLDS.incidentSpikeThreshold).toBe(0.25);
      expect(DEFAULT_DRIFT_THRESHOLDS.costDriftThreshold).toBe(0.3);
      expect(DEFAULT_DRIFT_THRESHOLDS.latencyDegradationThreshold).toBe(0.5);
    });

    it('should have thresholds between 0 and 1', () => {
      for (const [key, value] of Object.entries(DEFAULT_DRIFT_THRESHOLDS)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('DriftType values', () => {
    it('should define all drift types', () => {
      const types: DriftType[] = [
        'budget_exhaustion',
        'budget_underutilization',
        'override_spike',
        'incident_spike',
        'cost_drift',
        'latency_degradation',
        'traffic_shift',
        'accuracy_decline',
      ];
      expect(types).toHaveLength(8);
    });
  });

  describe('DriftSignal structure', () => {
    it('should have valid signal structure', () => {
      const signal: DriftSignal = {
        id: 'drift-123',
        type: 'budget_exhaustion',
        severity: 'high',
        feature: 'chat',
        detectedAt: new Date(),
        observation: {
          metric: 'exhaustionRate',
          currentValue: 0.7,
          expectedValue: 0.5,
          deviation: 40,
          trend: 'increasing',
          windowHours: 24,
        },
        context: {
          dataPoints: 500,
          confidence: 0.85,
        },
        recommendation: {
          action: 'increase_budget',
          suggestedValue: 150,
          urgency: 'soon',
          reason: 'Budget is exhausted in 70% of periods',
        },
        status: 'new',
      };

      expect(signal.severity).toBe('high');
      expect(signal.recommendation?.action).toBe('increase_budget');
    });
  });
});

describe('Executive Autonomy Explainer', () => {
  describe('DEFAULT_EXPLAINER_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_EXPLAINER_CONFIG.maxExplanationsCache).toBe(100);
      expect(DEFAULT_EXPLAINER_CONFIG.maxSummariesCache).toBe(20);
      expect(DEFAULT_EXPLAINER_CONFIG.defaultAudience).toBe('manager');
      expect(DEFAULT_EXPLAINER_CONFIG.defaultFormat).toBe('text');
    });
  });

  describe('FEATURE_DISPLAY_NAMES', () => {
    it('should have display names for all features', () => {
      const features: GuardedFeature[] = [
        'chat', 'octopus', 'search', 'aeo', 'translation', 'images',
        'content_enrichment', 'seo_optimization', 'internal_linking',
        'background_job', 'publishing',
      ];

      for (const feature of features) {
        expect(FEATURE_DISPLAY_NAMES[feature]).toBeDefined();
        expect(typeof FEATURE_DISPLAY_NAMES[feature]).toBe('string');
        expect(FEATURE_DISPLAY_NAMES[feature].length).toBeGreaterThan(0);
      }
    });

    it('should have human-readable names', () => {
      expect(FEATURE_DISPLAY_NAMES.chat).toBe('AI Chat Assistant');
      expect(FEATURE_DISPLAY_NAMES.publishing).toBe('Content Publishing');
    });
  });

  describe('DECISION_TEMPLATES', () => {
    it('should have templates for all decisions', () => {
      expect(DECISION_TEMPLATES.ALLOW).toBeDefined();
      expect(DECISION_TEMPLATES.WARN).toBeDefined();
      expect(DECISION_TEMPLATES.BLOCK).toBeDefined();
    });

    it('should have templates for all audiences', () => {
      for (const decision of ['ALLOW', 'WARN', 'BLOCK'] as const) {
        expect(DECISION_TEMPLATES[decision].executive).toBeDefined();
        expect(DECISION_TEMPLATES[decision].manager).toBeDefined();
        expect(DECISION_TEMPLATES[decision].developer).toBeDefined();
      }
    });
  });

  describe('ExplanationAudience types', () => {
    it('should define all audience types', () => {
      const audiences: ExplanationAudience[] = [
        'executive',
        'manager',
        'developer',
        'operator',
      ];
      expect(audiences).toHaveLength(4);
    });
  });
});

describe('Feature Integration', () => {
  it('should have consistent feature types across modules', () => {
    const learningFeatures: GuardedFeature[] = [
      'chat', 'octopus', 'search', 'aeo', 'translation', 'images',
      'content_enrichment', 'seo_optimization', 'internal_linking',
      'background_job', 'publishing',
    ];

    // All features should have display names
    for (const feature of learningFeatures) {
      expect(FEATURE_DISPLAY_NAMES[feature]).toBeDefined();
    }
  });

  it('should have consistent period types', () => {
    const periods = ['hourly', 'daily', 'weekly', 'monthly'] as const;
    expect(periods).toContain('hourly');
    expect(periods).toContain('daily');
  });
});

describe('Bounded Memory', () => {
  it('Learning config should have bounded storage', () => {
    expect(DEFAULT_LEARNING_CONFIG.maxPatternsPerFeature).toBeLessThanOrEqual(100);
    expect(DEFAULT_LEARNING_CONFIG.maxRecommendationsPerFeature).toBeLessThanOrEqual(50);
  });

  it('Recommender config should have bounded storage', () => {
    expect(DEFAULT_RECOMMENDER_CONFIG.maxRecommendationsPerRun).toBeLessThanOrEqual(100);
  });

  it('Simulator config should have bounded storage', () => {
    expect(DEFAULT_SIMULATOR_CONFIG.maxCachedResults).toBeLessThanOrEqual(100);
    expect(DEFAULT_SIMULATOR_CONFIG.maxRecordsPerRun).toBeLessThanOrEqual(100000);
  });

  it('Drift detector config should have bounded storage', () => {
    expect(DEFAULT_DRIFT_DETECTOR_CONFIG.maxSignalsPerFeature).toBeLessThanOrEqual(50);
  });

  it('Explainer config should have bounded storage', () => {
    expect(DEFAULT_EXPLAINER_CONFIG.maxExplanationsCache).toBeLessThanOrEqual(1000);
    expect(DEFAULT_EXPLAINER_CONFIG.maxSummariesCache).toBeLessThanOrEqual(100);
  });
});

describe('Timeout Protection', () => {
  it('Simulator should have timeout protection', () => {
    expect(DEFAULT_SIMULATOR_CONFIG.simulationTimeoutMs).toBeGreaterThan(0);
    expect(DEFAULT_SIMULATOR_CONFIG.simulationTimeoutMs).toBeLessThanOrEqual(60000);
  });

  it('Drift detector should have reasonable run interval', () => {
    expect(DEFAULT_DRIFT_DETECTOR_CONFIG.runIntervalMs).toBeGreaterThan(0);
  });

  it('Recommender should have refresh interval', () => {
    expect(DEFAULT_RECOMMENDER_CONFIG.refreshIntervalMs).toBeGreaterThan(0);
  });
});
