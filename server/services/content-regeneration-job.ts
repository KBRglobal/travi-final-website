/**
 * Content Regeneration Job
 * Regenerates all attraction content with quality validation
 * Only saves content that passes QUALITY_THRESHOLD (85+) on SEO, AEO, and Fact-check
 */

import { db } from "../db";
import { tiqetsAttractions } from "@shared/schema";
import { eq } from "drizzle-orm";

import { generateWithRetry } from "./attraction-content-generator-v2";
import { QualityScore, QUALITY_THRESHOLD } from "./content-quality-validator";

interface RegenerationStats {
  total: number;
  processed: number;
  passed: number;
  failed: number;
  errors: number;
  inProgress: boolean;
  startedAt: Date | null;
  estimatedCompletion: Date | null;
  currentBatch: number;
  totalBatches: number;
}

// Global state for tracking regeneration progress
let regenerationStats: RegenerationStats = {
  total: 0,
  processed: 0,
  passed: 0,
  failed: 0,
  errors: 0,
  inProgress: false,
  startedAt: null,
  estimatedCompletion: null,
  currentBatch: 0,
  totalBatches: 0,
};

export function getRegenerationStats(): RegenerationStats {
  return { ...regenerationStats };
}

export function resetStats(): void {
  regenerationStats = {
    total: 0,
    processed: 0,
    passed: 0,
    failed: 0,
    errors: 0,
    inProgress: false,
    startedAt: null,
    estimatedCompletion: null,
    currentBatch: 0,
    totalBatches: 0,
  };
}

function truncateSafely(text: string | undefined, maxLen: number): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen - 3);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLen - 30) {
    return truncated.substring(0, lastSpace) + "...";
  }
  return truncated + "...";
}

async function saveContentToDatabase(
  attractionId: string,
  content: Record<string, any>,
  qualityScore: QualityScore
): Promise<boolean> {
  // QUALITY GATE: Enforce minimum score threshold
  // This prevents ANY caller from persisting low-quality content
  if (qualityScore.overallScore < QUALITY_THRESHOLD) {
    return false;
  }

  try {
    await db
      .update(tiqetsAttractions)
      .set({
        aiContent: {
          introduction: content.introduction,
          whatToExpect: content.whatToExpect,
          bestTimeToVisit: content.bestTimeToVisit,
          historicalContext: content.historicalContext,
          visitorTips: content.visitorTips,
          howToGetThere: content.howToGetThere,
          faqs: content.faqs,
          answerCapsule: content.answerCapsule,
          schemaPayload: content.schemaPayload,
        },
        metaTitle: truncateSafely(content.metaTitle, 60),
        metaDescription: truncateSafely(content.metaDescription, 160),
        qualityScore: qualityScore.overallScore,
        seoScore: qualityScore.seoScore,
        aeoScore: qualityScore.aeoScore,
        factCheckScore: qualityScore.factCheckScore,
        contentVersion: 2,
        lastContentUpdate: new Date(),
      } as any)
      .where(eq(tiqetsAttractions.id, attractionId));

    return true;
  } catch {
    return false;
  }
}

