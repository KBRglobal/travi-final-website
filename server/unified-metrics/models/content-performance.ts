/**
 * Unified Content Performance Model
 *
 * Combines all signals into a single performance score.
 * Provides actionable insights based on signal analysis.
 *
 * Score Components:
 * - Engagement Score (25%): Views, dwell time, scroll depth, bounce rate
 * - SEO Score (25%): Rankings, impressions, CTR, indexed status
 * - AEO Score (15%): AI citations, crawler visits, answer optimization
 * - Quality Score (20%): Content quality, freshness, completeness
 * - Revenue Score (15%): Conversions, affiliate clicks, revenue
 */

import { log } from '../../lib/logger';
import type { MetricEntityType } from '../registry/types';
import { getMetricsRegistry, recordMetric } from '../registry';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ContentPerformance] ${msg}`, data),
  debug: (msg: string, data?: Record<string, unknown>) =>
    log.debug(`[ContentPerformance] ${msg}`, data),
};

// =====================================================
// TYPES
// =====================================================

export interface ContentSignals {
  // Engagement signals
  pageViews: number;
  uniqueVisitors: number;
  avgDwellTime: number;          // seconds
  bounceRate: number;            // 0-100
  scrollDepth: number;           // 0-100
  pagesPerSession: number;

  // SEO signals
  searchImpressions: number;
  searchClicks: number;
  searchCtr: number;             // 0-100
  avgPosition: number;
  isIndexed: boolean;
  seoScore: number;              // 0-100

  // AEO signals
  aiImpressions: number;
  aiCitations: number;
  aiClickThroughs: number;
  aeoScore: number;              // 0-100
  crawlerVisits: number;

  // Quality signals
  wordCount: number;
  readingLevel: number;          // grade level
  contentFreshness: number;      // days since update
  qualityScore: number;          // 0-100
  hasImages: boolean;
  hasFAQ: boolean;
  hasSchema: boolean;

  // Revenue signals
  affiliateClicks: number;
  conversions: number;
  revenueGenerated: number;      // cents
}

export interface PerformanceScore {
  overall: number;               // 0-100
  engagement: number;            // 0-100
  seo: number;                   // 0-100
  aeo: number;                   // 0-100
  quality: number;               // 0-100
  revenue: number;               // 0-100
}

export interface ContentPerformanceResult {
  contentId: string;
  signals: ContentSignals;
  scores: PerformanceScore;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend: 'improving' | 'stable' | 'declining';
  issues: PerformanceIssue[];
  opportunities: PerformanceOpportunity[];
  lastCalculated: Date;
}

export interface PerformanceIssue {
  id: string;
  category: 'engagement' | 'seo' | 'aeo' | 'quality' | 'revenue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  targetValue: number;
  impact: number;                // Estimated score impact if fixed
}

export interface PerformanceOpportunity {
  id: string;
  category: 'engagement' | 'seo' | 'aeo' | 'quality' | 'revenue';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  estimatedImpact: string;
  suggestedActions: string[];
  potentialGain: number;         // Estimated score increase
}

// =====================================================
// WEIGHTS & THRESHOLDS
// =====================================================

const SCORE_WEIGHTS = {
  engagement: 0.25,
  seo: 0.25,
  aeo: 0.15,
  quality: 0.20,
  revenue: 0.15,
} as const;

const ENGAGEMENT_WEIGHTS = {
  pageViews: 0.15,
  uniqueVisitors: 0.15,
  dwellTime: 0.25,
  bounceRate: 0.25,
  scrollDepth: 0.10,
  pagesPerSession: 0.10,
} as const;

const SEO_WEIGHTS = {
  impressions: 0.20,
  clicks: 0.20,
  ctr: 0.25,
  position: 0.25,
  indexed: 0.10,
} as const;

const AEO_WEIGHTS = {
  impressions: 0.20,
  citations: 0.30,
  clickThroughs: 0.25,
  score: 0.15,
  crawlerVisits: 0.10,
} as const;

const QUALITY_WEIGHTS = {
  wordCount: 0.15,
  freshness: 0.25,
  qualityScore: 0.30,
  richContent: 0.30,
} as const;

const REVENUE_WEIGHTS = {
  affiliateClicks: 0.30,
  conversions: 0.40,
  revenue: 0.30,
} as const;

// Benchmarks for normalization
const BENCHMARKS = {
  pageViews: { good: 1000, excellent: 5000 },
  uniqueVisitors: { good: 500, excellent: 2500 },
  dwellTime: { good: 60, excellent: 180 },        // seconds
  bounceRate: { good: 50, excellent: 30 },        // lower is better
  scrollDepth: { good: 50, excellent: 75 },
  pagesPerSession: { good: 2, excellent: 4 },
  searchImpressions: { good: 500, excellent: 5000 },
  searchClicks: { good: 50, excellent: 500 },
  searchCtr: { good: 3, excellent: 10 },
  avgPosition: { good: 20, excellent: 5 },        // lower is better
  aiImpressions: { good: 100, excellent: 1000 },
  aiCitations: { good: 10, excellent: 100 },
  aiClickThroughs: { good: 5, excellent: 50 },
  crawlerVisits: { good: 10, excellent: 100 },
  wordCount: { good: 1500, excellent: 3000 },
  freshnessDays: { good: 90, excellent: 30 },     // lower is better
  affiliateClicks: { good: 10, excellent: 100 },
  conversions: { good: 5, excellent: 50 },
  revenue: { good: 5000, excellent: 50000 },      // cents
} as const;

// =====================================================
// PERFORMANCE MODEL
// =====================================================

export class ContentPerformanceModel {
  private static instance: ContentPerformanceModel | null = null;

  private constructor() {
    logger.info('Content Performance Model initialized');
  }

  static getInstance(): ContentPerformanceModel {
    if (!ContentPerformanceModel.instance) {
      ContentPerformanceModel.instance = new ContentPerformanceModel();
    }
    return ContentPerformanceModel.instance;
  }

  // =====================================================
  // SCORE CALCULATION
  // =====================================================

  /**
   * Calculate complete performance result for content
   */
  calculatePerformance(
    contentId: string,
    signals: ContentSignals,
    previousScore?: number
  ): ContentPerformanceResult {
    const scores = this.calculateScores(signals);
    const grade = this.calculateGrade(scores.overall);
    const trend = this.calculateTrend(scores.overall, previousScore);
    const issues = this.detectIssues(signals, scores);
    const opportunities = this.findOpportunities(signals, scores);

    const result: ContentPerformanceResult = {
      contentId,
      signals,
      scores,
      grade,
      trend,
      issues,
      opportunities,
      lastCalculated: new Date(),
    };

    // Record to metrics registry
    recordMetric('content.performance_score', scores.overall, 'content', contentId);

    logger.debug('Performance calculated', {
      contentId,
      overall: scores.overall,
      grade,
      issueCount: issues.length,
      opportunityCount: opportunities.length,
    });

    return result;
  }

  /**
   * Calculate all component scores
   */
  calculateScores(signals: ContentSignals): PerformanceScore {
    const engagement = this.calculateEngagementScore(signals);
    const seo = this.calculateSEOScore(signals);
    const aeo = this.calculateAEOScore(signals);
    const quality = this.calculateQualityScore(signals);
    const revenue = this.calculateRevenueScore(signals);

    const overall = Math.round(
      engagement * SCORE_WEIGHTS.engagement +
      seo * SCORE_WEIGHTS.seo +
      aeo * SCORE_WEIGHTS.aeo +
      quality * SCORE_WEIGHTS.quality +
      revenue * SCORE_WEIGHTS.revenue
    );

    return {
      overall: Math.min(100, Math.max(0, overall)),
      engagement,
      seo,
      aeo,
      quality,
      revenue,
    };
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(signals: ContentSignals): number {
    const pageViewsScore = this.normalizeValue(
      signals.pageViews,
      BENCHMARKS.pageViews.good,
      BENCHMARKS.pageViews.excellent
    );

    const visitorsScore = this.normalizeValue(
      signals.uniqueVisitors,
      BENCHMARKS.uniqueVisitors.good,
      BENCHMARKS.uniqueVisitors.excellent
    );

    const dwellScore = this.normalizeValue(
      signals.avgDwellTime,
      BENCHMARKS.dwellTime.good,
      BENCHMARKS.dwellTime.excellent
    );

    // Bounce rate: lower is better
    const bounceScore = this.normalizeValueInverse(
      signals.bounceRate,
      BENCHMARKS.bounceRate.good,
      BENCHMARKS.bounceRate.excellent
    );

    const scrollScore = this.normalizeValue(
      signals.scrollDepth,
      BENCHMARKS.scrollDepth.good,
      BENCHMARKS.scrollDepth.excellent
    );

    const pagesScore = this.normalizeValue(
      signals.pagesPerSession,
      BENCHMARKS.pagesPerSession.good,
      BENCHMARKS.pagesPerSession.excellent
    );

    return Math.round(
      pageViewsScore * ENGAGEMENT_WEIGHTS.pageViews +
      visitorsScore * ENGAGEMENT_WEIGHTS.uniqueVisitors +
      dwellScore * ENGAGEMENT_WEIGHTS.dwellTime +
      bounceScore * ENGAGEMENT_WEIGHTS.bounceRate +
      scrollScore * ENGAGEMENT_WEIGHTS.scrollDepth +
      pagesScore * ENGAGEMENT_WEIGHTS.pagesPerSession
    );
  }

  /**
   * Calculate SEO score (0-100)
   */
  private calculateSEOScore(signals: ContentSignals): number {
    const impressionsScore = this.normalizeValue(
      signals.searchImpressions,
      BENCHMARKS.searchImpressions.good,
      BENCHMARKS.searchImpressions.excellent
    );

    const clicksScore = this.normalizeValue(
      signals.searchClicks,
      BENCHMARKS.searchClicks.good,
      BENCHMARKS.searchClicks.excellent
    );

    const ctrScore = this.normalizeValue(
      signals.searchCtr,
      BENCHMARKS.searchCtr.good,
      BENCHMARKS.searchCtr.excellent
    );

    // Position: lower is better
    const positionScore = this.normalizeValueInverse(
      signals.avgPosition,
      BENCHMARKS.avgPosition.good,
      BENCHMARKS.avgPosition.excellent
    );

    const indexedScore = signals.isIndexed ? 100 : 0;

    return Math.round(
      impressionsScore * SEO_WEIGHTS.impressions +
      clicksScore * SEO_WEIGHTS.clicks +
      ctrScore * SEO_WEIGHTS.ctr +
      positionScore * SEO_WEIGHTS.position +
      indexedScore * SEO_WEIGHTS.indexed
    );
  }

  /**
   * Calculate AEO score (0-100)
   */
  private calculateAEOScore(signals: ContentSignals): number {
    const impressionsScore = this.normalizeValue(
      signals.aiImpressions,
      BENCHMARKS.aiImpressions.good,
      BENCHMARKS.aiImpressions.excellent
    );

    const citationsScore = this.normalizeValue(
      signals.aiCitations,
      BENCHMARKS.aiCitations.good,
      BENCHMARKS.aiCitations.excellent
    );

    const clicksScore = this.normalizeValue(
      signals.aiClickThroughs,
      BENCHMARKS.aiClickThroughs.good,
      BENCHMARKS.aiClickThroughs.excellent
    );

    const crawlerScore = this.normalizeValue(
      signals.crawlerVisits,
      BENCHMARKS.crawlerVisits.good,
      BENCHMARKS.crawlerVisits.excellent
    );

    // Use existing AEO score as a component
    const existingScore = signals.aeoScore;

    return Math.round(
      impressionsScore * AEO_WEIGHTS.impressions +
      citationsScore * AEO_WEIGHTS.citations +
      clicksScore * AEO_WEIGHTS.clickThroughs +
      existingScore * AEO_WEIGHTS.score +
      crawlerScore * AEO_WEIGHTS.crawlerVisits
    );
  }

  /**
   * Calculate quality score (0-100)
   */
  private calculateQualityScore(signals: ContentSignals): number {
    const wordCountScore = this.normalizeValue(
      signals.wordCount,
      BENCHMARKS.wordCount.good,
      BENCHMARKS.wordCount.excellent
    );

    // Freshness: lower days is better
    const freshnessScore = this.normalizeValueInverse(
      signals.contentFreshness,
      BENCHMARKS.freshnessDays.good,
      BENCHMARKS.freshnessDays.excellent
    );

    // Use existing quality score
    const existingQuality = signals.qualityScore;

    // Rich content score
    let richContentScore = 0;
    if (signals.hasImages) richContentScore += 33;
    if (signals.hasFAQ) richContentScore += 34;
    if (signals.hasSchema) richContentScore += 33;

    return Math.round(
      wordCountScore * QUALITY_WEIGHTS.wordCount +
      freshnessScore * QUALITY_WEIGHTS.freshness +
      existingQuality * QUALITY_WEIGHTS.qualityScore +
      richContentScore * QUALITY_WEIGHTS.richContent
    );
  }

  /**
   * Calculate revenue score (0-100)
   */
  private calculateRevenueScore(signals: ContentSignals): number {
    const affiliateScore = this.normalizeValue(
      signals.affiliateClicks,
      BENCHMARKS.affiliateClicks.good,
      BENCHMARKS.affiliateClicks.excellent
    );

    const conversionsScore = this.normalizeValue(
      signals.conversions,
      BENCHMARKS.conversions.good,
      BENCHMARKS.conversions.excellent
    );

    const revenueScore = this.normalizeValue(
      signals.revenueGenerated,
      BENCHMARKS.revenue.good,
      BENCHMARKS.revenue.excellent
    );

    return Math.round(
      affiliateScore * REVENUE_WEIGHTS.affiliateClicks +
      conversionsScore * REVENUE_WEIGHTS.conversions +
      revenueScore * REVENUE_WEIGHTS.revenue
    );
  }

  // =====================================================
  // ISSUE DETECTION
  // =====================================================

  /**
   * Detect performance issues
   */
  private detectIssues(
    signals: ContentSignals,
    scores: PerformanceScore
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Engagement issues
    if (signals.bounceRate > 70) {
      issues.push({
        id: `bounce-${Date.now()}`,
        category: 'engagement',
        severity: signals.bounceRate > 85 ? 'critical' : 'high',
        title: 'High Bounce Rate',
        description: `Bounce rate of ${signals.bounceRate.toFixed(1)}% indicates visitors are leaving quickly`,
        metric: 'engagement.bounce_rate',
        currentValue: signals.bounceRate,
        targetValue: 50,
        impact: 10,
      });
    }

    if (signals.avgDwellTime < 30) {
      issues.push({
        id: `dwell-${Date.now()}`,
        category: 'engagement',
        severity: signals.avgDwellTime < 15 ? 'high' : 'medium',
        title: 'Low Dwell Time',
        description: `Average dwell time of ${signals.avgDwellTime}s is below target`,
        metric: 'engagement.dwell_time',
        currentValue: signals.avgDwellTime,
        targetValue: 60,
        impact: 8,
      });
    }

    // SEO issues
    if (signals.searchCtr < 2) {
      issues.push({
        id: `ctr-${Date.now()}`,
        category: 'seo',
        severity: signals.searchCtr < 1 ? 'critical' : 'high',
        title: 'Low Search CTR',
        description: `CTR of ${signals.searchCtr.toFixed(2)}% suggests title/meta need improvement`,
        metric: 'seo.ctr',
        currentValue: signals.searchCtr,
        targetValue: 3,
        impact: 12,
      });
    }

    if (signals.avgPosition > 20) {
      issues.push({
        id: `position-${Date.now()}`,
        category: 'seo',
        severity: signals.avgPosition > 50 ? 'critical' : 'high',
        title: 'Poor Search Position',
        description: `Average position of ${signals.avgPosition.toFixed(1)} limits visibility`,
        metric: 'seo.average_position',
        currentValue: signals.avgPosition,
        targetValue: 10,
        impact: 15,
      });
    }

    if (!signals.isIndexed) {
      issues.push({
        id: `indexed-${Date.now()}`,
        category: 'seo',
        severity: 'critical',
        title: 'Not Indexed',
        description: 'Content is not indexed by search engines',
        metric: 'seo.indexed_pages',
        currentValue: 0,
        targetValue: 1,
        impact: 25,
      });
    }

    // AEO issues
    if (signals.aeoScore < 50) {
      issues.push({
        id: `aeo-${Date.now()}`,
        category: 'aeo',
        severity: signals.aeoScore < 30 ? 'high' : 'medium',
        title: 'Low AEO Score',
        description: `AEO score of ${signals.aeoScore} limits AI visibility`,
        metric: 'aeo.aeo_score',
        currentValue: signals.aeoScore,
        targetValue: 70,
        impact: 10,
      });
    }

    // Quality issues
    if (signals.contentFreshness > 180) {
      issues.push({
        id: `freshness-${Date.now()}`,
        category: 'quality',
        severity: signals.contentFreshness > 365 ? 'high' : 'medium',
        title: 'Outdated Content',
        description: `Content hasn't been updated in ${signals.contentFreshness} days`,
        metric: 'content.freshness_score',
        currentValue: signals.contentFreshness,
        targetValue: 90,
        impact: 8,
      });
    }

    if (signals.wordCount < 1000) {
      issues.push({
        id: `wordcount-${Date.now()}`,
        category: 'quality',
        severity: 'medium',
        title: 'Thin Content',
        description: `Word count of ${signals.wordCount} is below recommended minimum`,
        metric: 'content.avg_word_count',
        currentValue: signals.wordCount,
        targetValue: 1500,
        impact: 5,
      });
    }

    // Sort by impact
    return issues.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Find growth opportunities
   */
  private findOpportunities(
    signals: ContentSignals,
    scores: PerformanceScore
  ): PerformanceOpportunity[] {
    const opportunities: PerformanceOpportunity[] = [];

    // Engagement opportunities
    if (signals.scrollDepth < 50 && signals.pageViews > 100) {
      opportunities.push({
        id: `scroll-${Date.now()}`,
        category: 'engagement',
        priority: 'high',
        title: 'Improve Content Engagement',
        description: 'Visitors are not scrolling through content',
        estimatedImpact: '+15% engagement score',
        suggestedActions: [
          'Add compelling visuals at scroll points',
          'Use pull quotes to break up text',
          'Add interactive elements (FAQs, tabs)',
          'Improve content structure with clear headings',
        ],
        potentialGain: 15,
      });
    }

    // SEO opportunities
    if (signals.searchImpressions > 500 && signals.searchCtr < 3) {
      opportunities.push({
        id: `meta-${Date.now()}`,
        category: 'seo',
        priority: 'high',
        title: 'Optimize Title & Meta Description',
        description: 'High impressions but low CTR suggests metadata needs work',
        estimatedImpact: `+${Math.round(signals.searchImpressions * 0.02)} clicks/month`,
        suggestedActions: [
          'Add power words to title',
          'Include numbers or statistics',
          'Create urgency in meta description',
          'Add FAQ schema for rich snippets',
        ],
        potentialGain: 12,
      });
    }

    // AEO opportunities
    if (!signals.hasFAQ && signals.pageViews > 500) {
      opportunities.push({
        id: `faq-${Date.now()}`,
        category: 'aeo',
        priority: 'high',
        title: 'Add FAQ Section',
        description: 'FAQ content increases AI citation probability',
        estimatedImpact: '+20% AEO score',
        suggestedActions: [
          'Research common questions for this topic',
          'Add structured FAQ section',
          'Use FAQ schema markup',
          'Include conversational language',
        ],
        potentialGain: 10,
      });
    }

    if (signals.aiCitations === 0 && signals.aeoScore < 60) {
      opportunities.push({
        id: `capsule-${Date.now()}`,
        category: 'aeo',
        priority: 'medium',
        title: 'Create Answer Capsule',
        description: 'Add optimized summary for AI extraction',
        estimatedImpact: 'Enable AI platform citations',
        suggestedActions: [
          'Write 40-60 word answer capsule',
          'Include key facts in bullet points',
          'Add quick answer at top of page',
          'Use question-based headings',
        ],
        potentialGain: 15,
      });
    }

    // Revenue opportunities
    if (signals.pageViews > 1000 && signals.affiliateClicks < 10) {
      opportunities.push({
        id: `affiliate-${Date.now()}`,
        category: 'revenue',
        priority: 'medium',
        title: 'Improve Affiliate Link Visibility',
        description: 'High traffic but low affiliate engagement',
        estimatedImpact: '+50% affiliate clicks',
        suggestedActions: [
          'Add contextual affiliate links',
          'Create comparison tables',
          'Add CTA buttons at key positions',
          'Highlight deals and discounts',
        ],
        potentialGain: 8,
      });
    }

    // Quality opportunities
    if (!signals.hasSchema) {
      opportunities.push({
        id: `schema-${Date.now()}`,
        category: 'quality',
        priority: 'medium',
        title: 'Add Schema Markup',
        description: 'Schema improves search visibility and AI understanding',
        estimatedImpact: '+10% rich result chance',
        suggestedActions: [
          'Add Article schema',
          'Include BreadcrumbList schema',
          'Add relevant product/place schema',
          'Validate with Schema.org validator',
        ],
        potentialGain: 5,
      });
    }

    // Sort by potential gain
    return opportunities.sort((a, b) => b.potentialGain - a.potentialGain);
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /**
   * Normalize value to 0-100 scale
   */
  private normalizeValue(value: number, good: number, excellent: number): number {
    if (value <= 0) return 0;
    if (value >= excellent) return 100;
    if (value >= good) {
      // Scale from 70-100 for good to excellent
      return 70 + (30 * (value - good) / (excellent - good));
    }
    // Scale from 0-70 for below good
    return (70 * value / good);
  }

  /**
   * Normalize value where lower is better
   */
  private normalizeValueInverse(value: number, good: number, excellent: number): number {
    if (value <= excellent) return 100;
    if (value >= good) return 50;
    // Linear scale between excellent and good
    return 100 - (50 * (value - excellent) / (good - excellent));
  }

  /**
   * Calculate letter grade from score
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Calculate trend from current and previous score
   */
  private calculateTrend(
    current: number,
    previous?: number
  ): 'improving' | 'stable' | 'declining' {
    if (previous === undefined) return 'stable';
    const change = current - previous;
    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  }
}

