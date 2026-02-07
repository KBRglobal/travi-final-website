/**
 * Unified Quality Scorer
 * Combines Quality 108 with Internal Linking to reach full 108 points
 *
 * Original 96 points + Internal Linking 12 points = 108 Total
 */

import { db } from "../../db";
import { contents, internalLinks, seoMetadata } from "../../../shared/schema";
import { eq, count } from "drizzle-orm";
import { log } from "../../lib/logger";

/**
 * Internal Linking Quality Category (12 points)
 */
export interface InternalLinkingScore {
  score: number;
  maxPoints: 12;
  passed: boolean;
  metrics: {
    outboundLinks: number;
    inboundLinks: number;
    orphanStatus: boolean;
    linkDensity: number;
    anchorQuality: number;
  };
  issues: string[];
  suggestions: string[];
}

/**
 * Full Quality 108 Score with Internal Linking
 */
export interface FullQuality108Score {
  totalScore: number;
  maxScore: 108;
  percentage: number;
  grade: "A+" | "A" | "B+" | "B" | "C" | "FAIL";
  passed: boolean;
  categories: {
    // Original 96 points from quality-108.ts
    content: number; // 60 points
    seo: number; // 24 points
    aeo: number; // 12 points
    // NEW: Internal Linking 12 points
    internalLinking: InternalLinkingScore;
  };
  criticalIssues: string[];
  majorIssues: string[];
  minorIssues: string[];
  recommendations: string[];
}

/**
 * Internal Linking Thresholds
 */
const INTERNAL_LINKING_THRESHOLDS = {
  minOutbound: 3, // Minimum outbound links per article
  maxOutbound: 15, // Maximum outbound links (avoid spam)
  minInbound: 1, // At least 1 inbound link (not orphan)
  idealInbound: 5, // Ideal inbound links for authority
  minLinkDensity: 0.5, // Min links per 500 words
  maxLinkDensity: 3, // Max links per 500 words
};

/**
 * Calculate Internal Linking Score (12 points)
 */
export async function calculateInternalLinkingScore(
  contentId: string
): Promise<InternalLinkingScore> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 12; // Start with max

  try {
    // Get content for word count
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      return {
        score: 0,
        maxPoints: 12,
        passed: false,
        metrics: {
          outboundLinks: 0,
          inboundLinks: 0,
          orphanStatus: true,
          linkDensity: 0,
          anchorQuality: 0,
        },
        issues: ["Content not found"],
        suggestions: [],
      };
    }

    // Count outbound links
    const outboundResult = await db
      .select({ count: count() })
      .from(internalLinks)
      .where(eq(internalLinks.sourceContentId, contentId));
    const outboundLinks = outboundResult[0]?.count || 0;

    // Count inbound links
    const inboundResult = await db
      .select({ count: count() })
      .from(internalLinks)
      .where(eq(internalLinks.targetContentId, contentId));
    const inboundLinks = inboundResult[0]?.count || 0;

    // Check orphan status
    const isOrphan = inboundLinks === 0;

    // Calculate link density (links per 500 words)
    const wordCount = content.wordCount || 500;
    const linkDensity = (outboundLinks / wordCount) * 500;

    // Get anchor text quality (check for generic anchors)
    const links = await db
      .select()
      .from(internalLinks)
      .where(eq(internalLinks.sourceContentId, contentId));

    const genericAnchors = new Set(["click here", "read more", "here", "link", "this"]);
    const badAnchors = links.filter(l => genericAnchors.has(l.anchorText?.toLowerCase() || ""));
    const anchorQuality =
      links.length > 0 ? ((links.length - badAnchors.length) / links.length) * 100 : 100;

    // Score calculation

    // 1. Outbound links (4 points)
    if (outboundLinks < INTERNAL_LINKING_THRESHOLDS.minOutbound) {
      score -= 2;
      issues.push(
        `Low outbound links: ${outboundLinks}/${INTERNAL_LINKING_THRESHOLDS.minOutbound} minimum`
      );
      suggestions.push("Add more internal links to related content");
    } else if (outboundLinks > INTERNAL_LINKING_THRESHOLDS.maxOutbound) {
      score -= 1;
      issues.push(`Too many outbound links: ${outboundLinks} (consider reducing)`);
    }

    // 2. Inbound links (4 points)
    if (isOrphan) {
      score -= 4;
      issues.push("ORPHAN PAGE: No inbound links from other content");
      suggestions.push("Add links to this content from related pages");
    } else if (inboundLinks < INTERNAL_LINKING_THRESHOLDS.idealInbound) {
      score -= 1;
      issues.push(
        `Low inbound links: ${inboundLinks}/${INTERNAL_LINKING_THRESHOLDS.idealInbound} ideal`
      );
    }

    // 3. Link density (2 points)
    if (linkDensity < INTERNAL_LINKING_THRESHOLDS.minLinkDensity) {
      score -= 1;
      issues.push(`Low link density: ${linkDensity.toFixed(2)} links per 500 words`);
    } else if (linkDensity > INTERNAL_LINKING_THRESHOLDS.maxLinkDensity) {
      score -= 1;
      issues.push(`High link density: ${linkDensity.toFixed(2)} (may appear spammy)`);
    }

    // 4. Anchor text quality (2 points)
    if (anchorQuality < 70) {
      score -= 2;
      issues.push(`Poor anchor text quality: ${anchorQuality.toFixed(0)}%`);
      suggestions.push("Replace generic anchors like 'click here' with descriptive text");
    } else if (anchorQuality < 90) {
      score -= 1;
      issues.push("Some generic anchor texts detected");
    }

    return {
      score: Math.max(0, score),
      maxPoints: 12,
      passed: score >= 8, // 67% threshold
      metrics: {
        outboundLinks,
        inboundLinks,
        orphanStatus: isOrphan,
        linkDensity,
        anchorQuality,
      },
      issues,
      suggestions,
    };
  } catch (error) {
    log.error("[UnifiedQualityScorer] Internal linking score error:", error);
    return {
      score: 0,
      maxPoints: 12,
      passed: false,
      metrics: {
        outboundLinks: 0,
        inboundLinks: 0,
        orphanStatus: true,
        linkDensity: 0,
        anchorQuality: 0,
      },
      issues: ["Error calculating internal linking score"],
      suggestions: [],
    };
  }
}

