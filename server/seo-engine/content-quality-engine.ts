/**
 * Content Quality Engine - Zero-Result & Thin-Content Detection
 *
 * Analyzes content quality for:
 * - Thin content detection (insufficient word count)
 * - Zero-result pages (pages unlikely to rank)
 * - Content structure issues
 * - Missing SEO elements
 * - Staleness detection
 */

import { db } from '../db';
import {
  contents,
  attractions,
  hotels,
  dining,
  districts,
  articles,
  aeoAnswerCapsules,
} from '../../shared/schema';
import { eq, and, lt, gte, lte, desc, sql } from 'drizzle-orm';
import {
  SEOEngineConfig,
  ContentQualityResult,
  ContentQualityIssue,
  ContentQualityIssueType,
} from './types';

export class ContentQualityEngine {
  private config: SEOEngineConfig;

  // Minimum word counts by content type
  private static MIN_WORD_COUNTS: Record<string, number> = {
    attraction: 1500,
    hotel: 1200,
    article: 1200,
    dining: 1200,
    district: 1500,
    event: 800,
    itinerary: 1500,
    landing_page: 1000,
    case_study: 1500,
    off_plan: 1500,
    transport: 800,
  };

  constructor(config: SEOEngineConfig) {
    this.config = config;
  }

  /**
   * Analyze content quality
   */
  async analyze(contentId: string): Promise<ContentQualityResult> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const issues = await this.detectIssues(content);
    const score = this.calculateScore(content, issues);
    const suggestions = this.generateSuggestions(issues, content);

    const isThinContent = this.isThinContent(content);
    const isZeroResult = this.isZeroResult(content, issues);

