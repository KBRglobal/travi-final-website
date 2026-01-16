/**
 * Anomaly Detection System
 *
 * Automatic detection of unusual patterns in metrics.
 * Uses statistical methods to identify significant deviations.
 *
 * Detection Methods:
 * - Z-Score: Standard deviation from mean
 * - IQR: Interquartile range outliers
 * - Trend Break: Sudden changes in direction
 * - Threshold: Crossing predefined limits
 */

import { log } from '../../lib/logger';
import { getMetricsRegistry, getMetricDefinition } from '../registry';
import type { MetricSignal, MetricValue, MetricEntityType } from '../registry/types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[AnomalyDetection] ${msg}`, data),
  debug: (msg: string, data?: Record<string, unknown>) =>
    log.debug(`[AnomalyDetection] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[AnomalyDetection] ${msg}`, data),
};

// =====================================================
// TYPES
// =====================================================

export type AnomalyType =
  | 'spike'           // Sudden increase
  | 'drop'            // Sudden decrease
  | 'trend_break'     // Change in direction
  | 'outlier'         // Statistical outlier
  | 'threshold'       // Threshold crossed
  | 'missing'         // Expected data missing
  | 'pattern_break';  // Break from normal pattern

export type DetectionMethod =
  | 'zscore'
  | 'iqr'
  | 'trend'
  | 'threshold'
  | 'pattern';

export interface Anomaly {
  id: string;
  metricId: string;
  entityType: MetricEntityType;
  entityId?: string;
  type: AnomalyType;
  method: DetectionMethod;
  severity: 'info' | 'warning' | 'critical';

  // Values
  currentValue: number;
  expectedValue: number;
  deviation: number;              // How far from expected (%)
  zscore?: number;                // Z-score if applicable

  // Context
  title: string;
  description: string;
  detectedAt: Date;
  windowStart: Date;
  windowEnd: Date;

  // Statistical context
  stats: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    count: number;
  };

  // Recommendations
  recommendation?: string;
  relatedMetrics?: string[];
}

export interface AnomalyConfig {
  metricId: string;
  enabled: boolean;
  methods: DetectionMethod[];
  sensitivity: 'low' | 'medium' | 'high';  // Controls thresholds
  minDataPoints: number;                    // Minimum for analysis
  windowHours: number;                      // Analysis window
  cooldownMinutes: number;                  // Avoid alert spam
}

export interface DetectionResult {
  scanned: number;
  anomalies: Anomaly[];
  duration: number;
  timestamp: Date;
}

// =====================================================
// DEFAULT CONFIGURATIONS
// =====================================================

const DEFAULT_CONFIGS: AnomalyConfig[] = [
  // Traffic metrics
  {
    metricId: 'traffic.total_sessions',
    enabled: true,
    methods: ['zscore', 'trend'],
    sensitivity: 'medium',
    minDataPoints: 24,
    windowHours: 24,
    cooldownMinutes: 60,
  },
  {
    metricId: 'traffic.organic_sessions',
    enabled: true,
    methods: ['zscore', 'trend'],
    sensitivity: 'medium',
    minDataPoints: 24,
    windowHours: 24,
    cooldownMinutes: 60,
  },

  // Engagement metrics
  {
    metricId: 'engagement.bounce_rate',
    enabled: true,
    methods: ['zscore', 'threshold'],
    sensitivity: 'medium',
    minDataPoints: 12,
    windowHours: 12,
    cooldownMinutes: 30,
  },
  {
    metricId: 'engagement.session_duration',
    enabled: true,
    methods: ['zscore'],
    sensitivity: 'low',
    minDataPoints: 24,
    windowHours: 24,
    cooldownMinutes: 60,
  },

  // SEO metrics
  {
    metricId: 'seo.impressions',
    enabled: true,
    methods: ['zscore', 'trend'],
    sensitivity: 'high',
    minDataPoints: 7,
    windowHours: 168, // 7 days
    cooldownMinutes: 360,
  },
  {
    metricId: 'seo.ctr',
    enabled: true,
    methods: ['zscore', 'threshold'],
    sensitivity: 'medium',
    minDataPoints: 7,
    windowHours: 168,
    cooldownMinutes: 360,
  },

  // Health metrics
  {
    metricId: 'health.error_rate',
    enabled: true,
    methods: ['zscore', 'threshold'],
    sensitivity: 'high',
    minDataPoints: 6,
    windowHours: 1,
    cooldownMinutes: 15,
  },
  {
    metricId: 'health.api_response_time',
    enabled: true,
    methods: ['zscore', 'threshold'],
    sensitivity: 'high',
    minDataPoints: 6,
    windowHours: 1,
    cooldownMinutes: 15,
  },

  // Cost metrics
  {
    metricId: 'cost.ai_api_cost',
    enabled: true,
    methods: ['zscore', 'threshold'],
    sensitivity: 'medium',
    minDataPoints: 24,
    windowHours: 24,
    cooldownMinutes: 60,
  },
];

