/**
 * Production Freeze Smoke Test
 * Final validation before stopping development
 *
 * Checks:
 * - Platform status
 * - Execution gate
 * - Contradictions
 * - Degraded mode
 * - Feature availability
 */

import { generatePlatformSnapshot, PlatformSnapshot } from "../server/platform-status";
import { checkExecution, ExecutionCheckResponse } from "../server/execution-gate";
import { detectContradictions, ContradictionReport } from "../server/contradiction-detector";
import { getAllFeatureContracts, FeatureContract } from "../server/feature-contract";

interface SmokeTestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

interface SmokeTestReport {
  timestamp: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: SmokeTestResult[];
  summary: string;
}

const results: SmokeTestResult[] = [];

function log(msg: string): void {
  console.log(`[SMOKE] ${msg}`);
}

function pass(name: string, message: string, details?: unknown): void {
  results.push({ name, passed: true, message, details });
  log(`✓ ${name}: ${message}`);
}

function fail(name: string, message: string, details?: unknown): void {
  results.push({ name, passed: false, message, details });
  log(`✗ ${name}: ${message}`);
}

async function testPlatformStatus(): Promise<PlatformSnapshot | null> {
  log("Testing platform status...");

  try {
    const snapshot = await generatePlatformSnapshot();

    if (!snapshot) {
      fail("platform_status", "Failed to generate snapshot");
      return null;
    }

    if (!snapshot.timestamp) {
      fail("platform_status", "Snapshot missing timestamp");
      return null;
    }

    pass("platform_status", `Snapshot generated at ${snapshot.timestamp}`, {
      healthy: snapshot.healthy,
      readiness: snapshot.readiness.level,
      autonomy: snapshot.autonomy.mode,
    });

    // Check readiness
    if (snapshot.readiness.level === "BLOCKED") {
      fail("readiness_level", `Platform blocked: ${snapshot.readiness.blockers.join(", ")}`);
    } else {
      pass("readiness_level", `Readiness: ${snapshot.readiness.level}`);
    }

    // Check autonomy
    if (snapshot.autonomy.mode === "BLOCKED") {
      fail("autonomy_mode", `Autonomy blocked: ${snapshot.autonomy.restrictions.join(", ")}`);
    } else {
      pass(
        "autonomy_mode",
        `Autonomy: ${snapshot.autonomy.mode} (confidence: ${snapshot.autonomy.confidenceLevel}%)`
      );
    }

    // Check incidents
    if (snapshot.incidents.bySeverity.critical > 0) {
      fail(
        "critical_incidents",
        `${snapshot.incidents.bySeverity.critical} critical incident(s) open`
      );
    } else {
      pass("critical_incidents", "No critical incidents");
    }

    // Check risk score
    if (snapshot.risks.overallScore < 50) {
      fail("risk_score", `Risk score too low: ${snapshot.risks.overallScore}/100`);
    } else {
      pass("risk_score", `Risk score: ${snapshot.risks.overallScore}/100`);
    }

    return snapshot;
  } catch (error) {
    fail("platform_status", `Error: ${error instanceof Error ? error.message : "Unknown"}`);
    return null;
  }
}

async function testExecutionGate(): Promise<void> {
  log("Testing execution gate...");

  const testCases = [
    {
      name: "admin_publish",
      request: {
        action: "publish" as const,
        actor: { userId: "test-admin", role: "admin" },
        scope: { feature: "content" },
      },
      expectBlock: false,
    },
    {
      name: "viewer_deploy",
      request: {
        action: "deploy" as const,
        actor: { userId: "test-viewer", role: "viewer" },
        scope: {},
      },
      expectBlock: true,
    },
    {
      name: "admin_enable_feature",
      request: {
        action: "enable_feature" as const,
        actor: { userId: "test-admin", role: "admin" },
        scope: { feature: "governance" },
      },
      expectBlock: false,
    },
  ];

  for (const tc of testCases) {
    try {
      const result: ExecutionCheckResponse = await checkExecution(tc.request);

      if (tc.expectBlock && result.decision !== "BLOCK") {
        fail(`execution_gate_${tc.name}`, `Expected BLOCK but got ${result.decision}`);
      } else if (!tc.expectBlock && result.decision === "BLOCK") {
        fail(`execution_gate_${tc.name}`, `Unexpected BLOCK: ${result.reason}`);
      } else {
        pass(
          `execution_gate_${tc.name}`,
          `Decision: ${result.decision} (confidence: ${result.confidence}%)`
        );
      }
    } catch (error) {
      fail(
        `execution_gate_${tc.name}`,
        `Error: ${error instanceof Error ? error.message : "Unknown"}`
      );
    }
  }
}

async function testContradictions(): Promise<ContradictionReport | null> {
  log("Testing contradiction detector...");

  try {
    const report = await detectContradictions();

    if (report.bySeverity.critical > 0) {
      fail(
        "contradictions_critical",
        `${report.bySeverity.critical} critical contradiction(s)`,
        report.contradictions.filter(c => c.severity === "critical")
      );
    } else {
      pass("contradictions_critical", "No critical contradictions");
    }

    if (report.bySeverity.high > 0) {
      fail(
        "contradictions_high",
        `${report.bySeverity.high} high severity contradiction(s)`,
        report.contradictions.filter(c => c.severity === "high")
      );
    } else {
      pass("contradictions_high", "No high severity contradictions");
    }

    pass("contradictions_total", `Total: ${report.totalCount} contradiction(s)`, report.summary);

    return report;
  } catch (error) {
    fail("contradictions", `Error: ${error instanceof Error ? error.message : "Unknown"}`);
    return null;
  }
}

