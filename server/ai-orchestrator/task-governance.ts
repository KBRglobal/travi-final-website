/**
 * Task Governance - Per-Category Rate & Token Limits
 * 
 * PHASE 4: AI Task Governance
 * 
 * Enforces hard limits per task category to prevent silent misuse:
 * - Rate limits (requests per hour)
 * - Token limits (max tokens per request)
 * - Tracks usage, rejections, and fallbacks
 * 
 * HARD INVARIANTS:
 * - Tasks without explicit category are REJECTED
 * - All fallbacks are logged
 * - No single category can exhaust system resources
 */

import { log } from '../lib/logger';
import type { TaskCategory } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[TaskGovernance] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[TaskGovernance] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[TaskGovernance] ${msg}`, undefined, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[TaskGovernance][AUDIT] ${msg}`, data),
};

/**
 * Per-category limit configuration
 */
export interface CategoryLimits {
  requestsPerHour: number;
  maxTokensPerRequest: number;
  enabled: boolean;
}

/**
 * Per-category usage tracking
 */
export interface CategoryUsage {
  requestsThisHour: number;
  tokensThisHour: number;
  lastResetAt: Date;
  totalRequests: number;
  totalTokens: number;
  rejections: number;
  fallbacks: number;
}

/**
 * Result of a governance check
 */
export interface GovernanceCheckResult {
  allowed: boolean;
  reason?: string;
  category: TaskCategory;
  currentUsage: CategoryUsage;
  limits: CategoryLimits;
}

/**
 * Fallback event for logging
 */
export interface FallbackEvent {
  taskId: string;
  category: TaskCategory;
  reason: string;
  originalProvider?: string;
  fallbackProvider?: string;
  timestamp: Date;
}

/**
 * Task governance metrics for API exposure
 */
export interface TaskGovernanceMetrics {
  timestamp: string;
  categories: Record<TaskCategory, {
    limits: CategoryLimits;
    usage: CategoryUsage;
  }>;
  totalRejections: number;
  totalFallbacks: number;
  recentFallbacks: FallbackEvent[];
}

/**
 * Default category limits
 * PHASE 4: Enforced per-category limits
 */
export const DEFAULT_CATEGORY_LIMITS: Record<TaskCategory, CategoryLimits> = {
  news: {
    requestsPerHour: 50,
    maxTokensPerRequest: 10000,
    enabled: true,
  },
  evergreen: {
    requestsPerHour: 30,
    maxTokensPerRequest: 15000,
    enabled: true,
  },
  enrichment: {
    requestsPerHour: 100,
    maxTokensPerRequest: 5000,
    enabled: true,
  },
  content: {
    requestsPerHour: 100,
    maxTokensPerRequest: 8000,
    enabled: true,
  },
  translation: {
    requestsPerHour: 200,
    maxTokensPerRequest: 5000,
    enabled: true,
  },
  image: {
    requestsPerHour: 50,
    maxTokensPerRequest: 1000,
    enabled: true,
  },
  research: {
    requestsPerHour: 40,
    maxTokensPerRequest: 12000,
    enabled: true,
  },
  localization: {
    requestsPerHour: 150,
    maxTokensPerRequest: 6000,
    enabled: true,
  },
  seo: {
    requestsPerHour: 80,
    maxTokensPerRequest: 4000,
    enabled: true,
  },
  internal: {
    requestsPerHour: 200,
    maxTokensPerRequest: 3000,
    enabled: true,
  },
};

/**
 * Valid task categories for validation
 */
const VALID_CATEGORIES: Set<TaskCategory> = new Set([
  'news',
  'evergreen',
  'enrichment',
  'image',
  'research',
  'localization',
  'content',
  'seo',
  'translation',
  'internal',
]);

/**
 * Task Governance - Main Class
 */
export class TaskGovernance {
  private limits: Record<TaskCategory, CategoryLimits>;
  private usage: Map<TaskCategory, CategoryUsage>;
  private fallbackEvents: FallbackEvent[];
  private maxFallbackHistory: number;

