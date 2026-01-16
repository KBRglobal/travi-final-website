/**
 * Historical Snapshots System
 *
 * Captures and stores metric snapshots over time.
 * Enables trend analysis, comparison, and reporting.
 *
 * Snapshot Types:
 * - Point-in-time: Single moment capture
 * - Aggregated: Summarized over period
 * - Comparative: Before/after analysis
 */

import { log } from '../../lib/logger';
import { getMetricsRegistry } from '../registry';
import type {
  MetricValue,
  MetricSnapshot,
  MetricEntityType,
  TimeGranularity,
} from '../registry/types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Snapshots] ${msg}`, data),
  debug: (msg: string, data?: Record<string, unknown>) =>
    log.debug(`[Snapshots] ${msg}`, data),
};

// =====================================================
// TYPES
// =====================================================

export interface HistoricalSnapshot {
  id: string;
  snapshotType: 'point' | 'aggregated' | 'comparative';
  timestamp: Date;
  granularity: TimeGranularity;
  period?: {
    start: Date;
    end: Date;
  };

  // Metrics data
  metrics: MetricSnapshotData[];

  // Metadata
  description?: string;
  tags?: string[];
  createdBy?: string;
}

export interface MetricSnapshotData {
  metricId: string;
  entityType: MetricEntityType;
  entityId?: string;

  // Values
  value: number;
  previousValue?: number;

  // Statistics (for aggregated)
  stats?: {
    min: number;
    max: number;
    avg: number;
    sum: number;
    count: number;
  };

  // Trend
  trend: 'up' | 'down' | 'stable';
  changePercent?: number;
  changeAbsolute?: number;

  // Status
  status: 'good' | 'warning' | 'critical' | 'neutral';
}

export interface TrendAnalysis {
  metricId: string;
  entityType: MetricEntityType;
  entityId?: string;
  period: {
    start: Date;
    end: Date;
  };

  // Data points
  dataPoints: Array<{
    timestamp: Date;
    value: number;
  }>;

  // Trend metrics
  slope: number;                  // Rate of change
  direction: 'up' | 'down' | 'stable';
  strength: 'weak' | 'moderate' | 'strong';
  volatility: number;             // Standard deviation of changes

  // Projections
  projectedValue?: number;        // Projected future value
  projectionConfidence?: number;

  // Comparison
  periodOverPeriod?: {
    previousValue: number;
    currentValue: number;
    changePercent: number;
  };
}

export interface ComparisonReport {
  id: string;
  title: string;
  period1: {
    label: string;
    start: Date;
    end: Date;
    snapshot: HistoricalSnapshot;
  };
  period2: {
    label: string;
    start: Date;
    end: Date;
    snapshot: HistoricalSnapshot;
  };

  // Comparisons
  comparisons: Array<{
    metricId: string;
    metricName: string;
    period1Value: number;
    period2Value: number;
    change: number;
    changePercent: number;
    improvement: boolean;
    significance: 'low' | 'medium' | 'high';
  }>;

  // Summary
  summary: {
    improved: number;
    declined: number;
    unchanged: number;
    overallTrend: 'positive' | 'negative' | 'neutral';
  };

  generatedAt: Date;
}

// =====================================================
// SNAPSHOT STORE
// =====================================================

export class SnapshotStore {
  private static instance: SnapshotStore | null = null;

  // Storage
  private snapshots: Map<string, HistoricalSnapshot> = new Map();
  private timeSeriesData: Map<string, MetricValue[]> = new Map();

  // Auto-snapshot config
  private autoSnapshotIntervalId: NodeJS.Timeout | null = null;

  private constructor() {
    logger.info('Snapshot Store initialized');
  }

  static getInstance(): SnapshotStore {
    if (!SnapshotStore.instance) {
      SnapshotStore.instance = new SnapshotStore();
    }
    return SnapshotStore.instance;
  }

  static reset(): void {
    if (SnapshotStore.instance?.autoSnapshotIntervalId) {
      clearInterval(SnapshotStore.instance.autoSnapshotIntervalId);
    }
    SnapshotStore.instance = null;
  }

  // =====================================================
  // DATA INGESTION
  // =====================================================

  /**
   * Record a metric value
   */
  recordValue(value: MetricValue): void {
    const key = this.getTimeSeriesKey(value.metricId, value.entityType, value.entityId);
    const values = this.timeSeriesData.get(key) || [];
    values.push(value);

    // Keep 90 days of data
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const filtered = values.filter(v => v.timestamp.getTime() > cutoff);
    this.timeSeriesData.set(key, filtered);
  }

  /**
   * Record multiple values
   */
  recordValues(values: MetricValue[]): void {
    values.forEach(v => this.recordValue(v));
  }

