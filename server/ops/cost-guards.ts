/**
 * Operations & Reliability - Cost & Usage Guardrails
 *
 * FEATURE 2: Track AI usage per feature and enforce spending limits
 * - Per-feature tracking (search, AEO, chat, Octopus)
 * - Hard ceiling enforcement
 * - Auto-degradation when limits hit
 *
 * Feature flag: ENABLE_COST_GUARDS=true
 */

import { log } from '../lib/logger';
import { getOpsConfig } from './config';
import type { Feature, UsageBudget } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[CostGuards] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[CostGuards] ${msg}`, data),
  alert: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[CostGuards][ALERT] ${msg}`, data),
};

interface FeatureUsage {
  feature: Feature;
  dailyUsedUsd: number;
  monthlyUsedUsd: number;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  requestCount: number;
  lastUsedAt?: Date;
  degradedSince?: Date;
}

interface CostCheckResult {
  allowed: boolean;
  reason?: string;
  usagePercent: number;
  degraded: boolean;
  remainingDailyUsd: number;
  remainingMonthlyUsd: number;
}

// Bounded usage history (prevents unbounded memory)
const MAX_USAGE_HISTORY = 1000;

interface UsageHistoryEntry {
  feature: Feature;
  costUsd: number;
  tokens: number;
  timestamp: Date;
}

// Default limits per feature
const DEFAULT_FEATURE_LIMITS: Record<Feature, { daily: number; monthly: number }> = {
  search: { daily: 20, monthly: 200 },
  aeo: { daily: 30, monthly: 300 },
  chat: { daily: 25, monthly: 250 },
  octopus: { daily: 15, monthly: 150 },
};

class CostGuards {
  private featureUsage: Map<Feature, FeatureUsage> = new Map();
  private usageHistory: UsageHistoryEntry[] = [];
  private resetDailyTimer: ReturnType<typeof setInterval> | null = null;
  private lastDailyReset: Date = new Date();
  private lastMonthlyReset: Date = new Date();

  constructor() {
    this.initializeFeatures();
    this.scheduleResets();
  }

  /**
   * Initialize usage tracking for all features
   */
  private initializeFeatures(): void {
    const config = getOpsConfig();
    const features: Feature[] = ['search', 'aeo', 'chat', 'octopus'];

    for (const feature of features) {
      const limits = DEFAULT_FEATURE_LIMITS[feature];
      this.featureUsage.set(feature, {
        feature,
        dailyUsedUsd: 0,
        monthlyUsedUsd: 0,
        dailyLimitUsd: limits.daily,
        monthlyLimitUsd: limits.monthly,
        requestCount: 0,
      });
    }

    logger.info('Cost guards initialized', { features });
  }

  /**
   * Schedule daily and monthly resets
   */
  private scheduleResets(): void {
    // Check for resets every hour
    this.resetDailyTimer = setInterval(() => {
      this.checkAndPerformResets();
    }, 3600000); // 1 hour
  }

  /**
   * Check and perform daily/monthly resets
   */
  private checkAndPerformResets(): void {
    const now = new Date();

    // Check for daily reset (different day)
    if (now.toDateString() !== this.lastDailyReset.toDateString()) {
      this.resetDaily();
      this.lastDailyReset = now;
    }

    // Check for monthly reset (different month)
    if (now.getMonth() !== this.lastMonthlyReset.getMonth() ||
        now.getFullYear() !== this.lastMonthlyReset.getFullYear()) {
      this.resetMonthly();
      this.lastMonthlyReset = now;
    }
  }