  constructor(customLimits?: Partial<Record<TaskCategory, Partial<CategoryLimits>>>) {
    this.limits = { ...DEFAULT_CATEGORY_LIMITS };
    
    if (customLimits) {
      for (const [category, overrides] of Object.entries(customLimits)) {
        const cat = category as TaskCategory;
        if (this.limits[cat]) {
          this.limits[cat] = { ...this.limits[cat], ...overrides };
        }
      }
    }

    this.usage = new Map();
    this.fallbackEvents = [];
    this.maxFallbackHistory = 100;

    this.initializeUsage();
    logger.info('Task Governance initialized', { limits: this.limits });
  }

  private initializeUsage(): void {
    for (const category of VALID_CATEGORIES) {
      this.usage.set(category, this.createEmptyUsage());
    }
  }

  private createEmptyUsage(): CategoryUsage {
    return {
      requestsThisHour: 0,
      tokensThisHour: 0,
      lastResetAt: new Date(),
      totalRequests: 0,
      totalTokens: 0,
      rejections: 0,
      fallbacks: 0,
    };
  }

  /**
   * Validate that a category is explicitly provided and valid
   * HARD INVARIANT: Tasks without explicit category are REJECTED
   */
  validateCategory(category: unknown): { valid: boolean; error?: string } {
    if (category === undefined || category === null) {
      return {
        valid: false,
        error: 'Task category is required - tasks without explicit category are rejected',
      };
    }

    if (typeof category !== 'string') {
      return {
        valid: false,
        error: `Invalid category type: expected string, got ${typeof category}`,
      };
    }

    if (!VALID_CATEGORIES.has(category as TaskCategory)) {
      return {
        valid: false,
        error: `Unknown category "${category}". Valid categories: ${Array.from(VALID_CATEGORIES).join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check if a task can proceed based on governance limits
   */
  canProceed(
    category: TaskCategory,
    estimatedTokens: number = 0
  ): GovernanceCheckResult {
    const limits = this.limits[category];
    if (!limits) {
      return {
        allowed: false,
        reason: `No limits configured for category: ${category}`,
        category,
        currentUsage: this.createEmptyUsage(),
        limits: DEFAULT_CATEGORY_LIMITS.internal,
      };
    }

    if (!limits.enabled) {
      return {
        allowed: false,
        reason: `Category ${category} is disabled`,
        category,
        currentUsage: this.getUsage(category),
        limits,
      };
    }

    const usage = this.getUsage(category);
    this.maybeResetHourly(category);

    if (usage.requestsThisHour >= limits.requestsPerHour) {
      const result: GovernanceCheckResult = {
        allowed: false,
        reason: `Rate limit exceeded for ${category}: ${usage.requestsThisHour}/${limits.requestsPerHour} requests/hour`,
        category,
        currentUsage: usage,
        limits,
      };
      
      this.recordRejection(category);
      logger.warn('Task rejected - rate limit exceeded', {
        category,
        current: usage.requestsThisHour,
        limit: limits.requestsPerHour,
      });
      
      return result;
    }

    if (estimatedTokens > limits.maxTokensPerRequest) {
      const result: GovernanceCheckResult = {
        allowed: false,
        reason: `Token limit exceeded for ${category}: ${estimatedTokens}/${limits.maxTokensPerRequest} tokens/request`,
        category,
        currentUsage: usage,
        limits,
      };
      
      this.recordRejection(category);
      logger.warn('Task rejected - token limit exceeded', {
        category,
        requested: estimatedTokens,
        limit: limits.maxTokensPerRequest,
      });
      
      return result;
    }

    return {
      allowed: true,
      category,
      currentUsage: usage,
      limits,
    };
  }

  /**
   * Record a task request (call after task is accepted)
   */
  recordRequest(category: TaskCategory, tokensUsed: number = 0): void {
    const usage = this.getUsage(category);
    this.maybeResetHourly(category);

    usage.requestsThisHour++;
    usage.tokensThisHour += tokensUsed;
    usage.totalRequests++;
    usage.totalTokens += tokensUsed;

    logger.info('Task request recorded', {
      category,
      requestsThisHour: usage.requestsThisHour,
      tokensUsed,
    });
  }

  /**
   * Record a rejection
   */
  private recordRejection(category: TaskCategory): void {
    const usage = this.getUsage(category);
    usage.rejections++;
  }

  /**
   * Record a fallback event
   * HARD INVARIANT: All fallbacks MUST be logged
   */
  recordFallback(event: Omit<FallbackEvent, 'timestamp'>): void {
    const fullEvent: FallbackEvent = {
      ...event,
      timestamp: new Date(),
    };

    const usage = this.getUsage(event.category);
    usage.fallbacks++;

    this.fallbackEvents.push(fullEvent);
    if (this.fallbackEvents.length > this.maxFallbackHistory) {
      this.fallbackEvents.shift();
    }

    logger.audit('Fallback recorded', {
      taskId: event.taskId,
      category: event.category,
      reason: event.reason,
      originalProvider: event.originalProvider,
      fallbackProvider: event.fallbackProvider,
    });
  }

  /**
   * Get usage for a category
   */
  private getUsage(category: TaskCategory): CategoryUsage {
    let usage = this.usage.get(category);
    if (!usage) {
      usage = this.createEmptyUsage();
      this.usage.set(category, usage);
    }
    return usage;
  }

  /**
   * Reset hourly counters if an hour has passed
   */
  private maybeResetHourly(category: TaskCategory): void {
    const usage = this.getUsage(category);
    const now = new Date();
    const hoursSinceReset = (now.getTime() - usage.lastResetAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= 1) {
      usage.requestsThisHour = 0;
      usage.tokensThisHour = 0;
      usage.lastResetAt = now;
      logger.info('Hourly counters reset', { category });
    }
  }

  /**
   * Get current limits for a category
   */
  getLimits(category: TaskCategory): CategoryLimits {
    return this.limits[category] || DEFAULT_CATEGORY_LIMITS.internal;
  }

  /**
   * Get all limits
   */
  getAllLimits(): Record<TaskCategory, CategoryLimits> {
    return { ...this.limits };
  }

  /**
   * Get all usage stats
   */
  getAllUsage(): Record<TaskCategory, CategoryUsage> {
    const result: Record<string, CategoryUsage> = {};
    for (const [category, usage] of this.usage.entries()) {
      this.maybeResetHourly(category);
      result[category] = { ...usage };
    }
    return result as Record<TaskCategory, CategoryUsage>;
  }

  /**
   * Get recent fallback events
   */
  getRecentFallbacks(limit: number = 20): FallbackEvent[] {
    return this.fallbackEvents.slice(-limit);
  }

  /**
   * Get complete governance metrics for API
   */
  getMetrics(): TaskGovernanceMetrics {
    const categories: Record<string, { limits: CategoryLimits; usage: CategoryUsage }> = {};
    let totalRejections = 0;
    let totalFallbacks = 0;

    for (const category of VALID_CATEGORIES) {
      this.maybeResetHourly(category);
      const usage = this.getUsage(category);
      const limits = this.getLimits(category);
      
      categories[category] = { limits, usage: { ...usage } };
      totalRejections += usage.rejections;
      totalFallbacks += usage.fallbacks;
    }

    return {
      timestamp: new Date().toISOString(),
      categories: categories as Record<TaskCategory, { limits: CategoryLimits; usage: CategoryUsage }>,
      totalRejections,
      totalFallbacks,
      recentFallbacks: this.getRecentFallbacks(20),
    };
  }

  /**
   * Reset all daily/hourly counters (call from scheduled job)
   */
  resetHourlyCounters(): void {
    for (const category of VALID_CATEGORIES) {
      const usage = this.getUsage(category);
      usage.requestsThisHour = 0;
      usage.tokensThisHour = 0;
      usage.lastResetAt = new Date();
    }
    logger.info('All hourly counters reset');
  }

  /**
   * Reset all counters including totals (for testing/admin)
   */
  resetAllCounters(): void {
    for (const category of VALID_CATEGORIES) {
      this.usage.set(category, this.createEmptyUsage());
    }
    this.fallbackEvents = [];
    logger.info('All governance counters reset');
  }
}

let governanceInstance: TaskGovernance | null = null;

export function getTaskGovernance(): TaskGovernance {
  if (!governanceInstance) {
    governanceInstance = new TaskGovernance();
  }
  return governanceInstance;
}

export function resetTaskGovernance(): void {
  governanceInstance = null;
}
