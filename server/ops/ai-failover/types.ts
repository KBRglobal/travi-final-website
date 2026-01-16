/**
 * AI Provider Failover & Degraded Modes - Types
 *
 * FEATURE 3: Automatic adaptation when AI providers fail/degrade
 */

export type AIProviderName =
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'deepseek'
  | 'openrouter'
  | 'replit-ai';

export type ProviderState = 'healthy' | 'degraded' | 'disabled';

export interface ProviderMetrics {
  provider: AIProviderName;
  latencyMs: number;
  latencyP95Ms: number;
  errorRate: number;
  timeoutRate: number;
  requestCount: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  lastRequestAt?: Date;
  lastErrorAt?: Date;
}

export interface ProviderStatus {
  provider: AIProviderName;
  state: ProviderState;
  metrics: ProviderMetrics;
  stateChangedAt: Date;
  disabledReason?: string;
  disabledBy?: 'auto' | 'manual';
  disabledAt?: Date;
}

export interface FailoverConfig {
  // Thresholds for degradation
  errorRateThreshold: number;       // 0.1 = 10%
  timeoutRateThreshold: number;     // 0.05 = 5%
  latencyThresholdMs: number;       // 5000ms

  // Thresholds for recovery
  recoveryErrorRate: number;        // 0.02 = 2%
  recoveryLatencyMs: number;        // 2000ms

  // Auto-disable threshold
  disableErrorRate: number;         // 0.5 = 50%

  // Sampling window
  metricsWindowMs: number;          // 5 minutes
  minSamplesForDecision: number;    // 10 requests
}

export interface FailoverAction {
  action: 'switch_provider' | 'reduce_concurrency' | 'disable_non_critical' | 'restore';
  provider: AIProviderName;
  reason: string;
  timestamp: Date;
  previousState: ProviderState;
  newState: ProviderState;
}

export interface FailoverState {
  primaryProvider: AIProviderName;
  currentProvider: AIProviderName;
  providers: Map<AIProviderName, ProviderStatus>;
  concurrencyLevel: 'full' | 'reduced' | 'minimal';
  nonCriticalEnabled: boolean;
  lastFailoverAt?: Date;
  recentActions: FailoverAction[];
}
