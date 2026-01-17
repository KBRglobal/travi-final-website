/**
 * Load Shedding Controller - Graceful Degradation Under Load
 *
 * FEATURE: Advanced load shedding with multiple strategies
 * - Random shedding
 * - Priority-based shedding
 * - FIFO queue management
 * - Adaptive shedding based on system metrics
 *
 * Feature flag: ENABLE_LOAD_SHEDDING=true
 */

import { log } from '../lib/logger';
import type {
  LoadSheddingConfig,
  LoadSheddingState,
  SheddingStrategy,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[LoadShedding] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[LoadShedding] ${msg}`, data),
  alert: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[LoadShedding][ALERT] ${msg}`, data),
};

// Default configuration
const DEFAULT_CONFIG: LoadSheddingConfig = {
  enabled: false,
  strategy: 'adaptive',
  thresholds: {
    warning: 70,
    critical: 85,
    emergency: 95,
  },
  priorities: {
    '/api/health': 100,
    '/api/health/live': 100,
    '/api/health/ready': 100,
    '/api/auth': 90,
    '/api/users': 80,
    '/api/admin': 70,
    '/api/chat': 50,
    '/api/search': 40,
    '/api/aeo': 40,
    'default': 50,
  },
  exemptEndpoints: [
    '/api/health',
    '/api/health/live',
    '/api/health/ready',
  ],
  retryAfterSeconds: 30,
  gracefulDegradation: true,
};

// State
let config: LoadSheddingConfig = { ...DEFAULT_CONFIG };
let state: LoadSheddingState = {
  active: false,
  level: 'none',
  sheddingPercent: 0,
  rejectedRequests: 0,
  acceptedRequests: 0,
  lastDecision: new Date(),
};

// Metrics tracking
interface LoadMetrics {
  timestamp: Date;
  cpuPercent: number;
  memoryPercent: number;
  queueDepth: number;
  latencyP95Ms: number;
  requestRate: number;
  errorRate: number;
}

const MAX_METRICS_HISTORY = 60;
const metricsHistory: LoadMetrics[] = [];

// Request tracking for rate calculation
const requestWindow: Date[] = [];
const REQUEST_WINDOW_MS = 60000; // 1 minute window

// Decision history
interface SheddingDecision {
  timestamp: Date;
  endpoint: string;
  priority: number;
  accepted: boolean;
  reason: string;
  level: LoadSheddingState['level'];
}

const MAX_DECISIONS = 1000;
const decisionHistory: SheddingDecision[] = [];

/**
 * Update configuration
 */
export function updateConfig(updates: Partial<LoadSheddingConfig>): void {
  config = { ...config, ...updates };
  logger.info('Load shedding config updated', {
    enabled: config.enabled,
    strategy: config.strategy,
  });
}

/**
 * Get current configuration
 */
export function getConfig(): LoadSheddingConfig {
  return { ...config };
}

/**
 * Get current state
 */
export function getState(): LoadSheddingState {
  return { ...state };
}

/**
 * Update system metrics
 */
export function updateMetrics(metrics: Omit<LoadMetrics, 'timestamp'>): void {
  const fullMetrics: LoadMetrics = {
    ...metrics,
    timestamp: new Date(),
  };

  metricsHistory.push(fullMetrics);
  if (metricsHistory.length > MAX_METRICS_HISTORY) {
    metricsHistory.shift();
  }

  // Recalculate load level
  recalculateLevel();
}

/**
 * Collect metrics from system
 */
export async function collectSystemMetrics(): Promise<LoadMetrics> {
  const memUsage = process.memoryUsage();
  const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  // CPU usage approximation
  const cpuUsage = process.cpuUsage();
  const cpuPercent = Math.min(100, (cpuUsage.user + cpuUsage.system) / 1000000);

  // Queue depth
  let queueDepth = 0;
  try {
    const { jobQueue } = await import('../job-queue');
    const stats = await jobQueue.getStats();
    queueDepth = stats.pending + stats.processing;
  } catch {
    // Queue not available
  }

  // Latency from monitoring
  let latencyP95Ms = 0;
  try {
    const latencyTrackerModule = await import('../monitoring/latency-tracker') as any;
    const tracker = latencyTrackerModule.getLatencyTracker();
    const stats = tracker.getOverallStats();
    latencyP95Ms = stats.p95;
  } catch {
    // Latency tracker not available
  }

  // Calculate request rate
  const now = Date.now();
  const cutoff = now - REQUEST_WINDOW_MS;
  const recentRequests = requestWindow.filter(r => r.getTime() > cutoff);
  const requestRate = recentRequests.length;

  // Error rate would need to be tracked separately
  const errorRate = 0;

  return {
    timestamp: new Date(),
    cpuPercent,
    memoryPercent,
    queueDepth,
    latencyP95Ms,
    requestRate,
    errorRate,
  };
}

