/**
 * Central Metrics Registry - Main Service
 *
 * Single source of truth for all metrics.
 * Provides unified access to metric definitions, values, and queries.
 */

import { log } from '../../lib/logger';
import type {
  MetricDefinition,
  MetricValue,
  MetricQuery,
  MetricResult,
  MetricSnapshot,
  MetricCategory,
  MetricEntityType,
  TimeGranularity,
  DashboardRole,
  isUnifiedMetricsEnabled,
} from './types';
import {
  ALL_METRICS,
  METRICS_MAP,
  getMetricDefinition,
  getMetricsByCategory,
  getMetricsForDashboard,
} from './definitions';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[MetricsRegistry] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[MetricsRegistry] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[MetricsRegistry] ${msg}`, data),
};

// =====================================================
// METRICS REGISTRY CLASS
// =====================================================

export class MetricsRegistry {
  private static instance: MetricsRegistry | null = null;

  // In-memory cache for real-time metrics
  private realtimeCache: Map<string, MetricValue[]> = new Map();
  private snapshotCache: Map<string, MetricSnapshot> = new Map();

  // Cache TTL in milliseconds
  private cacheTTL = 60000; // 1 minute default
  private lastCacheClean = Date.now();

  private constructor() {
    logger.info('Metrics Registry initialized', {
      totalMetrics: ALL_METRICS.length,
      categories: [...new Set(ALL_METRICS.map(m => m.category))],
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static reset(): void {
    MetricsRegistry.instance = null;
  }

  // =====================================================
  // METRIC DEFINITIONS
  // =====================================================

  /**
   * Get all metric definitions
   */
  getAllDefinitions(): MetricDefinition[] {
    return ALL_METRICS;
  }

  /**
   * Get metric definition by ID
   */
  getDefinition(metricId: string): MetricDefinition | undefined {
    return getMetricDefinition(metricId);
  }

  /**
   * Get metrics by category
   */
  getByCategory(category: MetricCategory): MetricDefinition[] {
    return getMetricsByCategory(category);
  }

  /**
   * Get metrics for a specific dashboard role
   */
  getForDashboard(role: DashboardRole): MetricDefinition[] {
    return getMetricsForDashboard(role);
  }

  /**
   * Get metrics that track a specific entity type
   */
  getByEntityType(entityType: MetricEntityType): MetricDefinition[] {
    return ALL_METRICS.filter(m => m.entityTypes.includes(entityType));
  }

  /**
   * Validate if a metric ID exists
   */
  isValidMetric(metricId: string): boolean {
    return METRICS_MAP.has(metricId);
  }

  // =====================================================
  // METRIC VALUES
  // =====================================================

  /**
   * Record a metric value
   */
  recordValue(value: MetricValue): void {
    const definition = this.getDefinition(value.metricId);
    if (!definition) {
      logger.warn('Unknown metric ID', { metricId: value.metricId });
      return;
    }

    // Validate entity type
    if (!definition.entityTypes.includes(value.entityType)) {
      logger.warn('Invalid entity type for metric', {
        metricId: value.metricId,
        entityType: value.entityType,
        allowedTypes: definition.entityTypes,
      });
      return;
    }

    // Store in realtime cache
    const cacheKey = this.getCacheKey(value.metricId, value.entityType, value.entityId);
    const values = this.realtimeCache.get(cacheKey) || [];
    values.push(value);

    // Keep only recent values (last hour for realtime)
    const oneHourAgo = Date.now() - 3600000;
    const filtered = values.filter(v => v.timestamp.getTime() > oneHourAgo);
    this.realtimeCache.set(cacheKey, filtered);

    // Clean cache periodically
    this.maybeCleanCache();
  }

  /**
   * Record multiple metric values
   */
  recordValues(values: MetricValue[]): void {
    values.forEach(v => this.recordValue(v));
  }

  /**
   * Get current value for a metric
   */
  getCurrentValue(
    metricId: string,
    entityType: MetricEntityType,
    entityId?: string
  ): MetricValue | undefined {
    const cacheKey = this.getCacheKey(metricId, entityType, entityId);
    const values = this.realtimeCache.get(cacheKey);
    if (!values || values.length === 0) return undefined;
    return values[values.length - 1]; // Most recent
  }

  /**
   * Get aggregated value for a metric
   */
  getAggregatedValue(
    metricId: string,
    entityType: MetricEntityType,
    entityId?: string,
    since?: Date
  ): number | undefined {
    const definition = this.getDefinition(metricId);
    if (!definition) return undefined;

    const cacheKey = this.getCacheKey(metricId, entityType, entityId);
    const values = this.realtimeCache.get(cacheKey);
    if (!values || values.length === 0) return undefined;

    // Filter by time if specified
    let filtered = values;
    if (since) {
      filtered = values.filter(v => v.timestamp >= since);
    }
    if (filtered.length === 0) return undefined;

    // Apply aggregation method
    const nums = filtered.map(v => v.value);
    switch (definition.aggregation) {
      case 'sum':
        return nums.reduce((a, b) => a + b, 0);
      case 'avg':
        return nums.reduce((a, b) => a + b, 0) / nums.length;
      case 'min':
        return Math.min(...nums);
      case 'max':
        return Math.max(...nums);
      case 'count':
        return nums.length;
      case 'last':
        return nums[nums.length - 1];
      default:
        return nums[nums.length - 1];
    }
  }

  // =====================================================
  // SNAPSHOTS
  // =====================================================

  /**
   * Create a snapshot for a metric
   */
  createSnapshot(
    metricId: string,
    entityType: MetricEntityType,
    entityId?: string,
    current?: number,
    previous?: number
  ): MetricSnapshot | undefined {
    const definition = this.getDefinition(metricId);
    if (!definition) return undefined;

    const currentValue = current ?? this.getAggregatedValue(metricId, entityType, entityId);
    if (currentValue === undefined) return undefined;

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let changePercent: number | undefined;
    let changeAbsolute: number | undefined;

    if (previous !== undefined && previous !== 0) {
      changeAbsolute = currentValue - previous;
      changePercent = ((currentValue - previous) / previous) * 100;

      if (changePercent > 5) trend = 'up';
      else if (changePercent < -5) trend = 'down';
    }

    // Check alert level
    let alertLevel: 'normal' | 'warning' | 'critical' = 'normal';
    if (definition.thresholds) {
      const { warning, critical, direction } = definition.thresholds;
      if (direction === 'above') {
        if (critical !== undefined && currentValue >= critical) alertLevel = 'critical';
        else if (warning !== undefined && currentValue >= warning) alertLevel = 'warning';
      } else if (direction === 'below') {
        if (critical !== undefined && currentValue <= critical) alertLevel = 'critical';
        else if (warning !== undefined && currentValue <= warning) alertLevel = 'warning';
      }
    }

    const snapshot: MetricSnapshot = {
      metricId,
      entityType,
      entityId,
      timestamp: new Date(),
      current: currentValue,
      previous,
      trend,
      changePercent,
      changeAbsolute,
      alertLevel,
    };

    // Cache snapshot
    const cacheKey = this.getCacheKey(metricId, entityType, entityId);
    this.snapshotCache.set(cacheKey, snapshot);

    return snapshot;
  }

  /**
   * Get cached snapshot
   */
  getSnapshot(
    metricId: string,
    entityType: MetricEntityType,
    entityId?: string
  ): MetricSnapshot | undefined {
    const cacheKey = this.getCacheKey(metricId, entityType, entityId);
    return this.snapshotCache.get(cacheKey);
  }

  // =====================================================
  // QUERIES
  // =====================================================

  /**
   * Execute a metric query
   * Note: This is a simplified in-memory implementation.
   * Production should query the database.
   */
  query(query: MetricQuery): MetricResult[] {
    const results: MetricResult[] = [];

    for (const metricId of query.metricIds) {
      const definition = this.getDefinition(metricId);
      if (!definition) continue;

      const entityTypes = query.entityTypes || definition.entityTypes;
      const allValues: MetricValue[] = [];

      for (const entityType of entityTypes) {
        const entityIds = query.entityIds || [undefined];
        for (const entityId of entityIds) {
          const cacheKey = this.getCacheKey(metricId, entityType, entityId);
          const values = this.realtimeCache.get(cacheKey) || [];

          // Filter by date range
          const filtered = values.filter(
            v => v.timestamp >= query.startDate && v.timestamp <= query.endDate
          );
          allValues.push(...filtered);
        }
      }

      // Calculate summary
      const nums = allValues.map(v => v.value);
      const total = nums.reduce((a, b) => a + b, 0);
      const average = nums.length > 0 ? total / nums.length : 0;
      const min = nums.length > 0 ? Math.min(...nums) : 0;
      const max = nums.length > 0 ? Math.max(...nums) : 0;

      // Simple trend calculation
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (nums.length >= 2) {
        const firstHalf = nums.slice(0, Math.floor(nums.length / 2));
        const secondHalf = nums.slice(Math.floor(nums.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const change = ((secondAvg - firstAvg) / firstAvg) * 100;
        if (change > 5) trend = 'up';
        else if (change < -5) trend = 'down';
      }

      results.push({
        metricId,
        definition,
        values: allValues.slice(query.offset || 0, (query.offset || 0) + (query.limit || 100)),
        summary: {
          total,
          average,
          min,
          max,
          count: nums.length,
          trend,
        },
        timeRange: {
          start: query.startDate,
          end: query.endDate,
          granularity: query.granularity,
        },
      });
    }

    return results;
  }

  // =====================================================
  // FORMAT & DISPLAY
  // =====================================================

  /**
   * Format a metric value for display
   */
  formatValue(metricId: string, value: number): string {
    const definition = this.getDefinition(metricId);
    if (!definition) return String(value);

    const format = definition.format || {};
    const decimals = format.decimals ?? 2;
    const prefix = format.prefix || '';
    const suffix = format.suffix || '';

    // Handle currency (stored in cents)
    let displayValue = value;
    if (definition.type === 'currency') {
      displayValue = value / 100;
    }

    const formatted = displayValue.toFixed(decimals);
    return `${prefix}${formatted}${suffix}`;
  }

  /**
   * Get metric status based on thresholds
   */
  getMetricStatus(
    metricId: string,
    value: number
  ): 'good' | 'warning' | 'critical' | 'neutral' {
    const definition = this.getDefinition(metricId);
    if (!definition || !definition.thresholds) return 'neutral';

    const { warning, critical, direction } = definition.thresholds;

    if (direction === 'above') {
      if (critical !== undefined && value >= critical) return 'critical';
      if (warning !== undefined && value >= warning) return 'warning';
      return 'good';
    } else if (direction === 'below') {
      if (critical !== undefined && value <= critical) return 'critical';
      if (warning !== undefined && value <= warning) return 'warning';
      return 'good';
    }

    return 'neutral';
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  private getCacheKey(
    metricId: string,
    entityType: MetricEntityType,
    entityId?: string
  ): string {
    return `${metricId}:${entityType}:${entityId || 'global'}`;
  }

  private maybeCleanCache(): void {
    const now = Date.now();
    if (now - this.lastCacheClean < this.cacheTTL) return;

    this.lastCacheClean = now;
    const oneHourAgo = now - 3600000;

    // Clean realtime cache
    for (const [key, values] of this.realtimeCache.entries()) {
      const filtered = values.filter(v => v.timestamp.getTime() > oneHourAgo);
      if (filtered.length === 0) {
        this.realtimeCache.delete(key);
      } else {
        this.realtimeCache.set(key, filtered);
      }
    }

    // Clean old snapshots
    for (const [key, snapshot] of this.snapshotCache.entries()) {
      if (snapshot.timestamp.getTime() < oneHourAgo) {
        this.snapshotCache.delete(key);
      }
    }
  }
}

// =====================================================
// CONVENIENCE EXPORTS
// =====================================================

/**
 * Get the singleton registry instance
 */
export function getMetricsRegistry(): MetricsRegistry {
  return MetricsRegistry.getInstance();
}

/**
 * Record a single metric value
 */
export function recordMetric(
  metricId: string,
  value: number,
  entityType: MetricEntityType,
  entityId?: string,
  metadata?: Record<string, unknown>
): void {
  const registry = getMetricsRegistry();
  registry.recordValue({
    metricId,
    value,
    entityType,
    entityId,
    timestamp: new Date(),
    granularity: 'realtime',
    metadata,
  });
}

/**
 * Get current metric value
 */
export function getMetric(
  metricId: string,
  entityType: MetricEntityType,
  entityId?: string
): number | undefined {
  const registry = getMetricsRegistry();
  const value = registry.getCurrentValue(metricId, entityType, entityId);
  return value?.value;
}

// Re-export types and definitions
export * from './types';
export * from './definitions';
