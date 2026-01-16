/**
 * Content Value Automation - Automated Content Improvement System
 * 
 * TASK 3: CONTENT VALUE AUTOMATION
 * 
 * Automatically decides what content is worth improving based on:
 * - Content value score = performance ÷ AI cost
 * - Automatic queueing of high-value improvements
 * - Identification of low-cost wins (quick SEO fixes)
 * 
 * HARD CONSTRAINTS:
 * - NEVER modify high-performing content (score > 80)
 * - Use existing background-scheduler from Phase 10
 * - In-memory only, no schema changes
 */

import { log } from '../lib/logger';
import { getPerformance, getPerformanceScore, getAllPerformance, HIGH_PERFORMING_SCORE_THRESHOLD } from './metrics/content-performance';
import { getCostAnalytics } from '../ai-orchestrator/cost-analytics';
import { getBackgroundScheduler, scheduleBackgroundJob, type BackgroundJobPriority } from '../jobs/background-scheduler';
import { getLoadTierManager } from '../system/load-tiers';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ValueAutomation] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[ValueAutomation] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[ValueAutomation] ${msg}`, undefined, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ValueAutomation][AUDIT] ${msg}`, data),
};

export type ContentRecommendation = 'improve' | 'maintain' | 'archive' | 'protect';

export interface ContentValueResult {
  entityId: string;
  valueScore: number;
  performance: number;
  aiCost: number;
  recommendation: ContentRecommendation;
}

export interface AutomationQueueResult {
  scheduled: number;
  skipped: number;
  protected: number;
  jobIds: string[];
  errors: string[];
}

export interface LowCostWin {
  entityId: string;
  currentPerformance: number;
  estimatedCost: number;
  potentialGain: number;
  type: 'seo' | 'meta' | 'structure';
}

export interface AutomationSummary {
  totalContent: number;
  protectedCount: number;
  improveCount: number;
  maintainCount: number;
  archiveCount: number;
  queuedCount: number;
  lowCostWins: LowCostWin[];
  lastRunAt?: Date;
  canRun: boolean;
  tier: string;
}

const MIN_COST_FOR_RATIO = 0.001;
const ARCHIVE_THRESHOLD = 5;
const LOW_COST_WIN_THRESHOLD = 0.02;
const SEO_FIX_PERFORMANCE_CEILING = 40;
const MAX_AUTO_QUEUE_SIZE = 10;
const HIGH_PERFORMING_THRESHOLD = 80;

let lastAutomationRun: Date | undefined;
let automationRunCount = 0;

/**
 * Calculate content value score
 * 
 * Formula: valueScore = performance ÷ AI cost
 * 
 * Returns recommendation:
 * - 'protect': High-performing content (score > 80) - NEVER touch
 * - 'improve': Low value, needs improvement
 * - 'maintain': Good value, keep as is
 * - 'archive': Very low value, consider archiving
 */
export function calculateContentValue(entityId: string): ContentValueResult {
  const performance = getPerformance(entityId);
  const costAnalytics = getCostAnalytics();
  const articleCost = costAnalytics.getArticleCost(entityId);
  
  const performanceScore = performance?.score ?? 0;
  const aiCost = articleCost?.totalCost ?? 0;
  
  if (performanceScore > HIGH_PERFORMING_THRESHOLD) {
    logger.audit('Protected content detected', {
      entityId,
      performance: performanceScore,
      threshold: HIGH_PERFORMING_THRESHOLD,
    });
    
    return {
      entityId,
      valueScore: 100,
      performance: performanceScore,
      aiCost: Math.round(aiCost * 10000) / 10000,
      recommendation: 'protect',
    };
  }
  
  let valueScore: number;
  
  if (aiCost <= 0) {
    valueScore = performanceScore > 0 ? Math.min(100, performanceScore * 2) : 0;
  } else {
    const effectiveCost = Math.max(aiCost, MIN_COST_FOR_RATIO);
    valueScore = Math.min(100, (performanceScore / effectiveCost) * 0.1);
  }
  
  let recommendation: ContentRecommendation;
  
  if (valueScore < ARCHIVE_THRESHOLD && performanceScore < 10 && aiCost > 0.1) {
    recommendation = 'archive';
  } else if (valueScore < 30 || performanceScore < 30) {
    recommendation = 'improve';
  } else {
    recommendation = 'maintain';
  }
  
  const result: ContentValueResult = {
    entityId,
    valueScore: Math.round(valueScore * 100) / 100,
    performance: performanceScore,
    aiCost: Math.round(aiCost * 10000) / 10000,
    recommendation,
  };
  
  logger.audit('Content value calculated', {
    entityId,
    valueScore: result.valueScore,
    performance: result.performance,
    aiCost: result.aiCost,
    recommendation,
  });
  
  return result;
}

