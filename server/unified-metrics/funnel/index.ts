/**
 * Unified Traffic → Conversion Funnel System
 *
 * Tracks user journeys from entry to conversion.
 * Provides insights on drop-off points and optimization opportunities.
 *
 * Standard Funnels:
 * 1. Content Discovery: Visit → Read → Engage → Convert
 * 2. Search Journey: Search → Click → Read → Action
 * 3. AI Discovery: AI Citation → Click → Explore → Convert
 * 4. Newsletter: Visit → Subscribe → Open → Click → Convert
 */

import { log } from '../../lib/logger';
import { getMetricsRegistry, recordMetric } from '../registry';
import type { FunnelDefinition, FunnelStage, MetricEntityType } from '../registry/types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[FunnelSystem] ${msg}`, data),
  debug: (msg: string, data?: Record<string, unknown>) =>
    log.debug(`[FunnelSystem] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[FunnelSystem] ${msg}`, data),
};

// =====================================================
// TYPES
// =====================================================

export interface FunnelStageData {
  stageId: string;
  name: string;
  count: number;
  previousStageCount: number;
  conversionRate: number;         // % from previous stage
  dropOffRate: number;            // % lost from previous stage
  avgTimeInStage: number;         // seconds
}

export interface FunnelAnalysis {
  funnelId: string;
  name: string;
  period: {
    start: Date;
    end: Date;
  };
  stages: FunnelStageData[];
  overallConversionRate: number;  // First stage to last
  totalEntries: number;
  totalConversions: number;
  bottleneck: {
    stageId: string;
    stageName: string;
    dropOffRate: number;
  } | null;
  trend: 'improving' | 'stable' | 'declining';
  insights: FunnelInsight[];
}

export interface FunnelInsight {
  type: 'bottleneck' | 'improvement' | 'opportunity' | 'anomaly';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  stageId?: string;
  metric?: string;
  suggestedAction?: string;
}

