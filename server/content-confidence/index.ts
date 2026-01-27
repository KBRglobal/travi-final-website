/**
 * Content Confidence Score
 *
 * Scores how "confident" the system is about each content's correctness.
 * Signals: entity verification, fact consistency, source freshness, AI hallucination risk.
 *
 * Feature flag: ENABLE_CONTENT_CONFIDENCE
 */

import { db } from "../db";
import { contentConfidenceScores, contents } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

function isEnabled(): boolean {
  return process.env.ENABLE_CONTENT_CONFIDENCE === "true";
}

export interface ConfidenceResult {
  contentId: string;
  title?: string;
  type?: string;
  score: number;
  label: "high" | "medium" | "low";
  signals: {
    entityVerificationScore: number | null;
    factConsistencyScore: number | null;
    sourceFreshnessScore: number | null;
    hallucinationRiskScore: number | null;
  };
  calculatedAt: string;
}

/**
 * Calculate confidence score for content
 */
export async function calculateConfidence(contentId: string): Promise<ConfidenceResult | null> {
  if (!isEnabled()) return null;

  const [content] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);

  if (!content) return null;

  // Calculate individual signal scores

  // Entity verification: Check if content has structured data
  let entityVerificationScore = 50;
  if (content.seoSchema && Object.keys(content.seoSchema).length > 0) {
    entityVerificationScore = 80;
  }
  if (content.primaryKeyword && content.secondaryKeywords?.length) {
    entityVerificationScore += 10;
  }

  // Fact consistency: Check for complete data fields
  let factConsistencyScore = 50;
  if (content.title && content.metaDescription && content.blocks) {
    factConsistencyScore = 70;
  }
  if (content.answerCapsule) {
    factConsistencyScore += 15;
  }
  if (content.wordCount && content.wordCount > 500) {
    factConsistencyScore += 5;
  }

  // Source freshness: Based on update time
  let sourceFreshnessScore = 100;
  const lastUpdate = content.updatedAt || content.createdAt;
  if (lastUpdate) {
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    sourceFreshnessScore = Math.max(20, 100 - daysSinceUpdate * 2);
  }

  // Hallucination risk: Lower if AI-generated, higher if human-edited
  let hallucinationRiskScore = 70; // Inverted: higher = less risk
  if (content.generatedByAI) {
    hallucinationRiskScore = 40;
    // Boost if writer voice validated
    if (content.writerVoiceScore && content.writerVoiceScore > 80) {
      hallucinationRiskScore = 60;
    }
  } else {
    hallucinationRiskScore = 85;
  }

  // Calculate composite score
  const score = Math.round(
    entityVerificationScore * 0.25 +
      factConsistencyScore * 0.25 +
      sourceFreshnessScore * 0.25 +
      hallucinationRiskScore * 0.25
  );

  // Determine label
  let label: "high" | "medium" | "low" = "medium";
  if (score >= 75) label = "high";
  else if (score < 50) label = "low";

  // Store/update score
  await db
    .insert(contentConfidenceScores)
    .values({
      contentId,
      score,
      label,
      entityVerificationScore,
      factConsistencyScore,
      sourceFreshnessScore,
      hallucinationRiskScore,
    } as any)
    .onConflictDoUpdate({
      target: contentConfidenceScores.contentId,
      set: {
        score,
        label,
        entityVerificationScore,
        factConsistencyScore,
        sourceFreshnessScore,
        hallucinationRiskScore,
        calculatedAt: new Date(),
      } as any,
    });

  return {
    contentId,
    title: content.title,
    type: content.type,
    score,
    label,
    signals: {
      entityVerificationScore,
      factConsistencyScore,
      sourceFreshnessScore,
      hallucinationRiskScore,
    },
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Get confidence score for content
 */
export async function getContentConfidence(contentId: string): Promise<ConfidenceResult | null> {
  if (!isEnabled()) return null;

  const [existing] = await db
    .select({
      contentId: contentConfidenceScores.contentId,
      title: contents.title,
      type: contents.type,
      score: contentConfidenceScores.score,
      label: contentConfidenceScores.label,
      entityVerificationScore: contentConfidenceScores.entityVerificationScore,
      factConsistencyScore: contentConfidenceScores.factConsistencyScore,
      sourceFreshnessScore: contentConfidenceScores.sourceFreshnessScore,
      hallucinationRiskScore: contentConfidenceScores.hallucinationRiskScore,
      calculatedAt: contentConfidenceScores.calculatedAt,
    })
    .from(contentConfidenceScores)
    .leftJoin(contents, eq(contentConfidenceScores.contentId, contents.id))
    .where(eq(contentConfidenceScores.contentId, contentId))
    .limit(1);

  if (!existing) {
    return calculateConfidence(contentId);
  }

  return {
    contentId: existing.contentId,
    title: existing.title || undefined,
    type: existing.type || undefined,
    score: existing.score,
    label: existing.label as "high" | "medium" | "low",
    signals: {
      entityVerificationScore: existing.entityVerificationScore,
      factConsistencyScore: existing.factConsistencyScore,
      sourceFreshnessScore: existing.sourceFreshnessScore,
      hallucinationRiskScore: existing.hallucinationRiskScore,
    },
    calculatedAt: existing.calculatedAt?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Get all content with low confidence
 */
export async function getLowConfidenceContent(limit: number = 50): Promise<ConfidenceResult[]> {
  if (!isEnabled()) return [];

  const results = await db
    .select({
      contentId: contentConfidenceScores.contentId,
      title: contents.title,
      type: contents.type,
      score: contentConfidenceScores.score,
      label: contentConfidenceScores.label,
      entityVerificationScore: contentConfidenceScores.entityVerificationScore,
      factConsistencyScore: contentConfidenceScores.factConsistencyScore,
      sourceFreshnessScore: contentConfidenceScores.sourceFreshnessScore,
      hallucinationRiskScore: contentConfidenceScores.hallucinationRiskScore,
      calculatedAt: contentConfidenceScores.calculatedAt,
    })
    .from(contentConfidenceScores)
    .leftJoin(contents, eq(contentConfidenceScores.contentId, contents.id))
    .where(eq(contentConfidenceScores.label, "low"))
    .orderBy(contentConfidenceScores.score)
    .limit(limit);

  return results.map(r => ({
    contentId: r.contentId,
    title: r.title || undefined,
    type: r.type || undefined,
    score: r.score,
    label: r.label as "high" | "medium" | "low",
    signals: {
      entityVerificationScore: r.entityVerificationScore,
      factConsistencyScore: r.factConsistencyScore,
      sourceFreshnessScore: r.sourceFreshnessScore,
      hallucinationRiskScore: r.hallucinationRiskScore,
    },
    calculatedAt: r.calculatedAt?.toISOString() || new Date().toISOString(),
  }));
}