/**
 * Calculate Full Quality 108 Score
 * Combines original quality-108 categories with internal linking
 */
export async function calculateFullQuality108(
  contentId: string,
  existingScores?: {
    contentScore?: number;
    seoScore?: number;
    aeoScore?: number;
  }
): Promise<FullQuality108Score> {
  const criticalIssues: string[] = [];
  const majorIssues: string[] = [];
  const minorIssues: string[] = [];
  const recommendations: string[] = [];

  // Get internal linking score
  const internalLinkingScore = await calculateInternalLinkingScore(contentId);

  // Use existing scores or defaults
  const contentScore = existingScores?.contentScore ?? 0;
  const seoScore = existingScores?.seoScore ?? 0;
  const aeoScore = existingScores?.aeoScore ?? 0;

  // Calculate total (96 points existing + 12 internal linking = 108)
  const totalScore = contentScore + seoScore + aeoScore + internalLinkingScore.score;
  const percentage = Math.round((totalScore / 108) * 100);

  // Categorize issues
  if (internalLinkingScore.metrics.orphanStatus) {
    criticalIssues.push("Page is orphaned (no inbound links)");
  }

  internalLinkingScore.issues.forEach(issue => {
    if (issue.includes("ORPHAN")) {
      criticalIssues.push(issue);
    } else if (issue.includes("minimum") || issue.includes("Poor")) {
      majorIssues.push(issue);
    } else {
      minorIssues.push(issue);
    }
  });

  recommendations.push(...internalLinkingScore.suggestions);

  // Determine grade
  let grade: FullQuality108Score["grade"];
  if (totalScore >= 104) grade = "A+";
  else if (totalScore >= 98) grade = "A";
  else if (totalScore >= 92) grade = "B+";
  else if (totalScore >= 86) grade = "B";
  else if (totalScore >= 75) grade = "C";
  else grade = "FAIL";

  // Pass criteria: 75/108 (70%) minimum, no critical issues
  const passed = totalScore >= 75 && criticalIssues.length === 0;

  return {
    totalScore,
    maxScore: 108,
    percentage,
    grade,
    passed,
    categories: {
      content: contentScore,
      seo: seoScore,
      aeo: aeoScore,
      internalLinking: internalLinkingScore,
    },
    criticalIssues,
    majorIssues,
    minorIssues,
    recommendations,
  };
}

/**
 * Store Quality 108 score in seo_metadata table
 */
export async function storeQuality108Score(
  contentId: string,
  score: FullQuality108Score
): Promise<void> {
  try {
    const now = new Date();

    await db
      .insert(seoMetadata)
      .values({
        contentId,
        quality108Total: score.totalScore,
        quality108Breakdown: score.categories as any,
        quality108Grade: score.grade,
        quality108Passed: score.passed,
        aeoScore: score.categories.aeo,
        internalLinksOut: score.categories.internalLinking.metrics.outboundLinks,
        internalLinksIn: score.categories.internalLinking.metrics.inboundLinks,
        isOrphan: score.categories.internalLinking.metrics.orphanStatus,
        lastAuditAt: now,
        updatedAt: now,
      } as any)
      .onConflictDoUpdate({
        target: seoMetadata.contentId,
        set: {
          quality108Total: score.totalScore,
          quality108Breakdown: score.categories as any,
          quality108Grade: score.grade,
          quality108Passed: score.passed,
          aeoScore: score.categories.aeo,
          internalLinksOut: score.categories.internalLinking.metrics.outboundLinks,
          internalLinksIn: score.categories.internalLinking.metrics.inboundLinks,
          isOrphan: score.categories.internalLinking.metrics.orphanStatus,
          lastAuditAt: now,
          updatedAt: now,
        } as any,
      });

    log.info(
      `[UnifiedQualityScorer] Stored Quality 108 score for ${contentId}: ${score.totalScore}/108`
    );
  } catch (error) {
    log.error("[UnifiedQualityScorer] Store score error:", error);
  }
}

/**
 * Get Quality 108 score from database
 */
export async function getStoredQuality108Score(
  contentId: string
): Promise<FullQuality108Score | null> {
  try {
    const metadata = await db.query.seoMetadata.findFirst({
      where: eq(seoMetadata.contentId, contentId),
    });

    if (!metadata?.quality108Breakdown) return null;

    return metadata.quality108Breakdown as any as FullQuality108Score;
  } catch (error) {
    log.error("[UnifiedQualityScorer] Get score error:", error);
    return null;
  }
}