export interface FunnelEvent {
  funnelId: string;
  stageId: string;
  sessionId: string;
  userId?: string;
  contentId?: string;
  channel?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface FunnelComparison {
  funnelId: string;
  segment1: {
    name: string;
    analysis: FunnelAnalysis;
  };
  segment2: {
    name: string;
    analysis: FunnelAnalysis;
  };
  differences: Array<{
    stageId: string;
    stageName: string;
    segment1Rate: number;
    segment2Rate: number;
    difference: number;
    winner: 'segment1' | 'segment2' | 'tie';
  }>;
}

// =====================================================
// PREDEFINED FUNNELS
// =====================================================

export const PREDEFINED_FUNNELS: FunnelDefinition[] = [
  {
    id: 'content-discovery',
    name: 'Content Discovery Funnel',
    description: 'Tracks visitor journey from landing to conversion',
    category: 'content',
    stages: [
      {
        id: 'visit',
        name: 'Page Visit',
        description: 'Visitor lands on content',
        metricId: 'engagement.page_views',
        order: 1,
        expectedConversionRate: 100,
      },
      {
        id: 'read',
        name: 'Content Read',
        description: 'Visitor reads content (30+ seconds)',
        metricId: 'engagement.dwell_time',
        order: 2,
        expectedConversionRate: 60,
      },
      {
        id: 'engage',
        name: 'Engagement',
        description: 'Visitor engages (scroll, click internal links)',
        metricId: 'engagement.scroll_depth',
        order: 3,
        expectedConversionRate: 40,
      },
      {
        id: 'action',
        name: 'Take Action',
        description: 'Visitor takes action (affiliate click, signup)',
        metricId: 'conversion.total_conversions',
        order: 4,
        expectedConversionRate: 5,
      },
    ],
    targetConversionRate: 5,
  },
  {
    id: 'search-journey',
    name: 'Organic Search Journey',
    description: 'From search impression to conversion',
    category: 'traffic',
    stages: [
      {
        id: 'impression',
        name: 'Search Impression',
        description: 'Content appears in search results',
        metricId: 'seo.impressions',
        order: 1,
        expectedConversionRate: 100,
      },
      {
        id: 'click',
        name: 'Search Click',
        description: 'User clicks on search result',
        metricId: 'seo.clicks',
        order: 2,
        expectedConversionRate: 3,
      },
      {
        id: 'read',
        name: 'Content Read',
        description: 'User reads content',
        metricId: 'engagement.dwell_time',
        order: 3,
        expectedConversionRate: 60,
      },
      {
        id: 'convert',
        name: 'Convert',
        description: 'User converts',
        metricId: 'conversion.total_conversions',
        order: 4,
        expectedConversionRate: 5,
      },
    ],
    targetConversionRate: 0.1,
  },
  {
    id: 'ai-discovery',
    name: 'AI Discovery Journey',
    description: 'From AI citation to conversion',
    category: 'traffic',
    stages: [
      {
        id: 'ai-impression',
        name: 'AI Impression',
        description: 'Content appears in AI response',
        metricId: 'aeo.ai_impressions',
        order: 1,
        expectedConversionRate: 100,
      },
      {
        id: 'citation',
        name: 'Citation',
        description: 'AI cites our content',
        metricId: 'aeo.citations',
        order: 2,
        expectedConversionRate: 10,
      },
      {
        id: 'click-through',
        name: 'Click Through',
        description: 'User clicks to our site',
        metricId: 'aeo.click_throughs',
        order: 3,
        expectedConversionRate: 5,
      },
      {
        id: 'explore',
        name: 'Explore',
        description: 'User explores more content',
        metricId: 'engagement.pages_per_session',
        order: 4,
        expectedConversionRate: 30,
      },
      {
        id: 'convert',
        name: 'Convert',
        description: 'User converts',
        metricId: 'conversion.total_conversions',
        order: 5,
        expectedConversionRate: 5,
      },
    ],
    targetConversionRate: 0.025,
  },
  {
    id: 'newsletter',
    name: 'Newsletter Funnel',
    description: 'From visit to newsletter conversion',
    category: 'conversion',
    stages: [
      {
        id: 'visit',
        name: 'Site Visit',
        description: 'Visitor comes to site',
        metricId: 'traffic.total_sessions',
        order: 1,
        expectedConversionRate: 100,
      },
      {
        id: 'view-signup',
        name: 'View Signup',
        description: 'Visitor sees signup form',
        metricId: 'engagement.page_views',
        order: 2,
        expectedConversionRate: 30,
      },
      {
        id: 'subscribe',
        name: 'Subscribe',
        description: 'Visitor subscribes',
        metricId: 'conversion.newsletter_signups',
        order: 3,
        expectedConversionRate: 3,
      },
      {
        id: 'open',
        name: 'Open Email',
        description: 'Subscriber opens email',
        metricId: 'engagement.page_views',
        order: 4,
        expectedConversionRate: 40,
      },
      {
        id: 'click',
        name: 'Click Link',
        description: 'Subscriber clicks email link',
        metricId: 'conversion.affiliate_clicks',
        order: 5,
        expectedConversionRate: 10,
      },
    ],
    targetConversionRate: 0.036,
  },
  {
    id: 'affiliate-conversion',
    name: 'Affiliate Conversion Funnel',
    description: 'From content view to affiliate purchase',
    category: 'conversion',
    stages: [
      {
        id: 'content-view',
        name: 'Content View',
        description: 'User views content with affiliate links',
        metricId: 'engagement.page_views',
        order: 1,
        expectedConversionRate: 100,
      },
      {
        id: 'affiliate-view',
        name: 'See Affiliate',
        description: 'User sees affiliate content',
        metricId: 'engagement.scroll_depth',
        order: 2,
        expectedConversionRate: 50,
      },
      {
        id: 'affiliate-click',
        name: 'Affiliate Click',
        description: 'User clicks affiliate link',
        metricId: 'conversion.affiliate_clicks',
        order: 3,
        expectedConversionRate: 5,
      },
      {
        id: 'purchase',
        name: 'Purchase',
        description: 'User completes purchase',
        metricId: 'revenue.affiliate_revenue',
        order: 4,
        expectedConversionRate: 10,
      },
    ],
    targetConversionRate: 0.25,
  },
];

// =====================================================
// FUNNEL SYSTEM
// =====================================================

export class FunnelSystem {
  private static instance: FunnelSystem | null = null;

  // In-memory event storage (for real-time analysis)
  private events: Map<string, FunnelEvent[]> = new Map();
  private sessionStages: Map<string, Map<string, string[]>> = new Map();

  // Funnel definitions
  private funnels: Map<string, FunnelDefinition> = new Map();

  private constructor() {
    // Initialize predefined funnels
    PREDEFINED_FUNNELS.forEach(f => this.funnels.set(f.id, f));
    logger.info('Funnel System initialized', { funnelCount: this.funnels.size });
  }

  static getInstance(): FunnelSystem {
    if (!FunnelSystem.instance) {
      FunnelSystem.instance = new FunnelSystem();
    }
    return FunnelSystem.instance;
  }

  static reset(): void {
    FunnelSystem.instance = null;
  }

