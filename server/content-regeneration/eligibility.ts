/**
 * Content Regeneration - Eligibility Rules
 *
 * Determines which content is eligible for regeneration.
 */

import { db } from '../db';
import { contents as content } from '@shared/schema';
import { eq, sql, lt, and } from 'drizzle-orm';
import { EligibilityResult, EligibilityReason } from './types';

const contentEntities = (db as any).contentEntities || { contentId: 'contentId' };
const contentToSearchIndex = (db as any).contentToSearchIndex || { contentId: 'contentId' };

// Thresholds for eligibility
const THRESHOLDS = {
  STALE_DAYS: 180,
  LOW_ICE_SCORE: 40,
  THIN_CONTENT_WORDS: 200,
  POOR_SEARCH_CTR: 0.02, // 2% CTR threshold
};

/**
 * Check if content is eligible for regeneration.
 */
export async function checkEligibility(contentId: string): Promise<EligibilityResult | null> {
  const contentRecord = await (db.query as any).contents.findFirst({
    where: eq(content.id, contentId),
  });

  if (!contentRecord) {
    return null;
  }

  const reasons: EligibilityReason[] = [];
  const details: Record<string, unknown> = {};

  // Check stale content
  const staleCheck = await checkStaleContent(contentRecord);
  if (staleCheck.eligible) {
    reasons.push('stale_content');
    details.stale = staleCheck.details;
  }

  // Check low ICE score
  const iceCheck = await checkLowIceScore(contentRecord);
  if (iceCheck.eligible) {
    reasons.push('low_ice_score');
    details.ice = iceCheck.details;
  }

  // Check no entities
  const entityCheck = await checkNoEntities(contentId);
  if (entityCheck.eligible) {
    reasons.push('no_entities');
    details.entities = entityCheck.details;
  }

  // Check poor search performance
  const searchCheck = await checkPoorSearchPerformance(contentId);
  if (searchCheck.eligible) {
    reasons.push('poor_search_performance');
    details.search = searchCheck.details;
  }

  // Check thin content
  const thinCheck = checkThinContent(contentRecord);
  if (thinCheck.eligible) {
    reasons.push('thin_content');
    details.thin = thinCheck.details;
  }

  // Check no AEO capsule
  const aeoCheck = checkNoAeoCapsule(contentRecord);
  if (aeoCheck.eligible) {
    reasons.push('no_aeo_capsule');
    details.aeo = aeoCheck.details;
  }

  // Calculate urgency score
  const score = calculateUrgencyScore(reasons, details);

  return {
    contentId,
    eligible: reasons.length > 0,
    reasons,
    score,
    details,
    evaluatedAt: new Date(),
  };
}

/**
 * Check if content is stale.
 */
async function checkStaleContent(
  contentRecord: typeof content.$inferSelect
): Promise<{ eligible: boolean; details: Record<string, unknown> }> {
  const updatedAt = contentRecord.updatedAt || contentRecord.createdAt;
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    eligible: daysSinceUpdate >= THRESHOLDS.STALE_DAYS,
    details: {
      daysSinceUpdate,
      threshold: THRESHOLDS.STALE_DAYS,
    },
  };
}

/**
 * Check if ICE score is low.
 */
async function checkLowIceScore(
  contentRecord: typeof content.$inferSelect
): Promise<{ eligible: boolean; details: Record<string, unknown> }> {
  const iceScore = (contentRecord as { iceScore?: number }).iceScore ?? 0;

  return {
    eligible: iceScore > 0 && iceScore < THRESHOLDS.LOW_ICE_SCORE,
    details: {
      iceScore,
      threshold: THRESHOLDS.LOW_ICE_SCORE,
    },
  };
}

/**
 * Check if content has no entities.
 */
async function checkNoEntities(
  contentId: string
): Promise<{ eligible: boolean; details: Record<string, unknown> }> {
  const entityLinks = await db
    .select({ count: sql<number>`count(*)` })
    .from(contentEntities)
    .where(eq(contentEntities.contentId, contentId));

  const count = entityLinks[0]?.count ?? 0;

  return {
    eligible: count === 0,
    details: {
      entityCount: count,
    },
  };
}

/**
 * Check poor search performance.
 */
async function checkPoorSearchPerformance(
  contentId: string
): Promise<{ eligible: boolean; details: Record<string, unknown> }> {
  // Check if content is indexed but has poor CTR
  const indexed = await (db.query as any).contentToSearchIndex?.findFirst?.({
    where: eq(contentToSearchIndex.contentId, contentId),
  });

  if (!indexed) {
    return { eligible: false, details: { indexed: false } };
  }

  // Get search performance metrics (simplified - would normally query analytics)
  const impressions = (indexed as { impressions?: number }).impressions ?? 0;
  const clicks = (indexed as { clicks?: number }).clicks ?? 0;
  const ctr = impressions > 0 ? clicks / impressions : 0;

  return {
    eligible: impressions > 100 && ctr < THRESHOLDS.POOR_SEARCH_CTR,
    details: {
      impressions,
      clicks,
      ctr,
      threshold: THRESHOLDS.POOR_SEARCH_CTR,
    },
  };
}

/**
 * Check if content is thin.
 */
function checkThinContent(
  contentRecord: typeof content.$inferSelect
): { eligible: boolean; details: Record<string, unknown> } {
  const blocks = (contentRecord.blocks as Array<{ type: string; data?: { text?: string } }>) || [];
  let wordCount = 0;

  for (const block of blocks) {
    if (block.type === 'paragraph' || block.type === 'text') {
      const text = String(block.data?.text || '');
      wordCount += text.split(/\s+/).filter(w => w.length > 0).length;
    }
  }

  return {
    eligible: wordCount < THRESHOLDS.THIN_CONTENT_WORDS,
    details: {
      wordCount,
      threshold: THRESHOLDS.THIN_CONTENT_WORDS,
    },
  };
}

/**
 * Check if content lacks AEO capsule.
 */
function checkNoAeoCapsule(
  contentRecord: typeof content.$inferSelect
): { eligible: boolean; details: Record<string, unknown> } {
  const blocks = (contentRecord.blocks as Array<{ type: string }>) || [];
  const hasAeoCapsule = blocks.some(
    b => b.type === 'aeo_capsule' || b.type === 'answer_capsule'
  );

  return {
    eligible: !hasAeoCapsule,
    details: {
      hasAeoCapsule,
    },
  };
}

/**
 * Calculate urgency score (0-100).
 */
function calculateUrgencyScore(
  reasons: EligibilityReason[],
  details: Record<string, unknown>
): number {
  let score = 0;

  // Weight each reason
  const weights: Record<EligibilityReason, number> = {
    stale_content: 15,
    low_ice_score: 25,
    no_entities: 20,
    poor_search_performance: 30,
    thin_content: 20,
    no_aeo_capsule: 10,
  };

  for (const reason of reasons) {
    score += weights[reason];
  }

  return Math.min(100, score);
}

/**
 * Get all content eligible for regeneration.
 */
export async function getEligibleContent(
  limit: number = 50,
  minScore: number = 30
): Promise<EligibilityResult[]> {
  // Get published content
  const publishedContent = await (db.query as any).contents.findMany({
    where: eq(content.status, 'published'),
    columns: { id: true },
    limit: limit * 2,
  });

  const results: EligibilityResult[] = [];

  for (const item of publishedContent) {
    if (results.length >= limit) break;

    const eligibility = await checkEligibility(item.id);
    if (eligibility && eligibility.eligible && eligibility.score >= minScore) {
      results.push(eligibility);
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
