#!/usr/bin/env tsx
/**
 * Standalone Content Regeneration Worker
 * Runs independently of the Vite dev server to avoid hot reload interruptions
 *
 * Usage: npx tsx server/scripts/run-regeneration.ts
 */

import { db } from "../db";
import { tiqetsAttractions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateWithRetry } from "../services/attraction-content-generator-v2";
import { QualityScore, QUALITY_THRESHOLD } from "../services/content-quality-validator";
import { EngineRegistry } from "../services/engine-registry";

const BATCH_SIZE = 68;

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
  } catch (error) {
    return false;
  }
}

async function main() {
  const stats = EngineRegistry.getStats();

  const attractions = await db
    .select()
    .from(tiqetsAttractions)
    .where(eq(tiqetsAttractions.status, "ready"));

  const filtered = attractions.filter(a => !a.qualityScore || a.qualityScore < QUALITY_THRESHOLD);

  if (filtered.length === 0) {
    process.exit(0);
  }

  let passed = 0;
  let failed = 0;
  let errors = 0;
  const startTime = Date.now();

  const totalBatches = Math.ceil(filtered.length / BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, filtered.length);
    const batch = filtered.slice(start, end);

    const results = await Promise.allSettled(
      batch.map(async attraction => {
        try {
          const result = await generateWithRetry(attraction, 2);

          if (result && result.qualityScore.passed) {
            const saved = await saveContentToDatabase(
              attraction.id,
              result.content,
              result.qualityScore
            );

            if (saved) {
              passed++;

              return { success: true };
            } else {
              errors++;
              return { success: false, reason: "save_failed" };
            }
          } else if (result) {
            failed++;

            return { success: false, reason: "quality_failed" };
          } else {
            errors++;

            return { success: false, reason: "generation_failed" };
          }
        } catch (error) {
          errors++;

          return { success: false, reason: "exception" };
        }
      })
    );

    const processed = (batchIndex + 1) * BATCH_SIZE;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const remaining = filtered.length - processed;
    const eta = remaining / rate;

    await new Promise(r => setTimeout(r, 1000));
  }

  process.exit(0);
}

main().catch(err => {
  process.exit(1);
});
