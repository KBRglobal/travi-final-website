/**
 * PILOT: Octypo × Localization Integration
 * ========================================
 * This is a minimal, isolated pilot for native locale content generation.
 * 
 * CONSTRAINTS:
 * - en + ar locales ONLY
 * - Attraction entity type ONLY
 * - No i18next/t() fallbacks
 * - LocalePurity ≥98% hard gate (no soft warnings)
 * - Atomic write (all validators pass or nothing written)
 * - No abstractions "for later"
 * 
 * SYSTEM STATUS:
 * - ready: Infrastructure complete, waiting for generation trigger
 * - blocked_ai: AI providers unavailable (rate limited/quota exceeded)
 * - running: Content generation in progress
 * - done: Localization system infrastructure complete
 */

import { db } from "../../db";
import { pilotLocalizedContent, type InsertPilotLocalizedContent } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { OctypoOrchestrator } from "../orchestration/orchestrator";
import type { AttractionData, GeneratedAttractionContent } from "../types";
import { EngineRegistry } from "../../services/engine-registry";

// ============================================================================
// LOCALIZATION SYSTEM STATUS
// ============================================================================

export type LocalizationSystemStatus = "ready" | "blocked_ai" | "running" | "done";

export interface LocalizationSystemState {
  status: LocalizationSystemStatus;
  infrastructure: {
    localeAwareGeneration: boolean;
    purityValidators: boolean;
    atomicWrite: boolean;
    frontendEnforcement: boolean;
  };
  aiProviders: {
    available: boolean;
    blockedProviders: Array<{
      provider: string;
      reason: string;
      suspendedUntil?: string;
    }>;
    healthyEngineCount: number;
    totalEngineCount: number;
  };
  execution: {
    pendingJobs: number;
    completedJobs: number;
    failedJobs: number;
  };
}

let currentGenerationCount = 0;

export async function getLocalizationSystemStatus(): Promise<LocalizationSystemState> {
  // Check AI provider availability
  let aiProviders: LocalizationSystemState["aiProviders"] = {
    available: false,
    blockedProviders: [],
    healthyEngineCount: 0,
    totalEngineCount: 0,
  };

  try {
    const engineCount = EngineRegistry.getEngineCount();
    aiProviders.totalEngineCount = engineCount;
    // For now, assume all engines are healthy since we can't easily get per-engine health
    // The actual availability will be determined by whether generation succeeds
    aiProviders.healthyEngineCount = engineCount;
    aiProviders.available = engineCount > 0;
    
    // Note: We can't get detailed engine health without modifying EngineRegistry
    // For now, we'll track blocked providers from generation failures
  } catch (error) {
    console.log("[LocalizationSystem] Engine registry not initialized yet");
    aiProviders.available = false;
  }

  // Check execution status from database
  let execution = { pendingJobs: 0, completedJobs: 0, failedJobs: 0 };
  try {
    const results = await db
      .select({ status: pilotLocalizedContent.status })
      .from(pilotLocalizedContent);
    
    for (const row of results) {
      if (row.status === "published") execution.completedJobs++;
      else if (row.status === "failed") execution.failedJobs++;
      else execution.pendingJobs++;
    }
  } catch (error) {
    console.log("[LocalizationSystem] Could not query execution status");
  }

  // Determine overall status
  let status: LocalizationSystemStatus;
  if (currentGenerationCount > 0) {
    status = "running";
  } else if (!aiProviders.available) {
    status = "blocked_ai";
  } else {
    status = "ready";
  }

  return {
    status,
    infrastructure: {
      localeAwareGeneration: true,
      purityValidators: true,
      atomicWrite: true,
      frontendEnforcement: true,
    },
    aiProviders,
    execution,
  };
}

export function incrementGenerationCount() {
  currentGenerationCount++;
}

export function decrementGenerationCount() {
  currentGenerationCount = Math.max(0, currentGenerationCount - 1);
}

// ============================================================================
// TYPES
// ============================================================================

export interface PilotGenerationRequest {
  entityType: "attraction";
  entityId: string;
  destination: string; // REQUIRED - no fallback
  locale: "en" | "ar";
  strict?: boolean; // Strict mode - fail immediately on any error
}

export interface PilotValidationResults {
  completeness: { passed: boolean; missingSections: string[] };
  localePurity: { passed: boolean; score: number; threshold: number };
  blueprint: { passed: boolean; issues: string[] };
  seoAeo: { passed: boolean; issues: string[] };
}

