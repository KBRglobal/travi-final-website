/**
 * AI Orchestrator - Credit Guard
 * 
 * PHASE 5.2: Soft-mode credit monitoring with warnings
 * 
 * Features:
 * - Observe-only mode (no hard blocks yet)
 * - Warning at 80% usage (log only)
 * - Soft-disable at 90% (fallback + log)
 * - Provider-level and global tracking
 * 
 * ACTIVATION: ENABLED (observe-only mode)
 */

import { log } from '../lib/logger';
import type { AIProvider, TaskCategory } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[CreditGuard] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[CreditGuard] ${msg}`, data),
  alert: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[CreditGuard][ALERT] ${msg}`, data),
};

interface CreditUsage {
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
}

interface CreditGuardConfig {
  enabled: boolean;
  observeOnly: boolean;         // If true, log warnings but don't block
  warningThreshold: number;     // 0.8 = 80%
  softDisableThreshold: number; // 0.9 = 90%
  hardBlockThreshold: number;   // 1.0 = 100%
}

interface GuardDecision {
  allowed: boolean;
  reason?: string;
  usagePercent: number;
  threshold: 'ok' | 'warning' | 'soft-disable' | 'blocked';
  fallbackProvider?: AIProvider;
}

const DEFAULT_CONFIG: CreditGuardConfig = {
  enabled: true,
  observeOnly: true,  // SOFT MODE - log only, don't block
  warningThreshold: 0.8,
  softDisableThreshold: 0.9,
  hardBlockThreshold: 1.0,
};

// Simulated limits per provider (would come from config in production)
const PROVIDER_LIMITS: Record<AIProvider, { daily: number; monthly: number }> = {
  anthropic: { daily: 100, monthly: 2000 },
  openai: { daily: 50, monthly: 1000 },
  gemini: { daily: 30, monthly: 500 },
  deepseek: { daily: 50, monthly: 800 },
  openrouter: { daily: 30, monthly: 500 },
  'replit-ai': { daily: 100, monthly: 2000 },
  freepik: { daily: 50, monthly: 500 },
};

class CreditGuard {
  private config: CreditGuardConfig = DEFAULT_CONFIG;
  private usage: Map<AIProvider, CreditUsage> = new Map();
  private warnings: Map<AIProvider, Date> = new Map(); // Last warning time
  private warningCooldownMs = 60000; // 1 minute between warnings

  constructor() {
    this.initializeUsage();
  }

  private initializeUsage(): void {
    for (const [provider, limits] of Object.entries(PROVIDER_LIMITS)) {
      this.usage.set(provider as AIProvider, {
        dailyUsed: 0,
        dailyLimit: limits.daily,
        monthlyUsed: 0,
        monthlyLimit: limits.monthly,
      });
    }
  }

  /**
   * Check if a request should proceed
   */
  check(provider: AIProvider, _category: TaskCategory): GuardDecision {
    if (!this.config.enabled) {
      return { allowed: true, usagePercent: 0, threshold: 'ok' };
    }

    const usage = this.usage.get(provider);
    if (!usage) {
      return { allowed: true, usagePercent: 0, threshold: 'ok' };
    }

    const dailyPercent = usage.dailyUsed / usage.dailyLimit;
    const monthlyPercent = usage.monthlyUsed / usage.monthlyLimit;
    const usagePercent = Math.max(dailyPercent, monthlyPercent);

    let threshold: GuardDecision['threshold'] = 'ok';
    let allowed = true;
    let reason: string | undefined;

    if (usagePercent >= this.config.hardBlockThreshold) {
      threshold = 'blocked';
      reason = `Credit limit exceeded for ${provider}`;
      if (!this.config.observeOnly) {
        allowed = false;
      }
    } else if (usagePercent >= this.config.softDisableThreshold) {
      threshold = 'soft-disable';
      reason = `90% credit usage for ${provider} - fallback recommended`;
      this.emitWarning(provider, 'SOFT_DISABLE', usagePercent);
    } else if (usagePercent >= this.config.warningThreshold) {
      threshold = 'warning';
      reason = `80% credit usage for ${provider}`;
      this.emitWarning(provider, 'WARNING', usagePercent);
    }

    return {
      allowed,
      reason,
      usagePercent: Math.round(usagePercent * 100),
      threshold,
      fallbackProvider: threshold === 'soft-disable' ? this.getFallback(provider) : undefined,
    };
  }

