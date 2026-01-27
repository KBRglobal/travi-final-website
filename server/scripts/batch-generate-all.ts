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
  const attractions = await db
    .select()
    .from(tiqetsAttractions)
    .where(
      and(
        eq(tiqetsAttractions.cityName, cityName),
        eq(tiqetsAttractions.status, "ready"),
        eq(tiqetsAttractions.contentGenerationStatus, "pending")
      )
    );

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < attractions.length; i += BATCH_SIZE) {
    const batch = attractions.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async attraction => {
        try {
          await db
            .update(tiqetsAttractions)
            .set({ contentGenerationStatus: "generating" } as any)
            .where(eq(tiqetsAttractions.id, attraction.id));

          const result = await generateAttractionContent(attraction);

          await db
            .update(tiqetsAttractions)
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
                result.content.aiContent.whatToExpect
                  .map(i => `**${i.title}**: ${i.description}`)
                  .join("\n\n"),
                "",
                "## Visitor Tips",
                result.content.aiContent.visitorTips
                  .map(i => `**${i.title}**: ${i.description}`)
                  .join("\n\n"),
                "",
                "## How to Get There",
                result.content.aiContent.howToGetThere.description,
                result.content.aiContent.howToGetThere.transport
                  .map(t => `**${t.mode}**: ${t.details}`)
                  .join("\n\n"),
              ].join("\n\n"),
              faqs: result.content.faqs,
              aiContent: result.content.aiContent,
              contentGenerationStatus: "ready",
              contentGeneratedAt: new Date(),
              updatedAt: new Date(),
            } as any)
            .where(eq(tiqetsAttractions.id, attraction.id));

          return { success: true };
        } catch (error) {
          await db
            .update(tiqetsAttractions)
            .set({
              contentGenerationStatus: "error",
              updatedAt: new Date(),
            } as any)
            .where(eq(tiqetsAttractions.id, attraction.id));

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

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < attractions.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  return { processed, errors };
}

async function main() {
  // Get all cities with pending attractions
  const cities = await db
    .select({
      cityName: tiqetsAttractions.cityName,
      count: sql<number>`count(*)::int`,
    })
    .from(tiqetsAttractions)
    .where(
      and(
        eq(tiqetsAttractions.status, "ready"),
        eq(tiqetsAttractions.contentGenerationStatus, "pending")
      )
    )
    .groupBy(tiqetsAttractions.cityName)
    .orderBy(sql`count(*) desc`);

  for (const city of cities) {
  }

  const totalAttractions = cities.reduce((sum, c) => sum + c.count, 0);

  let totalProcessed = 0;
  let totalErrors = 0;
  const startTime = Date.now();

  for (const city of cities) {
    const { processed, errors } = await processCity(city.cityName!);
    totalProcessed += processed;
    totalErrors += errors;
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    process.exit(1);
  });
