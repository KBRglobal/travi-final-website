/**
 * Content Decay Detection
 *
 * Detects content losing value over time based on:
 * - Traffic drop
 * - Search impressions drop
 * - Entity freshness
 * - ICE score delta
 *
 * Feature flag: ENABLE_CONTENT_DECAY
 */

import { db } from "../db";
import { contentDecayScores, contents } from "@shared/schema";
import { eq, desc, sql, gte, lte } from "drizzle-orm";

function isEnabled(): boolean {
  return process.env.ENABLE_CONTENT_DECAY === "true";
}

export interface DecayResult {
  contentId: string;
  title?: string;
  type?: string;
  decayScore: number;
  status: "stable" | "decaying" | "critical";
  signals: {
    trafficDelta: number | null;
    impressionsDelta: number | null;
    freshnessScore: number | null;
    iceScoreDelta: number | null;
  };
  calculatedAt: string;
}

/**
 * Calculate decay score for a single content piece
 */
export async function calculateDecay(contentId: string): Promise<DecayResult | null> {
  if (!isEnabled()) return null;

  const [content] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);

  if (!content) return null;

  // Calculate signals (mock calculations - in production, integrate with analytics)
  const now = new Date();
  const contentAge = content.publishedAt
    ? Math.floor((now.getTime() - content.publishedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Freshness score based on last update
  const lastUpdate = content.updatedAt || content.createdAt;
  const daysSinceUpdate = lastUpdate
    ? Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
    : 365;

  const freshnessScore = Math.max(0, 100 - Math.min(daysSinceUpdate * 2, 100));

  // Mock traffic/impressions deltas (would integrate with analytics in production)
  const trafficDelta = contentAge > 30 ? Math.floor(Math.random() * 40) - 20 : 0;
  const impressionsDelta = contentAge > 30 ? Math.floor(Math.random() * 40) - 20 : 0;
  const iceScoreDelta = contentAge > 60 ? Math.floor(Math.random() * 20) - 10 : 0;

  // Calculate composite decay score (0 = no decay, 100 = severe decay)
  let decayScore = 0;

  // Traffic drop contributes to decay
  if (trafficDelta < -10) decayScore += Math.abs(trafficDelta);

  // Impressions drop contributes
  if (impressionsDelta < -10) decayScore += Math.abs(impressionsDelta) * 0.5;

  // Low freshness contributes
  decayScore += (100 - freshnessScore) * 0.3;

  // ICE score drop contributes
  if (iceScoreDelta < -5) decayScore += Math.abs(iceScoreDelta) * 2;

  decayScore = Math.min(100, Math.max(0, Math.round(decayScore)));

  // Determine status
  let status: "stable" | "decaying" | "critical" = "stable";
  if (decayScore >= 70) status = "critical";
  else if (decayScore >= 40) status = "decaying";

  // Store/update decay score
  await db
    .insert(contentDecayScores)
    .values({
      contentId,
      decayScore,
      status,
      trafficDelta,
      impressionsDelta,
      freshnessScore,
      iceScoreDelta,
    } as any)
    .onConflictDoUpdate({
      target: contentDecayScores.contentId,
      set: {
        decayScore,
        status,
        trafficDelta,
        impressionsDelta,
        freshnessScore,
        iceScoreDelta,
        calculatedAt: new Date(),
      } as any,
    });

  return {
    contentId,
    title: content.title,
    type: content.type,
    decayScore,
    status,
    signals: {
      trafficDelta,
      impressionsDelta,
      freshnessScore,
      iceScoreDelta,
    },
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Get all decaying content, sorted by severity
 */
export async function getDecayingContent(
  status?: "stable" | "decaying" | "critical",
  limit: number = 50
): Promise<DecayResult[]> {
  if (!isEnabled()) return [];

  let query = db
    .select({
      contentId: contentDecayScores.contentId,
      title: contents.title,
      type: contents.type,
      decayScore: contentDecayScores.decayScore,
      status: contentDecayScores.status,
      trafficDelta: contentDecayScores.trafficDelta,
      impressionsDelta: contentDecayScores.impressionsDelta,
      freshnessScore: contentDecayScores.freshnessScore,
      iceScoreDelta: contentDecayScores.iceScoreDelta,
      calculatedAt: contentDecayScores.calculatedAt,
    })
    .from(contentDecayScores)
    .leftJoin(contents, eq(contentDecayScores.contentId, contents.id))
    .orderBy(desc(contentDecayScores.decayScore))
    .limit(limit);

  if (status) {
    query = query.where(eq(contentDecayScores.status, status)) as typeof query;
  }

  const results = await query;

  return results.map(r => ({
    contentId: r.contentId,
    title: r.title || undefined,
    type: r.type || undefined,
    decayScore: r.decayScore,
    status: r.status as "stable" | "decaying" | "critical",
    signals: {
      trafficDelta: r.trafficDelta,
      impressionsDelta: r.impressionsDelta,
      freshnessScore: r.freshnessScore,
      iceScoreDelta: r.iceScoreDelta,
    },
    calculatedAt: r.calculatedAt?.toISOString() || new Date().toISOString(),
  }));
}

/**
 * Get decay info for a specific content piece
 */
export async function getContentDecay(contentId: string): Promise<DecayResult | null> {
  if (!isEnabled()) return null;

  const [existing] = await db
    .select({
      contentId: contentDecayScores.contentId,
      title: contents.title,
      type: contents.type,
      decayScore: contentDecayScores.decayScore,
      status: contentDecayScores.status,
      trafficDelta: contentDecayScores.trafficDelta,
      impressionsDelta: contentDecayScores.impressionsDelta,
      freshnessScore: contentDecayScores.freshnessScore,
      iceScoreDelta: contentDecayScores.iceScoreDelta,
      calculatedAt: contentDecayScores.calculatedAt,
    })
    .from(contentDecayScores)
    .leftJoin(contents, eq(contentDecayScores.contentId, contents.id))
    .where(eq(contentDecayScores.contentId, contentId))
    .limit(1);

  if (!existing) {
    // Calculate if not exists
    return calculateDecay(contentId);
  }

  return {
    contentId: existing.contentId,
    title: existing.title || undefined,
    type: existing.type || undefined,
    decayScore: existing.decayScore,
    status: existing.status as "stable" | "decaying" | "critical",
    signals: {
      trafficDelta: existing.trafficDelta,
      impressionsDelta: existing.impressionsDelta,
      freshnessScore: existing.freshnessScore,
      iceScoreDelta: existing.iceScoreDelta,
    },
    calculatedAt: existing.calculatedAt?.toISOString() || new Date().toISOString(),
  };
}
