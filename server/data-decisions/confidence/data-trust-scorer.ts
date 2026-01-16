/**
 * Data Trust Scorer
 * Evaluates the trustworthiness of data for decision-making
 */

import type { DataTrustScore } from '../types';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface TrustConfig {
  freshnessWeight: number;
  completenessWeight: number;
  consistencyWeight: number;
  accuracyWeight: number;
  minDataPointsForTrust: number;
  maxStaleHours: Record<string, number>;
}

const DEFAULT_TRUST_CONFIG: TrustConfig = {
  freshnessWeight: 0.30,
  completenessWeight: 0.25,
  consistencyWeight: 0.25,
  accuracyWeight: 0.20,
  minDataPointsForTrust: 100,
  maxStaleHours: {
    health: 0.017, // 1 minute
    cost: 1,
    engagement: 4,
    seo: 24,
    aeo: 24,
    revenue: 24,
    content: 168, // 7 days
    default: 24,
  },
};

// =============================================================================
// DATA TRUST SCORER
// =============================================================================

export interface MetricDataPoint {
  value: number;
  timestamp: Date;
  source?: string;
}

export interface MetricHistory {
  metricId: string;
  category: string;
  dataPoints: MetricDataPoint[];
  lastUpdated: Date;
  expectedFrequency?: number; // expected updates per hour
  knownSources?: string[];
}

export class DataTrustScorer {
  private config: TrustConfig;
  private historicalAccuracy: Map<string, number[]> = new Map();

  constructor(config: Partial<TrustConfig> = {}) {
    this.config = { ...DEFAULT_TRUST_CONFIG, ...config };
  }

  // =========================================================================
  // MAIN SCORING METHOD
  // =========================================================================

