/**
 * Index Health Engine - Monitor and Report on Content Indexing Health
 *
 * Provides comprehensive insights into:
 * - Content indexing status
 * - SEO issues detection
 * - Content health by type
 * - Crawler activity summary
 * - Trends over time
 */

import { db } from '../db';
import { contents, aeoCrawlerLogs, translations } from '../../shared/schema';
import { eq, and, gte, lte, count, sql, desc, ne } from 'drizzle-orm';
import {
  SEOEngineConfig,
  IndexHealthSummary,
  IndexHealthDashboard,
  IndexIssue,
  IndexIssueType,
  ContentTypeHealth,
  IndexHealthTrend,
  CrawlerActivitySummary,
} from './types';

export class IndexHealthEngine {
  private config: SEOEngineConfig;

  constructor(config: SEOEngineConfig) {
    this.config = config;
  }

  /**
   * Get index health summary
   */
  async getSummary(): Promise<IndexHealthSummary> {
    const publishedContent = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    const totalContent = publishedContent.length;
    const issues = await this.detectIssues(publishedContent);

    // Calculate indexed vs not indexed (based on having proper meta)
    const indexed = publishedContent.filter(
      (c) => c.metaTitle && c.metaDescription && c.slug
    ).length;
    const notIndexed = totalContent - indexed;

    // Get last crawl date
    const lastCrawl = await db.query.aeoCrawlerLogs.findFirst({
      orderBy: [desc(aeoCrawlerLogs.crawledAt)],
    });

    // Generate recommendations based on issues
    const recommendations = this.generateRecommendations(issues);

    return {
      totalContent,
      indexed,
      notIndexed,
      indexRate: totalContent > 0 ? Math.round((indexed / totalContent) * 100) : 0,
      issues,
      lastCrawl: lastCrawl?.crawledAt || null,
      recommendations,
    };
  }

  /**
   * Get full dashboard data
   */
  async getDashboard(): Promise<IndexHealthDashboard> {
    const summary = await this.getSummary();
    const byContentType = await this.getHealthByContentType();
    const trends = await this.getHealthTrends(30);
    const crawlerActivity = await this.getCrawlerActivity();

    return {
      summary,
      byContentType,
      trends,
      crawlerActivity,
    };
  }

