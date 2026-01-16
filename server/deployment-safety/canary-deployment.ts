/**
 * Canary Deployment Controller
 *
 * FEATURE: Progressive traffic shifting with automatic rollback
 * - Gradual traffic percentage increase
 * - Real-time metrics comparison
 * - Automatic rollback on threshold breach
 * - Promotion on success
 *
 * Feature flag: ENABLE_CANARY_DEPLOYMENT=true
 */

import { randomUUID } from 'crypto';
import { log } from '../lib/logger';
import type {
  CanaryDeployment,
  CanaryConfig,
  CanaryMetrics,
  CanaryEvaluation,
  CanaryDecision,
  CanaryStatus,
  Environment,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Canary] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[Canary] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[Canary] ${msg}`, undefined, data),
  alert: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[Canary][ALERT] ${msg}`, data),
};

// Default canary configuration
const DEFAULT_CONFIG: CanaryConfig = {
  initialPercentage: 5,
  incrementPercentage: 10,
  intervalMs: 60000, // 1 minute per stage
  maxPercentage: 100,
  successThreshold: 0.95, // 95% success rate required
  errorRateThreshold: 0.05, // 5% error rate triggers rollback
  latencyThresholdMs: 3000, // 3 second P95 latency threshold
  minimumRequests: 100, // Minimum requests before evaluation
  autoPromote: true,
  autoRollback: true,
};

// Bounded storage
const MAX_DEPLOYMENTS = 50;
const MAX_EVALUATIONS = 100;

// Active deployments
const deployments: Map<string, CanaryDeployment> = new Map();

// Event subscribers
type CanaryEventHandler = (deployment: CanaryDeployment, event: string) => void;
const eventHandlers: Set<CanaryEventHandler> = new Set();

// Evaluation interval handle
let evaluationInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Create empty metrics
 */
function createEmptyMetrics(): CanaryMetrics {
  return {
    errorRate: 0,
    latencyP50Ms: 0,
    latencyP95Ms: 0,
    latencyP99Ms: 0,
    requestCount: 0,
    successCount: 0,
    failureCount: 0,
    saturationPercent: 0,
  };
}

/**
 * Start a new canary deployment
 */
export function startCanary(
  version: string,
  baselineVersion: string,
  environment: Environment,
  config?: Partial<CanaryConfig>
): CanaryDeployment {
  const id = randomUUID();
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const deployment: CanaryDeployment = {
    id,
    version,
    baselineVersion,
    environment,
    status: 'initializing',
    currentPercentage: 0,
    config: fullConfig,
    startedAt: new Date(),
    canaryMetrics: createEmptyMetrics(),
    baselineMetrics: createEmptyMetrics(),
    evaluations: [],
  };

  // Bounded storage
  if (deployments.size >= MAX_DEPLOYMENTS) {
    const oldest = Array.from(deployments.entries())
      .filter(([_, d]) => d.status === 'success' || d.status === 'failed' || d.status === 'rolled_back')
      .sort((a, b) => (a[1].completedAt?.getTime() || 0) - (b[1].completedAt?.getTime() || 0))[0];
    if (oldest) {
      deployments.delete(oldest[0]);
    }
  }

  deployments.set(id, deployment);

  logger.info('Canary deployment started', {
    id,
    version,
    baselineVersion,
    environment,
    initialPercentage: fullConfig.initialPercentage,
  });

  // Start with initial percentage
  setCanaryPercentage(id, fullConfig.initialPercentage);

  emitEvent(deployment, 'started');

  return deployment;
}

/**
 * Set canary traffic percentage
 */
