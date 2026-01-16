/**
 * Content Value Queue - Automatic Improvement Queueing
 * 
 * TASK 3: CONTENT VALUE AUTOMATION
 * 
 * Automatically queues content for improvement based on:
 * - High value score + low recent AI spend
 * - Quick improvement opportunities (low-cost wins)
 * 
 * HARD CONSTRAINTS:
 * - NEVER queue content with performance score > 80 (protected)
 * - Use existing performance + cost systems
 * - Additive only
 */

import { log } from '../lib/logger';
import { getLoadTierManager } from '../system/load-tiers';
import { getCostAnalytics } from '../ai-orchestrator/cost-analytics';
import { 
  calculateContentValue, 
  getImprovementCandidates,
  isContentProtected,
  type ContentValueResult,
  HIGH_PERFORMING_SCORE_THRESHOLD,
} from './value-scorer';
import { getPerformanceScore, getAllPerformance } from './metrics/content-performance';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ValueQueue] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[ValueQueue] ${msg}`, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ValueQueue][AUDIT] ${msg}`, data),
};

export interface QueuedImprovement {
  entityId: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  estimatedImpact: number;
  currentValue: number;
  aiCostToDate: number;
}

export interface QueueResult {
  success: boolean;
  queuedItems: QueuedImprovement[];
  skippedCount: number;
  protectedCount: number;
  reason?: string;
}

const MAX_QUEUE_SIZE = 20;
const LOW_COST_THRESHOLD = 0.05;
const HIGH_IMPACT_PERFORMANCE_THRESHOLD = 30;
const RECENT_SPEND_DAYS = 7;

function getRecentAISpend(entityId: string): number {
  const costAnalytics = getCostAnalytics();
  const articleCost = costAnalytics.getArticleCost(entityId);
  
  if (!articleCost) return 0;
  
  return articleCost.totalCost;
}

function isRecentlyImproved(entityId: string): boolean {
  const costAnalytics = getCostAnalytics();
  const articleCost = costAnalytics.getArticleCost(entityId);
  
  if (!articleCost) return false;
  
  const daysSinceUpdate = (Date.now() - articleCost.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceUpdate < RECENT_SPEND_DAYS;
}

function calculatePriority(valueResult: ContentValueResult): 'high' | 'medium' | 'low' {
  if (valueResult.performance < 20 && valueResult.aiCost > 0.1) {
    return 'high';
  }
  
  if (valueResult.ratio < 10) {
    return 'high';
  }
  
  if (valueResult.performance < 40) {
    return 'medium';
  }
  
  return 'low';
}

function calculateEstimatedImpact(valueResult: ContentValueResult): number {
  const performanceGap = 80 - valueResult.performance;
  const costEfficiency = valueResult.aiCost > 0 
    ? Math.min(1, 0.1 / valueResult.aiCost) 
    : 1;
  
  return Math.round((performanceGap * costEfficiency) * 10) / 10;
}

export function queueHighValueImprovements(maxItems: number = MAX_QUEUE_SIZE): QueueResult {
  const loadTierManager = getLoadTierManager();
  const currentTier = loadTierManager.getLoadTier();
  
  if (currentTier !== 'green') {
    logger.info('Skipping queue - system not in green tier', { tier: currentTier });
    return {
      success: false,
      queuedItems: [],
      skippedCount: 0,
      protectedCount: 0,
      reason: `System load tier is ${currentTier} - queueing only allowed in green tier`,
    };
  }
  
  const candidates = getImprovementCandidates(maxItems * 2);
  const queuedItems: QueuedImprovement[] = [];
  let skippedCount = 0;
  let protectedCount = 0;
  
  for (const candidate of candidates) {
    if (queuedItems.length >= maxItems) break;
    
    if (candidate.isProtected || candidate.performance > HIGH_PERFORMING_SCORE_THRESHOLD) {
      protectedCount++;
      logger.warn('Skipping protected content', {
        entityId: candidate.entityId,
        performance: candidate.performance,
      });
      continue;
    }
    
    if (isRecentlyImproved(candidate.entityId)) {
      skippedCount++;
      continue;
    }
    
    const recentSpend = getRecentAISpend(candidate.entityId);
    const priority = calculatePriority(candidate);
    const estimatedImpact = calculateEstimatedImpact(candidate);
    
    queuedItems.push({
      entityId: candidate.entityId,
      priority,
      reason: `Low value score (${candidate.value}) with ratio ${candidate.ratio}`,
      estimatedImpact,
      currentValue: candidate.value,
      aiCostToDate: recentSpend,
    });
    
    logger.audit('Queued high-value improvement', {
      entityId: candidate.entityId,
      priority,
      currentValue: candidate.value,
      estimatedImpact,
    });
  }
  
  queuedItems.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.estimatedImpact - a.estimatedImpact;
  });
  
  logger.info('High-value improvements queued', {
    queued: queuedItems.length,
    skipped: skippedCount,
    protected: protectedCount,
  });
  
  return {
    success: true,
    queuedItems,
    skippedCount,
    protectedCount,
  };
}

