/**
 * AI Provider Failover & Degraded Modes - Controller
 *
 * FEATURE 3: When AI providers fail or degrade, the system adapts automatically
 *
 * Feature flag: ENABLE_AI_FAILOVER
 */

import { log } from '../../lib/logger';
import type {
  AIProviderName,
  ProviderState,
  ProviderMetrics,
  ProviderStatus,
  FailoverConfig,
  FailoverAction,
  FailoverState,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[AIFailover] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[AIFailover] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[AIFailover] ${msg}`, undefined, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[AIFailover][AUDIT] ${msg}`, data),
};

const DEFAULT_CONFIG: FailoverConfig = {
  errorRateThreshold: 0.1,
  timeoutRateThreshold: 0.05,
  latencyThresholdMs: 5000,
  recoveryErrorRate: 0.02,
  recoveryLatencyMs: 2000,
  disableErrorRate: 0.5,
  metricsWindowMs: 300000, // 5 minutes
  minSamplesForDecision: 10,
};

const PROVIDER_PRIORITY: AIProviderName[] = [
  'anthropic',
  'openai',
  'deepseek',
  'gemini',
  'openrouter',
  'replit-ai',
];

// Bounded storage
const MAX_ACTIONS = 200;
const MAX_METRICS_EVENTS = 500;

interface MetricsEvent {
  provider: AIProviderName;
  latencyMs: number;
  success: boolean;
  timeout: boolean;
  timestamp: number;
}

class AIFailoverController {
  private config: FailoverConfig;
  private enabled = false;
  private providers: Map<AIProviderName, ProviderStatus> = new Map();
  private metricsEvents: MetricsEvent[] = [];
  private actions: FailoverAction[] = [];
  private primaryProvider: AIProviderName = 'anthropic';
  private currentProvider: AIProviderName = 'anthropic';
  private concurrencyLevel: 'full' | 'reduced' | 'minimal' = 'full';
  private nonCriticalEnabled = true;
  private evaluateInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<FailoverConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.enabled = process.env.ENABLE_AI_FAILOVER === 'true';
    this.initializeProviders();

