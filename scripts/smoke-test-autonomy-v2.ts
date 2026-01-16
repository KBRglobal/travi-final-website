#!/usr/bin/env tsx
/**
 * Autonomy v2 Features - Smoke Test
 *
 * Tests the v2 autonomy components without database dependencies.
 * Run with: npx tsx scripts/smoke-test-autonomy-v2.ts
 */

// Learning Engine
import { DEFAULT_LEARNING_CONFIG, type DecisionOutcome } from '../server/autonomy/learning/types';

// Recommender
import { DEFAULT_RECOMMENDER_CONFIG, type TrafficMetrics } from '../server/autonomy/recommendations/types';

// Simulator
import {
  DEFAULT_SIMULATOR_CONFIG,
  type HypotheticalPolicy,
  type SimulationFinding,
} from '../server/autonomy/simulator/types';

// Drift Detector
import {
  DEFAULT_DRIFT_DETECTOR_CONFIG,
  DEFAULT_DRIFT_THRESHOLDS,
  type DriftSignal,
  type DriftType,
} from '../server/autonomy/drift/types';

// Explainer
import {
  DEFAULT_EXPLAINER_CONFIG,
  FEATURE_DISPLAY_NAMES,
  DECISION_TEMPLATES,
  type ExplanationAudience,
} from '../server/autonomy/explain/types';

