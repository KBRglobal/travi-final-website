/**
 * Internal Link Opportunity Engine
 *
 * Suggests optimal internal links based on graph + entity overlap.
 * Uses PageRank-like scoring while avoiding over-linking.
 *
 * Feature flag: ENABLE_LINK_OPPORTUNITIES
 */

import { db } from "../db";
import { contents, contentDependencies } from "@shared/schema";
import { eq, ne, and, sql, inArray, desc } from "drizzle-orm";

function isEnabled(): boolean {
  return process.env.ENABLE_LINK_OPPORTUNITIES === "true";
}

// Bounded cache
const CACHE_MAX_SIZE = 200;
const opportunityCache = new Map<string, { data: LinkOpportunity[]; ts: number }>();

export interface LinkOpportunity {
  targetContentId: string;
  targetTitle: string;
  targetType: string;
  targetSlug: string;
  score: number;
  reason: string;
  existingLinkCount: number;
  suggestedAnchor?: string;
}

export interface LinkOpportunitiesResult {
  contentId: string;
  contentTitle: string;
  opportunities: LinkOpportunity[];
  existingOutboundLinks: number;
  maxRecommendedLinks: number;
}

/**
 * Calculate link score based on multiple factors
 */
function calculateLinkScore(
  sourceContent: any,
  targetContent: any,
  existingLinksToTarget: number,
  sharedKeywords: number
): number {
  let score = 50; // Base score

  // Boost for shared keywords
  score += sharedKeywords * 10;

  // Penalty for over-linked targets
  if (existingLinksToTarget > 10) {
    score -= (existingLinksToTarget - 10) * 5;
  }

  // Boost for same type (e.g., hotel linking to hotel)
  if (sourceContent.type === targetContent.type) {
    score += 15;
  }

  // Boost for published content
  if (targetContent.status === "published") {
    score += 20;
  }

  // Boost for high SEO score targets
  if (targetContent.seoScore && targetContent.seoScore > 80) {
    score += 10;
  }

  // Boost for high AEO score targets
  if (targetContent.aeoScore && targetContent.aeoScore > 80) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get shared keywords between two content pieces
 */
function getSharedKeywords(source: any, target: any): string[] {
  const sourceKeywords = new Set<string>(
    [
      source.primaryKeyword?.toLowerCase(),
      ...(source.secondaryKeywords || []).map((k: string) => k.toLowerCase()),
      ...(source.lsiKeywords || []).map((k: string) => k.toLowerCase()),
    ].filter(Boolean)
  );

  const targetKeywords = [
    target.primaryKeyword?.toLowerCase(),
    ...(target.secondaryKeywords || []).map((k: string) => k.toLowerCase()),
    ...(target.lsiKeywords || []).map((k: string) => k.toLowerCase()),
  ].filter(Boolean);

  return targetKeywords.filter((k: string) => sourceKeywords.has(k));
}

/**
 * Generate suggested anchor text
 */
function suggestAnchor(targetContent: any): string {
  if (targetContent.primaryKeyword) {
    return targetContent.primaryKeyword;
  }
  return targetContent.title;
}

/**
 * Get link opportunities for a content piece
 */
export async function getLinkOpportunities(
  contentId: string,
  limit: number = 20
): Promise<LinkOpportunitiesResult> {
  if (!isEnabled()) {
    return {
      contentId,
      contentTitle: "",
      opportunities: [],
      existingOutboundLinks: 0,
      maxRecommendedLinks: 10,
    };
  }

  // Check cache
  const cached = opportunityCache.get(contentId);
  if (cached && Date.now() - cached.ts < 300000) {
    return {
      contentId,
      contentTitle: "",
      opportunities: cached.data.slice(0, limit),
      existingOutboundLinks: 0,
      maxRecommendedLinks: 10,
    };
  }

  // Get source content
  const [sourceContent] = await db
    .select()
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  if (!sourceContent) {
    return {
      contentId,
      contentTitle: "",
      opportunities: [],
      existingOutboundLinks: 0,
      maxRecommendedLinks: 10,
    };
  }

  // Get existing outbound links
  const existingLinks = await db
    .select({ targetId: contentDependencies.targetId })
    .from(contentDependencies)
    .where(
      and(
        eq(contentDependencies.sourceId, contentId),
        eq(contentDependencies.dependencyType, "links")
      )
    );

  const existingTargetIds = new Set(existingLinks.map(l => l.targetId));

  // Get potential targets (same type or related types)
  const relatedTypes = getRelatedTypes(sourceContent.type);

  const potentialTargets = await db
    .select()
    .from(contents)
    .where(
      and(
        ne(contents.id, contentId),
        eq(contents.status, "published"),
        sql`${contents.type} IN (${sql.join(
          relatedTypes.map(t => sql`${t}`),
          sql`, `
        )})`
      )
    )
    .limit(100);

  // Get inbound link counts for targets (to avoid over-linking)
  const targetIds = potentialTargets.map(t => t.id);
  const inboundCounts = await db
    .select({
      targetId: contentDependencies.targetId,
      count: sql<number>`COUNT(*)`,
    })
    .from(contentDependencies)
    .where(inArray(contentDependencies.targetId, targetIds))
    .groupBy(contentDependencies.targetId);

  const inboundMap = new Map(inboundCounts.map(c => [c.targetId, c.count]));

  // Score and rank opportunities
  const opportunities: LinkOpportunity[] = [];

  for (const target of potentialTargets) {
    // Skip if already linked
    if (existingTargetIds.has(target.id)) continue;

    const sharedKeywords = getSharedKeywords(sourceContent, target);
    const existingLinkCount = inboundMap.get(target.id) || 0;
    const score = calculateLinkScore(
      sourceContent,
      target,
      existingLinkCount,
      sharedKeywords.length
    );

    if (score >= 30) {
      opportunities.push({
        targetContentId: target.id,
        targetTitle: target.title,
        targetType: target.type,
        targetSlug: target.slug,
        score,
        reason: generateReason(sharedKeywords, sourceContent.type, target.type),
        existingLinkCount,
        suggestedAnchor: suggestAnchor(target),
      });
    }
  }

  // Sort by score
  opportunities.sort((a, b) => b.score - a.score);

  // Cache results
  opportunityCache.set(contentId, { data: opportunities, ts: Date.now() });

  // Prune cache
  if (opportunityCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(opportunityCache.entries());
    entries.sort((a, b) => a[1].ts - b[1].ts);
    entries.slice(0, 50).forEach(([k]) => opportunityCache.delete(k));
  }

  return {
    contentId,
    contentTitle: sourceContent.title,
    opportunities: opportunities.slice(0, limit),
    existingOutboundLinks: existingLinks.length,
    maxRecommendedLinks: 10,
  };
}

function getRelatedTypes(type: string): string[] {
  const typeGroups: Record<string, string[]> = {
    hotel: ["hotel", "dining", "attraction", "district"],
    attraction: ["attraction", "hotel", "district", "transport"],
    dining: ["dining", "hotel", "district"],
    district: ["district", "hotel", "attraction", "dining"],
    article: ["article", "attraction", "hotel", "dining", "district"],
    transport: ["transport", "district", "attraction"],
    event: ["event", "attraction", "district"],
    itinerary: ["itinerary", "attraction", "hotel", "dining"],
  };

  return typeGroups[type] || [type, "article"];
}

function generateReason(sharedKeywords: string[], sourceType: string, targetType: string): string {
  const reasons: string[] = [];

  if (sharedKeywords.length > 0) {
    reasons.push(`Shares keywords: ${sharedKeywords.slice(0, 3).join(", ")}`);
  }

  if (sourceType === targetType) {
    reasons.push(`Same content type (${sourceType})`);
  } else {
    reasons.push(`Related content type (${targetType})`);
  }

  return reasons.join(". ");
}
