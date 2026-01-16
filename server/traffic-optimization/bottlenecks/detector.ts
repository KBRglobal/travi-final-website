/**
 * Conversion Bottleneck Detector
 *
 * Detects conversion issues like:
 * - High impressions, low engagement
 * - High impressions, low CTR
 * - High CTR, low dwell time
 * - Traffic landing on weak content
 * - AI traffic landing on non-AEO pages
 */

import type {
  Bottleneck,
  BottleneckType,
  BottleneckSeverity,
  BottleneckReport,
  TrafficSegment,
  SegmentMetrics,
} from '../types';

// ============================================================================
// DETECTION THRESHOLDS
// ============================================================================

interface BottleneckThresholds {
  // Impressions vs engagement
  highImpressionsMin: number;
  lowEngagementMax: number;

  // CTR issues
  lowCtrMax: number;
  highCtrMin: number;
  lowDwellMax: number;

  // Bounce rate
  highBounceMin: number;

  // Conversion
  lowConversionMax: number;

  // AI specific
  aiVisibilityScoreMin: number;
  aiEngagementGap: number;

  // Content freshness
  freshnessDecayDays: number;
}

const DEFAULT_THRESHOLDS: BottleneckThresholds = {
  highImpressionsMin: 100,
  lowEngagementMax: 30,
  lowCtrMax: 0.02,
  highCtrMin: 0.05,
  lowDwellMax: 30, // seconds
  highBounceMin: 0.7,
  lowConversionMax: 0.01,
  aiVisibilityScoreMin: 50,
  aiEngagementGap: -30, // 30% below benchmark
  freshnessDecayDays: 90,
};

// ============================================================================
// BOTTLENECK DETECTION RULES
// ============================================================================

interface ContentMetrics {
  contentId: string;
  slug?: string;
  title?: string;
  impressions: number;
  visits: number;
  bounceRate: number;
  avgTimeOnPage: number;
  conversionRate: number;
  ctr: number;
  aiVisibilityScore?: number;
  hasAeoCapsule?: boolean;
  lastUpdated?: Date;
  segments?: SegmentMetrics[];
}

interface DetectionContext {
  content: ContentMetrics;
  thresholds: BottleneckThresholds;
  benchmarks: {
    avgBounceRate: number;
    avgTimeOnPage: number;
    avgConversionRate: number;
    avgCtr: number;
  };
}

type DetectionRule = (ctx: DetectionContext) => Bottleneck | null;

/**
 * Generate unique bottleneck ID
 */
function generateBottleneckId(type: BottleneckType, contentId: string): string {
  return `bn-${type}-${contentId}-${Date.now().toString(36)}`;
}

/**
 * Determine severity based on impact score
 */
function determineSeverity(impactScore: number): BottleneckSeverity {
  if (impactScore >= 80) return 'critical';
  if (impactScore >= 60) return 'high';
  if (impactScore >= 40) return 'medium';
  return 'low';
}

/**
 * Rule: High impressions, low engagement
 */
const detectHighImpressionsLowEngagement: DetectionRule = (ctx) => {
  const { content, thresholds, benchmarks } = ctx;

  if (content.impressions < thresholds.highImpressionsMin) return null;

  const engagementScore =
    (1 - content.bounceRate) * 0.4 +
    Math.min(content.avgTimeOnPage / 180, 1) * 0.3 +
    Math.min(content.conversionRate / 0.05, 1) * 0.3;

  if (engagementScore * 100 > thresholds.lowEngagementMax) return null;

  const impactScore = Math.min(100, (content.impressions / 1000) * 20 + (thresholds.lowEngagementMax - engagementScore * 100));

  return {
    id: generateBottleneckId('high_impressions_low_engagement', content.contentId),
    type: 'high_impressions_low_engagement',
    severity: determineSeverity(impactScore),
    confidence: 0.85,
    detectedAt: new Date(),
    affectedContent: [{
      contentId: content.contentId,
      slug: content.slug,
      title: content.title,
      impactScore,
    }],
    affectedSegments: [],
    metrics: {
      current: {
        impressions: content.impressions,
        engagementScore: Math.round(engagementScore * 100),
        bounceRate: content.bounceRate,
        avgTimeOnPage: content.avgTimeOnPage,
      },
      benchmark: {
        engagementScore: 50,
        bounceRate: benchmarks.avgBounceRate,
        avgTimeOnPage: benchmarks.avgTimeOnPage,
      },
      gap: {
        engagementScore: Math.round(engagementScore * 100) - 50,
        bounceRate: content.bounceRate - benchmarks.avgBounceRate,
      },
    },
    description: `Content has ${content.impressions} impressions but engagement score is only ${Math.round(engagementScore * 100)}%`,
    suggestedActions: [
      'Improve content relevance and value proposition',
      'Optimize page load time and user experience',
      'Add compelling CTAs above the fold',
      'Consider A/B testing headlines and layouts',
    ],
  };
};

