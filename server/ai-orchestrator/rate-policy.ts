/**
 * AI Orchestrator - Rate Policy
 * 
 * Implements rate limiting, backpressure, and throttling policies
 * for AI provider access.
 * 
 * INVARIANTS:
 * - Rate limits are enforced per-provider
 * - Backpressure is applied globally when system is overloaded
 * - Priority tasks can bypass normal queue (but not hard limits)
 */

import { log } from '../lib/logger';
import type {
  AIProvider,
  AITask,
  TaskPriority,
  RateLimitConfig,
  BackpressureState,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[RatePolicy] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[RatePolicy] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[RatePolicy] ${msg}`, undefined, data),
};

interface RateBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

interface ProviderRateState {
  minuteBucket: RateBucket;
  hourBucket: RateBucket;
  inFlightRequests: number;
  maxConcurrent: number;
  consecutiveErrors: number;
  circuitBreakerOpen: boolean;
  circuitBreakerResetAt?: number;
}

/**
 * Token bucket algorithm for rate limiting
 */
function refillBucket(bucket: RateBucket): void {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000; // seconds
  const tokensToAdd = elapsed * bucket.refillRate;
  bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

function tryConsumeBucket(bucket: RateBucket, tokens: number = 1): boolean {
  refillBucket(bucket);
  if (bucket.tokens >= tokens) {
    bucket.tokens -= tokens;
    return true;
  }
  return false;
}

export class RatePolicy {
  private providerStates: Map<AIProvider, ProviderRateState> = new Map();
  private globalBackpressure: BackpressureState = {
    isActive: false,
    affectedProviders: [],
    queueDepth: 0,
  };
  private pendingQueue: AITask[] = [];
  private readonly maxQueueDepth = 100;
  private readonly circuitBreakerThreshold = 5; // errors before opening
  private readonly circuitBreakerResetMs = 60000; // 1 minute

  constructor() {
    this.initializeProviderStates();
  }

  private initializeProviderStates(): void {
    const defaultConfigs: Record<AIProvider, RateLimitConfig & { maxConcurrent: number }> = {
      anthropic: { requestsPerMinute: 60, requestsPerHour: 1000, maxConcurrent: 5 },
      openai: { requestsPerMinute: 60, requestsPerHour: 1000, maxConcurrent: 5 },
      gemini: { requestsPerMinute: 30, requestsPerHour: 500, maxConcurrent: 3 },
      deepseek: { requestsPerMinute: 30, requestsPerHour: 500, maxConcurrent: 3 },
      openrouter: { requestsPerMinute: 60, requestsPerHour: 1000, maxConcurrent: 5 },
      'replit-ai': { requestsPerMinute: 20, requestsPerHour: 300, maxConcurrent: 3 },
      freepik: { requestsPerMinute: 10, requestsPerHour: 100, maxConcurrent: 2 },
    };

    for (const [provider, config] of Object.entries(defaultConfigs)) {
      const now = Date.now();
      this.providerStates.set(provider as AIProvider, {
        minuteBucket: {
          tokens: config.requestsPerMinute,
          lastRefill: now,
          maxTokens: config.requestsPerMinute,
          refillRate: config.requestsPerMinute / 60, // per second
        },
        hourBucket: {
          tokens: config.requestsPerHour,
          lastRefill: now,
          maxTokens: config.requestsPerHour,
          refillRate: config.requestsPerHour / 3600, // per second
        },
        inFlightRequests: 0,
        maxConcurrent: config.maxConcurrent,
        consecutiveErrors: 0,
        circuitBreakerOpen: false,
      });
    }
  }

  /**
   * Check if a request can proceed for a given provider
   */
  canProceed(provider: AIProvider, priority: TaskPriority = 'normal'): {
    allowed: boolean;
    reason?: string;
    retryAfterMs?: number;
  } {
    const state = this.providerStates.get(provider);
    if (!state) {
      return { allowed: false, reason: 'Unknown provider' };
    }

    // Check circuit breaker
    if (state.circuitBreakerOpen) {
      const now = Date.now();
      if (state.circuitBreakerResetAt && now < state.circuitBreakerResetAt) {
        return {
          allowed: false,
          reason: 'Circuit breaker open',
          retryAfterMs: state.circuitBreakerResetAt - now,
        };
      }
      // Reset circuit breaker
      state.circuitBreakerOpen = false;
      state.consecutiveErrors = 0;
    }

    // Check global backpressure (critical tasks bypass)
    if (this.globalBackpressure.isActive && priority !== 'critical') {
      return {
        allowed: false,
        reason: 'Global backpressure active',
        retryAfterMs: this.globalBackpressure.estimatedRecoveryMs,
      };
    }

    // Check concurrent request limit
    if (state.inFlightRequests >= state.maxConcurrent) {
      return {
        allowed: false,
        reason: 'Max concurrent requests reached',
        retryAfterMs: 1000,
      };
    }

    // Check rate limits (high priority gets some slack)
    const tokensNeeded = priority === 'critical' ? 0.5 : 1;
    
    if (!tryConsumeBucket(state.minuteBucket, tokensNeeded)) {
      const waitTime = ((tokensNeeded - state.minuteBucket.tokens) / state.minuteBucket.refillRate) * 1000;
      return {
        allowed: false,
        reason: 'Minute rate limit exceeded',
        retryAfterMs: Math.ceil(waitTime),
      };
    }

    if (!tryConsumeBucket(state.hourBucket, tokensNeeded)) {
      const waitTime = ((tokensNeeded - state.hourBucket.tokens) / state.hourBucket.refillRate) * 1000;
      return {
        allowed: false,
        reason: 'Hour rate limit exceeded',
        retryAfterMs: Math.ceil(waitTime),
      };
    }

    return { allowed: true };
  }

  /**
   * Mark a request as started (increment in-flight counter)
   */
  requestStarted(provider: AIProvider): void {
    const state = this.providerStates.get(provider);
    if (state) {
      state.inFlightRequests++;
    }
  }

  /**
   * Mark a request as completed
   */
  requestCompleted(provider: AIProvider, success: boolean): void {
    const state = this.providerStates.get(provider);
    if (!state) return;

    state.inFlightRequests = Math.max(0, state.inFlightRequests - 1);

    if (success) {
      state.consecutiveErrors = 0;
    } else {
      state.consecutiveErrors++;
      
      // Check circuit breaker threshold
      if (state.consecutiveErrors >= this.circuitBreakerThreshold) {
        state.circuitBreakerOpen = true;
        state.circuitBreakerResetAt = Date.now() + this.circuitBreakerResetMs;
        logger.warn('Circuit breaker opened', {
          provider,
          consecutiveErrors: state.consecutiveErrors,
          resetAt: new Date(state.circuitBreakerResetAt).toISOString(),
        });
      }
    }

    // Update global backpressure
    this.updateBackpressure();
  }

  /**
   * Queue a task for later execution if rate limited
   */
  queueTask(task: AITask): boolean {
    if (this.pendingQueue.length >= this.maxQueueDepth) {
      logger.warn('Queue full - rejecting task', { taskId: task.id });
      return false;
    }

    // Insert by priority (higher priority at front)
    const priorityOrder: TaskPriority[] = ['critical', 'high', 'normal', 'low', 'background'];
    const taskPriorityIndex = priorityOrder.indexOf(task.priority);
    
    let insertIndex = this.pendingQueue.length;
    for (let i = 0; i < this.pendingQueue.length; i++) {
      const existingPriorityIndex = priorityOrder.indexOf(this.pendingQueue[i].priority);
      if (taskPriorityIndex < existingPriorityIndex) {
        insertIndex = i;
        break;
      }
    }

    this.pendingQueue.splice(insertIndex, 0, task);
    this.updateBackpressure();
    
    logger.info('Task queued', {
      taskId: task.id,
      priority: task.priority,
      queuePosition: insertIndex,
      queueDepth: this.pendingQueue.length,
    });
    
    return true;
  }

  /**
   * Get next task from queue if rate allows
   */
  dequeueTask(provider: AIProvider): AITask | null {
    const check = this.canProceed(provider);
    if (!check.allowed) {
      return null;
    }

    // Find first task that can use this provider
    for (let i = 0; i < this.pendingQueue.length; i++) {
      const task = this.pendingQueue[i];
      if (!task.provider || task.provider === provider) {
        this.pendingQueue.splice(i, 1);
        this.updateBackpressure();
        return task;
      }
    }

    return null;
  }

  /**
   * Update global backpressure state
   */
  private updateBackpressure(): void {
    const queueDepth = this.pendingQueue.length;
    const threshold = this.maxQueueDepth * 0.8; // 80% capacity

    // Count providers with open circuit breakers
    const affectedProviders: AIProvider[] = [];
    for (const [provider, state] of this.providerStates) {
      if (state.circuitBreakerOpen) {
        affectedProviders.push(provider);
      }
    }

    const wasActive = this.globalBackpressure.isActive;
    const isNowActive = queueDepth > threshold || affectedProviders.length >= 3;

    this.globalBackpressure = {
      isActive: isNowActive,
      reason: isNowActive 
        ? queueDepth > threshold 
          ? 'Queue depth exceeded threshold'
          : 'Multiple provider failures'
        : undefined,
      affectedProviders,
      queueDepth,
      estimatedRecoveryMs: isNowActive ? 5000 : undefined,
    };

    if (isNowActive && !wasActive) {
      logger.warn('Global backpressure activated', {
        isActive: this.globalBackpressure.isActive,
        reason: this.globalBackpressure.reason,
        queueDepth: this.globalBackpressure.queueDepth,
        affectedProviders: this.globalBackpressure.affectedProviders,
      });
    } else if (!isNowActive && wasActive) {
      logger.info('Global backpressure deactivated');
    }
  }

  /**
   * Get current backpressure state
   */
  getBackpressureState(): BackpressureState {
    return { ...this.globalBackpressure };
  }

  /**
   * Get queue depth
   */
  getQueueDepth(): number {
    return this.pendingQueue.length;
  }

  /**
   * Get rate limit status for a provider
   */
  getRateLimitStatus(provider: AIProvider): {
    minuteRemaining: number;
    hourRemaining: number;
    inFlight: number;
    maxConcurrent: number;
    circuitBreakerOpen: boolean;
  } | null {
    const state = this.providerStates.get(provider);
    if (!state) return null;

    refillBucket(state.minuteBucket);
    refillBucket(state.hourBucket);

    return {
      minuteRemaining: Math.floor(state.minuteBucket.tokens),
      hourRemaining: Math.floor(state.hourBucket.tokens),
      inFlight: state.inFlightRequests,
      maxConcurrent: state.maxConcurrent,
      circuitBreakerOpen: state.circuitBreakerOpen,
    };
  }
}

// Singleton instance
let policyInstance: RatePolicy | null = null;

export function getRatePolicy(): RatePolicy {
  if (!policyInstance) {
    policyInstance = new RatePolicy();
  }
  return policyInstance;
}
