/**
 * AI Provider Failover & Degraded Modes
 *
 * FEATURE 3: When AI providers fail or degrade, the system adapts automatically
 *
 * Tracks per-provider:
 * - Latency
 * - Error rate
 * - Timeout rate
 *
 * Automatic actions:
 * - Switch provider
 * - Reduce concurrency
 * - Disable non-critical AI features
 *
 * Feature flag: ENABLE_AI_FAILOVER
 */

export * from './types';
export * from './ai-failover-controller';

import { getAIFailoverController } from './ai-failover-controller';
import type { AIProviderName } from './types';

/**
 * Record an AI request result for failover tracking
 */
export function recordAIRequest(
  provider: AIProviderName,
  latencyMs: number,
  success: boolean,
  timeout = false
): void {
  getAIFailoverController().recordRequest(provider, latencyMs, success, timeout);
}

/**
 * Get the current active provider
 */
export function getCurrentAIProvider(): AIProviderName {
  return getAIFailoverController().getCurrentProvider();
}

/**
 * Check if non-critical AI features should run
 */
export function shouldRunNonCriticalAI(): boolean {
  return getAIFailoverController().shouldRunNonCritical();
}
