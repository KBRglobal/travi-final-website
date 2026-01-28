/**
 * Enterprise Intelligence Hub - Causal Chain Builder
 *
 * Builds chains of causes to explain system decisions.
 */

import { log } from "../../lib/logger";
import type { Cause, CausalChain, CauseCategory } from "./types";
import type { UnifiedSignal } from "../signals/types";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[CausalChain] ${msg}`, data),
};

/**
 * Generate unique cause ID
 */
function generateCauseId(): string {
  return `cause-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert a signal to a cause
 */
export function signalToCause(signal: UnifiedSignal): Cause {
  return {
    id: generateCauseId(),
    category: "signal",
    source: signal.source,
    description: signal.reason,
    timestamp: signal.timestamp,
    confidence: signal.score,
    evidence: {
      signalId: signal.id,
      severity: signal.severity,
      category: signal.category,
      details: signal.details,
    },
  };
}

/**
 * Create a threshold-based cause
 */
export function createThresholdCause(
  source: string,
  thresholdName: string,
  currentValue: number,
  thresholdValue: number
): Cause {
  const exceeded = currentValue >= thresholdValue;
  return {
    id: generateCauseId(),
    category: "threshold",
    source,
    description: `${thresholdName} ${exceeded ? "exceeded" : "below threshold"}: ${currentValue} vs ${thresholdValue}`,
    timestamp: new Date(),
    confidence: exceeded ? 90 : 50,
    evidence: {
      thresholdName,
      currentValue,
      thresholdValue,
      exceeded,
    },
  };
}

/**
 * Create a rule-based cause
 */
export function createRuleCause(
  source: string,
  ruleName: string,
  ruleDescription: string,
  matched: boolean
): Cause {
  return {
    id: generateCauseId(),
    category: "rule",
    source,
    description: `Rule "${ruleName}": ${ruleDescription}`,
    timestamp: new Date(),
    confidence: matched ? 95 : 30,
    evidence: {
      ruleName,
      ruleDescription,
      matched,
    },
  };
}

/**
 * Create a system event cause
 */
export function createSystemEventCause(
  source: string,
  eventType: string,
  eventDescription: string,
  data?: Record<string, unknown>
): Cause {
  return {
    id: generateCauseId(),
    category: "system_event",
    source,
    description: `${eventType}: ${eventDescription}`,
    timestamp: new Date(),
    confidence: 85,
    evidence: {
      eventType,
      eventDescription,
      ...data,
    },
  };
}

/**
 * Simplified cause for chain output
 */
export interface SimpleCause {
  type: "signal" | "rule" | "threshold" | "system_event" | "user_action" | "external";
  signalId?: string;
  source: string;
  description: string;
  weight: number;
}

/**
 * Simplified chain output (for testing and simple use cases)
 */
export interface SimpleChain {
  causes: SimpleCause[];
  totalConfidence: number;
}

/**
 * Additional cause input format
 */
export interface AdditionalCauseInput {
  type: "signal" | "rule" | "threshold" | "system_event" | "user_action" | "external";
  source: string;
  description?: string;
  weight?: number;
}

/**
 * Build a causal chain from signals
 * Returns a simplified chain structure for easier consumption
 */
