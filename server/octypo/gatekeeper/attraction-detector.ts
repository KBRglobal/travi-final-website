/**
 * Attraction Detector
 *
 * Detects when RSS feed items are about new tourist attractions.
 * When detected, creates an attraction draft and optionally triggers Tiqets search.
 *
 * Part of Phase 4: Attraction Detection from RSS feeds
 */

import { EngineRegistry, generateWithEngine } from "../../services/engine-registry";
import { logger } from "../../lib/logger";
import { db } from "../../db";
import { tiqetsAttractions } from "@shared/schema";
import { ilike } from "drizzle-orm";
import { detectDestinationFromContent } from "../rss-reader";

// ============================================================================
// TYPES
// ============================================================================

export interface RssFeedItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedDate?: Date;
  category?: string;
}

export type AttractionType =
  | "theme_park"
  | "museum"
  | "experience"
  | "tour"
  | "observation"
  | "water_park"
  | "entertainment"
  | "landmark"
  | "cultural"
  | "nature"
  | "sports"
  | "shopping"
  | "other";

export interface AttractionDetection {
  isAttraction: true;
  attractionName: string;
  attractionType: AttractionType;
  destinationId: string | null;
  cityName: string | null;
  openingDate: string | null;
  priceRange: string | null;
  description: string;
  confidence: number; // 0-100
  reasoning: string;
}

export interface NoAttractionDetection {
  isAttraction: false;
  reasoning: string;
}

export type DetectionResult = AttractionDetection | NoAttractionDetection;

// ============================================================================
// ATTRACTION INDICATORS
// ============================================================================

const OPENING_INDICATORS = [
  "opens",
  "opening",
  "launched",
  "launches",
  "unveiled",
  "unveils",
  "debuts",
  "inaugurates",
  "grand opening",
  "soft opening",
  "now open",
  "officially open",
  "set to open",
  "will open",
  "opening soon",
  "new attraction",
  "newest attraction",
];

const TYPE_INDICATORS = [
  "theme park",
  "amusement park",
  "museum",
  "gallery",
  "attraction",
  "experience",
  "exhibit",
  "exhibition",
  "roller coaster",
  "ride",
  "water park",
  "aquarium",
  "zoo",
  "safari",
  "observation deck",
  "observation wheel",
  "viewing platform",
  "tour",
  "landmark",
  "monument",
  "entertainment center",
  "entertainment complex",
  "cultural center",
  "heritage site",
  "adventure park",
  "indoor park",
];

const BRAND_INDICATORS = [
  "disney",
  "universal",
  "legoland",
  "madame tussauds",
  "sea life",
  "ripley",
  "hard rock",
  "warner bros",
  "paramount",
  "ferrari world",
  "img worlds",
  "kidzania",
  "motiongate",
  "bollywood parks",
  "aquaventure",
  "wild wadi",
  "atlantis",
  "dubai parks",
  "ski dubai",
  "dubai mall",
  "burj khalifa",
  "ain dubai",
  "museum of the future",
  "louvre abu dhabi",
];

// ============================================================================
// DETECTION PROMPT
// ============================================================================

const DETECTION_SYSTEM_PROMPT = `You are an attraction detection specialist for a travel content platform.
Your job is to analyze news items and determine if they are announcing a NEW tourist attraction.

ONLY flag items that are about:
- A NEW attraction opening (not existing attractions)
- A significant NEW addition to an existing attraction (new ride, new exhibit)
- A major renovation/reopening of an attraction

DO NOT flag items that are:
- General news about existing attractions
- Reviews of existing attractions
- Event announcements at existing venues
- Travel tips or guides
- Price changes or promotions

Be conservative - only flag clear announcements of NEW attractions.`;

const DETECTION_USER_PROMPT = `Analyze this news item and determine if it's announcing a NEW tourist attraction:

Title: {title}
Summary: {summary}
URL: {url}

If this IS about a new attraction, respond with JSON:
{
  "isAttraction": true,
  "attractionName": "Name of the attraction",
  "attractionType": "theme_park|museum|experience|tour|observation|water_park|entertainment|landmark|cultural|nature|sports|shopping|other",
  "cityName": "City name if mentioned",
  "openingDate": "Opening date if mentioned (YYYY-MM-DD format or descriptive like 'Q2 2026')",
  "priceRange": "Price range if mentioned",
  "description": "Brief description of the attraction",
  "confidence": 85,
  "reasoning": "Why this is flagged as a new attraction"
}

If this is NOT about a new attraction, respond with JSON:
{
  "isAttraction": false,
  "reasoning": "Why this is not a new attraction announcement"
}

Respond with ONLY valid JSON, no markdown.`;

