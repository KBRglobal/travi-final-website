/**
 * Autonomous Growth Recommendation Engine
 *
 * Generates weekly prioritized growth recommendations.
 * Inputs: search gaps, revenue intel, decay + confidence scores, zero-search clusters.
 * Outputs: ranked recommendations with effort vs impact estimation.
 *
 * Feature flag: ENABLE_GROWTH_RECOMMENDATIONS
 */

import { db } from "../db";
import {
  growthRecommendations,
  contentDecayScores,
  contentConfidenceScores,
  searchZeroResults,
} from "@shared/schema";
import { eq, desc, gte, and, sql } from "drizzle-orm";

function isEnabled(): boolean {
  return process.env.ENABLE_GROWTH_RECOMMENDATIONS === "true";
}

export type RecommendationType =
  | "create_content"
  | "fix_decay"
  | "improve_confidence"
  | "fill_search_gap"
  | "optimize_links"
  | "update_schema"
  | "expand_topic";

export interface GrowthRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description?: string;
  priority: number;
  effortScore?: number;
  impactScore?: number;
  sourceData?: Record<string, unknown>;
  status: "pending" | "in_progress" | "completed" | "dismissed";
  contentId?: string;
  weekOf: string;
  createdAt: string;
}

export interface GrowthSummary {
  totalRecommendations: number;
  byType: Array<{ type: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  avgPriority: number;
  topPriority: GrowthRecommendation[];
}

/**
 * Get start of current week (Monday)
 */
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Generate recommendations based on current data
 */
export async function generateRecommendations(): Promise<GrowthRecommendation[]> {
  if (!isEnabled()) return [];

  const weekOf = getWeekStart();
  const recommendations: Array<{
    type: RecommendationType;
    title: string;
    description: string;
    priority: number;
    effortScore: number;
    impactScore: number;
    sourceData: Record<string, unknown>;
    contentId?: string;
  }> = [];

  // 1. Check for decaying content
  try {
    const decayingContent = await db
      .select()
      .from(contentDecayScores)
      .where(eq(contentDecayScores.status, "critical"))
      .limit(10);

    for (const decay of decayingContent) {
      recommendations.push({
        type: "fix_decay",
        title: `Fix decaying content`,
        description: `Content ${decay.contentId} has decay score of ${decay.decayScore}`,
        priority: 85,
        effortScore: 40,
        impactScore: 70,
        sourceData: { decayScore: decay.decayScore },
        contentId: decay.contentId,
      });
    }
  } catch (e) {}

  // 2. Check for low confidence content
  try {
    const lowConfidence = await db
      .select()
      .from(contentConfidenceScores)
      .where(eq(contentConfidenceScores.label, "low"))
      .limit(10);

    for (const conf of lowConfidence) {
      recommendations.push({
        type: "improve_confidence",
        title: `Improve content confidence`,
        description: `Content ${conf.contentId} has low confidence score of ${conf.score}`,
        priority: 60,
        effortScore: 50,
        impactScore: 50,
        sourceData: { confidenceScore: conf.score },
        contentId: conf.contentId,
      });
    }
  } catch (e) {}

  // 3. Check for search gaps (zero results)
  try {
    const searchGaps = await db
      .select()
      .from(searchZeroResults)
      .orderBy(desc(searchZeroResults.count))
      .limit(10);

    for (const gap of searchGaps) {
      if (gap.count >= 5) {
        recommendations.push({
          type: "fill_search_gap",
          title: `Create content for "${gap.query}"`,
          description: `${gap.count} searches with no results`,
          priority: Math.min(95, 50 + gap.count * 5),
          effortScore: 70,
          impactScore: 60,
          sourceData: { query: gap.query, count: gap.count },
        });
      }
    }
  } catch (e) {}

  // Store recommendations
  const stored: GrowthRecommendation[] = [];

  for (const rec of recommendations) {
    try {
      const [inserted] = await db
        .insert(growthRecommendations)
        .values({
          recommendationType: rec.type,
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          effortScore: rec.effortScore,
          impactScore: rec.impactScore,
          sourceData: rec.sourceData,
          contentId: rec.contentId,
          weekOf,
        } as any)
        .returning();

      stored.push({
        id: inserted.id,
        type: rec.type,
        title: rec.title,
        description: rec.description,
        priority: rec.priority,
        effortScore: rec.effortScore,
        impactScore: rec.impactScore,
        sourceData: rec.sourceData,
        status: "pending",
        contentId: rec.contentId,
        weekOf: weekOf.toISOString(),
        createdAt: new Date().toISOString(),
      });
    } catch (e) {}
  }

  return stored;
}

/**
 * Get recommendations for current week
 */
export async function getRecommendations(options?: {
  limit?: number;
  status?: string;
  type?: RecommendationType;
}): Promise<GrowthRecommendation[]> {
  if (!isEnabled()) return [];

  const { limit = 50, status, type } = options || {};
  const weekOf = getWeekStart();

  const conditions = [gte(growthRecommendations.weekOf, weekOf)];
  if (status) conditions.push(eq(growthRecommendations.status, status));
  if (type) conditions.push(eq(growthRecommendations.recommendationType, type));

  const results = await db
    .select()
    .from(growthRecommendations)
    .where(and(...conditions))
    .orderBy(desc(growthRecommendations.priority))
    .limit(limit);

  return results.map(r => ({
    id: r.id,
    type: r.recommendationType as RecommendationType,
    title: r.title,
    description: r.description || undefined,
    priority: r.priority,
    effortScore: r.effortScore || undefined,
    impactScore: r.impactScore || undefined,
    sourceData: r.sourceData as Record<string, unknown> | undefined,
    status: r.status as "pending" | "in_progress" | "completed" | "dismissed",
    contentId: r.contentId || undefined,
    weekOf: r.weekOf.toISOString(),
    createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
  }));
}

/**
 * Get growth summary
 */
export async function getGrowthSummary(): Promise<GrowthSummary> {
  if (!isEnabled()) {
    return {
      totalRecommendations: 0,
      byType: [],
      byStatus: [],
      avgPriority: 0,
      topPriority: [],
    };
  }

  const weekOf = getWeekStart();

  const [totalResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(growthRecommendations)
    .where(gte(growthRecommendations.weekOf, weekOf));

  const byType = await db
    .select({
      type: growthRecommendations.recommendationType,
      count: sql<number>`COUNT(*)`,
    })
    .from(growthRecommendations)
    .where(gte(growthRecommendations.weekOf, weekOf))
    .groupBy(growthRecommendations.recommendationType);

  const byStatus = await db
    .select({
      status: growthRecommendations.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(growthRecommendations)
    .where(gte(growthRecommendations.weekOf, weekOf))
    .groupBy(growthRecommendations.status);

  const [avgResult] = await db
    .select({ avg: sql<number>`AVG(${growthRecommendations.priority})` })
    .from(growthRecommendations)
    .where(gte(growthRecommendations.weekOf, weekOf));

  const topPriority = await getRecommendations({ limit: 5 });

  return {
    totalRecommendations: totalResult?.count || 0,
    byType: byType.map(t => ({ type: t.type, count: t.count })),
    byStatus: byStatus.map(s => ({ status: s.status, count: s.count })),
    avgPriority: Math.round(avgResult?.avg || 0),
    topPriority,
  };
}

/**
 * Update recommendation status
 */
export async function updateRecommendationStatus(
  id: string,
  status: "pending" | "in_progress" | "completed" | "dismissed"
): Promise<boolean> {
  if (!isEnabled()) return false;

  const result = await db
    .update(growthRecommendations)
    .set({ status } as any)
    .where(eq(growthRecommendations.id, id))
    .returning({ id: growthRecommendations.id });

  return result.length > 0;
}