/**
 * Rule: High impressions, low CTR
 */
const detectHighImpressionsLowCtr: DetectionRule = (ctx) => {
  const { content, thresholds, benchmarks } = ctx;

  if (content.impressions < thresholds.highImpressionsMin) return null;
  if (content.ctr > thresholds.lowCtrMax) return null;

  const impactScore = Math.min(100, (content.impressions / 500) * 30 + (thresholds.lowCtrMax - content.ctr) * 1000);

  return {
    id: generateBottleneckId('high_impressions_low_ctr', content.contentId),
    type: 'high_impressions_low_ctr',
    severity: determineSeverity(impactScore),
    confidence: 0.8,
    detectedAt: new Date(),
    affectedContent: [{
      contentId: content.contentId,
      slug: content.slug,
      title: content.title,
      impactScore,
    }],
    affectedSegments: [],
    metrics: {
      current: { impressions: content.impressions, ctr: content.ctr },
      benchmark: { ctr: benchmarks.avgCtr },
      gap: { ctr: content.ctr - benchmarks.avgCtr },
    },
    description: `Content has ${content.impressions} impressions but CTR is only ${(content.ctr * 100).toFixed(2)}%`,
    suggestedActions: [
      'Rewrite title for better click appeal',
      'Improve meta description with clear value proposition',
      'Add structured data for rich snippets',
      'Test different headline variations',
    ],
  };
};

/**
 * Rule: High CTR, low dwell time
 */
const detectHighCtrLowDwell: DetectionRule = (ctx) => {
  const { content, thresholds, benchmarks } = ctx;

  if (content.ctr < thresholds.highCtrMin) return null;
  if (content.avgTimeOnPage > thresholds.lowDwellMax) return null;

  const impactScore = Math.min(100, content.ctr * 500 + (thresholds.lowDwellMax - content.avgTimeOnPage) * 2);

  return {
    id: generateBottleneckId('high_ctr_low_dwell', content.contentId),
    type: 'high_ctr_low_dwell',
    severity: determineSeverity(impactScore),
    confidence: 0.75,
    detectedAt: new Date(),
    affectedContent: [{
      contentId: content.contentId,
      slug: content.slug,
      title: content.title,
      impactScore,
    }],
    affectedSegments: [],
    metrics: {
      current: { ctr: content.ctr, avgTimeOnPage: content.avgTimeOnPage },
      benchmark: { avgTimeOnPage: benchmarks.avgTimeOnPage },
      gap: { avgTimeOnPage: content.avgTimeOnPage - benchmarks.avgTimeOnPage },
    },
    description: `High CTR (${(content.ctr * 100).toFixed(1)}%) but users leave after only ${Math.round(content.avgTimeOnPage)}s`,
    suggestedActions: [
      'Ensure content matches title/meta promise',
      'Improve content structure and readability',
      'Add engaging multimedia elements',
      'Check for technical issues (slow load, broken elements)',
    ],
  };
};

/**
 * Rule: High bounce rate
 */
const detectHighBounceRate: DetectionRule = (ctx) => {
  const { content, thresholds, benchmarks } = ctx;

  if (content.bounceRate < thresholds.highBounceMin) return null;

  const impactScore = Math.min(100, (content.bounceRate - thresholds.highBounceMin) * 200 + content.visits * 0.1);

  return {
    id: generateBottleneckId('high_bounce_rate', content.contentId),
    type: 'high_bounce_rate',
    severity: determineSeverity(impactScore),
    confidence: 0.8,
    detectedAt: new Date(),
    affectedContent: [{
      contentId: content.contentId,
      slug: content.slug,
      title: content.title,
      impactScore,
    }],
    affectedSegments: [],
    metrics: {
      current: { bounceRate: content.bounceRate, visits: content.visits },
      benchmark: { bounceRate: benchmarks.avgBounceRate },
      gap: { bounceRate: content.bounceRate - benchmarks.avgBounceRate },
    },
    description: `Bounce rate is ${(content.bounceRate * 100).toFixed(1)}%, well above the ${(benchmarks.avgBounceRate * 100).toFixed(1)}% benchmark`,
    suggestedActions: [
      'Improve content relevance to search intent',
      'Optimize page load speed',
      'Add clear navigation and internal links',
      'Ensure mobile responsiveness',
    ],
  };
};

/**
 * Rule: AI traffic on non-AEO content
 */