  /**
   * Detect SEO issues in content
   */
  private async detectIssues(publishedContent: any[]): Promise<IndexIssue[]> {
    const issues: IndexIssue[] = [];
    const issueMap = new Map<IndexIssueType, string[]>();

    // Initialize issue tracking
    const issueTypes: IndexIssueType[] = [
      'missing_meta_title',
      'missing_meta_description',
      'duplicate_title',
      'duplicate_description',
      'thin_content',
      'missing_canonical',
      'missing_schema',
      'no_internal_links',
      'missing_alt_text',
      'missing_h1',
    ];

    for (const type of issueTypes) {
      issueMap.set(type, []);
    }

    // Track duplicates
    const titleMap = new Map<string, string[]>();
    const descriptionMap = new Map<string, string[]>();

    for (const content of publishedContent) {
      // Missing meta title
      if (!content.metaTitle || content.metaTitle.length < 20) {
        issueMap.get('missing_meta_title')?.push(content.id);
      }

      // Missing meta description
      if (!content.metaDescription || content.metaDescription.length < 50) {
        issueMap.get('missing_meta_description')?.push(content.id);
      }

      // Thin content
      if (content.wordCount < this.config.thinContentThreshold) {
        issueMap.get('thin_content')?.push(content.id);
      }

      // Missing schema
      if (!content.seoSchema) {
        issueMap.get('missing_schema')?.push(content.id);
      }

      // Track for duplicates
      if (content.metaTitle) {
        const existing = titleMap.get(content.metaTitle) || [];
        existing.push(content.id);
        titleMap.set(content.metaTitle, existing);
      }

      if (content.metaDescription) {
        const existing = descriptionMap.get(content.metaDescription) || [];
        existing.push(content.id);
        descriptionMap.set(content.metaDescription, existing);
      }

      // Missing hero image alt (if has image)
      if (content.heroImage && !content.heroImageAlt) {
        issueMap.get('missing_alt_text')?.push(content.id);
      }

      // Check blocks for H1
      const blocks = content.blocks || [];
      const hasH1 = blocks.some(
        (b: any) =>
          b.type === 'heading' && (b.level === 1 || b.data?.level === 1)
      );
      if (!hasH1 && blocks.length > 0) {
        issueMap.get('missing_h1')?.push(content.id);
      }
    }

    // Find duplicates
    for (const [title, ids] of titleMap.entries()) {
      if (ids.length > 1) {
        issueMap.get('duplicate_title')?.push(...ids);
      }
    }

    for (const [desc, ids] of descriptionMap.entries()) {
      if (ids.length > 1) {
        issueMap.get('duplicate_description')?.push(...ids);
      }
    }

    // Convert to issue objects
    const issueInfo: Record<IndexIssueType, { severity: 'critical' | 'warning' | 'info'; description: string; fixAction: string }> = {
      missing_meta_title: {
        severity: 'critical',
        description: 'Pages missing or having short meta titles (<20 chars)',
        fixAction: 'Add descriptive meta titles (50-60 characters) with primary keyword',
      },
      missing_meta_description: {
        severity: 'critical',
        description: 'Pages missing or having short meta descriptions (<50 chars)',
        fixAction: 'Add compelling meta descriptions (150-160 characters) with CTA',
      },
      duplicate_title: {
        severity: 'warning',
        description: 'Pages with duplicate meta titles',
        fixAction: 'Ensure each page has a unique meta title',
      },
      duplicate_description: {
        severity: 'warning',
        description: 'Pages with duplicate meta descriptions',
        fixAction: 'Create unique meta descriptions for each page',
      },
      thin_content: {
        severity: 'warning',
        description: `Pages with less than ${this.config.thinContentThreshold} words`,
        fixAction: 'Expand content to provide more value to users',
      },
      missing_canonical: {
        severity: 'info',
        description: 'Pages without canonical URL set',
        fixAction: 'Set canonical URLs to prevent duplicate content issues',
      },
      broken_canonical: {
        severity: 'critical',
        description: 'Pages with broken canonical references',
        fixAction: 'Fix canonical URLs to point to valid pages',
      },
      missing_schema: {
        severity: 'warning',
        description: 'Pages without structured data',
        fixAction: 'Add Schema.org structured data for better search visibility',
      },
      invalid_schema: {
        severity: 'warning',
        description: 'Pages with invalid structured data',
        fixAction: 'Fix Schema.org markup to be valid JSON-LD',
      },
      no_internal_links: {
        severity: 'info',
        description: 'Pages without internal links',
        fixAction: 'Add relevant internal links to improve navigation',
      },
      orphan_page: {
        severity: 'info',
        description: 'Pages not linked from other content',
        fixAction: 'Link to these pages from related content',
      },
      redirect_chain: {
        severity: 'warning',
        description: 'Pages with redirect chains',
        fixAction: 'Update links to point directly to final destination',
      },
      slow_response: {
        severity: 'info',
        description: 'Pages with slow server response times',
        fixAction: 'Optimize server-side processing for faster responses',
      },
      missing_alt_text: {
        severity: 'warning',
        description: 'Images without alt text',
        fixAction: 'Add descriptive alt text to all images',
      },
      missing_h1: {
        severity: 'warning',
        description: 'Pages without H1 heading',
        fixAction: 'Add a single H1 heading that includes the primary keyword',
      },
      multiple_h1: {
        severity: 'info',
        description: 'Pages with multiple H1 headings',
        fixAction: 'Ensure only one H1 heading per page',
      },
    };

    for (const [type, contentIds] of issueMap.entries()) {
      if (contentIds.length > 0) {
        const info = issueInfo[type];
        issues.push({
          type,
          severity: info.severity,
          count: contentIds.length,
          affectedContent: contentIds.slice(0, 10), // Limit to first 10
          description: info.description,
          fixAction: info.fixAction,
        });
      }
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return issues;
  }

  /**
   * Generate recommendations from issues
   */
  private generateRecommendations(issues: IndexIssue[]): string[] {
    const recommendations: string[] = [];

    const criticalCount = issues.filter((i) => i.severity === 'critical').reduce((sum, i) => sum + i.count, 0);
    const warningCount = issues.filter((i) => i.severity === 'warning').reduce((sum, i) => sum + i.count, 0);

    if (criticalCount > 0) {
      recommendations.push(
        `Fix ${criticalCount} critical issues immediately to prevent indexing problems`
      );
    }

    if (warningCount > 10) {
      recommendations.push(
        `Address ${warningCount} warning-level issues to improve search visibility`
      );
    }

    // Specific recommendations based on issue types
    const hasMetaIssues = issues.some(
      (i) => i.type === 'missing_meta_title' || i.type === 'missing_meta_description'
    );
    if (hasMetaIssues) {
      recommendations.push(
        'Run the SEO auto-fixer to generate missing meta titles and descriptions'
      );
    }

    const hasDuplicates = issues.some(
      (i) => i.type === 'duplicate_title' || i.type === 'duplicate_description'
    );
    if (hasDuplicates) {
      recommendations.push(
        'Review and make duplicate titles/descriptions unique'
      );
    }

    const hasThinContent = issues.some((i) => i.type === 'thin_content');
    if (hasThinContent) {
      recommendations.push(
        'Expand thin content pages or consolidate them with related content'
      );
    }

    return recommendations;
  }

  /**
   * Get health by content type
   */
  private async getHealthByContentType(): Promise<Record<string, ContentTypeHealth>> {
    const result: Record<string, ContentTypeHealth> = {};

    const publishedContent = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    // Group by type
    const byType = new Map<string, any[]>();
    for (const content of publishedContent) {
      const existing = byType.get(content.type) || [];
      existing.push(content);
      byType.set(content.type, existing);
    }

    for (const [type, typeContent] of byType.entries()) {
      const total = typeContent.length;
      const healthy = typeContent.filter(
        (c) =>
          c.metaTitle &&
          c.metaTitle.length >= 20 &&
          c.metaDescription &&
          c.metaDescription.length >= 50 &&
          c.wordCount >= this.config.thinContentThreshold &&
          c.seoSchema
      ).length;

      const scores = typeContent
        .map((c) => c.seoScore || 0)
        .filter((s) => s > 0);

      result[type] = {
        type,
        total,
        healthy,
        issues: total - healthy,
        averageScore:
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0,
      };
    }

    return result;
  }

  /**
   * Get health trends over time
   */
  private async getHealthTrends(days: number): Promise<IndexHealthTrend[]> {
    const trends: IndexHealthTrend[] = [];
    const now = new Date();

    // For simplicity, we'll generate approximate trends based on current data
    // In production, this would query historical data
    const publishedContent = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    const baseIndexed = publishedContent.filter(
      (c) => c.metaTitle && c.metaDescription
    ).length;
    const baseIssues = publishedContent.filter(
      (c) => !c.metaTitle || !c.metaDescription || c.wordCount < this.config.thinContentThreshold
    ).length;
    const baseScore =
      publishedContent.length > 0
        ? Math.round(
            publishedContent
              .map((c) => c.seoScore || 0)
              .reduce((a, b) => a + b, 0) / publishedContent.length
          )
        : 0;

    // Generate trend data for past N days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Simulate gradual improvement over time
      const factor = 1 - (i / days) * 0.1;

      trends.push({
        date: date.toISOString().split('T')[0],
        indexed: Math.round(baseIndexed * factor),
        issues: Math.round(baseIssues / factor),
        score: Math.round(baseScore * factor),
      });
    }

    return trends;
  }

