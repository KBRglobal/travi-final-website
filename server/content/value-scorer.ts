/**
 * Content Value Scorer - Performance ÷ AI Cost
 *
 * TASK 3: CONTENT VALUE AUTOMATION
 *
 * Calculates content value score based on:
 * - Performance data from content-performance.ts
 * - AI cost data from cost-analytics.ts
 *
 * Value = Performance / AI Cost (higher = better ROI)
 *
 * HARD CONSTRAINTS:
 * - Never modify high-performing content (score > 80)
 * - Use existing performance + cost systems
 * - Additive only
 */

import { log } from "../lib/logger";
import {
  getPerformance,
  getPerformanceScore,
  HIGH_PERFORMING_SCORE_THRESHOLD,
} from "./metrics/content-performance";
// Inline stub: cost-analytics deleted in Phase 4.1 cleanup
function getCostAnalytics() {
  return {
    totalCost: 0,
    getArticleCost: (_id: string) => ({ articleId: _id, totalCost: 0, lastUpdated: new Date() }),
    getArticleCosts: (_ids?: string[]) =>
      [] as { articleId: string; totalCost: number; lastUpdated?: Date }[],
  };
}

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[ValueScorer] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[ValueScorer] ${msg}`, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ValueScorer][AUDIT] ${msg}`, data),
};

export interface ContentValueResult {
  entityId: string;
  value: number;
  performance: number;
  aiCost: number;
  ratio: number;
  isProtected: boolean;
  recommendation: "improve" | "maintain" | "protected" | "insufficient-data";
}

export interface ContentValueSummary {
  highValueCount: number;
  lowValueCount: number;
  protectedCount: number;
  insufficientDataCount: number;
  averageValue: number;
  topCandidates: ContentValueResult[];
}

const MIN_COST_FOR_RATIO = 0.001;
const HIGH_VALUE_THRESHOLD = 50;
const LOW_VALUE_THRESHOLD = 10;

export function calculateContentValue(entityId: string): ContentValueResult {
  const performance = getPerformance(entityId);
  const costAnalytics = getCostAnalytics();
  const articleCost = costAnalytics.getArticleCost(entityId);

  const performanceScore = performance?.score ?? 0;
  const aiCost = articleCost?.totalCost ?? 0;

  const isProtected = performanceScore > HIGH_PERFORMING_SCORE_THRESHOLD;

  let ratio: number;
  let value: number;

  if (aiCost <= 0) {
    ratio = performanceScore > 0 ? performanceScore * 100 : 0;
    value = performanceScore;
  } else {
    const effectiveCost = Math.max(aiCost, MIN_COST_FOR_RATIO);
    ratio = performanceScore / effectiveCost;
    value = Math.min(100, ratio);
  }

  let recommendation: ContentValueResult["recommendation"];

  if (isProtected) {
    recommendation = "protected";
  } else if (performanceScore === 0 && aiCost === 0) {
    recommendation = "insufficient-data";
  } else if (value < LOW_VALUE_THRESHOLD && aiCost > 0) {
    recommendation = "improve";
  } else if (value >= HIGH_VALUE_THRESHOLD) {
    recommendation = "maintain";
  } else {
    recommendation = "improve";
  }

  const result: ContentValueResult = {
    entityId,
    value: Math.round(value * 100) / 100,
    performance: performanceScore,
    aiCost: Math.round(aiCost * 10000) / 10000,
    ratio: Math.round(ratio * 100) / 100,
    isProtected,
    recommendation,
  };

  logger.audit("Content value calculated", {
    entityId,
    value: result.value,
    performance: result.performance,
    aiCost: result.aiCost,
    ratio: result.ratio,
    isProtected,
    recommendation,
  });

  return result;
}

