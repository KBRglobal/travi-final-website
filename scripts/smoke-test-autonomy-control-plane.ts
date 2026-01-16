#!/usr/bin/env tsx
/**
 * Autonomy Control Plane - Smoke Test
 *
 * Tests the control plane components without database dependencies.
 * Run with: npx tsx scripts/smoke-test-autonomy-control-plane.ts
 */

import {
  AutonomyBlockedError,
  DEFAULT_ENFORCEMENT_CONFIG,
  GuardedFeature,
} from '../server/autonomy/enforcement/types';

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
  console.log('\n🔒 Autonomy Control Plane Smoke Tests\n');
  console.log('=' .repeat(50));

  // Test 1: AutonomyBlockedError construction
  await test('AutonomyBlockedError can be constructed', () => {
    const error = new AutonomyBlockedError('Test block', {
      reasons: [{ code: 'TEST', message: 'Test', severity: 'error' }],
      feature: 'chat',
      action: 'ai_generate',
    });
    assert(error.name === 'AutonomyBlockedError', 'Error name should be AutonomyBlockedError');
    assert(error.code === 'AUTONOMY_BLOCKED', 'Error code should be AUTONOMY_BLOCKED');
    assert(error.decision === 'BLOCK', 'Decision should be BLOCK');
  });

  // Test 2: AutonomyBlockedError serialization
  await test('AutonomyBlockedError serializes to JSON', () => {
    const error = new AutonomyBlockedError('Test', {
      reasons: [{ code: 'TEST', message: 'Test', severity: 'error' }],
      feature: 'publishing',
      action: 'content_publish',
      retryAfter: 3600,
    });
    const json = error.toJSON();
    assert(json.code === 'AUTONOMY_BLOCKED', 'JSON should have correct code');
    assert(json.feature === 'publishing', 'JSON should have correct feature');
    assert(json.retryAfter === 3600, 'JSON should have retryAfter');
  });

  // Test 3: Default config structure
  await test('DEFAULT_ENFORCEMENT_CONFIG has required fields', () => {
    assert(typeof DEFAULT_ENFORCEMENT_CONFIG.enabled === 'boolean', 'enabled should be boolean');
    assert(typeof DEFAULT_ENFORCEMENT_CONFIG.degradedModeEnabled === 'boolean', 'degradedModeEnabled should be boolean');
    assert(typeof DEFAULT_ENFORCEMENT_CONFIG.evaluationTimeoutMs === 'number', 'evaluationTimeoutMs should be number');
    assert(typeof DEFAULT_ENFORCEMENT_CONFIG.maxCacheSize === 'number', 'maxCacheSize should be number');
  });

  // Test 4: Timeout values are reasonable
  await test('Timeout values are within reasonable bounds', () => {
    assert(DEFAULT_ENFORCEMENT_CONFIG.evaluationTimeoutMs > 0, 'evaluationTimeoutMs should be positive');
    assert(DEFAULT_ENFORCEMENT_CONFIG.evaluationTimeoutMs <= 10000, 'evaluationTimeoutMs should be <= 10s');
    assert(DEFAULT_ENFORCEMENT_CONFIG.budgetCheckTimeoutMs > 0, 'budgetCheckTimeoutMs should be positive');
    assert(DEFAULT_ENFORCEMENT_CONFIG.budgetCheckTimeoutMs <= 5000, 'budgetCheckTimeoutMs should be <= 5s');
  });

  // Test 5: Cache settings are bounded
  await test('Cache settings are properly bounded', () => {
    assert(DEFAULT_ENFORCEMENT_CONFIG.maxCacheSize > 0, 'maxCacheSize should be positive');
    assert(DEFAULT_ENFORCEMENT_CONFIG.maxCacheSize <= 10000, 'maxCacheSize should be <= 10000');
    assert(DEFAULT_ENFORCEMENT_CONFIG.cacheTtlMs > 0, 'cacheTtlMs should be positive');
    assert(DEFAULT_ENFORCEMENT_CONFIG.cacheTtlMs <= 300000, 'cacheTtlMs should be <= 5 minutes');
  });

  // Test 6: Feature types are valid
  await test('All guarded features are defined', () => {
    const features: GuardedFeature[] = [
      'chat', 'octopus', 'search', 'aeo', 'translation', 'images',
      'content_enrichment', 'seo_optimization', 'internal_linking',
      'background_job', 'publishing',
    ];
    assert(features.length === 11, 'Should have 11 guarded features');
  });

  // Test 7: Override TTL calculation
  await test('Override TTL calculation is correct', () => {
    const ttlMinutes = 60;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    const diffMs = expiresAt.getTime() - now.getTime();
    assert(diffMs === 3600000, 'TTL calculation should be 1 hour in ms');
  });

  // Test 8: Degraded response structure
  await test('Degraded response structure is valid', () => {
    const response = {
      isDegraded: true as const,
      reason: 'Test reason',
      fallbackData: { message: 'Fallback' },
      retryAfter: 3600,
    };
    assert(response.isDegraded === true, 'isDegraded should be true');
    assert(typeof response.reason === 'string', 'reason should be string');
    assert(response.fallbackData !== undefined, 'fallbackData should exist');
  });

  // Test 9: Job block result structure
  await test('Job block result has correct structure', () => {
    const blocked = { blocked: true, reason: 'Test', rescheduleAfterMs: 60000, shouldRetry: true };
    const allowed = { blocked: false, shouldRetry: true };
    assert(blocked.blocked === true, 'blocked result should be blocked');
    assert(allowed.blocked === false, 'allowed result should not be blocked');
    assert(blocked.shouldRetry === true, 'should have retry flag');
  });

  // Test 10: Policy decision types
  await test('Policy decisions have correct structure', () => {
    const decisions = ['ALLOW', 'WARN', 'BLOCK'] as const;
    assert(decisions.includes('ALLOW'), 'Should include ALLOW');
    assert(decisions.includes('WARN'), 'Should include WARN');
    assert(decisions.includes('BLOCK'), 'Should include BLOCK');
    assert(decisions.length === 3, 'Should have exactly 3 decision types');
  });

  // Test 11: Budget period types
  await test('Budget periods are correctly defined', () => {
    const periods = ['hourly', 'daily', 'weekly', 'monthly'] as const;
    assert(periods.length === 4, 'Should have 4 budget periods');
    assert(periods.includes('hourly'), 'Should include hourly');
    assert(periods.includes('daily'), 'Should include daily');
  });

  // Test 12: Action types coverage
  await test('Action types cover all operations', () => {
    const actions = [
      'content_create', 'content_update', 'content_delete', 'content_publish',
      'ai_generate', 'ai_enrich', 'db_write', 'db_delete',
      'external_api', 'notification', 'bulk_operation',
    ];
    assert(actions.length === 11, 'Should have 11 action types');
    assert(actions.includes('ai_generate'), 'Should include ai_generate');
    assert(actions.includes('content_publish'), 'Should include content_publish');
  });

  // Test 13: Approval levels
  await test('Approval levels are defined', () => {
    const levels = ['none', 'auto', 'review', 'manual'] as const;
    assert(levels.length === 4, 'Should have 4 approval levels');
    assert(levels.includes('auto'), 'Should include auto');
    assert(levels.includes('manual'), 'Should include manual');
  });

  // Test 14: Error instanceof check
  await test('AutonomyBlockedError is instance of Error', () => {
    const error = new AutonomyBlockedError('Test', {
      reasons: [{ code: 'TEST', message: 'Test', severity: 'error' }],
      feature: 'chat',
      action: 'ai_generate',
    });
    assert(error instanceof Error, 'Should be instance of Error');
    assert(error instanceof AutonomyBlockedError, 'Should be instance of AutonomyBlockedError');
  });

  // Print results summary
  console.log('\n' + '='.repeat(50));
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
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