export function setCanaryPercentage(deploymentId: string, percentage: number): CanaryDeployment | null {
  const deployment = deployments.get(deploymentId);
  if (!deployment) return null;

  if (deployment.status !== 'initializing' && deployment.status !== 'running') {
    logger.warn('Cannot set percentage on completed canary', {
      deploymentId,
      status: deployment.status,
    });
    return null;
  }

  const oldPercentage = deployment.currentPercentage;
  deployment.currentPercentage = Math.min(Math.max(0, percentage), deployment.config.maxPercentage);

  if (deployment.status === 'initializing') {
    deployment.status = 'running';
  }

  logger.info('Canary percentage updated', {
    deploymentId,
    oldPercentage,
    newPercentage: deployment.currentPercentage,
  });

  emitEvent(deployment, 'percentage_changed');

  return deployment;
}

/**
 * Update canary metrics
 */
export function updateCanaryMetrics(
  deploymentId: string,
  canaryMetrics: Partial<CanaryMetrics>,
  baselineMetrics?: Partial<CanaryMetrics>
): CanaryDeployment | null {
  const deployment = deployments.get(deploymentId);
  if (!deployment) return null;

  // Update canary metrics
  Object.assign(deployment.canaryMetrics, canaryMetrics);

  // Recalculate error rate
  if (deployment.canaryMetrics.requestCount > 0) {
    deployment.canaryMetrics.errorRate =
      deployment.canaryMetrics.failureCount / deployment.canaryMetrics.requestCount;
  }

  // Update baseline metrics if provided
  if (baselineMetrics) {
    Object.assign(deployment.baselineMetrics, baselineMetrics);
    if (deployment.baselineMetrics.requestCount > 0) {
      deployment.baselineMetrics.errorRate =
        deployment.baselineMetrics.failureCount / deployment.baselineMetrics.requestCount;
    }
  }

  return deployment;
}

/**
 * Evaluate canary health
 */
export function evaluateCanary(deploymentId: string): CanaryEvaluation | null {
  const deployment = deployments.get(deploymentId);
  if (!deployment) return null;

  if (deployment.status !== 'running') {
    return null;
  }

  deployment.status = 'evaluating';
  deployment.lastEvaluatedAt = new Date();

  const reasons: string[] = [];
  let passed = true;

  const canary = deployment.canaryMetrics;
  const baseline = deployment.baselineMetrics;
  const config = deployment.config;

  // Check minimum request threshold
  if (canary.requestCount < config.minimumRequests) {
    reasons.push(`Insufficient requests: ${canary.requestCount} < ${config.minimumRequests}`);
    passed = true; // Don't fail yet, wait for more data
  } else {
    // Check error rate
    if (canary.errorRate > config.errorRateThreshold) {
      reasons.push(`Error rate too high: ${(canary.errorRate * 100).toFixed(2)}% > ${(config.errorRateThreshold * 100).toFixed(2)}%`);
      passed = false;
    }

    // Check latency
    if (canary.latencyP95Ms > config.latencyThresholdMs) {
      reasons.push(`P95 latency too high: ${canary.latencyP95Ms}ms > ${config.latencyThresholdMs}ms`);
      passed = false;
    }

    // Compare with baseline (if available)
    if (baseline.requestCount >= config.minimumRequests) {
      // Error rate comparison (canary shouldn't be significantly worse)
      const errorRateRatio = baseline.errorRate > 0 ? canary.errorRate / baseline.errorRate : 1;
      if (errorRateRatio > 2) {
        reasons.push(`Error rate 2x+ baseline: ${(canary.errorRate * 100).toFixed(2)}% vs ${(baseline.errorRate * 100).toFixed(2)}%`);
        passed = false;
      }

      // Latency comparison
      const latencyRatio = baseline.latencyP95Ms > 0 ? canary.latencyP95Ms / baseline.latencyP95Ms : 1;
      if (latencyRatio > 1.5) {
        reasons.push(`P95 latency 1.5x+ baseline: ${canary.latencyP95Ms}ms vs ${baseline.latencyP95Ms}ms`);
        passed = false;
      }
    }

    // Success rate check
    const successRate = canary.requestCount > 0 ? canary.successCount / canary.requestCount : 0;
    if (successRate < config.successThreshold) {
      reasons.push(`Success rate too low: ${(successRate * 100).toFixed(2)}% < ${(config.successThreshold * 100).toFixed(2)}%`);
      passed = false;
    }
  }

  const evaluation: CanaryEvaluation = {
    timestamp: new Date(),
    percentage: deployment.currentPercentage,
    canaryMetrics: { ...canary },
    baselineMetrics: { ...baseline },
    passed,
    reasons,
  };

  // Bounded evaluations
  deployment.evaluations.push(evaluation);
  if (deployment.evaluations.length > MAX_EVALUATIONS) {
    deployment.evaluations.shift();
  }

  deployment.status = 'running';

  logger.info('Canary evaluation completed', {
    deploymentId,
    passed,
    percentage: deployment.currentPercentage,
    errorRate: canary.errorRate,
    p95Latency: canary.latencyP95Ms,
    reasons: reasons.length > 0 ? reasons : undefined,
  });

  // Take action based on result
  if (!passed && config.autoRollback) {
    rollbackCanary(deploymentId, reasons.join('; '));
  } else if (passed && deployment.currentPercentage < config.maxPercentage) {
    // Increase percentage
    const newPercentage = Math.min(
      deployment.currentPercentage + config.incrementPercentage,
      config.maxPercentage
    );
    setCanaryPercentage(deploymentId, newPercentage);
  } else if (passed && deployment.currentPercentage >= config.maxPercentage && config.autoPromote) {
    // Auto-promote
    promoteCanary(deploymentId);
  }

  emitEvent(deployment, 'evaluated');

  return evaluation;
}

