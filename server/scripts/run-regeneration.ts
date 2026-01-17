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
    console.warn(`[Worker] BLOCKED: Cannot save content for ${attractionId} - score ${qualityScore.overallScore} below threshold ${QUALITY_THRESHOLD}`);
    return false;
  }

  try {
    await db.update(tiqetsAttractions)
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
    console.error(`[Worker] Failed to save content for ${attractionId}:`, error);
    return false;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("[Worker] Standalone Content Regeneration Worker");
  console.log("=".repeat(60));
  
  const stats = EngineRegistry.getStats();
  console.log(`[Worker] Engines: ${stats.healthy}/${stats.total} healthy`);
  console.log(`[Worker] By provider:`, stats.byProvider);
  console.log("");

  const attractions = await db.select()
    .from(tiqetsAttractions)
    .where(eq(tiqetsAttractions.status, "ready"));
  
  const filtered = attractions.filter(a => 
    !a.qualityScore || a.qualityScore < QUALITY_THRESHOLD
  );
  
  console.log(`[Worker] Total ready attractions: ${attractions.length}`);
  console.log(`[Worker] Already passed (score >= ${QUALITY_THRESHOLD}): ${attractions.length - filtered.length}`);
  console.log(`[Worker] Remaining to process: ${filtered.length}`);
  console.log("");

  if (filtered.length === 0) {
    console.log("[Worker] All attractions already processed!");
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

    console.log(`[Worker] Batch ${batchIndex + 1}/${totalBatches} (${batch.length} attractions)`);

    const results = await Promise.allSettled(
      batch.map(async (attraction) => {
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
              console.log(`[Worker] ✅ ${attraction.title} - Score: ${result.qualityScore.overallScore}`);
              return { success: true };
            } else {
              errors++;
              return { success: false, reason: "save_failed" };
            }
          } else if (result) {
            failed++;
            console.log(`[Worker] ⚠️ ${attraction.title} - Score: ${result.qualityScore.overallScore} (below ${QUALITY_THRESHOLD})`);
            return { success: false, reason: "quality_failed" };
          } else {
            errors++;
            console.log(`[Worker] ❌ ${attraction.title} - Generation failed`);
            return { success: false, reason: "generation_failed" };
          }
        } catch (error) {
          errors++;
          console.error(`[Worker] Error: ${attraction.title}:`, error);
          return { success: false, reason: "exception" };
        }
      })
    );

    const processed = (batchIndex + 1) * BATCH_SIZE;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const remaining = filtered.length - processed;
    const eta = remaining / rate;

    console.log(`[Worker] Progress: ${Math.min(processed, filtered.length)}/${filtered.length} | ` +
      `Passed: ${passed} | Failed: ${failed} | Errors: ${errors} | ` +
      `ETA: ${Math.round(eta / 60)} min`);
    console.log("");

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("=".repeat(60));
  console.log("[Worker] Job Complete!");
  console.log(`[Worker] Passed: ${passed}`);
  console.log(`[Worker] Failed: ${failed}`);
  console.log(`[Worker] Errors: ${errors}`);
  console.log(`[Worker] Duration: ${Math.round((Date.now() - startTime) / 1000 / 60)} minutes`);
  console.log("=".repeat(60));

  process.exit(0);
}

main().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});