// Sensitivity thresholds (z-score multipliers)
const SENSITIVITY_THRESHOLDS = {
  low: { zscore: 3.0, deviation: 50 },
  medium: { zscore: 2.5, deviation: 35 },
  high: { zscore: 2.0, deviation: 25 },
} as const;

// =====================================================
// ANOMALY DETECTOR
// =====================================================

export class AnomalyDetector {
  private static instance: AnomalyDetector | null = null;

  // Configuration
  private configs: Map<string, AnomalyConfig> = new Map();

  // Historical data for analysis
  private dataStore: Map<string, MetricValue[]> = new Map();

  // Recent anomalies for cooldown
  private recentAnomalies: Map<string, Date> = new Map();

  // Detected anomalies
  private anomalies: Map<string, Anomaly> = new Map();

  private constructor() {
    // Initialize default configs
    DEFAULT_CONFIGS.forEach(c => this.configs.set(c.metricId, c));
    logger.info('Anomaly Detector initialized', {
      configCount: this.configs.size,
    });
  }

  static getInstance(): AnomalyDetector {
    if (!AnomalyDetector.instance) {
      AnomalyDetector.instance = new AnomalyDetector();
    }
    return AnomalyDetector.instance;
  }

  static reset(): void {
    AnomalyDetector.instance = null;
  }

  // =====================================================
  // CONFIGURATION
  // =====================================================

  /**
   * Get config for a metric
   */
  getConfig(metricId: string): AnomalyConfig | undefined {
    return this.configs.get(metricId);
  }

  /**
   * Set config for a metric
   */
  setConfig(config: AnomalyConfig): void {
    this.configs.set(config.metricId, config);
    logger.info('Anomaly config updated', { metricId: config.metricId });
  }

  /**
   * Enable/disable detection for a metric
   */
  setEnabled(metricId: string, enabled: boolean): void {
    const config = this.configs.get(metricId);
    if (config) {
      config.enabled = enabled;
    }
  }

  // =====================================================
  // DATA INGESTION
  // =====================================================

  /**
   * Ingest metric value for analysis
   */
  ingestValue(value: MetricValue): void {
    const key = this.getDataKey(value.metricId, value.entityType, value.entityId);
    const values = this.dataStore.get(key) || [];
    values.push(value);

    // Keep only recent data (7 days)
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = values.filter(v => v.timestamp.getTime() > cutoff);
    this.dataStore.set(key, filtered);
  }

  /**
   * Ingest multiple values
   */
  ingestValues(values: MetricValue[]): void {
    values.forEach(v => this.ingestValue(v));
  }

  // =====================================================
  // DETECTION
  // =====================================================