/**
 * Recalculate load level based on metrics
 */
function recalculateLevel(): void {
  if (!config.enabled) {
    state.level = 'none';
    state.active = false;
    state.sheddingPercent = 0;
    return;
  }

  const latest = metricsHistory[metricsHistory.length - 1];
  if (!latest) return;

  // Calculate composite load score
  const loadScore = calculateLoadScore(latest);

  let newLevel: LoadSheddingState['level'] = 'none';
  let sheddingPercent = 0;

  if (loadScore >= config.thresholds.emergency) {
    newLevel = 'emergency';
    sheddingPercent = 90; // Shed 90% of traffic
  } else if (loadScore >= config.thresholds.critical) {
    newLevel = 'critical';
    sheddingPercent = 50; // Shed 50% of traffic
  } else if (loadScore >= config.thresholds.warning) {
    newLevel = 'warning';
    sheddingPercent = 20; // Shed 20% of traffic
  }

  // Level change logging
  if (newLevel !== state.level) {
    if (newLevel !== 'none') {
      logger.alert('Load shedding level changed', {
        previousLevel: state.level,
        newLevel,
        loadScore,
        sheddingPercent,
      });
    } else {
      logger.info('Load shedding deactivated', {
        previousLevel: state.level,
      });
    }
  }

  state.level = newLevel;
  state.active = newLevel !== 'none';
  state.sheddingPercent = sheddingPercent;
  state.activatedAt = state.active ? (state.activatedAt || new Date()) : undefined;
  state.reason = state.active ? `Load score: ${loadScore}%` : undefined;
}

/**
 * Calculate composite load score
 */
function calculateLoadScore(metrics: LoadMetrics): number {
  // Weighted average of different metrics
  const weights = {
    cpu: 0.25,
    memory: 0.25,
    latency: 0.25,
    queue: 0.25,
  };

  // Normalize latency to 0-100 scale (assuming 5s is 100%)
  const latencyScore = Math.min(100, (metrics.latencyP95Ms / 5000) * 100);

  // Normalize queue depth (assuming 500 is 100%)
  const queueScore = Math.min(100, (metrics.queueDepth / 500) * 100);

  return (
    metrics.cpuPercent * weights.cpu +
    metrics.memoryPercent * weights.memory +
    latencyScore * weights.latency +
    queueScore * weights.queue
  );
}

/**
 * Should accept request based on load shedding rules
 */
export function shouldAcceptRequest(endpoint: string): {
  accepted: boolean;
  retryAfterSeconds?: number;
  reason: string;
} {
  // Track request
  requestWindow.push(new Date());
  if (requestWindow.length > 10000) {
    requestWindow.splice(0, 1000);
  }

  // Not enabled
  if (!config.enabled) {
    state.acceptedRequests++;
    return { accepted: true, reason: 'Load shedding disabled' };
  }

  // Exempt endpoints always pass
  if (config.exemptEndpoints.some(exempt => endpoint.startsWith(exempt))) {
    state.acceptedRequests++;
    recordDecision(endpoint, 100, true, 'Exempt endpoint', state.level);
    return { accepted: true, reason: 'Exempt endpoint' };
  }

  // No load shedding active
  if (!state.active) {
    state.acceptedRequests++;
    recordDecision(endpoint, getPriority(endpoint), true, 'No shedding active', 'none');
    return { accepted: true, reason: 'No load shedding active' };
  }

  // Apply shedding strategy
  const decision = applyStrategy(endpoint);
  state.lastDecision = new Date();

  if (decision.accepted) {
    state.acceptedRequests++;
  } else {
    state.rejectedRequests++;
  }

  recordDecision(endpoint, getPriority(endpoint), decision.accepted, decision.reason, state.level);

  return decision;
}