// ============================================================================
// ATTRACTION DETECTOR CLASS
// ============================================================================

export class AttractionDetector {
  private static instance: AttractionDetector | null = null;

  static getInstance(): AttractionDetector {
    if (!AttractionDetector.instance) {
      AttractionDetector.instance = new AttractionDetector();
    }
    return AttractionDetector.instance;
  }

  /**
   * Quick pre-filter check using keyword matching.
   * Returns true if the item MIGHT be about an attraction (worth analyzing with AI).
   */
  preFilter(item: RssFeedItem): boolean {
    const text = `${item.title} ${item.summary}`.toLowerCase();

    // Must have at least one opening indicator
    const hasOpeningIndicator = OPENING_INDICATORS.some(ind => text.includes(ind));

    // Must have at least one type or brand indicator
    const hasTypeIndicator = TYPE_INDICATORS.some(ind => text.includes(ind));
    const hasBrandIndicator = BRAND_INDICATORS.some(ind => text.includes(ind));

    // Require opening indicator AND (type OR brand)
    return hasOpeningIndicator && (hasTypeIndicator || hasBrandIndicator);
  }

  /**
   * Full AI analysis of an RSS item to detect attractions.
   */
  async detect(item: RssFeedItem): Promise<DetectionResult> {
    // First, do a quick pre-filter
    if (!this.preFilter(item)) {
      return {
        isAttraction: false,
        reasoning: "Does not match attraction keyword patterns",
      };
    }

    logger.info({ title: item.title.substring(0, 50) }, "[AttractionDetector] Analyzing item");

    try {
      const prompt = DETECTION_USER_PROMPT.replace("{title}", item.title)
        .replace("{summary}", item.summary || "No summary")
        .replace("{url}", item.url);

      // Use AI to analyze
      const response = await this.callLLM(prompt);
      const result = this.parseResponse(response);

      // If detected, try to match destination
      if (result.isAttraction) {
        const destinationId = detectDestinationFromContent(item.title, item.summary);
        result.destinationId = destinationId;

        logger.info(
          {
            attractionName: result.attractionName,
            type: result.attractionType,
            confidence: result.confidence,
            destinationId,
          },
          "[AttractionDetector] Attraction detected"
        );
      }

      return result;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : "Unknown" },
        "[AttractionDetector] Detection failed"
      );

