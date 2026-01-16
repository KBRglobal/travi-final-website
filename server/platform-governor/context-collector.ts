/**
 * Autonomous Platform Governor - Context Collector
 * Gathers current system state for rule evaluation
 */

import { createLogger } from '../lib/logger';
import { GOVERNOR_CONFIG } from './config';
import type { GovernorContext } from './types';

const logger = createLogger('governor-context');

// ============================================================================
// Metric Tracking (Updated by external systems)
// ============================================================================

let aiCostToday = 0;
let errorCount = 0;
let requestCount = 0;
let queueBacklog = 0;
const externalApiStatus: Record<string, 'healthy' | 'degraded' | 'down'> = {};

// ============================================================================
// Update Functions (Called by other systems)
// ============================================================================

export function recordAiCost(cost: number): void {
  aiCostToday += cost;
}

export function resetDailyAiCost(): void {
  aiCostToday = 0;
}

export function recordError(): void {
  errorCount++;
}

export function recordRequest(): void {
  requestCount++;
}

export function resetErrorMetrics(): void {
  errorCount = 0;
  requestCount = 0;
}

export function updateQueueBacklog(size: number): void {
  queueBacklog = size;
}

export function updateExternalApiStatus(
  api: string,
  status: 'healthy' | 'degraded' | 'down'
): void {
  externalApiStatus[api] = status;
}

// ============================================================================
// Context Collection
// ============================================================================

function getMemoryUsagePercent(): number {
  try {
    const used = process.memoryUsage();
    const heapUsed = used.heapUsed;
    const heapTotal = used.heapTotal;
    return Math.round((heapUsed / heapTotal) * 100);
  } catch {
    return 0;
  }
}

function getIncidentSeverity(): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  try {
    // Try to check incidents module
    const { isIncidentsEnabled, hasCriticalOpenIncidents, getSummary } =
      require('../incidents') as {
        isIncidentsEnabled: () => boolean;
        hasCriticalOpenIncidents: () => boolean;
        getSummary: () => { bySeverity: { critical: number; warn: number } };
      };

    if (!isIncidentsEnabled()) return 'none';

    if (hasCriticalOpenIncidents()) return 'critical';

    const summary = getSummary();
    if (summary.bySeverity.critical > 0) return 'critical';
    if (summary.bySeverity.warn > 0) return 'high';

    return 'none';
  } catch {
    return 'none';
  }
}

export function collectContext(): GovernorContext {
  const errorRate = requestCount > 0 ? errorCount / requestCount : 0;

  return {
    aiCostToday,
    aiCostBudget: GOVERNOR_CONFIG.thresholds.aiCostBudget,
    errorRate,
    errorRateThreshold: GOVERNOR_CONFIG.thresholds.errorRateSpike,
    incidentSeverity: getIncidentSeverity(),
    queueBacklog,
    queueBacklogThreshold: GOVERNOR_CONFIG.thresholds.queueBacklogMax,
    memoryUsagePercent: getMemoryUsagePercent(),
    memoryThreshold: GOVERNOR_CONFIG.thresholds.memoryPressurePercent,
    externalApiStatus: { ...externalApiStatus },
  };
}

// ============================================================================
// Manual Context for Testing
// ============================================================================

export function createTestContext(
  overrides: Partial<GovernorContext> = {}
): GovernorContext {
  return {
    aiCostToday: 0,
    aiCostBudget: 100,
    errorRate: 0,
    errorRateThreshold: 0.1,
    incidentSeverity: 'none',
    queueBacklog: 0,
    queueBacklogThreshold: 1000,
    memoryUsagePercent: 50,
    memoryThreshold: 90,
    externalApiStatus: {},
    ...overrides,
  };
}