/**
 * Apply shedding strategy
 */
function applyStrategy(endpoint: string): {
  accepted: boolean;
  retryAfterSeconds?: number;
  reason: string;
} {
  switch (config.strategy) {
    case 'random':
      return randomShedding();

    case 'priority':
      return priorityShedding(endpoint);

    case 'fifo':
      return fifoShedding();

    case 'adaptive':
      return adaptiveShedding(endpoint);

    default:
      return { accepted: true, reason: 'Unknown strategy' };
  }
}

/**
 * Random shedding - randomly reject based on shedding percent
 */
function randomShedding(): {
  accepted: boolean;
  retryAfterSeconds?: number;
  reason: string;
} {
  const random = Math.random() * 100;

  if (random < state.sheddingPercent) {
    return {
      accepted: false,
      retryAfterSeconds: config.retryAfterSeconds,
      reason: `Random shed (${state.sheddingPercent}% rejection rate)`,
    };
  }

  return { accepted: true, reason: 'Random accept' };
}

/**
 * Priority-based shedding - lower priority requests shed first
 */
function priorityShedding(endpoint: string): {
  accepted: boolean;
  retryAfterSeconds?: number;
  reason: string;
} {
  const priority = getPriority(endpoint);

  // Calculate acceptance threshold based on priority and load level
  let acceptanceThreshold: number;
  switch (state.level) {
    case 'emergency':
      acceptanceThreshold = 95; // Only priority 95+ accepted
      break;
    case 'critical':
      acceptanceThreshold = 70; // Priority 70+ accepted
      break;
    case 'warning':
      acceptanceThreshold = 50; // Priority 50+ accepted
      break;
    default:
      acceptanceThreshold = 0;
  }

  if (priority < acceptanceThreshold) {
    return {
      accepted: false,
      retryAfterSeconds: config.retryAfterSeconds,
      reason: `Priority too low (${priority} < ${acceptanceThreshold})`,
    };
  }

  return { accepted: true, reason: `Priority accepted (${priority})` };
}

/**
 * FIFO shedding - shed newest requests first
 */
function fifoShedding(): {
  accepted: boolean;
  retryAfterSeconds?: number;
  reason: string;
} {
  // Calculate current request rate
  const now = Date.now();
  const oneSecondAgo = now - 1000;
  const recentRequests = requestWindow.filter(r => r.getTime() > oneSecondAgo).length;

  // Target rate based on load level
  let targetRate: number;
  switch (state.level) {
    case 'emergency':
      targetRate = 10; // 10 requests per second
      break;
    case 'critical':
      targetRate = 50;
      break;
    case 'warning':
      targetRate = 100;
      break;
    default:
      targetRate = Infinity;
  }

  if (recentRequests > targetRate) {
    return {
      accepted: false,
      retryAfterSeconds: config.retryAfterSeconds,
      reason: `Rate exceeded (${recentRequests} > ${targetRate} req/s)`,
    };
  }

  return { accepted: true, reason: 'Within rate limit' };
}

/**
 * Adaptive shedding - combine priority and random
 */
function adaptiveShedding(endpoint: string): {
  accepted: boolean;
  retryAfterSeconds?: number;
  reason: string;
} {
  const priority = getPriority(endpoint);

  // High priority requests get better odds
  const adjustedSheddingPercent = state.sheddingPercent * (1 - priority / 100);

  const random = Math.random() * 100;

  if (random < adjustedSheddingPercent) {
    return {
      accepted: false,
      retryAfterSeconds: config.retryAfterSeconds,
      reason: `Adaptive shed (adjusted ${adjustedSheddingPercent.toFixed(1)}% rate, priority ${priority})`,
    };
  }

  return { accepted: true, reason: `Adaptive accept (priority ${priority})` };
}

/**
 * Get priority for endpoint
 */
function getPriority(endpoint: string): number {
  // Exact match
  if (config.priorities[endpoint] !== undefined) {
    return config.priorities[endpoint];
  }

  // Prefix match
  for (const [pattern, priority] of Object.entries(config.priorities)) {
    if (pattern !== 'default' && endpoint.startsWith(pattern)) {
      return priority;
    }
  }

  return config.priorities.default || 50;
}

