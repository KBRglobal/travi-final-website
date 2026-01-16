/**
 * Internal Linking Engine - Smart Internal Link Management
 *
 * Features:
 * - Analyze existing internal links
 * - Suggest relevant internal links
 * - Detect orphan pages
 * - Calculate link equity distribution
 * - Auto-insert contextual links
 */

import { db } from '../db';
import { contents, internalLinks } from '../../shared/schema';
import { eq, and, or, ne, desc, sql, count } from 'drizzle-orm';
import {
  SEOEngineConfig,
  InternalLinkAnalysis,
  InternalLink,
  SuggestedLink,
} from './types';

export class InternalLinkingEngine {
  private config: SEOEngineConfig;

  constructor(config: SEOEngineConfig) {
    this.config = config;
  }

  /**
   * Get links for specific content
   */
  async getLinksForContent(contentId: string): Promise<InternalLinkAnalysis> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    // Get outbound links
    const outboundLinks = await db.query.internalLinks.findMany({
      where: eq(internalLinks.sourceContentId, contentId),
    });

    // Get inbound links
    const inboundLinks = await db.query.internalLinks.findMany({
      where: eq(internalLinks.targetContentId, contentId),
    });

    // Generate suggestions
    const suggestedLinks = await this.generateSuggestions(content);

    // Calculate link score
    const linkScore = this.calculateLinkScore(
      outboundLinks.length,
      inboundLinks.length
    );

    // Check if orphan
    const isOrphan = inboundLinks.length === 0;