export function queueLowCostWins(maxItems: number = MAX_QUEUE_SIZE): QueueResult {
  const loadTierManager = getLoadTierManager();
  const currentTier = loadTierManager.getLoadTier();
  
  if (currentTier !== 'green') {
    logger.info('Skipping queue - system not in green tier', { tier: currentTier });
    return {
      success: false,
      queuedItems: [],
      skippedCount: 0,
      protectedCount: 0,
      reason: `System load tier is ${currentTier} - queueing only allowed in green tier`,
    };
  }
  
  const allPerformance = getAllPerformance();
  const queuedItems: QueuedImprovement[] = [];
  let skippedCount = 0;
  let protectedCount = 0;
  
  const lowCostCandidates = allPerformance
    .filter(perf => {
      if (perf.score > HIGH_PERFORMING_SCORE_THRESHOLD) {
        protectedCount++;
        return false;
      }
      
      const valueResult = calculateContentValue(perf.entityId);
      return valueResult.aiCost < LOW_COST_THRESHOLD && perf.score < HIGH_IMPACT_PERFORMANCE_THRESHOLD;
    })
    .sort((a, b) => a.score - b.score);
  
  for (const candidate of lowCostCandidates) {
    if (queuedItems.length >= maxItems) break;
    
    if (isRecentlyImproved(candidate.entityId)) {
      skippedCount++;
      continue;
    }
    
    const valueResult = calculateContentValue(candidate.entityId);
    const estimatedImpact = calculateEstimatedImpact(valueResult);
    
    queuedItems.push({
      entityId: candidate.entityId,
      priority: 'medium',
      reason: `Low-cost improvement opportunity (cost: $${valueResult.aiCost.toFixed(4)}, performance: ${candidate.score})`,
      estimatedImpact,
      currentValue: valueResult.value,
      aiCostToDate: valueResult.aiCost,
    });
    
    logger.audit('Queued low-cost win', {
      entityId: candidate.entityId,
      currentCost: valueResult.aiCost,
      performance: candidate.score,
      estimatedImpact,
    });
  }
  
  logger.info('Low-cost wins queued', {
    queued: queuedItems.length,
    skipped: skippedCount,
    protected: protectedCount,
  });
  
  return {
    success: true,
    queuedItems,
    skippedCount,
    protectedCount,
  };
}

export function getQueueSummary(): {
  highValueQueue: QueueResult;
  lowCostQueue: QueueResult;
  totalQueued: number;
  canProcess: boolean;
  tier: string;
} {
  const loadTierManager = getLoadTierManager();
  const currentTier = loadTierManager.getLoadTier();
  
  const highValueQueue = queueHighValueImprovements(10);
  const lowCostQueue = queueLowCostWins(10);
  
  return {
    highValueQueue,
    lowCostQueue,
    totalQueued: highValueQueue.queuedItems.length + lowCostQueue.queuedItems.length,
    canProcess: currentTier === 'green',
    tier: currentTier,
  };
}

export function shouldQueueImprovement(entityId: string): {
  should: boolean;
  reason: string;
  priority?: 'high' | 'medium' | 'low';
} {
  const performanceScore = getPerformanceScore(entityId);
  
  if (performanceScore > HIGH_PERFORMING_SCORE_THRESHOLD) {
    return {
      should: false,
      reason: `Content is protected (performance: ${performanceScore} > ${HIGH_PERFORMING_SCORE_THRESHOLD})`,
    };
  }
  
  if (isRecentlyImproved(entityId)) {
    return {
      should: false,
      reason: 'Content was recently improved - in cooldown period',
    };
  }
  
  const valueResult = calculateContentValue(entityId);
  const priority = calculatePriority(valueResult);
  
  if (valueResult.recommendation === 'improve') {
    return {
      should: true,
      reason: `Content needs improvement (value: ${valueResult.value}, ratio: ${valueResult.ratio})`,
      priority,
    };
  }
  
  return {
    should: false,
    reason: valueResult.recommendation === 'maintain' 
      ? 'Content is performing well'
      : 'Insufficient data for improvement decision',
  };
}

export { MAX_QUEUE_SIZE, LOW_COST_THRESHOLD, HIGH_IMPACT_PERFORMANCE_THRESHOLD };