/**
 * Rollback canary deployment
 */
export function rollbackCanary(deploymentId: string, reason: string, actor?: string): CanaryDeployment | null {
  const deployment = deployments.get(deploymentId);
  if (!deployment) return null;

  if (deployment.status === 'rolled_back' || deployment.status === 'promoted') {
    logger.warn('Canary already completed', {
      deploymentId,
      status: deployment.status,
    });
    return null;
  }

  deployment.status = 'rolled_back';
  deployment.currentPercentage = 0;
  deployment.completedAt = new Date();
  deployment.decision = {
    action: 'rollback',
    reason,
    timestamp: new Date(),
    automatic: !actor,
    actor,
  };

  logger.alert('Canary deployment rolled back', {
    deploymentId,
    version: deployment.version,
    reason,
    automatic: !actor,
  });

  emitEvent(deployment, 'rolled_back');

  return deployment;
}

/**
 * Promote canary to full deployment
 */
export function promoteCanary(deploymentId: string, actor?: string): CanaryDeployment | null {
  const deployment = deployments.get(deploymentId);
  if (!deployment) return null;

  if (deployment.status !== 'running' && deployment.status !== 'evaluating') {
    logger.warn('Cannot promote canary in current state', {
      deploymentId,
      status: deployment.status,
    });
    return null;
  }

  deployment.status = 'promoted';
  deployment.currentPercentage = 100;
  deployment.completedAt = new Date();
  deployment.decision = {
    action: 'promote',
    reason: 'Canary deployment successful',
    timestamp: new Date(),
    automatic: !actor,
    actor,
  };

  logger.info('Canary deployment promoted', {
    deploymentId,
    version: deployment.version,
    automatic: !actor,
  });

  emitEvent(deployment, 'promoted');

  return deployment;
}

/**
 * Get canary deployment
 */
export function getCanary(deploymentId: string): CanaryDeployment | null {
  return deployments.get(deploymentId) || null;
}

/**
 * Get active canary for environment
 */
export function getActiveCanary(environment: Environment): CanaryDeployment | null {
  for (const deployment of deployments.values()) {
    if (
      deployment.environment === environment &&
      (deployment.status === 'running' || deployment.status === 'evaluating' || deployment.status === 'initializing')
    ) {
      return deployment;
    }
  }
  return null;
}

/**
 * List canary deployments
 */
