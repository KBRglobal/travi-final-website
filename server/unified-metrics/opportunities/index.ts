/**
 * Growth Opportunities Engine
 *
 * AI-powered opportunity detection and recommendation system.
 * Analyzes all signals to identify growth opportunities and prioritize actions.
 *
 * Opportunity Categories:
 * - Quick Wins: High impact, low effort improvements
 * - Strategic: Medium effort, high long-term value
 * - Technical: System/infrastructure improvements
 * - Content: Content creation/optimization opportunities
 */

import { log } from '../../lib/logger';
import { getMetricsRegistry } from '../registry';
import type { ActionRecommendation, ActionType, MetricSignal } from '../registry/types';
import type { ContentPerformanceResult } from '../models/content-performance';
import type { FunnelAnalysis } from '../funnel';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[OpportunitiesEngine] ${msg}`, data),
  debug: (msg: string, data?: Record<string, unknown>) =>
    log.debug(`[OpportunitiesEngine] ${msg}`, data),
};

// =====================================================
// TYPES
// =====================================================

export type OpportunityCategory =
  | 'quick_win'
  | 'strategic'
  | 'technical'
  | 'content'
  | 'seo'
  | 'aeo'
  | 'revenue';

export type OpportunityStatus =
  | 'new'
  | 'acknowledged'
  | 'in_progress'
  | 'completed'
  | 'dismissed';

export interface GrowthOpportunity {
  id: string;
  category: OpportunityCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: OpportunityStatus;

  // Description
  title: string;
  description: string;
  rationale: string;

  // Impact estimation
  estimatedImpact: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    confidence: number;           // 0-100
  };

  // Effort estimation
  effort: 'quick' | 'moderate' | 'significant';
  estimatedHours?: number;

  // Actions
  suggestedActions: string[];
  automatable: boolean;
  automationId?: string;

  // Context
  affectedEntities: Array<{
    type: 'content' | 'destination' | 'system';
    id?: string;
    name?: string;
  }>;
  relatedMetrics: string[];
  signals: MetricSignal[];

  // Timing
  createdAt: Date;
  expiresAt?: Date;
  completedAt?: Date;

  // Tracking
  score: number;                  // Priority score (0-100)
}

export interface OpportunityScore {
  impact: number;                 // 0-100: How much will this help?
  confidence: number;             // 0-100: How sure are we?
  effort: number;                 // 0-100: How hard is this? (lower = easier)
  urgency: number;                // 0-100: How time-sensitive?
  total: number;                  // Weighted combination
}

export interface OpportunitySummary {
  totalOpportunities: number;
  byCategory: Record<OpportunityCategory, number>;
  byPriority: Record<'low' | 'medium' | 'high' | 'critical', number>;
  topOpportunities: GrowthOpportunity[];
  estimatedTotalImpact: {
    trafficIncrease: number;      // Percentage
    conversionIncrease: number;   // Percentage
    revenueIncrease: number;      // Cents
  };
  generatedAt: Date;
}

// =====================================================
// OPPORTUNITY TEMPLATES
// =====================================================

interface OpportunityTemplate {
  id: string;
  category: OpportunityCategory;
  title: string;
  descriptionTemplate: string;
  rationaleTemplate: string;
  suggestedActions: string[];
  effort: 'quick' | 'moderate' | 'significant';
  automatable: boolean;
  relatedMetrics: string[];
}

const OPPORTUNITY_TEMPLATES: OpportunityTemplate[] = [
  // Quick Wins
  {
    id: 'meta-optimization',
    category: 'quick_win',
    title: 'Optimize Title & Meta Description',
    descriptionTemplate: 'Content has {impressions} impressions but only {ctr}% CTR. Improving meta can increase clicks.',
    rationaleTemplate: 'High impressions with low CTR indicates searchers see the result but don\'t click. Title/meta improvements typically yield 20-50% CTR increase.',
    suggestedActions: [
      'Add power words to title (Best, Ultimate, Complete)',
      'Include numbers or statistics in title',
      'Add urgency or curiosity to meta description',
      'Keep title under 60 characters',
      'Keep meta description between 150-160 characters',
    ],
    effort: 'quick',
    automatable: true,
    relatedMetrics: ['seo.ctr', 'seo.impressions', 'seo.clicks'],
  },
  {
    id: 'add-faq',
    category: 'quick_win',
    title: 'Add FAQ Section',
    descriptionTemplate: 'Content lacks FAQ section. Adding FAQs improves both SEO and AEO performance.',
    rationaleTemplate: 'FAQ content increases rich snippet eligibility and AI citation probability by 40%. Quick to implement with high impact.',
    suggestedActions: [
      'Research top 5-7 questions for this topic',
      'Write concise, direct answers',
      'Add FAQ schema markup',
      'Use question-based headings',
    ],
    effort: 'quick',
    automatable: true,
    relatedMetrics: ['aeo.aeo_score', 'seo.ctr', 'aeo.citations'],
  },
  {
    id: 'internal-links',
    category: 'quick_win',
    title: 'Add Internal Links',
    descriptionTemplate: 'Content has only {linkCount} internal links. Adding more improves engagement and SEO.',
    rationaleTemplate: 'Internal linking distributes page authority and increases pages per session. Target 3-5 contextual internal links per 1000 words.',
    suggestedActions: [
      'Identify related content pieces',
      'Add 3-5 contextual internal links',
      'Use descriptive anchor text',
      'Link to both older and newer content',
    ],
    effort: 'quick',
    automatable: false,
    relatedMetrics: ['engagement.pages_per_session', 'growth.internal_link_ctr'],
  },

  // SEO Opportunities
  {
    id: 'featured-snippet',
    category: 'seo',
    title: 'Target Featured Snippet',
    descriptionTemplate: 'Content ranks position {position} for queries with featured snippets. Optimization could capture position 0.',
    rationaleTemplate: 'Featured snippets receive 35% of clicks. Content already ranks well, formatting improvements can capture the snippet.',
    suggestedActions: [
      'Add a direct answer in first paragraph (40-60 words)',
      'Use numbered or bulleted lists',
      'Add a clear definition section',
      'Include comparison tables',
      'Use H2/H3 for question headings',
    ],
    effort: 'moderate',
    automatable: false,
    relatedMetrics: ['seo.ctr', 'seo.average_position', 'seo.clicks'],
  },
  {
    id: 'keyword-gap',
    category: 'seo',
    title: 'Fill Keyword Gap',
    descriptionTemplate: 'Similar content ranks for {keywords} keywords we don\'t target.',
    rationaleTemplate: 'Competitor analysis shows ranking opportunities for related keywords with reasonable difficulty.',
    suggestedActions: [
      'Create new content targeting gap keywords',
      'Expand existing content to cover topics',
      'Build internal links to new content',
      'Monitor rankings weekly',
    ],
    effort: 'significant',
    automatable: false,
    relatedMetrics: ['seo.keyword_rankings', 'seo.impressions'],
  },

  // AEO Opportunities
  {
    id: 'answer-capsule',
    category: 'aeo',
    title: 'Create Answer Capsule',
    descriptionTemplate: 'Content lacks answer capsule. AI platforms need concise summaries for citations.',
    rationaleTemplate: 'Answer capsules (40-60 word summaries) increase AI citation probability by 3x. Essential for AEO.',
    suggestedActions: [
      'Write 40-60 word summary of key information',
      'Include 3-5 key facts as bullet points',
      'Add quick answer at top of page',
      'Test with AI platforms to verify extraction',
    ],
    effort: 'quick',
    automatable: true,
    relatedMetrics: ['aeo.citations', 'aeo.aeo_score', 'aeo.ai_impressions'],
  },
  {
    id: 'conversational-content',
    category: 'aeo',
    title: 'Add Conversational Content',
    descriptionTemplate: 'Content uses formal language. AI platforms favor conversational, question-answer formats.',
    rationaleTemplate: 'Natural language content is 2x more likely to be cited by AI. Matches how users query AI.',
    suggestedActions: [
      'Rephrase headings as questions',
      'Use "you" and "your" language',
      'Add conversational FAQ section',
      'Include common question variations',
    ],
    effort: 'moderate',
    automatable: true,
    relatedMetrics: ['aeo.citations', 'aeo.aeo_score'],
  },

  // Revenue Opportunities
  {
    id: 'affiliate-placement',
    category: 'revenue',
    title: 'Optimize Affiliate Placement',
    descriptionTemplate: 'Content has {views} views but only {clicks} affiliate clicks. Better placement can increase revenue.',
    rationaleTemplate: 'High traffic content with low affiliate engagement indicates placement issues. Strategic positioning can 2-3x clicks.',
    suggestedActions: [
      'Add comparison table with affiliate links',
      'Place CTA after key information sections',
      'Add "Quick Pick" box near top',
      'Use contextual in-line affiliate links',
    ],
    effort: 'quick',
    automatable: false,
    relatedMetrics: ['conversion.affiliate_clicks', 'revenue.affiliate_revenue'],
  },
  {
    id: 'high-intent-content',
    category: 'revenue',
    title: 'Create High-Intent Content',
    descriptionTemplate: 'Topic cluster lacks bottom-of-funnel content. Adding purchase-intent pages improves conversion.',
    rationaleTemplate: 'Transactional content converts 5x better than informational. Complete the buyer journey.',
    suggestedActions: [
      'Create "Best X for Y" comparison pages',
      'Add "Where to Buy" guides',
      'Create deal/discount roundup pages',
      'Add booking/purchase CTAs to existing content',
    ],
    effort: 'significant',
    automatable: false,
    relatedMetrics: ['conversion.total_conversions', 'revenue.total_revenue'],
  },

  // Content Opportunities
  {
    id: 'content-refresh',
    category: 'content',
    title: 'Refresh Outdated Content',
    descriptionTemplate: 'Content hasn\'t been updated in {days} days. Freshness affects rankings.',
    rationaleTemplate: 'Content older than 6 months loses ranking momentum. Updates typically yield 20-30% traffic increase.',
    suggestedActions: [
      'Update statistics and facts',
      'Add recent developments',
      'Refresh images and media',
      'Update internal links',
      'Republish with new date',
    ],
    effort: 'moderate',
    automatable: false,
    relatedMetrics: ['content.freshness_score', 'seo.average_position'],
  },
  {
    id: 'content-expansion',
    category: 'content',
    title: 'Expand Thin Content',
    descriptionTemplate: 'Content has only {words} words. Comprehensive content ranks better.',
    rationaleTemplate: 'Average first-page result has 1,890 words. Expanding thin content improves topical authority.',
    suggestedActions: [
      'Research subtopics to cover',
      'Add expert insights and quotes',
      'Include case studies or examples',
      'Add detailed how-to sections',
    ],
    effort: 'significant',
    automatable: true,
    relatedMetrics: ['content.avg_word_count', 'seo.average_position'],
  },

  // Technical Opportunities
  {
    id: 'page-speed',
    category: 'technical',
    title: 'Improve Page Speed',
    descriptionTemplate: 'Page load time is {loadTime}ms. Slow pages lose visitors and rankings.',
    rationaleTemplate: 'Every 100ms delay reduces conversion by 1%. Core Web Vitals impact rankings.',
    suggestedActions: [
      'Optimize and compress images',
      'Enable lazy loading',
      'Minify CSS and JavaScript',
      'Implement caching',
      'Consider CDN for media',
    ],
    effort: 'moderate',
    automatable: false,
    relatedMetrics: ['health.api_response_time', 'engagement.bounce_rate'],
  },
  {
    id: 'schema-markup',
    category: 'technical',
    title: 'Add Schema Markup',
    descriptionTemplate: 'Content lacks structured data. Schema improves search appearance.',
    rationaleTemplate: 'Rich results get 58% more clicks than plain results. Schema helps AI understand content.',
    suggestedActions: [
      'Add Article schema',
      'Include BreadcrumbList schema',
      'Add relevant entity schema (Place, Product, etc.)',
      'Validate with Google Rich Results Test',
    ],
    effort: 'quick',
    automatable: true,
    relatedMetrics: ['seo.ctr', 'aeo.citations'],
  },
];

// =====================================================
// OPPORTUNITIES ENGINE
// =====================================================

export class OpportunitiesEngine {
  private static instance: OpportunitiesEngine | null = null;

  // Storage
  private opportunities: Map<string, GrowthOpportunity> = new Map();
  private templates: Map<string, OpportunityTemplate> = new Map();

  private constructor() {
    // Initialize templates
    OPPORTUNITY_TEMPLATES.forEach(t => this.templates.set(t.id, t));
    logger.info('Opportunities Engine initialized', {
      templateCount: this.templates.size,
    });
  }

  static getInstance(): OpportunitiesEngine {
    if (!OpportunitiesEngine.instance) {
      OpportunitiesEngine.instance = new OpportunitiesEngine();
    }
    return OpportunitiesEngine.instance;
  }

  static reset(): void {
    OpportunitiesEngine.instance = null;
  }

  // =====================================================
  // OPPORTUNITY DETECTION
  // =====================================================

  /**
   * Detect opportunities from content performance
   */
  detectFromContentPerformance(
    performance: ContentPerformanceResult
  ): GrowthOpportunity[] {
    const opportunities: GrowthOpportunity[] = [];
    const signals = performance.signals;

    // High impressions, low CTR → Meta optimization
    if (signals.searchImpressions > 500 && signals.searchCtr < 3) {
      opportunities.push(this.createOpportunityFromTemplate(
        'meta-optimization',
        {
          impressions: signals.searchImpressions.toString(),
          ctr: signals.searchCtr.toFixed(1),
        },
        [{ type: 'content', id: performance.contentId }],
        this.calculateScore(60, 80, 20, 50)
      ));
    }

    // No FAQ section
    if (!signals.hasFAQ && signals.pageViews > 100) {
      opportunities.push(this.createOpportunityFromTemplate(
        'add-faq',
        {},
        [{ type: 'content', id: performance.contentId }],
        this.calculateScore(50, 90, 20, 30)
      ));
    }

    // Low AEO score
    if (signals.aeoScore < 50) {
      opportunities.push(this.createOpportunityFromTemplate(
        'answer-capsule',
        {},
        [{ type: 'content', id: performance.contentId }],
        this.calculateScore(55, 85, 15, 40)
      ));
    }

    // Outdated content
    if (signals.contentFreshness > 180) {
      opportunities.push(this.createOpportunityFromTemplate(
        'content-refresh',
        { days: signals.contentFreshness.toString() },
        [{ type: 'content', id: performance.contentId }],
        this.calculateScore(45, 70, 40, signals.contentFreshness > 365 ? 70 : 40)
      ));
    }

    // Thin content
    if (signals.wordCount < 1000) {
      opportunities.push(this.createOpportunityFromTemplate(
        'content-expansion',
        { words: signals.wordCount.toString() },
        [{ type: 'content', id: performance.contentId }],
        this.calculateScore(40, 65, 60, 30)
      ));
    }

    // High traffic, low affiliate clicks
    if (signals.pageViews > 500 && signals.affiliateClicks < 5) {
      opportunities.push(this.createOpportunityFromTemplate(
        'affiliate-placement',
        {
          views: signals.pageViews.toString(),
          clicks: signals.affiliateClicks.toString(),
        },
        [{ type: 'content', id: performance.contentId }],
        this.calculateScore(55, 75, 25, 35)
      ));
    }

    // No schema markup
    if (!signals.hasSchema) {
      opportunities.push(this.createOpportunityFromTemplate(
        'schema-markup',
        {},
        [{ type: 'content', id: performance.contentId }],
        this.calculateScore(35, 85, 20, 20)
      ));
    }

    // Store and return
    opportunities.forEach(o => this.opportunities.set(o.id, o));
    return opportunities;
  }

  /**
   * Detect opportunities from funnel analysis
   */
  detectFromFunnel(analysis: FunnelAnalysis): GrowthOpportunity[] {
    const opportunities: GrowthOpportunity[] = [];

    // Bottleneck in funnel
    if (analysis.bottleneck && analysis.bottleneck.dropOffRate > 50) {
      const opp: GrowthOpportunity = {
        id: `funnel-bottleneck-${analysis.funnelId}-${Date.now()}`,
        category: 'strategic',
        priority: analysis.bottleneck.dropOffRate > 70 ? 'high' : 'medium',
        status: 'new',
        title: `Fix ${analysis.name} Bottleneck`,
        description: `${analysis.bottleneck.dropOffRate.toFixed(1)}% drop-off at "${analysis.bottleneck.stageName}" stage`,
        rationale: 'High drop-off indicates friction point. Addressing this can significantly improve overall conversion.',
        estimatedImpact: {
          metric: 'conversion.funnel_completion_rate',
          currentValue: analysis.overallConversionRate,
          projectedValue: analysis.overallConversionRate * 1.5,
          confidence: 70,
        },
        effort: 'moderate',
        suggestedActions: analysis.insights
          .filter(i => i.suggestedAction)
          .map(i => i.suggestedAction!),
        automatable: false,
        affectedEntities: [{ type: 'system' }],
        relatedMetrics: ['conversion.funnel_completion_rate', 'conversion.conversion_rate'],
        signals: [],
        createdAt: new Date(),
        score: this.calculateScore(65, 75, 45, 55).total,
      };
      opportunities.push(opp);
      this.opportunities.set(opp.id, opp);
    }

    return opportunities;
  }

  /**
   * Detect opportunities from signals
   */
  detectFromSignals(signals: MetricSignal[]): GrowthOpportunity[] {
    const opportunities: GrowthOpportunity[] = [];

    for (const signal of signals) {
      if (signal.signalType === 'anomaly' && signal.severity !== 'info') {
        const opp: GrowthOpportunity = {
          id: `signal-${signal.metricId}-${Date.now()}`,
          category: signal.severity === 'critical' ? 'strategic' : 'technical',
          priority: signal.severity === 'critical' ? 'critical' :
                   signal.severity === 'warning' ? 'high' : 'medium',
          status: 'new',
          title: signal.title,
          description: signal.description,
          rationale: signal.recommendation || 'Investigate this anomaly to prevent further issues.',
          estimatedImpact: {
            metric: signal.metricId,
            currentValue: signal.currentValue,
            projectedValue: signal.expectedValue || signal.currentValue,
            confidence: 60,
          },
          effort: 'moderate',
          suggestedActions: ['Investigate the root cause', 'Monitor for continued anomalies'],
          automatable: false,
          affectedEntities: signal.entityId
            ? [{ type: signal.entityType as any, id: signal.entityId }]
            : [{ type: 'system' }],
          relatedMetrics: [signal.metricId],
          signals: [signal],
          createdAt: new Date(),
          expiresAt: signal.expiresAt,
          score: this.calculateScore(50, 60, 50, 70).total,
        };
        opportunities.push(opp);
        this.opportunities.set(opp.id, opp);
      }
    }

    return opportunities;
  }

  // =====================================================
  // OPPORTUNITY MANAGEMENT
  // =====================================================

  /**
   * Get all opportunities
   */
  getAllOpportunities(): GrowthOpportunity[] {
    return Array.from(this.opportunities.values());
  }

  /**
   * Get opportunities by category
   */
  getByCategory(category: OpportunityCategory): GrowthOpportunity[] {
    return this.getAllOpportunities().filter(o => o.category === category);
  }

  /**
   * Get opportunities by status
   */
  getByStatus(status: OpportunityStatus): GrowthOpportunity[] {
    return this.getAllOpportunities().filter(o => o.status === status);
  }

  /**
   * Get top opportunities
   */
  getTopOpportunities(limit: number = 10): GrowthOpportunity[] {
    return this.getAllOpportunities()
      .filter(o => o.status === 'new' || o.status === 'acknowledged')
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Update opportunity status
   */
  updateStatus(opportunityId: string, status: OpportunityStatus): boolean {
    const opp = this.opportunities.get(opportunityId);
    if (!opp) return false;

    opp.status = status;
    if (status === 'completed') {
      opp.completedAt = new Date();
    }

    logger.info('Opportunity status updated', { opportunityId, status });
    return true;
  }

  /**
   * Get opportunity summary
   */
  getSummary(): OpportunitySummary {
    const all = this.getAllOpportunities();
    const active = all.filter(o => o.status !== 'completed' && o.status !== 'dismissed');

    const byCategory: Record<OpportunityCategory, number> = {
      quick_win: 0,
      strategic: 0,
      technical: 0,
      content: 0,
      seo: 0,
      aeo: 0,
      revenue: 0,
    };

    const byPriority: Record<'low' | 'medium' | 'high' | 'critical', number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let totalTrafficImpact = 0;
    let totalConversionImpact = 0;
    let totalRevenueImpact = 0;

    for (const opp of active) {
      byCategory[opp.category]++;
      byPriority[opp.priority]++;

      // Estimate impact based on metric type
      const impact = opp.estimatedImpact;
      if (impact.metric.includes('traffic') || impact.metric.includes('impressions')) {
        totalTrafficImpact += (impact.projectedValue - impact.currentValue) / impact.currentValue * 100 * (impact.confidence / 100);
      }
      if (impact.metric.includes('conversion')) {
        totalConversionImpact += (impact.projectedValue - impact.currentValue) / impact.currentValue * 100 * (impact.confidence / 100);
      }
      if (impact.metric.includes('revenue')) {
        totalRevenueImpact += (impact.projectedValue - impact.currentValue) * (impact.confidence / 100);
      }
    }

    return {
      totalOpportunities: active.length,
      byCategory,
      byPriority,
      topOpportunities: this.getTopOpportunities(5),
      estimatedTotalImpact: {
        trafficIncrease: Math.round(totalTrafficImpact),
        conversionIncrease: Math.round(totalConversionImpact),
        revenueIncrease: Math.round(totalRevenueImpact),
      },
      generatedAt: new Date(),
    };
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  /**
   * Create opportunity from template
   */
  private createOpportunityFromTemplate(
    templateId: string,
    variables: Record<string, string>,
    entities: GrowthOpportunity['affectedEntities'],
    score: OpportunityScore
  ): GrowthOpportunity {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Unknown template: ${templateId}`);
    }

    // Replace template variables
    let description = template.descriptionTemplate;
    let rationale = template.rationaleTemplate;
    for (const [key, value] of Object.entries(variables)) {
      description = description.replace(`{${key}}`, value);
      rationale = rationale.replace(`{${key}}`, value);
    }

    return {
      id: `${templateId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: template.category,
      priority: this.scoreToPriority(score.total),
      status: 'new',
      title: template.title,
      description,
      rationale,
      estimatedImpact: {
        metric: template.relatedMetrics[0] || 'content.performance_score',
        currentValue: 0,
        projectedValue: 0,
        confidence: score.confidence,
      },
      effort: template.effort,
      suggestedActions: template.suggestedActions,
      automatable: template.automatable,
      affectedEntities: entities,
      relatedMetrics: template.relatedMetrics,
      signals: [],
      createdAt: new Date(),
      score: score.total,
    };
  }

  /**
   * Calculate priority score
   */
  private calculateScore(
    impact: number,
    confidence: number,
    effort: number,
    urgency: number
  ): OpportunityScore {
    // Weight: Impact 35%, Confidence 20%, Effort inverse 25%, Urgency 20%
    const effortScore = 100 - effort; // Invert so easier = higher
    const total = Math.round(
      impact * 0.35 +
      confidence * 0.20 +
      effortScore * 0.25 +
      urgency * 0.20
    );

    return {
      impact,
      confidence,
      effort,
      urgency,
      total: Math.min(100, Math.max(0, total)),
    };
  }

  /**
   * Convert score to priority
   */
  private scoreToPriority(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Clean expired opportunities
   */
  cleanExpired(): void {
    const now = new Date();
    for (const [id, opp] of this.opportunities.entries()) {
      if (opp.expiresAt && opp.expiresAt < now) {
        this.opportunities.delete(id);
        logger.debug('Removed expired opportunity', { id });
      }
    }
  }
}

// =====================================================
// CONVENIENCE EXPORTS
// =====================================================

export function getOpportunitiesEngine(): OpportunitiesEngine {
  return OpportunitiesEngine.getInstance();
}

export function detectOpportunities(
  performance: ContentPerformanceResult
): GrowthOpportunity[] {
  return getOpportunitiesEngine().detectFromContentPerformance(performance);
}

export function getTopOpportunities(limit?: number): GrowthOpportunity[] {
  return getOpportunitiesEngine().getTopOpportunities(limit);
}

export function getOpportunitySummary(): OpportunitySummary {
  return getOpportunitiesEngine().getSummary();
}
