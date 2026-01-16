/**
 * AI Orchestrator - Diagnostics & Visibility
 * 
 * DEBUG-ONLY: Passive metrics collection and visibility endpoints.
 * NO routing changes. NO throttling. NO fallback modifications.
 * 
 * INVARIANT: This module is read-only - it never changes system behavior.
 */

import { getProviderPool } from './provider-pool';
import { getRatePolicy } from './rate-policy';
import { getCreditMonitor } from './credit-monitor';
import { getAIOrchestrator } from './ai-orchestrator';
import type { AIProvider, ProviderStatus, BackpressureState } from './types';

/**
 * Provider availability snapshot
 */
export interface ProviderSnapshot {
  provider: AIProvider;
  available: boolean;
  currentLoad: number;
  remainingCreditsDaily: number;
  remainingCreditsMonthly: number;
  percentDailyUsed: number;
  percentMonthlyUsed: number;
  rateLimitRemaining: number;
  lastSuccessAt?: Date;
  lastErrorAt?: Date;
}

/**
 * System-wide diagnostics snapshot
 */
export interface DiagnosticsSnapshot {
  timestamp: Date;
  healthy: boolean;
  providers: ProviderSnapshot[];
  backpressure: BackpressureState;
  queueDepth: number;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalCreditsUsed: number;
    averageLatencyMs: number;
  };
  warnings: string[];
}

/**
 * Credit usage per provider
 */
export interface CreditCounters {
  byProvider: Record<AIProvider, {
    dailyUsed: number;
    dailyLimit: number;
    monthlyUsed: number;
    monthlyLimit: number;
    percentDaily: number;
    percentMonthly: number;
  }>;
  totalDailyUsed: number;
  totalMonthlyUsed: number;
}

/**
 * Get complete diagnostics snapshot
 * 
 * DEBUG-ONLY: No behavior changes, visibility only
 */
export function getDiagnosticsSnapshot(): DiagnosticsSnapshot {
  const orchestrator = getAIOrchestrator();
  const providerPool = getProviderPool();
  const creditMonitor = getCreditMonitor();
  const ratePolicy = getRatePolicy();
  
  const statuses = providerPool.getAllStatus();
  const creditReport = creditMonitor.getUsageReport();
  const metrics = orchestrator.getMetrics();
  const backpressure = ratePolicy.getBackpressureState();
  const queueDepth = ratePolicy.getQueueDepth();
  
  const providers: ProviderSnapshot[] = statuses.map(status => {
    const remaining = creditMonitor.getRemainingCredits(status.provider);
    return {
      provider: status.provider,
      available: status.available,
      currentLoad: status.currentLoad,
      remainingCreditsDaily: remaining.daily,
      remainingCreditsMonthly: remaining.monthly,
      percentDailyUsed: 100 - remaining.percentDaily,
      percentMonthlyUsed: 100 - remaining.percentMonthly,
      rateLimitRemaining: status.rateLimitRemaining,
      lastSuccessAt: status.lastSuccessAt,
      lastErrorAt: status.lastErrorAt,
    };
  });
  
  const healthyCount = providers.filter(p => p.available).length;
  
  return {
    timestamp: new Date(),
    healthy: healthyCount > 0 && !backpressure.isActive,
    providers,
    backpressure,
    queueDepth,
    metrics,
    warnings: creditReport.warnings,
  };
}

/**
 * Get credit counters per provider
 * 
 * DEBUG-ONLY: No behavior changes, visibility only
 */
export function getCreditCounters(): CreditCounters {
  const creditMonitor = getCreditMonitor();
  const report = creditMonitor.getUsageReport();
  
  const byProvider: CreditCounters['byProvider'] = {} as CreditCounters['byProvider'];
  let totalDailyUsed = 0;
  let totalMonthlyUsed = 0;
  
  for (const [provider, limits] of Object.entries(report.limits)) {
    const dailyUsed = report.daily.byProvider[provider as AIProvider] || 0;
    const monthlyUsed = report.monthly.byProvider[provider as AIProvider] || 0;
    
    byProvider[provider as AIProvider] = {
      dailyUsed,
      dailyLimit: limits.dailyLimit,
      monthlyUsed,
      monthlyLimit: limits.monthlyLimit,
      percentDaily: (dailyUsed / limits.dailyLimit) * 100,
      percentMonthly: (monthlyUsed / limits.monthlyLimit) * 100,
    };
    
    totalDailyUsed += dailyUsed;
    totalMonthlyUsed += monthlyUsed;
  }
  
  return {
    byProvider,
    totalDailyUsed,
    totalMonthlyUsed,
  };
}

/**
 * Get active task counts per provider
 * 
 * DEBUG-ONLY: Inferred from load percentage
 */
export function getActiveTaskCounts(): Record<AIProvider, number> {
  const providerPool = getProviderPool();
  const statuses = providerPool.getAllStatus();
  
  const counts: Record<AIProvider, number> = {} as Record<AIProvider, number>;
  
  for (const status of statuses) {
    // Approximate active tasks from load percentage
    // Note: This is an estimate based on configured maxConcurrent
    const maxConcurrent = getMaxConcurrent(status.provider);
    counts[status.provider] = Math.round((status.currentLoad / 100) * maxConcurrent);
  }
  
  return counts;
}

/**
 * Get max concurrent for a provider
 * (Hardcoded to match provider-pool defaults)
 */
function getMaxConcurrent(provider: AIProvider): number {
  const defaults: Record<AIProvider, number> = {
    anthropic: 5,
    openai: 5,
    gemini: 3,
    deepseek: 3,
    openrouter: 5,
    'replit-ai': 3,
    freepik: 2,
  };
  return defaults[provider] ?? 3;
}

/**
 * Format diagnostics for structured logging
 * 
 * DEBUG-ONLY: Returns structured log-safe object
 */
export function formatDiagnosticsForLog(): Record<string, unknown> {
  const snapshot = getDiagnosticsSnapshot();
  
  return {
    ts: snapshot.timestamp.toISOString(),
    healthy: snapshot.healthy,
    queueDepth: snapshot.queueDepth,
    backpressureActive: snapshot.backpressure.isActive,
    providers: snapshot.providers.map(p => ({
      id: p.provider,
      ok: p.available,
      load: Math.round(p.currentLoad),
      creditPctDaily: Math.round(p.percentDailyUsed),
      creditPctMonthly: Math.round(p.percentMonthlyUsed),
    })),
    metrics: {
      total: snapshot.metrics.totalRequests,
      success: snapshot.metrics.successfulRequests,
      failed: snapshot.metrics.failedRequests,
      avgLatency: Math.round(snapshot.metrics.averageLatencyMs),
    },
    warningCount: snapshot.warnings.length,
  };
}
