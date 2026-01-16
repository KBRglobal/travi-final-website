#!/usr/bin/env npx tsx
/**
 * Smoke Test — Platform Coherence
 *
 * Validates the Single Source of Truth system is functioning correctly.
 *
 * Tests:
 * 1. Snapshot generation
 * 2. Availability matrix
 * 3. Intent gate (can-i)
 * 4. Contradiction detection
 * 5. Degraded mode handling
 */

// Enable platform state for testing
process.env.ENABLE_PLATFORM_STATE = 'true';

import {
  getPlatformStateService,
  resetPlatformStateService,
} from '../server/platform-state/service';
import {
  CONTRACT,
  evaluateSystemHealth,
  evaluateIntentPermission,
  type HealthSignals,
} from '../server/platform-contract';

// ============================================================
// TEST UTILITIES
// ============================================================

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({
      name,
      passed: true,
      duration: Date.now() - start,
    });
    console.log(`  [PASS] ${name} (${Date.now() - start}ms)`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`  [FAIL] ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================
// TEST SUITE
// ============================================================

async function main() {
  console.log('\n========================================');
  console.log('  Platform Coherence Smoke Test');
  console.log('========================================\n');

  const service = getPlatformStateService();

  // ----------------------------------------------------------
  // TEST 1: SNAPSHOT GENERATION
  // ----------------------------------------------------------
  console.log('1. Snapshot Generation');

  await runTest('Generates valid snapshot', async () => {
    const snapshot = await service.getSnapshot(true);
    assert(!!snapshot.id, 'Snapshot should have ID');
    assert(!!snapshot.timestamp, 'Snapshot should have timestamp');
    assert(!!snapshot.health, 'Snapshot should have health state');
    assert(typeof snapshot.healthScore === 'number', 'Snapshot should have health score');
    assert(snapshot.healthScore >= 0 && snapshot.healthScore <= 100, 'Health score should be 0-100');
  });

  await runTest('Snapshot has all required components', async () => {
    const snapshot = await service.getSnapshot();
    assert(!!snapshot.readiness, 'Snapshot should have readiness');
    assert(!!snapshot.autonomy, 'Snapshot should have autonomy');
    assert(!!snapshot.governance, 'Snapshot should have governance');
    assert(!!snapshot.risks, 'Snapshot should have risks');
    assert(!!snapshot.incidents, 'Snapshot should have incidents');
    assert(Array.isArray(snapshot.features), 'Snapshot should have features array');
    assert(!!snapshot.summary, 'Snapshot should have summary');
  });

  await runTest('Snapshot caching works', async () => {
    const snap1 = await service.getSnapshot();
    const snap2 = await service.getSnapshot();
    assert(snap1.id === snap2.id, 'Cached snapshot should have same ID');
  });

  await runTest('Snapshot force refresh works', async () => {
    const snap1 = await service.getSnapshot();
    await new Promise(r => setTimeout(r, 10));
    const snap2 = await service.getSnapshot(true);
    assert(snap1.id !== snap2.id, 'Forced refresh should create new snapshot');
  });

  // ----------------------------------------------------------
  // TEST 2: AVAILABILITY MATRIX
  // ----------------------------------------------------------
  console.log('\n2. Availability Matrix');

  await runTest('Generates availability matrix', async () => {
    const matrix = await service.getAvailability();
    assert(!!matrix.timestamp, 'Matrix should have timestamp');
    assert(!!matrix.systemHealth, 'Matrix should have system health');
    assert(Array.isArray(matrix.features), 'Matrix should have features array');
    assert(!!matrix.summary, 'Matrix should have summary');
  });

  await runTest('Availability has all features', async () => {
    const matrix = await service.getAvailability();
    assert(matrix.features.length > 0, 'Matrix should have at least one feature');
    for (const feature of matrix.features) {
      assert(!!feature.featureId, 'Feature should have ID');
      assert(!!feature.availability, 'Feature should have availability');
      assert(!!feature.reason, 'Feature should have reason');
    }
  });

  await runTest('Availability summary counts match', async () => {
    const matrix = await service.getAvailability();
    const total = matrix.summary.available +
      matrix.summary.constrained +
      matrix.summary.blocked +
      matrix.summary.requiresApproval +
      matrix.summary.simulatedOnly;
    assert(total === matrix.features.length, 'Summary counts should match total features');
  });

  // ----------------------------------------------------------
  // TEST 3: INTENT GATE (CAN-I)
  // ----------------------------------------------------------
  console.log('\n3. Intent Gate (can-i)');

  await runTest('Evaluates publish_content intent', async () => {
    const response = await service.canI({ intent: 'publish_content' });
    assert(typeof response.allowed === 'boolean', 'Response should have allowed');
    assert(typeof response.confidence === 'number', 'Response should have confidence');
    assert(!!response.reason, 'Response should have reason');
    assert(!!response.snapshotId, 'Response should have snapshotId');
  });

  await runTest('Evaluates critical intent (go_live)', async () => {
    const response = await service.canI({ intent: 'go_live' });
    assert(typeof response.allowed === 'boolean', 'Response should have allowed');
    assert(response.confidence >= 0 && response.confidence <= 100, 'Confidence should be 0-100');
  });

  await runTest('Intent with context', async () => {
    const response = await service.canI({
      intent: 'publish_content',
      context: {
        entityId: 'content-123',
        entityType: 'article',
        userId: 'user-456',
      },
    });
    assert(typeof response.allowed === 'boolean', 'Response should have allowed');
  });

  // ----------------------------------------------------------
  // TEST 4: CONTRADICTION DETECTION
  // ----------------------------------------------------------
  console.log('\n4. Contradiction Detection');

  await runTest('Generates contradiction report', async () => {
    const report = await service.getContradictions();
    assert(!!report.timestamp, 'Report should have timestamp');
    assert(!!report.snapshotId, 'Report should have snapshotId');
    assert(Array.isArray(report.contradictions), 'Report should have contradictions array');
    assert(!!report.overallCoherence, 'Report should have overallCoherence');
    assert(typeof report.coherenceScore === 'number', 'Report should have coherenceScore');
  });

  await runTest('Coherence score is valid', async () => {
    const report = await service.getContradictions();
    assert(report.coherenceScore >= 0 && report.coherenceScore <= 100, 'Coherence score should be 0-100');
  });

  // ----------------------------------------------------------
  // TEST 5: DEGRADED MODE
  // ----------------------------------------------------------
  console.log('\n5. Degraded Mode Handling');

  await runTest('Health summary works', async () => {
    const summary = await service.getHealthSummary();
    assert(!!summary.health, 'Summary should have health');
    assert(typeof summary.score === 'number', 'Summary should have score');
    assert(typeof summary.canOperate === 'boolean', 'Summary should have canOperate');
    assert(!!summary.headline, 'Summary should have headline');
  });

  // ----------------------------------------------------------
  // TEST 6: CONTRACT VALIDATION
  // ----------------------------------------------------------
  console.log('\n6. Platform Contract Validation');

  await runTest('Contract thresholds are valid', async () => {
    assert(CONTRACT.readiness.healthy > CONTRACT.readiness.degraded, 'Healthy > degraded threshold');
    assert(CONTRACT.readiness.degraded > CONTRACT.readiness.dangerous, 'Degraded > dangerous threshold');
    assert(CONTRACT.autonomy.budgetWarningPercent < CONTRACT.autonomy.budgetCriticalPercent, 'Warning < critical');
  });

  await runTest('Health evaluation: healthy signals', async () => {
    const healthySignals: HealthSignals = {
      readinessScore: 90,
      autonomyState: 'normal',
      activeCriticalIncidents: 0,
      activeHighIncidents: 0,
      activeMediumIncidents: 0,
      criticalRisks: 0,
      highRisks: 0,
      blastRadius: 0,
      blockedApprovals: 0,
      pendingOverrides: 0,
      budgetUsagePercent: 30,
    };
    const health = evaluateSystemHealth(healthySignals);
    assert(health === 'healthy', `Expected healthy, got ${health}`);
  });

  await runTest('Health evaluation: dangerous signals', async () => {
    const dangerousSignals: HealthSignals = {
      readinessScore: 20,
      autonomyState: 'halted',
      activeCriticalIncidents: 1,
      activeHighIncidents: 5,
      activeMediumIncidents: 10,
      criticalRisks: 1,
      highRisks: 5,
      blastRadius: 0.5,
      blockedApprovals: 20,
      pendingOverrides: 5,
      budgetUsagePercent: 100,
    };
    const health = evaluateSystemHealth(dangerousSignals);
    assert(health === 'dangerous', `Expected dangerous, got ${health}`);
  });

  await runTest('Intent permission: blocked in dangerous state', async () => {
    const dangerousSignals: HealthSignals = {
      readinessScore: 20,
      autonomyState: 'halted',
      activeCriticalIncidents: 1,
      activeHighIncidents: 0,
      activeMediumIncidents: 0,
      criticalRisks: 0,
      highRisks: 0,
      blastRadius: 0,
      blockedApprovals: 0,
      pendingOverrides: 0,
      budgetUsagePercent: 50,
    };
    const permission = evaluateIntentPermission('go_live', 'dangerous', dangerousSignals);
    assert(permission.allowed === false, 'go_live should be blocked in dangerous state');
  });

  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------
  console.log('\n========================================');
  console.log('  Summary');
  console.log('========================================\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`  Total:  ${results.length}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Time:   ${totalDuration}ms\n`);

  if (failed > 0) {
    console.log('  Failed Tests:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`    - ${r.name}: ${r.error}`);
    }
    console.log('');
  }

  // Clean up
  resetPlatformStateService();

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