    if (this.enabled) {
      logger.info('AI Failover controller enabled');
    }
  }

  /**
   * Initialize provider statuses
   */
  private initializeProviders(): void {
    for (const provider of PROVIDER_PRIORITY) {
      this.providers.set(provider, {
        provider,
        state: 'healthy',
        metrics: this.createEmptyMetrics(provider),
        stateChangedAt: new Date(),
      });
    }
  }

  /**
   * Create empty metrics for a provider
   */
  private createEmptyMetrics(provider: AIProviderName): ProviderMetrics {
    return {
      provider,
      latencyMs: 0,
      latencyP95Ms: 0,
      errorRate: 0,
      timeoutRate: 0,
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
    };
  }

  /**
   * Record a request result
   */
  recordRequest(
    provider: AIProviderName,
    latencyMs: number,
    success: boolean,
    timeout = false
  ): void {
    if (!this.enabled) return;

    const event: MetricsEvent = {
      provider,
      latencyMs,
      success,
      timeout,
      timestamp: Date.now(),
    };

    this.metricsEvents.push(event);

    // Bounded storage
    if (this.metricsEvents.length > MAX_METRICS_EVENTS) {
      this.metricsEvents = this.metricsEvents.slice(-MAX_METRICS_EVENTS);
    }

    // Update provider metrics
    this.updateProviderMetrics(provider);

    // Check if state change is needed
    this.evaluateProviderState(provider);
  }

  /**
   * Update metrics for a provider based on recent events
   */
  private updateProviderMetrics(provider: AIProviderName): void {
    const cutoff = Date.now() - this.config.metricsWindowMs;
    const events = this.metricsEvents.filter(
      e => e.provider === provider && e.timestamp > cutoff
    );

    if (events.length === 0) return;

    const status = this.providers.get(provider);
    if (!status) return;

    const latencies = events.filter(e => e.success).map(e => e.latencyMs).sort((a, b) => a - b);
    const successCount = events.filter(e => e.success).length;
    const failureCount = events.filter(e => !e.success && !e.timeout).length;
    const timeoutCount = events.filter(e => e.timeout).length;

    status.metrics = {
      provider,
      latencyMs: latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0,
      latencyP95Ms: latencies.length > 0
        ? latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1]
        : 0,
      errorRate: events.length > 0 ? failureCount / events.length : 0,
      timeoutRate: events.length > 0 ? timeoutCount / events.length : 0,
      requestCount: events.length,
      successCount,
      failureCount,
      timeoutCount,
      lastRequestAt: new Date(events[events.length - 1].timestamp),
      lastErrorAt: failureCount > 0
        ? new Date(events.filter(e => !e.success).slice(-1)[0]?.timestamp)
        : undefined,
    };
  }

  /**
   * Evaluate if provider state should change
   */
  private evaluateProviderState(provider: AIProviderName): void {
    const status = this.providers.get(provider);
    if (!status) return;

    const metrics = status.metrics;

    // Not enough data
    if (metrics.requestCount < this.config.minSamplesForDecision) return;

    const previousState = status.state;

    // Check for auto-disable (critical failure rate)
    if (metrics.errorRate >= this.config.disableErrorRate) {
      if (status.state !== 'disabled') {
        this.transitionState(provider, 'disabled', 'Critical error rate exceeded');
      }
      return;
    }

    // Check for degradation
    const shouldDegrade =
      metrics.errorRate >= this.config.errorRateThreshold ||
      metrics.timeoutRate >= this.config.timeoutRateThreshold ||
      metrics.latencyP95Ms >= this.config.latencyThresholdMs;

    // Check for recovery
    const canRecover =
      metrics.errorRate <= this.config.recoveryErrorRate &&
      metrics.timeoutRate <= this.config.recoveryErrorRate &&
      metrics.latencyP95Ms <= this.config.recoveryLatencyMs;

    if (status.state === 'healthy' && shouldDegrade) {
      this.transitionState(provider, 'degraded', 'Performance thresholds exceeded');
    } else if (status.state === 'degraded' && canRecover) {
      this.transitionState(provider, 'healthy', 'Performance recovered');
    } else if (status.state === 'disabled' && canRecover) {
      // Allow recovery from auto-disabled state
      if (status.disabledBy === 'auto') {
        this.transitionState(provider, 'healthy', 'Auto-recovery after performance improvement');
      }
    }
  }

  /**
   * Transition provider to new state
   */
  private transitionState(
    provider: AIProviderName,
    newState: ProviderState,
    reason: string
  ): void {
    const status = this.providers.get(provider);
    if (!status) return;

    const previousState = status.state;
    status.state = newState;
    status.stateChangedAt = new Date();

    if (newState === 'disabled') {
      status.disabledAt = new Date();
      status.disabledBy = 'auto';
      status.disabledReason = reason;
    } else {
      status.disabledAt = undefined;
      status.disabledBy = undefined;
      status.disabledReason = undefined;
    }

    const action: FailoverAction = {
      action: newState === 'disabled' ? 'disable_non_critical'
        : newState === 'degraded' ? 'reduce_concurrency'
        : 'restore',
      provider,
      reason,
      timestamp: new Date(),
      previousState,
      newState,
    };

    this.recordAction(action);

    logger.warn('Provider state transition', {
      provider,
      previousState,
      newState,
      reason,
    });

    logger.audit('AI_PROVIDER_STATE_CHANGE', {
      provider,
      previousState,
      newState,
      reason,
    });

    // If current provider is degraded/disabled, failover
    if (provider === this.currentProvider && newState !== 'healthy') {
      this.performFailover();
    }

    // Notify incident system
    this.notifyIncidentSystem(provider, previousState, newState, reason);
  }

  /**
   * Perform failover to next healthy provider
   */
  private performFailover(): void {
    const healthyProvider = PROVIDER_PRIORITY.find(p => {
      const status = this.providers.get(p);
      return status?.state === 'healthy';
    });

    if (healthyProvider && healthyProvider !== this.currentProvider) {
      const previousProvider = this.currentProvider;
      this.currentProvider = healthyProvider;

      const action: FailoverAction = {
        action: 'switch_provider',
        provider: healthyProvider,
        reason: `Failover from ${previousProvider}`,
        timestamp: new Date(),
        previousState: 'degraded',
        newState: 'healthy',
      };

      this.recordAction(action);

      logger.warn('Failover performed', {
        from: previousProvider,
        to: healthyProvider,
      });

      logger.audit('AI_FAILOVER', {
        from: previousProvider,
        to: healthyProvider,
      });
    } else if (!healthyProvider) {
      // All providers degraded or disabled
      this.concurrencyLevel = 'minimal';
      this.nonCriticalEnabled = false;

      logger.error('All AI providers degraded/disabled', {
        concurrencyLevel: this.concurrencyLevel,
        nonCriticalEnabled: this.nonCriticalEnabled,
      });
    }
  }

  /**
   * Record failover action
   */
  private recordAction(action: FailoverAction): void {
    this.actions.push(action);
    if (this.actions.length > MAX_ACTIONS) {
      this.actions = this.actions.slice(-MAX_ACTIONS);
    }
  }

  /**
   * Notify incident system of provider issues
   */
  private async notifyIncidentSystem(
    provider: AIProviderName,
    previousState: ProviderState,
    newState: ProviderState,
    reason: string
  ): Promise<void> {
    try {
      const { createIncident, autoResolveIncidents } = await import('../incidents');

      if (newState === 'disabled') {
        createIncident(
          'ai_provider_failed',
          'high',
          'ai_failover',
          `AI Provider ${provider} disabled`,
          reason,
          { provider, previousState, newState }
        );
      } else if (newState === 'degraded') {
        createIncident(
          'ai_provider_failed',
          'medium',
          'ai_failover',
          `AI Provider ${provider} degraded`,
          reason,
          { provider, previousState, newState }
        );
      } else if (newState === 'healthy' && previousState !== 'healthy') {
        autoResolveIncidents('ai_provider_failed', 'ai_failover', `Provider ${provider} recovered`);
      }
    } catch {
      // Incident system not available
    }
  }

  /**
   * Manually disable a provider
   */
  disableProvider(provider: AIProviderName, reason: string): boolean {
    const status = this.providers.get(provider);
    if (!status) return false;

    status.state = 'disabled';
    status.stateChangedAt = new Date();
    status.disabledAt = new Date();
    status.disabledBy = 'manual';
    status.disabledReason = reason;

    this.recordAction({
      action: 'disable_non_critical',
      provider,
      reason: `Manual disable: ${reason}`,
      timestamp: new Date(),
      previousState: status.state,
      newState: 'disabled',
    });

    logger.warn('Provider manually disabled', { provider, reason });
    logger.audit('AI_PROVIDER_MANUAL_DISABLE', { provider, reason });

    if (provider === this.currentProvider) {
      this.performFailover();
    }

    return true;
  }

  /**
   * Manually enable a provider
   */
  enableProvider(provider: AIProviderName): boolean {
    const status = this.providers.get(provider);
    if (!status) return false;

    status.state = 'healthy';
    status.stateChangedAt = new Date();
    status.disabledAt = undefined;
    status.disabledBy = undefined;
    status.disabledReason = undefined;

    this.recordAction({
      action: 'restore',
      provider,
      reason: 'Manual enable',
      timestamp: new Date(),
      previousState: 'disabled',
      newState: 'healthy',
    });

    logger.info('Provider manually enabled', { provider });
    logger.audit('AI_PROVIDER_MANUAL_ENABLE', { provider });

    return true;
  }

  /**
   * Get current failover state
   */
  getState(): FailoverState {
    return {
      primaryProvider: this.primaryProvider,
      currentProvider: this.currentProvider,
      providers: new Map(this.providers),
      concurrencyLevel: this.concurrencyLevel,
      nonCriticalEnabled: this.nonCriticalEnabled,
      lastFailoverAt: this.actions.find(a => a.action === 'switch_provider')?.timestamp,
      recentActions: [...this.actions.slice(-20)],
    };
  }

  /**
   * Get all provider statuses
   */
  getProviderStatuses(): ProviderStatus[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider status
   */
  getProviderStatus(provider: AIProviderName): ProviderStatus | undefined {
    return this.providers.get(provider);
  }

  /**
   * Get the current active provider
   */
  getCurrentProvider(): AIProviderName {
    return this.currentProvider;
  }

  /**
   * Check if non-critical AI features should run
   */
  shouldRunNonCritical(): boolean {
    return this.nonCriticalEnabled;
  }

  /**
   * Get current concurrency level
   */
  getConcurrencyLevel(): 'full' | 'reduced' | 'minimal' {
    return this.concurrencyLevel;
  }

  /**
   * Get recent actions
   */
  getRecentActions(limit = 20): FailoverAction[] {
    return this.actions.slice(-limit);
  }

  /**
   * Start periodic evaluation
   */
  start(): void {
    if (!this.enabled) return;

    this.evaluateInterval = setInterval(() => {
      for (const provider of PROVIDER_PRIORITY) {
        this.updateProviderMetrics(provider);
        this.evaluateProviderState(provider);
      }
    }, 30000); // Every 30 seconds

    logger.info('AI Failover controller started');
  }

  /**
   * Stop periodic evaluation
   */
  stop(): void {
    if (this.evaluateInterval) {
      clearInterval(this.evaluateInterval);
      this.evaluateInterval = null;
    }
    logger.info('AI Failover controller stopped');
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: AIFailoverController | null = null;

export function getAIFailoverController(): AIFailoverController {
  if (!instance) {
    instance = new AIFailoverController();
  }
  return instance;
}

export function resetAIFailoverController(): void {
  if (instance) {
    instance.stop();
  }
  instance = null;
}

export { AIFailoverController };