  // =====================================================
  // FUNNEL MANAGEMENT
  // =====================================================

  /**
   * Get all funnel definitions
   */
  getAllFunnels(): FunnelDefinition[] {
    return Array.from(this.funnels.values());
  }

  /**
   * Get funnel by ID
   */
  getFunnel(funnelId: string): FunnelDefinition | undefined {
    return this.funnels.get(funnelId);
  }

  /**
   * Register a custom funnel
   */
  registerFunnel(funnel: FunnelDefinition): void {
    this.funnels.set(funnel.id, funnel);
    logger.info('Funnel registered', { funnelId: funnel.id, name: funnel.name });
  }

  // =====================================================
  // EVENT TRACKING
  // =====================================================

  /**
   * Record a funnel event
   */
  recordEvent(event: FunnelEvent): void {
    const funnel = this.funnels.get(event.funnelId);
    if (!funnel) {
      logger.warn('Unknown funnel', { funnelId: event.funnelId });
      return;
    }

    const stage = funnel.stages.find(s => s.id === event.stageId);
    if (!stage) {
      logger.warn('Unknown stage', { funnelId: event.funnelId, stageId: event.stageId });
      return;
    }

    // Store event
    const events = this.events.get(event.funnelId) || [];
    events.push(event);
    this.events.set(event.funnelId, events);

    // Track session progression
    const sessionKey = `${event.funnelId}:${event.sessionId}`;
    const sessionStages = this.sessionStages.get(sessionKey) || new Map();
    const stageHistory = sessionStages.get(event.stageId) || [];
    stageHistory.push(event.timestamp.toISOString());
    sessionStages.set(event.stageId, stageHistory);
    this.sessionStages.set(sessionKey, sessionStages);

    // Record to metrics registry
    recordMetric(
      stage.metricId,
      1,
      'system',
      undefined,
      { funnelId: event.funnelId, stageId: event.stageId }
    );

    logger.debug('Funnel event recorded', {
      funnelId: event.funnelId,
      stageId: event.stageId,
      sessionId: event.sessionId,
    });
  }

  /**
   * Record multiple events
   */
  recordEvents(events: FunnelEvent[]): void {
    events.forEach(e => this.recordEvent(e));
  }

  // =====================================================
  // ANALYSIS
  // =====================================================

  /**
   * Analyze a funnel
   */
  analyzeFunnel(
    funnelId: string,
    startDate: Date,
    endDate: Date,
    previousAnalysis?: FunnelAnalysis
  ): FunnelAnalysis | null {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return null;

    const events = this.events.get(funnelId) || [];

    // Filter events by date range
    const filteredEvents = events.filter(
      e => e.timestamp >= startDate && e.timestamp <= endDate
    );

    // Calculate stage data
    const stageData: FunnelStageData[] = [];
    let previousCount = 0;

    for (const stage of funnel.stages.sort((a, b) => a.order - b.order)) {
      const stageEvents = filteredEvents.filter(e => e.stageId === stage.id);
      const count = stageEvents.length;

      const conversionRate = previousCount > 0
        ? (count / previousCount) * 100
        : (stage.order === 1 ? 100 : 0);

      const dropOffRate = previousCount > 0
        ? ((previousCount - count) / previousCount) * 100
        : 0;

      stageData.push({
        stageId: stage.id,
        name: stage.name,
        count,
        previousStageCount: previousCount,
        conversionRate: Math.round(conversionRate * 100) / 100,
        dropOffRate: Math.round(dropOffRate * 100) / 100,
        avgTimeInStage: this.calculateAvgTimeInStage(funnelId, stage.id, filteredEvents),
      });

      previousCount = count;
    }

    // Find bottleneck (stage with highest drop-off)
    let bottleneck: FunnelAnalysis['bottleneck'] = null;
    let maxDropOff = 0;
    for (const stage of stageData) {
      if ((stage as any).order > 1 && stage.dropOffRate > maxDropOff) {
        maxDropOff = stage.dropOffRate;
        bottleneck = {
          stageId: stage.stageId,
          stageName: stage.name,
          dropOffRate: stage.dropOffRate,
        };
      }
    }

    // Calculate overall conversion
    const totalEntries = stageData[0]?.count || 0;
    const totalConversions = stageData[stageData.length - 1]?.count || 0;
    const overallConversionRate = totalEntries > 0
      ? (totalConversions / totalEntries) * 100
      : 0;

    // Calculate trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (previousAnalysis) {
      const change = overallConversionRate - previousAnalysis.overallConversionRate;
      if (change > 5) trend = 'improving';
      else if (change < -5) trend = 'declining';
    }

