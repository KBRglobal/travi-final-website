/**
 * Enterprise Intelligence Hub - Trace Resolver
 *
 * Resolves decision traces by gathering signals and building explanations.
 */

import { log } from "../../lib/logger";
import { getSignalRegistry } from "../signals/registry";
import { buildFullCausalChain, explainCausalChain, createSystemEventCause } from "./causal-chain";
import type {
  Decision,
  DecisionType,
  DecisionTrace,
  ExplanationRequest,
  ExplanationResponse,
  Cause,
} from "./types";
import type { UnifiedSignal } from "../signals/types";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[TraceResolver] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[TraceResolver] ${msg}`, data),
};

/**
 * Generate unique decision ID
 */
function generateDecisionId(): string {
  return `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Resolve signals for an entity
 */
async function resolveEntitySignals(
  entityId: string,
  entityType?: string,
  lookbackMs = 86400000 // 24 hours
): Promise<UnifiedSignal[]> {
  const registry = getSignalRegistry();
  const since = new Date(Date.now() - lookbackMs);

  return registry.querySignals({
    entityIds: [entityId],
    entityTypes: entityType ? [entityType as never] : undefined,
    since,
    limit: 50,
  });
}

/**
 * Infer decision type from signals
 */
function inferDecisionType(signals: UnifiedSignal[]): DecisionType {
  // Check for specific patterns
  for (const signal of signals) {
    if (signal.source === "cost-guards" && signal.score >= 80) {
      return "cost_limit_hit";
    }
    if (signal.source === "ai-audit" && signal.severity === "critical") {
      return "provider_disabled";
    }
    if (signal.source === "data-integrity") {
      return "quality_flagged";
    }
    if (signal.category === "quality" && signal.score >= 70) {
      return "content_regenerated";
    }
  }

  // Default based on severity
  const hasBlocking = signals.some(s => s.severity === "critical" || s.severity === "high");
  return hasBlocking ? "publish_blocked" : "quality_flagged";
}

/**
 * Build a decision from signals
 */
export function buildDecision(
  entityType: string,
  entityId: string,
  signals: UnifiedSignal[],
  additionalCauses: Cause[] = []
): Decision {
  const causalChain = buildFullCausalChain(signals, additionalCauses);
  const decisionType = inferDecisionType(signals);

  return {
    id: generateDecisionId(),
    type: decisionType,
    entityType,
    entityId,
    outcome: explainCausalChain(causalChain),
    timestamp: new Date(),
    causalChain,
    reversible: !signals.some(s => s.severity === "critical"),
    automated: true,
  };
}

/**
 * Build a full decision trace
 */
export function buildDecisionTrace(decision: Decision, signals: UnifiedSignal[]): DecisionTrace {
  const recommendations = generateRecommendations(decision, signals);

  return {
    decision,
    signals: signals.map(s => s.id),
    summary: decision.outcome,
    recommendations,
    createdAt: new Date(),
  };
}

/**
 * Generate recommendations based on decision
 */
function generateRecommendations(decision: Decision, signals: UnifiedSignal[]): string[] {
  const recommendations: string[] = [];

  switch (decision.type) {
    case "cost_limit_hit":
      recommendations.push("Review and increase cost limits if needed");
      recommendations.push("Identify high-cost features and optimize");
      break;
    case "provider_disabled":
      recommendations.push("Check AI provider status and error rates");
      recommendations.push("Consider switching to backup provider");
      break;
    case "quality_flagged":
      recommendations.push("Review content quality signals");
      recommendations.push("Consider manual content review");
      break;
    case "publish_blocked":
      recommendations.push("Resolve blocking issues before republishing");
      recommendations.push("Check data integrity for affected entities");
      break;
    case "content_regenerated":
      recommendations.push("Verify regeneration improved content quality");
      recommendations.push("Monitor for regeneration loops");
      break;
    default:
      recommendations.push("Review related signals for more context");
  }

  // Add signal-specific recommendations
  for (const signal of signals.slice(0, 3)) {
    if (signal.severity === "critical") {
      recommendations.push(`Address critical signal: ${signal.reason}`);
    }
  }

  return recommendations.slice(0, 5);
}

/**
 * Resolve an explanation request
 */
