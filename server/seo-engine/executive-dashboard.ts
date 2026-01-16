/**
 * Executive SEO Dashboard API
 *
 * Provides high-level SEO health metrics for leadership:
 * - Overall visibility score
 * - Index health
 * - Traffic trends
 * - Risk alerts
 * - Action queue status
 */

import { db } from '../db';
import { contents } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { PageClassifier, PageClassification } from './page-classifier';
import { AEOContentValidator } from './aeo-content-validator';
import { ContentPipeline } from './content-pipeline';
import { LinkGraphEngine } from './link-graph-engine';
import { RiskMonitor } from './risk-monitor';
import { SEOActionEngine, AutopilotMode } from '../seo-actions/action-engine';

export interface ExecutiveDashboard {
  generatedAt: Date;
  overallHealth: HealthScore;
  visibility: VisibilityMetrics;
  contentQuality: ContentQualityMetrics;
  indexHealth: IndexHealthMetrics;
  riskSummary: RiskSummary;
  actionQueue: ActionQueueSummary;
  linkGraph: LinkGraphSummary;
  autopilotStatus: AutopilotStatus;
  trends: TrendData;
}

export interface HealthScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend: 'up' | 'down' | 'stable';
  components: {
    seo: number;
    aeo: number;
    technical: number;
    content: number;
  };
}

export interface VisibilityMetrics {
  estimatedMonthlySearches: number;
  indexedPages: number;
  avgPosition: number;
  topKeywords: { keyword: string; position: number; trend: string }[];
  aeoReadyPages: number;
  aeoReadyPercent: number;
}

export interface ContentQualityMetrics {
  totalContent: number;
  publishedContent: number;
  draftContent: number;
  avgSeoScore: number;
  avgAeoScore: number;
  avgWordCount: number;
  byClassification: Record<PageClassification, number>;
  contentIssues: {
    zero: number;
    thin: number;
    stale: number;
    duplicate: number;
  };
}

export interface IndexHealthMetrics {
  totalIndexed: number;
  totalNoindex: number;
  indexRate: number;
  crawlBudgetUsage: number;
  lastCrawlDate: Date | null;
  crawlErrors: number;
  orphanPages: number;
}

export interface RiskSummary {
  totalAlerts: number;
  critical: number;
  high: number;
  publishingPaused: boolean;
  latestAlert: string | null;
}

export interface ActionQueueSummary {
  pending: number;
  inProgress: number;
  completedToday: number;
  failedToday: number;
  topPending: { action: string; count: number }[];
}

export interface LinkGraphSummary {
  totalNodes: number;
  totalEdges: number;
  orphanCount: number;
  avgDepth: number;
  topPagesByRank: { title: string; rank: number }[];
}

export interface AutopilotStatus {
  mode: AutopilotMode;
  actionsExecutedToday: number;
  actionsBlockedToday: number;
  lastActionAt: Date | null;
}

export interface TrendData {
  seoScoreTrend: { date: string; score: number }[];
  trafficTrend: { date: string; visits: number }[];
  indexTrend: { date: string; indexed: number }[];
}

export class ExecutiveDashboardAPI {
  private classifier: PageClassifier;
  private aeoValidator: AEOContentValidator;
  private contentPipeline: ContentPipeline;
  private linkGraphEngine: LinkGraphEngine;
  private riskMonitor: RiskMonitor;
  private actionEngine: SEOActionEngine;

  constructor(autopilotMode: AutopilotMode = 'supervised') {
    this.classifier = new PageClassifier();
    this.aeoValidator = new AEOContentValidator();
    this.contentPipeline = new ContentPipeline(autopilotMode);
    this.linkGraphEngine = new LinkGraphEngine();
    this.riskMonitor = new RiskMonitor();
    this.actionEngine = new SEOActionEngine(autopilotMode);
  }

  /**
   * Generate full executive dashboard
   */
  async generateDashboard(): Promise<ExecutiveDashboard> {
    // Get all content
    const allContent = await db.query.contents.findMany();
    const publishedContent = allContent.filter((c) => c.status === 'published');

    // Calculate metrics in parallel where possible
    const [
      overallHealth,
      visibility,
      contentQuality,
      indexHealth,
      riskSummary,
      actionQueue,
      linkGraph,
      autopilotStatus,
      trends,
    ] = await Promise.all([
      this.calculateOverallHealth(publishedContent),
      this.calculateVisibility(publishedContent),
      this.calculateContentQuality(allContent, publishedContent),
      this.calculateIndexHealth(publishedContent),
      this.calculateRiskSummary(),
      this.calculateActionQueue(),
      this.calculateLinkGraph(),
      this.calculateAutopilotStatus(),
      this.calculateTrends(publishedContent),
    ]);

    return {
      generatedAt: new Date(),
      overallHealth,
      visibility,
      contentQuality,
      indexHealth,
      riskSummary,
      actionQueue,
      linkGraph,
      autopilotStatus,
      trends,
    };
  }