    // Generate insights
    const insights = this.generateInsights(funnel, stageData, bottleneck);

    return {
      funnelId,
      name: funnel.name,
      period: { start: startDate, end: endDate },
      stages: stageData,
      overallConversionRate: Math.round(overallConversionRate * 100) / 100,
      totalEntries,
      totalConversions,
      bottleneck,
      trend,
      insights,
    };
  }

  /**
   * Compare funnel performance across segments
   */
  compareFunnels(
    funnelId: string,
    segment1Filter: (event: FunnelEvent) => boolean,
    segment1Name: string,
    segment2Filter: (event: FunnelEvent) => boolean,
    segment2Name: string,
    startDate: Date,
    endDate: Date
  ): FunnelComparison | null {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return null;

    // Create filtered event sets
    const events = this.events.get(funnelId) || [];
    const period = events.filter(e => e.timestamp >= startDate && e.timestamp <= endDate);

    // Temporarily replace events for analysis
    const segment1Events = period.filter(segment1Filter);
    const segment2Events = period.filter(segment2Filter);

    // Analyze each segment
    this.events.set(funnelId, segment1Events);
    const analysis1 = this.analyzeFunnel(funnelId, startDate, endDate);

    this.events.set(funnelId, segment2Events);
    const analysis2 = this.analyzeFunnel(funnelId, startDate, endDate);

    // Restore original events
    this.events.set(funnelId, events);

    if (!analysis1 || !analysis2) return null;

    // Calculate differences
    const differences: FunnelComparison['differences'] = [];
    for (let i = 0; i < analysis1.stages.length; i++) {
      const s1 = analysis1.stages[i];
      const s2 = analysis2.stages[i];

      const difference = s1.conversionRate - s2.conversionRate;
      let winner: 'segment1' | 'segment2' | 'tie' = 'tie';
      if (difference > 5) winner = 'segment1';
      else if (difference < -5) winner = 'segment2';

      differences.push({
        stageId: s1.stageId,
        stageName: s1.name,
        segment1Rate: s1.conversionRate,
        segment2Rate: s2.conversionRate,
        difference: Math.round(difference * 100) / 100,
        winner,
      });
    }

    return {
      funnelId,
      segment1: { name: segment1Name, analysis: analysis1 },
      segment2: { name: segment2Name, analysis: analysis2 },
      differences,
    };
  }

  // =====================================================
  // INSIGHTS
  // =====================================================

  /**
   * Generate funnel insights
   */
  private generateInsights(
    funnel: FunnelDefinition,
    stageData: FunnelStageData[],
    bottleneck: FunnelAnalysis['bottleneck']
  ): FunnelInsight[] {
    const insights: FunnelInsight[] = [];

    // Bottleneck insight
    if (bottleneck && bottleneck.dropOffRate > 50) {
      insights.push({
        type: 'bottleneck',
        severity: bottleneck.dropOffRate > 70 ? 'high' : 'medium',
        title: `High drop-off at "${bottleneck.stageName}"`,
        description: `${bottleneck.dropOffRate.toFixed(1)}% of users are lost at this stage`,
        stageId: bottleneck.stageId,
        suggestedAction: this.getSuggestedAction(funnel.id, bottleneck.stageId),
      });
    }

    // Check for underperforming stages
    for (const stage of stageData) {
      const funnelStage = funnel.stages.find(s => s.id === stage.stageId);
      if (funnelStage?.expectedConversionRate) {
        const diff = funnelStage.expectedConversionRate - stage.conversionRate;
        if (diff > 20) {
          insights.push({
            type: 'bottleneck',
            severity: diff > 40 ? 'high' : 'medium',
            title: `"${stage.name}" below expected conversion`,
            description: `Expected ${funnelStage.expectedConversionRate}% but got ${stage.conversionRate.toFixed(1)}%`,
            stageId: stage.stageId,
            suggestedAction: this.getSuggestedAction(funnel.id, stage.stageId),
          });
        }
      }
    }

    // Check for improvement opportunities
    for (const stage of stageData) {
      if (stage.conversionRate > 80 && stage.stageId !== stageData[0].stageId) {
        insights.push({
          type: 'improvement',
          severity: 'low',
          title: `Strong performance at "${stage.name}"`,
          description: `${stage.conversionRate.toFixed(1)}% conversion rate is excellent`,
          stageId: stage.stageId,
        });
      }
    }

    // Overall funnel health
    const overallRate = stageData[stageData.length - 1]?.count / (stageData[0]?.count || 1) * 100;
    if (funnel.targetConversionRate && overallRate < funnel.targetConversionRate) {
      insights.push({
        type: 'opportunity',
        severity: 'high',
        title: 'Funnel below target',
        description: `Overall conversion of ${overallRate.toFixed(2)}% is below target of ${funnel.targetConversionRate}%`,
        suggestedAction: 'Focus on improving the bottleneck stage first',
      });
    }

    return insights;
  }