  /**
   * Run anomaly detection for all configured metrics
   */
  detectAll(): DetectionResult {
    const startTime = Date.now();
    const allAnomalies: Anomaly[] = [];
    let scanned = 0;

    for (const [metricId, config] of this.configs.entries()) {
      if (!config.enabled) continue;

      // Get all data keys for this metric
      const dataKeys = Array.from(this.dataStore.keys())
        .filter(k => k.startsWith(metricId + ':'));

      for (const key of dataKeys) {
        scanned++;
        const [_, entityType, entityId] = key.split(':');
        const anomalies = this.detectForKey(
          key,
          config,
          entityType as MetricEntityType,
          entityId === 'global' ? undefined : entityId
        );
        allAnomalies.push(...anomalies);
      }
    }

    return {
      scanned,
      anomalies: allAnomalies,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Detect anomalies for a specific metric
   */
  detectForMetric(
    metricId: string,
    entityType: MetricEntityType = 'system',
    entityId?: string
  ): Anomaly[] {
    const config = this.configs.get(metricId);
    if (!config || !config.enabled) return [];

    const key = this.getDataKey(metricId, entityType, entityId);
    return this.detectForKey(key, config, entityType, entityId);
  }

  /**
   * Detect anomalies for a data key
   */
  private detectForKey(
    key: string,
    config: AnomalyConfig,
    entityType: MetricEntityType,
    entityId?: string
  ): Anomaly[] {
    const values = this.dataStore.get(key);
    if (!values || values.length < config.minDataPoints) return [];

    // Check cooldown
    if (this.isInCooldown(key, config.cooldownMinutes)) return [];

    // Filter to window
    const windowStart = new Date(Date.now() - config.windowHours * 60 * 60 * 1000);
    const windowedValues = values.filter(v => v.timestamp >= windowStart);
    if (windowedValues.length < config.minDataPoints) return [];

    // Calculate stats
    const nums = windowedValues.map(v => v.value);
    const stats = this.calculateStats(nums);

    // Current value (most recent)
    const currentValue = nums[nums.length - 1];

    const anomalies: Anomaly[] = [];
    const thresholds = SENSITIVITY_THRESHOLDS[config.sensitivity];

    // Run detection methods
    for (const method of config.methods) {
      const anomaly = this.runDetectionMethod(
        method,
        config.metricId,
        entityType,
        entityId,
        currentValue,
        nums,
        stats,
        thresholds,
        windowStart,
        new Date()
      );

      if (anomaly) {
        anomalies.push(anomaly);
        this.anomalies.set(anomaly.id, anomaly);
        this.recentAnomalies.set(key, new Date());
      }
    }

    return anomalies;
  }

  /**
   * Run a specific detection method
   */
  private runDetectionMethod(
    method: DetectionMethod,
    metricId: string,
    entityType: MetricEntityType,
    entityId: string | undefined,
    currentValue: number,
    values: number[],
    stats: ReturnType<typeof this.calculateStats>,
    thresholds: typeof SENSITIVITY_THRESHOLDS['medium'],
    windowStart: Date,
    windowEnd: Date
  ): Anomaly | null {
    const definition = getMetricDefinition(metricId);

    switch (method) {
      case 'zscore':
        return this.detectZScore(
          metricId, entityType, entityId,
          currentValue, stats, thresholds,
          windowStart, windowEnd, definition?.name
        );

      case 'iqr':
        return this.detectIQR(
          metricId, entityType, entityId,
          currentValue, values, stats,
          windowStart, windowEnd, definition?.name
        );

      case 'trend':
        return this.detectTrendBreak(
          metricId, entityType, entityId,
          values, stats,
          windowStart, windowEnd, definition?.name
        );

      case 'threshold':
        return this.detectThreshold(
          metricId, entityType, entityId,
          currentValue, stats,
          windowStart, windowEnd, definition
        );

      default:
        return null;
    }
  }

  /**
   * Z-Score based detection
   */
  private detectZScore(
    metricId: string,
    entityType: MetricEntityType,
    entityId: string | undefined,
    currentValue: number,
    stats: ReturnType<typeof this.calculateStats>,
    thresholds: typeof SENSITIVITY_THRESHOLDS['medium'],
    windowStart: Date,
    windowEnd: Date,
    metricName?: string
  ): Anomaly | null {
    if (stats.stdDev === 0) return null;

    const zscore = (currentValue - stats.mean) / stats.stdDev;

    if (Math.abs(zscore) > thresholds.zscore) {
      const isSpike = zscore > 0;
      const deviation = ((currentValue - stats.mean) / stats.mean) * 100;

      return {
        id: `${metricId}-zscore-${Date.now()}`,
        metricId,
        entityType,
        entityId,
        type: isSpike ? 'spike' : 'drop',
        method: 'zscore',
        severity: Math.abs(zscore) > 4 ? 'critical' :
                 Math.abs(zscore) > 3 ? 'warning' : 'info',
        currentValue,
        expectedValue: stats.mean,
        deviation: Math.round(deviation * 100) / 100,
        zscore: Math.round(zscore * 100) / 100,
        title: `${isSpike ? 'Spike' : 'Drop'} in ${metricName || metricId}`,
        description: `Value of ${currentValue.toFixed(2)} is ${Math.abs(zscore).toFixed(1)} standard deviations ${isSpike ? 'above' : 'below'} the mean`,
        detectedAt: new Date(),
        windowStart,
        windowEnd,
        stats,
        recommendation: isSpike
          ? 'Investigate cause of sudden increase'
          : 'Investigate cause of sudden decrease',
      };
    }

    return null;
  }

  /**
   * IQR (Interquartile Range) based detection
   */
  private detectIQR(
    metricId: string,
    entityType: MetricEntityType,
    entityId: string | undefined,
    currentValue: number,
    values: number[],
    stats: ReturnType<typeof this.calculateStats>,
    windowStart: Date,
    windowEnd: Date,
    metricName?: string
  ): Anomaly | null {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    if (currentValue < lowerBound || currentValue > upperBound) {
      const isOutlierHigh = currentValue > upperBound;
      const deviation = ((currentValue - stats.mean) / stats.mean) * 100;

      return {
        id: `${metricId}-iqr-${Date.now()}`,
        metricId,
        entityType,
        entityId,
        type: 'outlier',
        method: 'iqr',
        severity: 'warning',
        currentValue,
        expectedValue: stats.mean,
        deviation: Math.round(deviation * 100) / 100,
        title: `Outlier in ${metricName || metricId}`,
        description: `Value of ${currentValue.toFixed(2)} is outside the interquartile range [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
        detectedAt: new Date(),
        windowStart,
        windowEnd,
        stats,
        recommendation: 'Review for data quality issues or genuine anomaly',
      };
    }

    return null;
  }

  /**
   * Trend break detection
   */
  private detectTrendBreak(
    metricId: string,
    entityType: MetricEntityType,
    entityId: string | undefined,
    values: number[],
    stats: ReturnType<typeof this.calculateStats>,
    windowStart: Date,
    windowEnd: Date,
    metricName?: string
  ): Anomaly | null {
    if (values.length < 6) return null;

    // Split into two halves
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);

    const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    // Calculate trend directions
    const firstTrend = this.calculateTrendSlope(firstHalf);
    const secondTrend = this.calculateTrendSlope(secondHalf);

    // Detect reversal
    if ((firstTrend > 0.1 && secondTrend < -0.1) ||
        (firstTrend < -0.1 && secondTrend > 0.1)) {
      const changePercent = ((secondMean - firstMean) / firstMean) * 100;

      return {
        id: `${metricId}-trend-${Date.now()}`,
        metricId,
        entityType,
        entityId,
        type: 'trend_break',
        method: 'trend',
        severity: Math.abs(changePercent) > 50 ? 'critical' :
                 Math.abs(changePercent) > 25 ? 'warning' : 'info',
        currentValue: values[values.length - 1],
        expectedValue: firstMean + (firstTrend * values.length),
        deviation: Math.round(changePercent * 100) / 100,
        title: `Trend reversal in ${metricName || metricId}`,
        description: `Metric changed from ${firstTrend > 0 ? 'upward' : 'downward'} to ${secondTrend > 0 ? 'upward' : 'downward'} trend`,
        detectedAt: new Date(),
        windowStart,
        windowEnd,
        stats,
        recommendation: 'Investigate cause of trend change',
      };
    }

    return null;
  }

  /**
   * Threshold-based detection
   */
  private detectThreshold(
    metricId: string,
    entityType: MetricEntityType,
    entityId: string | undefined,
    currentValue: number,
    stats: ReturnType<typeof this.calculateStats>,
    windowStart: Date,
    windowEnd: Date,
    definition?: { name?: string; thresholds?: { warning?: number; critical?: number; direction?: string } }
  ): Anomaly | null {
    if (!definition?.thresholds) return null;

    const { warning, critical, direction } = definition.thresholds;
    let severity: 'info' | 'warning' | 'critical' | null = null;
    let threshold = 0;

    if (direction === 'above') {
      if (critical !== undefined && currentValue >= critical) {
        severity = 'critical';
        threshold = critical;
      } else if (warning !== undefined && currentValue >= warning) {
        severity = 'warning';
        threshold = warning;
      }
    } else if (direction === 'below') {
      if (critical !== undefined && currentValue <= critical) {
        severity = 'critical';
        threshold = critical;
      } else if (warning !== undefined && currentValue <= warning) {
        severity = 'warning';
        threshold = warning;
      }
    }

    if (severity) {
      return {
        id: `${metricId}-threshold-${Date.now()}`,
        metricId,
        entityType,
        entityId,
        type: 'threshold',
        method: 'threshold',
        severity,
        currentValue,
        expectedValue: threshold,
        deviation: ((currentValue - threshold) / threshold) * 100,
        title: `${definition.name || metricId} threshold exceeded`,
        description: `Current value ${currentValue.toFixed(2)} has crossed ${severity} threshold of ${threshold}`,
        detectedAt: new Date(),
        windowStart,
        windowEnd,
        stats,
        recommendation: `Address ${severity} level ${definition.name || metricId} issue`,
      };
    }

    return null;
  }

  // =====================================================
  // HELPERS
  // =====================================================

  private getDataKey(
    metricId: string,
    entityType: MetricEntityType,
    entityId?: string
  ): string {
    return `${metricId}:${entityType}:${entityId || 'global'}`;
  }

  private isInCooldown(key: string, cooldownMinutes: number): boolean {
    const lastAnomaly = this.recentAnomalies.get(key);
    if (!lastAnomaly) return false;

    const cooldownMs = cooldownMinutes * 60 * 1000;
    return Date.now() - lastAnomaly.getTime() < cooldownMs;
  }

  private calculateStats(values: number[]): {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    count: number;
  } {
    const count = values.length;
    if (count === 0) {
      return { mean: 0, stdDev: 0, min: 0, max: 0, count: 0 };
    }

    const mean = values.reduce((a, b) => a + b, 0) / count;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / count;
    const stdDev = Math.sqrt(avgSquaredDiff);

    return {
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
      count,
    };
  }

  private calculateTrendSlope(values: number[]): number {
    if (values.length < 2) return 0;

    // Simple linear regression slope
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // =====================================================
  // RETRIEVAL
  // =====================================================

  /**
   * Get all detected anomalies
   */
  getAllAnomalies(): Anomaly[] {
    return Array.from(this.anomalies.values());
  }

  /**
   * Get anomalies by severity
   */
  getBySeverity(severity: 'info' | 'warning' | 'critical'): Anomaly[] {
    return this.getAllAnomalies().filter(a => a.severity === severity);
  }

  /**
   * Get anomalies for a metric
   */
  getForMetric(metricId: string): Anomaly[] {
    return this.getAllAnomalies().filter(a => a.metricId === metricId);
  }

  /**
   * Convert anomaly to signal
   */
  toSignal(anomaly: Anomaly): MetricSignal {
    return {
      metricId: anomaly.metricId,
      entityType: anomaly.entityType,
      entityId: anomaly.entityId,
      signalType: 'anomaly',
      severity: anomaly.severity,
      title: anomaly.title,
      description: anomaly.description,
      currentValue: anomaly.currentValue,
      expectedValue: anomaly.expectedValue,
      deviation: anomaly.deviation,
      recommendation: anomaly.recommendation,
      timestamp: anomaly.detectedAt,
    };
  }

  /**
   * Clean old anomalies
   */
  cleanOld(olderThan: Date): void {
    for (const [id, anomaly] of this.anomalies.entries()) {
      if (anomaly.detectedAt < olderThan) {
        this.anomalies.delete(id);
      }
    }
  }
}

// =====================================================
// CONVENIENCE EXPORTS
// =====================================================

export function getAnomalyDetector(): AnomalyDetector {
  return AnomalyDetector.getInstance();
}

export function detectAnomalies(): DetectionResult {
  return getAnomalyDetector().detectAll();
}

export function ingestMetricValue(value: MetricValue): void {
  getAnomalyDetector().ingestValue(value);
}

export function getAnomalies(): Anomaly[] {
  return getAnomalyDetector().getAllAnomalies();
}

export function getCriticalAnomalies(): Anomaly[] {
  return getAnomalyDetector().getBySeverity('critical');
}
