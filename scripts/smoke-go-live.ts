#!/usr/bin/env npx tsx
/**
 * Smoke Test: Go-Live Control Plane (GLCP)
 *
 * Usage: npx tsx scripts/smoke-go-live.ts
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - Critical regression found
 */

// Enable GLCP for testing
process.env.ENABLE_GLCP = 'true';

import {
  discoverCapabilities,
  registerCapabilities,
  getAllCapabilities,
  getCapability,
  groupByDomain,
  createSnapshot,
  clearCapabilityStore,
} from '../server/go-live-control-plane/capabilities/registry';
import {
  validateDependencies,
  detectInvalidStates,
  getSafeToEnable,
  calculateBlastRadius,
  getEnableOrder,
  getDisableOrder,
} from '../server/go-live-control-plane/capabilities/dependency-resolver';
import {
  evaluateReadiness,
  quickHealthCheck,
  getGoLiveReadiness,
  getAvailableProbes,
  clearEvaluationCache,
} from '../server/go-live-control-plane/readiness/evaluator';
import {
  simulate,
  simulateBatch,
  simulateEnable,
  simulateDisable,
  compareStates,
  clearSimulationCache,
} from '../server/go-live-control-plane/simulator/simulator';
import { detectConflicts, hasBlockingConflicts } from '../server/go-live-control-plane/simulator/conflict-detector';
import {
  createPlan,
  approvePlan,
  execute,
  getExecution,
  listExecutions,
  clearExecutorState,
} from '../server/go-live-control-plane/executor/executor';
import {
  logAuditEvent,
  getAuditLog,
  getActivitySummary,
  clearAuditLog,
} from '../server/go-live-control-plane/executor/audit';
import { createCheckpoint, getCheckpoint, canRollback } from '../server/go-live-control-plane/executor/rollback';
import { runAllProbes, runProbesByCategory } from '../server/go-live-control-plane/readiness/probes';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function log(message: string, color: string = RESET): void {
  console.log(`${color}${message}${RESET}`);
}

function assert(condition: boolean, message: string): void {
  if (condition) {
    log(`  ✓ ${message}`, GREEN);
    passed++;
  } else {
    log(`  ✗ ${message}`, RED);
    failed++;
  }
}

