/**
 * Health Probes - Comprehensive System Health Monitoring
 *
 * FEATURE: Multi-dimensional health checking
 * - Liveness, readiness, startup probes
 * - Dependency health (database, cache, external APIs)
 * - Resource health (memory, disk, CPU)
 * - Custom probe support
 *
 * Feature flag: ENABLE_HEALTH_PROBES=true
 */

import { randomUUID } from 'crypto';
import { log } from '../lib/logger';
import type {
  HealthProbe,
  ProbeResult,
  ProbeType,
  ProbeStatus,
  SystemHealth,
  Environment,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[HealthProbes] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[HealthProbes] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[HealthProbes] ${msg}`, undefined, data),
};

// Probe configuration
interface ProbeConfig {
  intervalMs: number;
  timeoutMs: number;
  successThreshold: number;
  failureThreshold: number;
}

const DEFAULT_PROBE_CONFIG: ProbeConfig = {
  intervalMs: 30000,
  timeoutMs: 5000,
  successThreshold: 1,
  failureThreshold: 3,
};

// Probe storage
const probes: Map<string, HealthProbe> = new Map();
const probeHistory: Map<string, ProbeResult[]> = new Map();

// Probe executors
type ProbeExecutor = (probe: HealthProbe) => Promise<ProbeResult>;
const probeExecutors: Map<string, ProbeExecutor> = new Map();

// Monitoring state
let monitoringInterval: ReturnType<typeof setInterval> | null = null;
const MAX_HISTORY_PER_PROBE = 100;

// Event subscribers
type ProbeEventHandler = (probe: HealthProbe, result: ProbeResult) => void;
const eventHandlers: Set<ProbeEventHandler> = new Set();

/**
 * Create a health probe
 */
export function createProbe(
  type: ProbeType,
  name: string,
  description: string,
  config?: Partial<ProbeConfig>,
  endpoint?: string
): HealthProbe {
  const id = randomUUID();
  const fullConfig = { ...DEFAULT_PROBE_CONFIG, ...config };

  const probe: HealthProbe = {
    id,
    type,
    name,
    description,
    endpoint,
    intervalMs: fullConfig.intervalMs,
    timeoutMs: fullConfig.timeoutMs,
    successThreshold: fullConfig.successThreshold,
    failureThreshold: fullConfig.failureThreshold,
    lastStatus: 'unknown',
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
  };

  probes.set(id, probe);
  probeHistory.set(id, []);

  logger.info('Health probe created', { id, type, name });

  return probe;
}

/**
 * Register a probe executor
 */
export function registerProbeExecutor(probeId: string, executor: ProbeExecutor): void {
  probeExecutors.set(probeId, executor);
}

/**
 * Register a probe executor by type
 */
export function registerTypeExecutor(type: ProbeType, executor: ProbeExecutor): void {
  probeExecutors.set(`type:${type}`, executor);
}

/**
 * Execute a single probe
 */
async function executeProbe(probe: HealthProbe): Promise<ProbeResult> {
  const startTime = Date.now();

  try {
    // Find executor (specific or by type)
    let executor = probeExecutors.get(probe.id);
    if (!executor) {
      executor = probeExecutors.get(`type:${probe.type}`);
    }

    if (!executor) {
      return {
        probe,
        status: 'unknown',
        latencyMs: Date.now() - startTime,
        timestamp: new Date(),
        error: 'No executor registered for probe',
      };
    }

    // Execute with timeout
    const result = await Promise.race([
      executor(probe),
      new Promise<ProbeResult>((_, reject) =>
        setTimeout(() => reject(new Error('Probe timeout')), probe.timeoutMs)
      ),
    ]);

    return result;

  } catch (err) {
    return {
      probe,
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      timestamp: new Date(),
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Update probe status based on result
 */
function updateProbeStatus(probe: HealthProbe, result: ProbeResult): void {
  probe.lastChecked = result.timestamp;
  probe.latencyMs = result.latencyMs;
  probe.error = result.error;
  probe.details = result.details;

  const previousStatus = probe.lastStatus;

  if (result.status === 'healthy') {
    probe.consecutiveSuccesses++;
    probe.consecutiveFailures = 0;

    if (probe.consecutiveSuccesses >= probe.successThreshold) {
      probe.lastStatus = 'healthy';
    }
  } else if (result.status === 'unhealthy') {
    probe.consecutiveFailures++;
    probe.consecutiveSuccesses = 0;

    if (probe.consecutiveFailures >= probe.failureThreshold) {
      probe.lastStatus = 'unhealthy';
    }
  } else if (result.status === 'degraded') {
    probe.lastStatus = 'degraded';
    probe.consecutiveSuccesses = 0;
  }

  // Log status changes
  if (previousStatus !== probe.lastStatus && previousStatus !== 'unknown') {
    if (probe.lastStatus === 'unhealthy') {
      logger.warn('Probe became unhealthy', {
        probeId: probe.id,
        probeName: probe.name,
        previousStatus,
        error: probe.error,
      });
    } else if (probe.lastStatus === 'healthy' && previousStatus === 'unhealthy') {
      logger.info('Probe recovered', {
        probeId: probe.id,
        probeName: probe.name,
      });
    }
  }

  // Store in history
  const history = probeHistory.get(probe.id) || [];
  history.push(result);
  if (history.length > MAX_HISTORY_PER_PROBE) {
    history.shift();
  }
  probeHistory.set(probe.id, history);

  // Emit event
  emitEvent(probe, result);
}

/**
 * Run all probes
 */
export async function runAllProbes(): Promise<Map<string, ProbeResult>> {
  const results = new Map<string, ProbeResult>();

  for (const probe of probes.values()) {
    const result = await executeProbe(probe);
    updateProbeStatus(probe, result);
    results.set(probe.id, result);
  }

  return results;
}

/**
 * Run a specific probe
 */
export async function runProbe(probeId: string): Promise<ProbeResult | null> {
  const probe = probes.get(probeId);
  if (!probe) return null;

  const result = await executeProbe(probe);
  updateProbeStatus(probe, result);
  return result;
}

/**
 * Get system health summary
 */
export function getSystemHealth(environment: Environment = 'development'): SystemHealth {
  const allProbes = Array.from(probes.values());

  const degradedProbes = allProbes
    .filter(p => p.lastStatus === 'degraded')
    .map(p => p.id);

  const unhealthyProbes = allProbes
    .filter(p => p.lastStatus === 'unhealthy')
    .map(p => p.id);

  // Determine overall status
  let overall: ProbeStatus = 'healthy';
  if (degradedProbes.length > 0) {
    overall = 'degraded';
  }
  if (unhealthyProbes.length > 0) {
    // Check if any critical probes are unhealthy
    const criticalTypes: ProbeType[] = ['liveness', 'database', 'startup'];
    const criticalUnhealthy = allProbes.filter(
      p => p.lastStatus === 'unhealthy' && criticalTypes.includes(p.type)
    );
    if (criticalUnhealthy.length > 0) {
      overall = 'unhealthy';
    } else {
      overall = 'degraded';
    }
  }

  return {
    overall,
    probes: allProbes,
    timestamp: new Date(),
    environment,
    version: process.env.APP_VERSION || 'unknown',
    uptime: process.uptime(),
    degradedProbes,
    unhealthyProbes,
  };
}

/**
 * Get probe by ID
 */
export function getProbe(probeId: string): HealthProbe | null {
  return probes.get(probeId) || null;
}

/**
 * Get probes by type
 */
export function getProbesByType(type: ProbeType): HealthProbe[] {
  return Array.from(probes.values()).filter(p => p.type === type);
}

/**
 * Get all probes
 */
export function getAllProbes(): HealthProbe[] {
  return Array.from(probes.values());
}

/**
 * Get probe history
 */
export function getProbeHistory(probeId: string, limit?: number): ProbeResult[] {
  const history = probeHistory.get(probeId) || [];
  return limit ? history.slice(-limit) : history;
}

/**
 * Subscribe to probe events
 */
export function subscribeToProbeEvents(handler: ProbeEventHandler): () => void {
  eventHandlers.add(handler);
  return () => {
    eventHandlers.delete(handler);
  };
}

/**
 * Emit event to all subscribers
 */
function emitEvent(probe: HealthProbe, result: ProbeResult): void {
  for (const handler of eventHandlers) {
    try {
      handler(probe, result);
    } catch (err) {
      logger.warn('Probe event handler error', {
        probeId: probe.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}

/**
 * Start monitoring loop
 */
export function startMonitoring(intervalMs: number = 30000): void {
  if (monitoringInterval) {
    logger.warn('Monitoring already running');
    return;
  }

  monitoringInterval = setInterval(() => {
    runAllProbes().catch(err => {
      logger.error('Probe monitoring failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });
  }, intervalMs);

  // Run immediately
  runAllProbes().catch(err => {
    logger.error('Initial probe run failed', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  });

  logger.info('Health probe monitoring started', { intervalMs });
}

/**
 * Stop monitoring
 */
export function stopMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.info('Health probe monitoring stopped');
  }
}

/**
 * Remove a probe
 */
export function removeProbe(probeId: string): boolean {
  const deleted = probes.delete(probeId);
  if (deleted) {
    probeHistory.delete(probeId);
    probeExecutors.delete(probeId);
    logger.info('Probe removed', { probeId });
  }
  return deleted;
}

/**
 * Clear all probes
 */
export function clearAllProbes(): void {
  probes.clear();
  probeHistory.clear();
  logger.info('All probes cleared');
}

/**
 * Initialize default probes
 */
export function initializeDefaultProbes(): void {
  // Liveness probe
  const liveness = createProbe(
    'liveness',
    'Liveness Check',
    'Basic application health check',
    { intervalMs: 10000, timeoutMs: 5000 }
  );
  registerProbeExecutor(liveness.id, async (probe) => ({
    probe,
    status: 'healthy',
    latencyMs: 0,
    timestamp: new Date(),
    details: { uptime: process.uptime() },
  }));

  // Readiness probe
  const readiness = createProbe(
    'readiness',
    'Readiness Check',
    'Check if application is ready to serve traffic',
    { intervalMs: 15000, timeoutMs: 5000, successThreshold: 1, failureThreshold: 3 }
  );
  registerProbeExecutor(readiness.id, async (probe) => {
    try {
      const { getCurrentState } = await import('../continuous-readiness');
      const state = getCurrentState();
      return {
        probe,
        status: state === 'READY' ? 'healthy' : state === 'DEGRADED' ? 'degraded' : 'unhealthy',
        latencyMs: 0,
        timestamp: new Date(),
        details: { state },
      };
    } catch {
      return {
        probe,
        status: 'healthy',
        latencyMs: 0,
        timestamp: new Date(),
      };
    }
  });

  // Database probe
  const database = createProbe(
    'database',
    'Database Connection',
    'PostgreSQL database connectivity check',
    { intervalMs: 30000, timeoutMs: 5000, failureThreshold: 2 }
  );
  registerProbeExecutor(database.id, async (probe) => {
    const startTime = Date.now();
    try {
      const { pool } = await import('../db');
      await pool.query('SELECT 1');
      return {
        probe,
        status: 'healthy',
        latencyMs: Date.now() - startTime,
        timestamp: new Date(),
        details: { connected: true },
      };
    } catch (err) {
      return {
        probe,
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        timestamp: new Date(),
        error: err instanceof Error ? err.message : 'Database connection failed',
      };
    }
  });

  // Memory probe
  const memory = createProbe(
    'memory',
    'Memory Usage',
    'Check heap memory usage',
    { intervalMs: 30000, timeoutMs: 1000 }
  );
  registerProbeExecutor(memory.id, async (probe) => {
    const memUsage = process.memoryUsage();
    const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    let status: ProbeStatus = 'healthy';
    if (heapPercent > 90) {
      status = 'unhealthy';
    } else if (heapPercent > 75) {
      status = 'degraded';
    }

    return {
      probe,
      status,
      latencyMs: 0,
      timestamp: new Date(),
      details: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapPercent: Math.round(heapPercent),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
      },
    };
  });

  // AI Provider probe
  const aiProvider = createProbe(
    'external_api',
    'AI Providers',
    'Check AI provider health',
    { intervalMs: 60000, timeoutMs: 10000 }
  );
  registerProbeExecutor(aiProvider.id, async (probe) => {
    try {
      const { getHealthTracker } = await import('../ai-orchestrator/health-tracker');
      const tracker = getHealthTracker();
      const healthData = tracker.getAllHealth();

      const healthy = healthData.filter(h => (h as any).status === 'healthy').length;
      const total = healthData.length;

      let status: ProbeStatus = 'healthy';
      if (healthy === 0) {
        status = 'unhealthy';
      } else if (healthy < total / 2) {
        status = 'degraded';
      }

      return {
        probe,
        status,
        latencyMs: 0,
        timestamp: new Date(),
        details: {
          healthyProviders: healthy,
          totalProviders: total,
          providers: healthData.map(h => ({ provider: h.provider, status: (h as any).status })),
        },
      };
    } catch {
      return {
        probe,
        status: 'healthy',
        latencyMs: 0,
        timestamp: new Date(),
        details: { message: 'AI health tracker not available' },
      };
    }
  });

  // Queue probe
  const queue = createProbe(
    'queue',
    'Job Queue',
    'Check job queue health',
    { intervalMs: 30000, timeoutMs: 5000 }
  );
  registerProbeExecutor(queue.id, async (probe) => {
    try {
      const { jobQueue } = await import('../job-queue');
      const stats = await jobQueue.getStats();

      const queueDepth = stats.pending + stats.processing;
      let status: ProbeStatus = 'healthy';

      if (queueDepth > 500) {
        status = 'unhealthy';
      } else if (queueDepth > 100) {
        status = 'degraded';
      }

      return {
        probe,
        status,
        latencyMs: 0,
        timestamp: new Date(),
        details: {
          pending: stats.pending,
          processing: stats.processing,
          completed: stats.completed,
          failed: stats.failed,
        },
      };
    } catch {
      return {
        probe,
        status: 'healthy',
        latencyMs: 0,
        timestamp: new Date(),
        details: { message: 'Job queue not available' },
      };
    }
  });

  // Backpressure probe
  const backpressure = createProbe(
    'custom',
    'Backpressure Status',
    'Check system backpressure level',
    { intervalMs: 15000, timeoutMs: 1000 }
  );
  registerProbeExecutor(backpressure.id, async (probe) => {
    try {
      const { getBackpressureController } = await import('../ops/backpressure');
      const controller = getBackpressureController();
      const state = controller.getState();

      let status: ProbeStatus = 'healthy';
      if (state.level === 'heavy') {
        status = 'unhealthy';
      } else if (state.level === 'light') {
        status = 'degraded';
      }

      return {
        probe,
        status,
        latencyMs: 0,
        timestamp: new Date(),
        details: {
          level: state.level,
          isActive: state.isActive,
          reason: state.reason,
        },
      };
    } catch {
      return {
        probe,
        status: 'healthy',
        latencyMs: 0,
        timestamp: new Date(),
      };
    }
  });

  // Cost guards probe
  const costGuards = createProbe(
    'custom',
    'Cost Budget',
    'Check cost budget status',
    { intervalMs: 60000, timeoutMs: 1000 }
  );
  registerProbeExecutor(costGuards.id, async (probe) => {
    try {
      const { getCostGuards } = await import('../ops/cost-guards');
      const guards = getCostGuards();
      const degradedFeatures = guards.getDegradedFeatures();

      let status: ProbeStatus = 'healthy';
      if (degradedFeatures.length > 2) {
        status = 'unhealthy';
      } else if (degradedFeatures.length > 0) {
        status = 'degraded';
      }

      return {
        probe,
        status,
        latencyMs: 0,
        timestamp: new Date(),
        details: {
          degradedFeatures,
          totalSpending: guards.getTotalSpending(),
        },
      };
    } catch {
      return {
        probe,
        status: 'healthy',
        latencyMs: 0,
        timestamp: new Date(),
      };
    }
  });

  logger.info('Default health probes initialized', { count: probes.size });
}

/**
 * Get probe statistics
 */
export function getProbeStats(): {
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  unknown: number;
  avgLatencyMs: number;
  byType: Record<ProbeType, { count: number; healthy: number }>;
} {
  const stats = {
    total: 0,
    healthy: 0,
    degraded: 0,
    unhealthy: 0,
    unknown: 0,
    avgLatencyMs: 0,
    byType: {} as Record<ProbeType, { count: number; healthy: number }>,
  };

  let totalLatency = 0;
  let latencyCount = 0;

  for (const probe of probes.values()) {
    stats.total++;

    switch (probe.lastStatus) {
      case 'healthy': stats.healthy++; break;
      case 'degraded': stats.degraded++; break;
      case 'unhealthy': stats.unhealthy++; break;
      case 'unknown': stats.unknown++; break;
    }

    if (!stats.byType[probe.type]) {
      stats.byType[probe.type] = { count: 0, healthy: 0 };
    }
    stats.byType[probe.type].count++;
    if (probe.lastStatus === 'healthy') {
      stats.byType[probe.type].healthy++;
    }

    if (probe.latencyMs !== undefined) {
      totalLatency += probe.latencyMs;
      latencyCount++;
    }
  }

  stats.avgLatencyMs = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;

  return stats;
}

export {
  ProbeExecutor,
  ProbeConfig,
};
