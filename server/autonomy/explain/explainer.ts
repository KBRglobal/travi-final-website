/**
 * Executive Autonomy Explainer - Core Logic
 * Generates human-readable explanations of autonomy decisions
 */

import {
  DecisionExplanation,
  ActivitySummary,
  FeatureSummary,
  ActionItem,
  ExplanationRequest,
  ExplanationAudience,
  ExplainerConfig,
  DEFAULT_EXPLAINER_CONFIG,
  FEATURE_DISPLAY_NAMES,
  DECISION_TEMPLATES,
} from "./types";
import { GuardedFeature } from "../enforcement/types";
import { getOutcomes, computeMetrics } from "../learning/engine";
import { getSignals } from "../drift/detector";

// Bounded caches
const explanationCache = new Map<string, DecisionExplanation>();
const summaryCache = new Map<string, ActivitySummary>();

function getConfig(): ExplainerConfig {
  return {
    ...DEFAULT_EXPLAINER_CONFIG,
    enabled: process.env.ENABLE_AUTONOMY_EXPLAINER === "true",
  };
}

/**
 * Generate explanation for a single decision
 */
export function explainDecision(request: ExplanationRequest): DecisionExplanation | null {
  const config = getConfig();
  if (!request.decision) return null;

  const { decision } = request;
  const audience = request.audience || config.defaultAudience;

  // Check cache
  const cacheKey = `${decision.id}-${audience}`;
  const cached = explanationCache.get(cacheKey);
  if (cached) return cached;

  const featureName = FEATURE_DISPLAY_NAMES[decision.feature] || decision.feature;
  const template = DECISION_TEMPLATES[decision.result];

  // Build summary based on audience
  let summary: string;
  switch (audience) {
    case "executive":
      summary = buildExecutiveSummary(decision, featureName);
      break;
    case "manager":
      summary = buildManagerSummary(decision, featureName);
      break;
    case "developer":
    case "operator":
      summary = buildTechnicalSummary(decision, featureName);
      break;
    default:
      summary = template.manager;
  }

  // Build details
  const details = buildDetails(decision, audience);

  // Build context
  const context = buildContext(decision, featureName, audience);

  // Build business impact for executives
  const businessImpact = audience === "executive" ? buildBusinessImpact(decision) : undefined;

  // Build technical details for developers
  const technicalDetails =
    audience === "developer" || audience === "operator"
      ? buildTechnicalDetails(decision)
      : undefined;

  const explanation: DecisionExplanation = {
    id: `exp-${decision.id}`,
    feature: decision.feature,
    action: decision.action,
    decision: decision.result,
    timestamp: new Date(),
    summary,
    details,
    context,
    businessImpact,
    technicalDetails,
  };

  // Cache (bounded)
  if (explanationCache.size >= config.maxExplanationsCache) {
    const first = explanationCache.keys().next().value;
    if (first) explanationCache.delete(first);
  }
  explanationCache.set(cacheKey, explanation);

  return explanation;
}

/**
 * Generate activity summary for a time period
 */
export function generateActivitySummary(request: ExplanationRequest): ActivitySummary | null {
  const config = getConfig();
  if (!request.summary) return null;

  const { start, end, features } = request.summary;
  const audience = request.audience || config.defaultAudience;

  // Check cache
  const cacheKey = `${start.toISOString()}-${end.toISOString()}-${audience}`;
  const cached = summaryCache.get(cacheKey);
  if (cached) return cached;

  // Get outcomes for the period
  const outcomes = getOutcomes({ since: start, until: end } as any);

  // Get metrics
  const metrics = computeMetrics({ start, end } as any);

  // Get drift signals
  const signals = getSignals({ status: "new" });

  // Filter by features if specified
  const filteredOutcomes = features ? outcomes.filter(o => features.includes(o.feature)) : outcomes;

  // Build period label
  const periodLabel = buildPeriodLabel(start, end);

  // Build narrative
  const narrative = buildNarrative(filteredOutcomes, metrics, audience);

  // Build highlights
  const highlights = buildHighlights(metrics as any, audience);

  // Build feature summaries
  const featureSummaries = buildFeatureSummaries(filteredOutcomes, audience);

  // Build action items
  const actionItems = buildActionItems(signals, metrics, audience);

  // Build health assessment
  const healthAssessment = buildHealthAssessment(metrics, signals, audience);

  const summary: ActivitySummary = {
    id: `sum-${Date.now()}`,
    period: { start, end, label: periodLabel },
    audience,
    narrative,
    highlights,
    featureSummaries,
    actionItems,
    healthAssessment,
  };

  // Cache (bounded)
  if (summaryCache.size >= config.maxSummariesCache) {
    const first = summaryCache.keys().next().value;
    if (first) summaryCache.delete(first);
  }
  summaryCache.set(cacheKey, summary);

  return summary;
}

