/**
 * AI Orchestrator - Provider Health Tracker
 * 
 * PHASE 5.1: Rolling success/error rates for providers
 * 
 * Features:
 * - Rolling window (5 min) for recent health
 * - Success/error rate calculation
 * - Latency tracking per provider
 * - Automatic degradation on failures
 * 
 * ACTIVATION: ENABLED (observe + act)
 */

import { log } from '../lib/logger';
import type { AIProvider } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[HealthTracker] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[HealthTracker] ${msg}`, data),
};

interface HealthEvent {
  timestamp: number;
  success: boolean;
  latencyMs: number;
  errorCode?: string;
}

interface ProviderHealth {
  provider: AIProvider;
  events: HealthEvent[];
  successRate: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  isHealthy: boolean;
  degradedSince?: Date;
  lastChecked: Date;
}

interface HealthConfig {
  windowMs: number;           // Rolling window (default: 5 min)
  minSamples: number;         // Minimum samples before degradation
  degradeThreshold: number;   // Success rate below which to degrade (0.7 = 70%)
  recoverThreshold: number;   // Success rate above which to recover (0.9 = 90%)
  latencyThresholdMs: number; // P95 latency above which to degrade
}

const DEFAULT_CONFIG: HealthConfig = {
  windowMs: 5 * 60 * 1000,      // 5 minutes
  minSamples: 5,
  degradeThreshold: 0.7,
  recoverThreshold: 0.9,
  latencyThresholdMs: 10000,    // 10 seconds
};

class HealthTracker {
  private health: Map<AIProvider, ProviderHealth> = new Map();
  private config: HealthConfig = DEFAULT_CONFIG;
  private enabled = true;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const providers: AIProvider[] = [
      'anthropic', 'openai', 'gemini', 'deepseek', 
      'openrouter', 'replit-ai', 'freepik'
    ];

    for (const provider of providers) {
      this.health.set(provider, {
        provider,
        events: [],
        successRate: 1.0,
        averageLatencyMs: 0,
        p95LatencyMs: 0,
        isHealthy: true,
        lastChecked: new Date(),
      });
    }
  }

  /**
   * Record a request outcome
   */
  recordEvent(
    provider: AIProvider,
    success: boolean,
    latencyMs: number,
    errorCode?: string
  ): void {
    if (!this.enabled) return;

    const health = this.health.get(provider);
    if (!health) return;

    const event: HealthEvent = {
      timestamp: Date.now(),
      success,
      latencyMs,
      errorCode,
    };

    health.events.push(event);
    this.pruneOldEvents(health);
    this.recalculateHealth(health);

    // Log degradation changes
    const wasHealthy = health.isHealthy;
    this.checkHealthStatus(health);

    if (wasHealthy && !health.isHealthy) {
      logger.warn('Provider degraded', {
        provider,
        successRate: health.successRate,
        p95LatencyMs: health.p95LatencyMs,
      });
    } else if (!wasHealthy && health.isHealthy) {
      logger.info('Provider recovered', { provider });
    }
  }

  /**
   * Remove events outside the rolling window
   */
  private pruneOldEvents(health: ProviderHealth): void {
    const cutoff = Date.now() - this.config.windowMs;
    health.events = health.events.filter(e => e.timestamp > cutoff);
  }

  /**
   * Recalculate success rate and latency metrics
   */
  private recalculateHealth(health: ProviderHealth): void {
    const events = health.events;
    
    if (events.length === 0) {
      health.successRate = 1.0;
      health.averageLatencyMs = 0;
      health.p95LatencyMs = 0;
      return;
    }

    // Success rate
    const successes = events.filter(e => e.success).length;
    health.successRate = successes / events.length;

    // Latency metrics
    const latencies = events.map(e => e.latencyMs).sort((a, b) => a - b);
    health.averageLatencyMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    
    const p95Index = Math.floor(latencies.length * 0.95);
    health.p95LatencyMs = latencies[p95Index] || latencies[latencies.length - 1];

    health.lastChecked = new Date();
  }

  /**
   * Check if provider should be degraded or recovered
   */
  private checkHealthStatus(health: ProviderHealth): void {
    const events = health.events;
    
    if (events.length < this.config.minSamples) {
      // Not enough data - assume healthy
      health.isHealthy = true;
      health.degradedSince = undefined;
      return;
    }

    if (health.isHealthy) {
      // Check for degradation
      if (
        health.successRate < this.config.degradeThreshold ||
        health.p95LatencyMs > this.config.latencyThresholdMs
      ) {
        health.isHealthy = false;
        health.degradedSince = new Date();
      }
    } else {
      // Check for recovery
      if (
        health.successRate >= this.config.recoverThreshold &&
        health.p95LatencyMs <= this.config.latencyThresholdMs
      ) {
        health.isHealthy = true;
        health.degradedSince = undefined;
      }
    }
  }

  /**
   * Get health status for a provider
   */
  getHealth(provider: AIProvider): ProviderHealth | undefined {
    return this.health.get(provider);
  }

  /**
   * Get all provider health statuses
   */
  getAllHealth(): ProviderHealth[] {
    return Array.from(this.health.values());
  }

  /**
   * Check if provider is healthy enough to use
   */
  isHealthy(provider: AIProvider): boolean {
    const health = this.health.get(provider);
    return health?.isHealthy ?? true;
  }

  /**
   * Get metrics snapshot for API
   */
  getMetricsSnapshot(): Record<AIProvider, {
    successRate: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    isHealthy: boolean;
    sampleCount: number;
    degradedSince?: string;
  }> {
    const snapshot: Record<string, unknown> = {};

    for (const [provider, health] of this.health.entries()) {
      snapshot[provider] = {
        successRate: Math.round(health.successRate * 100) / 100,
        avgLatencyMs: Math.round(health.averageLatencyMs),
        p95LatencyMs: Math.round(health.p95LatencyMs),
        isHealthy: health.isHealthy,
        sampleCount: health.events.length,
        degradedSince: health.degradedSince?.toISOString(),
      };
    }

    return snapshot as Record<AIProvider, {
      successRate: number;
      avgLatencyMs: number;
      p95LatencyMs: number;
      isHealthy: boolean;
      sampleCount: number;
      degradedSince?: string;
    }>;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<HealthConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Health tracker configured', { config: this.config });
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logger.info(`Health tracking ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Singleton instance
let instance: HealthTracker | null = null;

export function getHealthTracker(): HealthTracker {
  if (!instance) {
    instance = new HealthTracker();
  }
  return instance;
}

export { HealthTracker, HealthConfig, ProviderHealth };