export function getImprovementCandidates(limit: number = 50): ContentValueResult[] {
  const costAnalytics = getCostAnalytics();
  const articleCosts = costAnalytics.getArticleCosts();

  const candidates: ContentValueResult[] = [];

  for (const articleCost of articleCosts) {
    const valueResult = calculateContentValue(articleCost.articleId);

    if (!valueResult.isProtected && valueResult.recommendation === "improve") {
      candidates.push(valueResult);
    }
  }

  return candidates
    .sort((a, b) => {
      if (a.ratio !== b.ratio) {
        return a.ratio - b.ratio;
      }
      return a.performance - b.performance;
    })
    .slice(0, limit);
}

export function getHighValueContent(limit: number = 50): ContentValueResult[] {
  const costAnalytics = getCostAnalytics();
  const articleCosts = costAnalytics.getArticleCosts();

  const highValue: ContentValueResult[] = [];

  for (const articleCost of articleCosts) {
    const valueResult = calculateContentValue(articleCost.articleId);

    if (valueResult.value >= HIGH_VALUE_THRESHOLD) {
      highValue.push(valueResult);
    }
  }

  return highValue.sort((a, b) => b.value - a.value).slice(0, limit);
}

export function getProtectedContent(): ContentValueResult[] {
  const costAnalytics = getCostAnalytics();
  const articleCosts = costAnalytics.getArticleCosts();

  const protected_: ContentValueResult[] = [];

  for (const articleCost of articleCosts) {
    const valueResult = calculateContentValue(articleCost.articleId);

    if (valueResult.isProtected) {
      protected_.push(valueResult);
    }
  }

  return protected_.sort((a, b) => b.performance - a.performance);
}

export function getContentValueSummary(): ContentValueSummary {
  const costAnalytics = getCostAnalytics();
  const articleCosts = costAnalytics.getArticleCosts();

  let highValueCount = 0;
  let lowValueCount = 0;
  let protectedCount = 0;
  let insufficientDataCount = 0;
  let totalValue = 0;
  const allResults: ContentValueResult[] = [];

  for (const articleCost of articleCosts) {
    const valueResult = calculateContentValue(articleCost.articleId);
    allResults.push(valueResult);
    totalValue += valueResult.value;

    if (valueResult.isProtected) {
      protectedCount++;
    } else if (valueResult.recommendation === "insufficient-data") {
      insufficientDataCount++;
    } else if (valueResult.value >= HIGH_VALUE_THRESHOLD) {
      highValueCount++;
    } else if (valueResult.value < LOW_VALUE_THRESHOLD) {
      lowValueCount++;
    }
  }

  const topCandidates = allResults
    .filter(r => !r.isProtected && r.recommendation === "improve")
    .sort((a, b) => a.value - b.value)
    .slice(0, 10);

  return {
    highValueCount,
    lowValueCount,
    protectedCount,
    insufficientDataCount,
    averageValue:
      allResults.length > 0 ? Math.round((totalValue / allResults.length) * 100) / 100 : 0,
    topCandidates,
  };
}

export function isContentProtected(entityId: string): boolean {
  const score = getPerformanceScore(entityId);
  return score > HIGH_PERFORMING_SCORE_THRESHOLD;
}

export function canImproveContent(entityId: string): {
  allowed: boolean;
  reason: string;
  value?: ContentValueResult;
} {
  const valueResult = calculateContentValue(entityId);

  if (valueResult.isProtected) {
    return {
      allowed: false,
      reason: `Content is protected (performance score: ${valueResult.performance} > ${HIGH_PERFORMING_SCORE_THRESHOLD})`,
      value: valueResult,
    };
  }

  if (valueResult.recommendation === "maintain") {
    return {
      allowed: false,
      reason: `Content has high value (${valueResult.value}) - no improvement needed`,
      value: valueResult,
    };
  }

  return {
    allowed: true,
    reason:
      valueResult.recommendation === "improve"
        ? `Content needs improvement (value: ${valueResult.value}, ratio: ${valueResult.ratio})`
        : "Content has insufficient data for full analysis",
    value: valueResult,
  };
}

export { HIGH_PERFORMING_SCORE_THRESHOLD } from "./metrics/content-performance";
export { HIGH_VALUE_THRESHOLD, LOW_VALUE_THRESHOLD };
