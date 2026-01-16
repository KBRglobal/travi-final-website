/**
 * Data Drift Detector
 * Detects when metric distributions or patterns change unexpectedly
 */

import type { DataDriftStatus, DriftingMetric } from '../types';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface DriftConfig {
  baselineWindowDays: number;
  currentWindowDays: number;
  distributionThreshold: number; // KL divergence threshold
  trendThreshold: number; // Trend change threshold
  seasonalityThreshold: number;
  outlierThreshold: number;
  minimumDataPoints: number;
}

const DEFAULT_DRIFT_CONFIG: DriftConfig = {
  baselineWindowDays: 30,
  currentWindowDays: 7,
  distributionThreshold: 0.3,
  trendThreshold: 0.5,
  seasonalityThreshold: 0.4,
  outlierThreshold: 3, // Standard deviations
  minimumDataPoints: 50,
};

// =============================================================================
// DATA STRUCTURES
// =============================================================================

interface MetricTimeSeries {
  metricId: string;
  values: Array<{ timestamp: Date; value: number }>;
}

interface DriftAnalysis {
  metricId: string;
  hasDistributionDrift: boolean;
  hasTrendDrift: boolean;
  hasSeasonalityDrift: boolean;
  hasOutlierDrift: boolean;
  details: {
    distribution?: { baseline: number; current: number; divergence: number };
    trend?: { baselineSlope: number; currentSlope: number; change: number };
    seasonality?: { baseline: number; current: number };
    outliers?: { count: number; percentage: number };
  };
}

// =============================================================================
// DATA DRIFT DETECTOR
// =============================================================================

export class DataDriftDetector {
  private config: DriftConfig;
  private metricHistory: Map<string, MetricTimeSeries> = new Map();
  private lastDriftStatus: DataDriftStatus | null = null;

  constructor(config: Partial<DriftConfig> = {}) {
    this.config = { ...DEFAULT_DRIFT_CONFIG, ...config };
  }

  // =========================================================================
  // DATA INGESTION
  // =========================================================================

  recordValue(metricId: string, value: number, timestamp: Date = new Date()): void {
    let series = this.metricHistory.get(metricId);

    if (!series) {
      series = { metricId, values: [] };
      this.metricHistory.set(metricId, series);
    }

    series.values.push({ timestamp, value });

    // Keep only data within baseline + current window
    const cutoff = new Date(
      Date.now() - (this.config.baselineWindowDays + this.config.currentWindowDays) * 24 * 60 * 60 * 1000
    );

    series.values = series.values.filter(v => v.timestamp > cutoff);
  }

  recordBatch(metricId: string, values: Array<{ timestamp: Date; value: number }>): void {
    for (const { timestamp, value } of values) {
      this.recordValue(metricId, value, timestamp);
    }
  }

  // =========================================================================
  // DRIFT DETECTION
  // =========================================================================

  detectDrift(): DataDriftStatus {
    const driftingMetrics: DriftingMetric[] = [];

    for (const [metricId, series] of this.metricHistory) {
      if (series.values.length < this.config.minimumDataPoints) {
        continue;
      }

      const analysis = this.analyzeMetric(series);

      if (
        analysis.hasDistributionDrift ||
        analysis.hasTrendDrift ||
        analysis.hasSeasonalityDrift ||
        analysis.hasOutlierDrift
      ) {
        // Determine primary drift type
        const driftType = this.getPrimaryDriftType(analysis);
        const magnitude = this.calculateDriftMagnitude(analysis);

        driftingMetrics.push({
          metricId,
          driftType,
          magnitude,
          baselinePeriod: `Last ${this.config.baselineWindowDays} days`,
          currentPeriod: `Last ${this.config.currentWindowDays} days`,
          details: this.formatDriftDetails(analysis),
        });
      }
    }

    const severity = this.calculateOverallSeverity(driftingMetrics);
    const recommendation = this.generateRecommendation(driftingMetrics, severity);

    this.lastDriftStatus = {
      detected: driftingMetrics.length > 0,
      severity,
      metrics: driftingMetrics,
      detectedAt: driftingMetrics.length > 0 ? new Date() : undefined,
      recommendation,
    };

    return this.lastDriftStatus;
  }