  /**
   * Check if a feature can make an AI request
   * Returns whether the request should proceed
   */
  checkCost(feature: Feature, estimatedCostUsd: number = 0): CostCheckResult {
    const config = getOpsConfig();

    if (!config.costGuardsEnabled) {
      return {
        allowed: true,
        usagePercent: 0,
        degraded: false,
        remainingDailyUsd: Infinity,
        remainingMonthlyUsd: Infinity,
      };
    }

    const usage = this.featureUsage.get(feature);
    if (!usage) {
      return {
        allowed: true,
        usagePercent: 0,
        degraded: false,
        remainingDailyUsd: Infinity,
        remainingMonthlyUsd: Infinity,
      };
    }

    const dailyAfter = usage.dailyUsedUsd + estimatedCostUsd;
    const monthlyAfter = usage.monthlyUsedUsd + estimatedCostUsd;

    const dailyPercent = (dailyAfter / usage.dailyLimitUsd) * 100;
    const monthlyPercent = (monthlyAfter / usage.monthlyLimitUsd) * 100;
    const usagePercent = Math.max(dailyPercent, monthlyPercent);

    const remainingDailyUsd = Math.max(0, usage.dailyLimitUsd - usage.dailyUsedUsd);
    const remainingMonthlyUsd = Math.max(0, usage.monthlyLimitUsd - usage.monthlyUsedUsd);

    // Check hard ceiling
    if (usagePercent >= config.cost.hardCeilingPercent) {
      const reason = dailyPercent >= monthlyPercent
        ? `Daily limit exceeded for ${feature}`
        : `Monthly limit exceeded for ${feature}`;

      if (!usage.degradedSince) {
        usage.degradedSince = new Date();
        logger.alert('Feature degraded due to cost ceiling', {
          feature,
          dailyUsed: usage.dailyUsedUsd,
          dailyLimit: usage.dailyLimitUsd,
          monthlyUsed: usage.monthlyUsedUsd,
          monthlyLimit: usage.monthlyLimitUsd,
        });
      }

      return {
        allowed: false,
        reason,
        usagePercent,
        degraded: true,
        remainingDailyUsd,
        remainingMonthlyUsd,
      };
    }

    // Check warning threshold
    if (usagePercent >= config.cost.warningThresholdPercent) {
      logger.warn('Cost warning threshold reached', {
        feature,
        usagePercent: Math.round(usagePercent),
        remainingDailyUsd,
        remainingMonthlyUsd,
      });
    }

    return {
      allowed: true,
      usagePercent,
      degraded: false,
      remainingDailyUsd,
      remainingMonthlyUsd,
    };
  }

  /**
   * Record actual usage after an AI call
   */
  recordUsage(feature: Feature, costUsd: number, tokens: number = 0): void {
    const config = getOpsConfig();

    if (!config.costGuardsEnabled) return;

    const usage = this.featureUsage.get(feature);
    if (!usage) return;

    usage.dailyUsedUsd += costUsd;
    usage.monthlyUsedUsd += costUsd;
    usage.requestCount++;
    usage.lastUsedAt = new Date();

    // Add to bounded history
    this.usageHistory.push({
      feature,
      costUsd,
      tokens,
      timestamp: new Date(),
    });

    if (this.usageHistory.length > MAX_USAGE_HISTORY) {
      this.usageHistory.shift();
    }

    logger.info('Usage recorded', {
      feature,
      costUsd,
      tokens,
      dailyTotal: usage.dailyUsedUsd,
      monthlyTotal: usage.monthlyUsedUsd,
    });
  }

  /**
   * Get usage summary for a feature
   */
  getFeatureUsage(feature: Feature): UsageBudget | undefined {
    const usage = this.featureUsage.get(feature);
    if (!usage) return undefined;

    return {
      feature,
      dailyLimitUsd: usage.dailyLimitUsd,
      monthlyLimitUsd: usage.monthlyLimitUsd,
      dailyUsedUsd: usage.dailyUsedUsd,
      monthlyUsedUsd: usage.monthlyUsedUsd,
    };
  }

  /**
   * Get usage summary for all features
   */
  getAllUsage(): UsageBudget[] {
    return Array.from(this.featureUsage.values()).map(usage => ({
      feature: usage.feature,
      dailyLimitUsd: usage.dailyLimitUsd,
      monthlyLimitUsd: usage.monthlyLimitUsd,
      dailyUsedUsd: usage.dailyUsedUsd,
      monthlyUsedUsd: usage.monthlyUsedUsd,
    }));
  }

