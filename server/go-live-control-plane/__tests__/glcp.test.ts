/**
 * Go-Live Control Plane - Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock environment
beforeEach(() => {
  process.env.ENABLE_GLCP = "true";
});

afterEach(() => {
  delete process.env.ENABLE_GLCP;
});

describe("Capability Registry", () => {
  beforeEach(async () => {
    const { clearCapabilityStore, discoverCapabilities, registerCapabilities } =
      await import("../capabilities/registry");
    clearCapabilityStore();
    const caps = discoverCapabilities();
    registerCapabilities(caps);
  });

  it("should discover capabilities from known flags", async () => {
    const { getAllCapabilities } = await import("../capabilities/registry");
    const caps = getAllCapabilities();
    expect(caps.length).toBeGreaterThan(0);
  });

  it("should get capability by ID", async () => {
    const { getCapability, getAllCapabilities } = await import("../capabilities/registry");
    const caps = getAllCapabilities();
    if (caps.length > 0) {
      const cap = getCapability(caps[0].id);
      expect(cap).toBeDefined();
      expect(cap!.id).toBe(caps[0].id);
    }
  });

  it("should group capabilities by domain", async () => {
    const { getAllCapabilities, groupByDomain } = await import("../capabilities/registry");
    const caps = getAllCapabilities();
    const grouped = groupByDomain(caps);
    expect(Object.keys(grouped).length).toBeGreaterThan(0);
  });

  it("should create snapshot", async () => {
    const { createSnapshot } = await import("../capabilities/registry");
    const snapshot = createSnapshot();
    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.capabilities).toBeDefined();
  });
});

describe("Dependency Resolver", () => {
  beforeEach(async () => {
    const { clearCapabilityStore, discoverCapabilities, registerCapabilities } =
      await import("../capabilities/registry");
    clearCapabilityStore();
    const caps = discoverCapabilities();
    registerCapabilities(caps);
  });

  it("should validate dependencies", async () => {
    const { validateDependencies } = await import("../capabilities/dependency-resolver");
    const result = validateDependencies();
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("missingDependencies");
    expect(result).toHaveProperty("circularDependencies");
  });

  it("should detect invalid states", async () => {
    const { detectInvalidStates } = await import("../capabilities/dependency-resolver");
    const result = detectInvalidStates();
    expect(result).toHaveProperty("hasInvalidStates");
    expect(result).toHaveProperty("issues");
  });

  it("should get safe to enable capabilities", async () => {
    const { getSafeToEnable } = await import("../capabilities/dependency-resolver");
    const safeToEnable = getSafeToEnable();
    expect(Array.isArray(safeToEnable)).toBe(true);
  });

  it("should calculate blast radius", async () => {
    const { calculateBlastRadius } = await import("../capabilities/dependency-resolver");
    const { getAllCapabilities } = await import("../capabilities/registry");
    const caps = getAllCapabilities();
    if (caps.length > 0) {
      const radius = calculateBlastRadius(caps[0].id);
      expect(radius).toHaveProperty("directImpact");
      expect(radius).toHaveProperty("transitiveImpact");
      expect(radius).toHaveProperty("totalAffected");
      expect(radius).toHaveProperty("riskLevel");
    }
  });
});

describe("Readiness Evaluator", () => {
  it("should evaluate readiness", async () => {
    const { evaluateReadiness, clearEvaluationCache } = await import("../readiness/evaluator");
    clearEvaluationCache();
    const result = await evaluateReadiness({ useCache: false });
    expect(result).toHaveProperty("status");
    expect(["READY", "DEGRADED", "BLOCKED"]).toContain(result.status);
    expect(result).toHaveProperty("probes");
    expect(result).toHaveProperty("summary");
  });

  it("should perform quick health check", async () => {
    const { quickHealthCheck } = await import("../readiness/evaluator");
    const result = await quickHealthCheck();
    expect(result).toHaveProperty("healthy");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("message");
  });

  it("should get go-live readiness", async () => {
    const { getGoLiveReadiness, clearEvaluationCache } = await import("../readiness/evaluator");
    clearEvaluationCache();
    const result = await getGoLiveReadiness();
    expect(result).toHaveProperty("canGoLive");
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("recommendation");
    expect(["PROCEED", "PROCEED_WITH_CAUTION", "DO_NOT_PROCEED"]).toContain(result.recommendation);
  });

  it("should list available probes", async () => {
    const { getAvailableProbes } = await import("../readiness/evaluator");
    const probes = getAvailableProbes();
    expect(Array.isArray(probes)).toBe(true);
    expect(probes.length).toBeGreaterThan(0);
    expect(probes[0]).toHaveProperty("name");
    expect(probes[0]).toHaveProperty("category");
  });
});

describe("Simulator", () => {
  beforeEach(async () => {
    const { clearCapabilityStore, discoverCapabilities, registerCapabilities } =
      await import("../capabilities/registry");
    const { clearSimulationCache } = await import("../simulator/simulator");
    clearCapabilityStore();
    clearSimulationCache();
    const caps = discoverCapabilities();
    registerCapabilities(caps);
  });

  it("should simulate capability changes", async () => {
    const { simulate } = await import("../simulator/simulator");
    const { getAllCapabilities } = await import("../capabilities/registry");
    const caps = getAllCapabilities();
    if (caps.length > 0) {
      const result = simulate({ capabilityId: caps[0].id, action: "toggle" });
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("feasible");
      expect(result).toHaveProperty("riskLevel");
      expect(result).toHaveProperty("capabilityImpacts");
      expect(result).toHaveProperty("conflicts");
    }
  });

  it("should simulate batch changes", async () => {
    const { simulateBatch } = await import("../simulator/simulator");
    const { getAllCapabilities } = await import("../capabilities/registry");
    const caps = getAllCapabilities();
    if (caps.length >= 2) {
      const result = simulateBatch([
        { capabilityId: caps[0].id, action: "enable" },
        { capabilityId: caps[1].id, action: "enable" },
      ]);
      expect(result).toHaveProperty("feasible");
      expect(result).toHaveProperty("enableOrder");
      expect(result).toHaveProperty("disableOrder");
    }
  });

  it("should compare states", async () => {
    const { compareStates } = await import("../simulator/simulator");
    const { getAllCapabilities } = await import("../capabilities/registry");
    const caps = getAllCapabilities();
    if (caps.length > 0) {
      const comparison = compareStates([{ capabilityId: caps[0].id, action: "toggle" }]);
      expect(comparison).toHaveProperty("before");
      expect(comparison).toHaveProperty("after");
      expect(comparison).toHaveProperty("delta");
    }
  });

  it("should generate recommendations", async () => {
    const { simulateBatch } = await import("../simulator/simulator");
    const { getAllCapabilities } = await import("../capabilities/registry");
    const caps = getAllCapabilities();
    if (caps.length > 0) {
      const result = simulateBatch([{ capabilityId: caps[0].id, action: "toggle" }]);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(Array.isArray(result.rollbackSteps)).toBe(true);
    }
  });
});

describe("Conflict Detector", () => {
  beforeEach(async () => {
    const { clearCapabilityStore, discoverCapabilities, registerCapabilities } =
      await import("../capabilities/registry");
    clearCapabilityStore();
    const caps = discoverCapabilities();
    registerCapabilities(caps);
  });

  it("should detect conflicts", async () => {
    const { detectConflicts } = await import("../simulator/conflict-detector");
    const { getAllCapabilities } = await import("../capabilities/registry");
    const caps = getAllCapabilities();

    // Build a projected state where everything is enabled
    const projectedState = new Map<string, boolean>();
    for (const cap of caps) {
      projectedState.set(cap.id, true);
    }

    const conflicts = detectConflicts(
      [{ capabilityId: caps[0]?.id || "test", action: "enable" }],
      projectedState
    );

    expect(Array.isArray(conflicts)).toBe(true);
  });

  it("should check for blocking conflicts", async () => {
    const { hasBlockingConflicts } = await import("../simulator/conflict-detector");

    const noBlockers = hasBlockingConflicts([
      {
        type: "dependency_missing",
        severity: "warning",
        affectedCapabilities: [],
        message: "test",
      },
    ]);
    expect(noBlockers).toBe(false);

    const hasBlockers = hasBlockingConflicts([
      { type: "dependency_missing", severity: "error", affectedCapabilities: [], message: "test" },
    ]);
    expect(hasBlockers).toBe(true);
  });
});

describe("Executor", () => {
  beforeEach(async () => {
    const { clearCapabilityStore, discoverCapabilities, registerCapabilities } =
      await import("../capabilities/registry");
    const { clearExecutorState } = await import("../executor/executor");
    const { clearSimulationCache } = await import("../simulator/simulator");
    clearCapabilityStore();
    clearExecutorState();
    clearSimulationCache();
    const caps = discoverCapabilities();
    registerCapabilities(caps);
  });

  it("should create execution plan", async () => {
    const { createPlan } = await import("../executor/executor");
    const { simulateBatch } = await import("../simulator/simulator");
    const { getAllCapabilities } = await import("../capabilities/registry");
    const caps = getAllCapabilities();
    if (caps.length > 0) {
      const simulation = simulateBatch([{ capabilityId: caps[0].id, action: "toggle" }]);
      const plan = createPlan(simulation, "Test Plan", "test-user");
      expect(plan).toHaveProperty("id");
      expect(plan).toHaveProperty("name");
      expect(plan.name).toBe("Test Plan");
      expect(plan).toHaveProperty("steps");
      expect(plan).toHaveProperty("requiresApproval");
    }
  });

  it("should approve plan", async () => {
    const { createPlan, approvePlan } = await import("../executor/executor");
    const { simulateBatch } = await import("../simulator/simulator");
    const { getAllCapabilities } = await import("../capabilities/registry");
    const caps = getAllCapabilities();
    if (caps.length > 0) {
      const simulation = simulateBatch([{ capabilityId: caps[0].id, action: "toggle" }]);
      const plan = createPlan(simulation, "Test Plan", "test-user");
      const approved = approvePlan(plan.id, "approver");
      expect(approved).toBeDefined();
      expect(approved!.approvedBy).toBe("approver");
    }
  });

  it("should execute plan with dry run", async () => {
    const { createPlan, approvePlan, execute } = await import("../executor/executor");
    const { simulateBatch } = await import("../simulator/simulator");
    const { getAllCapabilities } = await import("../capabilities/registry");
    const caps = getAllCapabilities();
    if (caps.length > 0) {
      const simulation = simulateBatch([{ capabilityId: caps[0].id, action: "toggle" }]);
      const plan = createPlan(simulation, "Test Plan", "test-user");
      approvePlan(plan.id, "approver");

      const result = await execute(plan.id, { dryRun: true });
      expect(result).toHaveProperty("executionId");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("success");
    }
  });

  it("should list executions", async () => {
    const { listExecutions } = await import("../executor/executor");
    const executions = listExecutions();
    expect(Array.isArray(executions)).toBe(true);
  });
});

describe("Audit", () => {
  beforeEach(async () => {
    const { clearAuditLog } = await import("../executor/audit");
    clearAuditLog();
  });

  it("should log audit events", async () => {
    const { logAuditEvent, getAuditLog } = await import("../executor/audit");

    logAuditEvent("execution_started", "Test execution", "test-user", true);

    const log = getAuditLog();
    expect(log.length).toBe(1);
    expect(log[0].action).toBe("execution_started");
    expect(log[0].actor).toBe("test-user");
  });

  it("should filter audit log", async () => {
    const { logAuditEvent, getAuditLog } = await import("../executor/audit");

    logAuditEvent("execution_started", "Test 1", "user-1", true);
    logAuditEvent("execution_completed", "Test 2", "user-2", true);
    logAuditEvent("execution_failed", "Test 3", "user-1", false);

    const user1Log = getAuditLog({ actor: "user-1" });
    expect(user1Log.length).toBe(2);

    const successLog = getAuditLog({ successOnly: true });
    expect(successLog.length).toBe(2);
  });

  it("should get activity summary", async () => {
    const { logAuditEvent, getActivitySummary } = await import("../executor/audit");

    logAuditEvent("execution_started", "Test", "user", true);
    logAuditEvent("execution_completed", "Test", "user", true);
    logAuditEvent("execution_failed", "Test", "user", false);

    const summary = getActivitySummary(24);
    expect(summary.totalEvents).toBe(3);
    expect(summary.successfulEvents).toBe(2);
    expect(summary.failedEvents).toBe(1);
  });
});

describe("Rollback", () => {
  beforeEach(async () => {
    const { clearCapabilityStore, discoverCapabilities, registerCapabilities } =
      await import("../capabilities/registry");
    clearCapabilityStore();
    const caps = discoverCapabilities();
    registerCapabilities(caps);
  });

  it("should create checkpoint", async () => {
    const { createCheckpoint, getCheckpoint } = await import("../executor/rollback");

    const checkpoint = createCheckpoint("exec-123", 5);
    expect(checkpoint.executionId).toBe("exec-123");
    expect(checkpoint.stepIndex).toBe(5);

    const retrieved = getCheckpoint("exec-123");
    expect(retrieved).toBeDefined();
    expect(retrieved!.executionId).toBe("exec-123");
  });

  it("should check if can rollback", async () => {
    const { canRollback } = await import("../executor/rollback");

    const result = canRollback({
      planId: "plan-1",
      executionId: "exec-1",
      status: "completed",
      stepsCompleted: 2,
      stepsFailed: 0,
      stepsSkipped: 0,
      startedAt: new Date(),
      durationMs: 100,
      steps: [
        {
          id: "s1",
          order: 0,
          capabilityId: "c1",
          capabilityName: "Cap 1",
          action: "enable",
          status: "success",
          rollbackable: true,
        },
        {
          id: "s2",
          order: 1,
          capabilityId: "c2",
          capabilityName: "Cap 2",
          action: "enable",
          status: "success",
          rollbackable: true,
        },
      ],
      success: true,
      errors: [],
      warnings: [],
      rolledBack: false,
      auditLog: [],
    });

    expect(result.canRollback).toBe(true);
    expect(result.rollbackableSteps).toBe(2);
  });

  it("should generate rollback instructions", async () => {
    const { getRollbackInstructions } = await import("../executor/rollback");
    const { getAllCapabilities } = await import("../capabilities/registry");

    // Use a real capability ID from the registry
    const caps = getAllCapabilities();
    const firstCap = caps[0];

    const instructions = getRollbackInstructions([
      {
        id: "s1",
        order: 0,
        capabilityId: firstCap.id,
        capabilityName: firstCap.name,
        action: "enable",
        status: "success",
        rollbackable: true,
      },
    ]);

    expect(instructions.length).toBeGreaterThan(0);
  });
});

describe("Probes", () => {
  it("should have all probe categories", async () => {
    const {
      databaseProbes,
      serviceProbes,
      aiProviderProbes,
      rateLimitProbes,
      killSwitchProbes,
      autonomyProbes,
      configurationProbes,
    } = await import("../readiness/probes");

    expect(databaseProbes.length).toBeGreaterThan(0);
    expect(serviceProbes.length).toBeGreaterThan(0);
    expect(aiProviderProbes.length).toBeGreaterThan(0);
    expect(rateLimitProbes.length).toBeGreaterThan(0);
    expect(killSwitchProbes.length).toBeGreaterThan(0);
    expect(autonomyProbes.length).toBeGreaterThan(0);
    expect(configurationProbes.length).toBeGreaterThan(0);
  });

  it("should run all probes", async () => {
    const { runAllProbes } = await import("../readiness/probes");
    const results = await runAllProbes();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty("name");
    expect(results[0]).toHaveProperty("status");
    expect(results[0]).toHaveProperty("category");
  });

  it("should run probes by category", async () => {
    const { runProbesByCategory } = await import("../readiness/probes");
    const results = await runProbesByCategory("database");
    expect(Array.isArray(results)).toBe(true);
    expect(results.every(r => r.category === "database")).toBe(true);
  });
});