function testFeatureContracts(): void {
  log("Testing feature contracts...");

  const contracts = getAllFeatureContracts();

  if (contracts.length === 0) {
    fail("feature_contracts", "No feature contracts registered");
    return;
  }

  pass("feature_contracts_count", `${contracts.length} feature contracts registered`);

  // Check for circular dependencies
  const dependencyMap = new Map<string, string[]>();
  for (const contract of contracts) {
    dependencyMap.set(contract.name, contract.dependencies);
  }

  function hasCircular(name: string, visited: Set<string> = new Set()): boolean {
    if (visited.has(name)) return true;
    visited.add(name);
    const deps = dependencyMap.get(name) || [];
    for (const dep of deps) {
      if (hasCircular(dep, new Set(visited))) return true;
    }
    return false;
  }

  let circularFound = false;
  for (const contract of contracts) {
    if (hasCircular(contract.name)) {
      fail("feature_contracts_circular", `Circular dependency detected for: ${contract.name}`);
      circularFound = true;
    }
  }

  if (!circularFound) {
    pass("feature_contracts_circular", "No circular dependencies");
  }

  // Check for undefined dependencies
  const allFeatures = new Set(contracts.map(c => c.name));
  for (const contract of contracts) {
    const unknownDeps = contract.dependencies.filter(d => !allFeatures.has(d));
    if (unknownDeps.length > 0) {
      fail(`feature_contract_${contract.name}`, `Unknown dependencies: ${unknownDeps.join(", ")}`);
    }
  }
}

function testDegradedMode(snapshot: PlatformSnapshot | null): void {
  log("Testing degraded mode detection...");

  if (!snapshot) {
    fail("degraded_mode", "No snapshot available");
    return;
  }

  const degradedFeatures = Object.entries(snapshot.features)
    .filter(([_, f]) => f.state === "LIMITED" || f.state === "BLOCKED")
    .map(([name, f]) => `${name}: ${f.state}${f.reason ? ` (${f.reason})` : ""}`);

  if (degradedFeatures.length > 0) {
    pass(
      "degraded_mode",
      `${degradedFeatures.length} feature(s) in degraded mode`,
      degradedFeatures
    );
  } else {
    pass("degraded_mode", "No features in degraded mode");
  }

  // Check if critical features are affected
  const criticalFeatures = ["governance", "rbac", "policy_enforcement"];
  const criticalDegraded = criticalFeatures.filter(f => {
    const feature = snapshot.features[f];
    return feature && (feature.state === "LIMITED" || feature.state === "BLOCKED");
  });

  if (criticalDegraded.length > 0) {
    fail(
      "critical_features_degraded",
      `Critical features degraded: ${criticalDegraded.join(", ")}`
    );
  } else {
    pass("critical_features_degraded", "All critical features operational");
  }
}

function testFeatureAvailability(snapshot: PlatformSnapshot | null): void {
  log("Testing feature availability...");

  if (!snapshot) {
    fail("feature_availability", "No snapshot available");
    return;
  }

  const features = snapshot.features;
  const states = { ON: 0, LIMITED: 0, BLOCKED: 0, OFF: 0 };

  for (const [_, f] of Object.entries(features)) {
    states[f.state]++;
  }

  pass(
    "feature_availability_matrix",
    `ON: ${states.ON}, LIMITED: ${states.LIMITED}, BLOCKED: ${states.BLOCKED}, OFF: ${states.OFF}`
  );

  // All features should be accounted for
  const totalFeatures = Object.keys(features).length;
  const accounted = states.ON + states.LIMITED + states.BLOCKED + states.OFF;

  if (totalFeatures === accounted) {
    pass("feature_accounting", `All ${totalFeatures} features accounted for`);
  } else {
    fail("feature_accounting", `Feature count mismatch: ${totalFeatures} vs ${accounted}`);
  }
}

async function runSmokeTests(): Promise<SmokeTestReport> {
  log("========================================");
  log("PRODUCTION FREEZE SMOKE TEST");
  log("========================================");
  log("");

  // Run all tests
  const snapshot = await testPlatformStatus();
  log("");

  await testExecutionGate();
  log("");

  await testContradictions();
  log("");

  testFeatureContracts();
  log("");

  testDegradedMode(snapshot);
  log("");

  testFeatureAvailability(snapshot);
  log("");

  // Generate report
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;
  const passed = failedTests === 0;

  const report: SmokeTestReport = {
    timestamp: new Date().toISOString(),
    passed,
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
    summary: passed
      ? "All smoke tests passed. System ready for production freeze."
      : `${failedTests} test(s) failed. Review issues before proceeding.`,
  };

  log("========================================");
  log("SUMMARY");
  log("========================================");
  log(`Total: ${report.totalTests}`);
  log(`Passed: ${report.passedTests}`);
  log(`Failed: ${report.failedTests}`);
  log("");
  log(report.summary);
  log("");

  if (passed) {
    log("✓ System now knows when to stop itself.");
  }

  return report;
}

// Run if executed directly
runSmokeTests()
  .then(report => {
    process.exit(report.passed ? 0 : 1);
  })
  .catch(error => {
    console.error("Smoke test failed:", error);
    process.exit(1);
  });

export { runSmokeTests, SmokeTestReport, SmokeTestResult };