/**
 * Record shedding decision
 */
function recordDecision(
  endpoint: string,
  priority: number,
  accepted: boolean,
  reason: string,
  level: LoadSheddingState['level']
): void {
  decisionHistory.push({
    timestamp: new Date(),
    endpoint,
    priority,
    accepted,
    reason,
    level,
  });

  if (decisionHistory.length > MAX_DECISIONS) {
    decisionHistory.shift();
  }
}

/**
 * Get metrics history
 */
export function getMetricsHistory(): LoadMetrics[] {
  return [...metricsHistory];
}

/**
 * Get decision history
 */
export function getDecisionHistory(limit?: number): SheddingDecision[] {
  const history = [...decisionHistory];
  history.reverse();
  return limit ? history.slice(0, limit) : history;
}

/**
 * Get load shedding statistics
 */
export function getStats(): {
  state: LoadSheddingState;
  totalRequests: number;
  acceptedRequests: number;
  rejectedRequests: number;
  rejectionRate: number;
  currentLoadScore: number;
  averageLoadScore: number;
  byEndpoint: Record<string, { accepted: number; rejected: number }>;
} {
  const totalRequests = state.acceptedRequests + state.rejectedRequests;
  const rejectionRate = totalRequests > 0 ? state.rejectedRequests / totalRequests : 0;

  // Calculate load scores
  let currentLoadScore = 0;
  let averageLoadScore = 0;

  if (metricsHistory.length > 0) {
    currentLoadScore = calculateLoadScore(metricsHistory[metricsHistory.length - 1]);
    averageLoadScore = metricsHistory.reduce((sum, m) => sum + calculateLoadScore(m), 0) / metricsHistory.length;
  }

  // Aggregate by endpoint
  const byEndpoint: Record<string, { accepted: number; rejected: number }> = {};
  for (const decision of decisionHistory) {
    if (!byEndpoint[decision.endpoint]) {
      byEndpoint[decision.endpoint] = { accepted: 0, rejected: 0 };
    }
    if (decision.accepted) {
      byEndpoint[decision.endpoint].accepted++;
    } else {
      byEndpoint[decision.endpoint].rejected++;
    }
  }

  return {
    state: { ...state },
    totalRequests,
    acceptedRequests: state.acceptedRequests,
    rejectedRequests: state.rejectedRequests,
    rejectionRate,
    currentLoadScore,
    averageLoadScore,
    byEndpoint,
  };
}

/**
 * Reset statistics
 */
export function resetStats(): void {
  state.acceptedRequests = 0;
  state.rejectedRequests = 0;
  decisionHistory.length = 0;
  logger.info('Load shedding stats reset');
}

/**
 * Force a specific level (for testing/emergency)
 */
export function forceLevel(level: LoadSheddingState['level'], reason: string): void {
  state.level = level;
  state.active = level !== 'none';
  state.reason = `Forced: ${reason}`;

  switch (level) {
    case 'emergency':
      state.sheddingPercent = 90;
      break;
    case 'critical':
      state.sheddingPercent = 50;
      break;
    case 'warning':
      state.sheddingPercent = 20;
      break;
    default:
      state.sheddingPercent = 0;
  }

  state.activatedAt = state.active ? new Date() : undefined;

  logger.alert('Load shedding level forced', { level, reason });
}

/**
 * Clear forced level
 */
export function clearForcedLevel(): void {
  recalculateLevel();
  logger.info('Forced load shedding level cleared');
}

/**
 * Start automatic metric collection
 */
let metricsInterval: ReturnType<typeof setInterval> | null = null;

export function startMetricCollection(intervalMs: number = 5000): void {
  if (metricsInterval) {
    logger.warn('Metric collection already running');
    return;
  }

  metricsInterval = setInterval(async () => {
    try {
      const metrics = await collectSystemMetrics();
      updateMetrics(metrics);
    } catch (err) {
      logger.warn('Failed to collect metrics', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, intervalMs);

  logger.info('Load shedding metric collection started', { intervalMs });
}

/**
 * Stop metric collection
 */
export function stopMetricCollection(): void {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
    logger.info('Load shedding metric collection stopped');
  }
}

export { LoadMetrics, SheddingDecision };
