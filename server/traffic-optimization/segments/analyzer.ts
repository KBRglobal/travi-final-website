/**
 * Traffic Segment Analyzer
 *
 * Segments traffic and detects underperforming segments.
 * Consumes data from traffic-intel (read-only).
 */

import type {
  TrafficSegment,
  TrafficSourceType,
  UserIntent,
  DeviceType,
  SegmentMetrics,
  SegmentPerformance,
  SegmentPerformanceReport,
} from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const UNDERPERFORMANCE_THRESHOLD = -20; // 20% below benchmark
const ENGAGEMENT_SCORE_WEIGHTS = {
  bounceRate: -0.3, // Lower is better
  avgTimeOnPage: 0.3,
  conversionRate: 0.4,
};

const BENCHMARK_METRICS: Record<TrafficSourceType, Partial<SegmentMetrics>> = {
  organic_search: { bounceRate: 0.45, avgTimeOnPage: 120, conversionRate: 0.03 },
  ai_search: { bounceRate: 0.55, avgTimeOnPage: 90, conversionRate: 0.02 },
  referral: { bounceRate: 0.50, avgTimeOnPage: 100, conversionRate: 0.025 },
  social: { bounceRate: 0.60, avgTimeOnPage: 60, conversionRate: 0.015 },
  direct: { bounceRate: 0.40, avgTimeOnPage: 150, conversionRate: 0.04 },
  paid: { bounceRate: 0.50, avgTimeOnPage: 80, conversionRate: 0.035 },
  email: { bounceRate: 0.35, avgTimeOnPage: 180, conversionRate: 0.05 },
};

// ============================================================================
// SEGMENT IDENTIFICATION
// ============================================================================

/**
 * Generate segment ID from components
 */
export function generateSegmentId(segment: TrafficSegment): string {
  return `${segment.source}:${segment.intent}:${segment.device}${segment.subSource ? `:${segment.subSource}` : ''}`;
}

/**
 * Parse segment ID back to components
 */
export function parseSegmentId(id: string): TrafficSegment {
  const parts = id.split(':');
  return {
    id,
    source: parts[0] as TrafficSourceType,
    intent: parts[1] as UserIntent,
    device: parts[2] as DeviceType,
    subSource: parts[3],
  };
}

/**
 * Infer user intent from behavior signals
 */
export function inferIntent(signals: {
  pageType?: string;
  queryTerms?: string[];
  hasTransaction?: boolean;
  scrollDepth?: number;
}): UserIntent {
  // Transactional signals
  if (signals.hasTransaction) return 'transactional';
  if (signals.queryTerms?.some((t) =>
    ['buy', 'book', 'price', 'cost', 'ticket', 'reserve'].includes(t.toLowerCase())
  )) {
    return 'transactional';
  }

  // Commercial investigation
  if (signals.queryTerms?.some((t) =>
    ['best', 'top', 'review', 'compare', 'vs', 'alternative'].includes(t.toLowerCase())
  )) {
    return 'commercial';
  }

  // Navigational
  if (signals.pageType === 'homepage' || signals.pageType === 'category') {
    return 'navigational';
  }

  // Default to informational
  return 'informational';
}

/**
 * Infer device type from user agent
 */