export interface PilotGenerationResult {
  success: boolean;
  entityId: string;
  locale: string;
  destination: string;
  contentId?: string;
  validationResults?: PilotValidationResults;
  failureReason?: string;
  writerAgent?: string;
  engineUsed?: string;
  tokensUsed?: number;
  generationTimeMs?: number;
}

// ============================================================================
// LOCALE PURITY VALIDATOR - HARD GATE (≥98%)
// ============================================================================

export const LOCALE_PURITY_THRESHOLD = 0.98; // 98% - HARD GATE

// Arabic Unicode ranges
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

// Destination-agnostic technical terms (NO city-specific names)
const UNIVERSAL_TECHNICAL_PATTERNS = [
  /\b(WhatsApp|Google|Maps|Uber|WiFi|GPS|URL|HTTP|HTTPS|API)\b/gi,
  /\b\d+:\d+\b/g, // Time patterns like 10:00
  /\b\d+[.,]?\d*\s*(AED|USD|EUR|GBP|km|m|mi|ft|min|hr|hours?|minutes?)\b/gi, // Measurements
  /\b\d{4}\b/g, // Years
];

export function calculateLocalePurity(
  text: string, 
  targetLocale: "en" | "ar",
  exemptions: string[] = []
): number {
  if (!text || text.trim().length === 0) return 1.0;
  
  // Remove universal technical terms (they're acceptable in any locale)
  let cleanText = text;
  for (const pattern of UNIVERSAL_TECHNICAL_PATTERNS) {
    cleanText = cleanText.replace(pattern, "");
  }
  
  // Remove dynamic exemptions (attraction name, venue name, etc.)
  for (const exemption of exemptions) {
    if (exemption && exemption.trim()) {
      const escapedExemption = exemption.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleanText = cleanText.replace(new RegExp(escapedExemption, 'gi'), "");
    }
  }
  
  // Remove punctuation and numbers
  cleanText = cleanText.replace(/[0-9.,!?;:'"()\[\]{}<>@#$%^&*+=_~`\\|\/\-–—]/g, " ");
  cleanText = cleanText.trim();
  
  if (cleanText.length === 0) return 1.0;
  
  if (targetLocale === "ar") {
    // Count Arabic characters
    const arabicChars = (cleanText.match(ARABIC_REGEX) || []).length;
    // Count total non-whitespace characters
    const totalChars = cleanText.replace(/\s/g, "").length;
    
    if (totalChars === 0) return 1.0;
    return arabicChars / totalChars;
  } else {
    // For English, count Latin characters
    const latinChars = (cleanText.match(/[a-zA-Z]/g) || []).length;
    const totalChars = cleanText.replace(/\s/g, "").length;
    
    if (totalChars === 0) return 1.0;
    return latinChars / totalChars;
  }
}

export function validateLocalePurity(
  content: GeneratedAttractionContent, 
  locale: "en" | "ar",
  exemptions: string[] = []
): { passed: boolean; score: number; threshold: number } {
  const allText = [
    content.introduction || "",
    content.whatToExpect || "",
    content.visitorTips || "",
    content.howToGetThere || "",
    content.metaTitle || "",
    content.metaDescription || "",
    content.answerCapsule || "",
    ...(content.faq?.map(f => `${f.question} ${f.answer}`) || []),
  ].join(" ");
  
  const score = calculateLocalePurity(allText, locale, exemptions);
  const passed = score >= LOCALE_PURITY_THRESHOLD;
  
  console.log(`[LocalePurityValidator] Locale: ${locale}, Score: ${(score * 100).toFixed(1)}%, Threshold: ${LOCALE_PURITY_THRESHOLD * 100}%, Passed: ${passed}, Exemptions: ${exemptions.length}`);
  
  return {
    passed,
    score,
    threshold: LOCALE_PURITY_THRESHOLD,
  };
}

// ============================================================================
// COMPLETENESS VALIDATOR
// ============================================================================

const REQUIRED_SECTIONS = [
  "introduction",
  "whatToExpect", 
  "visitorTips",
  "howToGetThere",
  "faq",
  "answerCapsule",
  "metaTitle",
  "metaDescription",
] as const;

export function validateCompleteness(content: GeneratedAttractionContent): {
  passed: boolean;
  missingSections: string[];
} {
  const missingSections: string[] = [];
  
  for (const section of REQUIRED_SECTIONS) {
    if (section === "faq") {
      if (!content.faq || content.faq.length === 0) {
        missingSections.push("faq");
      }
    } else {
      const value = content[section as keyof GeneratedAttractionContent];
      if (!value || (typeof value === "string" && value.trim().length === 0)) {
        missingSections.push(section);
      }
    }
  }
  
  const passed = missingSections.length === 0;
  console.log(`[CompletenessValidator] Passed: ${passed}, Missing: ${missingSections.join(", ") || "none"}`);
  
  return { passed, missingSections };
}

// ============================================================================
// BLUEPRINT VALIDATOR (word counts, FAQ count)
// ============================================================================

const BLUEPRINT_REQUIREMENTS = {
  introduction: { min: 150, max: 300 },
  whatToExpect: { min: 200, max: 400 },
  visitorTips: { min: 150, max: 300 },
  howToGetThere: { min: 100, max: 200 },
  faqCount: { min: 3, max: 6 },
  metaTitle: { min: 30, max: 60 },
  metaDescription: { min: 120, max: 160 },
};

function countWords(text: string | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export function validateBlueprint(content: GeneratedAttractionContent): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check section word counts
  const introWords = countWords(content.introduction);
  if (introWords < BLUEPRINT_REQUIREMENTS.introduction.min) {
    issues.push(`Introduction too short: ${introWords} words (min: ${BLUEPRINT_REQUIREMENTS.introduction.min})`);
  }
  
  const whatWords = countWords(content.whatToExpect);
  if (whatWords < BLUEPRINT_REQUIREMENTS.whatToExpect.min) {
    issues.push(`whatToExpect too short: ${whatWords} words (min: ${BLUEPRINT_REQUIREMENTS.whatToExpect.min})`);
  }
  
  const tipsWords = countWords(content.visitorTips);
  if (tipsWords < BLUEPRINT_REQUIREMENTS.visitorTips.min) {
    issues.push(`visitorTips too short: ${tipsWords} words (min: ${BLUEPRINT_REQUIREMENTS.visitorTips.min})`);
  }
  
  const directionsWords = countWords(content.howToGetThere);
  if (directionsWords < BLUEPRINT_REQUIREMENTS.howToGetThere.min) {
    issues.push(`howToGetThere too short: ${directionsWords} words (min: ${BLUEPRINT_REQUIREMENTS.howToGetThere.min})`);
  }
  
  // Check FAQ count
  const faqCount = content.faq?.length || 0;
  if (faqCount < BLUEPRINT_REQUIREMENTS.faqCount.min) {
    issues.push(`FAQ count too low: ${faqCount} (min: ${BLUEPRINT_REQUIREMENTS.faqCount.min})`);
  }
  
  // Check meta lengths
  const titleLength = (content.metaTitle || "").length;
  if (titleLength < BLUEPRINT_REQUIREMENTS.metaTitle.min || titleLength > BLUEPRINT_REQUIREMENTS.metaTitle.max) {
    issues.push(`Meta title length: ${titleLength} chars (should be ${BLUEPRINT_REQUIREMENTS.metaTitle.min}-${BLUEPRINT_REQUIREMENTS.metaTitle.max})`);
  }
  
  const descLength = (content.metaDescription || "").length;
  if (descLength < BLUEPRINT_REQUIREMENTS.metaDescription.min || descLength > BLUEPRINT_REQUIREMENTS.metaDescription.max) {
    issues.push(`Meta description length: ${descLength} chars (should be ${BLUEPRINT_REQUIREMENTS.metaDescription.min}-${BLUEPRINT_REQUIREMENTS.metaDescription.max})`);
  }
  
  const passed = issues.length === 0;
  console.log(`[BlueprintValidator] Passed: ${passed}, Issues: ${issues.length}`);
  
  return { passed, issues };
}

// ============================================================================
// SEO/AEO VALIDATOR (answer-first, intent match)
// ============================================================================

export function validateSeoAeo(content: GeneratedAttractionContent): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check answer capsule exists and is substantive
  if (!content.answerCapsule || content.answerCapsule.length < 50) {
    issues.push("Answer capsule missing or too short (min 50 chars)");
  }
  
  // Check FAQ format
  if (content.faq) {
    for (let i = 0; i < content.faq.length; i++) {
      const faqItem = content.faq[i];
      if (!faqItem.question || faqItem.question.length < 10) {
        issues.push(`FAQ ${i + 1}: Question too short or missing`);
      }
      if (!faqItem.answer || faqItem.answer.length < 30) {
        issues.push(`FAQ ${i + 1}: Answer too short or missing`);
      }
    }
  }
  
  // Check meta description contains keywords (basic check)
  if (content.metaDescription && content.metaTitle) {
    // Ensure meta description doesn't start with the exact same words as title
    const titleStart = content.metaTitle.slice(0, 20).toLowerCase();
    const descStart = content.metaDescription.slice(0, 20).toLowerCase();
    if (titleStart === descStart) {
      issues.push("Meta description starts the same as title - needs variation");
    }
  }
  
  const passed = issues.length === 0;
  console.log(`[SEO/AEOValidator] Passed: ${passed}, Issues: ${issues.length}`);
  
  return { passed, issues };
}

// ============================================================================
// ATOMIC WRITE PATH
// ============================================================================

async function atomicWrite(
  request: PilotGenerationRequest,
  content: GeneratedAttractionContent,
  validationResults: PilotValidationResults,
  metadata: {
    writerAgent?: string;
    engineUsed?: string;
    tokensUsed?: number;
    generationTimeMs?: number;
  }
): Promise<string> {
  const record: InsertPilotLocalizedContent = {
    entityType: "attraction",
    entityId: request.entityId,
    locale: request.locale,
    destination: request.destination,
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
    localePurityScore: validationResults.localePurity.score,
    validationResults: validationResults,
    status: "validated",
    writerAgent: metadata.writerAgent,
    engineUsed: metadata.engineUsed,
    tokensUsed: metadata.tokensUsed,
    generationTimeMs: metadata.generationTimeMs,
  };
  
  // Upsert: update if exists, insert if not
  const existing = await db
    .select()
    .from(pilotLocalizedContent)
    .where(
      and(
        eq(pilotLocalizedContent.entityType, "attraction"),
        eq(pilotLocalizedContent.entityId, request.entityId),
        eq(pilotLocalizedContent.locale, request.locale)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    await db
      .update(pilotLocalizedContent)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(pilotLocalizedContent.id, existing[0].id));
    return existing[0].id;
  } else {
    const inserted = await db
      .insert(pilotLocalizedContent)
      .values(record)
      .returning({ id: pilotLocalizedContent.id });
    return inserted[0].id;
  }
}

// ============================================================================
// MAIN PILOT GENERATION FUNCTION
// ============================================================================

export async function generatePilotContent(
  request: PilotGenerationRequest,
  attractionData: AttractionData
): Promise<PilotGenerationResult> {
  const startTime = Date.now();
  
  console.log(`[PilotLocalization] Starting generation:`);
  console.log(`  Entity: ${request.entityType}/${request.entityId}`);
  console.log(`  Locale: ${request.locale}`);
  console.log(`  Destination: ${request.destination}`);
  
  // FAIL-FAST: Validate input contract
  if (!request.destination || request.destination.trim() === "") {
    throw new Error("PILOT_FAIL: destination is REQUIRED - no fallback allowed");
  }
  if (!request.locale || !["en", "ar"].includes(request.locale)) {
    throw new Error("PILOT_FAIL: locale must be 'en' or 'ar' only");
  }
  if (request.entityType !== "attraction") {
    throw new Error("PILOT_FAIL: entityType must be 'attraction' only for pilot");
  }
  
  try {
    // Step 1: Generate content with Octypo
    const orchestrator = new OctypoOrchestrator();
    
    // Call the locale-aware generation
    const result = await orchestrator.generateAttractionContentWithLocale(
      attractionData,
      request.locale
    );
    
    if (!result.success || !result.content) {
      // Mark as failed in DB
      await db.insert(pilotLocalizedContent).values({
        entityType: "attraction",
        entityId: request.entityId,
        locale: request.locale,
        destination: request.destination,
        status: "failed",
        failureReason: "Octypo generation failed",
        generationTimeMs: Date.now() - startTime,
      }).onConflictDoUpdate({
        target: [pilotLocalizedContent.entityType, pilotLocalizedContent.entityId, pilotLocalizedContent.locale],
        set: {
          status: "failed",
          failureReason: "Octypo generation failed",
          updatedAt: new Date(),
        },
      });
      
      return {
        success: false,
        entityId: request.entityId,
        locale: request.locale,
        destination: request.destination,
        failureReason: "Octypo generation failed",
        generationTimeMs: Date.now() - startTime,
      };
    }
    
    // Step 2: Run ALL validators BEFORE any DB write
    console.log(`[PilotLocalization] Running validators...`);
    
    // Build dynamic exemptions list for locale purity (proper nouns that can appear in any locale)
    const localePurityExemptions: string[] = [
      attractionData.title,                       // Attraction name is a proper noun
      attractionData.venueName,                   // Venue name is a proper noun
      attractionData.cityName,                    // City name is a proper noun
      request.destination,                        // Destination name is a proper noun
    ].filter((e): e is string => Boolean(e && e.trim()));
    
    const completenessResult = validateCompleteness(result.content);
    const localePurityResult = validateLocalePurity(result.content, request.locale, localePurityExemptions);
    const blueprintResult = validateBlueprint(result.content);
    const seoAeoResult = validateSeoAeo(result.content);
    
    const validationResults: PilotValidationResults = {
      completeness: completenessResult,
      localePurity: localePurityResult,
      blueprint: blueprintResult,
      seoAeo: seoAeoResult,
    };
    
    // Check if ALL validators passed
    const allPassed = 
      completenessResult.passed && 
      localePurityResult.passed && 
      blueprintResult.passed && 
      seoAeoResult.passed;
    
    if (!allPassed) {
      // ATOMIC: Validation failed - write NOTHING to content, only failure record
      const failureReasons: string[] = [];
      if (!completenessResult.passed) failureReasons.push(`Completeness: missing ${completenessResult.missingSections.join(", ")}`);
      if (!localePurityResult.passed) failureReasons.push(`LocalePurity: ${(localePurityResult.score * 100).toFixed(1)}% < ${localePurityResult.threshold * 100}%`);
      if (!blueprintResult.passed) failureReasons.push(`Blueprint: ${blueprintResult.issues.join("; ")}`);
      if (!seoAeoResult.passed) failureReasons.push(`SEO/AEO: ${seoAeoResult.issues.join("; ")}`);
      
      const failureReason = failureReasons.join(" | ");
      console.log(`[PilotLocalization] VALIDATION FAILED: ${failureReason}`);
      
      // Record failure in DB (no content written)
      await db.insert(pilotLocalizedContent).values({
        entityType: "attraction",
        entityId: request.entityId,
        locale: request.locale,
        destination: request.destination,
        status: "failed",
        failureReason,
        localePurityScore: localePurityResult.score,
        validationResults,
        writerAgent: result.writerId,
        engineUsed: result.engineUsed,
        generationTimeMs: Date.now() - startTime,
      }).onConflictDoUpdate({
        target: [pilotLocalizedContent.entityType, pilotLocalizedContent.entityId, pilotLocalizedContent.locale],
        set: {
          status: "failed",
          failureReason,
          localePurityScore: localePurityResult.score,
          validationResults,
          updatedAt: new Date(),
        },
      });
      
      return {
        success: false,
        entityId: request.entityId,
        locale: request.locale,
        destination: request.destination,
        validationResults,
        failureReason,
        writerAgent: result.writerId,
        engineUsed: result.engineUsed,
        generationTimeMs: Date.now() - startTime,
      };
    }
    
    // Step 3: All validators passed - ATOMIC WRITE
    console.log(`[PilotLocalization] All validators passed - writing content`);
    
    const contentId = await atomicWrite(request, result.content, validationResults, {
      writerAgent: result.writerId,
      engineUsed: result.engineUsed,
      tokensUsed: undefined, // TODO: track if needed
      generationTimeMs: Date.now() - startTime,
    });
    
    // Mark as published (ready for rendering)
    await db
      .update(pilotLocalizedContent)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(pilotLocalizedContent.id, contentId));
    
    console.log(`[PilotLocalization] SUCCESS: Content written with ID ${contentId}`);
    
    return {
      success: true,
      entityId: request.entityId,
      locale: request.locale,
      destination: request.destination,
      contentId,
      validationResults,
      writerAgent: result.writerId,
      engineUsed: result.engineUsed,
      generationTimeMs: Date.now() - startTime,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[PilotLocalization] ERROR: ${errorMessage}`);
    
    return {
      success: false,
      entityId: request.entityId,
      locale: request.locale,
      destination: request.destination,
      failureReason: errorMessage,
      generationTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// GET PILOT CONTENT (for frontend rendering)
// ============================================================================

export async function getPilotContent(
  entityType: "attraction",
  entityId: string,
  locale: "en" | "ar"
): Promise<typeof pilotLocalizedContent.$inferSelect | null> {
  const result = await db
    .select()
    .from(pilotLocalizedContent)
    .where(
      and(
        eq(pilotLocalizedContent.entityType, entityType),
        eq(pilotLocalizedContent.entityId, entityId),
        eq(pilotLocalizedContent.locale, locale),
        eq(pilotLocalizedContent.status, "published")
      )
    )
    .limit(1);
  
  return result[0] || null;
}