    return {
      contentId,
      outboundLinks: outboundLinks.map((l) => ({
        sourceId: l.sourceContentId!,
        targetId: l.targetContentId!,
        anchorText: l.anchorText || '',
        isAutoSuggested: l.isAutoSuggested || false,
      })),
      inboundLinks: inboundLinks.map((l) => ({
        sourceId: l.sourceContentId!,
        targetId: l.targetContentId!,
        anchorText: l.anchorText || '',
        isAutoSuggested: l.isAutoSuggested || false,
      })),
      suggestedLinks,
      linkScore,
      isOrphan,
    };
  }

  /**
   * Generate link suggestions for content
   */
  private async generateSuggestions(content: any): Promise<SuggestedLink[]> {
    const suggestions: SuggestedLink[] = [];

    // Find related content by type and keywords
    const relatedByType = await this.findRelatedByType(content);
    const relatedByKeyword = await this.findRelatedByKeyword(content);

    // Combine and deduplicate
    const allRelated = [...relatedByType, ...relatedByKeyword];
    const seen = new Set<string>();

    for (const related of allRelated) {
      if (seen.has(related.id) || related.id === content.id) continue;
      seen.add(related.id);

      // Check if link already exists
      const existingLink = await db.query.internalLinks.findFirst({
        where: and(
          eq(internalLinks.sourceContentId, content.id),
          eq(internalLinks.targetContentId, related.id)
        ),
      });

      if (!existingLink) {
        suggestions.push({
          targetId: related.id,
          targetTitle: related.title,
          targetType: related.type,
          relevanceScore: related.relevanceScore,
          suggestedAnchor: this.generateAnchorText(related),
          reason: related.reason,
        });
      }
    }

    // Sort by relevance and limit
    return suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);
  }

  /**
   * Find related content by type
   */
  private async findRelatedByType(
    content: any
  ): Promise<Array<{ id: string; title: string; type: string; relevanceScore: number; reason: string }>> {
    // Find content of the same type
    const sameType = await db.query.contents.findMany({
      where: and(
        eq(contents.type, content.type),
        eq(contents.status, 'published'),
        ne(contents.id, content.id)
      ),
      limit: 5,
    });

    return sameType.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.type,
      relevanceScore: 60,
      reason: 'Same content type',
    }));
  }

  /**
   * Find related content by keyword
   */
  private async findRelatedByKeyword(
    content: any
  ): Promise<Array<{ id: string; title: string; type: string; relevanceScore: number; reason: string }>> {
    if (!content.primaryKeyword) {
      return [];
    }

    // Find content with matching keywords
    const keywordLower = content.primaryKeyword.toLowerCase();

    const allContent = await db.query.contents.findMany({
      where: and(eq(contents.status, 'published'), ne(contents.id, content.id)),
      limit: 100,
    });

    const matches: Array<{
      id: string;
      title: string;
      type: string;
      relevanceScore: number;
      reason: string;
    }> = [];

    for (const c of allContent) {
      let score = 0;
      let reason = '';

      // Check primary keyword match
      if (
        c.primaryKeyword &&
        c.primaryKeyword.toLowerCase().includes(keywordLower)
      ) {
        score += 80;
        reason = 'Primary keyword match';
      }

      // Check secondary keywords
      const secondaryKeywords = (c.secondaryKeywords || []) as string[];
      if (
        secondaryKeywords.some((k: string) =>
          k.toLowerCase().includes(keywordLower)
        )
      ) {
        score += 40;
        reason = reason || 'Secondary keyword match';
      }

      // Check title
      if (c.title.toLowerCase().includes(keywordLower)) {
        score += 30;
        reason = reason || 'Title contains keyword';
      }

      if (score > 0) {
        matches.push({
          id: c.id,
          title: c.title,
          type: c.type,
          relevanceScore: Math.min(score, 100),
          reason,
        });
      }
    }

    return matches.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10);
  }

  /**
   * Generate anchor text for a link
   */
  private generateAnchorText(content: any): string {
    // Use primary keyword if available, otherwise use title
    if (content.primaryKeyword) {
      return content.primaryKeyword;
    }

    // Shorten title if too long
    const title = content.title;
    if (title.length > 50) {
      return title.substring(0, 47) + '...';
    }

    return title;
  }

  /**
   * Calculate link score (0-100)
   */
  private calculateLinkScore(outbound: number, inbound: number): number {
    // Ideal: 5-8 outbound, 3+ inbound
    let score = 50;

    // Outbound score
    if (outbound >= 5 && outbound <= 8) {
      score += 25;
    } else if (outbound >= 3 && outbound <= 10) {
      score += 15;
    } else if (outbound > 0) {
      score += 5;
    }

    // Inbound score
    if (inbound >= 5) {
      score += 25;
    } else if (inbound >= 3) {
      score += 20;
    } else if (inbound >= 1) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Create an internal link
   */
  async createLink(
    sourceId: string,
    targetId: string,
    anchorText: string,
    isAutoSuggested: boolean = false
  ): Promise<boolean> {
    try {
      // Check if link already exists
      const existing = await db.query.internalLinks.findFirst({
        where: and(
          eq(internalLinks.sourceContentId, sourceId),
          eq(internalLinks.targetContentId, targetId)
        ),
      });

      if (existing) {
        return false;
      }

      await db.insert(internalLinks).values({
        sourceContentId: sourceId,
        targetContentId: targetId,
        anchorText,
        isAutoSuggested,
      });

      return true;
    } catch (error) {
      console.error('Failed to create internal link:', error);
      return false;
    }
  }

  /**
   * Delete an internal link
   */
  async deleteLink(sourceId: string, targetId: string): Promise<boolean> {
    try {
      await db
        .delete(internalLinks)
        .where(
          and(
            eq(internalLinks.sourceContentId, sourceId),
            eq(internalLinks.targetContentId, targetId)
          )
        );

      return true;
    } catch (error) {
      console.error('Failed to delete internal link:', error);
      return false;
    }
  }

  /**
   * Find orphan pages (pages with no inbound links)
   */
  async findOrphanPages(
    limit: number = 50
  ): Promise<Array<{ id: string; title: string; type: string }>> {
    const publishedContent = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    const orphans: Array<{ id: string; title: string; type: string }> = [];

    for (const content of publishedContent) {
      const inboundCount = await db
        .select({ count: count() })
        .from(internalLinks)
        .where(eq(internalLinks.targetContentId, content.id));

      if ((inboundCount[0]?.count || 0) === 0) {
        orphans.push({
          id: content.id,
          title: content.title,
          type: content.type,
        });

        if (orphans.length >= limit) break;
      }
    }

    return orphans;
  }

  /**
   * Get link equity distribution (which pages have most inbound links)
   */
  async getLinkEquityDistribution(): Promise<
    Array<{ id: string; title: string; type: string; inboundCount: number }>
  > {
    const publishedContent = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    const distribution: Array<{
      id: string;
      title: string;
      type: string;
      inboundCount: number;
    }> = [];

    for (const content of publishedContent) {
      const inboundCount = await db
        .select({ count: count() })
        .from(internalLinks)
        .where(eq(internalLinks.targetContentId, content.id));

      distribution.push({
        id: content.id,
        title: content.title,
        type: content.type,
        inboundCount: inboundCount[0]?.count || 0,
      });
    }

    return distribution.sort((a, b) => b.inboundCount - a.inboundCount);
  }

  /**
   * Auto-suggest links for all content
   */
  async batchGenerateSuggestions(
    limit: number = 100
  ): Promise<Map<string, SuggestedLink[]>> {
    const results = new Map<string, SuggestedLink[]>();

    const publishedContent = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
      limit,
    });

    for (const content of publishedContent) {
      const suggestions = await this.generateSuggestions(content);
      if (suggestions.length > 0) {
        results.set(content.id, suggestions);
      }
    }

    return results;
  }
}