export function buildCausalChain(
  signals: UnifiedSignal[],
  additionalCauses: AdditionalCauseInput[] = []
): SimpleChain {
  const causes: SimpleCause[] = [];

  // Convert signals to simple causes
  for (const signal of signals) {
    causes.push({
      type: "signal",
      signalId: signal.id,
      source: signal.source,
      description: signal.reason,
      weight: signal.score,
    });
  }

  // Add additional causes
  for (const cause of additionalCauses) {
    causes.push({
      type: cause.type,
      source: cause.source,
      description: cause.description || `Cause from ${cause.source}`,
      weight: cause.weight || 50,
    });
  }

  if (causes.length === 0) {
    return {
      causes: [],
      totalConfidence: 0,
    };
  }

  // Sort by weight (highest first)
  causes.sort((a, b) => b.weight - a.weight);

  // Calculate total confidence (weighted average)
  const weights = causes.map((_, i) => 1 / (i + 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedSum = causes.reduce((sum, cause, i) => sum + cause.weight * weights[i], 0);
  const totalConfidence = Math.round(weightedSum / totalWeight);

  logger.info("Causal chain built", {
    causesCount: causes.length,
    totalConfidence,
  });

  return {
    causes,
    totalConfidence,
  };
}

/**
 * Build a full causal chain with all details (for internal use)
 */
export function buildFullCausalChain(
  signals: UnifiedSignal[],
  additionalCauses: Cause[] = []
): CausalChain {
  // Convert signals to causes
  const signalCauses = signals.map(signalToCause);

  // Combine all causes
  const allCauses = [...signalCauses, ...additionalCauses];

  if (allCauses.length === 0) {
    return {
      rootCause: {
        id: generateCauseId(),
        category: "system_event",
        source: "unknown",
        description: "No specific cause identified",
        timestamp: new Date(),
        confidence: 10,
        evidence: {},
      },
      contributingCauses: [],
      totalConfidence: 10,
      chainLength: 1,
    };
  }

  // Sort by confidence (highest first), then by timestamp (newest first)
  allCauses.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  // Root cause is the highest confidence cause
  const rootCause = allCauses[0];
  const contributingCauses = allCauses.slice(1);

  // Calculate total confidence (weighted average)
  const weights = allCauses.map((_, i) => 1 / (i + 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedSum = allCauses.reduce((sum, cause, i) => sum + cause.confidence * weights[i], 0);
  const totalConfidence = Math.round(weightedSum / totalWeight);

  logger.info("Full causal chain built", {
    rootCause: rootCause.source,
    contributingCount: contributingCauses.length,
    totalConfidence,
  });

  return {
    rootCause,
    contributingCauses,
    totalConfidence,
    chainLength: allCauses.length,
  };
}

/**
 * Generate a human-readable summary of a causal chain
 */
export function generateChainSummary(chain: SimpleChain): string {
  if (chain.causes.length === 0) {
    return "No causes identified.";
  }

  const parts: string[] = [];

  for (const cause of chain.causes) {
    parts.push(`${cause.source}: ${cause.description} (weight: ${cause.weight})`);
  }

  parts.push(`Total confidence: ${chain.totalConfidence}%`);

  return parts.join("\n");
}

/**
 * Explain a causal chain in natural language
 */
export function explainCausalChain(chain: CausalChain): string {
  const parts: string[] = [];

  // Root cause
  parts.push(
    `Primary cause: ${chain.rootCause.description} (${chain.rootCause.confidence}% confidence)`
  );

  // Contributing causes (top 3)
  const topContributing = chain.contributingCauses.slice(0, 3);
  if (topContributing.length > 0) {
    parts.push("Contributing factors:");
    for (const cause of topContributing) {
      parts.push(`  - ${cause.description} (${cause.confidence}% confidence)`);
    }
  }

  // Overall confidence
  parts.push(`Overall confidence: ${chain.totalConfidence}%`);

  return parts.join("\n");
}

/**
 * Find the most likely root cause category
 */
export function identifyRootCauseCategory(chain: CausalChain): CauseCategory {
  const categoryCounts: Record<CauseCategory, number> = {
    signal: 0,
    threshold: 0,
    rule: 0,
    user_action: 0,
    system_event: 0,
    external: 0,
  };

  // Weight root cause more heavily
  categoryCounts[chain.rootCause.category] += 3;

  for (const cause of chain.contributingCauses) {
    categoryCounts[cause.category]++;
  }

  let maxCategory: CauseCategory = "signal";
  let maxCount = 0;

  for (const [category, count] of Object.entries(categoryCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxCategory = category as CauseCategory;
    }
  }

  return maxCategory;
}