  // =====================================================
  // SNAPSHOT CREATION
  // =====================================================

  /**
   * Create a point-in-time snapshot
   */
  createPointSnapshot(
    metricIds: string[],
    entityType: MetricEntityType = 'system',
    entityId?: string,
    description?: string
  ): HistoricalSnapshot {
    const registry = getMetricsRegistry();
    const metrics: MetricSnapshotData[] = [];

    for (const metricId of metricIds) {
      const currentValue = registry.getCurrentValue(metricId, entityType, entityId);
      if (!currentValue) continue;

      // Get previous value for comparison
      const key = this.getTimeSeriesKey(metricId, entityType, entityId);
      const history = this.timeSeriesData.get(key) || [];
      const previousValue = history.length > 1
        ? history[history.length - 2]?.value
        : undefined;

      const snapshotData = this.createMetricSnapshotData(
        metricId,
        entityType,
        entityId,
        currentValue.value,
        previousValue
      );

      metrics.push(snapshotData);
    }

    const snapshot: HistoricalSnapshot = {
      id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      snapshotType: 'point',
      timestamp: new Date(),
      granularity: 'realtime',
      metrics,
      description,
    };

    this.snapshots.set(snapshot.id, snapshot);
    logger.debug('Point snapshot created', { id: snapshot.id, metricCount: metrics.length });

    return snapshot;
  }

  /**
   * Create an aggregated snapshot over a period
   */
  createAggregatedSnapshot(
    metricIds: string[],
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity = 'day',
    entityType: MetricEntityType = 'system',
    entityId?: string
  ): HistoricalSnapshot {
    const metrics: MetricSnapshotData[] = [];

    for (const metricId of metricIds) {
      const key = this.getTimeSeriesKey(metricId, entityType, entityId);
      const history = this.timeSeriesData.get(key) || [];

      // Filter to period
      const periodData = history.filter(
        v => v.timestamp >= startDate && v.timestamp <= endDate
      );

      if (periodData.length === 0) continue;

      const values = periodData.map(v => v.value);
      const stats = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        sum: values.reduce((a, b) => a + b, 0),
        count: values.length,
      };

      // Calculate trend
      const trend = this.calculateTrend(values);
      const lastValue = values[values.length - 1];
      const firstValue = values[0];
      const changePercent = firstValue !== 0
        ? ((lastValue - firstValue) / firstValue) * 100
        : 0;

      metrics.push({
        metricId,
        entityType,
        entityId,
        value: stats.avg,
        stats,
        trend,
        changePercent: Math.round(changePercent * 100) / 100,
        changeAbsolute: Math.round((lastValue - firstValue) * 100) / 100,
        status: this.getStatus(metricId, stats.avg),
      });
    }

