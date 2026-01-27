/**
 * Octypo Generation Script (Sequential)
 * Generates attractions with quality validation using the octypo system
 */

import { db } from "../db";
import { tiqetsAttractions } from "@shared/schema";
import { eq, isNull, lt, or } from "drizzle-orm";
import { getOctypoOrchestrator } from "../octypo";
import { AttractionData } from "../octypo/types";
type GeneratedContent = any;
type QualityScore = any;

interface GenerationStats {
  total: number;
  successful: number;
  failed: number;
  averageScore: number;
  highQuality: number;
  startTime: Date;
  endTime?: Date;
}

async function getAttractionsToGenerate(
  limit: number
): Promise<(AttractionData & { originalId: string })[]> {
  const attractions = await db
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
    .where(or(isNull(tiqetsAttractions.seoScore), lt(tiqetsAttractions.seoScore, 85)))
    .limit(limit);

  // FAIL-FAST: Filter out attractions without cityName - no implicit defaults
  return attractions
    .filter(a => {
      if (!a.cityName) {
        return false;
      }
      return true;
    })
    .map((a, idx) => ({
      id: idx,
      originalId: a.id,
      title: a.title || "Unknown Attraction",
      cityName: a.cityName,
      venueName: a.venueName || undefined,
      duration: a.duration || undefined,
      primaryCategory: a.primaryCategory || undefined,
      secondaryCategories: a.secondaryCategories || undefined,
      languages: a.languages || undefined,
      wheelchairAccess: a.wheelchairAccess || false,
      tiqetsDescription: a.tiqetsDescription || undefined,
      tiqetsHighlights: a.tiqetsHighlights || undefined,
      priceFrom: a.priceUsd ? parseFloat(a.priceUsd) : undefined,
      rating: a.tiqetsRating ? parseFloat(a.tiqetsRating) : undefined,
      reviewCount: a.tiqetsReviewCount || undefined,
    }));
}

function mapContentToAiContent(content: GeneratedContent) {
  const parseSection = (
    text: string,
    defaultIcon: string
  ): Array<{ title: string; description: string; icon: string }> => {
    if (!text) return [];
    const lines = text.split("\n").filter(l => l.trim());
    const items: Array<{ title: string; description: string; icon: string }> = [];

    for (const line of lines) {
      const colonMatch = line.match(/^([^:]+):\s*(.+)/);
      if (colonMatch) {
        items.push({
          title: colonMatch[1].trim(),
          description: colonMatch[2].trim(),
          icon: defaultIcon,
        });
      } else if (line.trim()) {
        items.push({ title: "Highlight", description: line.trim(), icon: defaultIcon });
      }
    }

    return items.length > 0
      ? items
      : [{ title: "Overview", description: text.trim(), icon: defaultIcon }];
  };

  const parseTransport = (text: string): Array<{ mode: string; details: string }> => {
    if (!text) return [];
    const transport: Array<{ mode: string; details: string }> = [];

    const modes = [
      { key: "metro", mode: "Metro" },
      { key: "taxi", mode: "Taxi" },
      { key: "car", mode: "Car" },
      { key: "bus", mode: "Bus" },
      { key: "ferry", mode: "Ferry" },
      { key: "tram", mode: "Tram" },
    ];

    for (const { key, mode } of modes) {
      const regex = new RegExp(`${key}[:\\s]+([^.]+)`, "i");
      const match = text.match(regex);
      if (match) transport.push({ mode, details: match[1].trim() });
    }

    if (transport.length === 0) {
      transport.push({ mode: "Various", details: text.substring(0, 200) });
    }

    return transport;
  };

  return {
    introduction: content.introduction || "",
    whyVisit: content.introduction?.substring(0, 300) || "",
    proTip: content.honestLimitations?.[0] || "Check opening hours before visiting.",
    whatToExpect: parseSection(content.whatToExpect || "", "star"),
    visitorTips: parseSection(content.visitorTips || "", "lightbulb"),
    howToGetThere: {
      description: content.howToGetThere || "",
      transport: parseTransport(content.howToGetThere || ""),
    },
    answerCapsule: content.answerCapsule || "",
    schemaPayload: content.schemaPayload || {},
  };
}

async function saveGeneratedContent(
  attractionId: string,
  content: GeneratedContent,
  qualityScore: QualityScore
): Promise<void> {
  const aiContent = mapContentToAiContent(content);

  await db
    .update(tiqetsAttractions)
    .set({
      aiContent,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      faqs: content.faqs,
      description: content.introduction,
      seoScore: qualityScore.seoScore,
      aeoScore: qualityScore.aeoScore,
      factCheckScore: qualityScore.factCheckScore,
      qualityScore: qualityScore.overallScore,
      contentVersion: 2,
      lastContentUpdate: new Date(),
      contentGenerationStatus: "completed",
      contentGenerationCompletedAt: new Date(),
    } as any)
    .where(eq(tiqetsAttractions.id, attractionId));
}

async function runGeneration(targetCount: number = 100): Promise<GenerationStats> {
  const stats: GenerationStats = {
    total: 0,
    successful: 0,
    failed: 0,
    averageScore: 0,
    highQuality: 0,
    startTime: new Date(),
  };

  const orchestrator = getOctypoOrchestrator({ maxRetries: 3, qualityThreshold: 85 });
  await orchestrator.initialize();

  const attractionsRaw = await getAttractionsToGenerate(targetCount + 50);

  const scores: number[] = [];

  for (const attraction of attractionsRaw) {
    if (stats.highQuality >= targetCount) {
      break;
    }

    stats.total++;

    try {
      const result = await orchestrator.generateAttractionContent(attraction);

      if (result.success && result.content && result.qualityScore) {
        const score = result.qualityScore.overallScore;
        scores.push(score);

        await saveGeneratedContent(attraction.originalId, result.content, result.qualityScore);
        stats.successful++;

        if (score >= 85) {
          stats.highQuality++;
        }
      } else {
        stats.failed++;
      }
    } catch (error) {
      stats.failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    if (stats.total % 10 === 0) {
      const elapsed = (Date.now() - stats.startTime.getTime()) / 1000 / 60;
      const rate = stats.total / elapsed;
    }
  }

  stats.endTime = new Date();
  stats.averageScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return stats;
}

const targetCount = parseInt(process.argv[2] || "100", 10);
runGeneration(targetCount)
  .then(stats => {
    if (stats.highQuality >= targetCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    process.exit(1);
  });