/**
 * Check if content is protected from automatic modifications
 * 
 * HARD CONSTRAINT: Content with performance score > 80 is NEVER touched
 */
export function isContentProtected(entityId: string): boolean {
  const score = getPerformanceScore(entityId);
  return score > HIGH_PERFORMING_THRESHOLD;
}

/**
 * Queue high-value improvements automatically
 * 
 * Queues content for improvement based on:
 * - Low cost to improve (hasn't had much AI spend)
 * - High potential (currently underperforming)
 * - NOT protected (score <= 80)
 * 
 * Uses existing background-scheduler from Phase 10
 */
export function queueHighValueImprovements(maxItems: number = MAX_AUTO_QUEUE_SIZE): AutomationQueueResult {
  const loadTierManager = getLoadTierManager();
  const currentTier = loadTierManager.getLoadTier();
  
  if (currentTier !== 'green') {
    logger.info('Automation skipped - system not in green tier', { tier: currentTier });
    return {
      scheduled: 0,
      skipped: 0,
      protected: 0,
      jobIds: [],
      errors: [`System load tier is ${currentTier} - automation only runs in green tier`],
    };
  }
  
  const allPerformance = getAllPerformance();
  const costAnalytics = getCostAnalytics();
  
  const candidates: Array<{
    entityId: string;
    value: ContentValueResult;
    priority: BackgroundJobPriority;
  }> = [];
  
  let protectedCount = 0;
  let skippedCount = 0;
  
  for (const perf of allPerformance) {
    if (perf.score > HIGH_PERFORMING_THRESHOLD) {
      protectedCount++;
      continue;
    }
    
    const value = calculateContentValue(perf.entityId);
    
    if (value.recommendation === 'protect') {
      protectedCount++;
      continue;
    }
    
    if (value.recommendation === 'maintain') {
      skippedCount++;
      continue;
    }
    
    const priority: BackgroundJobPriority = 
      value.recommendation === 'improve' && value.valueScore < 10 ? 'medium' : 'low';
    
    candidates.push({
      entityId: perf.entityId,
      value,
      priority,
    });
  }
  
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === 'medium' ? -1 : 1;
    }
    return a.value.valueScore - b.value.valueScore;
  });
  
  const toQueue = candidates.slice(0, maxItems);
  const jobIds: string[] = [];
  const errors: string[] = [];
  
  for (const candidate of toQueue) {
    try {
      const jobId = scheduleBackgroundJob(
        'content-value-improvement',
        candidate.entityId,
        candidate.priority
      );
      jobIds.push(jobId);
      
      logger.audit('Improvement job scheduled', {
        jobId,
        entityId: candidate.entityId,
        valueScore: candidate.value.valueScore,
        recommendation: candidate.value.recommendation,
        priority: candidate.priority,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to queue ${candidate.entityId}: ${errorMsg}`);
      logger.error('Failed to schedule improvement', {
        entityId: candidate.entityId,
        error: errorMsg,
      });
    }
  }
  
  lastAutomationRun = new Date();
  automationRunCount++;
  
  logger.info('High-value improvements queued', {
    scheduled: jobIds.length,
    skipped: skippedCount,
    protected: protectedCount,
    runNumber: automationRunCount,
  });
  
  return {
    scheduled: jobIds.length,
    skipped: skippedCount,
    protected: protectedCount,
    jobIds,
    errors,
  };
}

/**
 * Identify low-cost wins (quick SEO fixes)
 * 
 * Finds content that:
 * - Has low AI cost to date (< $0.02)
 * - Has low performance (< 40)
 * - Is NOT protected
 * 
 * These are quick fixes that can improve SEO with minimal investment
 */
export function identifyLowCostWins(limit: number = 20): LowCostWin[] {
  const allPerformance = getAllPerformance();
  const lowCostWins: LowCostWin[] = [];
  
  for (const perf of allPerformance) {
    if (perf.score > HIGH_PERFORMING_THRESHOLD) {
      continue;
    }
    
    if (perf.score > SEO_FIX_PERFORMANCE_CEILING) {
      continue;
    }
    
    const value = calculateContentValue(perf.entityId);
    
    if (value.aiCost > LOW_COST_WIN_THRESHOLD) {
      continue;
    }
    
    const potentialGain = Math.min(50, HIGH_PERFORMING_THRESHOLD - perf.score);
    
    let type: LowCostWin['type'];
    if (perf.score < 10) {
      type = 'meta';
    } else if (perf.score < 25) {
      type = 'seo';
    } else {
      type = 'structure';
    }
    
    lowCostWins.push({
      entityId: perf.entityId,
      currentPerformance: perf.score,
      estimatedCost: Math.max(0.005, value.aiCost * 0.5),
      potentialGain,
      type,
    });
  }
  
  const sorted = lowCostWins.sort((a, b) => {
    const aRoi = a.potentialGain / a.estimatedCost;
    const bRoi = b.potentialGain / b.estimatedCost;
    return bRoi - aRoi;
  });
  
  logger.info('Low-cost wins identified', {
    total: sorted.length,
    returned: Math.min(limit, sorted.length),
  });
  
  return sorted.slice(0, limit);
}

/**
 * Queue low-cost wins for SEO improvement
 * 
 * Schedules SEO improvement jobs for low-cost win candidates
 */
export function queueLowCostWins(maxItems: number = 10): AutomationQueueResult {
  const loadTierManager = getLoadTierManager();
  const currentTier = loadTierManager.getLoadTier();
  
  if (currentTier !== 'green') {
    logger.info('Low-cost wins skipped - system not in green tier', { tier: currentTier });
    return {
      scheduled: 0,
      skipped: 0,
      protected: 0,
      jobIds: [],
      errors: [`System load tier is ${currentTier} - automation only runs in green tier`],
    };
  }
  
  const wins = identifyLowCostWins(maxItems * 2);
  const jobIds: string[] = [];
  const errors: string[] = [];
  let protectedCount = 0;
  
  for (const win of wins.slice(0, maxItems)) {
    if (isContentProtected(win.entityId)) {
      protectedCount++;
      continue;
    }
    
    try {
      const jobId = scheduleBackgroundJob(
        'seo-improvement',
        win.entityId,
        'low'
      );
      jobIds.push(jobId);
      
      logger.audit('Low-cost SEO job scheduled', {
        jobId,
        entityId: win.entityId,
        type: win.type,
        potentialGain: win.potentialGain,
        estimatedCost: win.estimatedCost,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to queue ${win.entityId}: ${errorMsg}`);
    }
  }
  
  logger.info('Low-cost wins queued', {
    scheduled: jobIds.length,
    protected: protectedCount,
    runNumber: automationRunCount,
  });
  
  return {
    scheduled: jobIds.length,
    skipped: wins.length - jobIds.length - protectedCount,
    protected: protectedCount,
    jobIds,
    errors,
  };
}