export function listCanaryDeployments(options?: {
  environment?: Environment;
  status?: CanaryStatus;
  limit?: number;
}): CanaryDeployment[] {
  let results = Array.from(deployments.values());

  if (options?.environment) {
    results = results.filter(d => d.environment === options.environment);
  }

  if (options?.status) {
    results = results.filter(d => d.status === options.status);
  }

  results.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  if (options?.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Subscribe to canary events
 */
export function subscribeToCanaryEvents(handler: CanaryEventHandler): () => void {
  eventHandlers.add(handler);
  return () => {
    eventHandlers.delete(handler);
  };
}

/**
 * Emit event to all subscribers
 */
function emitEvent(deployment: CanaryDeployment, event: string): void {
  for (const handler of eventHandlers) {
    try {
      handler(deployment, event);
    } catch (err) {
      logger.warn('Canary event handler error', {
        event,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}

/**
 * Start automatic evaluation loop
 */
export function startEvaluationLoop(intervalMs: number = 30000): void {
  if (evaluationInterval) {
    logger.warn('Evaluation loop already running');
    return;
  }

  evaluationInterval = setInterval(() => {
    for (const deployment of deployments.values()) {
      if (deployment.status === 'running') {
        const timeSinceLastEval = deployment.lastEvaluatedAt
          ? Date.now() - deployment.lastEvaluatedAt.getTime()
          : Infinity;

        // Evaluate if enough time has passed
        if (timeSinceLastEval >= deployment.config.intervalMs) {
          evaluateCanary(deployment.id);
        }
      }
    }
  }, intervalMs);

  logger.info('Canary evaluation loop started', { intervalMs });
}

/**
 * Stop evaluation loop
 */
export function stopEvaluationLoop(): void {
  if (evaluationInterval) {
    clearInterval(evaluationInterval);
    evaluationInterval = null;
    logger.info('Canary evaluation loop stopped');
  }
}

/**
 * Get canary statistics
 */
export function getCanaryStats(): {
  total: number;
  active: number;
  promoted: number;
  rolledBack: number;
  successRate: number;
  avgDurationMs: number;
} {
  let total = 0;
  let active = 0;
  let promoted = 0;
  let rolledBack = 0;
  let totalDurationMs = 0;
  let completedCount = 0;

  for (const deployment of deployments.values()) {
    total++;

    if (deployment.status === 'running' || deployment.status === 'evaluating' || deployment.status === 'initializing') {
      active++;
    } else if (deployment.status === 'promoted') {
      promoted++;
      if (deployment.completedAt) {
        totalDurationMs += deployment.completedAt.getTime() - deployment.startedAt.getTime();
        completedCount++;
      }
    } else if (deployment.status === 'rolled_back') {
      rolledBack++;
      if (deployment.completedAt) {
        totalDurationMs += deployment.completedAt.getTime() - deployment.startedAt.getTime();
        completedCount++;
      }
    }
  }

  return {
    total,
    active,
    promoted,
    rolledBack,
    successRate: promoted + rolledBack > 0 ? promoted / (promoted + rolledBack) : 0,
    avgDurationMs: completedCount > 0 ? Math.round(totalDurationMs / completedCount) : 0,
  };
}

/**
 * Collect metrics from monitoring systems
 */
export async function collectMetricsFromMonitoring(deploymentId: string): Promise<void> {
  const deployment = deployments.get(deploymentId);
  if (!deployment) return;

  try {
    // Get latency metrics
    const { getLatencyTracker } = await import('../monitoring/latency-tracker');
    const tracker = getLatencyTracker();
    const stats = tracker.getOverallStats();

    // Update canary metrics with real data
    updateCanaryMetrics(deploymentId, {
      latencyP50Ms: stats.p50,
      latencyP95Ms: stats.p95,
      latencyP99Ms: stats.p99,
      requestCount: stats.totalRequests,
    });
  } catch (err) {
    logger.warn('Failed to collect metrics from monitoring', {
      deploymentId,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * Clear all deployments (for testing)
 */
export function clearAllDeployments(): void {
  deployments.clear();
  logger.info('All canary deployments cleared');
}

export { DEFAULT_CONFIG as defaultCanaryConfig };
