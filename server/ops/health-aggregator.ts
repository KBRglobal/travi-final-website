/**
 * Operations & Reliability - System Health Aggregator
 *
 * FEATURE 1: Aggregates health from multiple sources into a single view
 * - Job queue health
 * - AI provider health
 * - Database connectivity
 * - Memory pressure
 *
 * Feature flag: ENABLE_SYSTEM_HEALTH=true
 */

import { log } from '../lib/logger';
import { getOpsConfig } from './config';
import type {
  Severity,
  ComponentHealth,
  SystemHealthSnapshot
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[HealthAggregator] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[HealthAggregator] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[HealthAggregator] ${msg}`, undefined, data),
};

interface HealthCheck {
  name: string;
  check: () => Promise<ComponentHealth>;
  weight: number; // Higher weight = more impact on overall health
}

// Bounded rolling window for metrics (prevents unbounded memory)
const MAX_HISTORY_SIZE = 100;

class HealthAggregator {
  private checks: Map<string, HealthCheck> = new Map();
  private lastSnapshot: SystemHealthSnapshot | null = null;
  private healthHistory: SystemHealthSnapshot[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor() {
    this.registerDefaultChecks();
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks(): void {
    // Job queue health check
    this.registerCheck({
      name: 'jobQueue',
      weight: 3,
      check: async (): Promise<ComponentHealth> => {
        const start = Date.now();
        try {
          // Check job queue stats
          const { jobQueue } = await import('../job-queue');
          const stats = await jobQueue.getStats();
          const latency = Date.now() - start;

          // Determine severity based on queue depth and failed jobs
          const config = getOpsConfig();
          let status: Severity = 'healthy';
          let message = 'Job queue operating normally';

          if (stats.pending > config.health.queueDepthThreshold) {
            status = 'degraded';
            message = `High queue depth: ${stats.pending} pending jobs`;
          }

          if (stats.failed > 10) {
            status = 'degraded';
            message = `${stats.failed} failed jobs in queue`;
          }

          if (stats.pending > config.health.queueDepthThreshold * 2) {
            status = 'critical';
            message = `Critical queue depth: ${stats.pending} pending jobs`;
          }

          return {
            name: 'jobQueue',
            status,
            message,
            latencyMs: latency,
            lastChecked: new Date(),
          };
        } catch (error) {
          return {
            name: 'jobQueue',
            status: 'critical',
            message: `Job queue check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            latencyMs: Date.now() - start,
            lastChecked: new Date(),
          };
        }
      },
    });

    // AI providers health check
    this.registerCheck({
      name: 'aiProviders',
      weight: 4,
      check: async (): Promise<ComponentHealth> => {
        const start = Date.now();
        try {
          const { getHealthTracker } = await import('../ai-orchestrator/health-tracker');
          const tracker = getHealthTracker();
          const allHealth = tracker.getAllHealth();
          const latency = Date.now() - start;

          const healthyCount = allHealth.filter(h => h.isHealthy).length;
          const totalCount = allHealth.length;
          const healthyPercent = totalCount > 0 ? (healthyCount / totalCount) * 100 : 100;

          let status: Severity = 'healthy';
          let message = `${healthyCount}/${totalCount} AI providers healthy`;

          if (healthyPercent < 80) {
            status = 'degraded';
            message = `Only ${healthyCount}/${totalCount} AI providers healthy`;
          }

          if (healthyPercent < 50) {
            status = 'critical';
            message = `Critical: Only ${healthyCount}/${totalCount} AI providers available`;
          }

          return {
            name: 'aiProviders',
            status,
            message,
            latencyMs: latency,
            lastChecked: new Date(),
          };
        } catch (error) {
          return {
            name: 'aiProviders',
            status: 'degraded',
            message: `AI health check unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
            latencyMs: Date.now() - start,
            lastChecked: new Date(),
          };
        }
      },
    });

    // Database health check
    this.registerCheck({
      name: 'database',
      weight: 5,
      check: async (): Promise<ComponentHealth> => {
        const start = Date.now();
        try {
          const { pool } = await import('../db');

          // Simple connectivity check with timeout
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('DB check timeout')), 5000);
          });

          const checkPromise = pool.query('SELECT 1');
          await Promise.race([checkPromise, timeoutPromise]);

          const latency = Date.now() - start;
          const config = getOpsConfig();

          let status: Severity = 'healthy';
          let message = 'Database connection healthy';

          if (latency > config.health.aiLatencyThresholdMs) {
            status = 'degraded';
            message = `Database latency high: ${latency}ms`;
          }

          return {
            name: 'database',
            status,
            message,
            latencyMs: latency,
            lastChecked: new Date(),
          };
        } catch (error) {
          return {
            name: 'database',
            status: 'critical',
            message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            latencyMs: Date.now() - start,
            lastChecked: new Date(),
          };
        }
      },
    });

    // Memory pressure check
    this.registerCheck({
      name: 'memory',
      weight: 3,
      check: async (): Promise<ComponentHealth> => {
        const start = Date.now();
        const config = getOpsConfig();

        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

        let status: Severity = 'healthy';
        let message = `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${Math.round(heapPercent)}%)`;

        if (heapPercent > config.health.memoryThresholdPercent) {
          status = 'degraded';
          message = `High memory usage: ${Math.round(heapPercent)}%`;
        }

        if (heapPercent > 95) {
          status = 'critical';
          message = `Critical memory usage: ${Math.round(heapPercent)}%`;
        }

        return {
          name: 'memory',
          status,
          message,
          latencyMs: Date.now() - start,
          lastChecked: new Date(),
        };
      },
    });
  }

  /**
   * Register a custom health check
   */
  registerCheck(check: HealthCheck): void {
    this.checks.set(check.name, check);
    logger.info('Health check registered', { name: check.name, weight: check.weight });
  }

  /**
   * Run all health checks and aggregate results
   */
  async checkHealth(): Promise<SystemHealthSnapshot> {
    const config = getOpsConfig();

    if (!config.systemHealthEnabled) {
      return this.getDisabledSnapshot();
    }

    const results: Map<string, ComponentHealth> = new Map();
    const alerts: string[] = [];
    let totalWeight = 0;
    let healthyWeight = 0;

    // Run all checks concurrently with individual timeouts
    const checkPromises = Array.from(this.checks.values()).map(async (check) => {
      const timeoutPromise = new Promise<ComponentHealth>((resolve) => {
        setTimeout(() => resolve({
          name: check.name,
          status: 'critical',
          message: 'Health check timeout',
          lastChecked: new Date(),
        }), 10000);
      });

      const result = await Promise.race([check.check(), timeoutPromise]);
      return { check, result };
    });

    const checkResults = await Promise.all(checkPromises);

    for (const { check, result } of checkResults) {
      results.set(check.name, result);
      totalWeight += check.weight;

      if (result.status === 'healthy') {
        healthyWeight += check.weight;
      } else if (result.status === 'degraded') {
        healthyWeight += check.weight * 0.5;
        alerts.push(`${check.name}: ${result.message}`);
      } else {
        alerts.push(`CRITICAL - ${check.name}: ${result.message}`);
      }
    }

    // Calculate overall health
    const healthScore = totalWeight > 0 ? healthyWeight / totalWeight : 1;
    let overall: Severity = 'healthy';

    if (healthScore < 0.9) {
      overall = 'degraded';
    }
    if (healthScore < 0.6) {
      overall = 'critical';
    }

    // Check for any critical components
    for (const result of results.values()) {
      if (result.status === 'critical') {
        overall = 'critical';
        break;
      }
    }

    const snapshot: SystemHealthSnapshot = {
      overall,
      timestamp: new Date(),
      components: {
        jobQueue: results.get('jobQueue') || this.getDefaultComponentHealth('jobQueue'),
        aiProviders: results.get('aiProviders') || this.getDefaultComponentHealth('aiProviders'),
        database: results.get('database') || this.getDefaultComponentHealth('database'),
        memory: results.get('memory') || this.getDefaultComponentHealth('memory'),
      },
      activeAlerts: alerts,
    };

    this.lastSnapshot = snapshot;
    this.addToHistory(snapshot);

    if (overall !== 'healthy') {
      logger.warn('System health degraded', {
        overall,
        alertCount: alerts.length,
        healthScore: Math.round(healthScore * 100),
      });
    }

    return snapshot;
  }

  /**
   * Add snapshot to history with bounded size
   */
  private addToHistory(snapshot: SystemHealthSnapshot): void {
    this.healthHistory.push(snapshot);
    if (this.healthHistory.length > MAX_HISTORY_SIZE) {
      this.healthHistory.shift();
    }
  }

  /**
   * Get default component health for disabled/missing checks
   */
  private getDefaultComponentHealth(name: string): ComponentHealth {
    return {
      name,
      status: 'healthy',
      message: 'Check not available',
      lastChecked: new Date(),
    };
  }

  /**
   * Get disabled snapshot when feature is off
   */
  private getDisabledSnapshot(): SystemHealthSnapshot {
    return {
      overall: 'healthy',
      timestamp: new Date(),
      components: {
        jobQueue: this.getDefaultComponentHealth('jobQueue'),
        aiProviders: this.getDefaultComponentHealth('aiProviders'),
        database: this.getDefaultComponentHealth('database'),
        memory: this.getDefaultComponentHealth('memory'),
      },
      activeAlerts: ['System health monitoring disabled'],
    };
  }

  /**
   * Get the last health snapshot
   */
  getLastSnapshot(): SystemHealthSnapshot | null {
    return this.lastSnapshot;
  }

  /**
   * Get health history
   */
  getHistory(): SystemHealthSnapshot[] {
    return [...this.healthHistory];
  }

  /**
   * Start periodic health checks
   */
  start(): void {
    if (this.isRunning) return;

    const config = getOpsConfig();
    if (!config.systemHealthEnabled) {
      logger.info('System health monitoring disabled by feature flag');
      return;
    }

    this.isRunning = true;

    // Initial check
    this.checkHealth().catch(err => {
      logger.error('Initial health check failed', { error: String(err) });
    });

    // Periodic checks
    this.checkInterval = setInterval(() => {
      this.checkHealth().catch(err => {
        logger.error('Periodic health check failed', { error: String(err) });
      });
    }, config.health.checkIntervalMs);

    logger.info('Health aggregator started', {
      intervalMs: config.health.checkIntervalMs
    });
  }

  /**
   * Stop periodic health checks
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    logger.info('Health aggregator stopped');
  }

  /**
   * Check if aggregator is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
let instance: HealthAggregator | null = null;

export function getHealthAggregator(): HealthAggregator {
  if (!instance) {
    instance = new HealthAggregator();
  }
  return instance;
}

export function resetHealthAggregator(): void {
  if (instance) {
    instance.stop();
  }
  instance = null;
}

export { HealthAggregator };
