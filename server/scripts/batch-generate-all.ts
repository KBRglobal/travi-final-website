/**
 * Batch Content Generator for All Attractions
 * Processes all cities sequentially to avoid rate limits
 */

import { db } from "../db";
import { tiqetsAttractions } from "@shared/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { generateAttractionContent } from "../services/attraction-content-generator";

const BATCH_SIZE = 5; // Process 5 at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds between batches

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processCity(cityName: string): Promise<{ processed: number; errors: number }> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: ${cityName}`);
  console.log("=".repeat(60));

  const attractions = await db.select()
    .from(tiqetsAttractions)
    .where(and(
      eq(tiqetsAttractions.cityName, cityName),
      eq(tiqetsAttractions.status, "ready"),
      eq(tiqetsAttractions.contentGenerationStatus, "pending")
    ));

  console.log(`Found ${attractions.length} attractions to process`);

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < attractions.length; i += BATCH_SIZE) {
    const batch = attractions.slice(i, i + BATCH_SIZE);
    
    console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(attractions.length / BATCH_SIZE)}`);

    const results = await Promise.allSettled(
      batch.map(async (attraction) => {
        try {
          await db.update(tiqetsAttractions)
            .set({ contentGenerationStatus: "generating" })
            .where(eq(tiqetsAttractions.id, attraction.id));

          const result = await generateAttractionContent(attraction);

          await db.update(tiqetsAttractions)
            .set({
              h1Title: result.content.h1Title,
              metaTitle: result.content.metaTitle,
              metaDescription: result.content.metaDescription,
              highlights: result.content.highlights,
              whatsIncluded: result.content.aiContent.whatToExpect.map(i => i.description),
              whatsExcluded: [],
              description: [
                "## Why Visit",
                result.content.aiContent.whyVisit,
                "",
                "## What to Expect",
                result.content.aiContent.whatToExpect.map(i => `**${i.title}**: ${i.description}`).join("\n\n"),
                "",
                "## Visitor Tips",
                result.content.aiContent.visitorTips.map(i => `**${i.title}**: ${i.description}`).join("\n\n"),
                "",
                "## How to Get There",
                result.content.aiContent.howToGetThere.description,
                result.content.aiContent.howToGetThere.transport.map(t => `**${t.mode}**: ${t.details}`).join("\n\n"),
              ].join("\n\n"),
              faqs: result.content.faqs,
              aiContent: result.content.aiContent,
              contentGenerationStatus: "ready",
              contentGeneratedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(tiqetsAttractions.id, attraction.id));

          console.log(`  ✓ ${attraction.title.slice(0, 50)}... (${result.provider}, ${result.latencyMs}ms)`);
          return { success: true };
        } catch (error) {
          await db.update(tiqetsAttractions)
            .set({ 
              contentGenerationStatus: "error",
              updatedAt: new Date()
            })
            .where(eq(tiqetsAttractions.id, attraction.id));

          console.error(`  ✗ ${attraction.title.slice(0, 50)}... - ${error}`);
          return { success: false, error };
        }
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.success) {
        processed++;
      } else {
        errors++;
      }
    }

    // Progress report
    console.log(`  Progress: ${processed + errors}/${attractions.length} (${processed} success, ${errors} errors)`);

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < attractions.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  return { processed, errors };
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("TRAVI Batch Content Generator");
  console.log("=".repeat(60));

  // Get all cities with pending attractions
  const cities = await db.select({
    cityName: tiqetsAttractions.cityName,
    count: sql<number>`count(*)::int`,
  })
    .from(tiqetsAttractions)
    .where(and(
      eq(tiqetsAttractions.status, "ready"),
      eq(tiqetsAttractions.contentGenerationStatus, "pending")
    ))
    .groupBy(tiqetsAttractions.cityName)
    .orderBy(sql`count(*) desc`);

  console.log(`\nFound ${cities.length} cities to process:`);
  for (const city of cities) {
    console.log(`  - ${city.cityName}: ${city.count} attractions`);
  }

  const totalAttractions = cities.reduce((sum, c) => sum + c.count, 0);
  console.log(`\nTotal: ${totalAttractions} attractions`);

  let totalProcessed = 0;
  let totalErrors = 0;
  const startTime = Date.now();

  for (const city of cities) {
    const { processed, errors } = await processCity(city.cityName!);
    totalProcessed += processed;
    totalErrors += errors;
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  
  console.log("\n" + "=".repeat(60));
  console.log("BATCH GENERATION COMPLETE");
  console.log("=".repeat(60));
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`);
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
