/**
 * Base Adapter
 * Abstract base class for all execution adapters
 */

import { randomUUID } from 'crypto';
import type { Decision, DecisionType } from '../types';
import type {
  ExecutionAdapter,
  AdapterConfig,
  AdapterHealth,
  ExecutionResult,
  ExecutionBlocked,
} from './types';

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_ADAPTER_CONFIG: AdapterConfig = {
  enabled: true,
  dryRunByDefault: true, // Safe default
  timeout: 30000, // 30 seconds
  retries: 2,
  retryDelay: 1000, // 1 second
  healthCheckInterval: 60000, // 1 minute
};

// =============================================================================
// BASE ADAPTER
// =============================================================================

export abstract class BaseAdapter implements ExecutionAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly supportedActions: DecisionType[];

  protected health: AdapterHealth;
  config: AdapterConfig;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: Partial<AdapterConfig> = {}) {
    this.config = { ...DEFAULT_ADAPTER_CONFIG, ...config };
    this.health = {
      status: 'unknown',
      lastCheck: new Date(),
      consecutiveFailures: 0,
    };
  }

  // =========================================================================
  // HEALTH
  // =========================================================================

  getHealth(): AdapterHealth {
    return { ...this.health };
  }

  async checkHealth(): Promise<AdapterHealth> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.performHealthCheck();
      const latency = Date.now() - startTime;

      if (isHealthy) {
        this.health = {
          status: 'healthy',
          lastCheck: new Date(),
          lastSuccess: new Date(),
          consecutiveFailures: 0,
          latency,
        };
      } else {
        this.health.consecutiveFailures++;
        this.health.status =
          this.health.consecutiveFailures >= 3 ? 'critical' : 'degraded';
        this.health.lastCheck = new Date();
        this.health.latency = latency;
      }
    } catch (error) {
      this.health.consecutiveFailures++;
      this.health.status =
        this.health.consecutiveFailures >= 3 ? 'critical' : 'degraded';
      this.health.lastCheck = new Date();
      this.health.lastFailure = new Date();
      this.health.details = error instanceof Error ? error.message : 'Unknown error';
    }

    return this.getHealth();
  }

  protected abstract performHealthCheck(): Promise<boolean>;

  // =========================================================================
  // EXECUTION
  // =========================================================================

  canExecute(decision: Decision): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (this.health.status === 'critical') {
      return false;
    }

    return this.supportedActions.includes(decision.type);
  }

  async execute(
    decision: Decision,
    dryRun?: boolean
  ): Promise<ExecutionResult | ExecutionBlocked> {
    const effectiveDryRun = dryRun ?? this.config.dryRunByDefault;
    const startTime = Date.now();
    const auditId = `audit-${randomUUID().substring(0, 8)}`;

    // Pre-execution checks
    if (!this.config.enabled) {
      return this.createBlockedResult(decision, 'Adapter is disabled', 'config');
    }

    if (!this.canExecute(decision)) {
      return this.createBlockedResult(
        decision,
        `Action ${decision.type} not supported by ${this.name}`,
        'capability'
      );
    }

    if (this.health.status === 'critical') {
      return this.createBlockedResult(
        decision,
        'Adapter health is critical',
        'health'
      );
    }

    // Execute with retries
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt <= this.config.retries) {
      try {
        const result = await this.withTimeout(
          effectiveDryRun
            ? this.executeDryRun(decision)
            : this.executeAction(decision),
          this.config.timeout
        );

        // Record success
        this.health.lastSuccess = new Date();
        this.health.consecutiveFailures = 0;

        return {
          status: effectiveDryRun ? 'dry_run' : result.success ? 'success' : 'partial',
          decision,
          adapter: this.id,
          executedAt: new Date(),
          duration: Date.now() - startTime,
          dryRun: effectiveDryRun,
          affectedResources: result.affectedResources,
          changes: result.changes,
          wouldHaveExecuted: effectiveDryRun ? true : undefined,
          simulatedChanges: effectiveDryRun ? result.changes : undefined,
          auditId,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        if (attempt <= this.config.retries) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    // All retries failed
    this.health.consecutiveFailures++;
    this.health.lastFailure = new Date();

    return {
      status: 'failed',
      decision,
      adapter: this.id,
      executedAt: new Date(),
      duration: Date.now() - startTime,
      dryRun: effectiveDryRun,
      error: lastError?.message || 'Unknown error',
      auditId,
    };
  }

  protected abstract executeAction(decision: Decision): Promise<{
    success: boolean;
    affectedResources?: string[];
    changes?: Record<string, unknown>;
  }>;

  protected abstract executeDryRun(decision: Decision): Promise<{
    success: boolean;
    affectedResources?: string[];
    changes?: Record<string, unknown>;
  }>;

  // =========================================================================
  // LIFECYCLE
  // =========================================================================

  async initialize(): Promise<void> {
    await this.checkHealth();

    // Start periodic health checks
    this.healthCheckTimer = setInterval(
      () => this.checkHealth(),
      this.config.healthCheckInterval
    );

    console.log(`[${this.name}] Adapter initialized`);
  }

  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    await this.performShutdown();
    console.log(`[${this.name}] Adapter shutdown`);
  }

  protected async performShutdown(): Promise<void> {
    // Override in subclasses if needed
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  protected createBlockedResult(
    decision: Decision,
    reason: string,
    blockedBy: string
  ): ExecutionBlocked {
    return {
      blocked: true,
      reason,
      blockedBy,
      decision,
      canRetry: blockedBy !== 'capability',
      retryAfter:
        blockedBy === 'health'
          ? new Date(Date.now() + 60000)
          : undefined,
    };
  }

  protected async withTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      ),
    ]);
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
