/**
 * PILOT: Octypo × Localization API Routes
 * ========================================
 * Isolated endpoints for the localization pilot.
 * 
 * ENDPOINTS:
 * - POST /api/octypo/pilot/generate - Generate content for an attraction in a specific locale
 * - GET /api/octypo/pilot/content/:entityId/:locale - Get generated content for rendering
 * - GET /api/octypo/pilot/status/:entityId/:locale - Check generation status
 * - GET /api/octypo/pilot/system-status - Get localization system infrastructure status
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../db";
import { tiqetsAttractions, pilotLocalizedContent } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { 
  generatePilotContent, 
  getPilotContent, 
  getLocalizationSystemStatus,
  type PilotGenerationRequest 
} from "./localization-pilot";
import {
  getLocalizedGuideContent,
  saveLocalizedGuideContent,
  getGuideLocalizationStatus,
  type GuideLocalizationRequest,
  type GeneratedGuideContent,
} from "./guide-localization-pilot";
import type { AttractionData } from "../types";

const router = Router();

const generateRequestSchema = z.object({
  entityType: z.literal("attraction"),
  entityId: z.string().min(1, "entityId is required"),
  destination: z.string().min(1, "destination is REQUIRED - no fallback allowed"),
  locale: z.enum(["en", "ar"]),
});

router.post("/generate", async (req: Request, res: Response) => {
  try {
    const parseResult = generateRequestSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "PILOT_FAIL: Invalid input contract",
        details: parseResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`),
      });
    }
    
    const { entityType, entityId, destination, locale } = parseResult.data;
    
    console.log(`[PilotAPI] Generate request: ${entityType}/${entityId} locale=${locale} destination=${destination}`);
    
    const attraction = await db
      .select()
      .from(tiqetsAttractions)
      .where(eq(tiqetsAttractions.id, entityId))
      .limit(1);
    
    if (attraction.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Attraction not found: ${entityId}`,
      });
    }
    
    // FAIL-FAST: cityName is required, no fallback to destination
    if (!attraction[0].cityName) {
      return res.status(422).json({
        success: false,
        error: `PILOT_FAIL: Attraction ${entityId} is missing cityName - no fallback allowed`,
      });
    }
    
    const attractionData: AttractionData = {
      id: attraction[0].id,
      title: attraction[0].title,
      slug: attraction[0].slug,
      cityName: attraction[0].cityName,
      venueName: attraction[0].venueName || undefined,
      duration: attraction[0].duration || undefined,
      primaryCategory: attraction[0].primaryCategory || "general",
      rating: attraction[0].tiqetsRating ? parseFloat(attraction[0].tiqetsRating) : undefined,
      reviewCount: attraction[0].tiqetsReviewCount || 0,
      tiqetsDescription: attraction[0].tiqetsDescription || undefined,
      tiqetsHighlights: attraction[0].tiqetsHighlights as string[] || [],
      priceFrom: attraction[0].priceUsd ? parseFloat(attraction[0].priceUsd) : undefined,
    };
    
    const request: PilotGenerationRequest = {
      entityType,
      entityId,
      destination,
      locale,
    };
    
    const result = await generatePilotContent(request, attractionData);
    
    if (result.success) {
      return res.json({
        success: true,
        entityId: result.entityId,
        locale: result.locale,
        destination: result.destination,
        contentId: result.contentId,
        validationResults: result.validationResults,
        writerAgent: result.writerAgent,
        engineUsed: result.engineUsed,
        generationTimeMs: result.generationTimeMs,
      });
    } else {
      return res.status(422).json({
        success: false,
        entityId: result.entityId,
        locale: result.locale,
        destination: result.destination,
        failureReason: result.failureReason,
        validationResults: result.validationResults,
        generationTimeMs: result.generationTimeMs,
      });
    }
    
  } catch (error) {
    console.error("[PilotAPI] Generation error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

router.get("/content/:entityId/:locale", async (req: Request, res: Response) => {
  try {
    const { entityId, locale } = req.params;
    
    if (!["en", "ar"].includes(locale)) {
      return res.status(400).json({
        success: false,
        error: "PILOT_FAIL: locale must be 'en' or 'ar' only",
      });
    }
    
    const content = await getPilotContent("attraction", entityId, locale as "en" | "ar");
    
    if (!content) {
      return res.status(404).json({
        success: false,
        error: `No published content found for attraction ${entityId} in locale ${locale}`,
      });
    }
    
    return res.json({
      success: true,
      content: {
        id: content.id,
        entityType: content.entityType,
        entityId: content.entityId,
        locale: content.locale,
        destination: content.destination,
        introduction: content.introduction,
        whatToExpect: content.whatToExpect,
        visitorTips: content.visitorTips,
        howToGetThere: content.howToGetThere,
        faq: content.faq,
        answerCapsule: content.answerCapsule,
        metaTitle: content.metaTitle,
        metaDescription: content.metaDescription,
        imageAlt: content.imageAlt,
        imageCaption: content.imageCaption,
        localePurityScore: content.localePurityScore,
        status: content.status,
      },
    });
    
  } catch (error) {
    console.error("[PilotAPI] Content fetch error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

router.get("/status/:entityId/:locale", async (req: Request, res: Response) => {
  try {
    const { entityId, locale } = req.params;
    
    if (!["en", "ar"].includes(locale)) {
      return res.status(400).json({
        success: false,
        error: "PILOT_FAIL: locale must be 'en' or 'ar' only",
      });
    }
    
    const result = await db
      .select({
        id: pilotLocalizedContent.id,
        status: pilotLocalizedContent.status,
        localePurityScore: pilotLocalizedContent.localePurityScore,
        failureReason: pilotLocalizedContent.failureReason,
        validationResults: pilotLocalizedContent.validationResults,
        createdAt: pilotLocalizedContent.createdAt,
        updatedAt: pilotLocalizedContent.updatedAt,
      })
      .from(pilotLocalizedContent)
      .where(
        and(
          eq(pilotLocalizedContent.entityType, "attraction"),
          eq(pilotLocalizedContent.entityId, entityId),
          eq(pilotLocalizedContent.locale, locale)
        )
      )
      .limit(1);
    
    if (result.length === 0) {
      return res.json({
        success: true,
        exists: false,
        entityId,
        locale,
      });
    }
    
    return res.json({
      success: true,
      exists: true,
      entityId,
      locale,
      status: result[0].status,
      localePurityScore: result[0].localePurityScore,
      failureReason: result[0].failureReason,
      validationResults: result[0].validationResults,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
    });
    
  } catch (error) {
    console.error("[PilotAPI] Status check error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

router.get("/attractions/available", async (_req: Request, res: Response) => {
  try {
    const availableAttractions = await db
      .select({
        id: tiqetsAttractions.id,
        title: tiqetsAttractions.title,
        slug: tiqetsAttractions.slug,
        cityName: tiqetsAttractions.cityName,
      })
      .from(tiqetsAttractions)
      .where(eq(tiqetsAttractions.status, "published"))
      .limit(10);
    
    return res.json({
      success: true,
      count: availableAttractions.length,
      attractions: availableAttractions,
    });
    
  } catch (error) {
    console.error("[PilotAPI] Attractions list error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

router.get("/system-status", async (_req: Request, res: Response) => {
  try {
    const status = await getLocalizationSystemStatus();
    
    return res.json({
      success: true,
      systemStatus: status.status,
      infrastructure: status.infrastructure,
      aiProviders: status.aiProviders,
      execution: status.execution,
      message: status.status === "blocked_ai" 
        ? "Localization system infrastructure is COMPLETE. AI providers are currently unavailable."
        : status.status === "running"
        ? "Content generation is in progress."
        : "Localization system is ready for content generation.",
    });
    
  } catch (error) {
    console.error("[PilotAPI] System status error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

router.get("/execution-payload", async (_req: Request, res: Response) => {
  try {
    const availableAttractions = await db
      .select({
        id: tiqetsAttractions.id,
        title: tiqetsAttractions.title,
        cityName: tiqetsAttractions.cityName,
      })
      .from(tiqetsAttractions)
      .where(eq(tiqetsAttractions.status, "published"))
      .limit(1);
    
    if (availableAttractions.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No published attractions available for pilot",
      });
    }
    
    const attraction = availableAttractions[0];
    
    const payload = {
      entityType: "attraction" as const,
      entityId: attraction.id,
      destination: attraction.cityName,
      locale: "en" as const,
      strict: true,
    };
    
    return res.json({
      success: true,
      message: "Execution payload ready. Call POST /api/octypo/pilot/generate with this payload when AI providers are available.",
      payload,
      samplePayloads: {
        english: { ...payload, locale: "en" },
        arabic: { ...payload, locale: "ar" },
      },
    });
    
  } catch (error) {
    console.error("[PilotAPI] Execution payload error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

// ============================================================================
// GUIDE LOCALIZATION ROUTES
// ============================================================================

const guideContentSchema = z.object({
  guideSlug: z.string().min(1, "guideSlug is required"),
  locale: z.enum(["en", "ar"]),
  destination: z.string().min(1, "destination is REQUIRED - no fallback allowed"),
  sourceGuideId: z.number().optional(),
  content: z.object({
    introduction: z.string().optional(),
    whatToExpect: z.string().optional(),
    highlights: z.array(z.string()).optional(),
    tips: z.string().optional(),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
    answerCapsule: z.string().optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
  }),
});

router.post("/guides/save", async (req: Request, res: Response) => {
  try {
    const parseResult = guideContentSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "GUIDE_FAIL: Invalid input contract",
        details: parseResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`),
      });
    }
    
    const { guideSlug, locale, destination, sourceGuideId, content } = parseResult.data;
    
    console.log(`[GuidePilotAPI] Save request: ${guideSlug} locale=${locale} destination=${destination}`);
    
    const request: GuideLocalizationRequest = {
      guideSlug,
      locale,
      destination,
      sourceGuideId,
    };
    
    const result = await saveLocalizedGuideContent(request, content as GeneratedGuideContent, {
      writerAgent: "manual-entry",
      engineUsed: "human",
    });
    
    if (result.success) {
      return res.json({
        success: true,
        guideSlug: result.guideSlug,
        locale: result.locale,
        destination: result.destination,
        contentId: result.contentId,
        validationResults: result.validationResults,
        generationTimeMs: result.generationTimeMs,
      });
    } else {
      return res.status(422).json({
        success: false,
        guideSlug: result.guideSlug,
        locale: result.locale,
        destination: result.destination,
        failureReason: result.failureReason,
        validationResults: result.validationResults,
        generationTimeMs: result.generationTimeMs,
      });
    }
    
  } catch (error) {
    console.error("[GuidePilotAPI] Save error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

router.get("/guides/content/:guideSlug/:locale", async (req: Request, res: Response) => {
  try {
    const { guideSlug, locale } = req.params;
    
    if (!["en", "ar", "fr"].includes(locale)) {
      return res.status(400).json({
        success: false,
        error: "GUIDE_FAIL: locale must be 'en', 'ar', or 'fr' only",
      });
    }
    
    const result = await getLocalizedGuideContent(guideSlug, locale as "en" | "ar" | "fr");
    
    if (!result.found || !result.content) {
      return res.status(404).json({
        success: false,
        exists: false,
        guideSlug,
        locale,
        message: locale !== "en" 
          ? "Localized content pending generation - NO English fallback"
          : "Content not found",
      });
    }
    
    return res.json({
      success: true,
      exists: true,
      guideSlug,
      locale,
      content: result.content,
    });
    
  } catch (error) {
    console.error("[GuidePilotAPI] Content fetch error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

router.get("/guides/status/:guideSlug", async (req: Request, res: Response) => {
  try {
    const { guideSlug } = req.params;
    
    const status = await getGuideLocalizationStatus(guideSlug);
    
    return res.json({
      success: true,
      guideSlug,
      locales: status,
    });
    
  } catch (error) {
    console.error("[GuidePilotAPI] Status check error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;