export async function regenerateAllAttractions(
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    cityFilter?: string;
  } = {}
): Promise<void> {
  const {
    batchSize = 30, // Increased - user has 20 API keys
    delayBetweenBatches = 2000, // Reduced delay
    cityFilter,
  } = options;

  if (regenerationStats.inProgress) {
    return;
  }

  // Get all attractions to process
  let query = db.select().from(tiqetsAttractions).where(eq(tiqetsAttractions.status, "ready"));

  const attractions = await query;

  // Filter: ALWAYS skip attractions that already passed quality threshold
  // This allows the job to resume from where it left off after a restart
  let filtered = attractions.filter(a => !a.qualityScore || a.qualityScore < QUALITY_THRESHOLD);

  if (cityFilter) {
    filtered = filtered.filter(a => a.cityName?.toLowerCase() === cityFilter.toLowerCase());
  }

  // If nothing left to process, we're done
  if (filtered.length === 0) {
    regenerationStats.inProgress = false;
    return;
  }

  const total = filtered.length;
  const totalBatches = Math.ceil(total / batchSize);

  regenerationStats = {
    total,
    processed: 0,
    passed: 0,
    failed: 0,
    errors: 0,
    inProgress: true,
    startedAt: new Date(),
    estimatedCompletion: null,
    currentBatch: 0,
    totalBatches,
  };

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    regenerationStats.currentBatch = batchIndex + 1;

    const start = batchIndex * batchSize;
    const end = Math.min(start + batchSize, total);
    const batch = filtered.slice(start, end);

    // Get the number of API keys available for dynamic parallelism
    const { getKeyPoolSize } = await import("./attraction-content-generator-v2");
    const keyPoolSize = getKeyPoolSize();
    const PARALLEL_LIMIT = Math.max(keyPoolSize, 5); // At least 5, or match key count

    const chunks = [];
    for (let i = 0; i < batch.length; i += PARALLEL_LIMIT) {
      chunks.push(batch.slice(i, i + PARALLEL_LIMIT));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async attraction => {
        try {
          const result = await generateWithRetry(attraction, 2);

          if (result?.qualityScore.passed) {
            const saved = await saveContentToDatabase(
              attraction.id,
              result.content,
              result.qualityScore
            );

            if (saved) {
              regenerationStats.passed++;
            } else {
              regenerationStats.errors++;
            }
          } else if (result) {
            regenerationStats.failed++;
          } else {
            regenerationStats.errors++;
          }

          regenerationStats.processed++;
        } catch {
          regenerationStats.errors++;
          regenerationStats.processed++;
        }
      });

      await Promise.allSettled(promises);

      // Update estimated completion after each chunk
      const elapsed = Date.now() - regenerationStats.startedAt!.getTime();
      const avgTimePerItem = elapsed / regenerationStats.processed;
      const remaining = total - regenerationStats.processed;
      regenerationStats.estimatedCompletion = new Date(Date.now() + avgTimePerItem * remaining);
    }

    // Delay between batches to avoid rate limiting
    if (batchIndex < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  regenerationStats.inProgress = false;
}

export async function regenerateSingleAttraction(attractionId: string): Promise<{
  success: boolean;
  qualityScore?: QualityScore;
  error?: string;
}> {
  try {
    const attraction = await db
      .select()
      .from(tiqetsAttractions)
      .where(eq(tiqetsAttractions.id, attractionId))
      .limit(1);

    if (!attraction.length) {
      return { success: false, error: "Attraction not found" };
    }

    const result = await generateWithRetry(attraction[0], 3);

    if (!result) {
      return { success: false, error: "Content generation failed after retries" };
    }

    // Only save content that passes quality gate (90+ on all scores)
    if (result.qualityScore.passed) {
      await saveContentToDatabase(attractionId, result.content, result.qualityScore);
    }

    return {
      success: result.qualityScore.passed,
      qualityScore: result.qualityScore,
      error: result.qualityScore.passed
        ? undefined
        : "Quality score below 90 threshold - content NOT saved",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getContentQualityReport(): Promise<{
  total: number;
  passed: number;
  failed: number;
  noScore: number;
  averageScore: number;
  byCityBreakdown: Array<{
    city: string;
    total: number;
    passed: number;
    avgScore: number;
  }>;
}> {
  const attractions = await db
    .select({
      id: tiqetsAttractions.id,
      cityName: tiqetsAttractions.cityName,
      qualityScore: tiqetsAttractions.qualityScore,
      seoScore: tiqetsAttractions.seoScore,
      aeoScore: tiqetsAttractions.aeoScore,
    })
    .from(tiqetsAttractions)
    .where(eq(tiqetsAttractions.status, "ready"));

  const total = attractions.length;
  const withScore = attractions.filter(a => a.qualityScore !== null);
  const passed = withScore.filter(a => a.qualityScore! >= 90).length;
  const failed = withScore.filter(a => a.qualityScore! < 90).length;
  const noScore = total - withScore.length;

  const avgScore =
    withScore.length > 0
      ? withScore.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / withScore.length
      : 0;

  // Group by city
  const cityMap = new Map<string, { total: number; passed: number; totalScore: number }>();

  for (const a of attractions) {
    const city = a.cityName || "Unknown";
    const existing = cityMap.get(city) || { total: 0, passed: 0, totalScore: 0 };
    existing.total++;
    if (a.qualityScore !== null) {
      existing.totalScore += a.qualityScore;
      if (a.qualityScore >= 90) {
        existing.passed++;
      }
    }
    cityMap.set(city, existing);
  }

  const byCityBreakdown = Array.from(cityMap.entries())
    .map(([city, data]) => ({
      city,
      total: data.total,
      passed: data.passed,
      avgScore: data.total > 0 ? Math.round(data.totalScore / data.total) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    total,
    passed,
    failed,
    noScore,
    averageScore: Math.round(avgScore),
    byCityBreakdown,
  };
}