async function runTests(): Promise<void> {
  log('\n═══════════════════════════════════════════════════════');
  log('  GO-LIVE CONTROL PLANE (GLCP) - MASTER SMOKE TEST');
  log('═══════════════════════════════════════════════════════\n');

  // Clear all state
  clearCapabilityStore();
  clearEvaluationCache();
  clearSimulationCache();
  clearExecutorState();
  clearAuditLog();

  // ========================================
  // Feature 1: Capability Registry
  // ========================================
  log('FEATURE 1: CAPABILITY REGISTRY', CYAN);
  log('─────────────────────────────────────────────', CYAN);

  log('\n1.1 Capability Discovery', YELLOW);
  const discovered = discoverCapabilities();
  assert(discovered.length > 0, `Discovered ${discovered.length} capabilities from flags`);
  registerCapabilities(discovered);
  const allCaps = getAllCapabilities();
  assert(allCaps.length > 0, 'Capabilities registered successfully');

  log('\n1.2 Capability Retrieval', YELLOW);
  if (allCaps.length > 0) {
    const firstCap = getCapability(allCaps[0].id);
    assert(firstCap !== undefined, 'Can retrieve capability by ID');
    assert(firstCap!.id === allCaps[0].id, 'Retrieved capability has correct ID');
    assert(firstCap!.name !== '', 'Capability has a name');
    assert(firstCap!.domain !== undefined, 'Capability has a domain');
    assert(firstCap!.riskLevel !== undefined, 'Capability has a risk level');
  }

  log('\n1.3 Domain Grouping', YELLOW);
  const domainGroups = groupByDomain();
  assert(domainGroups.length > 0, 'Capabilities grouped by domain');
  for (const group of domainGroups) {
    assert(group.capabilities.every((c: any) => c.domain === group.domain), `All ${group.domain} caps have correct domain`);
  }

  log('\n1.4 Snapshot Creation', YELLOW);
  const snapshot = createSnapshot();
  assert(snapshot.timestamp !== undefined, 'Snapshot has timestamp');
  assert(snapshot.capabilities.length === allCaps.length, 'Snapshot contains all capabilities');

  // ========================================
  // Feature 2: Dependency Resolution
  // ========================================
  log('\n\nFEATURE 2: DEPENDENCY RESOLUTION', CYAN);
  log('─────────────────────────────────────────────', CYAN);

  log('\n2.1 Dependency Validation', YELLOW);
  const validation = validateDependencies();
  assert(validation.valid !== undefined, 'Validation returns valid flag');
  assert(Array.isArray(validation.missingDependencies), 'Missing dependencies is an array');
  assert(Array.isArray(validation.circularDependencies), 'Circular dependencies is an array');

  log('\n2.2 Invalid State Detection', YELLOW);
  const invalidStates = detectInvalidStates();
  assert(invalidStates.hasInvalidStates !== undefined, 'Invalid states detected');
  assert(Array.isArray(invalidStates.issues), 'Issues is an array');

  log('\n2.3 Safe to Enable', YELLOW);
  const safeToEnable = getSafeToEnable();
  assert(Array.isArray(safeToEnable), 'Safe to enable returns array');

  log('\n2.4 Blast Radius Calculation', YELLOW);
  if (allCaps.length > 0) {
    const radius = calculateBlastRadius(allCaps[0].id);
    assert(Array.isArray(radius.directImpact), 'Direct impact is array');
    assert(Array.isArray(radius.transitiveImpact), 'Transitive impact is array');
    assert(typeof radius.totalAffected === 'number', 'Total affected is number');
    assert(['low', 'medium', 'high', 'critical'].includes(radius.riskLevel), 'Risk level is valid');
  }

  log('\n2.5 Enable/Disable Ordering', YELLOW);
  if (allCaps.length > 0) {
    const enableOrder = getEnableOrder(allCaps[0].id);
    const disableOrder = getDisableOrder(allCaps[0].id);
    assert(Array.isArray(enableOrder), 'Enable order is array');
    assert(Array.isArray(disableOrder), 'Disable order is array');
  }

  // ========================================
  // Feature 3: Environment Readiness
  // ========================================
  log('\n\nFEATURE 3: ENVIRONMENT READINESS', CYAN);
  log('─────────────────────────────────────────────', CYAN);

  log('\n3.1 Available Probes', YELLOW);
  const probes = getAvailableProbes();
  assert(probes.length > 0, `${probes.length} probes available`);
  const categories = new Set(probes.map(p => p.category));
  assert(categories.size > 0, `Probes span ${categories.size} categories`);

  log('\n3.2 Run All Probes', YELLOW);
  const probeResults = await runAllProbes();
  assert(probeResults.length > 0, 'All probes ran');
  assert(probeResults.every(r => r.status !== undefined), 'All probes have status');
  assert(probeResults.every(r => r.durationMs >= 0), 'All probes have duration');

  log('\n3.3 Run Probes by Category', YELLOW);
  const dbProbes = await runProbesByCategory('database');
  assert(dbProbes.length > 0, 'Database probes ran');
  assert(dbProbes.every(r => r.category === 'database'), 'All results are database category');

  log('\n3.4 Quick Health Check', YELLOW);
  const health = await quickHealthCheck();
  assert(typeof health.healthy === 'boolean', 'Health check returns boolean');
  assert(['READY', 'DEGRADED', 'BLOCKED'].includes(health.status), 'Status is valid');

  log('\n3.5 Full Readiness Evaluation', YELLOW);
  clearEvaluationCache();
  const readiness = await evaluateReadiness({ useCache: false });
  assert(['READY', 'DEGRADED', 'BLOCKED'].includes(readiness.status), 'Readiness status valid');
  assert(readiness.summary.total === readiness.probes.length, 'Summary total matches probes');
  assert(Array.isArray(readiness.recommendations), 'Recommendations is array');

  log('\n3.6 Go-Live Readiness', YELLOW);
  const goLive = await getGoLiveReadiness();
  assert(typeof goLive.canGoLive === 'boolean', 'Can go live is boolean');
  assert(typeof goLive.score === 'number', 'Score is number');
  assert(['PROCEED', 'PROCEED_WITH_CAUTION', 'DO_NOT_PROCEED'].includes(goLive.recommendation), 'Recommendation valid');

  // ========================================
  // Feature 4: Rollout Simulator
  // ========================================
  log('\n\nFEATURE 4: ROLLOUT SIMULATOR', CYAN);
  log('─────────────────────────────────────────────', CYAN);

  log('\n4.1 Single Simulation', YELLOW);
  if (allCaps.length > 0) {
    const simResult = simulate({ capabilityId: allCaps[0].id, action: 'toggle' });
    assert(simResult.id !== undefined, 'Simulation has ID');
    assert(typeof simResult.feasible === 'boolean', 'Feasible is boolean');
    assert(['low', 'medium', 'high', 'critical'].includes(simResult.riskLevel), 'Risk level valid');
  }

  log('\n4.2 Batch Simulation', YELLOW);
  if (allCaps.length >= 2) {
    const batchSim = simulateBatch([
      { capabilityId: allCaps[0].id, action: 'enable' },
      { capabilityId: allCaps[1].id, action: 'enable' },
    ]);
    assert(batchSim.id !== undefined, 'Batch simulation has ID');
    assert(Array.isArray(batchSim.capabilityImpacts), 'Capability impacts is array');
    assert(Array.isArray(batchSim.enableOrder), 'Enable order is array');
  }

  log('\n4.3 Enable/Disable Convenience', YELLOW);
  if (allCaps.length > 0) {
    const enableSim = simulateEnable(allCaps[0].id);
    const disableSim = simulateDisable(allCaps[0].id);
    assert(enableSim.id !== disableSim.id, 'Enable and disable simulations have different IDs');
  }

  log('\n4.4 State Comparison', YELLOW);
  if (allCaps.length > 0) {
    const comparison = compareStates([{ capabilityId: allCaps[0].id, action: 'toggle' }]);
    assert(comparison.before !== undefined, 'Comparison has before state');
    assert(comparison.after !== undefined, 'Comparison has after state');
    assert(comparison.delta !== undefined, 'Comparison has delta');
  }

  log('\n4.5 Conflict Detection', YELLOW);
  const projectedState = new Map<string, boolean>();
  allCaps.forEach(c => projectedState.set(c.id, true));
  const conflicts = detectConflicts(
    allCaps.length > 0 ? [{ capabilityId: allCaps[0].id, action: 'enable' }] : [],
    projectedState
  );
  assert(Array.isArray(conflicts), 'Conflicts is array');
  const hasBlockers = hasBlockingConflicts(conflicts);
  assert(typeof hasBlockers === 'boolean', 'Has blocking conflicts is boolean');

  // ========================================
  // Feature 5: Safe Rollout Executor
  // ========================================
  log('\n\nFEATURE 5: SAFE ROLLOUT EXECUTOR', CYAN);
  log('─────────────────────────────────────────────', CYAN);

  log('\n5.1 Create Execution Plan', YELLOW);
  let planId: string | undefined;
  if (allCaps.length > 0) {
    const sim = simulateBatch([{ capabilityId: allCaps[0].id, action: 'toggle' }]);
    const plan = createPlan(sim, 'Smoke Test Plan', 'smoke-test');
    assert(plan.id !== undefined, 'Plan has ID');
    assert(plan.name === 'Smoke Test Plan', 'Plan has correct name');
    assert(plan.createdBy === 'smoke-test', 'Plan has correct creator');
    assert(Array.isArray(plan.steps), 'Plan has steps array');
    planId = plan.id;
  }

  log('\n5.2 Approve Plan', YELLOW);
  if (planId) {
    const approved = approvePlan(planId, 'smoke-approver');
    assert(approved !== null, 'Plan approved');
    assert(approved!.approvedBy === 'smoke-approver', 'Approver recorded');
    assert(approved!.approvedAt !== undefined, 'Approval time recorded');
  }

  log('\n5.3 Execute Plan (Dry Run)', YELLOW);
  if (planId) {
    const execResult = await execute(planId, { dryRun: true, actor: 'smoke-test' });
    assert(execResult.executionId !== undefined, 'Execution has ID');
    assert(execResult.planId === planId, 'Execution references correct plan');
    assert(typeof execResult.success === 'boolean', 'Success is boolean');
    assert(Array.isArray(execResult.steps), 'Execution has steps');
  }

  log('\n5.4 List Executions', YELLOW);
  const executions = listExecutions();
  assert(Array.isArray(executions), 'Executions is array');

  log('\n5.5 Checkpoint & Rollback', YELLOW);
  const checkpoint = createCheckpoint('smoke-exec-1', 3);
  assert(checkpoint.executionId === 'smoke-exec-1', 'Checkpoint has execution ID');
  assert(checkpoint.stepIndex === 3, 'Checkpoint has step index');
  const retrieved = getCheckpoint('smoke-exec-1');
  assert(retrieved !== undefined, 'Can retrieve checkpoint');

  // ========================================
  // Feature 6: Audit Trail
  // ========================================
  log('\n\nFEATURE 6: AUDIT TRAIL', CYAN);
  log('─────────────────────────────────────────────', CYAN);

  log('\n6.1 Log Audit Events', YELLOW);
  clearAuditLog();
  logAuditEvent('execution_started', 'Smoke test execution', 'smoke-test', true);
  logAuditEvent('step_completed', 'Step 1 done', 'smoke-test', true);
  logAuditEvent('execution_completed', 'All done', 'smoke-test', true);
  const auditLog = getAuditLog();
  assert(auditLog.length === 3, 'Audit log has 3 entries');

  log('\n6.2 Filter Audit Log', YELLOW);
  const filtered = getAuditLog({ action: 'execution_started' as any });
  assert(filtered.length === 1, 'Filtered log has 1 entry');
  assert(filtered[0].action === 'execution_started', 'Filtered entry has correct action');

  log('\n6.3 Activity Summary', YELLOW);
  const summary = getActivitySummary(24);
  assert(summary.totalEvents === 3, 'Summary has correct total');
  assert(summary.successfulEvents === 3, 'Summary has correct success count');
  assert(summary.failedEvents === 0, 'Summary has correct failure count');

  // ========================================
  // Integration Tests
  // ========================================
  log('\n\nINTEGRATION TESTS', CYAN);
  log('─────────────────────────────────────────────', CYAN);

  log('\n7.1 Full Workflow: Discover → Simulate → Plan → Execute', YELLOW);
  clearExecutorState();
  clearAuditLog();

  if (allCaps.length > 0) {
    // 1. Simulate
    const workflow_sim = simulateBatch([{ capabilityId: allCaps[0].id, action: 'toggle' }]);
    assert(workflow_sim.feasible !== undefined, 'Workflow: Simulation completed');

    // 2. Create plan
    const workflow_plan = createPlan(workflow_sim, 'Workflow Test', 'workflow-test');
    assert(workflow_plan.id !== undefined, 'Workflow: Plan created');

    // 3. Approve
    approvePlan(workflow_plan.id, 'workflow-approver');

    // 4. Execute (dry run)
    const workflow_exec = await execute(workflow_plan.id, { dryRun: true });
    assert(workflow_exec.success === true, 'Workflow: Execution succeeded');

    // 5. Check audit trail
    const workflow_audit = getAuditLog();
    assert(workflow_audit.length > 0, 'Workflow: Audit trail recorded');
  }

  log('\n7.2 Readiness → Go-Live Decision', YELLOW);
  clearEvaluationCache();
  const finalReadiness = await evaluateReadiness({ useCache: false });
  const finalGoLive = await getGoLiveReadiness();
  assert(
    (finalReadiness.status === 'BLOCKED') === (finalGoLive.recommendation === 'DO_NOT_PROCEED'),
    'Readiness and go-live recommendation are consistent'
  );

  // ========================================
  // Summary
  // ========================================
  log('\n═══════════════════════════════════════════════════════');
  log('  SMOKE TEST SUMMARY');
  log('═══════════════════════════════════════════════════════');
  log(`  Passed: ${passed}`, GREEN);
  if (failed > 0) {
    log(`  Failed: ${failed}`, RED);
  }
  log('═══════════════════════════════════════════════════════\n');

  // Status summary
  log('System Status:', YELLOW);
  log(`  Capabilities Discovered: ${allCaps.length}`);
  log(`  Probes Available: ${probes.length}`);
  log(`  Current Readiness: ${readiness.status}`);
  log(`  Go-Live Recommendation: ${goLive.recommendation}`);
  log('');

  // Clean up
  clearCapabilityStore();
  clearEvaluationCache();
  clearSimulationCache();
  clearExecutorState();
  clearAuditLog();
}

// Run and exit with appropriate code
runTests()
  .then(() => {
    if (failed > 0) {
      log('CRITICAL: Smoke test failed with regressions!', RED);
      process.exit(1);
    } else {
      log('All GLCP smoke tests passed!', GREEN);
      process.exit(0);
    }
  })
  .catch((err) => {
    log(`CRITICAL: Smoke test threw error: ${err}`, RED);
    console.error(err);
    process.exit(1);
  });
