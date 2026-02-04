/**
 * Internal Linking Analyzer
 * Detect orphan pages, suggest links, analyze link equity distribution
 */

import { db } from "../../db";
import { contents, internalLinks } from "../../../shared/schema";
import { eq, and, isNull, desc, sql, count, ne } from "drizzle-orm";
import { log } from "../../lib/logger";

export interface OrphanPageReport {
  contentId: string;
  title: string;
  type: string;
  slug: string;
  publishedAt: Date | null;
  suggestedSources: Array<{
    contentId: string;
    title: string;
    relevanceScore: number;
    suggestedAnchor: string;
  }>;
}

export interface LinkEquityNode {
  contentId: string;
  title: string;
  inboundCount: number;
  outboundCount: number;
  pageRankScore: number; // Simplified PageRank approximation
  isHub: boolean; // Many outbound links
  isAuthority: boolean; // Many inbound links
}

export interface LinkGraphAnalysis {
  totalPages: number;
  totalLinks: number;
  averageOutbound: number;
  averageInbound: number;
  orphanPages: number;
  deadEndPages: number; // Pages with no outbound links
  hubPages: LinkEquityNode[];
  authorityPages: LinkEquityNode[];
  weaklyLinkedPages: LinkEquityNode[];
}

export class InternalLinkingAnalyzer {
  /**
   * Find all orphan pages (no inbound links)
   */
  async findOrphanPages(limit: number = 50): Promise<OrphanPageReport[]> {
    try {
      // Get all published content
      const allContent = await db
        .select({
          id: contents.id,
          title: contents.title,
          type: contents.type,
          slug: contents.slug,
          publishedAt: contents.publishedAt,
        })
        .from(contents)
        .where(eq(contents.status, "published"))
        .orderBy(desc(contents.publishedAt));

      const orphans: OrphanPageReport[] = [];

      for (const content of allContent) {
        // Check if has any inbound links
        const inboundResult = await db
          .select({ count: count() })
          .from(internalLinks)
          .where(eq(internalLinks.targetContentId, content.id));

        if ((inboundResult[0]?.count || 0) === 0) {
          // Find suggested sources
          const suggestions = await this.findLinkSuggestions(
            content.id,
            content.type,
            content.title
          );

          orphans.push({
            contentId: content.id,
            title: content.title,
            type: content.type,
            slug: content.slug || "",
            publishedAt: content.publishedAt,
            suggestedSources: suggestions,
          });

          if (orphans.length >= limit) break;
        }
      }

      return orphans;
    } catch (error) {
      log.error("[InternalLinkingAnalyzer] Find orphans error:", error);
      return [];
    }
  }

  /**
   * Find pages that could link to a target
   */
  private async findLinkSuggestions(
    targetId: string,
    targetType: string,
    targetTitle: string
  ): Promise<OrphanPageReport["suggestedSources"]> {
    try {
      // Find related content that could link here
      const relatedContent = await db
        .select({
          id: contents.id,
          title: contents.title,
          type: contents.type,
        })
        .from(contents)
        .where(and(eq(contents.status, "published"), ne(contents.id, targetId)))
        .limit(20);

      const suggestions: OrphanPageReport["suggestedSources"] = [];

      for (const related of relatedContent) {
        // Check if link already exists
        const existingLink = await db
          .select({ id: internalLinks.id })
          .from(internalLinks)
          .where(
            and(
              eq(internalLinks.sourceContentId, related.id),
              eq(internalLinks.targetContentId, targetId)
            )
          )
          .limit(1);

        if (existingLink.length === 0) {
          // Calculate relevance score based on type and title similarity
          const relevance = this.calculateRelevance(related, {
            type: targetType,
            title: targetTitle,
          });

          if (relevance > 30) {
            suggestions.push({
              contentId: related.id,
              title: related.title,
              relevanceScore: relevance,
              suggestedAnchor: this.generateAnchorText(targetTitle),
            });
          }
        }
      }

      return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
    } catch (error) {
      log.error("[InternalLinkingAnalyzer] Find suggestions error:", error);
      return [];
    }
  }