  /**
   * Get total spending across all features
   */
  getTotalSpending(): { daily: number; monthly: number } {
    let daily = 0;
    let monthly = 0;

    for (const usage of this.featureUsage.values()) {
      daily += usage.dailyUsedUsd;
      monthly += usage.monthlyUsedUsd;
    }

    return { daily, monthly };
  }

  /**
   * Check if a feature is currently degraded
   */
  isFeatureDegraded(feature: Feature): boolean {
    const usage = this.featureUsage.get(feature);
    return usage?.degradedSince !== undefined;
  }

  /**
   * Get list of degraded features
   */
  getDegradedFeatures(): Feature[] {
    const degraded: Feature[] = [];
    for (const usage of this.featureUsage.values()) {
      if (usage.degradedSince) {
        degraded.push(usage.feature);
      }
    }
    return degraded;
  }

  /**
   * Update limits for a feature
   */
  setFeatureLimits(feature: Feature, dailyLimitUsd: number, monthlyLimitUsd: number): void {
    const usage = this.featureUsage.get(feature);
    if (!usage) return;

    usage.dailyLimitUsd = dailyLimitUsd;
    usage.monthlyLimitUsd = monthlyLimitUsd;

    // Clear degradation if new limits allow it
    if (usage.degradedSince) {
      const checkResult = this.checkCost(feature, 0);
      if (!checkResult.degraded) {
        usage.degradedSince = undefined;
        logger.info('Feature restored after limit increase', { feature });
      }
    }

    logger.info('Feature limits updated', {
      feature,
      dailyLimitUsd,
      monthlyLimitUsd,
    });
  }

  /**
   * Reset daily usage counters
   */
  resetDaily(): void {
    for (const usage of this.featureUsage.values()) {
      usage.dailyUsedUsd = 0;

      // Check if feature can be restored
      if (usage.degradedSince) {
        const monthlyPercent = (usage.monthlyUsedUsd / usage.monthlyLimitUsd) * 100;
        const config = getOpsConfig();
        if (monthlyPercent < config.cost.hardCeilingPercent) {
          usage.degradedSince = undefined;
          logger.info('Feature restored after daily reset', { feature: usage.feature });
        }
      }
    }
    logger.info('Daily usage counters reset');
  }

  /**
   * Reset monthly usage counters
   */
  resetMonthly(): void {
    for (const usage of this.featureUsage.values()) {
      usage.monthlyUsedUsd = 0;
      usage.dailyUsedUsd = 0;
      usage.degradedSince = undefined;
    }
    this.usageHistory = [];
    logger.info('Monthly usage counters reset');
  }

  /**
   * Get usage history (bounded)
   */
  getUsageHistory(): UsageHistoryEntry[] {
    return [...this.usageHistory];
  }

  /**
   * Stop the cost guards (cleanup timers)
   */
  stop(): void {
    if (this.resetDailyTimer) {
      clearInterval(this.resetDailyTimer);
      this.resetDailyTimer = null;
    }
    logger.info('Cost guards stopped');
  }
}

// Singleton instance
let instance: CostGuards | null = null;

export function getCostGuards(): CostGuards {
  if (!instance) {
    instance = new CostGuards();
  }
  return instance;
}

export function resetCostGuards(): void {
  if (instance) {
    instance.stop();
  }
  instance = null;
}

// Convenience functions for common operations
export function checkFeatureCost(feature: Feature, estimatedCostUsd: number = 0): CostCheckResult {
  return getCostGuards().checkCost(feature, estimatedCostUsd);
}

export function recordFeatureUsage(feature: Feature, costUsd: number, tokens?: number): void {
  getCostGuards().recordUsage(feature, costUsd, tokens);
}

export { CostGuards, CostCheckResult };