    const snapshot: HistoricalSnapshot = {
      id: `agg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      snapshotType: 'aggregated',
      timestamp: new Date(),
      granularity,
      period: { start: startDate, end: endDate },
      metrics,
    };

    this.snapshots.set(snapshot.id, snapshot);
    logger.debug('Aggregated snapshot created', {
      id: snapshot.id,
      period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
      metricCount: metrics.length,
    });

    return snapshot;
  }

  /**
   * Create a daily summary snapshot
   */
  createDailySnapshot(date: Date = new Date()): HistoricalSnapshot {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all metrics we have data for
    const allMetricIds = new Set<string>();
    for (const key of this.timeSeriesData.keys()) {
      const [metricId] = key.split(':');
      allMetricIds.add(metricId);
    }

    return this.createAggregatedSnapshot(
      Array.from(allMetricIds),
      startOfDay,
      endOfDay,
      'day'
    );
  }

  // =====================================================
  // TREND ANALYSIS
  // =====================================================

  /**
   * Analyze trend for a metric
   */
  analyzeTrend(
    metricId: string,
    startDate: Date,
    endDate: Date,
    entityType: MetricEntityType = 'system',
    entityId?: string
  ): TrendAnalysis | null {
    const key = this.getTimeSeriesKey(metricId, entityType, entityId);
    const history = this.timeSeriesData.get(key) || [];

    const periodData = history.filter(
      v => v.timestamp >= startDate && v.timestamp <= endDate
    );

    if (periodData.length < 2) return null;

    const dataPoints = periodData.map(v => ({
      timestamp: v.timestamp,
      value: v.value,
    }));

    const values = dataPoints.map(d => d.value);

    // Calculate slope (linear regression)
    const slope = this.calculateSlope(values);

    // Determine direction and strength
    const avgChange = Math.abs(slope);
    const direction: 'up' | 'down' | 'stable' =
      slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'stable';

    const strength: 'weak' | 'moderate' | 'strong' =
      avgChange > 0.1 ? 'strong' :
      avgChange > 0.05 ? 'moderate' : 'weak';

    // Calculate volatility
    const changes = [];
    for (let i = 1; i < values.length; i++) {
      changes.push(Math.abs(values[i] - values[i - 1]));
    }
    const volatility = changes.length > 0
      ? changes.reduce((a, b) => a + b, 0) / changes.length
      : 0;

    // Project future value
    const lastValue = values[values.length - 1];
    const projectedValue = lastValue + (slope * 7); // Project 7 periods ahead

    // Period over period comparison
    const midpoint = Math.floor(values.length / 2);
    const firstHalfAvg = values.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
    const secondHalfAvg = values.slice(midpoint).reduce((a, b) => a + b, 0) / (values.length - midpoint);

    return {
      metricId,
      entityType,
      entityId,
      period: { start: startDate, end: endDate },
      dataPoints,
      slope: Math.round(slope * 1000) / 1000,
      direction,
      strength,
      volatility: Math.round(volatility * 100) / 100,
      projectedValue: Math.round(projectedValue * 100) / 100,
      projectionConfidence: Math.max(0, 100 - volatility * 10),
      periodOverPeriod: {
        previousValue: firstHalfAvg,
        currentValue: secondHalfAvg,
        changePercent: firstHalfAvg !== 0
          ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 10000) / 100
          : 0,
      },
    };
  }

  /**
   * Get trend summary for multiple metrics
   */
  getTrendSummary(
    metricIds: string[],
    days: number = 30
  ): Map<string, TrendAnalysis | null> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const results = new Map<string, TrendAnalysis | null>();
    for (const metricId of metricIds) {
      results.set(metricId, this.analyzeTrend(metricId, startDate, endDate));
    }

    return results;
  }

  // =====================================================
  // COMPARISONS
  // =====================================================

  /**
   * Compare two periods
   */
  comparePeriods(
    metricIds: string[],
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date,
    title?: string
  ): ComparisonReport {
    const snapshot1 = this.createAggregatedSnapshot(
      metricIds, period1Start, period1End, 'day'
    );
    const snapshot2 = this.createAggregatedSnapshot(
      metricIds, period2Start, period2End, 'day'
    );

    const registry = getMetricsRegistry();
    const comparisons: ComparisonReport['comparisons'] = [];

    let improved = 0;
    let declined = 0;
    let unchanged = 0;

    for (const metricId of metricIds) {
      const m1 = snapshot1.metrics.find(m => m.metricId === metricId);
      const m2 = snapshot2.metrics.find(m => m.metricId === metricId);

      if (!m1 || !m2) continue;

      const change = m2.value - m1.value;
      const changePercent = m1.value !== 0
        ? (change / m1.value) * 100
        : 0;

      // Determine if this is an improvement
      const definition = registry.getDefinition(metricId);
      const direction = definition?.thresholds?.direction;
      let improvement = false;

      if (direction === 'above') {
        improvement = change < 0; // Lower is better
      } else if (direction === 'below') {
        improvement = change > 0; // Higher is better
      } else {
        improvement = change > 0; // Default: higher is better
      }

      if (Math.abs(changePercent) < 1) {
        unchanged++;
      } else if (improvement) {
        improved++;
      } else {
        declined++;
      }

      comparisons.push({
        metricId,
        metricName: definition?.name || metricId,
        period1Value: m1.value,
        period2Value: m2.value,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        improvement,
        significance: Math.abs(changePercent) > 20 ? 'high' :
                     Math.abs(changePercent) > 10 ? 'medium' : 'low',
      });
    }

    const overallTrend: 'positive' | 'negative' | 'neutral' =
      improved > declined + 2 ? 'positive' :
      declined > improved + 2 ? 'negative' : 'neutral';

    return {
      id: `compare-${Date.now()}`,
      title: title || 'Period Comparison',
      period1: {
        label: `${period1Start.toLocaleDateString()} - ${period1End.toLocaleDateString()}`,
        start: period1Start,
        end: period1End,
        snapshot: snapshot1,
      },
      period2: {
        label: `${period2Start.toLocaleDateString()} - ${period2End.toLocaleDateString()}`,
        start: period2Start,
        end: period2End,
        snapshot: snapshot2,
      },
      comparisons,
      summary: {
        improved,
        declined,
        unchanged,
        overallTrend,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Week over week comparison
   */
  compareWeekOverWeek(metricIds: string[]): ComparisonReport {
    const now = new Date();
    const thisWeekEnd = now;
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(thisWeekStart.getTime() - 1);
    const lastWeekStart = new Date(lastWeekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    return this.comparePeriods(
      metricIds,
      lastWeekStart, lastWeekEnd,
      thisWeekStart, thisWeekEnd,
      'Week over Week Comparison'
    );
  }

  /**
   * Month over month comparison
   */
  compareMonthOverMonth(metricIds: string[]): ComparisonReport {
    const now = new Date();
    const thisMonthEnd = now;
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);
    const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);

    return this.comparePeriods(
      metricIds,
      lastMonthStart, lastMonthEnd,
      thisMonthStart, thisMonthEnd,
      'Month over Month Comparison'
    );
  }

  // =====================================================
  // RETRIEVAL
  // =====================================================

  /**
   * Get snapshot by ID
   */
  getSnapshot(id: string): HistoricalSnapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): HistoricalSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Get snapshots by type
   */
  getSnapshotsByType(type: 'point' | 'aggregated' | 'comparative'): HistoricalSnapshot[] {
    return this.getAllSnapshots().filter(s => s.snapshotType === type);
  }

  /**
   * Get time series data for a metric
   */
  getTimeSeries(
    metricId: string,
    entityType: MetricEntityType = 'system',
    entityId?: string,
    startDate?: Date,
    endDate?: Date
  ): MetricValue[] {
    const key = this.getTimeSeriesKey(metricId, entityType, entityId);
    let data = this.timeSeriesData.get(key) || [];

    if (startDate) {
      data = data.filter(v => v.timestamp >= startDate);
    }
    if (endDate) {
      data = data.filter(v => v.timestamp <= endDate);
    }

    return data;
  }

  // =====================================================
  // AUTO-SNAPSHOT
  // =====================================================

  /**
   * Start automatic daily snapshots
   */
  startAutoSnapshots(intervalHours: number = 24): void {
    if (this.autoSnapshotIntervalId) {
      clearInterval(this.autoSnapshotIntervalId);
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    this.autoSnapshotIntervalId = setInterval(() => {
      this.createDailySnapshot();
      logger.info('Auto snapshot created');
    }, intervalMs);

    // Don't block process exit
    if (this.autoSnapshotIntervalId.unref) {
      this.autoSnapshotIntervalId.unref();
    }

    logger.info('Auto snapshots started', { intervalHours });
  }

  /**
   * Stop automatic snapshots
   */
  stopAutoSnapshots(): void {
    if (this.autoSnapshotIntervalId) {
      clearInterval(this.autoSnapshotIntervalId);
      this.autoSnapshotIntervalId = null;
      logger.info('Auto snapshots stopped');
    }
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  private getTimeSeriesKey(
    metricId: string,
    entityType: MetricEntityType,
    entityId?: string
  ): string {
    return `${metricId}:${entityType}:${entityId || 'global'}`;
  }

  private createMetricSnapshotData(
    metricId: string,
    entityType: MetricEntityType,
    entityId: string | undefined,
    value: number,
    previousValue?: number
  ): MetricSnapshotData {
    const trend = this.calculateTrendFromValues(value, previousValue);
    const changePercent = previousValue !== undefined && previousValue !== 0
      ? ((value - previousValue) / previousValue) * 100
      : undefined;

    return {
      metricId,
      entityType,
      entityId,
      value,
      previousValue,
      trend,
      changePercent: changePercent !== undefined
        ? Math.round(changePercent * 100) / 100
        : undefined,
      changeAbsolute: previousValue !== undefined
        ? Math.round((value - previousValue) * 100) / 100
        : undefined,
      status: this.getStatus(metricId, value),
    };
  }

  private calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  private calculateTrendFromValues(
    current: number,
    previous?: number
  ): 'up' | 'down' | 'stable' {
    if (previous === undefined) return 'stable';

    const change = ((current - previous) / previous) * 100;
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  private calculateSlope(values: number[]): number {
    if (values.length < 2) return 0;

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

  private getStatus(
    metricId: string,
    value: number
  ): 'good' | 'warning' | 'critical' | 'neutral' {
    const registry = getMetricsRegistry();
    return registry.getMetricStatus(metricId, value);
  }
}

// =====================================================
// CONVENIENCE EXPORTS
// =====================================================

export function getSnapshotStore(): SnapshotStore {
  return SnapshotStore.getInstance();
}

export function createSnapshot(
  metricIds: string[],
  description?: string
): HistoricalSnapshot {
  return getSnapshotStore().createPointSnapshot(metricIds, 'system', undefined, description);
}

export function createDailySnapshot(): HistoricalSnapshot {
  return getSnapshotStore().createDailySnapshot();
}

export function analyzeTrend(
  metricId: string,
  days: number = 30
): TrendAnalysis | null {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  return getSnapshotStore().analyzeTrend(metricId, startDate, endDate);
}

export function compareWeekOverWeek(metricIds: string[]): ComparisonReport {
  return getSnapshotStore().compareWeekOverWeek(metricIds);
}
