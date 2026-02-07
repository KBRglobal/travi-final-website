import { getMetrics, type ContentMetrics } from "./content-metrics";

const HIGH_ENGAGEMENT_THRESHOLD = 100;

export interface RegenerationDecision {
  allowed: boolean;
  reason: string;
  metrics: ContentMetrics | null;
  isHighPerformer: boolean;
}

export function shouldAllowRegeneration(contentId: string): boolean {
  const decision = getRegenerationDecision(contentId);
  return decision.allowed;
}

export function getRegenerationDecision(contentId: string): RegenerationDecision {
  const metrics = getMetrics(contentId);

  if (!metrics) {
    return {
      allowed: true,
      reason: "No metrics recorded for this content",
      metrics: null,
      isHighPerformer: false,
    };
  }

  const isHighPerformer = metrics.clicks >= HIGH_ENGAGEMENT_THRESHOLD;

  if (isHighPerformer) {
    return {
      allowed: false,
      reason: `Content has ${metrics.clicks} clicks (threshold: ${HIGH_ENGAGEMENT_THRESHOLD}). High-performing content is protected.`,
      metrics,
      isHighPerformer: true,
    };
  }

  return {
    allowed: true,
    reason: `Content has ${metrics.clicks} clicks (below threshold of ${HIGH_ENGAGEMENT_THRESHOLD})`,
    metrics,
    isHighPerformer: false,
  };
}

export function forceAllowRegeneration(contentId: string): RegenerationDecision {
  const metrics = getMetrics(contentId);
  const isHighPerformer = metrics ? metrics.clicks >= HIGH_ENGAGEMENT_THRESHOLD : false;

  if (isHighPerformer) {
    // empty
  }

  return {
    allowed: true,
    reason: "Force override - regeneration allowed regardless of metrics",
    metrics,
    isHighPerformer,
  };
}

export { HIGH_ENGAGEMENT_THRESHOLD };