// Helper functions

function buildExecutiveSummary(
  decision: NonNullable<ExplanationRequest["decision"]>,
  featureName: string
): string {
  if (decision.result === "ALLOW") {
    return `${featureName} request completed successfully.`;
  } else if (decision.result === "WARN") {
    return `${featureName} request completed with a caution flag.`;
  } else {
    return `${featureName} request was prevented to protect resources.`;
  }
}

function buildManagerSummary(
  decision: NonNullable<ExplanationRequest["decision"]>,
  featureName: string
): string {
  const budgetInfo = decision.budgetState
    ? ` Budget: ${decision.budgetState.used}/${decision.budgetState.limit} used.`
    : "";

  if (decision.result === "ALLOW") {
    return `${featureName} processed normally.${budgetInfo}`;
  } else if (decision.result === "WARN") {
    return `${featureName} processed with warning - approaching limits.${budgetInfo}`;
  } else {
    const reason = decision.reasons[0]?.message || "policy limits reached";
    return `${featureName} blocked: ${reason}.${budgetInfo}`;
  }
}

function buildTechnicalSummary(
  decision: NonNullable<ExplanationRequest["decision"]>,
  featureName: string
): string {
  const reasons = decision.reasons.map(r => r.message).join("; ");
  return `${featureName} (${decision.action}): ${decision.result}. ${reasons || "Passed all checks"}`;
}

function buildDetails(
  decision: NonNullable<ExplanationRequest["decision"]>,
  audience: ExplanationAudience
): string[] {
  const details: string[] = [];

  if (decision.budgetState) {
    const utilization = ((decision.budgetState.used / decision.budgetState.limit) * 100).toFixed(0);

    if (audience === "executive") {
      details.push(`Resource utilization: ${utilization}%`);
    } else {
      details.push(
        `Budget: ${decision.budgetState.used}/${decision.budgetState.limit} (${utilization}%) for ${decision.budgetState.period} period`
      );
    }
  }

  for (const reason of decision.reasons) {
    if (audience === "executive") {
      details.push(simplifyReason(reason.message));
    } else {
      details.push(`[${reason.code}] ${reason.message}`);
    }
  }

  return details;
}

function simplifyReason(reason: string): string {
  // Simplify technical reasons for executives
  const simplifications: Record<string, string> = {
    budget_exceeded: "Resource allocation limit reached",
    policy_violation: "Operation not permitted by current rules",
    rate_limited: "Too many requests in short time",
    maintenance_mode: "System in maintenance mode",
  };

  for (const [key, value] of Object.entries(simplifications)) {
    if (reason.toLowerCase().includes(key.replace("_", " "))) {
      return value;
    }
  }

  return reason;
}

function buildContext(
  decision: NonNullable<ExplanationRequest["decision"]>,
  featureName: string,
  audience: ExplanationAudience
): DecisionExplanation["context"] {
  const actionMap: Record<string, string> = {
    ai_generate: "generating AI content",
    ai_enrich: "enriching content with AI",
    content_publish: "publishing content",
    content_create: "creating content",
    content_update: "updating content",
    db_write: "saving data",
    external_api: "calling external service",
  };

  const what = actionMap[decision.action] || decision.action;

  let why: string;
  let impact: string;
  let nextSteps: string | undefined;

  if (decision.result === "ALLOW") {
    why = "All policy checks passed and resources were available.";
    impact = "The operation completed successfully.";
  } else if (decision.result === "WARN") {
    why = "The operation was allowed but is approaching resource limits.";
    impact = "Future similar requests may be blocked if limits are reached.";
    nextSteps = "Consider monitoring usage or requesting budget increase.";
  } else {
    const reason = decision.reasons[0]?.message || "Policy constraints";
    why = reason;
    impact =
      audience === "executive"
        ? "The operation was not completed to maintain system stability."
        : "Request blocked - operation not performed.";
    nextSteps =
      audience === "executive"
        ? "Contact your administrator if this is blocking critical work."
        : "Wait for budget reset or request a temporary override.";
  }

  return {
    what: `The system was ${what} using ${featureName}.`,
    why,
    impact,
    nextSteps,
  };
}

