/**
 * Cost Anomaly Detection System
 *
 * FEATURE: Detect unusual spending patterns
 * - Spike detection
 * - Trend analysis
 * - Proactive alerting before limits
 * - Anomaly scoring
 *
 * Feature flag: ENABLE_COST_ANOMALY=true
 */

import { randomUUID } from 'crypto';
import { log } from '../lib/logger';
import type {
  CostAnomaly,
  CostForecast,
  CostAlert,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[CostAnomaly] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[CostAnomaly] ${msg}`, data),
  alert: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[CostAnomaly][ALERT] ${msg}`, data),
};

// Feature types
type Feature = 'search' | 'aeo' | 'chat' | 'octopus';

// Cost tracking
interface CostDataPoint {
  timestamp: Date;
  feature: Feature;
  cost: number;
  requestCount: number;
}

const MAX_DATA_POINTS = 10000;
const MAX_ANOMALIES = 500;
const MAX_ALERTS = 1000;

// Storage
const costData: Map<Feature, CostDataPoint[]> = new Map();
const anomalies: Map<string, CostAnomaly> = new Map();
const alerts: CostAlert[] = [];

// Configuration
interface AnomalyConfig {
  enabled: boolean;
  spikeThresholdMultiplier: number; // Spike if cost > mean * multiplier
  sustainedIncreasePercent: number; // Sustained increase detection
  windowSizeMs: number; // Rolling window for baseline
  alertThresholds: {
    warning: number; // % of budget to alert
    critical: number; // % of budget for critical alert
  };
}

const DEFAULT_CONFIG: AnomalyConfig = {
  enabled: true,
  spikeThresholdMultiplier: 3,
  sustainedIncreasePercent: 50,
  windowSizeMs: 3600000, // 1 hour
  alertThresholds: {
    warning: 70,
    critical: 90,
  },
};

let config: AnomalyConfig = { ...DEFAULT_CONFIG };

// Event handlers
type AnomalyEventHandler = (anomaly: CostAnomaly) => void;
type AlertEventHandler = (alert: CostAlert) => void;
const anomalyHandlers: Set<AnomalyEventHandler> = new Set();
const alertHandlers: Set<AlertEventHandler> = new Set();

// Detection interval
let detectionInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Record cost data point
 */
export function recordCost(feature: Feature, cost: number, requestCount: number = 1): void {
  const dataPoint: CostDataPoint = {
    timestamp: new Date(),
    feature,
    cost,
    requestCount,
  };

  let featureData = costData.get(feature);
  if (!featureData) {
    featureData = [];
    costData.set(feature, featureData);
  }

  featureData.push(dataPoint);

  // Bound data
  if (featureData.length > MAX_DATA_POINTS) {
    featureData.splice(0, 1000);
  }

  // Run real-time spike detection
  if (config.enabled) {
    detectSpike(feature, cost);
  }
}

/**
 * Detect cost spike
 */
function detectSpike(feature: Feature, currentCost: number): void {
  const data = costData.get(feature) || [];
  if (data.length < 10) return; // Need baseline data

  const now = Date.now();
  const windowStart = now - config.windowSizeMs;

  // Get baseline data (excluding last point)
  const baselineData = data
    .slice(0, -1)
    .filter(d => d.timestamp.getTime() > windowStart);

  if (baselineData.length < 5) return;

  // Calculate baseline statistics
  const costs = baselineData.map(d => d.cost);
  const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
  const stdDev = Math.sqrt(
    costs.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / costs.length
  );

  // Spike detection using z-score
  const zScore = stdDev > 0 ? (currentCost - mean) / stdDev : 0;

  // Spike if z-score > 3 or cost > mean * multiplier
  if (zScore > 3 || currentCost > mean * config.spikeThresholdMultiplier) {
    const deviationPercent = mean > 0 ? ((currentCost - mean) / mean) * 100 : 0;

    createAnomaly({
      feature,
      severity: deviationPercent > 200 ? 'critical' : deviationPercent > 100 ? 'high' : 'medium',
      type: 'spike',
      expectedCost: mean,
      actualCost: currentCost,
      deviationPercent,
      description: `Cost spike detected: $${currentCost.toFixed(4)} vs expected $${mean.toFixed(4)} (${deviationPercent.toFixed(1)}% deviation)`,
    });
  }
}

/**
 * Create anomaly
 */