  /**
   * Calculate relevance between two content items
   */
  private calculateRelevance(
    source: { type: string; title: string },
    target: { type: string; title: string }
  ): number {
    let score = 0;

    // Same type bonus
    if (source.type === target.type) {
      score += 30;
    }

    // Title word overlap
    const sourceWords = new Set(source.title.toLowerCase().split(/\s+/));
    const targetWords = target.title.toLowerCase().split(/\s+/);
    const overlap = targetWords.filter(w => sourceWords.has(w) && w.length > 3);
    score += Math.min(overlap.length * 15, 50);

    // Type relationship bonus
    const relatedTypes: Record<string, string[]> = {
      attraction: ["district", "itinerary", "article"],
      hotel: ["district", "article"],
      dining: ["district", "article"],
      district: ["attraction", "hotel", "dining"],
      article: ["attraction", "hotel", "dining", "district"],
      itinerary: ["attraction", "district"],
    };

    if (relatedTypes[source.type]?.includes(target.type)) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Generate anchor text from title
   */
  private generateAnchorText(title: string): string {
    // Remove common prefixes and clean up
    return title
      .replace(/^(the|a|an)\s+/i, "")
      .replace(/\s*[-–—]\s*.+$/, "") // Remove subtitle
      .substring(0, 60);
  }

  /**
   * Analyze full link graph
   */
  async analyzeLinkGraph(): Promise<LinkGraphAnalysis> {
    try {
      // Get total published pages
      const pagesResult = await db
        .select({ count: count() })
        .from(contents)
        .where(eq(contents.status, "published"));
      const totalPages = pagesResult[0]?.count || 0;

      // Get total links
      const linksResult = await db.select({ count: count() }).from(internalLinks);
      const totalLinks = linksResult[0]?.count || 0;

      // Calculate averages
      const averageOutbound = totalPages > 0 ? totalLinks / totalPages : 0;
      const averageInbound = totalPages > 0 ? totalLinks / totalPages : 0;

      // Count orphan pages
      const orphans = await this.findOrphanPages(1000);
      const orphanPages = orphans.length;

      // Find dead end pages (no outbound links)
      const deadEndResult = await db
        .select({ id: contents.id })
        .from(contents)
        .where(eq(contents.status, "published"));

      let deadEndPages = 0;
      for (const page of deadEndResult) {
        const outbound = await db
          .select({ count: count() })
          .from(internalLinks)
          .where(eq(internalLinks.sourceContentId, page.id));
        if ((outbound[0]?.count || 0) === 0) {
          deadEndPages++;
        }
      }

      // Find hub pages (many outbound links)
      const hubPages = await this.findHubPages();

      // Find authority pages (many inbound links)
      const authorityPages = await this.findAuthorityPages();

      // Find weakly linked pages
      const weaklyLinkedPages = await this.findWeaklyLinkedPages();

      return {
        totalPages,
        totalLinks,
        averageOutbound,
        averageInbound,
        orphanPages,
        deadEndPages,
        hubPages,
        authorityPages,
        weaklyLinkedPages,
      };
    } catch (error) {
      log.error("[InternalLinkingAnalyzer] Analyze graph error:", error);
      return {
        totalPages: 0,
        totalLinks: 0,
        averageOutbound: 0,
        averageInbound: 0,
        orphanPages: 0,
        deadEndPages: 0,
        hubPages: [],
        authorityPages: [],
        weaklyLinkedPages: [],
      };
    }
  }

  /**
   * Find hub pages (many outbound links)
   */
  private async findHubPages(): Promise<LinkEquityNode[]> {
    try {
      const result = await db
        .select({
          sourceContentId: internalLinks.sourceContentId,
          count: count(),
        })
        .from(internalLinks)
        .groupBy(internalLinks.sourceContentId)
        .orderBy(desc(count()))
        .limit(10);

      const hubs: LinkEquityNode[] = [];

      for (const row of result) {
        if (!row.sourceContentId) continue;

        const content = await db.query.contents.findFirst({
          where: eq(contents.id, row.sourceContentId),
        });

        if (content) {
          hubs.push({
            contentId: content.id,
            title: content.title,
            inboundCount: 0, // Will be filled later if needed
            outboundCount: row.count,
            pageRankScore: row.count * 0.1,
            isHub: row.count > 10,
            isAuthority: false,
          });
        }
      }

      return hubs;
    } catch (error) {
      log.error("[InternalLinkingAnalyzer] Find hubs error:", error);
      return [];
    }
  }

  /**
   * Find authority pages (many inbound links)
   */
  private async findAuthorityPages(): Promise<LinkEquityNode[]> {
    try {
      const result = await db
        .select({
          targetContentId: internalLinks.targetContentId,
          count: count(),
        })
        .from(internalLinks)
        .groupBy(internalLinks.targetContentId)
        .orderBy(desc(count()))
        .limit(10);

      const authorities: LinkEquityNode[] = [];

      for (const row of result) {
        if (!row.targetContentId) continue;

        const content = await db.query.contents.findFirst({
          where: eq(contents.id, row.targetContentId),
        });

        if (content) {
          authorities.push({
            contentId: content.id,
            title: content.title,
            inboundCount: row.count,
            outboundCount: 0,
            pageRankScore: row.count * 0.15,
            isHub: false,
            isAuthority: row.count > 5,
          });
        }
      }

      return authorities;
    } catch (error) {
      log.error("[InternalLinkingAnalyzer] Find authorities error:", error);
      return [];
    }
  }

  /**
   * Find weakly linked pages (low inbound + outbound)
   */
  private async findWeaklyLinkedPages(): Promise<LinkEquityNode[]> {
    try {
      const allContent = await db
        .select({
          id: contents.id,
          title: contents.title,
        })
        .from(contents)
        .where(eq(contents.status, "published"))
        .limit(100);

      const weakPages: LinkEquityNode[] = [];

      for (const content of allContent) {
        const inbound = await db
          .select({ count: count() })
          .from(internalLinks)
          .where(eq(internalLinks.targetContentId, content.id));

        const outbound = await db
          .select({ count: count() })
          .from(internalLinks)
          .where(eq(internalLinks.sourceContentId, content.id));

        const inboundCount = inbound[0]?.count || 0;
        const outboundCount = outbound[0]?.count || 0;

        // Weakly linked if total links < 3
        if (inboundCount + outboundCount < 3) {
          weakPages.push({
            contentId: content.id,
            title: content.title,
            inboundCount,
            outboundCount,
            pageRankScore: inboundCount * 0.15 + outboundCount * 0.1,
            isHub: false,
            isAuthority: false,
          });
        }
      }

      return weakPages.sort((a, b) => a.pageRankScore - b.pageRankScore).slice(0, 20);
    } catch (error) {
      log.error("[InternalLinkingAnalyzer] Find weak pages error:", error);
      return [];
    }
  }

  /**
   * Auto-suggest links for a content item
   */
  async suggestLinksForContent(
    contentId: string,
    maxSuggestions: number = 10
  ): Promise<
    Array<{
      targetId: string;
      targetTitle: string;
      targetSlug: string;
      relevanceScore: number;
      suggestedAnchor: string;
      reason: string;
    }>
  > {
    try {
      const content = await db.query.contents.findFirst({
        where: eq(contents.id, contentId),
      });

      if (!content) return [];

      // Get existing outbound links
      const existingLinks = await db
        .select({ targetId: internalLinks.targetContentId })
        .from(internalLinks)
        .where(eq(internalLinks.sourceContentId, contentId));

      const existingTargetIds = new Set(existingLinks.map(l => l.targetId));

      // Find candidates
      const candidates = await db
        .select({
          id: contents.id,
          title: contents.title,
          slug: contents.slug,
          type: contents.type,
        })
        .from(contents)
        .where(and(eq(contents.status, "published"), ne(contents.id, contentId)))
        .limit(50);

      const suggestions: Array<{
        targetId: string;
        targetTitle: string;
        targetSlug: string;
        relevanceScore: number;
        suggestedAnchor: string;
        reason: string;
      }> = [];

      for (const candidate of candidates) {
        if (existingTargetIds.has(candidate.id)) continue;

        const relevance = this.calculateRelevance(
          { type: content.type, title: content.title },
          { type: candidate.type, title: candidate.title }
        );

        if (relevance > 40) {
          let reason = "Related content";
          if (content.type === candidate.type) {
            reason = "Same content type";
          } else if (relevance > 70) {
            reason = "Highly relevant topic";
          }

          suggestions.push({
            targetId: candidate.id,
            targetTitle: candidate.title,
            targetSlug: candidate.slug || "",
            relevanceScore: relevance,
            suggestedAnchor: this.generateAnchorText(candidate.title),
            reason,
          });
        }
      }

      return suggestions
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxSuggestions);
    } catch (error) {
      log.error("[InternalLinkingAnalyzer] Suggest links error:", error);
      return [];
    }
  }
}

export const internalLinkingAnalyzer = new InternalLinkingAnalyzer();
