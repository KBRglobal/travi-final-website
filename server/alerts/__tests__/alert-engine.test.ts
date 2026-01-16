import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Alert Engine", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_ALERTING_SYSTEM = "false";
  });

  afterEach(() => {
    delete process.env.ENABLE_ALERTING_SYSTEM;
  });

  describe("isAlertingEnabled", () => {
    it("returns false when ENABLE_ALERTING_SYSTEM is not set", async () => {
      const { isAlertingEnabled } = await import("../alert-engine");
      expect(isAlertingEnabled()).toBe(false);
    });

    it("returns false when ENABLE_ALERTING_SYSTEM is not 'true'", async () => {
      process.env.ENABLE_ALERTING_SYSTEM = "false";
      const { isAlertingEnabled } = await import("../alert-engine");
      expect(isAlertingEnabled()).toBe(false);
    });

    it("returns true when ENABLE_ALERTING_SYSTEM is 'true'", async () => {
      vi.resetModules();
      process.env.ENABLE_ALERTING_SYSTEM = "true";
      const { isAlertingEnabled } = await import("../alert-engine");
      expect(isAlertingEnabled()).toBe(true);
    });
  });

  describe("getEngineStatus", () => {
    it("reports engine status correctly when disabled", async () => {
      const { getEngineStatus } = await import("../alert-engine");
      const status = getEngineStatus();
      expect(status.enabled).toBe(false);
      expect(status.running).toBe(false);
      expect(status.ruleCount).toBeGreaterThan(0);
    });
  });
});

describe("Alert Rules", () => {
  it("defines all required alert types", async () => {
    const { alertRules } = await import("../alert-rules");

    const types = alertRules.map((r) => r.type);
    expect(types).toContain("JOB_STALLED");
    expect(types).toContain("EVENT_BUS_INACTIVE");
    expect(types).toContain("RSS_PIPELINE_FAILED");
    expect(types).toContain("SEARCH_INDEX_STALE");
    expect(types).toContain("INTELLIGENCE_COVERAGE_DROP");
    expect(types).toContain("AI_PROVIDER_FAILURE");
  });

  it("each rule has severity defined", async () => {
    const { alertRules } = await import("../alert-rules");

    for (const rule of alertRules) {
      expect(["low", "medium", "high", "critical"]).toContain(rule.severity);
    }
  });

  it("each rule has a detect function", async () => {
    const { alertRules } = await import("../alert-rules");

    for (const rule of alertRules) {
      expect(typeof rule.detect).toBe("function");
    }
  });
});