export async function resolveExplanation(
  request: ExplanationRequest
): Promise<ExplanationResponse> {
  const enabled = process.env.ENABLE_DECISION_EXPLAINABILITY === "true";

  if (!enabled) {
    return {
      entityType: request.entityType,
      entityId: request.entityId,
      question: request.question || "general",
      answer: "Decision explainability is not enabled",
      confidence: 0,
      rootCause: null,
      contributingFactors: [],
      relatedDecisions: [],
      signalIds: [],
      generatedAt: new Date(),
    };
  }

  // Gather signals for this entity
  const signals = await resolveEntitySignals(request.entityId, request.entityType);

  if (signals.length === 0) {
    logger.warn("No signals found for entity", {
      entityType: request.entityType,
      entityId: request.entityId,
    });

    return {
      entityType: request.entityType,
      entityId: request.entityId,
      question: request.question || "general",
      answer: "No signals found for this entity. The system has no recorded decisions.",
      confidence: 10,
      rootCause: null,
      contributingFactors: [],
      relatedDecisions: [],
      signalIds: [],
      generatedAt: new Date(),
    };
  }

  // Build causal chain
  const causalChain = buildFullCausalChain(signals);

  // Build answer based on question
  let answer: string;
  switch (request.question) {
    case "why_blocked":
      answer = buildBlockedExplanation(signals, causalChain);
      break;
    case "why_regenerated":
      answer = buildRegeneratedExplanation(signals, causalChain);
      break;
    case "why_recommended":
      answer = buildRecommendedExplanation(signals, causalChain);
      break;
    case "why_failed":
      answer = buildFailedExplanation(signals, causalChain);
      break;
    default:
      answer = explainCausalChain(causalChain);
  }

  // Build related decisions
  const decision = buildDecision(request.entityType, request.entityId, signals);

  logger.info("Explanation resolved", {
    entityId: request.entityId,
    signalCount: signals.length,
    confidence: causalChain.totalConfidence,
  });

  return {
    entityType: request.entityType,
    entityId: request.entityId,
    question: request.question || "general",
    answer,
    confidence: causalChain.totalConfidence,
    rootCause: causalChain.rootCause,
    contributingFactors: causalChain.contributingCauses.slice(0, 5),
    relatedDecisions: [decision],
    signalIds: signals.map(s => s.id),
    generatedAt: new Date(),
  };
}

function buildBlockedExplanation(
  signals: UnifiedSignal[],
  chain: ReturnType<typeof buildFullCausalChain>
): string {
  const critical = signals.filter(s => s.severity === "critical" || s.severity === "high");

  if (critical.length === 0) {
    return `Content is not currently blocked. ${explainCausalChain(chain)}`;
  }

  const reasons = critical.map(s => s.reason).join("; ");
  return `Content is blocked due to: ${reasons}. ${explainCausalChain(chain)}`;
}

function buildRegeneratedExplanation(
  signals: UnifiedSignal[],
  chain: ReturnType<typeof buildFullCausalChain>
): string {
  const qualitySignals = signals.filter(s => s.category === "quality");

  if (qualitySignals.length === 0) {
    return `No quality issues detected that would trigger regeneration. ${explainCausalChain(chain)}`;
  }

  const issues = qualitySignals.map(s => s.reason).join("; ");
  return `Content was regenerated due to quality issues: ${issues}. ${explainCausalChain(chain)}`;
}

function buildRecommendedExplanation(
  signals: UnifiedSignal[],
  chain: ReturnType<typeof buildFullCausalChain>
): string {
  const engagementSignals = signals.filter(
    s => s.category === "engagement" || s.category === "revenue"
  );

  if (engagementSignals.length === 0) {
    return `No specific recommendation signals found. ${explainCausalChain(chain)}`;
  }

  const reasons = engagementSignals.map(s => s.reason).join("; ");
  return `This was recommended because: ${reasons}. ${explainCausalChain(chain)}`;
}

function buildFailedExplanation(
  signals: UnifiedSignal[],
  chain: ReturnType<typeof buildFullCausalChain>
): string {
  const errorSignals = signals.filter(s => s.severity === "critical" || s.category === "health");

  if (errorSignals.length === 0) {
    return `No failure signals detected. ${explainCausalChain(chain)}`;
  }

  const errors = errorSignals.map(s => s.reason).join("; ");
  return `Operation failed due to: ${errors}. ${explainCausalChain(chain)}`;
}