/**
 * Run full automation cycle
 * 
 * Executes both high-value improvements and low-cost wins queueing
 */
export function runAutomationCycle(options?: {
  maxHighValue?: number;
  maxLowCost?: number;
}): {
  highValue: AutomationQueueResult;
  lowCost: AutomationQueueResult;
  summary: AutomationSummary;
} {
  const maxHighValue = options?.maxHighValue ?? MAX_AUTO_QUEUE_SIZE;
  const maxLowCost = options?.maxLowCost ?? 5;
  
  const highValue = queueHighValueImprovements(maxHighValue);
  const lowCost = queueLowCostWins(maxLowCost);
  const summary = getAutomationSummary();
  
  logger.audit('Automation cycle completed', {
    highValueScheduled: highValue.scheduled,
    lowCostScheduled: lowCost.scheduled,
    totalProtected: highValue.protected + lowCost.protected,
    runNumber: automationRunCount,
  });
  
  return {
    highValue,
    lowCost,
    summary,
  };
}

/**
 * Get automation summary
 * 
 * Returns overview of all content with recommendations
 */
export function getAutomationSummary(): AutomationSummary {
  const allPerformance = getAllPerformance();
  const loadTierManager = getLoadTierManager();
  const scheduler = getBackgroundScheduler();
  
  let protectedCount = 0;
  let improveCount = 0;
  let maintainCount = 0;
  let archiveCount = 0;
  
  for (const perf of allPerformance) {
    const value = calculateContentValue(perf.entityId);
    
    switch (value.recommendation) {
      case 'protect':
        protectedCount++;
        break;
      case 'improve':
        improveCount++;
        break;
      case 'maintain':
        maintainCount++;
        break;
      case 'archive':
        archiveCount++;
        break;
    }
  }
  
  const lowCostWins = identifyLowCostWins(10);
  const schedulerMetrics = scheduler.getMetrics();
  const currentTier = loadTierManager.getLoadTier();
  
  return {
    totalContent: allPerformance.length,
    protectedCount,
    improveCount,
    maintainCount,
    archiveCount,
    queuedCount: schedulerMetrics.currentQueueSize,
    lowCostWins,
    lastRunAt: lastAutomationRun,
    canRun: currentTier === 'green',
    tier: currentTier,
  };
}