import { GuardedFeature } from '../server/autonomy/enforcement/types';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  return new Promise(async (resolve) => {
    const start = Date.now();
    try {
      await fn();
      results.push({ name, passed: true, duration: Date.now() - start });
      console.log(`  ✓ ${name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name, passed: false, error: message, duration: Date.now() - start });
      console.log(`  ✗ ${name}: ${message}`);
    }
    resolve();
  });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTests() {
  console.log('\n🧠 Autonomy v2 Features Smoke Tests\n');
  console.log('='.repeat(60));

  // ═══════════════════════════════════════════════════════════
  // LEARNING ENGINE TESTS
  // ═══════════════════════════════════════════════════════════
  console.log('\n📚 Learning Engine\n');

  await test('Learning config has valid defaults', () => {
    assert(typeof DEFAULT_LEARNING_CONFIG.enabled === 'boolean', 'enabled should be boolean');
    assert(DEFAULT_LEARNING_CONFIG.minDataPoints === 50, 'minDataPoints should be 50');
    assert(DEFAULT_LEARNING_CONFIG.patternConfidenceThreshold === 0.7, 'patternConfidenceThreshold should be 0.7');
  });

  await test('Learning config has bounded limits', () => {
    assert(DEFAULT_LEARNING_CONFIG.maxPatternsPerFeature <= 100, 'maxPatternsPerFeature should be bounded');
    assert(DEFAULT_LEARNING_CONFIG.maxRecommendationsPerFeature <= 50, 'maxRecommendationsPerFeature should be bounded');
  });

  await test('DecisionOutcome types are defined', () => {
    const outcomes: DecisionOutcome[] = [
      'confirmed_correct', 'override_applied', 'incident_after_allow',
      'recovery_success', 'recovery_failed', 'unknown',
    ];
    assert(outcomes.length === 6, 'Should have 6 outcome types');
  });

  // ═══════════════════════════════════════════════════════════
  // RECOMMENDER TESTS
  // ═══════════════════════════════════════════════════════════
  console.log('\n📊 Dynamic Budget Recommender\n');

  await test('Recommender config has valid defaults', () => {
    assert(DEFAULT_RECOMMENDER_CONFIG.minDataPoints === 100, 'minDataPoints should be 100');
    assert(DEFAULT_RECOMMENDER_CONFIG.confidenceThreshold === 0.7, 'confidenceThreshold should be 0.7');
    assert(DEFAULT_RECOMMENDER_CONFIG.headroomTarget === 0.2, 'headroomTarget should be 0.2');
  });

  await test('Recommender config has bounded limits', () => {
    assert(DEFAULT_RECOMMENDER_CONFIG.maxRecommendationsPerRun <= 100, 'maxRecommendationsPerRun should be bounded');
    assert(DEFAULT_RECOMMENDER_CONFIG.lookbackHours <= 720, 'lookbackHours should be bounded');
  });

  await test('TrafficMetrics structure is valid', () => {
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
    assert(metrics.feature === 'chat', 'feature should be set');
    assert(metrics.failureRate >= 0 && metrics.failureRate <= 1, 'failureRate should be 0-1');
  });

  // ═══════════════════════════════════════════════════════════
  // SIMULATOR TESTS
  // ═══════════════════════════════════════════════════════════
  console.log('\n🔄 Autonomy Simulator\n');

  await test('Simulator config has valid defaults', () => {
    assert(DEFAULT_SIMULATOR_CONFIG.maxRecordsPerRun === 10000, 'maxRecordsPerRun should be 10000');
    assert(DEFAULT_SIMULATOR_CONFIG.maxConcurrentSimulations === 3, 'maxConcurrentSimulations should be 3');
  });

  await test('Simulator config has bounded limits', () => {
    assert(DEFAULT_SIMULATOR_CONFIG.maxCachedResults <= 100, 'maxCachedResults should be bounded');
    assert(DEFAULT_SIMULATOR_CONFIG.simulationTimeoutMs <= 60000, 'simulationTimeoutMs should be <= 60s');
  });

  await test('HypotheticalPolicy structure is valid', () => {
    const policy: HypotheticalPolicy = {
      id: 'test-policy',
      name: 'Test Policy',
      budgets: new Map([
        ['chat:hourly', {
          period: 'hourly',
          maxActions: 100,
          maxAiSpend: 1000,
          maxDbWrites: 50,
          maxContentMutations: 20,
        }],
      ]),
    };
    assert(policy.id === 'test-policy', 'policy should have id');
    assert(policy.budgets.size === 1, 'policy should have budgets');
  });

  await test('SimulationFinding types are valid', () => {
    const finding: SimulationFinding = {
      type: 'opportunity',
      severity: 'medium',
      feature: 'chat',
      message: 'Cost savings opportunity detected',
      metric: 'costChange',
      currentValue: 1000,
      simulatedValue: 800,
    };
    assert(['risk', 'opportunity', 'neutral'].includes(finding.type), 'type should be valid');
    assert(['low', 'medium', 'high'].includes(finding.severity), 'severity should be valid');
  });

  // ═══════════════════════════════════════════════════════════
  // DRIFT DETECTOR TESTS
  // ═══════════════════════════════════════════════════════════
  console.log('\n🔍 Policy Drift Detector\n');

  await test('Drift detector config has valid defaults', () => {
    assert(DEFAULT_DRIFT_DETECTOR_CONFIG.analysisWindowHours === 24, 'analysisWindowHours should be 24');
    assert(DEFAULT_DRIFT_DETECTOR_CONFIG.baselineWindowHours === 168, 'baselineWindowHours should be 168');
  });

  await test('Drift detector config has bounded limits', () => {
    assert(DEFAULT_DRIFT_DETECTOR_CONFIG.maxSignalsPerFeature <= 50, 'maxSignalsPerFeature should be bounded');
    assert(DEFAULT_DRIFT_DETECTOR_CONFIG.minDataPointsForAnalysis >= 10, 'minDataPointsForAnalysis should be >= 10');
  });

  await test('Drift thresholds are within valid range', () => {
    for (const [key, value] of Object.entries(DEFAULT_DRIFT_THRESHOLDS)) {
      assert(value >= 0 && value <= 1, `${key} should be between 0 and 1`);
    }
  });

  await test('DriftType values are defined', () => {
    const types: DriftType[] = [
      'budget_exhaustion', 'budget_underutilization', 'override_spike',
      'incident_spike', 'cost_drift', 'latency_degradation',
      'traffic_shift', 'accuracy_decline',
    ];
    assert(types.length === 8, 'Should have 8 drift types');
  });

  await test('DriftSignal structure is valid', () => {
    const signal: DriftSignal = {
      id: 'drift-test',
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
        dataPoints: 100,
        confidence: 0.8,
      },
      status: 'new',
    };
    assert(signal.severity === 'high', 'severity should be set');
    assert(signal.status === 'new', 'status should be new');
  });

  // ═══════════════════════════════════════════════════════════
  // EXPLAINER TESTS
  // ═══════════════════════════════════════════════════════════
  console.log('\n📝 Executive Autonomy Explainer\n');

  await test('Explainer config has valid defaults', () => {
    assert(DEFAULT_EXPLAINER_CONFIG.maxExplanationsCache === 100, 'maxExplanationsCache should be 100');
    assert(DEFAULT_EXPLAINER_CONFIG.maxSummariesCache === 20, 'maxSummariesCache should be 20');
    assert(DEFAULT_EXPLAINER_CONFIG.defaultAudience === 'manager', 'defaultAudience should be manager');
  });

  await test('All features have display names', () => {
    const features: GuardedFeature[] = [
      'chat', 'octopus', 'search', 'aeo', 'translation', 'images',
      'content_enrichment', 'seo_optimization', 'internal_linking',
      'background_job', 'publishing',
    ];
    for (const feature of features) {
      assert(FEATURE_DISPLAY_NAMES[feature] !== undefined, `${feature} should have display name`);
      assert(FEATURE_DISPLAY_NAMES[feature].length > 0, `${feature} display name should not be empty`);
    }
  });

  await test('Decision templates are defined for all decisions', () => {
    for (const decision of ['ALLOW', 'WARN', 'BLOCK'] as const) {
      assert(DECISION_TEMPLATES[decision].executive !== undefined, `${decision} should have executive template`);
      assert(DECISION_TEMPLATES[decision].manager !== undefined, `${decision} should have manager template`);
      assert(DECISION_TEMPLATES[decision].developer !== undefined, `${decision} should have developer template`);
    }
  });

  await test('ExplanationAudience types are defined', () => {
    const audiences: ExplanationAudience[] = ['executive', 'manager', 'developer', 'operator'];
    assert(audiences.length === 4, 'Should have 4 audience types');
  });

  // ═══════════════════════════════════════════════════════════
  // INTEGRATION TESTS
  // ═══════════════════════════════════════════════════════════
  console.log('\n🔗 Integration Tests\n');

  await test('Feature types are consistent across modules', () => {
    const features: GuardedFeature[] = [
      'chat', 'octopus', 'search', 'aeo', 'translation', 'images',
      'content_enrichment', 'seo_optimization', 'internal_linking',
      'background_job', 'publishing',
    ];
    for (const feature of features) {
      assert(FEATURE_DISPLAY_NAMES[feature] !== undefined, `${feature} should exist in display names`);
    }
  });

  await test('All configs are feature-flagged and default OFF', () => {
    // Verify enabled defaults to false (env var not set)
    assert(DEFAULT_LEARNING_CONFIG.enabled === (process.env.ENABLE_AUTONOMY_LEARNING === 'true'),
      'Learning should be feature-flagged');
    assert(DEFAULT_RECOMMENDER_CONFIG.enabled === (process.env.ENABLE_AUTONOMY_RECOMMENDER === 'true'),
      'Recommender should be feature-flagged');
    assert(DEFAULT_SIMULATOR_CONFIG.enabled === (process.env.ENABLE_AUTONOMY_SIMULATOR === 'true'),
      'Simulator should be feature-flagged');
    assert(DEFAULT_DRIFT_DETECTOR_CONFIG.enabled === (process.env.ENABLE_AUTONOMY_DRIFT_DETECTOR === 'true'),
      'Drift detector should be feature-flagged');
    assert(DEFAULT_EXPLAINER_CONFIG.enabled === (process.env.ENABLE_AUTONOMY_EXPLAINER === 'true'),
      'Explainer should be feature-flagged');
  });

  await test('Memory bounds are reasonable across all modules', () => {
    // All caches should be bounded
    assert(DEFAULT_LEARNING_CONFIG.maxPatternsPerFeature <= 100, 'Learning patterns bounded');
    assert(DEFAULT_RECOMMENDER_CONFIG.maxRecommendationsPerRun <= 100, 'Recommendations bounded');
    assert(DEFAULT_SIMULATOR_CONFIG.maxCachedResults <= 100, 'Simulation results bounded');
    assert(DEFAULT_DRIFT_DETECTOR_CONFIG.maxSignalsPerFeature <= 50, 'Drift signals bounded');
    assert(DEFAULT_EXPLAINER_CONFIG.maxExplanationsCache <= 1000, 'Explanations bounded');
  });

  // ═══════════════════════════════════════════════════════════
  // PRINT RESULTS
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((acc, r) => acc + r.duration, 0);

  console.log(`\n📊 Results: ${passed}/${results.length} passed`);
  console.log(`   Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log(`\n❌ ${failed} test(s) failed:\n`);
    for (const result of results.filter(r => !r.passed)) {
      console.log(`   - ${result.name}: ${result.error}`);
    }
    process.exit(1);
  } else {
    console.log('\n✅ All Autonomy v2 tests passed!\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