  private analyzeMetric(series: MetricTimeSeries): DriftAnalysis {
    const now = Date.now();
    const baselineStart =
      now - (this.config.baselineWindowDays + this.config.currentWindowDays) * 24 * 60 * 60 * 1000;
    const currentStart = now - this.config.currentWindowDays * 24 * 60 * 60 * 1000;

    const baselineValues = series.values
      .filter(v => v.timestamp.getTime() >= baselineStart && v.timestamp.getTime() < currentStart)
      .map(v => v.value);

    const currentValues = series.values
      .filter(v => v.timestamp.getTime() >= currentStart)
      .map(v => v.value);

    if (baselineValues.length < 10 || currentValues.length < 5) {
      return {
        metricId: series.metricId,
        hasDistributionDrift: false,
        hasTrendDrift: false,
        hasSeasonalityDrift: false,
        hasOutlierDrift: false,
        details: {},
      };
    }

    return {
      metricId: series.metricId,
      hasDistributionDrift: this.checkDistributionDrift(baselineValues, currentValues),
      hasTrendDrift: this.checkTrendDrift(baselineValues, currentValues),
      hasSeasonalityDrift: false, // Simplified - would need more data
      hasOutlierDrift: this.checkOutlierDrift(baselineValues, currentValues),
      details: {
        distribution: this.getDistributionDetails(baselineValues, currentValues),
        trend: this.getTrendDetails(baselineValues, currentValues),
        outliers: this.getOutlierDetails(baselineValues, currentValues),
      },
    };
  }

  // =========================================================================
  // DISTRIBUTION DRIFT
  // =========================================================================

  private checkDistributionDrift(baseline: number[], current: number[]): boolean {
    const details = this.getDistributionDetails(baseline, current);
    return details.divergence > this.config.distributionThreshold;
  }

  private getDistributionDetails(
    baseline: number[],
    current: number[]
  ): { baseline: number; current: number; divergence: number } {
    const baselineMean = this.mean(baseline);
    const currentMean = this.mean(current);
    const baselineStd = this.std(baseline);
    const currentStd = this.std(current);

    // Simplified divergence calculation (normalized difference)
    const meanDivergence =
      baselineMean !== 0 ? Math.abs(currentMean - baselineMean) / Math.abs(baselineMean) : 0;

    const stdDivergence =
      baselineStd !== 0 ? Math.abs(currentStd - baselineStd) / baselineStd : 0;

    const divergence = (meanDivergence + stdDivergence) / 2;

    return {
      baseline: baselineMean,
      current: currentMean,
      divergence,
    };
  }

  // =========================================================================
  // TREND DRIFT
  // =========================================================================

  private checkTrendDrift(baseline: number[], current: number[]): boolean {
    const details = this.getTrendDetails(baseline, current);
    return Math.abs(details.change) > this.config.trendThreshold;
  }

  private getTrendDetails(
    baseline: number[],
    current: number[]
  ): { baselineSlope: number; currentSlope: number; change: number } {
    const baselineSlope = this.calculateSlope(baseline);
    const currentSlope = this.calculateSlope(current);

    const change =
      baselineSlope !== 0 ? (currentSlope - baselineSlope) / Math.abs(baselineSlope) : currentSlope;

    return { baselineSlope, currentSlope, change };
  }

  private calculateSlope(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = this.mean(values);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    return denominator !== 0 ? numerator / denominator : 0;
  }

  // =========================================================================
  // OUTLIER DRIFT
  // =========================================================================

  private checkOutlierDrift(baseline: number[], current: number[]): boolean {
    const details = this.getOutlierDetails(baseline, current);
    return details.percentage > 10; // More than 10% outliers
  }