function buildBusinessImpact(
  decision: NonNullable<ExplanationRequest["decision"]>
): DecisionExplanation["businessImpact"] {
  let costImplication: string;
  let riskLevel: "low" | "medium" | "high";
  let userImpact: string;

  if (decision.result === "ALLOW") {
    costImplication = "Normal operational cost incurred.";
    riskLevel = "low";
    userImpact = "No impact - request completed.";
  } else if (decision.result === "WARN") {
    costImplication = "Costs approaching allocated limits.";
    riskLevel = "medium";
    userImpact = "Minimal - request completed with caution.";
  } else {
    costImplication = "Cost avoided by blocking the request.";
    riskLevel = "low";
    userImpact = "User may need to wait or seek alternative.";
  }

  return { costImplication, riskLevel, userImpact };
}

function buildTechnicalDetails(
  decision: NonNullable<ExplanationRequest["decision"]>
): DecisionExplanation["technicalDetails"] {
  return {
    policyMatched: decision.reasons[0]?.code || "default",
    budgetState: decision.budgetState
      ? `${decision.budgetState.period}: ${decision.budgetState.used}/${decision.budgetState.limit}`
      : undefined,
    triggeredRules: decision.reasons.map(r => r.code),
  };
}

function buildPeriodLabel(start: Date, end: Date): string {
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  if (hours <= 24) return "Last 24 hours";
  if (hours <= 168) return "Last 7 days";
  if (hours <= 720) return "Last 30 days";
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}

function buildNarrative(
  outcomes: Array<{ decision: string; feature: GuardedFeature }>,
  metrics: { accuracy: number; precision: number; recall: number },
  audience: ExplanationAudience
): string {
  const total = outcomes.length;
  const blocks = outcomes.filter(o => o.decision === "BLOCK").length;
  const blockRate = total > 0 ? ((blocks / total) * 100).toFixed(1) : "0";

  if (audience === "executive") {
    if (blocks === 0) {
      return `All ${total} requests were processed successfully during this period. The system operated smoothly with no interruptions.`;
    } else if (Number(blockRate) < 5) {
      return `${total} requests were processed, with ${blockRate}% requiring protective measures. Operations are running normally.`;
    } else {
      return `${total} requests were handled, with ${blockRate}% blocked to protect resources. Review may be needed.`;
    }
  }

  return `Processed ${total} requests: ${total - blocks} allowed, ${blocks} blocked (${blockRate}% block rate). System accuracy: ${(metrics.accuracy * 100).toFixed(0)}%.`;
}

function buildHighlights(
  metrics: { accuracy: number; tp: number; tn: number; fp: number; fn: number },
  audience: ExplanationAudience
): ActivitySummary["highlights"] {
  const highlights: ActivitySummary["highlights"] = [];

  const total = metrics.tp + metrics.tn + metrics.fp + metrics.fn;
  const blocked = metrics.tn + metrics.fn;
  const allowed = metrics.tp + metrics.fp;

  if (audience === "executive") {
    highlights.push(
      {
        label: "Requests Handled",
        value: total.toLocaleString(),
        trend: "stable",
        sentiment: "neutral",
      },
      {
        label: "Success Rate",
        value: `${(((metrics.tp + metrics.tn) / total) * 100).toFixed(0)}%`,
        trend: metrics.accuracy > 0.9 ? "stable" : "down",
        sentiment: metrics.accuracy > 0.9 ? "positive" : "negative",
      }
    );
  } else {
    highlights.push(
      {
        label: "Total Decisions",
        value: total.toLocaleString(),
        trend: "stable",
        sentiment: "neutral",
      },
      {
        label: "Blocked",
        value: `${blocked} (${((blocked / total) * 100).toFixed(1)}%)`,
        trend: blocked / total > 0.1 ? "up" : "stable",
        sentiment: blocked / total > 0.2 ? "negative" : "neutral",
      },
      {
        label: "Accuracy",
        value: `${(metrics.accuracy * 100).toFixed(1)}%`,
        trend: metrics.accuracy > 0.9 ? "stable" : "down",
        sentiment: metrics.accuracy > 0.9 ? "positive" : "negative",
      }
    );
  }

  return highlights;
}

