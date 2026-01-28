/**
 * Publish Gates - Gate Evaluator Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GateEvaluation, GateReport } from "./types";

// Mock the rules - using vi.hoisted to make mocks available for vi.mock factories
const { mockEntityCoverageRule, mockSearchIndexRule, mockAeoExistsRule, mockBlocksValidRule } =
  vi.hoisted(() => ({
    mockEntityCoverageRule: {
      name: "entity-coverage",
      description: "Content must have at least one entity attached",
      evaluate: vi.fn(),
    },
    mockSearchIndexRule: {
      name: "search-index",
      description: "Content should be indexed for search",
      evaluate: vi.fn(),
    },
    mockAeoExistsRule: {
      name: "aeo-exists",
      description: "Content must have an AEO answer capsule",
      evaluate: vi.fn(),
    },
    mockBlocksValidRule: {
      name: "blocks-valid",
      description: "Content must have valid, non-empty blocks with sufficient content",
      evaluate: vi.fn(),
    },
  }));

vi.mock("./rules/entity-coverage.rule", () => ({
  entityCoverageRule: mockEntityCoverageRule,
}));

vi.mock("./rules/search-index.rule", () => ({
  searchIndexRule: mockSearchIndexRule,
}));

vi.mock("./rules/aeo-exists.rule", () => ({
  aeoExistsRule: mockAeoExistsRule,
}));

vi.mock("./rules/blocks-valid.rule", () => ({
  blocksValidRule: mockBlocksValidRule,
}));

import { evaluateGates, combineResults } from "./gate-evaluator";

describe("Gate Evaluator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("combineResults", () => {
    it("returns PASS when all evaluations pass", () => {
      const evaluations: GateEvaluation[] = [
        { rule: "rule1", result: "PASS", message: "OK" },
        { rule: "rule2", result: "PASS", message: "OK" },
      ];

      expect(combineResults(evaluations)).toBe("PASS");
    });

    it("returns WARN when at least one WARN and no BLOCK", () => {
      const evaluations: GateEvaluation[] = [
        { rule: "rule1", result: "PASS", message: "OK" },
        { rule: "rule2", result: "WARN", message: "Warning" },
        { rule: "rule3", result: "PASS", message: "OK" },
      ];

      expect(combineResults(evaluations)).toBe("WARN");
    });

    it("returns BLOCK when at least one BLOCK", () => {
      const evaluations: GateEvaluation[] = [
        { rule: "rule1", result: "PASS", message: "OK" },
        { rule: "rule2", result: "WARN", message: "Warning" },
        { rule: "rule3", result: "BLOCK", message: "Blocked" },
      ];

      expect(combineResults(evaluations)).toBe("BLOCK");
    });

    it("returns PASS for empty evaluations", () => {
      expect(combineResults([])).toBe("PASS");
    });
  });

  describe("evaluateGates", () => {
    it("runs all rules and combines results", async () => {
      mockEntityCoverageRule.evaluate.mockResolvedValue({
        rule: "entity-coverage",
        result: "PASS",
        message: "Has entities",
      });
      mockSearchIndexRule.evaluate.mockResolvedValue({
        rule: "search-index",
        result: "PASS",
        message: "Indexed",
      });
      mockAeoExistsRule.evaluate.mockResolvedValue({
        rule: "aeo-exists",
        result: "PASS",
        message: "Has AEO",
      });
      mockBlocksValidRule.evaluate.mockResolvedValue({
        rule: "blocks-valid",
        result: "PASS",
        message: "Valid blocks",
      });

      const report = await evaluateGates("content-123");

      expect(report.contentId).toBe("content-123");
      expect(report.overallResult).toBe("PASS");
      expect(report.evaluations).toHaveLength(4);
      expect(report.canPublish).toBe(true);
    });

    it("blocks publishing when any rule blocks", async () => {
      mockEntityCoverageRule.evaluate.mockResolvedValue({
        rule: "entity-coverage",
        result: "BLOCK",
        message: "No entities",
      });
      mockSearchIndexRule.evaluate.mockResolvedValue({
        rule: "search-index",
        result: "PASS",
        message: "Indexed",
      });
      mockAeoExistsRule.evaluate.mockResolvedValue({
        rule: "aeo-exists",
        result: "PASS",
        message: "Has AEO",
      });
      mockBlocksValidRule.evaluate.mockResolvedValue({
        rule: "blocks-valid",
        result: "PASS",
        message: "Valid blocks",
      });

      const report = await evaluateGates("content-123");

      expect(report.overallResult).toBe("BLOCK");
      expect(report.canPublish).toBe(false);
      expect(report.blockedBy).toHaveLength(1);
      expect(report.blockedBy[0].rule).toBe("entity-coverage");
    });

    it("allows publishing with warnings", async () => {
      mockEntityCoverageRule.evaluate.mockResolvedValue({
        rule: "entity-coverage",
        result: "WARN",
        message: "Few entities",
      });
      mockSearchIndexRule.evaluate.mockResolvedValue({
        rule: "search-index",
        result: "WARN",
        message: "Not indexed yet",
      });
      mockAeoExistsRule.evaluate.mockResolvedValue({
        rule: "aeo-exists",
        result: "PASS",
        message: "Has AEO",
      });
      mockBlocksValidRule.evaluate.mockResolvedValue({
        rule: "blocks-valid",
        result: "PASS",
        message: "Valid blocks",
      });

      const report = await evaluateGates("content-123");

      expect(report.overallResult).toBe("WARN");
      expect(report.canPublish).toBe(true);
      expect(report.warnings).toHaveLength(2);
    });
  });
});
