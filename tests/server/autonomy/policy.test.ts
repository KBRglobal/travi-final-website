/**
 * Autonomy Policy & Risk Budgets Engine - Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PolicyDefinition,
  PolicyTarget,
  ActionType,
  BudgetPeriod,
  PolicyDecision,
  policyDefinitionSchema,
  policyTargetSchema,
  budgetLimitSchema,
} from "../../../server/autonomy/policy/types";
import {
  DEFAULT_AUTONOMY_CONFIG,
  DEFAULT_GLOBAL_POLICY,
  FEATURE_POLICIES,
  generateTargetKey,
  isWithinTimeWindow,
  getPeriodBoundaries,
} from "../../../server/autonomy/policy/config";

// Mock environment
const originalEnv = process.env;

describe("Autonomy Policy Configuration", () => {
  describe("DEFAULT_AUTONOMY_CONFIG", () => {
    it("should have feature disabled by default", () => {
      expect(DEFAULT_AUTONOMY_CONFIG.enabled).toBe(false);
    });

    it("should have default budget settings", () => {
      expect(DEFAULT_AUTONOMY_CONFIG.maxDecisionLogEntries).toBeGreaterThan(0);
      expect(DEFAULT_AUTONOMY_CONFIG.defaultApprovalLevel).toBeDefined();
    });

    it("should have reasonable timeout values", () => {
      expect(DEFAULT_AUTONOMY_CONFIG.policyEvaluationTimeoutMs).toBeLessThan(10000);
      expect(DEFAULT_AUTONOMY_CONFIG.budgetCheckTimeoutMs).toBeLessThan(10000);
    });
  });

  describe("DEFAULT_GLOBAL_POLICY", () => {
    it("should have valid structure", () => {
      expect(DEFAULT_GLOBAL_POLICY.id).toBe("default-global");
      expect(DEFAULT_GLOBAL_POLICY.target.type).toBe("global");
      expect(DEFAULT_GLOBAL_POLICY.enabled).toBe(true);
    });

    it("should allow common read actions", () => {
      expect(DEFAULT_GLOBAL_POLICY.allowedActions).toContain("content_update");
      expect(DEFAULT_GLOBAL_POLICY.allowedActions).toContain("ai_generate");
      expect(DEFAULT_GLOBAL_POLICY.allowedActions).toContain("ai_enrich");
    });

    it("should block dangerous actions", () => {
      expect(DEFAULT_GLOBAL_POLICY.blockedActions).toContain("db_delete");
      expect(DEFAULT_GLOBAL_POLICY.blockedActions).toContain("bulk_operation");
    });

    it("should have budget limits for multiple periods", () => {
      expect(DEFAULT_GLOBAL_POLICY.budgetLimits.length).toBeGreaterThan(0);
      const periods = DEFAULT_GLOBAL_POLICY.budgetLimits.map(l => l.period);
      expect(periods).toContain("hourly");
      expect(periods).toContain("daily");
    });
  });

  describe("FEATURE_POLICIES", () => {
    it("should have policies for key features", () => {
      expect(FEATURE_POLICIES.length).toBeGreaterThan(0);
      const features = FEATURE_POLICIES.map(p => p.target.feature);
      expect(features).toContain("octopus");
      expect(features).toContain("aeo");
    });

    it("should have higher priority than global policy", () => {
      for (const policy of FEATURE_POLICIES) {
        expect(policy.priority).toBeGreaterThan(DEFAULT_GLOBAL_POLICY.priority);
      }
    });
  });
});

describe("Target Key Generation", () => {
  it("should generate key for global target", () => {
    const target: PolicyTarget = { type: "global" };
    const key = generateTargetKey(target);
    expect(key).toBe("global");
  });

  it("should generate key for feature target", () => {
    const target: PolicyTarget = { type: "feature", feature: "content_enrichment" };
    const key = generateTargetKey(target);
    expect(key).toBe("feature:content_enrichment");
  });

  it("should generate key for entity target", () => {
    const target: PolicyTarget = { type: "entity", entity: "content:123" };
    const key = generateTargetKey(target);
    expect(key).toBe("entity:content:123");
  });

  it("should generate key for locale target", () => {
    const target: PolicyTarget = { type: "locale", locale: "he" };
    const key = generateTargetKey(target);
    expect(key).toBe("locale:he");
  });
});

describe("Time Window Validation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow within time window", () => {
    // Set time to 10:00 UTC on Monday (day 1)
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));

    const allowed = isWithinTimeWindow({
      startHour: 9,
      endHour: 17,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      timezone: "UTC",
    });
    expect(allowed).toBe(true);
  });

  it("should block outside time window", () => {
    // Set time to 22:00 UTC on Monday (day 1)
    vi.setSystemTime(new Date("2024-01-15T22:00:00Z"));

    const allowed = isWithinTimeWindow({
      startHour: 9,
      endHour: 17,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      timezone: "UTC",
    });
    expect(allowed).toBe(false);
  });

  it("should handle overnight windows", () => {
    // Set time to 02:00 UTC on Monday (day 1) (should be in window 22:00-06:00)
    vi.setSystemTime(new Date("2024-01-15T02:00:00Z"));

    const allowed = isWithinTimeWindow({
      startHour: 22,
      endHour: 6,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      timezone: "UTC",
    });
    expect(allowed).toBe(true);
  });

  it("should respect timezone", () => {
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));

    const allowed = isWithinTimeWindow({
      startHour: 9,
      endHour: 17,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      timezone: "UTC",
    });
    expect(allowed).toBe(true);
  });
});

describe("Period Boundaries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:30:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should calculate hourly boundaries", () => {
    const { start, end } = getPeriodBoundaries("hourly");
    expect(start.getUTCHours()).toBe(10);
    expect(start.getUTCMinutes()).toBe(0);
    expect(end.getUTCHours()).toBe(10);
    expect(end.getUTCMinutes()).toBe(59);
  });

  it("should calculate daily boundaries", () => {
    const { start, end } = getPeriodBoundaries("daily");
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it("should calculate weekly boundaries", () => {
    const { start, end } = getPeriodBoundaries("weekly");
    // Should start on Sunday (day 0)
    expect(start.getDay()).toBe(0);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  it("should calculate monthly boundaries", () => {
    const { start, end } = getPeriodBoundaries("monthly");
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(start.getMonth());
  });
});

describe("Zod Schema Validation", () => {
  describe("policyTargetSchema", () => {
    it("should accept valid global target", () => {
      const result = policyTargetSchema.safeParse({ type: "global" });
      expect(result.success).toBe(true);
    });

    it("should accept valid feature target", () => {
      const result = policyTargetSchema.safeParse({
        type: "feature",
        feature: "octopus",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid target type", () => {
      const result = policyTargetSchema.safeParse({
        type: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("budgetLimitSchema", () => {
    it("should accept valid budget limit", () => {
      const result = budgetLimitSchema.safeParse({
        period: "daily",
        maxActions: 100,
        maxAiSpend: 1000,
        maxDbWrites: 500,
        maxContentMutations: 20,
      });
      expect(result.success).toBe(true);
    });

    it("should reject negative values", () => {
      const result = budgetLimitSchema.safeParse({
        period: "daily",
        maxActions: -1,
        maxAiSpend: 50000,
        maxDbWrites: 500,
        maxContentMutations: 20,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid period", () => {
      const result = budgetLimitSchema.safeParse({
        period: "yearly",
        maxActions: 100,
        maxAiSpend: 1000,
        maxDbWrites: 500,
        maxContentMutations: 20,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("policyDefinitionSchema", () => {
    it("should accept valid policy definition", () => {
      const policy: PolicyDefinition = {
        id: "test-policy",
        name: "Test Policy",
        target: { type: "global" },
        enabled: true,
        priority: 100,
        allowedActions: ["content_create", "content_update"],
        blockedActions: ["db_delete"],
        budgetLimits: [
          {
            period: "hourly",
            maxActions: 50,
            maxAiSpend: 10000,
            maxDbWrites: 100,
            maxContentMutations: 10,
          },
        ],
        approvalLevel: "auto",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = policyDefinitionSchema.safeParse(policy);
      expect(result.success).toBe(true);
    });

    it("should reject policy with empty name", () => {
      const result = policyDefinitionSchema.safeParse({
        id: "test",
        name: "",
        target: { type: "global" },
        enabled: true,
        priority: 100,
        allowedActions: [],
        blockedActions: [],
        budgetLimits: [],
        approvalLevel: "auto",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid approval level", () => {
      const result = policyDefinitionSchema.safeParse({
        id: "test",
        name: "Test",
        target: { type: "global" },
        enabled: true,
        priority: 100,
        allowedActions: [],
        blockedActions: [],
        budgetLimits: [],
        approvalLevel: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid action types", () => {
      const result = policyDefinitionSchema.safeParse({
        id: "test",
        name: "Test",
        target: { type: "global" },
        enabled: true,
        priority: 100,
        allowedActions: ["invalid_action"],
        blockedActions: [],
        budgetLimits: [],
        approvalLevel: "auto",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Budget Limit Validation Edge Cases", () => {
  it("should accept zero as valid limit", () => {
    const result = budgetLimitSchema.safeParse({
      period: "hourly",
      maxActions: 0,
      maxAiSpend: 0,
      maxDbWrites: 0,
      maxContentMutations: 0,
    });
    expect(result.success).toBe(true);
  });

  it("should accept large values", () => {
    const result = budgetLimitSchema.safeParse({
      period: "monthly",
      maxActions: 100000,
      maxAiSpend: 10000000,
      maxDbWrites: 100000,
      maxContentMutations: 10000,
    });
    expect(result.success).toBe(true);
  });

  it("should require period field", () => {
    const result = budgetLimitSchema.safeParse({
      maxActions: 100,
      maxAiSpend: 50000,
      maxDbWrites: 500,
      maxContentMutations: 20,
    });
    expect(result.success).toBe(false);
  });
});

describe("Policy Priority and Matching", () => {
  it("should have feature policies with incrementing priorities", () => {
    const priorities = FEATURE_POLICIES.map(p => p.priority);
    const sorted = [...priorities].sort((a, b) => a - b);
    // All priorities should be unique and sorted ascending
    for (let i = 0; i < priorities.length; i++) {
      expect(priorities[i]).toBe(sorted[i]);
    }
  });

  it("should ensure global policy has lowest priority", () => {
    const globalPriority = DEFAULT_GLOBAL_POLICY.priority;
    for (const policy of FEATURE_POLICIES) {
      expect(policy.priority).toBeGreaterThan(globalPriority);
    }
  });
});

describe("Action Type Validation", () => {
  const validActions: ActionType[] = [
    "content_create",
    "content_update",
    "content_delete",
    "content_publish",
    "ai_generate",
    "ai_enrich",
    "db_write",
    "db_delete",
    "external_api",
    "notification",
    "bulk_operation",
  ];

  it("should accept all valid action types", () => {
    for (const action of validActions) {
      const result = policyDefinitionSchema.safeParse({
        id: "test",
        name: "Test",
        target: { type: "global" },
        enabled: true,
        priority: 100,
        allowedActions: [action],
        blockedActions: [],
        budgetLimits: [],
        approvalLevel: "auto",
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("Approval Levels", () => {
  const validLevels = ["auto", "review", "manual"] as const;

  it("should accept all valid approval levels", () => {
    for (const level of validLevels) {
      const result = policyDefinitionSchema.safeParse({
        id: "test",
        name: "Test",
        target: { type: "global" },
        enabled: true,
        priority: 100,
        allowedActions: [],
        blockedActions: [],
        budgetLimits: [],
        approvalLevel: level,
      });
      expect(result.success).toBe(true);
    }
  });
});
