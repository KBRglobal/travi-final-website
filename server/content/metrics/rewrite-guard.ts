import { getPerformance, getPerformanceScore, type ContentPerformance } from "./performance-model";

const SCORE_THRESHOLD = 70;
const CTR_THRESHOLD = 5;

export interface RewriteDecision {
  allowed: boolean;
  reason: string;
  performance: ContentPerformance | null;
}

export function shouldRewrite(entityId: string): boolean {
  const decision = getRewriteDecision(entityId);
  return decision.allowed;
}

export function getRewriteDecision(entityId: string): RewriteDecision {
  const performance = getPerformance(entityId);
  
  if (!performance) {
    return {
      allowed: true,
      reason: "No performance data recorded for this entity",
      performance: null,
    };
  }
  
  const score = getPerformanceScore(entityId);
  
  if (score > SCORE_THRESHOLD) {
    console.warn(
      `[RewriteGuard] BLOCKED: Entity "${entityId}" has score ${score} (threshold: ${SCORE_THRESHOLD}). ` +
      `High-performing content is protected from rewrite.`
    );
    
    return {
      allowed: false,
      reason: `Score ${score} exceeds threshold of ${SCORE_THRESHOLD}. High-performing content protected.`,
      performance,
    };
  }
  
  if (performance.ctr > CTR_THRESHOLD) {
    console.warn(
      `[RewriteGuard] BLOCKED: Entity "${entityId}" has CTR ${performance.ctr}% (threshold: ${CTR_THRESHOLD}%). ` +
      `High-CTR content is protected from rewrite.`
    );
    
    return {
      allowed: false,
      reason: `CTR ${performance.ctr}% exceeds threshold of ${CTR_THRESHOLD}%. High-engagement content protected.`,
      performance,
    };
  }
  
  return {
    allowed: true,
    reason: `Score ${score} and CTR ${performance.ctr}% are within rewrite thresholds`,
    performance,
  };
}

export function forceRewrite(entityId: string): RewriteDecision {
  const performance = getPerformance(entityId);
  const score = performance ? getPerformanceScore(entityId) : 0;
  
  if (performance && (score > SCORE_THRESHOLD || performance.ctr > CTR_THRESHOLD)) {
    console.warn(
      `[RewriteGuard] FORCE OVERRIDE: Allowing rewrite for high-performing entity "${entityId}" ` +
      `(score: ${score}, CTR: ${performance.ctr}%). This action was explicitly forced.`
    );
  }
  
  return {
    allowed: true,
    reason: "Force override - rewrite allowed regardless of performance metrics",
    performance,
  };
}

export { SCORE_THRESHOLD, CTR_THRESHOLD };
