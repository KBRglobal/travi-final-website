import type { ContentMetrics } from "./content-metrics";

const CLICK_WEIGHT = 2;
const IMPRESSION_WEIGHT = 0.1;
const RECENCY_MAX_BONUS = 10;
const RECENCY_DECAY_DAYS = 30;

const scoreCache = new Map<string, { score: number; calculatedAt: Date }>();

export function calculateScore(metrics: ContentMetrics): number {
  const clickScore = metrics.clicks * CLICK_WEIGHT;
  const impressionScore = metrics.impressions * IMPRESSION_WEIGHT;
  const recencyBonus = calculateRecencyBonus(metrics.lastUpdated);
  
  return clickScore + impressionScore + recencyBonus;
}

export function calculateRecencyBonus(lastUpdated: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  if (diffDays <= 0) {
    return RECENCY_MAX_BONUS;
  }
  
  if (diffDays >= RECENCY_DECAY_DAYS) {
    return 0;
  }
  
  const decayFactor = 1 - (diffDays / RECENCY_DECAY_DAYS);
  return RECENCY_MAX_BONUS * decayFactor;
}

export function getCachedScore(contentId: string): number | null {
  const cached = scoreCache.get(contentId);
  if (!cached) return null;
  
  const cacheAgeMs = Date.now() - cached.calculatedAt.getTime();
  const CACHE_TTL_MS = 5 * 60 * 1000;
  
  if (cacheAgeMs > CACHE_TTL_MS) {
    scoreCache.delete(contentId);
    return null;
  }
  
  return cached.score;
}

export function cacheScore(contentId: string, score: number): void {
  scoreCache.set(contentId, {
    score,
    calculatedAt: new Date(),
  });
}

export function calculateAndCacheScore(contentId: string, metrics: ContentMetrics): number {
  const score = calculateScore(metrics);
  cacheScore(contentId, score);
  return score;
}

export function getScoreBreakdown(metrics: ContentMetrics): {
  clickScore: number;
  impressionScore: number;
  recencyBonus: number;
  totalScore: number;
} {
  const clickScore = metrics.clicks * CLICK_WEIGHT;
  const impressionScore = metrics.impressions * IMPRESSION_WEIGHT;
  const recencyBonus = calculateRecencyBonus(metrics.lastUpdated);
  
  return {
    clickScore,
    impressionScore,
    recencyBonus,
    totalScore: clickScore + impressionScore + recencyBonus,
  };
}

export { CLICK_WEIGHT, IMPRESSION_WEIGHT, RECENCY_MAX_BONUS, RECENCY_DECAY_DAYS };