      return {
        isAttraction: false,
        reasoning: `Detection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Create an attraction draft from detection result.
   * This creates a placeholder in the tiqets_attractions table with status='detected'.
   */
  async createAttractionDraft(
    detection: AttractionDetection,
    sourceItem: RssFeedItem
  ): Promise<string | null> {
    try {
      // Check if attraction already exists (by name similarity)
      const existing = await db
        .select()
        .from(tiqetsAttractions)
        .where(ilike(tiqetsAttractions.title, `%${detection.attractionName}%`))
        .limit(1);

      if (existing.length > 0) {
        logger.info(
          { attractionName: detection.attractionName, existingId: existing[0].id },
          "[AttractionDetector] Attraction already exists"
        );
        return existing[0].id;
      }

      // Generate a slug
      const slug = detection.attractionName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Create draft attraction
      const [newAttraction] = await db
        .insert(tiqetsAttractions)
        .values({
          tiqetsId: `detected-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: detection.attractionName,
          slug: slug,
          seoSlug: slug,
          cityName: detection.cityName || "Unknown",
          productUrl: sourceItem.url,
          primaryCategory: this.mapAttractionType(detection.attractionType),
          tiqetsDescription: detection.description,
          tiqetsSummary: detection.description,
          status: "imported", // Will be upgraded to 'ready' after content generation
          aiContent: {
            introduction: detection.description,
            whyVisit: "",
            proTip: "",
            whatToExpect: [],
            visitorTips: [],
            howToGetThere: { description: "", transport: [] },
            answerCapsule: "",
            schemaPayload: {},
          },
          contentGenerationStatus: "pending",
        } as any)
        .returning();

      logger.info(
        {
          id: newAttraction.id,
          attractionName: detection.attractionName,
          cityName: detection.cityName,
        },
        "[AttractionDetector] Created attraction draft"
      );

      return newAttraction.id;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : "Unknown" },
        "[AttractionDetector] Failed to create draft"
      );
      return null;
    }
  }

  /**
   * Process an RSS item: detect and optionally create draft.
   */
  async processItem(
    item: RssFeedItem,
    options: { createDraft?: boolean } = {}
  ): Promise<{
    detected: boolean;
    result: DetectionResult;
    draftId?: string;
  }> {
    const result = await this.detect(item);

    if (!result.isAttraction) {
      return { detected: false, result };
    }

    let draftId: string | undefined;
    if (options.createDraft) {
      const id = await this.createAttractionDraft(result, item);
      draftId = id || undefined;
    }

    return { detected: true, result, draftId };
  }

  /**
   * Batch process multiple RSS items.
   */
  async processBatch(
    items: RssFeedItem[],
    options: { createDraft?: boolean } = {}
  ): Promise<
    Array<{
      itemId: string;
      detected: boolean;
      result: DetectionResult;
      draftId?: string;
    }>
  > {
    const results = [];

    for (const item of items) {
      const processResult = await this.processItem(item, options);
      results.push({
        itemId: item.id,
        ...processResult,
      });
    }

    return results;
  }

  private async callLLM(prompt: string): Promise<string> {
    const preferredProviders = ["anthropic", "openai", "gemini"];
    const triedEngines = new Set<string>();
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const engine =
        EngineRegistry.getNextByProviderPreference(preferredProviders, triedEngines) ||
        EngineRegistry.getNextFromQueue(triedEngines);

      if (!engine) {
        throw new Error("No available engine for attraction detection");
      }

      triedEngines.add(engine.id);

      if (!engine.isHealthy) {
        continue;
      }

      try {
        const response = await generateWithEngine(engine, DETECTION_SYSTEM_PROMPT, prompt);
        EngineRegistry.reportSuccess(engine.id);
        return response;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        EngineRegistry.reportError(engine.id, errorMsg);
        continue;
      }
    }

    throw new Error("All LLM engines failed for attraction detection");
  }

  private parseResponse(response: string): DetectionResult {
    let jsonStr = response;

    // Extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to find JSON object directly
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonStr);

      if (parsed.isAttraction === true) {
        return {
          isAttraction: true,
          attractionName: parsed.attractionName || "Unknown Attraction",
          attractionType: this.validateAttractionType(parsed.attractionType),
          destinationId: null,
          cityName: parsed.cityName || null,
          openingDate: parsed.openingDate || null,
          priceRange: parsed.priceRange || null,
          description: parsed.description || "",
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 50,
          reasoning: parsed.reasoning || "AI detected as new attraction",
        };
      }

      return {
        isAttraction: false,
        reasoning: parsed.reasoning || "Not a new attraction announcement",
      };
    } catch (error) {
      logger.error("[AttractionDetector] Failed to parse LLM response");
      return {
        isAttraction: false,
        reasoning: "Failed to parse detection response",
      };
    }
  }

  private validateAttractionType(type: string): AttractionType {
    const validTypes: AttractionType[] = [
      "theme_park",
      "museum",
      "experience",
      "tour",
      "observation",
      "water_park",
      "entertainment",
      "landmark",
      "cultural",
      "nature",
      "sports",
      "shopping",
      "other",
    ];

    const normalized = type?.toLowerCase().replace(/\s+/g, "_");
    return validTypes.includes(normalized as AttractionType)
      ? (normalized as AttractionType)
      : "other";
  }

  private mapAttractionType(type: AttractionType): string {
    const mapping: Record<AttractionType, string> = {
      theme_park: "Theme Park",
      museum: "Museum",
      experience: "Experience",
      tour: "Tour",
      observation: "Observation",
      water_park: "Water Park",
      entertainment: "Entertainment",
      landmark: "Landmark",
      cultural: "Cultural",
      nature: "Nature",
      sports: "Sports",
      shopping: "Shopping",
      other: "Attraction",
    };
    return mapping[type] || "Attraction";
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const attractionDetector = AttractionDetector.getInstance();

export function getAttractionDetector(): AttractionDetector {
  return AttractionDetector.getInstance();
}