  /**
   * Get suggested action for a stage
   */
  private getSuggestedAction(funnelId: string, stageId: string): string {
    const actionMap: Record<string, Record<string, string>> = {
      'content-discovery': {
        'visit': 'Improve SEO and content distribution',
        'read': 'Enhance content quality and readability',
        'engage': 'Add interactive elements and internal links',
        'action': 'Improve CTAs and reduce friction',
      },
      'search-journey': {
        'impression': 'Target more relevant keywords',
        'click': 'Improve title and meta description',
        'read': 'Match content to search intent',
        'convert': 'Add clear calls-to-action',
      },
      'ai-discovery': {
        'ai-impression': 'Improve AEO optimization',
        'citation': 'Add answer capsules and FAQ sections',
        'click-through': 'Make citations more compelling',
        'explore': 'Improve internal linking',
        'convert': 'Add contextual CTAs',
      },
      'newsletter': {
        'visit': 'Increase traffic sources',
        'view-signup': 'Make signup form more visible',
        'subscribe': 'Improve value proposition',
        'open': 'Optimize subject lines',
        'click': 'Improve email content and CTAs',
      },
      'affiliate-conversion': {
        'content-view': 'Increase content traffic',
        'affiliate-view': 'Position affiliate content better',
        'affiliate-click': 'Improve affiliate link CTAs',
        'purchase': 'Choose higher-converting offers',
      },
    };

    return actionMap[funnelId]?.[stageId] || 'Analyze and optimize this stage';
  }

  /**
   * Calculate average time in stage
   */
  private calculateAvgTimeInStage(
    funnelId: string,
    stageId: string,
    events: FunnelEvent[]
  ): number {
    // Simplified calculation - in production, use session-based timing
    const stageEvents = events.filter(e => e.stageId === stageId);
    if (stageEvents.length < 2) return 0;

    // Calculate average time between consecutive events
    let totalTime = 0;
    let count = 0;

    for (let i = 1; i < stageEvents.length; i++) {
      const timeDiff = stageEvents[i].timestamp.getTime() - stageEvents[i - 1].timestamp.getTime();
      if (timeDiff < 3600000) { // Ignore gaps > 1 hour
        totalTime += timeDiff;
        count++;
      }
    }

    return count > 0 ? Math.round(totalTime / count / 1000) : 0;
  }

  // =====================================================
  // UTILITIES
  // =====================================================

  /**
   * Get funnel visualization data
   */
  getFunnelVisualization(analysis: FunnelAnalysis): {
    stages: Array<{
      name: string;
      value: number;
      percentage: number;
      color: string;
    }>;
  } {
    const colors = ['#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534'];
    const maxCount = analysis.stages[0]?.count || 1;

    return {
      stages: analysis.stages.map((stage, i) => ({
        name: stage.name,
        value: stage.count,
        percentage: Math.round((stage.count / maxCount) * 100),
        color: colors[Math.min(i, colors.length - 1)],
      })),
    };
  }

  /**
   * Clean old events
   */
  cleanOldEvents(olderThan: Date): void {
    for (const [funnelId, events] of this.events.entries()) {
      const filtered = events.filter(e => e.timestamp >= olderThan);
      if (filtered.length !== events.length) {
        this.events.set(funnelId, filtered);
        logger.info('Cleaned old events', {
          funnelId,
          removed: events.length - filtered.length,
        });
      }
    }
  }
}

// =====================================================
// CONVENIENCE EXPORTS
// =====================================================

export function getFunnelSystem(): FunnelSystem {
  return FunnelSystem.getInstance();
}

export function recordFunnelEvent(
  funnelId: string,
  stageId: string,
  sessionId: string,
  options?: {
    userId?: string;
    contentId?: string;
    channel?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  getFunnelSystem().recordEvent({
    funnelId,
    stageId,
    sessionId,
    userId: options?.userId,
    contentId: options?.contentId,
    channel: options?.channel,
    timestamp: new Date(),
    metadata: options?.metadata,
  });
}

export function analyzeFunnel(
  funnelId: string,
  startDate: Date,
  endDate: Date
): FunnelAnalysis | null {
  return getFunnelSystem().analyzeFunnel(funnelId, startDate, endDate);
}