function buildFeatureSummaries(
  outcomes: Array<{
    feature: GuardedFeature;
    decision: string;
    metadata?: Record<string, unknown>;
  }>,
  audience: ExplanationAudience
): FeatureSummary[] {
  const byFeature = new Map<
    GuardedFeature,
    {
      total: number;
      blocked: number;
      cost: number;
    }
  >();

  for (const o of outcomes) {
    const stats = byFeature.get(o.feature) || { total: 0, blocked: 0, cost: 0 };
    stats.total++;
    if (o.decision === "BLOCK") stats.blocked++;
    stats.cost += (o.metadata?.cost as number) || 0;
    byFeature.set(o.feature, stats);
  }

  const summaries: FeatureSummary[] = [];

  for (const [feature, stats] of byFeature) {
    const blockRate = stats.total > 0 ? stats.blocked / stats.total : 0;
    const status: FeatureSummary["status"] =
      blockRate > 0.3 ? "critical" : blockRate > 0.1 ? "attention_needed" : "healthy";

    const displayName = FEATURE_DISPLAY_NAMES[feature] || feature;

    let summary: string;
    if (audience === "executive") {
      if (status === "healthy") {
        summary = `${displayName} is operating normally.`;
      } else if (status === "attention_needed") {
        summary = `${displayName} has some blocked requests that may need review.`;
      } else {
        summary = `${displayName} has significant blocks - immediate attention recommended.`;
      }
    } else {
      summary = `${stats.total} requests, ${stats.blocked} blocked (${(blockRate * 100).toFixed(1)}%)`;
    }

    const issues: string[] = [];
    if (blockRate > 0.2) {
      issues.push(
        audience === "executive"
          ? "High block rate"
          : `Block rate: ${(blockRate * 100).toFixed(1)}%`
      );
    }

    summaries.push({
      feature,
      displayName,
      summary,
      metrics: {
        requests: stats.total.toLocaleString(),
        blocked: `${stats.blocked} (${(blockRate * 100).toFixed(1)}%)`,
        cost: `${(stats.cost / 100).toFixed(2)} USD`,
      },
      status,
      issues: issues.length > 0 ? issues : undefined,
    });
  }

  return summaries.sort((a, b) => {
    const statusOrder = { critical: 0, attention_needed: 1, healthy: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
}

function buildActionItems(
  signals: Array<{
    severity: string;
    feature?: GuardedFeature;
    type: string;
    recommendation?: { reason: string };
  }>,
  metrics: { accuracy: number },
  audience: ExplanationAudience
): ActionItem[] {
  const items: ActionItem[] = [];

  // Add action items from drift signals
  for (const signal of signals.slice(0, 5)) {
    const priority =
      signal.severity === "critical" ? "high" : signal.severity === "high" ? "high" : "medium";

    const category = signal.type.includes("budget")
      ? "budget"
      : signal.type.includes("incident")
        ? "incident"
        : "policy";

    if (audience === "executive") {
      items.push({
        priority,
        category,
        title: `Review ${FEATURE_DISPLAY_NAMES[signal.feature!] || signal.feature}`,
        description: signal.recommendation?.reason || "Attention needed based on system analysis.",
        feature: signal.feature,
      });
    } else {
      items.push({
        priority,
        category,
        title: `${signal.type.replace("_", " ")} detected`,
        description: signal.recommendation?.reason || "Review recommended.",
        suggestedAction: `Investigate ${signal.type} for ${signal.feature}`,
        feature: signal.feature,
      });
    }
  }

  // Add accuracy-based action item
  if (metrics.accuracy < 0.85) {
    items.push({
      priority: "medium",
      category: "policy",
      title: audience === "executive" ? "System tuning recommended" : "Low decision accuracy",
      description:
        audience === "executive"
          ? "The system could benefit from configuration adjustments."
          : `Decision accuracy is ${(metrics.accuracy * 100).toFixed(1)}%, below 85% target.`,
      suggestedAction: "Review policy configuration and thresholds.",
    });
  }

  return items;
}

function buildHealthAssessment(
  metrics: { accuracy: number },
  signals: Array<{ severity: string }>,
  audience: ExplanationAudience
): ActivitySummary["healthAssessment"] {
  const criticalSignals = signals.filter(s => s.severity === "critical").length;
  const highSignals = signals.filter(s => s.severity === "high").length;

  let status: "healthy" | "attention_needed" | "critical";
  let explanation: string;

  if (criticalSignals > 0 || metrics.accuracy < 0.7) {
    status = "critical";
    explanation =
      audience === "executive"
        ? "The system requires immediate attention. Some operations may be impacted."
        : `Critical: ${criticalSignals} critical drift signals, accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`;
  } else if (highSignals > 2 || metrics.accuracy < 0.85) {
    status = "attention_needed";
    explanation =
      audience === "executive"
        ? "The system is operational but some areas may benefit from review."
        : `Attention: ${highSignals} high-severity signals, accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`;
  } else {
    status = "healthy";
    explanation =
      audience === "executive"
        ? "The system is operating smoothly with no significant issues."
        : `Healthy: No critical signals, accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`;
  }

  return { status, explanation };
}

/**
 * Clear explanation caches
 */
export function clearExplanationCache(): void {
  explanationCache.clear();
  summaryCache.clear();
}