  scoreTrust(history: MetricHistory): DataTrustScore {
    const issues: string[] = [];

    // Calculate component scores
    const freshnessScore = this.calculateFreshnessScore(history, issues);
    const completenessScore = this.calculateCompletenessScore(history, issues);
    const consistencyScore = this.calculateConsistencyScore(history, issues);
    const accuracyScore = this.calculateAccuracyScore(history, issues);

    // Calculate weighted overall score
    const overallTrust =
      freshnessScore * this.config.freshnessWeight +
      completenessScore * this.config.completenessWeight +
      consistencyScore * this.config.consistencyWeight +
      accuracyScore * this.config.accuracyWeight;

    const dataPoints = history.dataPoints;

    return {
      metricId: history.metricId,
      overallTrust: Math.round(overallTrust * 100) / 100,
      components: {
        freshness: Math.round(freshnessScore * 100) / 100,
        completeness: Math.round(completenessScore * 100) / 100,
        consistency: Math.round(consistencyScore * 100) / 100,
        accuracy: Math.round(accuracyScore * 100) / 100,
      },
      dataPoints: dataPoints.length,
      timeRange: {
        start: dataPoints.length > 0 ? dataPoints[0].timestamp : new Date(),
        end: dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].timestamp : new Date(),
      },
      lastUpdated: history.lastUpdated,
      issues,
    };
  }

  // =========================================================================
  // COMPONENT CALCULATIONS
  // =========================================================================

  private calculateFreshnessScore(history: MetricHistory, issues: string[]): number {
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - history.lastUpdated.getTime()) / (1000 * 60 * 60);

    const maxStale =
      this.config.maxStaleHours[history.category] || this.config.maxStaleHours.default;

    if (hoursSinceUpdate > maxStale) {
      issues.push(`Data is stale: ${hoursSinceUpdate.toFixed(1)}h since last update (max: ${maxStale}h)`);
    }

    if (hoursSinceUpdate >= maxStale * 2) {
      return 0;
    }

    if (hoursSinceUpdate <= maxStale * 0.5) {
      return 100;
    }

    // Linear decay between 0.5x and 2x max staleness
    const score = 100 * (1 - (hoursSinceUpdate - maxStale * 0.5) / (maxStale * 1.5));
    return Math.max(0, Math.min(100, score));
  }

  private calculateCompletenessScore(history: MetricHistory, issues: string[]): number {
    const dataPoints = history.dataPoints.length;

    if (dataPoints < this.config.minDataPointsForTrust) {
      issues.push(
        `Insufficient data: ${dataPoints} points (minimum: ${this.config.minDataPointsForTrust})`
      );
    }

    if (dataPoints === 0) {
      return 0;
    }

    if (dataPoints >= this.config.minDataPointsForTrust) {
      // Check for gaps in data
      const gapScore = this.checkForGaps(history);
      return gapScore;
    }

    // Partial score for insufficient data
    return (dataPoints / this.config.minDataPointsForTrust) * 80;
  }

  private checkForGaps(history: MetricHistory): number {
    if (!history.expectedFrequency || history.dataPoints.length < 2) {
      return 100;
    }

    const expectedIntervalMs = (1 / history.expectedFrequency) * 60 * 60 * 1000;
    const maxGapMs = expectedIntervalMs * 3; // Allow up to 3x expected interval

    let gapsFound = 0;
    const points = history.dataPoints;

    for (let i = 1; i < points.length; i++) {
      const gap = points[i].timestamp.getTime() - points[i - 1].timestamp.getTime();
      if (gap > maxGapMs) {
        gapsFound++;
      }
    }

    const gapRatio = gapsFound / (points.length - 1);
    return Math.max(0, 100 * (1 - gapRatio * 2));
  }

  private calculateConsistencyScore(history: MetricHistory, issues: string[]): number {
    if (history.dataPoints.length < 10) {
      return 80; // Not enough data to assess consistency
    }

    const values = history.dataPoints.map(p => p.value);

    // Check for outliers using IQR method
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    let outliers = 0;
    for (const value of values) {
      if (value < lowerBound || value > upperBound) {
        outliers++;
      }
    }

    const outlierRatio = outliers / values.length;

    if (outlierRatio > 0.1) {
      issues.push(`High outlier rate: ${(outlierRatio * 100).toFixed(1)}% of values are outliers`);
    }

    // Check for source consistency
    if (history.knownSources && history.knownSources.length > 0) {
      const uniqueSources = new Set(history.dataPoints.map(p => p.source).filter(Boolean));
      if (uniqueSources.size > history.knownSources.length) {
        issues.push('Unknown data sources detected');
        return Math.max(0, 100 * (1 - outlierRatio * 3) - 20);
      }
    }

    return Math.max(0, 100 * (1 - outlierRatio * 3));
  }

  private calculateAccuracyScore(history: MetricHistory, issues: string[]): number {
    // Use historical accuracy if available
    const historicalScores = this.historicalAccuracy.get(history.metricId);

    if (historicalScores && historicalScores.length > 0) {
      const avgAccuracy =
        historicalScores.reduce((sum, s) => sum + s, 0) / historicalScores.length;
      return avgAccuracy;
    }

    // Without historical data, check for suspicious patterns
    if (history.dataPoints.length < 5) {
      return 70; // Default moderate trust
    }

    const values = history.dataPoints.map(p => p.value);

    // Check for constant values (suspicious)
    const uniqueValues = new Set(values);
    if (uniqueValues.size === 1 && values.length > 10) {
      issues.push('All values are identical - possible data collection issue');
      return 50;
    }

    // Check for negative values where not expected
    const hasNegatives = values.some(v => v < 0);
    if (hasNegatives && !history.metricId.includes('change') && !history.metricId.includes('delta')) {
      issues.push('Unexpected negative values detected');
      return 60;
    }

    // Check for extremely high variance
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const cv = Math.sqrt(variance) / Math.abs(mean); // Coefficient of variation

    if (cv > 2) {
      issues.push('Extremely high variance in values');
      return 60;
    }

    return 85; // Default good accuracy when no issues found
  }

  // =========================================================================
  // HISTORICAL ACCURACY TRACKING
  // =========================================================================

  recordAccuracy(metricId: string, accuracyScore: number): void {
    const scores = this.historicalAccuracy.get(metricId) || [];
    scores.push(accuracyScore);

    // Keep last 100 scores
    if (scores.length > 100) {
      scores.shift();
    }

    this.historicalAccuracy.set(metricId, scores);
  }

  getHistoricalAccuracy(metricId: string): number | null {
    const scores = this.historicalAccuracy.get(metricId);
    if (!scores || scores.length === 0) return null;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }

  // =========================================================================
  // BATCH SCORING
  // =========================================================================

  scoreBatch(histories: MetricHistory[]): DataTrustScore[] {
    return histories.map(h => this.scoreTrust(h));
  }

  // =========================================================================
  // TRUST THRESHOLDS
  // =========================================================================

  meetsMinimumTrust(score: DataTrustScore, threshold = 70): boolean {
    return score.overallTrust >= threshold;
  }

  getTrustLevel(score: DataTrustScore): 'high' | 'medium' | 'low' | 'untrusted' {
    if (score.overallTrust >= 85) return 'high';
    if (score.overallTrust >= 70) return 'medium';
    if (score.overallTrust >= 50) return 'low';
    return 'untrusted';
  }
}

// Singleton instance
export const dataTrustScorer = new DataTrustScorer();