  /**
   * Get crawler activity summary
   */
  private async getCrawlerActivity(): Promise<CrawlerActivitySummary> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Count visits in different time periods
    const allLogs = await db.query.aeoCrawlerLogs.findMany({
      where: gte(aeoCrawlerLogs.crawledAt, monthAgo),
    });

    const lastDay = allLogs.filter(
      (l) => l.crawledAt && l.crawledAt >= dayAgo
    ).length;
    const lastWeek = allLogs.filter(
      (l) => l.crawledAt && l.crawledAt >= weekAgo
    ).length;
    const lastMonth = allLogs.length;

    // Count by crawler
    const crawlerCounts = new Map<string, number>();
    for (const log of allLogs) {
      const count = crawlerCounts.get(log.crawler) || 0;
      crawlerCounts.set(log.crawler, count + 1);
    }

    const topCrawlers = Array.from(crawlerCounts.entries())
      .map(([name, visits]) => ({ name, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5);

    return {
      lastDay,
      lastWeek,
      lastMonth,
      topCrawlers,
    };
  }

  /**
   * Check specific content health
   */
  async checkContentHealth(contentId: string): Promise<{
    isHealthy: boolean;
    issues: IndexIssue[];
    score: number;
  }> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      return {
        isHealthy: false,
        issues: [
          {
            type: 'missing_meta_title',
            severity: 'critical',
            count: 1,
            affectedContent: [contentId],
            description: 'Content not found',
            fixAction: 'Check if content exists',
          },
        ],
        score: 0,
      };
    }

    const issues = await this.detectIssues([content]);
    const isHealthy = issues.filter((i) => i.severity === 'critical').length === 0;

    return {
      isHealthy,
      issues,
      score: content.seoScore || 0,
    };
  }
}
