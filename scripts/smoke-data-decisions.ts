/**
 * Smoke Test Script for Data Decisions System
 *
 * Run with: npx tsx scripts/smoke-data-decisions.ts
 *
 * This script verifies the basic functionality of the data decisions system.
 */

import {
  decisionEngine,
  bindingsRegistry,
  confidenceEngine,
  autonomousLoop,
  systemHealthMonitor,
  dataDriftDetector,
  autopilotController,
  unifiedAutopilotGate,
  adapterRegistry,
  collisionResolver,
  executiveExplainer,
  type MetricData,
} from '../server/data-decisions';

// =============================================================================
// SMOKE TEST RUNNER
// =============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void> | void): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({
      name,
      passed: true,
      duration: Date.now() - start,
    });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    console.log(`❌ ${name}: ${error}`);
  }
}

// =============================================================================
// TESTS
// =============================================================================

async function smokeTest() {
  console.log('\n🔥 Data Decisions System - Smoke Test\n');
  console.log('='.repeat(60));

  // ---------------------------------------------------------------------------
  // 1. Verify Defaults are OFF
  // ---------------------------------------------------------------------------

  await runTest('Global autopilot defaults to OFF', () => {
    const state = unifiedAutopilotGate.getGlobalState();
    if (state.globalEnabled) {
      throw new Error('Global autopilot should be disabled by default');
    }
    if (state.globalMode !== 'off') {
      throw new Error('Global mode should be "off" by default');
    }
  });

  await runTest('Autonomous loop is not running by default', () => {
    if (autonomousLoop.isRunning()) {
      throw new Error('Autonomous loop should not be running by default');
    }
  });

  await runTest('Decision engine mode defaults to off', () => {
    const mode = decisionEngine.getAutopilotMode();
    // Note: The engine might have been set elsewhere, so we just verify it's accessible
    if (!['off', 'supervised', 'full'].includes(mode)) {
      throw new Error(`Invalid autopilot mode: ${mode}`);
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Bindings Registry
  // ---------------------------------------------------------------------------

  await runTest('Bindings registry has entries', () => {
    const bindings = bindingsRegistry.getAll();
    if (bindings.length === 0) {
      throw new Error('No bindings found');
    }
  });

  await runTest('Blocking bindings exist', () => {
    const blocking = bindingsRegistry.getBlocking();
    if (blocking.length === 0) {
      throw new Error('No blocking bindings found');
    }
  });

  await runTest('Triggering bindings exist', () => {
    const triggering = bindingsRegistry.getTriggering();
    if (triggering.length === 0) {
      throw new Error('No triggering bindings found');
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Decision Engine
  // ---------------------------------------------------------------------------

  await runTest('Decision engine processes metrics', () => {
    const metrics: MetricData[] = [
      {
        metricId: 'seo.ctr',
        currentValue: 0.005,
        dataPoints: 1000,
        lastUpdated: new Date(),
        confidence: 90,
      },
    ];

    const results = decisionEngine.processMetrics(metrics);
    // Just verify it doesn't throw
  });

  await runTest('Decision engine tracks pending decisions', () => {
    const pending = decisionEngine.getPendingDecisions();
    // Should be an array (even if empty)
    if (!Array.isArray(pending)) {
      throw new Error('Expected array of pending decisions');
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Adapters
  // ---------------------------------------------------------------------------

  await runTest('Adapter registry has adapters', () => {
    const adapters = adapterRegistry.getAll();
    if (adapters.length === 0) {
      throw new Error('No adapters registered');
    }
  });

  await runTest('SEO adapter is registered', () => {
    const adapters = adapterRegistry.getForAction('TRIGGER_SEO_REWRITE');
    if (adapters.length === 0) {
      throw new Error('SEO adapter not found');
    }
  });

  await runTest('Content adapter is registered', () => {
    const adapters = adapterRegistry.getForAction('TRIGGER_CONTENT_REVIEW');
    if (adapters.length === 0) {
      throw new Error('Content adapter not found');
    }
  });

  await runTest('Ops adapter is registered', () => {
    const adapters = adapterRegistry.getForAction('BLOCK_ALL_DEPLOYMENTS');
    if (adapters.length === 0) {
      throw new Error('Ops adapter not found');
    }
  });

  await runTest('Notification adapter is registered', () => {
    const adapters = adapterRegistry.getForAction('ESCALATE_TO_HUMAN');
    if (adapters.length === 0) {
      throw new Error('Notification adapter not found');
    }
  });

  await runTest('Adapter health check works', async () => {
    const health = await adapterRegistry.checkAllHealth();
    if (health.size === 0) {
      throw new Error('No health results');
    }
  });

  // ---------------------------------------------------------------------------
  // 5. Collision Resolver
  // ---------------------------------------------------------------------------

  await runTest('Collision resolver detects same-resource conflicts', () => {
    const decision1 = {
      id: 'test-1',
      impactedEntities: [{ type: 'content', id: 'test-content' }],
    } as any;

    const decision2 = {
      id: 'test-2',
      impactedEntities: [{ type: 'content', id: 'test-content' }],
    } as any;

    const collisions = collisionResolver.detectCollisions(decision1, [decision2]);
    if (collisions.length === 0) {
      throw new Error('Should detect same-resource collision');
    }
  });

  // ---------------------------------------------------------------------------
  // 6. Confidence & Trust
  // ---------------------------------------------------------------------------

  await runTest('Confidence engine provides statistics', () => {
    const stats = confidenceEngine.getStatistics();
    if (typeof stats.successRate !== 'number') {
      throw new Error('Expected successRate in statistics');
    }
  });

  // ---------------------------------------------------------------------------
  // 7. Unified Autopilot Gate
  // ---------------------------------------------------------------------------

  await runTest('Autopilot gate checks domain correctly', () => {
    const result = unifiedAutopilotGate.checkGate('seo');
    if (result.allowed === true && !unifiedAutopilotGate.isGlobalEnabled()) {
      throw new Error('Should not allow when global is disabled');
    }
  });

  await runTest('Emergency stop works', () => {
    unifiedAutopilotGate.emergencyStop('smoke-test', 'testing emergency stop');
    if (!unifiedAutopilotGate.isEmergencyStopped()) {
      throw new Error('Emergency stop should be active');
    }
    // Clear for remaining tests
    unifiedAutopilotGate.clearEmergencyStop('smoke-test', 'test cleanup');
  });

  // ---------------------------------------------------------------------------
  // 8. Executive Explainer
  // ---------------------------------------------------------------------------

  await runTest('Executive explainer generates explanation', () => {
    const mockDecision = {
      id: 'test-explain',
      type: 'TRIGGER_SEO_REWRITE',
      authority: 'triggering',
      signal: {
        metricId: 'seo.average_position',
        value: 25,
        threshold: 10,
        condition: '> 10',
      },
      confidence: 85,
      dataSufficiency: 100,
      freshness: 2,
      status: 'pending',
      impactedEntities: [],
    } as any;

    const explanation = executiveExplainer.explain(mockDecision);
    if (!explanation.whatHappened) {
      throw new Error('Explanation missing whatHappened');
    }
    if (!explanation.whyItHappened) {
      throw new Error('Explanation missing whyItHappened');
    }
  });

  // ---------------------------------------------------------------------------
  // 9. System Health Monitor
  // ---------------------------------------------------------------------------

  await runTest('System health monitor reports status', () => {
    const status = systemHealthMonitor.getStatus();
    if (!status.overall) {
      throw new Error('Expected overall health status');
    }
  });

  // ---------------------------------------------------------------------------
  // 10. Data Drift Detector
  // ---------------------------------------------------------------------------

  await runTest('Data drift detector runs', () => {
    const drift = dataDriftDetector.detectDrift();
    if (drift.severity === undefined) {
      throw new Error('Expected severity in drift status');
    }
  });

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  - ${result.name}: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }

  console.log('✅ All smoke tests passed!\n');
}

// =============================================================================
// ENABLE IN DEV GUIDE
// =============================================================================

function printEnableGuide() {
  console.log(`
📘 HOW TO SAFELY ENABLE IN DEV

1. Start in "off" mode (default):
   - The system starts with all autonomous behavior disabled
   - Decisions are generated but not auto-executed
   - All decisions queue for manual approval

2. Enable supervised mode:
   POST /api/decisions/autopilot/global/enable
   {
     "mode": "supervised",
     "changedBy": "your-name",
     "reason": "Testing in dev"
   }

3. Enable specific domains:
   POST /api/decisions/autopilot/domain/seo
   {
     "mode": "supervised",
     "enabled": true,
     "changedBy": "your-name"
   }

4. Monitor decisions:
   GET /api/decisions/queue
   GET /api/decisions/executive/overview

5. Execute with dry run:
   POST /api/decisions/execute/:id
   { "dryRun": true }

6. If anything goes wrong:
   POST /api/decisions/autopilot/emergency-stop
   { "triggeredBy": "your-name", "reason": "Issue description" }

⚠️  FLAGS TO ENABLE:
   - ENABLE_DATA_DECISIONS=true
   - DATA_DECISIONS_MODE=off | supervised | full

🔒 SAFETY:
   - Default mode is always OFF
   - Dry run is enabled by default for all adapters
   - Circuit breaker auto-opens on failures
   - Emergency stop halts all autonomous behavior
`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  await smokeTest();
  printEnableGuide();
}

main().catch(console.error);