const detectAiTrafficNonAeo: DetectionRule = (ctx) => {
  const { content, thresholds } = ctx;

  // Check if content receives AI traffic
  const hasAiTraffic = content.segments?.some((s) => s.segment.source === 'ai_search' && s.visits > 10);
  if (!hasAiTraffic) return null;

  // Check if content lacks AEO optimization
  if (content.hasAeoCapsule && (content.aiVisibilityScore ?? 0) >= thresholds.aiVisibilityScoreMin) {
    return null;
  }

  const aiVisits = content.segments
    ?.filter((s) => s.segment.source === 'ai_search')
    .reduce((sum, s) => sum + s.visits, 0) || 0;

  const impactScore = Math.min(100, aiVisits * 2 + (thresholds.aiVisibilityScoreMin - (content.aiVisibilityScore ?? 0)));

  return {
    id: generateBottleneckId('ai_traffic_non_aeo', content.contentId),
    type: 'ai_traffic_non_aeo',
    severity: determineSeverity(impactScore),
    confidence: 0.9,
    detectedAt: new Date(),
    affectedContent: [{
      contentId: content.contentId,
      slug: content.slug,
      title: content.title,
      impactScore,
    }],
    affectedSegments: content.segments?.filter((s) => s.segment.source === 'ai_search').map((s) => s.segment) || [],
    metrics: {
      current: {
        aiVisits,
        aiVisibilityScore: content.aiVisibilityScore ?? 0,
        hasAeoCapsule: content.hasAeoCapsule ? 1 : 0,
      },
      benchmark: { aiVisibilityScore: thresholds.aiVisibilityScoreMin },
      gap: { aiVisibilityScore: (content.aiVisibilityScore ?? 0) - thresholds.aiVisibilityScoreMin },
    },
    description: `Content receives ${aiVisits} AI search visits but lacks proper AEO optimization`,
    suggestedActions: [
      'Add concise answer capsule (40-60 words)',
      'Implement FAQ schema markup',
      'Structure content for AI extraction',
      'Add clear, factual key points at the top',
    ],
  };
};

/**
 * Rule: Low conversion rate
 */
const detectLowConversion: DetectionRule = (ctx) => {
  const { content, thresholds, benchmarks } = ctx;

  if (content.visits < 50) return null; // Need enough traffic
  if (content.conversionRate > thresholds.lowConversionMax) return null;

  const impactScore = Math.min(100, (thresholds.lowConversionMax - content.conversionRate) * 5000 + content.visits * 0.1);

  return {
    id: generateBottleneckId('low_conversion', content.contentId),
    type: 'low_conversion',
    severity: determineSeverity(impactScore),
    confidence: 0.7,
    detectedAt: new Date(),
    affectedContent: [{
      contentId: content.contentId,
      slug: content.slug,
      title: content.title,
      impactScore,
    }],
    affectedSegments: [],
    metrics: {
      current: { conversionRate: content.conversionRate, visits: content.visits },
      benchmark: { conversionRate: benchmarks.avgConversionRate },
      gap: { conversionRate: content.conversionRate - benchmarks.avgConversionRate },
    },
    description: `Conversion rate is ${(content.conversionRate * 100).toFixed(2)}% with ${content.visits} visits`,
    suggestedActions: [
      'Improve CTA visibility and copy',
      'Add trust signals and social proof',
      'Simplify conversion path',
      'Test different offers or incentives',
    ],
  };
};

/**
 * Rule: Content freshness decay
 */