  /**
   * Calculate overall health score
   */
  private async calculateOverallHealth(content: any[]): Promise<HealthScore> {
    // Calculate component scores
    const seoScores = content.map((c) => c.seoScore || 0).filter((s) => s > 0);
    const aeoScores = content.map((c) => (c as any).aeoScore || 0).filter((s) => s > 0);

    const seoAvg = seoScores.length > 0 ? seoScores.reduce((a, b) => a + b, 0) / seoScores.length : 0;
    const aeoAvg = aeoScores.length > 0 ? aeoScores.reduce((a, b) => a + b, 0) / aeoScores.length : 0;

    // Technical score based on schema, canonical, etc.
    const hasSchema = content.filter((c) => (c as any).schemaMarkup).length;
    const hasCanonical = content.filter((c) => (c as any).canonicalUrl).length;
    const technicalAvg = ((hasSchema / content.length) * 50 + (hasCanonical / content.length) * 50) * 100 / 100;

    // Content score based on word count and structure
    const meetsWordCount = content.filter((c) => (c.wordCount || 0) >= 1000).length;
    const contentAvg = (meetsWordCount / content.length) * 100;

    // Overall score (weighted)
    const overallScore = Math.round(
      seoAvg * 0.35 +
      aeoAvg * 0.25 +
      technicalAvg * 0.20 +
      contentAvg * 0.20
    );

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';

    // Trend would be calculated from historical data
    const trend: 'up' | 'down' | 'stable' = 'stable';

    return {
      score: overallScore,
      grade,
      trend,
      components: {
        seo: Math.round(seoAvg),
        aeo: Math.round(aeoAvg),
        technical: Math.round(technicalAvg),
        content: Math.round(contentAvg),
      },
    };
  }

  /**
   * Calculate visibility metrics
   */
  private async calculateVisibility(content: any[]): Promise<VisibilityMetrics> {
    const indexed = content.filter((c) => !(c as any).noindex);

    // AEO ready calculation
    const aeoResults = await Promise.all(
      content.slice(0, 50).map(async (c) => {
        try {
          return await this.aeoValidator.validateContent(c.id);
        } catch {
          return null;
        }
      })
    );

    const aeoReady = aeoResults.filter((r) => r?.isValid).length;
    const aeoReadyPercent = content.length > 0 ? Math.round((aeoReady / Math.min(content.length, 50)) * 100) : 0;

    return {
      estimatedMonthlySearches: content.reduce((sum, c) => sum + ((c as any).monthlySearches || 0), 0),
      indexedPages: indexed.length,
      avgPosition: 0, // Would come from GSC integration
      topKeywords: [], // Would come from keyword tracking
      aeoReadyPages: aeoReady,
      aeoReadyPercent,
    };
  }

