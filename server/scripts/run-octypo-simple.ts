/**
 * Simple Octypo Generation Script
 * Processes one attraction at a time with robust error handling
 */

import { db } from "../db";
import { tiqetsAttractions } from "@shared/schema";
import { eq, isNull, lt, or } from "drizzle-orm";
import { getOctypoOrchestrator } from "../octypo";
import { AttractionData } from "../octypo/types";
type GeneratedContent = any;
type QualityScore = any;

const QUALITY_THRESHOLD = 85;
const BATCH_SIZE = parseInt(process.argv[2] || "10", 10);

async function getNextAttraction() {
  const [attraction] = await db
    .select({
      id: tiqetsAttractions.id,
      title: tiqetsAttractions.title,
      cityName: tiqetsAttractions.cityName,
      venueName: tiqetsAttractions.venueName,
      duration: tiqetsAttractions.duration,
      primaryCategory: tiqetsAttractions.primaryCategory,
      secondaryCategories: tiqetsAttractions.secondaryCategories,
      languages: tiqetsAttractions.languages,
      wheelchairAccess: tiqetsAttractions.wheelchairAccess,
      tiqetsDescription: tiqetsAttractions.tiqetsDescription,
      tiqetsHighlights: tiqetsAttractions.tiqetsHighlights,
      priceUsd: tiqetsAttractions.priceUsd,
      tiqetsRating: tiqetsAttractions.tiqetsRating,
      tiqetsReviewCount: tiqetsAttractions.tiqetsReviewCount,
    })
    .from(tiqetsAttractions)
    .where(
      or(isNull(tiqetsAttractions.seoScore), lt(tiqetsAttractions.seoScore, QUALITY_THRESHOLD))
    )
    .limit(1);

  if (!attraction) return null;

  // FAIL-FAST: Do not use implicit Dubai fallback - require cityName from database
  if (!attraction.cityName) {
    return null;
  }

  return {
    id: 0,
    originalId: attraction.id,
    title: attraction.title || "Unknown",
    cityName: attraction.cityName,
    venueName: attraction.venueName || undefined,
    duration: attraction.duration || undefined,
    primaryCategory: attraction.primaryCategory || undefined,
    secondaryCategories: attraction.secondaryCategories || undefined,
    languages: attraction.languages || undefined,
    wheelchairAccess: attraction.wheelchairAccess || false,
    tiqetsDescription: attraction.tiqetsDescription || undefined,
    tiqetsHighlights: attraction.tiqetsHighlights || undefined,
    priceFrom: attraction.priceUsd ? parseFloat(attraction.priceUsd) : undefined,
    rating: attraction.tiqetsRating ? parseFloat(attraction.tiqetsRating) : undefined,
    reviewCount: attraction.tiqetsReviewCount || undefined,
  };
}

function mapContent(content: GeneratedContent) {
  return {
    introduction: content.introduction || "",
    whyVisit: content.introduction?.substring(0, 300) || "",
    proTip: content.honestLimitations?.[0] || "",
    whatToExpect: [{ title: "Experience", description: content.whatToExpect || "", icon: "star" }],
    visitorTips: [{ title: "Tips", description: content.visitorTips || "", icon: "lightbulb" }],
    howToGetThere: { description: content.howToGetThere || "", transport: [] },
    answerCapsule: content.answerCapsule || "",
    schemaPayload: content.schemaPayload || {},
  };
}

async function saveContent(id: string, content: GeneratedContent, score: QualityScore) {
  await db
    .update(tiqetsAttractions)
    .set({
      aiContent: mapContent(content),
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      faqs: content.faqs,
      description: content.introduction,
      seoScore: score.seoScore,
      aeoScore: score.aeoScore,
      factCheckScore: score.factCheckScore,
      qualityScore: score.overallScore,
      contentVersion: 2,
      lastContentUpdate: new Date(),
      contentGenerationStatus: "completed",
      contentGenerationCompletedAt: new Date(),
    } as any)
    .where(eq(tiqetsAttractions.id, id));
}

async function run() {
  const orchestrator = getOctypoOrchestrator({ maxRetries: 2, qualityThreshold: 80 });
  await orchestrator.initialize();

  let processed = 0;
  let highQuality = 0;
  const startTime = Date.now();

  while (processed < BATCH_SIZE) {
    const attraction = await getNextAttraction();
    if (!attraction) {
      break;
    }

    processed++;

    try {
      const result = await orchestrator.generateAttractionContent(attraction as AttractionData);

      if (result.success && result.content && result.qualityScore) {
        await saveContent(attraction.originalId, result.content, result.qualityScore);

        if (result.qualityScore.overallScore >= QUALITY_THRESHOLD) {
          highQuality++;
        } else {
        }
      } else {
      }
    } catch (error) {}
  }

  const duration = (Date.now() - startTime) / 1000 / 60;
}

run()
  .then(() => process.exit(0))
  .catch(e => {
    process.exit(1);
  });
