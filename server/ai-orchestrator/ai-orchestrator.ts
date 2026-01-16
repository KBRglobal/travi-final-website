/**
 * AI Orchestrator - Main Entry Point
 * 
 * Central orchestration layer for all AI operations across the platform.
 * Coordinates between providers, enforces policies, and tracks usage.
 * 
 * INVARIANTS:
 * - All AI requests go through this orchestrator
 * - Image requests MUST route through Image Engine (not direct to Freepik)
 * - Rate limits and credit quotas are enforced
 * - Priority routing ensures critical tasks complete first
 * - No single system can starve others of resources
 */

import { log } from '../lib/logger';
import { getProviderPool, ProviderPool } from './provider-pool';
import { getRatePolicy, RatePolicy } from './rate-policy';
import { getCreditMonitor, CreditMonitor } from './credit-monitor';
import { getTaskGovernance, TaskGovernance, type TaskGovernanceMetrics } from './task-governance';
import { getCostAnalytics, type CostAnalytics } from './cost-analytics';
import type {
  AIProvider,
  AITask,
  AITaskResult,
  TaskPriority,
  TaskCategory,
  OrchestratorMetrics,
  ProviderStatus,
  BackpressureState,
  RoutingDecision,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[AIOrchestrator] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[AIOrchestrator] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[AIOrchestrator] ${msg}`, undefined, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[AIOrchestrator][AUDIT] ${msg}`, data),
};

/**
 * Request to submit a task to the orchestrator
 */
export interface SubmitTaskRequest {
  id?: string;
  category: TaskCategory;
  priority?: TaskPriority;
  preferredProvider?: AIProvider;
  payload: unknown;
  maxRetries?: number;
}

/**
 * Response from task submission
 */
export interface SubmitTaskResponse {
  accepted: boolean;
  taskId: string;
  reason?: string;
  estimatedWaitMs?: number;
  routing?: RoutingDecision;
}

/**
 * AI Orchestrator - Main Class
 */
export class AIOrchestrator {
  private providerPool: ProviderPool;
  private ratePolicy: RatePolicy;
  private creditMonitor: CreditMonitor;
  private taskGovernance: TaskGovernance;
  private costAnalytics: CostAnalytics;
  private metrics: OrchestratorMetrics;
  private initialized = false;