// =====================================================
// CONVENIENCE EXPORTS
// =====================================================

/**
 * Get singleton instance
 */
export function getContentPerformanceModel(): ContentPerformanceModel {
  return ContentPerformanceModel.getInstance();
}

/**
 * Calculate performance for content
 */
export function calculateContentPerformance(
  contentId: string,
  signals: ContentSignals,
  previousScore?: number
): ContentPerformanceResult {
  return getContentPerformanceModel().calculatePerformance(
    contentId,
    signals,
    previousScore
  );
}

/**
 * Create default/empty signals object
 */
export function createEmptySignals(): ContentSignals {
  return {
    pageViews: 0,
    uniqueVisitors: 0,
    avgDwellTime: 0,
    bounceRate: 100,
    scrollDepth: 0,
    pagesPerSession: 1,
    searchImpressions: 0,
    searchClicks: 0,
    searchCtr: 0,
    avgPosition: 100,
    isIndexed: false,
    seoScore: 0,
    aiImpressions: 0,
    aiCitations: 0,
    aiClickThroughs: 0,
    aeoScore: 0,
    crawlerVisits: 0,
    wordCount: 0,
    readingLevel: 8,
    contentFreshness: 0,
    qualityScore: 0,
    hasImages: false,
    hasFAQ: false,
    hasSchema: false,
    affiliateClicks: 0,
    conversions: 0,
    revenueGenerated: 0,
  };
}