  private getOutlierDetails(
    baseline: number[],
    current: number[]
  ): { count: number; percentage: number } {
    const baselineMean = this.mean(baseline);
    const baselineStd = this.std(baseline);

    const lowerBound = baselineMean - this.config.outlierThreshold * baselineStd;
    const upperBound = baselineMean + this.config.outlierThreshold * baselineStd;

    const outliers = current.filter(v => v < lowerBound || v > upperBound);

    return {
      count: outliers.length,
      percentage: (outliers.length / current.length) * 100,
    };
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private std(values: number[]): number {
    if (values.length < 2) return 0;
    const m = this.mean(values);
    const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  private getPrimaryDriftType(
    analysis: DriftAnalysis
  ): 'distribution' | 'trend' | 'seasonality' | 'outlier' {
    if (analysis.hasTrendDrift) return 'trend';
    if (analysis.hasDistributionDrift) return 'distribution';
    if (analysis.hasOutlierDrift) return 'outlier';
    return 'distribution';
  }

  private calculateDriftMagnitude(analysis: DriftAnalysis): number {
    let magnitude = 0;

    if (analysis.details.distribution) {
      magnitude = Math.max(magnitude, analysis.details.distribution.divergence);
    }

    if (analysis.details.trend) {
      magnitude = Math.max(magnitude, Math.abs(analysis.details.trend.change));
    }

    if (analysis.details.outliers) {
      magnitude = Math.max(magnitude, analysis.details.outliers.percentage / 100);
    }

    return Math.min(1, magnitude); // Cap at 1
  }

  private formatDriftDetails(analysis: DriftAnalysis): string {
    const parts: string[] = [];

    if (analysis.details.distribution && analysis.hasDistributionDrift) {
      parts.push(
        `Distribution shift: ${analysis.details.distribution.baseline.toFixed(2)} → ${analysis.details.distribution.current.toFixed(2)}`
      );
    }

    if (analysis.details.trend && analysis.hasTrendDrift) {
      parts.push(`Trend change: ${(analysis.details.trend.change * 100).toFixed(1)}%`);
    }

    if (analysis.details.outliers && analysis.hasOutlierDrift) {
      parts.push(
        `${analysis.details.outliers.count} outliers (${analysis.details.outliers.percentage.toFixed(1)}%)`
      );
    }

    return parts.join('; ') || 'Unknown drift pattern';
  }

  private calculateOverallSeverity(
    metrics: DriftingMetric[]
  ): 'none' | 'minor' | 'moderate' | 'severe' {
    if (metrics.length === 0) return 'none';

    const avgMagnitude = metrics.reduce((sum, m) => sum + m.magnitude, 0) / metrics.length;

    if (avgMagnitude > 0.7 || metrics.length > 5) return 'severe';
    if (avgMagnitude > 0.4 || metrics.length > 3) return 'moderate';
    if (avgMagnitude > 0.2 || metrics.length > 1) return 'minor';
    return 'minor';
  }

  private generateRecommendation(
    metrics: DriftingMetric[],
    severity: 'none' | 'minor' | 'moderate' | 'severe'
  ): string {
    if (metrics.length === 0) {
      return 'No significant data drift detected. Continue monitoring.';
    }

    switch (severity) {
      case 'severe':
        return `Critical: ${metrics.length} metrics showing significant drift. Recommend immediate investigation and potential model retraining.`;
      case 'moderate':
        return `Warning: ${metrics.length} metrics drifting. Review data sources and consider threshold adjustments.`;
      case 'minor':
        return `Info: Minor drift detected in ${metrics.length} metrics. Continue monitoring for trends.`;
      default:
        return 'No action required.';
    }
  }

  // =========================================================================
  // QUERIES
  // =========================================================================

  getLastStatus(): DataDriftStatus | null {
    return this.lastDriftStatus;
  }

  getMetricHistory(metricId: string): MetricTimeSeries | null {
    return this.metricHistory.get(metricId) || null;
  }

  getMonitoredMetrics(): string[] {
    return Array.from(this.metricHistory.keys());
  }

  clearHistory(metricId?: string): void {
    if (metricId) {
      this.metricHistory.delete(metricId);
    } else {
      this.metricHistory.clear();
    }
  }
}

// Singleton instance
export const dataDriftDetector = new DataDriftDetector();