export function inferDevice(userAgent?: string): DeviceType {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

// ============================================================================
// ENGAGEMENT SCORING
// ============================================================================

/**
 * Calculate engagement score (0-100)
 */
export function calculateEngagementScore(metrics: {
  bounceRate: number;
  avgTimeOnPage: number;
  conversionRate: number;
}): number {
  // Normalize metrics to 0-1 scale
  const bounceNorm = Math.max(0, Math.min(1, 1 - metrics.bounceRate));
  const timeNorm = Math.min(1, metrics.avgTimeOnPage / 300); // Cap at 5 min
  const convNorm = Math.min(1, metrics.conversionRate / 0.1); // Cap at 10%

  // Weighted sum
  const score =
    bounceNorm * Math.abs(ENGAGEMENT_SCORE_WEIGHTS.bounceRate) +
    timeNorm * ENGAGEMENT_SCORE_WEIGHTS.avgTimeOnPage +
    convNorm * ENGAGEMENT_SCORE_WEIGHTS.conversionRate;

  return Math.round(score * 100);
}

// ============================================================================
// PERFORMANCE ANALYSIS
// ============================================================================

/**
 * Compare segment to benchmarks
 */
export function analyzeSegmentPerformance(
  segment: TrafficSegment,
  metrics: SegmentMetrics,
  overallMetrics: SegmentMetrics
): SegmentPerformance {
  const benchmark = BENCHMARK_METRICS[segment.source] || BENCHMARK_METRICS.direct;

  // Calculate comparison vs overall
  const vsOverall = calculatePercentageDiff(
    metrics.engagementScore,
    overallMetrics.engagementScore
  );

  // Calculate comparison vs source benchmark
  const benchmarkEngagement = calculateEngagementScore({
    bounceRate: benchmark.bounceRate || 0.5,
    avgTimeOnPage: benchmark.avgTimeOnPage || 100,
    conversionRate: benchmark.conversionRate || 0.02,
  });
  const vsSameSource = calculatePercentageDiff(
    metrics.engagementScore,
    benchmarkEngagement
  );

  // Determine trend (simplified - would use historical data in production)
  const trend: 'improving' | 'declining' | 'stable' = 'stable';

  // Detect underperformance
  const isUnderperforming = vsOverall < UNDERPERFORMANCE_THRESHOLD || vsSameSource < UNDERPERFORMANCE_THRESHOLD;
  const underperformingReasons: string[] = [];

  if (metrics.bounceRate > (benchmark.bounceRate || 0.5) * 1.3) {
    underperformingReasons.push('Bounce rate 30%+ above benchmark');
  }
  if (metrics.avgTimeOnPage < (benchmark.avgTimeOnPage || 100) * 0.7) {
    underperformingReasons.push('Time on page 30%+ below benchmark');
  }
  if (metrics.conversionRate < (benchmark.conversionRate || 0.02) * 0.5) {
    underperformingReasons.push('Conversion rate 50%+ below benchmark');
  }

  return {
    segment,
    metrics,
    benchmarkComparison: {
      vsOverall,
      vsSameSource,
      trend,
    },
    isUnderperforming,
    underperformingReasons,
  };
}

/**
 * Calculate percentage difference
 */
function calculatePercentageDiff(value: number, baseline: number): number {
  if (baseline === 0) return value > 0 ? 100 : 0;
  return Math.round(((value - baseline) / baseline) * 100);
}

// ============================================================================
// SEGMENT ANALYZER CLASS
// ============================================================================

export interface SegmentData {
  segment: TrafficSegment;
  visits: number;
  uniqueVisitors: number;
  bounces: number;
  totalTimeOnPage: number;
  conversions: number;
  aiVisibilityScore?: number;
}

export class TrafficSegmentAnalyzer {
  private segments: Map<string, SegmentData>;
  private period: { start: string; end: string };

  constructor() {
    this.segments = new Map();
    const now = new Date();
    this.period = {
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    };
  }

  /**
   * Record a visit to a segment
   */
  recordVisit(
    source: TrafficSourceType,
    intent: UserIntent,
    device: DeviceType,
    data: {
      visitorId?: string;
      isBounce?: boolean;
      timeOnPage?: number;
      isConversion?: boolean;
      subSource?: string;
      aiVisibilityScore?: number;
    }
  ): void {
    const segment: TrafficSegment = {
      id: '',
      source,
      intent,
      device,
      subSource: data.subSource,
    };
    segment.id = generateSegmentId(segment);

    let segmentData = this.segments.get(segment.id);
    if (!segmentData) {
      segmentData = {
        segment,
        visits: 0,
        uniqueVisitors: 0,
        bounces: 0,
        totalTimeOnPage: 0,
        conversions: 0,
      };
      this.segments.set(segment.id, segmentData);
    }

    segmentData.visits++;
    if (data.visitorId) segmentData.uniqueVisitors++;
    if (data.isBounce) segmentData.bounces++;
    if (data.timeOnPage) segmentData.totalTimeOnPage += data.timeOnPage;
    if (data.isConversion) segmentData.conversions++;
    if (data.aiVisibilityScore !== undefined) {
      segmentData.aiVisibilityScore = data.aiVisibilityScore;
    }
  }

  /**
   * Import segment data from traffic-intel
   */
  importFromTrafficIntel(attributions: Array<{
    channel: string;
    source: string;
    visits: number;
    uniqueVisitors: number;
    bounceCount: number;
    totalTimeOnPage: number;
    aiPlatform?: string;
  }>): void {
    for (const attr of attributions) {
      const source = attr.channel as TrafficSourceType;
      const intent: UserIntent = 'informational'; // Default, would be inferred in production
      const device: DeviceType = 'unknown'; // Would come from actual data

      const segment: TrafficSegment = {
        id: '',
        source,
        intent,
        device,
        subSource: attr.aiPlatform || attr.source,
      };
      segment.id = generateSegmentId(segment);

      let segmentData = this.segments.get(segment.id);
      if (!segmentData) {
        segmentData = {
          segment,
          visits: 0,
          uniqueVisitors: 0,
          bounces: 0,
          totalTimeOnPage: 0,
          conversions: 0,
        };
        this.segments.set(segment.id, segmentData);
      }

      segmentData.visits += attr.visits;
      segmentData.uniqueVisitors += attr.uniqueVisitors;
      segmentData.bounces += attr.bounceCount;
      segmentData.totalTimeOnPage += attr.totalTimeOnPage;
    }
  }

  /**
   * Convert segment data to metrics
   */
  private toMetrics(data: SegmentData): SegmentMetrics {
    const bounceRate = data.visits > 0 ? data.bounces / data.visits : 0;
    const avgTimeOnPage = data.visits > 0 ? data.totalTimeOnPage / data.visits : 0;
    const conversionRate = data.visits > 0 ? data.conversions / data.visits : 0;

    return {
      segment: data.segment,
      visits: data.visits,
      uniqueVisitors: data.uniqueVisitors,
      bounceRate,
      avgTimeOnPage,
      conversionRate,
      engagementScore: calculateEngagementScore({ bounceRate, avgTimeOnPage, conversionRate }),
      aiVisibilityScore: data.aiVisibilityScore,
      period: this.period,
    };
  }

  /**
   * Calculate overall metrics across all segments
   */
  private calculateOverallMetrics(): SegmentMetrics {
    let totalVisits = 0;
    let totalUnique = 0;
    let totalBounces = 0;
    let totalTime = 0;
    let totalConversions = 0;

    for (const data of this.segments.values()) {
      totalVisits += data.visits;
      totalUnique += data.uniqueVisitors;
      totalBounces += data.bounces;
      totalTime += data.totalTimeOnPage;
      totalConversions += data.conversions;
    }

    const bounceRate = totalVisits > 0 ? totalBounces / totalVisits : 0;
    const avgTimeOnPage = totalVisits > 0 ? totalTime / totalVisits : 0;
    const conversionRate = totalVisits > 0 ? totalConversions / totalVisits : 0;

    return {
      segment: { id: 'overall', source: 'direct', intent: 'informational', device: 'unknown' },
      visits: totalVisits,
      uniqueVisitors: totalUnique,
      bounceRate,
      avgTimeOnPage,
      conversionRate,
      engagementScore: calculateEngagementScore({ bounceRate, avgTimeOnPage, conversionRate }),
      period: this.period,
    };
  }

  /**
   * Generate segment performance report
   */
  generateReport(): SegmentPerformanceReport {
    const overallMetrics = this.calculateOverallMetrics();
    const performances: SegmentPerformance[] = [];

    for (const data of this.segments.values()) {
      const metrics = this.toMetrics(data);
      const performance = analyzeSegmentPerformance(data.segment, metrics, overallMetrics);
      performances.push(performance);
    }

    // Sort by engagement score
    performances.sort((a, b) => b.metrics.engagementScore - a.metrics.engagementScore);

    const topPerformers = performances.filter((p) => !p.isUnderperforming).slice(0, 5);
    const underperformers = performances.filter((p) => p.isUnderperforming);

    // Generate insights
    const insights: string[] = [];

    if (underperformers.length > 0) {
      insights.push(`${underperformers.length} segments are underperforming and need attention`);
    }

    const aiSegments = performances.filter((p) => p.segment.source === 'ai_search');
    if (aiSegments.length > 0) {
      const avgAIEngagement = aiSegments.reduce((sum, s) => sum + s.metrics.engagementScore, 0) / aiSegments.length;
      if (avgAIEngagement < 40) {
        insights.push('AI search traffic has low engagement - consider improving AEO content');
      }
    }

    const mobileSegments = performances.filter((p) => p.segment.device === 'mobile');
    if (mobileSegments.length > 0) {
      const avgMobileBounce = mobileSegments.reduce((sum, s) => sum + s.metrics.bounceRate, 0) / mobileSegments.length;
      if (avgMobileBounce > 0.6) {
        insights.push('Mobile bounce rate is high - consider mobile optimization');
      }
    }

    return {
      generatedAt: new Date(),
      period: this.period,
      totalSegments: performances.length,
      segments: performances,
      topPerformers,
      underperformers,
      insights,
    };
  }

  /**
   * Get segment by ID
   */
  getSegment(id: string): SegmentMetrics | undefined {
    const data = this.segments.get(id);
    if (!data) return undefined;
    return this.toMetrics(data);
  }

  /**
   * Get all segments for a source
   */
  getSegmentsBySource(source: TrafficSourceType): SegmentMetrics[] {
    const results: SegmentMetrics[] = [];
    for (const data of this.segments.values()) {
      if (data.segment.source === source) {
        results.push(this.toMetrics(data));
      }
    }
    return results;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.segments.clear();
  }

  /**
   * Get segment count
   */
  size(): number {
    return this.segments.size;
  }
}

// Singleton instance
let analyzerInstance: TrafficSegmentAnalyzer | null = null;

export function getSegmentAnalyzer(): TrafficSegmentAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new TrafficSegmentAnalyzer();
  }
  return analyzerInstance;
}

export function resetSegmentAnalyzer(): void {
  if (analyzerInstance) {
    analyzerInstance.clear();
  }
  analyzerInstance = null;
}