function createAnomaly(input: {
  feature: string;
  severity: CostAnomaly['severity'];
  type: CostAnomaly['type'];
  expectedCost: number;
  actualCost: number;
  deviationPercent: number;
  description: string;
}): CostAnomaly {
  const id = randomUUID();

  const anomaly: CostAnomaly = {
    id,
    ...input,
    detectedAt: new Date(),
    acknowledged: false,
  };

  // Bounded storage
  if (anomalies.size >= MAX_ANOMALIES) {
    const oldest = Array.from(anomalies.entries())
      .filter(([_, a]) => a.resolvedAt || a.acknowledged)
      .sort((a, b) => a[1].detectedAt.getTime() - b[1].detectedAt.getTime())[0];
    if (oldest) {
      anomalies.delete(oldest[0]);
    }
  }

  anomalies.set(id, anomaly);

  logger.alert('Cost anomaly detected', {
    id,
    feature: input.feature,
    severity: input.severity,
    type: input.type,
    deviationPercent: input.deviationPercent,
  });

  // Emit event
  for (const handler of anomalyHandlers) {
    try {
      handler(anomaly);
    } catch (err) {
      logger.warn('Anomaly handler error', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return anomaly;
}

/**
 * Create cost alert
 */
function createAlert(input: Omit<CostAlert, 'timestamp'>): void {
  const alert: CostAlert = {
    ...input,
    timestamp: new Date(),
  };

  alerts.push(alert);

  // Bound alerts
  if (alerts.length > MAX_ALERTS) {
    alerts.shift();
  }

  logger.warn('Cost alert created', {
    type: input.type,
    severity: input.severity,
    message: input.message,
  });

  // Emit event
  for (const handler of alertHandlers) {
    try {
      handler(alert);
    } catch (err) {
      logger.warn('Alert handler error', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}

/**
 * Run anomaly detection
 */
export async function runAnomalyDetection(): Promise<CostAnomaly[]> {
  if (!config.enabled) return [];

  const detectedAnomalies: CostAnomaly[] = [];

  // Check sustained increases for each feature
  for (const [feature, data] of costData) {
    if (data.length < 20) continue;

    const now = Date.now();
    const recentWindow = now - config.windowSizeMs;
    const previousWindow = recentWindow - config.windowSizeMs;

    const recentData = data.filter(d => d.timestamp.getTime() > recentWindow);
    const previousData = data.filter(
      d => d.timestamp.getTime() > previousWindow && d.timestamp.getTime() <= recentWindow
    );

    if (recentData.length < 5 || previousData.length < 5) continue;

    const recentAvg = recentData.reduce((sum, d) => sum + d.cost, 0) / recentData.length;
    const previousAvg = previousData.reduce((sum, d) => sum + d.cost, 0) / previousData.length;

    if (previousAvg > 0) {
      const increasePercent = ((recentAvg - previousAvg) / previousAvg) * 100;

      if (increasePercent >= config.sustainedIncreasePercent) {
        const anomaly = createAnomaly({
          feature,
          severity: increasePercent > 100 ? 'high' : 'medium',
          type: 'sustained_increase',
          expectedCost: previousAvg,
          actualCost: recentAvg,
          deviationPercent: increasePercent,
          description: `Sustained cost increase: ${increasePercent.toFixed(1)}% over previous period`,
        });
        detectedAnomalies.push(anomaly);
      }
    }
  }

  // Check budget thresholds
  try {
    const { getCostGuards } = await import('../ops/cost-guards');
    const guards = getCostGuards();
    const allUsage = guards.getAllUsage();

    for (const usage of allUsage) {
      const dailyPercent = (usage.dailyUsedUsd / usage.dailyLimitUsd) * 100;
      const monthlyPercent = (usage.monthlyUsedUsd / usage.monthlyLimitUsd) * 100;

      // Daily warning
      if (dailyPercent >= config.alertThresholds.warning && dailyPercent < config.alertThresholds.critical) {
        createAlert({
          type: 'approaching_limit',
          severity: 'warning',
          message: `${usage.feature} daily budget at ${dailyPercent.toFixed(1)}%`,
          threshold: config.alertThresholds.warning,
          currentValue: dailyPercent,
        });
      }

      // Daily critical
      if (dailyPercent >= config.alertThresholds.critical) {
        createAlert({
          type: 'approaching_limit',
          severity: 'critical',
          message: `${usage.feature} daily budget at ${dailyPercent.toFixed(1)}%`,
          threshold: config.alertThresholds.critical,
          currentValue: dailyPercent,
        });
      }

      // Monthly warning
      if (monthlyPercent >= config.alertThresholds.warning && monthlyPercent < config.alertThresholds.critical) {
        createAlert({
          type: 'approaching_limit',
          severity: 'warning',
          message: `${usage.feature} monthly budget at ${monthlyPercent.toFixed(1)}%`,
          threshold: config.alertThresholds.warning,
          currentValue: monthlyPercent,
        });
      }

      // Monthly critical
      if (monthlyPercent >= config.alertThresholds.critical) {
        createAlert({
          type: 'approaching_limit',
          severity: 'critical',
          message: `${usage.feature} monthly budget at ${monthlyPercent.toFixed(1)}%`,
          threshold: config.alertThresholds.critical,
          currentValue: monthlyPercent,
        });
      }
    }
  } catch (err) {
    logger.warn('Failed to check cost guards', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  return detectedAnomalies;
}

/**
 * Generate cost forecast
 */
export async function generateForecast(feature: Feature): Promise<CostForecast | null> {
  const data = costData.get(feature);
  if (!data || data.length < 10) return null;

  const now = Date.now();
  const dayMs = 86400000;

  // Get last 24 hours of data
  const recentData = data.filter(d => d.timestamp.getTime() > now - dayMs);
  if (recentData.length < 5) return null;

  // Calculate current daily rate
  const totalCost = recentData.reduce((sum, d) => sum + d.cost, 0);
  const timeSpanMs = recentData[recentData.length - 1].timestamp.getTime() - recentData[0].timestamp.getTime();
  const dailyRate = timeSpanMs > 0 ? (totalCost / timeSpanMs) * dayMs : 0;

  // Calculate trend
  const midpoint = Math.floor(recentData.length / 2);
  const firstHalf = recentData.slice(0, midpoint);
  const secondHalf = recentData.slice(midpoint);

  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.cost, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.cost, 0) / secondHalf.length;

  let trend: CostForecast['trend'] = 'stable';
  if (secondHalfAvg > firstHalfAvg * 1.1) {
    trend = 'increasing';
  } else if (secondHalfAvg < firstHalfAvg * 0.9) {
    trend = 'decreasing';
  }

  // Apply trend to projection
  let trendMultiplier = 1;
  if (trend === 'increasing') {
    trendMultiplier = 1.2;
  } else if (trend === 'decreasing') {
    trendMultiplier = 0.8;
  }

  const projectedDailyCost = dailyRate * trendMultiplier;
  const projectedMonthlyCost = projectedDailyCost * 30;

  // Calculate confidence based on data consistency
  const variance = recentData.reduce((sum, d) => sum + Math.pow(d.cost - (totalCost / recentData.length), 2), 0) / recentData.length;
  const stdDev = Math.sqrt(variance);
  const mean = totalCost / recentData.length;
  const cv = mean > 0 ? stdDev / mean : 0; // Coefficient of variation
  const confidence = Math.max(0, 1 - cv);

  // Generate alerts
  const forecastAlerts: CostAlert[] = [];

  try {
    const { getCostGuards } = await import('../ops/cost-guards');
    const guards = getCostGuards();
    const usage = guards.getFeatureUsage(feature);

    if (usage) {
      // Project when limits will be hit
      const remainingDaily = usage.dailyLimitUsd - usage.dailyUsedUsd;
      const remainingMonthly = usage.monthlyLimitUsd - usage.monthlyUsedUsd;

      if (dailyRate > 0) {
        const hoursUntilDailyLimit = (remainingDaily / dailyRate) * 24;
        if (hoursUntilDailyLimit < 6) {
          forecastAlerts.push({
            type: 'forecast_warning',
            severity: 'warning',
            message: `At current rate, daily limit will be reached in ${hoursUntilDailyLimit.toFixed(1)} hours`,
            threshold: 6,
            currentValue: hoursUntilDailyLimit,
            timestamp: new Date(),
          });
        }

        const daysUntilMonthlyLimit = remainingMonthly / dailyRate;
        if (daysUntilMonthlyLimit < 7) {
          forecastAlerts.push({
            type: 'forecast_warning',
            severity: 'warning',
            message: `At current rate, monthly limit will be reached in ${daysUntilMonthlyLimit.toFixed(1)} days`,
            threshold: 7,
            currentValue: daysUntilMonthlyLimit,
            timestamp: new Date(),
          });
        }
      }
    }
  } catch {
    // Cost guards not available
  }

  return {
    feature,
    currentDailyRate: dailyRate,
    projectedDailyCost,
    projectedMonthlyCost,
    confidence,
    trend,
    alerts: forecastAlerts,
  };
}

/**
 * Acknowledge anomaly
 */
export function acknowledgeAnomaly(anomalyId: string): CostAnomaly | null {
  const anomaly = anomalies.get(anomalyId);
  if (!anomaly) return null;

  anomaly.acknowledged = true;
  logger.info('Anomaly acknowledged', { anomalyId });

  return anomaly;
}

/**
 * Resolve anomaly
 */
export function resolveAnomaly(anomalyId: string): CostAnomaly | null {
  const anomaly = anomalies.get(anomalyId);
  if (!anomaly) return null;

  anomaly.resolvedAt = new Date();
  logger.info('Anomaly resolved', { anomalyId });

  return anomaly;
}

/**
 * Get anomaly by ID
 */
export function getAnomaly(anomalyId: string): CostAnomaly | null {
  return anomalies.get(anomalyId) || null;
}

/**
 * List anomalies
 */
export function listAnomalies(options?: {
  feature?: string;
  severity?: CostAnomaly['severity'];
  unresolved?: boolean;
  limit?: number;
}): CostAnomaly[] {
  let results = Array.from(anomalies.values());

  if (options?.feature) {
    results = results.filter(a => a.feature === options.feature);
  }

  if (options?.severity) {
    results = results.filter(a => a.severity === options.severity);
  }

  if (options?.unresolved) {
    results = results.filter(a => !a.resolvedAt);
  }

  results.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());

  if (options?.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Get recent alerts
 */
export function getRecentAlerts(limit: number = 100): CostAlert[] {
  return alerts.slice(-limit).reverse();
}

/**
 * Subscribe to anomaly events
 */
export function subscribeToAnomalies(handler: AnomalyEventHandler): () => void {
  anomalyHandlers.add(handler);
  return () => {
    anomalyHandlers.delete(handler);
  };
}

/**
 * Subscribe to alert events
 */
export function subscribeToAlerts(handler: AlertEventHandler): () => void {
  alertHandlers.add(handler);
  return () => {
    alertHandlers.delete(handler);
  };
}

/**
 * Update configuration
 */
export function updateConfig(updates: Partial<AnomalyConfig>): void {
  config = { ...config, ...updates };
  logger.info('Cost anomaly config updated', { enabled: config.enabled });
}

/**
 * Start detection loop
 */
export function startDetection(intervalMs: number = 60000): void {
  if (detectionInterval) {
    logger.warn('Detection already running');
    return;
  }

  detectionInterval = setInterval(() => {
    runAnomalyDetection().catch(err => {
      logger.warn('Anomaly detection failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });
  }, intervalMs);

  logger.info('Cost anomaly detection started', { intervalMs });
}

/**
 * Stop detection loop
 */
export function stopDetection(): void {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
    logger.info('Cost anomaly detection stopped');
  }
}

/**
 * Get statistics
 */
export function getAnomalyStats(): {
  total: number;
  unresolved: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  byFeature: Record<string, number>;
  recentAlertCount: number;
} {
  const stats = {
    total: 0,
    unresolved: 0,
    bySeverity: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    byFeature: {} as Record<string, number>,
    recentAlertCount: 0,
  };

  for (const anomaly of anomalies.values()) {
    stats.total++;

    if (!anomaly.resolvedAt) {
      stats.unresolved++;
    }

    stats.bySeverity[anomaly.severity] = (stats.bySeverity[anomaly.severity] || 0) + 1;
    stats.byType[anomaly.type] = (stats.byType[anomaly.type] || 0) + 1;
    stats.byFeature[anomaly.feature] = (stats.byFeature[anomaly.feature] || 0) + 1;
  }

  // Count alerts in last hour
  const oneHourAgo = Date.now() - 3600000;
  stats.recentAlertCount = alerts.filter(a => a.timestamp.getTime() > oneHourAgo).length;

  return stats;
}

/**
 * Clear all data (for testing)
 */
export function clearAllData(): void {
  costData.clear();
  anomalies.clear();
  alerts.length = 0;
  logger.info('Cost anomaly data cleared');
}

export { Feature, CostDataPoint };