/**
 * Check if content can be automatically improved
 * 
 * Returns whether automation is allowed for this entity
 */
export function canAutoImprove(entityId: string): {
  allowed: boolean;
  reason: string;
  value?: ContentValueResult;
} {
  const value = calculateContentValue(entityId);
  
  if (value.recommendation === 'protect') {
    return {
      allowed: false,
      reason: `Content is protected (performance: ${value.performance} > ${HIGH_PERFORMING_THRESHOLD})`,
      value,
    };
  }
  
  if (value.recommendation === 'maintain') {
    return {
      allowed: false,
      reason: `Content is performing well (value score: ${value.valueScore}) - no improvement needed`,
      value,
    };
  }
  
  return {
    allowed: true,
    reason: value.recommendation === 'improve'
      ? `Content needs improvement (value score: ${value.valueScore})`
      : `Content recommended for archive (value score: ${value.valueScore})`,
    value,
  };
}

/**
 * Get content by recommendation type
 */
export function getContentByRecommendation(recommendation: ContentRecommendation, limit: number = 50): ContentValueResult[] {
  const allPerformance = getAllPerformance();
  const results: ContentValueResult[] = [];
  
  for (const perf of allPerformance) {
    const value = calculateContentValue(perf.entityId);
    
    if (value.recommendation === recommendation) {
      results.push(value);
    }
    
    if (results.length >= limit) break;
  }
  
  return results.sort((a, b) => {
    if (recommendation === 'improve' || recommendation === 'archive') {
      return a.valueScore - b.valueScore;
    }
    return b.valueScore - a.valueScore;
  });
}

/**
 * Get protected content (for reporting)
 */
export function getProtectedContent(limit: number = 50): ContentValueResult[] {
  return getContentByRecommendation('protect', limit);
}

/**
 * Reset automation state (for testing)
 */
export function resetAutomationState(): void {
  lastAutomationRun = undefined;
  automationRunCount = 0;
  logger.info('Automation state reset');
}

export {
  HIGH_PERFORMING_THRESHOLD,
  ARCHIVE_THRESHOLD,
  LOW_COST_WIN_THRESHOLD,
  MAX_AUTO_QUEUE_SIZE,
};