    return {
      contentId,
      score,
      wordCount: content.wordCount || 0,
      isThinContent,
      isZeroResult,
      issues,
      suggestions,
    };
  }

  /**
   * Detect quality issues in content
   */
  private async detectIssues(content: any): Promise<ContentQualityIssue[]> {
    const issues: ContentQualityIssue[] = [];

    // Check for thin content
    const minWords = ContentQualityEngine.MIN_WORD_COUNTS[content.type] || 1000;
    if ((content.wordCount || 0) < minWords) {
      issues.push({
        type: 'thin_content',
        severity: content.wordCount < minWords * 0.5 ? 'critical' : 'warning',
        message: `Content has ${content.wordCount || 0} words, minimum recommended is ${minWords}`,
        location: 'content body',
        autoFixable: false,
      });
    }

    // Check for FAQ
    const hasFaq = await this.hasFAQ(content);
    if (!hasFaq) {
      issues.push({
        type: 'no_faq',
        severity: 'warning',
        message: 'No FAQ section found',
        autoFixable: true,
      });
    }

    // Check for answer capsule
    const capsule = await db.query.aeoAnswerCapsules.findFirst({
      where: eq(aeoAnswerCapsules.contentId, content.id),
    });
    if (!capsule) {
      issues.push({
        type: 'missing_answer_capsule',
        severity: 'warning',
        message: 'No answer capsule for AI extraction',
        autoFixable: true,
      });
    }

    // Check for images
    const blocks = content.blocks || [];
    const hasImages =
      content.heroImage ||
      blocks.some(
        (b: any) =>
          b.type === 'image' || b.type === 'gallery' || b.type === 'hero'
      );
    if (!hasImages) {
      issues.push({
        type: 'no_images',
        severity: 'warning',
        message: 'No images found in content',
        autoFixable: false,
      });
    }

    // Check for missing alt text
    if (content.heroImage && !content.heroImageAlt) {
      issues.push({
        type: 'missing_alt_text',
        severity: 'warning',
        message: 'Hero image missing alt text',
        location: 'hero image',
        autoFixable: true,
      });
    }

    // Check for internal links (simplified check)
    const hasInternalLinks = blocks.some((b: any) => {
      const text = JSON.stringify(b);
      return text.includes('href="/') || text.includes('link');
    });
    if (!hasInternalLinks) {
      issues.push({
        type: 'missing_internal_links',
        severity: 'info',
        message: 'No internal links detected',
        autoFixable: true,
      });
    }

    // Check for CTA
    const hasCTA = blocks.some(
      (b: any) =>
        b.type === 'cta' ||
        b.type === 'button' ||
        (b.data?.text || '').toLowerCase().includes('book') ||
        (b.data?.text || '').toLowerCase().includes('explore')
    );
    if (!hasCTA && ['attraction', 'hotel', 'dining', 'event'].includes(content.type)) {
      issues.push({
        type: 'no_cta',
        severity: 'info',
        message: 'No clear call-to-action found',
        autoFixable: false,
      });
    }

    // Check for stale content
    if (content.updatedAt) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - content.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceUpdate > 365) {
        issues.push({
          type: 'stale_content',
          severity: 'warning',
          message: `Content hasn't been updated in ${daysSinceUpdate} days`,
          autoFixable: false,
        });
      }
    }

    // Check H2 structure
    const h2Count = blocks.filter(
      (b: any) =>
        b.type === 'heading' && (b.level === 2 || b.data?.level === 2)
    ).length;
    if (h2Count < 3) {
      issues.push({
        type: 'missing_h2_structure',
        severity: 'warning',
        message: `Only ${h2Count} H2 headings found, recommended 4-8`,
        autoFixable: false,
      });
    }

    // Check paragraph length
    const paragraphs = blocks.filter((b: any) => b.type === 'paragraph');
    const longParagraphs = paragraphs.filter((p: any) => {
      const text = p.content || p.data?.text || '';
      return text.length > 500;
    });
    if (longParagraphs.length > paragraphs.length * 0.3) {
      issues.push({
        type: 'long_paragraphs',
        severity: 'info',
        message: 'Many paragraphs are too long, consider breaking them up',
        autoFixable: false,
      });
    }

    // Check for quick facts
    const typeData = await this.getTypeSpecificData(content);
    if (!typeData?.quickInfoBar || typeData.quickInfoBar.length === 0) {
      issues.push({
        type: 'no_quick_facts',
        severity: 'info',
        message: 'No quick facts/info bar found',
        autoFixable: true,
      });
    }

    return issues;
  }

  /**
   * Check if content has FAQ
   */
  private async hasFAQ(content: any): Promise<boolean> {
    // Check in blocks
    const blocks = content.blocks || [];
    const hasFaqBlock = blocks.some(
      (b: any) => b.type === 'faq' || b.type === 'FAQ'
    );
    if (hasFaqBlock) return true;

    // Check in type-specific data
    const typeData = await this.getTypeSpecificData(content);
    return typeData?.faq && typeData.faq.length > 0;
  }

  /**
   * Get type-specific data
   */
  private async getTypeSpecificData(content: any): Promise<any> {
    switch (content.type) {
      case 'attraction':
        return db.query.attractions.findFirst({
          where: eq(attractions.contentId, content.id),
        });
      case 'hotel':
        return db.query.hotels.findFirst({
          where: eq(hotels.contentId, content.id),
        });
      case 'dining':
        return db.query.dining.findFirst({
          where: eq(dining.contentId, content.id),
        });
      case 'district':
        return db.query.districts.findFirst({
          where: eq(districts.contentId, content.id),
        });
      case 'article':
        return db.query.articles.findFirst({
          where: eq(articles.contentId, content.id),
        });
      default:
        return null;
    }
  }

  /**
   * Check if content is thin
   */
  private isThinContent(content: any): boolean {
    const minWords = ContentQualityEngine.MIN_WORD_COUNTS[content.type] || 1000;
    return (content.wordCount || 0) < minWords * 0.7;
  }

  /**
   * Check if content is a zero-result page
   */
  private isZeroResult(content: any, issues: ContentQualityIssue[]): boolean {
    // Zero-result criteria:
    // 1. Critical thin content
    // 2. Missing meta title AND description
    // 3. No keyword targeting
    // 4. Very low SEO score

    const criticalIssues = issues.filter((i) => i.severity === 'critical');
    if (criticalIssues.length >= 2) return true;

    if (!content.metaTitle && !content.metaDescription) return true;

    if (!content.primaryKeyword && !content.metaTitle) return true;

    if (content.seoScore !== null && content.seoScore < 30) return true;

    return false;
  }

  /**
   * Calculate quality score
   */
  private calculateScore(content: any, issues: ContentQualityIssue[]): number {
    let score = 100;

    // Deduct based on issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 15;
          break;
        case 'warning':
          score -= 8;
          break;
        case 'info':
          score -= 3;
          break;
      }
    }

    // Bonus for good word count
    const minWords = ContentQualityEngine.MIN_WORD_COUNTS[content.type] || 1000;
    if ((content.wordCount || 0) >= minWords * 1.5) {
      score += 10;
    }

    // Bonus for having AEO score
    if (content.aeoScore && content.aeoScore >= 70) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(
    issues: ContentQualityIssue[],
    content: any
  ): string[] {
    const suggestions: string[] = [];

    // Priority suggestions based on critical issues
    const criticalIssues = issues.filter((i) => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      suggestions.push(
        `Fix ${criticalIssues.length} critical issue(s) before publishing`
      );
    }

    // Specific suggestions
    if (issues.some((i) => i.type === 'thin_content')) {
      const minWords = ContentQualityEngine.MIN_WORD_COUNTS[content.type] || 1000;
      const needed = minWords - (content.wordCount || 0);
      suggestions.push(`Add approximately ${needed} more words to meet quality threshold`);
    }

    if (issues.some((i) => i.type === 'no_faq')) {
      suggestions.push('Add 6-10 FAQ items to improve AI extraction and featured snippets');
    }

    if (issues.some((i) => i.type === 'missing_answer_capsule')) {
      suggestions.push('Generate an answer capsule (40-60 words) for AI search optimization');
    }

    if (issues.some((i) => i.type === 'missing_h2_structure')) {
      suggestions.push('Add more H2 headings to improve content structure (aim for 4-8)');
    }

    if (issues.some((i) => i.type === 'stale_content')) {
      suggestions.push('Update content with current information and refresh the publish date');
    }

    if (issues.some((i) => i.type === 'no_images')) {
      suggestions.push('Add relevant images to improve engagement and visual appeal');
    }

    return suggestions;
  }

  /**
   * Find all thin content
   */
  async findThinContent(
    contentType?: string,
    limit: number = 50
  ): Promise<Array<{ id: string; title: string; type: string; wordCount: number }>> {
    let whereCondition = eq(contents.status, 'published');

    if (contentType) {
      whereCondition = and(
        whereCondition,
        eq(contents.type, contentType as any)
      ) as any;
    }

    const allContent = await db.query.contents.findMany({
      where: whereCondition,
    });

    return allContent
      .filter((c) => {
        const minWords = ContentQualityEngine.MIN_WORD_COUNTS[c.type] || 1000;
        return (c.wordCount || 0) < minWords;
      })
      .sort((a, b) => (a.wordCount || 0) - (b.wordCount || 0))
      .slice(0, limit)
      .map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        wordCount: c.wordCount || 0,
      }));
  }

  /**
   * Find zero-result content
   */
  async findZeroResultContent(
    limit: number = 50
  ): Promise<Array<{ id: string; title: string; type: string; reason: string }>> {
    const publishedContent = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    const zeroResults: Array<{ id: string; title: string; type: string; reason: string }> = [];

    for (const content of publishedContent) {
      const issues = await this.detectIssues(content);

      if (this.isZeroResult(content, issues)) {
        // Determine primary reason
        let reason = 'Multiple critical issues';

        if (!content.metaTitle && !content.metaDescription) {
          reason = 'Missing meta title and description';
        } else if (!content.primaryKeyword) {
          reason = 'No keyword targeting';
        } else if (content.seoScore !== null && content.seoScore < 30) {
          reason = 'Very low SEO score';
        } else if (this.isThinContent(content)) {
          reason = 'Critically thin content';
        }

        zeroResults.push({
          id: content.id,
          title: content.title,
          type: content.type,
          reason,
        });

        if (zeroResults.length >= limit) break;
      }
    }

    return zeroResults;
  }

  /**
   * Get content quality summary
   */
  async getSummary(): Promise<{
    totalPublished: number;
    healthy: number;
    thinContent: number;
    zeroResult: number;
    averageScore: number;
    byType: Record<string, { total: number; healthy: number; thin: number }>;
  }> {
    const publishedContent = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    let healthy = 0;
    let thinContent = 0;
    let zeroResult = 0;
    let totalScore = 0;
    let scoredCount = 0;

    const byType: Record<string, { total: number; healthy: number; thin: number }> = {};

    for (const content of publishedContent) {
      // Initialize type tracking
      if (!byType[content.type]) {
        byType[content.type] = { total: 0, healthy: 0, thin: 0 };
      }
      byType[content.type].total++;

      const issues = await this.detectIssues(content);
      const isThin = this.isThinContent(content);
      const isZero = this.isZeroResult(content, issues);

      if (isThin) {
        thinContent++;
        byType[content.type].thin++;
      }

      if (isZero) {
        zeroResult++;
      }

      if (!isThin && !isZero) {
        healthy++;
        byType[content.type].healthy++;
      }

      if (content.seoScore) {
        totalScore += content.seoScore;
        scoredCount++;
      }
    }

    return {
      totalPublished: publishedContent.length,
      healthy,
      thinContent,
      zeroResult,
      averageScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0,
      byType,
    };
  }
}