  /**
   * Calculate content quality metrics
   */
  private async calculateContentQuality(
    allContent: any[],
    publishedContent: any[]
  ): Promise<ContentQualityMetrics> {
    const seoScores = publishedContent.map((c) => c.seoScore || 0).filter((s) => s > 0);
    const aeoScores = publishedContent.map((c) => (c as any).aeoScore || 0).filter((s) => s > 0);
    const wordCounts = publishedContent.map((c) => c.wordCount || 0).filter((w) => w > 0);

    // Classify content
    const byClassification: Record<PageClassification, number> = {
      MONEY_PAGE: 0,
      INFORMATIONAL: 0,
      GUIDE: 0,
      NEWS: 0,
      EVERGREEN: 0,
      EXPERIMENTAL: 0,
      SEO_RISK: 0,
    };

    for (const content of publishedContent.slice(0, 100)) {
      try {
        const result = await this.classifier.classifyContent(content.id);
        byClassification[result.classification]++;
      } catch {
        byClassification.INFORMATIONAL++;
      }
    }

    // Run content pipeline for issues
    const pipelineResult = await this.contentPipeline.runPipeline();

    return {
      totalContent: allContent.length,
      publishedContent: publishedContent.length,
      draftContent: allContent.filter((c) => c.status === 'draft').length,
      avgSeoScore: seoScores.length > 0 ? Math.round(seoScores.reduce((a, b) => a + b, 0) / seoScores.length) : 0,
      avgAeoScore: aeoScores.length > 0 ? Math.round(aeoScores.reduce((a, b) => a + b, 0) / aeoScores.length) : 0,
      avgWordCount: wordCounts.length > 0 ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length) : 0,
      byClassification,
      contentIssues: {
        zero: pipelineResult.summary.zero,
        thin: pipelineResult.summary.thin,
        stale: pipelineResult.summary.stale,
        duplicate: pipelineResult.summary.duplicate,
      },
    };
  }

  /**
   * Calculate index health metrics
   */
  private async calculateIndexHealth(content: any[]): Promise<IndexHealthMetrics> {
    const indexed = content.filter((c) => !(c as any).noindex);
    const noindexed = content.filter((c) => (c as any).noindex);

    // Get orphan count from link graph
    let orphanCount = 0;
    try {
      if (this.linkGraphEngine.needsRebuild()) {
        await this.linkGraphEngine.buildGraph();
      }
      const stats = this.linkGraphEngine.getStats();
      orphanCount = stats?.orphanCount || 0;
    } catch {
      orphanCount = 0;
    }

    return {
      totalIndexed: indexed.length,
      totalNoindex: noindexed.length,
      indexRate: content.length > 0 ? Math.round((indexed.length / content.length) * 100) : 0,
      crawlBudgetUsage: 0, // Would come from GSC
      lastCrawlDate: null, // Would come from GSC
      crawlErrors: 0, // Would come from GSC
      orphanPages: orphanCount,
    };
  }

  /**
   * Calculate risk summary
   */
  private async calculateRiskSummary(): Promise<RiskSummary> {
    const summary = this.riskMonitor.getSummary();

    return {
      totalAlerts: summary.totalAlerts,
      critical: summary.critical,
      high: summary.high,
      publishingPaused: summary.publishingPaused,
      latestAlert: summary.latestAlert?.title || null,
    };
  }

  /**
   * Calculate action queue status
   */
  private async calculateActionQueue(): Promise<ActionQueueSummary> {
    // In production, this would query the action queue table
    return {
      pending: 0,
      inProgress: 0,
      completedToday: 0,
      failedToday: 0,
      topPending: [],
    };
  }

  /**
   * Calculate link graph summary
   */
  private async calculateLinkGraph(): Promise<LinkGraphSummary> {
    try {
      if (this.linkGraphEngine.needsRebuild()) {
        await this.linkGraphEngine.buildGraph();
      }

      const stats = this.linkGraphEngine.getStats();
      const topPages = this.linkGraphEngine.getTopPagesByRank(5);

      return {
        totalNodes: stats?.totalNodes || 0,
        totalEdges: stats?.totalEdges || 0,
        orphanCount: stats?.orphanCount || 0,
        avgDepth: stats?.avgDepth || 0,
        topPagesByRank: topPages.map((p) => ({
          title: p.title,
          rank: Math.round(p.pageRank * 1000) / 1000,
        })),
      };
    } catch {
      return {
        totalNodes: 0,
        totalEdges: 0,
        orphanCount: 0,
        avgDepth: 0,
        topPagesByRank: [],
      };
    }
  }

  /**
   * Calculate autopilot status
   */
  private async calculateAutopilotStatus(): Promise<AutopilotStatus> {
    return {
      mode: this.actionEngine.getAutopilotMode(),
      actionsExecutedToday: 0, // Would come from audit logs
      actionsBlockedToday: 0,
      lastActionAt: null,
    };
  }

  /**
   * Calculate trend data
   */
  private async calculateTrends(content: any[]): Promise<TrendData> {
    // In production, this would query historical data
    // For now, return mock structure
    return {
      seoScoreTrend: [],
      trafficTrend: [],
      indexTrend: [],
    };
  }

  /**
   * Get quick health check (lightweight)
   */
  async getQuickHealth(): Promise<{
    score: number;
    grade: string;
    criticalAlerts: number;
    publishingAllowed: boolean;
  }> {
    const content = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    const health = await this.calculateOverallHealth(content);
    const risks = this.riskMonitor.getSummary();

    return {
      score: health.score,
      grade: health.grade,
      criticalAlerts: risks.critical,
      publishingAllowed: this.riskMonitor.isPublishingAllowed(),
    };
  }

  /**
   * Get specific metric
   */
  async getMetric(metric: 'seo' | 'aeo' | 'index' | 'content'): Promise<any> {
    const content = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    switch (metric) {
      case 'seo':
        return await this.calculateOverallHealth(content);
      case 'aeo':
        return await this.calculateVisibility(content);
      case 'index':
        return await this.calculateIndexHealth(content);
      case 'content':
        const allContent = await db.query.contents.findMany();
        return await this.calculateContentQuality(allContent, content);
      default:
        throw new Error(`Unknown metric: ${metric}`);
    }
  }
}