const detectContentFreshnessDecay: DetectionRule = (ctx) => {
  const { content, thresholds } = ctx;

  if (!content.lastUpdated) return null;

  const daysSinceUpdate = Math.floor(
    (Date.now() - content.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceUpdate < thresholds.freshnessDecayDays) return null;

  const impactScore = Math.min(100, (daysSinceUpdate - thresholds.freshnessDecayDays) * 0.5 + content.visits * 0.05);

  return {
    id: generateBottleneckId('content_freshness_decay', content.contentId),
    type: 'content_freshness_decay',
    severity: determineSeverity(impactScore),
    confidence: 0.6,
    detectedAt: new Date(),
    affectedContent: [{
      contentId: content.contentId,
      slug: content.slug,
      title: content.title,
      impactScore,
    }],
    affectedSegments: [],
    metrics: {
      current: { daysSinceUpdate, visits: content.visits },
      benchmark: { maxDaysSinceUpdate: thresholds.freshnessDecayDays },
      gap: { daysSinceUpdate: daysSinceUpdate - thresholds.freshnessDecayDays },
    },
    description: `Content hasn't been updated in ${daysSinceUpdate} days`,
    suggestedActions: [
      'Review and update content for accuracy',
      'Add recent information or examples',
      'Update publication date if significantly revised',
      'Consider content consolidation if traffic is declining',
    ],
  };
};

// All detection rules
const DETECTION_RULES: DetectionRule[] = [
  detectHighImpressionsLowEngagement,
  detectHighImpressionsLowCtr,
  detectHighCtrLowDwell,
  detectHighBounceRate,
  detectAiTrafficNonAeo,
  detectLowConversion,
  detectContentFreshnessDecay,
];

// ============================================================================
// BOTTLENECK DETECTOR CLASS
// ============================================================================

export class BottleneckDetector {
  private thresholds: BottleneckThresholds;
  private detectedBottlenecks: Map<string, Bottleneck>;
  private contentMetrics: Map<string, ContentMetrics>;

  constructor(thresholds?: Partial<BottleneckThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.detectedBottlenecks = new Map();
    this.contentMetrics = new Map();
  }

  /**
   * Add content metrics for analysis
   */
  addContentMetrics(metrics: ContentMetrics): void {
    this.contentMetrics.set(metrics.contentId, metrics);
  }

  /**
   * Calculate benchmark metrics from all content
   */
  private calculateBenchmarks(): {
    avgBounceRate: number;
    avgTimeOnPage: number;
    avgConversionRate: number;
    avgCtr: number;
  } {
    const contents = Array.from(this.contentMetrics.values());
    if (contents.length === 0) {
      return { avgBounceRate: 0.5, avgTimeOnPage: 120, avgConversionRate: 0.02, avgCtr: 0.03 };
    }

    const totalVisits = contents.reduce((sum, c) => sum + c.visits, 0);

    return {
      avgBounceRate: contents.reduce((sum, c) => sum + c.bounceRate * c.visits, 0) / totalVisits,
      avgTimeOnPage: contents.reduce((sum, c) => sum + c.avgTimeOnPage * c.visits, 0) / totalVisits,
      avgConversionRate: contents.reduce((sum, c) => sum + c.conversionRate * c.visits, 0) / totalVisits,
      avgCtr: contents.reduce((sum, c) => sum + c.ctr * c.visits, 0) / totalVisits,
    };
  }

  /**
   * Run detection on all content
   */
  detect(): Bottleneck[] {
    const benchmarks = this.calculateBenchmarks();
    const newBottlenecks: Bottleneck[] = [];

    for (const content of this.contentMetrics.values()) {
      const ctx: DetectionContext = {
        content,
        thresholds: this.thresholds,
        benchmarks,
      };

      for (const rule of DETECTION_RULES) {
        const bottleneck = rule(ctx);
        if (bottleneck) {
          this.detectedBottlenecks.set(bottleneck.id, bottleneck);
          newBottlenecks.push(bottleneck);
        }
      }
    }

    return newBottlenecks;
  }

  /**
   * Detect bottlenecks for specific content
   */
  detectForContent(contentId: string): Bottleneck[] {
    const content = this.contentMetrics.get(contentId);
    if (!content) return [];

    const benchmarks = this.calculateBenchmarks();
    const ctx: DetectionContext = {
      content,
      thresholds: this.thresholds,
      benchmarks,
    };

    const bottlenecks: Bottleneck[] = [];
    for (const rule of DETECTION_RULES) {
      const bottleneck = rule(ctx);
      if (bottleneck) {
        this.detectedBottlenecks.set(bottleneck.id, bottleneck);
        bottlenecks.push(bottleneck);
      }
    }

    return bottlenecks;
  }

  /**
   * Generate bottleneck report
   */
  generateReport(): BottleneckReport {
    const bottlenecks = Array.from(this.detectedBottlenecks.values());

    // Sort by severity and impact
    const severityOrder: Record<BottleneckSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    bottlenecks.sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return b.affectedContent[0]?.impactScore - a.affectedContent[0]?.impactScore;
    });

    return {
      generatedAt: new Date(),
      period: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
      totalBottlenecks: bottlenecks.length,
      criticalCount: bottlenecks.filter((b) => b.severity === 'critical').length,
      highCount: bottlenecks.filter((b) => b.severity === 'high').length,
      mediumCount: bottlenecks.filter((b) => b.severity === 'medium').length,
      lowCount: bottlenecks.filter((b) => b.severity === 'low').length,
      bottlenecks,
      topPriority: bottlenecks.slice(0, 10),
    };
  }

  /**
   * Get bottleneck by ID
   */
  getBottleneck(id: string): Bottleneck | undefined {
    return this.detectedBottlenecks.get(id);
  }

  /**
   * Get bottlenecks for content
   */
  getBottlenecksForContent(contentId: string): Bottleneck[] {
    return Array.from(this.detectedBottlenecks.values()).filter((b) =>
      b.affectedContent.some((c) => c.contentId === contentId)
    );
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.detectedBottlenecks.clear();
    this.contentMetrics.clear();
  }
}

// Singleton instance
let detectorInstance: BottleneckDetector | null = null;

export function getBottleneckDetector(): BottleneckDetector {
  if (!detectorInstance) {
    detectorInstance = new BottleneckDetector();
  }
  return detectorInstance;
}

export function resetBottleneckDetector(): void {
  if (detectorInstance) {
    detectorInstance.clear();
  }
  detectorInstance = null;
}
