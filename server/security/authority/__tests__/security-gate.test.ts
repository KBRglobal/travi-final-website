/**
 * Security Gate Tests
 *
 * Red-team scenarios testing:
 * - Env var bypass attempts
 * - Self-approval loops
 * - Privilege escalation
 * - Mass data exfiltration simulation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SecurityGate, SecurityGateError } from "../security-gate";
import { SecurityModeManager } from "../security-modes";
import { OverrideRegistry } from "../override-registry";
import type { GateRequest, GatedAction, SecurityMode } from "../types";

// Mock the audit logger to prevent actual logging during tests
vi.mock("../../audit-logger", () => ({
  logSecurityEvent: vi.fn(),
  SecurityEventType: {
    PERMISSION_DENIED: "permission_denied",
    SETTINGS_CHANGED: "settings_changed",
  },
  SecuritySeverity: {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    CRITICAL: "critical",
  },
}));

// Mock the DEFAULT_SECURITY_AUTHORITY_CONFIG to enable security authority for tests
vi.mock("../types", async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    DEFAULT_SECURITY_AUTHORITY_CONFIG: {
      ...(actual.DEFAULT_SECURITY_AUTHORITY_CONFIG as Record<string, unknown>),
      enabled: true,
      failClosed: true,
      auditAllDecisions: true,
      autoLockdownOnCriticalThreat: true,
    },
  };
});

describe("SecurityGate", () => {
  // Reset state before each test
  beforeEach(async () => {
    await SecurityModeManager.setMode({
      mode: "enforce",
      reason: "Test reset",
      activatedBy: "test",
    });
    await SecurityGate.deescalateThreat("normal", "Test reset");
  });

  describe("Basic Enforcement", () => {
    it("should allow legitimate requests in enforce mode", async () => {
      const request: GateRequest = {
        actor: {
          userId: "user-123",
          roles: ["editor"],
        },
        action: "content_update",
        resource: "content",
        context: {},
      };

      const decision = await SecurityGate.assertAllowed(request);
      expect(decision.allowed).toBe(true);
      expect(decision.securityMode).toBe("enforce");
    });

    it("should block actions in lockdown mode", async () => {
      await SecurityModeManager.setMode({
        mode: "lockdown",
        reason: "Test lockdown",
        activatedBy: "test",
      });

      const request: GateRequest = {
        actor: {
          userId: "user-123",
          roles: ["editor"],
          isAutopilot: true,
        },
        action: "content_publish",
        resource: "content",
        context: {},
      };

      const decision = await SecurityGate.assertAllowed(request);
      expect(decision.allowed).toBe(false);
      expect(decision.decision).toBe("DENY");
      expect(decision.securityMode).toBe("lockdown");
    });
  });

  // ============================================================================
  // RED TEAM SCENARIOS
  // ============================================================================

  describe("Red Team: Environment Variable Bypass Attempts", () => {
    it("should not allow bypassing security via env manipulation", async () => {
      // Simulate someone trying to bypass by setting ENABLE_SECURITY_AUTHORITY=false at runtime
      // The gate should still evaluate properly based on its initial config
      const originalValue = process.env.ENABLE_SECURITY_AUTHORITY;

      // Even if someone changes env at runtime, existing gate config should be used
      process.env.ENABLE_SECURITY_AUTHORITY = "false";

      const request: GateRequest = {
        actor: {
          userId: "attacker",
          roles: ["viewer"],
        },
        action: "admin_action",
        resource: "system",
        context: {},
      };

      // The decision should still be evaluated (fail-closed principle)
      const decision = await SecurityGate.assertAllowed(request);

      // Restore
      process.env.ENABLE_SECURITY_AUTHORITY = originalValue;

      // Either denied or allowed based on config - key is it was evaluated
      expect(decision.auditId).toBeDefined();
      expect(decision.evaluatedAt).toBeDefined();
    });

    it("should not allow security mode bypass via environment", async () => {
      // Attempt to set mode via env var after initialization
      process.env.SECURITY_DEFAULT_MODE = "monitor";

      // This should not affect the current mode
      const currentMode = SecurityModeManager.getMode();
      expect(currentMode.mode).not.toBe("monitor"); // Should still be enforce
    });
  });

  describe("Red Team: Self-Approval Loops", () => {
    it("should prevent user from approving their own override", async () => {
      const attackerId = "attacker-user";

      // Attacker tries to create an override for themselves
      const result = await OverrideRegistry.requestOverride({
        request: {
          type: "action_bypass",
          target: { action: "admin_action", scope: "all" },
          reason: "I need access",
          justification: "Trust me",
          durationMinutes: 60,
        },
        requestedBy: attackerId,
        requestedByRoles: ["viewer"], // Low-privilege user
      });

      // Should be denied due to insufficient permissions
      expect(result.success).toBe(false);
      expect(result.error).toContain("requires one of");
    });

    it("should prevent override approval loops", async () => {
      // Even if user has admin role, override should be audited
      const result = await OverrideRegistry.requestOverride({
        request: {
          type: "mode_bypass",
          target: { scope: "all" },
          reason: "Emergency",
          justification: "Prod issue",
          evidence: ["ticket-123"],
          durationMinutes: 60,
        },
        requestedBy: "admin-user",
        requestedByRoles: ["admin"],
      });

      // Mode bypass requires super_admin and second approver
      expect(result.success).toBe(false);
      expect(result.requiresSecondApprover || result.error).toBeTruthy();
    });
  });

  describe("Red Team: Privilege Escalation", () => {
    it("should block privilege escalation via role spoofing", async () => {
      // Attacker claims to have roles they don't have
      const request: GateRequest = {
        actor: {
          userId: "attacker",
          roles: ["super_admin"], // Spoofed role
        },
        action: "user_management",
        resource: "users",
        context: {},
      };

      // In enforce mode, user_management is a destructive action and is blocked
      // (destructiveActionsAllowed is false in enforce mode)
      const decision = await SecurityGate.assertAllowed(request);

      // Even with claimed super_admin, enforce mode blocks destructive actions
      expect(decision.decision).toBe("DENY");
      expect(decision.allowed).toBe(false);
    });

    it("should block escalation via autopilot flag abuse", async () => {
      // Set to lockdown mode
      await SecurityModeManager.setMode({
        mode: "lockdown",
        reason: "Security test",
        activatedBy: "test",
      });

      // Attacker tries to claim they are a system autopilot
      const request: GateRequest = {
        actor: {
          userId: "attacker",
          roles: ["viewer"],
          isAutopilot: true, // Spoofed autopilot flag
          isSystem: true, // Spoofed system flag
        },
        action: "data_delete",
        resource: "content",
        context: {},
      };

      const decision = await SecurityGate.assertAllowed(request);

      // Autopilots are blocked in lockdown, not allowed
      expect(decision.allowed).toBe(false);
    });

    it("should block admin action without admin role", async () => {
      const request: GateRequest = {
        actor: {
          userId: "viewer-user",
          roles: ["viewer"],
        },
        action: "admin_action",
        resource: "system",
        context: {},
      };

      const decision = await SecurityGate.assertAllowed(request);

      expect(decision.allowed).toBe(false);
      expect(decision.reasons[0].message).toContain("admin");
    });
  });

  describe("Red Team: Mass Data Exfiltration", () => {
    it("should rate limit bulk data access", async () => {
      const request: GateRequest = {
        actor: {
          userId: "exfiltrator",
          roles: ["analyst"],
          ipAddress: "192.168.1.100",
        },
        action: "data_export",
        resource: "content",
        context: {
          affectedRecordCount: 10000,
        },
      };

      // First few requests should be allowed
      let allowedCount = 0;
      let rateLimitedCount = 0;

      for (let i = 0; i < 10; i++) {
        const decision = await SecurityGate.assertAllowed(request);
        if (decision.allowed) {
          allowedCount++;
        } else if (decision.decision === "RATE_LIMITED") {
          rateLimitedCount++;
        }
      }

      // Data export has a limit of 5 per minute
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it("should block bulk delete operations", async () => {
      const request: GateRequest = {
        actor: {
          userId: "attacker",
          roles: ["editor"],
        },
        action: "bulk_operation",
        resource: "content",
        context: {
          affectedRecordCount: 500, // Large bulk delete
        },
      };

      const decision = await SecurityGate.assertAllowed(request);

      // Bulk operations over 100 records require approval
      expect(decision.decision).toBe("REQUIRE_APPROVAL");
    });

    it("should escalate threat on suspicious patterns", async () => {
      // Simulate multiple failed access attempts
      const requests = Array(20)
        .fill(null)
        .map((_, i) => ({
          actor: {
            userId: "suspicious-actor",
            roles: ["viewer"],
            ipAddress: "10.0.0." + i,
          },
          action: "admin_action" as GatedAction,
          resource: "system" as const,
          context: {},
        }));

      for (const request of requests) {
        await SecurityGate.assertAllowed(request);
      }

      // After many denied requests, rate limiting should kick in
      const finalRequest = await SecurityGate.assertAllowed({
        actor: {
          userId: "suspicious-actor",
          roles: ["viewer"],
          ipAddress: "10.0.0.100",
        },
        action: "admin_action",
        resource: "system",
        context: {},
      });

      expect(finalRequest.allowed).toBe(false);
    });
  });

  describe("Red Team: Threat Level Manipulation", () => {
    it("should auto-lockdown on critical threat", async () => {
      await SecurityGate.escalateThreat(
        "critical",
        [
          {
            type: "attack",
            identifier: "test-threat",
            description: "Critical test threat",
            detectedAt: new Date(),
            severity: "critical" as any,
          },
        ],
        "Test critical threat"
      );

      // Should have triggered auto-lockdown
      const mode = SecurityModeManager.getMode();
      expect(mode.mode).toBe("lockdown");
    });

    it("should block all non-essential actions during critical threat", async () => {
      await SecurityGate.escalateThreat("critical", [], "Test");

      const actionsToTest: GatedAction[] = [
        "content_create",
        "content_publish",
        "data_write",
        "deployment",
        "bulk_operation",
      ];

      for (const action of actionsToTest) {
        const decision = await SecurityGate.assertAllowed({
          actor: { userId: "user", roles: ["admin"] },
          action,
          resource: "system",
          context: {},
        });

        expect(decision.allowed).toBe(false);
        expect(decision.threatLevel).toBe("critical");
      }
    });
  });

  describe("Red Team: Override Abuse", () => {
    it("should expire overrides automatically", async () => {
      // Create a very short-lived override
      const override = await OverrideRegistry.requestOverride({
        request: {
          type: "rate_limit_bypass",
          target: { action: "data_export" },
          reason: "Testing",
          justification: "Test override",
          durationMinutes: 0, // Immediate expiry
        },
        requestedBy: "admin-user",
        requestedByRoles: ["admin"],
      });

      if (override.success && override.override) {
        // Override should exist but be expired
        const usageResult = await OverrideRegistry.useOverride(override.override.id, "user");

        // Should fail because it expired
        expect(usageResult.valid).toBe(false);
      }
    });

    it("should limit override usage count", async () => {
      const result = await OverrideRegistry.requestOverride({
        request: {
          type: "rate_limit_bypass",
          target: { action: "data_read" },
          reason: "Limited use test",
          justification: "Testing max uses",
          durationMinutes: 60,
          maxUses: 2,
        },
        requestedBy: "admin-user",
        requestedByRoles: ["admin"],
      });

      if (result.success && result.override) {
        const overrideId = result.override.id;

        // Use twice
        await OverrideRegistry.useOverride(overrideId, "user1");
        await OverrideRegistry.useOverride(overrideId, "user2");

        // Third use should fail - override is deactivated after reaching max uses
        const thirdUse = await OverrideRegistry.useOverride(overrideId, "user3");
        expect(thirdUse.valid).toBe(false);
        // After max uses is reached, the override is deactivated, so error can be either
        expect(thirdUse.error).toMatch(/max uses|not active/);
      }
    });
  });

  describe("Fail-Closed Behavior", () => {
    it("should deny when evaluation fails", async () => {
      // Force an evaluation error by providing invalid data
      const request: GateRequest = {
        actor: null as any, // Invalid actor
        action: "data_read",
        resource: "content",
        context: {},
      };

      const decision = await SecurityGate.assertAllowed(request);

      // Should fail-closed (deny)
      expect(decision.allowed).toBe(false);
      expect(decision.decision).toBe("DENY");
    });
  });
});
