#!/usr/bin/env npx tsx
/**
 * Growth OS Smoke Test Script
 *
 * Validates that all subsystems can be imported and basic functionality works.
 * Run with: npx tsx scripts/smoke-growth-os.ts
 *
 * Exit codes:
 * 0 - All tests passed
 * 1 - Tests failed
 */

// Set feature flags for testing
process.env.ENABLE_GROWTH_OS = 'true';
process.env.ENABLE_GROWTH_OS_SIGNALS = 'true';
process.env.ENABLE_GROWTH_OS_PRIORITIZATION = 'true';
process.env.ENABLE_GROWTH_OS_ACTIONS = 'true';
process.env.ENABLE_GROWTH_OS_SAFETY = 'true';
process.env.ENABLE_GROWTH_OS_API = 'true';
process.env.GROWTH_OS_AUTONOMY_LEVEL = 'manual';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];
const startTime = Date.now();

function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  return new Promise(async (resolve) => {
    const testStart = Date.now();
    try {
      await fn();
      results.push({
        name,
        passed: true,
        duration: Date.now() - testStart,
      });
      console.log(`  ✓ ${name} (${Date.now() - testStart}ms)`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      results.push({
        name,
        passed: false,
        error: errMsg,
        duration: Date.now() - testStart,
      });
      console.log(`  ✗ ${name}`);
      console.log(`    Error: ${errMsg}`);
    }
    resolve();
  });
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runSmokeTests(): Promise<void> {
  console.log('\n🔥 Growth OS Smoke Tests\n');
  console.log('='.repeat(50));

  // Test 1: Configuration
  console.log('\n📋 Configuration');
  await test('Import config module', async () => {
    const config = await import('../server/growth-os/config');
    assert(typeof config.isGrowthOSEnabled === 'function', 'isGrowthOSEnabled should be a function');
    assert(typeof config.getGrowthOSConfig === 'function', 'getGrowthOSConfig should be a function');
  });

  await test('Feature flags work', async () => {
    const { isGrowthOSEnabled, isSignalsEnabled, getGrowthOSConfig } = await import('../server/growth-os/config');
    assert(isGrowthOSEnabled() === true, 'Growth OS should be enabled');
    assert(isSignalsEnabled() === true, 'Signals should be enabled');
    const config = getGrowthOSConfig();
    assert(typeof config.maxSignalsPerCategory === 'number', 'Config should have maxSignalsPerCategory');
  });

  // Test 2: Signals Subsystem
  console.log('\n📡 Signals Subsystem');
  await test('Import signals module', async () => {
    const signals = await import('../server/growth-os/signals');
    assert(typeof signals.signalRegistry === 'object', 'signalRegistry should exist');
    assert(typeof signals.normalizeSignal === 'function', 'normalizeSignal should be a function');
  });

  await test('Create and normalize signal', async () => {
    const { normalizeSignal, createTrafficSignal } = await import('../server/growth-os/signals');

    const signal = createTrafficSignal('spike', 'Traffic Spike Detected', {
      severity: 80,
      impact: 75,
      entityId: 'content-123',
    });

    assert(signal.id.length > 0, 'Signal should have ID');
    assert(signal.source === 'traffic_intelligence', 'Source should be traffic_intelligence');
    assert(signal.severity === 80, 'Severity should be 80');
    assert(signal.freshness === 100, 'Fresh signal should have 100% freshness');
  });

  await test('Signal registry operations', async () => {
    const { signalRegistry, createContentHealthSignal } = await import('../server/growth-os/signals');

    signalRegistry.clear();

    const signal = createContentHealthSignal('stale_content', 'Content needs update', 'content-456');
    signalRegistry.addSignal(signal);

    const retrieved = signalRegistry.getSignal(signal.id);
    assert(retrieved !== undefined, 'Should retrieve signal');
    assert(retrieved?.id === signal.id, 'Retrieved signal should match');

    const stats = signalRegistry.getStats();
    assert(stats.totalSignals >= 1, 'Should have at least 1 signal');
  });

  await test('Signal decay calculation', async () => {
    const { calculateFreshness, getFreshnessTier } = await import('../server/growth-os/signals');

    const freshness = calculateFreshness(new Date(), 24);
    assert(freshness === 100, 'New signal should be 100% fresh');

    assert(getFreshnessTier(80) === 'fresh', '80% should be fresh');
    assert(getFreshnessTier(50) === 'aging', '50% should be aging');
    assert(getFreshnessTier(15) === 'stale', '15% should be stale');
  });

  // Test 3: Prioritization Subsystem
  console.log('\n🎯 Prioritization Subsystem');
  await test('Import prioritization module', async () => {
    const prioritization = await import('../server/growth-os/prioritization');
    assert(typeof prioritization.calculatePriorityScore === 'function', 'calculatePriorityScore should exist');
    assert(typeof prioritization.rankCandidates === 'function', 'rankCandidates should exist');
  });

  await test('Calculate scoring dimensions', async () => {
    const { calculateDimensions } = await import('../server/growth-os/prioritization');
    const { createTrafficSignal } = await import('../server/growth-os/signals');

    const signals = [
      createTrafficSignal('issue', 'Test Signal', { severity: 70, impact: 80 }),
    ];

    const dimensions = calculateDimensions(signals, 'content_update', 'simple', 'easy');

    assert(dimensions.trafficLift >= 0 && dimensions.trafficLift <= 100, 'trafficLift should be 0-100');
    assert(dimensions.risk >= 0 && dimensions.risk <= 100, 'risk should be 0-100');
  });

  await test('Calculate priority score', async () => {
    const { calculatePriorityScore } = await import('../server/growth-os/prioritization');

    const dimensions = {
      trafficLift: 70,
      revenueLift: 80,
      confidence: 75,
      risk: 30,
      blastRadius: 20,
      executionCost: 40,
      strategicAlignment: 60,
    };

    const score = calculatePriorityScore(dimensions);
    assert(score >= 0 && score <= 100, 'Score should be 0-100');
    assert(score > 50, 'Good dimensions should score > 50');
  });

  await test('Rank candidates', async () => {
    const { createActionCandidate, rankCandidates } = await import('../server/growth-os/prioritization');
    const { createTrafficSignal } = await import('../server/growth-os/signals');

    const signals = [createTrafficSignal('test', 'Test', { severity: 80 })];

    const candidates = [
      createActionCandidate('content_update', 'Update A', 'Description A', signals),
      createActionCandidate('seo_fix', 'SEO Fix', 'Description B', signals),
    ];

    const ranked = rankCandidates(candidates);
    assert(ranked.length === 2, 'Should have 2 ranked candidates');
    assert(ranked[0].rank === 1, 'First should have rank 1');
    assert(ranked[1].rank === 2, 'Second should have rank 2');
  });

  // Test 4: Actions Subsystem
  console.log('\n⚡ Actions Subsystem');
  await test('Import actions module', async () => {
    const actions = await import('../server/growth-os/actions');
    assert(typeof actions.synthesizePlan === 'function', 'synthesizePlan should exist');
    assert(typeof actions.planRegistry === 'object', 'planRegistry should exist');
  });

  await test('Synthesize action plan', async () => {
    const { synthesizePlan } = await import('../server/growth-os/actions');
    const { createActionCandidate } = await import('../server/growth-os/prioritization');
    const { createTrafficSignal } = await import('../server/growth-os/signals');

    const signals = [createTrafficSignal('test', 'Test Signal', { severity: 60 })];
    const candidate = createActionCandidate('content_update', 'Update Content', 'Test update', signals);

    const plan = synthesizePlan(candidate, { includeBackup: true });

    assert(plan.id.length > 0, 'Plan should have ID');
    assert(plan.steps.length > 0, 'Plan should have steps');
    assert(plan.status === 'draft', 'New plan should be draft');
  });

  await test('Approve plan', async () => {
    const { synthesizePlan, approvePlan } = await import('../server/growth-os/actions');
    const { createActionCandidate } = await import('../server/growth-os/prioritization');
    const { createTrafficSignal } = await import('../server/growth-os/signals');

    const signals = [createTrafficSignal('test', 'Test', { severity: 90 })];
    const candidate = createActionCandidate('governance_compliance', 'Compliance Update', 'Test', signals);

    const plan = synthesizePlan(candidate);
    const approved = approvePlan(plan, 'test-user');

    assert(approved.approved === true, 'Plan should be approved');
    assert(approved.approvedBy === 'test-user', 'Approver should be recorded');
    assert(approved.status === 'ready', 'Approved plan should be ready');
  });

  // Test 5: Safety Subsystem
  console.log('\n🛡️ Safety Subsystem');
  await test('Import safety module', async () => {
    const safety = await import('../server/growth-os/safety');
    assert(typeof safety.evaluatePlan === 'function', 'evaluatePlan should exist');
    assert(typeof safety.checkReadiness === 'function', 'checkReadiness should exist');
  });

  await test('Evaluate plan safety', async () => {
    const { evaluatePlan } = await import('../server/growth-os/safety');
    const { synthesizePlan } = await import('../server/growth-os/actions');
    const { createActionCandidate } = await import('../server/growth-os/prioritization');
    const { createTrafficSignal } = await import('../server/growth-os/signals');

    const signals = [createTrafficSignal('test', 'Test', { severity: 50 })];
    const candidate = createActionCandidate('content_update', 'Safe Update', 'Test', signals);
    const plan = synthesizePlan(candidate);

    const evaluation = evaluatePlan(plan);

    assert(evaluation.targetId === plan.id, 'Evaluation should reference plan');
    assert(evaluation.checks.length > 0, 'Should have safety checks');
    assert(typeof evaluation.riskScore === 'number', 'Should have risk score');
  });

  await test('Check rate limit', async () => {
    const { checkRateLimit, incrementRateLimit } = await import('../server/growth-os/safety');

    const result = checkRateLimit('smoke-test');
    assert(result.allowed === true, 'Should allow first request');
    assert(result.currentCount === 0, 'Count should start at 0');

    incrementRateLimit('smoke-test');
    const after = checkRateLimit('smoke-test');
    assert(after.currentCount === 1, 'Count should be 1 after increment');
  });

  await test('Get all policies', async () => {
    const { getAllPolicies } = await import('../server/growth-os/safety');

    const policies = getAllPolicies();
    assert(Array.isArray(policies), 'Should return array of policies');
    assert(policies.length > 0, 'Should have default policies');
    assert(policies[0].id.length > 0, 'Policies should have IDs');
  });

  // Test 6: API Subsystem
  console.log('\n🌐 API Subsystem');
  await test('Import API module', async () => {
    const api = await import('../server/growth-os/api');
    assert(typeof api.getFeed === 'function', 'getFeed should exist');
    assert(typeof api.getDashboardSummary === 'function', 'getDashboardSummary should exist');
  });

  await test('Generate and get feed', async () => {
    const { generateFeed, getFeed, clearFeed } = await import('../server/growth-os/api');

    clearFeed();
    generateFeed();

    const feed = getFeed({ limit: 10 });
    assert(typeof feed.total === 'number', 'Feed should have total');
    assert(typeof feed.unreadCount === 'number', 'Feed should have unreadCount');
    assert(Array.isArray(feed.items), 'Feed should have items array');
  });

  await test('Get dashboard summary', async () => {
    const { getDashboardSummary } = await import('../server/growth-os/api');

    const summary = getDashboardSummary();

    assert(typeof summary.healthScore === 'number', 'Should have health score');
    assert(summary.healthScore >= 0 && summary.healthScore <= 100, 'Health score should be 0-100');
    assert(typeof summary.pendingActions === 'number', 'Should have pending actions count');
    assert(typeof summary.revenueOpportunity === 'number', 'Should have revenue opportunity');
  });

  await test('Get action queue', async () => {
    const { getActionQueue } = await import('../server/growth-os/api');

    const queue = getActionQueue();

    assert(Array.isArray(queue.items), 'Queue should have items');
    assert(typeof queue.totalPending === 'number', 'Should have pending count');
    assert(typeof queue.totalReady === 'number', 'Should have ready count');
  });

  // Test 7: Integration
  console.log('\n🔗 Integration');
  await test('End-to-end workflow', async () => {
    const { signalRegistry, createTrafficSignal, createRevenueSignal } = await import('../server/growth-os/signals');
    const { createActionCandidate, prioritize } = await import('../server/growth-os/prioritization');
    const { synthesizePlans, planRegistry } = await import('../server/growth-os/actions');
    const { checkReadiness } = await import('../server/growth-os/safety');

    // Clear state
    signalRegistry.clear();
    planRegistry.clear();

    // 1. Add signals
    const signals = [
      createTrafficSignal('opportunity', 'High Traffic Opportunity', {
        severity: 75,
        impact: 80,
        contentIds: ['content-1', 'content-2'],
      }),
      createRevenueSignal('monetization', 'Monetization Gap', 500, {
        contentIds: ['content-1'],
      }),
    ];

    for (const signal of signals) {
      signalRegistry.addSignal(signal);
    }

    // 2. Create candidates
    const candidates = [
      createActionCandidate('content_update', 'Optimize Top Content', 'Improve high-traffic pages', signals),
      createActionCandidate('seo_fix', 'SEO Enhancement', 'Fix meta tags', [signals[0]]),
    ];

    // 3. Prioritize
    const result = prioritize(candidates);
    assert(result.candidates.length === 2, 'Should have 2 prioritized candidates');

    // 4. Synthesize plans
    const plans = synthesizePlans(result.candidates);
    assert(plans.length === 2, 'Should synthesize 2 plans');

    for (const plan of plans) {
      planRegistry.add(plan);
    }

    // 5. Check readiness
    const readiness = checkReadiness(plans[0]);
    assert(['ready', 'blocked', 'pending_approval', 'pending_dependency'].includes(readiness.status),
      'Should have valid readiness status');

    // Verify end state
    const stats = signalRegistry.getStats();
    assert(stats.totalSignals >= 2, 'Should have signals in registry');
    assert(planRegistry.size >= 2, 'Should have plans in registry');
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = Date.now() - startTime;

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed (${totalDuration}ms)`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  - ${result.name}: ${result.error}`);
    }
    process.exit(1);
  } else {
    console.log('\n✅ All smoke tests passed!\n');
    process.exit(0);
  }
}

// Run tests
runSmokeTests().catch(error => {
  console.error('Smoke test runner failed:', error);
  process.exit(1);
});
