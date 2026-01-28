/**
 * Publish Gates - Gate Evaluator
 *
 * Evaluates all gate rules for a content item.
 */

import { log } from "../lib/logger";
import { entityCoverageRule } from "./rules/entity-coverage.rule";
import { searchIndexRule } from "./rules/search-index.rule";
import { aeoExistsRule } from "./rules/aeo-exists.rule";
import { blocksValidRule } from "./rules/blocks-valid.rule";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[PublishGate] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[PublishGate] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[PublishGate] ${msg}`, data),
};

// All registered rules
const GATE_RULES: any[] = [
  entityCoverageRule as any,
  aeoExistsRule as any,
  blocksValidRule as any,
  searchIndexRule as any,
];

/**
 * Combine evaluation results to determine overall result.
 * BLOCK > WARN > PASS
 */
export function combineResults(evaluations: any[]): "PASS" | "WARN" | "BLOCK" {
  if (evaluations.some(e => e.result === "BLOCK")) {
    return "BLOCK";
  }
  if (evaluations.some(e => e.result === "WARN")) {
    return "WARN";
  }
  return "PASS";
}

/**
 * Evaluate all gate rules for a content item.
 */
export async function evaluateGates(contentId: string): Promise<any> {
  const evaluations: any[] = [];

  logger.info("Evaluating publish gates", { contentId, ruleCount: GATE_RULES.length });

  for (const rule of GATE_RULES) {
    try {
      const evaluation = await rule.evaluate(contentId);
      evaluations.push(evaluation);

      if (evaluation.result !== "PASS") {
        logger.warn(`Gate rule ${rule.name}: ${evaluation.result}`, {
          contentId,
          message: evaluation.message,
        });
      }
    } catch (error) {
      // Rule evaluation errors should not block publish
      logger.error(`Gate rule ${rule.name} failed`, {
        contentId,
        error: error instanceof Error ? error.message : "Unknown",
      });

      evaluations.push({
        rule: rule.name,
        result: "WARN",
        message: `Rule evaluation failed: ${error instanceof Error ? error.message : "Unknown"}`,
        details: { error: true },
      });
    }
  }

  const overallResult = combineResults(evaluations);
  const canPublish = overallResult !== "BLOCK";
  const blockedBy = evaluations.filter(e => e.result === "BLOCK");
  const warnings = evaluations.filter(e => e.result === "WARN");

  const report: any = {
    contentId,
    canPublish,
    overallResult,
    evaluations,
    blockedBy,
    warnings,
    evaluatedAt: new Date(),
  };

  logger.info("Gate evaluation complete", {
    contentId,
    canPublish,
    overallResult,
    passed: evaluations.filter(e => e.result === "PASS").length,
    warned: evaluations.filter(e => e.result === "WARN").length,
    blocked: evaluations.filter(e => e.result === "BLOCK").length,
  });

  return report;
}

/**
 * Get list of registered rules.
 */
export function getRegisteredRules(): Array<{ name: string; description: string }> {
  return GATE_RULES.map(r => ({ name: r.name, description: r.description }));
}