  constructor() {
    this.providerPool = getProviderPool();
    this.ratePolicy = getRatePolicy();
    this.costAnalytics = getCostAnalytics();
    this.creditMonitor = getCreditMonitor();
    this.taskGovernance = getTaskGovernance();
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): OrchestratorMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalCreditsUsed: 0,
      averageLatencyMs: 0,
      providerBreakdown: {} as OrchestratorMetrics['providerBreakdown'],
    };
  }

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    logger.info('Initializing AI Orchestrator');
    
    // Future: Load configuration from database
    // Future: Connect to provider health checks
    // Future: Start metrics collection
    
    this.initialized = true;
    logger.info('AI Orchestrator initialized');
  }

  /**
   * Submit a task for AI processing
   * 
   * CRITICAL: Image tasks are BLOCKED at the provider pool level.
   * They MUST go through Image Engine API instead.
   * 
   * PHASE 4: Task governance enforced
   * - Tasks without explicit category are REJECTED
   * - Per-category rate and token limits are enforced
   * - All fallbacks are logged
   */
  async submitTask(request: SubmitTaskRequest): Promise<SubmitTaskResponse> {
    const taskId = request.id || this.generateTaskId();
    
    // HARD INVARIANT: Reject tasks without explicit category
    const categoryValidation = this.taskGovernance.validateCategory(request.category);
    if (!categoryValidation.valid) {
      logger.error('Task rejected - missing or invalid category', {
        taskId,
        providedCategory: request.category,
        error: categoryValidation.error,
      });
      return {
        accepted: false,
        taskId,
        reason: categoryValidation.error || 'Task category is required',
      };
    }
    
    // HARD INVARIANT: Block direct image requests
    if (request.category === 'image') {
      logger.warn('Image task submitted directly to orchestrator - BLOCKED', { taskId });
      return {
        accepted: false,
        taskId,
        reason: 'Image tasks must be submitted via Image Engine API (/api/v1/images/*)',
      };
    }

    // PHASE 4: Check governance limits (rate + token limits per category)
    const estimatedTokens = this.estimateTokens(request.payload);
    const governanceCheck = this.taskGovernance.canProceed(request.category, estimatedTokens);
    if (!governanceCheck.allowed) {
      logger.warn('Task rejected by governance', {
        taskId,
        category: request.category,
        reason: governanceCheck.reason,
        currentUsage: governanceCheck.currentUsage.requestsThisHour,
        limit: governanceCheck.limits.requestsPerHour,
      });
      return {
        accepted: false,
        taskId,
        reason: governanceCheck.reason,
      };
    }

    const task: AITask = {
      id: taskId,
      category: request.category,
      priority: request.priority || 'normal',
      provider: request.preferredProvider,
      payload: request.payload,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: request.maxRetries ?? 3,
    };

    // Get routing decision
    const routing = this.providerPool.selectProvider(task);
    
    // Check rate limits
    const rateCheck = this.ratePolicy.canProceed(routing.provider, task.priority);
    if (!rateCheck.allowed) {
      // Queue the task for later
      const queued = this.ratePolicy.queueTask(task);
      if (!queued) {
        logger.warn('Task rejected - queue full', { taskId, reason: rateCheck.reason });
        return {
          accepted: false,
          taskId,
          reason: 'Queue full - try again later',
        };
      }
      
      logger.info('Task queued due to rate limit', {
        taskId,
        reason: rateCheck.reason,
        retryAfterMs: rateCheck.retryAfterMs,
      });
      
      return {
        accepted: true,
        taskId,
        reason: 'Queued - rate limited',
        estimatedWaitMs: rateCheck.retryAfterMs,
        routing,
      };
    }

    // Check credit limits
    const creditCheck = this.creditMonitor.canAfford(
      routing.provider,
      task.category,
      routing.estimatedCost
    );
    if (!creditCheck.allowed) {
      // Try alternative provider
      if (routing.alternatives.length > 0) {
        const altProvider = routing.alternatives[0];
        const altCreditCheck = this.creditMonitor.canAfford(
          altProvider,
          task.category,
          routing.estimatedCost
        );
        
        if (altCreditCheck.allowed) {
          // PHASE 4: Log ALL automatic fallbacks
          this.taskGovernance.recordFallback({
            taskId,
            category: task.category,
            reason: 'Credit limit exceeded on primary provider',
            originalProvider: routing.provider,
            fallbackProvider: altProvider,
          });
          
          logger.audit('Automatic fallback - credit limit', {
            taskId,
            category: task.category,
            originalProvider: routing.provider,
            fallbackProvider: altProvider,
          });
          
          routing.provider = altProvider;
          routing.reason = 'Routed to alternative - credit limit on primary';
        } else {
          logger.warn('Task rejected - no providers with available credits', { taskId });
          return {
            accepted: false,
            taskId,
            reason: creditCheck.reason || 'Credit limit exceeded',
          };
        }
      } else {
        return {
          accepted: false,
          taskId,
          reason: creditCheck.reason || 'Credit limit exceeded',
        };
      }
    }

    // PHASE 4: Record request in governance tracking
    this.taskGovernance.recordRequest(task.category, estimatedTokens);

    // Task accepted
    this.metrics.totalRequests++;
    
    logger.audit('Task accepted', {
      taskId,
      category: task.category,
      priority: task.priority,
      provider: routing.provider,
      estimatedCost: routing.estimatedCost,
    });

    return {
      accepted: true,
      taskId,
      routing,
    };
  }

  /**
   * Execute a task (stub - actual execution would call provider APIs)
   * 
   * This is a stub implementation. In production, this would:
   * 1. Call the appropriate provider API
   * 2. Handle streaming responses
   * 3. Process errors and retries
   * 4. Record metrics and usage
   */
  async executeTask(task: AITask): Promise<AITaskResult> {
    const startTime = Date.now();
    const routing = this.providerPool.selectProvider(task);
    
    // Mark request started (both rate policy and load tracking)
    this.ratePolicy.requestStarted(routing.provider);
    this.providerPool.incrementLoad(routing.provider);

    try {
      // STUB: Actual provider call would go here
      // const result = await this.callProvider(routing.provider, task);
      
      // Simulate successful execution
      const latencyMs = Date.now() - startTime;
      const creditsUsed = routing.estimatedCost;

      // Record success
      this.ratePolicy.requestCompleted(routing.provider, true);
      this.providerPool.updateProviderStatus(routing.provider, true, creditsUsed, latencyMs);
      this.creditMonitor.recordUsage(routing.provider, task.category, creditsUsed, task.id);
      
      // PHASE 4: Record cost for value analytics
      // Extract optional context from payload for deeper cost tracking
      const payload = task.payload as Record<string, unknown> | undefined;
      this.costAnalytics.recordCost({
        taskId: task.id,
        category: task.category,
        provider: routing.provider,
        tokensUsed: this.estimateTokens(task.payload),
        articleId: payload?.articleId as string | undefined,
        locale: payload?.locale as string | undefined,
        sessionId: payload?.sessionId as string | undefined,
      });
      
      // Update metrics
      this.metrics.successfulRequests++;
      this.metrics.totalCreditsUsed += creditsUsed;
      this.updateAverageLatency(latencyMs);

      logger.audit('Task executed successfully', {
        taskId: task.id,
        provider: routing.provider,
        latencyMs,
        creditsUsed,
      });

      return {
        taskId: task.id,
        success: true,
        provider: routing.provider,
        result: { stub: true, message: 'Stub execution - implement provider calls' },
        latencyMs,
        creditsUsed,
        timestamp: new Date(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      // Record failure
      this.ratePolicy.requestCompleted(routing.provider, false);
      this.providerPool.updateProviderStatus(routing.provider, false, 0, latencyMs);
      this.metrics.failedRequests++;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Task execution failed', {
        taskId: task.id,
        provider: routing.provider,
        error: errorMessage,
        retryCount: task.retryCount,
        maxRetries: task.maxRetries,
      });

      return {
        taskId: task.id,
        success: false,
        provider: routing.provider,
        error: errorMessage,
        latencyMs,
        creditsUsed: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update running average latency
   */
  private updateAverageLatency(newLatencyMs: number): void {
    const totalRequests = this.metrics.successfulRequests;
    if (totalRequests === 1) {
      this.metrics.averageLatencyMs = newLatencyMs;
    } else {
      // Exponential moving average
      const alpha = 0.1;
      this.metrics.averageLatencyMs = 
        alpha * newLatencyMs + (1 - alpha) * this.metrics.averageLatencyMs;
    }
  }

  /**
   * Estimate tokens from payload (rough heuristic)
   */
  private estimateTokens(payload: unknown): number {
    if (!payload) return 0;
    
    try {
      const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
      return Math.ceil(str.length / 4);
    } catch {
      return 1000;
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current orchestrator metrics
   */
  getMetrics(): OrchestratorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get all provider statuses
   */
  getProviderStatuses(): ProviderStatus[] {
    return this.providerPool.getAllStatus();
  }

  /**
   * Get backpressure state
   */
  getBackpressureState(): BackpressureState {
    return this.ratePolicy.getBackpressureState();
  }

  /**
   * Get queue depth
   */
  getQueueDepth(): number {
    return this.ratePolicy.getQueueDepth();
  }

  /**
   * Get credit usage report
   */
  getCreditReport() {
    return this.creditMonitor.getUsageReport();
  }

  /**
   * Get task governance metrics (PHASE 4)
   * Returns per-category usage, rejections, and fallbacks
   */
  getTaskGovernanceMetrics(): TaskGovernanceMetrics {
    return this.taskGovernance.getMetrics();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    providers: Record<AIProvider, boolean>;
    queueDepth: number;
    backpressure: boolean;
  }> {
    const statuses = this.providerPool.getAllStatus();
    const providers: Record<AIProvider, boolean> = {} as Record<AIProvider, boolean>;
    
    let healthyCount = 0;
    for (const status of statuses) {
      providers[status.provider] = status.available;
      if (status.available) healthyCount++;
    }

    const backpressure = this.ratePolicy.getBackpressureState();
    const queueDepth = this.ratePolicy.getQueueDepth();

    return {
      healthy: healthyCount > 0 && !backpressure.isActive,
      providers,
      queueDepth,
      backpressure: backpressure.isActive,
    };
  }

  /**
   * Reset daily limits (call from scheduled job at midnight UTC)
   */
  resetDailyLimits(): void {
    this.providerPool.resetDailyLimits();
    this.creditMonitor.resetDailyUsage();
    logger.info('Daily limits reset');
  }
}

// Singleton instance
let orchestratorInstance: AIOrchestrator | null = null;

export function getAIOrchestrator(): AIOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AIOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * Export types for consumers
 */
export type {
  AIProvider,
  AITask,
  AITaskResult,
  TaskPriority,
  TaskCategory,
  OrchestratorMetrics,
  ProviderStatus,
  BackpressureState,
  RoutingDecision,
} from './types';
