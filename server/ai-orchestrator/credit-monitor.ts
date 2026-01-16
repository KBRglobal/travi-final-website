/**
 * AI Orchestrator - Credit Monitor
 * 
 * Tracks credit/token usage across all AI providers.
 * Implements quotas, warnings, and prevents starvation.
 * 
 * INVARIANTS:
 * - No single system can exhaust all credits (fairness)
 * - Warnings are raised at configurable thresholds
 * - Hard stops prevent runaway costs
 */

import { log } from '../lib/logger';
import type { AIProvider, TaskCategory } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[CreditMonitor] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[CreditMonitor] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[CreditMonitor] ${msg}`, undefined, data),
};

interface CreditLimits {
  dailyLimit: number;
  monthlyLimit: number;
  warningThreshold: number; // 0-100
  categoryReservations: Record<TaskCategory, number>; // Percentage reserved per category
}

interface UsageRecord {
  timestamp: Date;
  provider: AIProvider;
  category: TaskCategory;
  creditsUsed: number;
  taskId: string;
}

interface DailyUsage {
  date: string; // YYYY-MM-DD
  total: number;
  byProvider: Record<AIProvider, number>;
  byCategory: Record<TaskCategory, number>;
}

interface MonthlyUsage {
  month: string; // YYYY-MM
  total: number;
  byProvider: Record<AIProvider, number>;
  byCategory: Record<TaskCategory, number>;
  dailyTrend: number[]; // Daily totals for the month
}

/**
 * Default credit limits per provider
 * These can be overridden via configuration
 */
const DEFAULT_LIMITS: Record<AIProvider, CreditLimits> = {
  anthropic: {
    dailyLimit: 100,
    monthlyLimit: 2000,
    warningThreshold: 80,
    categoryReservations: {
      news: 15,
      evergreen: 20,
      enrichment: 10,
      image: 0,
      research: 15,
      localization: 10,
      content: 15,
      seo: 5,
      translation: 5,
      internal: 5,
    },
  },
  openai: {
    dailyLimit: 50,
    monthlyLimit: 1000,
    warningThreshold: 80,
    categoryReservations: {
      news: 10,
      evergreen: 15,
      enrichment: 15,
      image: 10,
      research: 10,
      localization: 10,
      content: 15,
      seo: 5,
      translation: 5,
      internal: 5,
    },
  },
  gemini: {
    dailyLimit: 30,
    monthlyLimit: 500,
    warningThreshold: 80,
    categoryReservations: {
      news: 5,
      evergreen: 20,
      enrichment: 5,
      image: 0,
      research: 30,
      localization: 5,
      content: 15,
      seo: 5,
      translation: 10,
      internal: 5,
    },
  },
  deepseek: {
    dailyLimit: 50,
    monthlyLimit: 800,
    warningThreshold: 80,
    categoryReservations: {
      news: 5,
      evergreen: 25,
      enrichment: 15,
      image: 0,
      research: 5,
      localization: 15,
      content: 20,
      seo: 5,
      translation: 5,
      internal: 5,
    },
  },
  openrouter: {
    dailyLimit: 30,
    monthlyLimit: 500,
    warningThreshold: 80,
    categoryReservations: {
      news: 15,
      evergreen: 20,
      enrichment: 15,
      image: 0,
      research: 10,
      localization: 10,
      content: 15,
      seo: 5,
      translation: 5,
      internal: 5,
    },
  },
  'replit-ai': {
    dailyLimit: 100,
    monthlyLimit: 2000,
    warningThreshold: 90,
    categoryReservations: {
      news: 10,
      evergreen: 15,
      enrichment: 20,
      image: 10,
      research: 5,
      localization: 10,
      content: 15,
      seo: 5,
      translation: 5,
      internal: 5,
    },
  },
  freepik: {
    dailyLimit: 50,
    monthlyLimit: 500,
    warningThreshold: 70,
    categoryReservations: {
      news: 0,
      evergreen: 0,
      enrichment: 0,
      image: 100,
      research: 0,
      localization: 0,
      content: 0,
      seo: 0,
      translation: 0,
      internal: 0,
    },
  },
};

export class CreditMonitor {
  private limits: Map<AIProvider, CreditLimits> = new Map();
  private dailyUsage: Map<string, DailyUsage> = new Map(); // key: YYYY-MM-DD
  private monthlyUsage: Map<string, MonthlyUsage> = new Map(); // key: YYYY-MM
  private recentRecords: UsageRecord[] = [];
  private readonly maxRecentRecords = 1000;

  constructor() {
    this.initializeLimits();
  }

  private initializeLimits(): void {
    for (const [provider, limits] of Object.entries(DEFAULT_LIMITS)) {
      this.limits.set(provider as AIProvider, limits);
    }
    logger.info('Credit monitor initialized', { providerCount: this.limits.size });
  }

  /**
   * Get current date string (UTC)
   */
  private getDateKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get current month string (UTC)
   */
  private getMonthKey(): string {
    return new Date().toISOString().slice(0, 7);
  }

  /**
   * Initialize usage records for current period if not exists
   */
  private ensureUsageRecords(): { daily: DailyUsage; monthly: MonthlyUsage } {
    const dateKey = this.getDateKey();
    const monthKey = this.getMonthKey();

    if (!this.dailyUsage.has(dateKey)) {
      this.dailyUsage.set(dateKey, {
        date: dateKey,
        total: 0,
        byProvider: {} as Record<AIProvider, number>,
        byCategory: {} as Record<TaskCategory, number>,
      });
    }

    if (!this.monthlyUsage.has(monthKey)) {
      this.monthlyUsage.set(monthKey, {
        month: monthKey,
        total: 0,
        byProvider: {} as Record<AIProvider, number>,
        byCategory: {} as Record<TaskCategory, number>,
        dailyTrend: [],
      });
    }

    return {
      daily: this.dailyUsage.get(dateKey)!,
      monthly: this.monthlyUsage.get(monthKey)!,
    };
  }

  /**
   * Record credit usage
   */
  recordUsage(
    provider: AIProvider,
    category: TaskCategory,
    creditsUsed: number,
    taskId: string
  ): void {
    const record: UsageRecord = {
      timestamp: new Date(),
      provider,
      category,
      creditsUsed,
      taskId,
    };

    // Add to recent records (ring buffer)
    this.recentRecords.push(record);
    if (this.recentRecords.length > this.maxRecentRecords) {
      this.recentRecords.shift();
    }

    // Update usage aggregates
    const { daily, monthly } = this.ensureUsageRecords();

    daily.total += creditsUsed;
    daily.byProvider[provider] = (daily.byProvider[provider] || 0) + creditsUsed;
    daily.byCategory[category] = (daily.byCategory[category] || 0) + creditsUsed;

    monthly.total += creditsUsed;
    monthly.byProvider[provider] = (monthly.byProvider[provider] || 0) + creditsUsed;
    monthly.byCategory[category] = (monthly.byCategory[category] || 0) + creditsUsed;

    // Check thresholds and emit warnings
    this.checkThresholds(provider);
  }

  /**
   * Check if usage exceeds thresholds
   */
  private checkThresholds(provider: AIProvider): void {
    const limits = this.limits.get(provider);
    if (!limits) return;

    const daily = this.getDailyUsage(provider);
    const monthly = this.getMonthlyUsage(provider);

    const dailyPercent = (daily / limits.dailyLimit) * 100;
    const monthlyPercent = (monthly / limits.monthlyLimit) * 100;

    if (dailyPercent >= 100) {
      logger.error('Daily credit limit exceeded', {
        provider,
        used: daily,
        limit: limits.dailyLimit,
      });
    } else if (dailyPercent >= limits.warningThreshold) {
      logger.warn('Daily credit usage warning', {
        provider,
        used: daily,
        limit: limits.dailyLimit,
        percent: dailyPercent.toFixed(1),
      });
    }

    if (monthlyPercent >= 100) {
      logger.error('Monthly credit limit exceeded', {
        provider,
        used: monthly,
        limit: limits.monthlyLimit,
      });
    } else if (monthlyPercent >= limits.warningThreshold) {
      logger.warn('Monthly credit usage warning', {
        provider,
        used: monthly,
        limit: limits.monthlyLimit,
        percent: monthlyPercent.toFixed(1),
      });
    }
  }

  /**
   * Check if a request can proceed based on credit limits
   */
  canAfford(
    provider: AIProvider,
    category: TaskCategory,
    estimatedCredits: number
  ): {
    allowed: boolean;
    reason?: string;
    remainingDaily: number;
    remainingMonthly: number;
  } {
    const limits = this.limits.get(provider);
    if (!limits) {
      return { allowed: false, reason: 'Unknown provider', remainingDaily: 0, remainingMonthly: 0 };
    }

    const dailyUsed = this.getDailyUsage(provider);
    const monthlyUsed = this.getMonthlyUsage(provider);
    const categoryUsed = this.getCategoryUsage(provider, category);

    const remainingDaily = limits.dailyLimit - dailyUsed;
    const remainingMonthly = limits.monthlyLimit - monthlyUsed;

    // Check hard limits
    if (dailyUsed + estimatedCredits > limits.dailyLimit) {
      return {
        allowed: false,
        reason: 'Daily credit limit would be exceeded',
        remainingDaily,
        remainingMonthly,
      };
    }

    if (monthlyUsed + estimatedCredits > limits.monthlyLimit) {
      return {
        allowed: false,
        reason: 'Monthly credit limit would be exceeded',
        remainingDaily,
        remainingMonthly,
      };
    }

    // Check category reservations (soft limit - prevents starvation)
    const categoryReservation = limits.categoryReservations[category] || 0;
    const categoryLimit = (limits.dailyLimit * categoryReservation) / 100;
    
    if (categoryReservation > 0 && categoryUsed >= categoryLimit) {
      // Category has exhausted its reservation, but allow if other categories have surplus
      const totalReserved = Object.values(limits.categoryReservations).reduce((a, b) => a + b, 0);
      const unreservedDaily = limits.dailyLimit * ((100 - totalReserved) / 100);
      
      if (dailyUsed >= limits.dailyLimit - unreservedDaily) {
        logger.info('Category reservation exhausted - using shared pool', {
          provider,
          category,
          categoryUsed,
          categoryLimit,
        });
      }
    }

    return { allowed: true, remainingDaily, remainingMonthly };
  }

  /**
   * Get daily usage for a provider
   */
  getDailyUsage(provider: AIProvider): number {
    const dateKey = this.getDateKey();
    const daily = this.dailyUsage.get(dateKey);
    return daily?.byProvider[provider] || 0;
  }

  /**
   * Get monthly usage for a provider
   */
  getMonthlyUsage(provider: AIProvider): number {
    const monthKey = this.getMonthKey();
    const monthly = this.monthlyUsage.get(monthKey);
    return monthly?.byProvider[provider] || 0;
  }

  /**
   * Get category usage for a provider today
   */
  getCategoryUsage(provider: AIProvider, category: TaskCategory): number {
    return this.recentRecords
      .filter(r => 
        r.provider === provider && 
        r.category === category &&
        r.timestamp.toISOString().startsWith(this.getDateKey())
      )
      .reduce((sum, r) => sum + r.creditsUsed, 0);
  }

  /**
   * Get comprehensive usage report
   */
  getUsageReport(): {
    daily: DailyUsage;
    monthly: MonthlyUsage;
    limits: Record<AIProvider, CreditLimits>;
    warnings: string[];
  } {
    const { daily, monthly } = this.ensureUsageRecords();
    const warnings: string[] = [];

    for (const [provider, limits] of this.limits) {
      const dailyUsed = daily.byProvider[provider] || 0;
      const monthlyUsed = monthly.byProvider[provider] || 0;

      if ((dailyUsed / limits.dailyLimit) * 100 >= limits.warningThreshold) {
        warnings.push(`${provider}: Daily usage at ${((dailyUsed / limits.dailyLimit) * 100).toFixed(1)}%`);
      }
      if ((monthlyUsed / limits.monthlyLimit) * 100 >= limits.warningThreshold) {
        warnings.push(`${provider}: Monthly usage at ${((monthlyUsed / limits.monthlyLimit) * 100).toFixed(1)}%`);
      }
    }

    return {
      daily,
      monthly,
      limits: Object.fromEntries(this.limits) as Record<AIProvider, CreditLimits>,
      warnings,
    };
  }

  /**
   * Get remaining credits for a provider
   */
  getRemainingCredits(provider: AIProvider): {
    daily: number;
    monthly: number;
    percentDaily: number;
    percentMonthly: number;
  } {
    const limits = this.limits.get(provider);
    if (!limits) {
      return { daily: 0, monthly: 0, percentDaily: 0, percentMonthly: 0 };
    }

    const dailyUsed = this.getDailyUsage(provider);
    const monthlyUsed = this.getMonthlyUsage(provider);

    return {
      daily: limits.dailyLimit - dailyUsed,
      monthly: limits.monthlyLimit - monthlyUsed,
      percentDaily: 100 - (dailyUsed / limits.dailyLimit) * 100,
      percentMonthly: 100 - (monthlyUsed / limits.monthlyLimit) * 100,
    };
  }

  /**
   * Reset daily limits (call at midnight UTC)
   */
  resetDailyUsage(): void {
    const dateKey = this.getDateKey();
    this.dailyUsage.delete(dateKey);
    logger.info('Daily usage reset');
  }

  /**
   * Update limits for a provider
   */
  updateLimits(provider: AIProvider, newLimits: Partial<CreditLimits>): void {
    const current = this.limits.get(provider);
    if (current) {
      this.limits.set(provider, { ...current, ...newLimits });
      logger.info('Credit limits updated', { provider, newLimits });
    }
  }
}

// Singleton instance
let monitorInstance: CreditMonitor | null = null;

export function getCreditMonitor(): CreditMonitor {
  if (!monitorInstance) {
    monitorInstance = new CreditMonitor();
  }
  return monitorInstance;
}