  /**
   * Emit warning with cooldown to prevent log spam
   */
  private emitWarning(provider: AIProvider, level: string, usagePercent: number): void {
    const lastWarning = this.warnings.get(provider);
    if (lastWarning && Date.now() - lastWarning.getTime() < this.warningCooldownMs) {
      return; // Cooldown active
    }

    const usage = this.usage.get(provider);
    const data = {
      provider,
      usagePercent: Math.round(usagePercent * 100),
      dailyUsed: usage?.dailyUsed,
      dailyLimit: usage?.dailyLimit,
      monthlyUsed: usage?.monthlyUsed,
      monthlyLimit: usage?.monthlyLimit,
    };

    if (level === 'SOFT_DISABLE') {
      logger.alert(`Credit soft-disable triggered`, data);
    } else {
      logger.warn(`Credit usage warning`, data);
    }

    this.warnings.set(provider, new Date());
  }

  /**
   * Get fallback provider when primary is at soft-disable
   */
  private getFallback(excludeProvider: AIProvider): AIProvider | undefined {
    const fallbackOrder: AIProvider[] = [
      'anthropic', 'openai', 'deepseek', 'openrouter', 'gemini', 'replit-ai'
    ];

    for (const provider of fallbackOrder) {
      if (provider === excludeProvider) continue;
      if (provider === 'freepik') continue; // Never use as text fallback

      const usage = this.usage.get(provider);
      if (!usage) continue;

      const percent = Math.max(
        usage.dailyUsed / usage.dailyLimit,
        usage.monthlyUsed / usage.monthlyLimit
      );

      if (percent < this.config.warningThreshold) {
        return provider;
      }
    }

    return undefined;
  }

  /**
   * Record credit usage
   */
  recordUsage(provider: AIProvider, credits: number): void {
    const usage = this.usage.get(provider);
    if (!usage) return;

    usage.dailyUsed += credits;
    usage.monthlyUsed += credits;

    logger.info('Credit usage recorded', {
      provider,
      credits,
      dailyUsed: usage.dailyUsed,
      dailyLimit: usage.dailyLimit,
    });
  }

  /**
   * Get usage summary for API
   */
  getUsageSummary(): Record<AIProvider, {
    dailyUsed: number;
    dailyLimit: number;
    monthlyUsed: number;
    monthlyLimit: number;
    dailyPercent: number;
    monthlyPercent: number;
    status: 'ok' | 'warning' | 'soft-disable' | 'blocked';
  }> {
    const summary: Record<string, unknown> = {};

    for (const [provider, usage] of this.usage.entries()) {
      const dailyPercent = usage.dailyUsed / usage.dailyLimit;
      const monthlyPercent = usage.monthlyUsed / usage.monthlyLimit;
      const maxPercent = Math.max(dailyPercent, monthlyPercent);

      let status: 'ok' | 'warning' | 'soft-disable' | 'blocked' = 'ok';
      if (maxPercent >= this.config.hardBlockThreshold) status = 'blocked';
      else if (maxPercent >= this.config.softDisableThreshold) status = 'soft-disable';
      else if (maxPercent >= this.config.warningThreshold) status = 'warning';

      summary[provider] = {
        dailyUsed: usage.dailyUsed,
        dailyLimit: usage.dailyLimit,
        monthlyUsed: usage.monthlyUsed,
        monthlyLimit: usage.monthlyLimit,
        dailyPercent: Math.round(dailyPercent * 100),
        monthlyPercent: Math.round(monthlyPercent * 100),
        status,
      };
    }

    return summary as Record<AIProvider, {
      dailyUsed: number;
      dailyLimit: number;
      monthlyUsed: number;
      monthlyLimit: number;
      dailyPercent: number;
      monthlyPercent: number;
      status: 'ok' | 'warning' | 'soft-disable' | 'blocked';
    }>;
  }

  /**
   * Reset daily usage (call at midnight UTC)
   */
  resetDaily(): void {
    for (const usage of this.usage.values()) {
      usage.dailyUsed = 0;
    }
    logger.info('Daily credit usage reset');
  }

  /**
   * Reset monthly usage (call at month start)
   */
  resetMonthly(): void {
    for (const usage of this.usage.values()) {
      usage.monthlyUsed = 0;
    }
    logger.info('Monthly credit usage reset');
  }

  /**
   * Configure the guard
   */
  configure(config: Partial<CreditGuardConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Credit guard configured', { config: this.config });
  }

  /**
   * Check if in observe-only mode
   */
  isObserveOnly(): boolean {
    return this.config.observeOnly;
  }
}

// Singleton
let instance: CreditGuard | null = null;

export function getCreditGuard(): CreditGuard {
  if (!instance) {
    instance = new CreditGuard();
  }
  return instance;
}

export { CreditGuard, CreditGuardConfig, GuardDecision };
