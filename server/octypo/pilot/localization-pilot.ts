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
import {
  pilotLocalizedContent,
  nativeLocalizedContent,
  type InsertPilotLocalizedContent,
  nativeLocales,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { OctypoOrchestrator } from "../orchestration/orchestrator";
import type { AttractionData, GeneratedAttractionContent } from "../types";
import { EngineRegistry } from "../../services/engine-registry";
import {
  getCulturalContext,
  getLocaleTier,
  getAllSupportedLocales,
} from "../../localization/cultural-contexts";
import { validateLocalePurity as validateLocalePurityExternal } from "../../localization/validators/locale-purity";
import { runQualityGates } from "../../localization/validators/quality-gates";
import { getPrimaryScripts, SCRIPT_REGEX } from "../../localization/validators/script-validators";

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
    console.error("[LocalizationPilot] Error getting execution status:", error);
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
  locale: "en" | "ar" | "fr"; // Extended to support French
  strict?: boolean; // Strict mode - fail immediately on any error
}

// All 30 supported locales for native content
export type NativeLocale = (typeof nativeLocales)[number];

export interface NativeGenerationRequest {
  entityType: "attraction" | "guide" | "destination" | "district";
  entityId: string;
  destination: string;
  locale: NativeLocale;
  title?: string;
  strict?: boolean;
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

// Extended Latin regex for French accented characters
const FRENCH_LATIN_REGEX = /[a-zA-ZàâäæçéèêëïîôœùûüÿÀÂÄÆÇÉÈÊËÏÎÔŒÙÛÜŸ]/g;

export function calculateLocalePurity(
  text: string,
  targetLocale: "en" | "ar" | "fr",
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
      const escapedExemption = exemption.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleanText = cleanText.replace(new RegExp(escapedExemption, "gi"), "");
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
  } else if (targetLocale === "fr") {
    // For French, count Latin characters including French accented characters
    const latinChars = (cleanText.match(FRENCH_LATIN_REGEX) || []).length;
    const totalChars = cleanText.replace(/\s/g, "").length;

    if (totalChars === 0) return 1.0;
    return latinChars / totalChars;
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
  locale: "en" | "ar" | "fr",
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
    ...(content.faqs?.map(f => `${f.question} ${f.answer}`) || []),
  ].join(" ");

  const score = calculateLocalePurity(allText, locale, exemptions);
  const passed = score >= LOCALE_PURITY_THRESHOLD;

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
      if (!content.faqs || content.faqs.length === 0) {
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
  return text
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0).length;
}

export function validateBlueprint(content: GeneratedAttractionContent): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check section word counts
  const introWords = countWords(content.introduction);
  if (introWords < BLUEPRINT_REQUIREMENTS.introduction.min) {
    issues.push(
      `Introduction too short: ${introWords} words (min: ${BLUEPRINT_REQUIREMENTS.introduction.min})`
    );
  }

  const whatWords = countWords(content.whatToExpect);
  if (whatWords < BLUEPRINT_REQUIREMENTS.whatToExpect.min) {
    issues.push(
      `whatToExpect too short: ${whatWords} words (min: ${BLUEPRINT_REQUIREMENTS.whatToExpect.min})`
    );
  }

  const tipsWords = countWords(content.visitorTips);
  if (tipsWords < BLUEPRINT_REQUIREMENTS.visitorTips.min) {
    issues.push(
      `visitorTips too short: ${tipsWords} words (min: ${BLUEPRINT_REQUIREMENTS.visitorTips.min})`
    );
  }

  const directionsWords = countWords(content.howToGetThere);
  if (directionsWords < BLUEPRINT_REQUIREMENTS.howToGetThere.min) {
    issues.push(
      `howToGetThere too short: ${directionsWords} words (min: ${BLUEPRINT_REQUIREMENTS.howToGetThere.min})`
    );
  }

  // Check FAQ count
  const faqCount = content.faqs?.length || 0;
  if (faqCount < BLUEPRINT_REQUIREMENTS.faqCount.min) {
    issues.push(`FAQ count too low: ${faqCount} (min: ${BLUEPRINT_REQUIREMENTS.faqCount.min})`);
  }

  // Check meta lengths
  const titleLength = (content.metaTitle || "").length;
  if (
    titleLength < BLUEPRINT_REQUIREMENTS.metaTitle.min ||
    titleLength > BLUEPRINT_REQUIREMENTS.metaTitle.max
  ) {
    issues.push(
      `Meta title length: ${titleLength} chars (should be ${BLUEPRINT_REQUIREMENTS.metaTitle.min}-${BLUEPRINT_REQUIREMENTS.metaTitle.max})`
    );
  }

  const descLength = (content.metaDescription || "").length;
  if (
    descLength < BLUEPRINT_REQUIREMENTS.metaDescription.min ||
    descLength > BLUEPRINT_REQUIREMENTS.metaDescription.max
  ) {
    issues.push(
      `Meta description length: ${descLength} chars (should be ${BLUEPRINT_REQUIREMENTS.metaDescription.min}-${BLUEPRINT_REQUIREMENTS.metaDescription.max})`
    );
  }

  const passed = issues.length === 0;

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
  if (content.faqs) {
    for (let i = 0; i < content.faqs.length; i++) {
      const faqItem = content.faqs[i];
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
    faq: content.faqs,
    answerCapsule: content.answerCapsule,
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
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
      .set(record as any)
      .where(eq(pilotLocalizedContent.id, existing[0].id));
    return existing[0].id;
  } else {
    const inserted = await db
      .insert(pilotLocalizedContent)
      .values(record as any)
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

  // FAIL-FAST: Validate input contract
  if (!request.destination || request.destination.trim() === "") {
    throw new Error("PILOT_FAIL: destination is REQUIRED - no fallback allowed");
  }
  if (!request.locale || !["en", "ar", "fr"].includes(request.locale)) {
    throw new Error("PILOT_FAIL: locale must be 'en', 'ar', or 'fr' only");
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
      await db
        .insert(pilotLocalizedContent)
        .values({
          entityType: "attraction",
          entityId: request.entityId,
          locale: request.locale,
          destination: request.destination,
          status: "failed",
          failureReason: "Octypo generation failed",
          generationTimeMs: Date.now() - startTime,
        } as any)
        .onConflictDoUpdate({
          target: [
            pilotLocalizedContent.entityType,
            pilotLocalizedContent.entityId,
            pilotLocalizedContent.locale,
          ],
          set: {
            failureReason: "Octypo generation failed",
          } as any,
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

    // Build dynamic exemptions list for locale purity (proper nouns that can appear in any locale)
    const localePurityExemptions: string[] = [
      attractionData.title, // Attraction name is a proper noun
      attractionData.venueName, // Venue name is a proper noun
      attractionData.cityName, // City name is a proper noun
      request.destination, // Destination name is a proper noun
    ].filter((e): e is string => Boolean(e && e.trim()));

    const completenessResult = validateCompleteness(result.content);
    const localePurityResult = validateLocalePurity(
      result.content,
      request.locale,
      localePurityExemptions
    );
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
      if (!completenessResult.passed)
        failureReasons.push(
          `Completeness: missing ${completenessResult.missingSections.join(", ")}`
        );
      if (!localePurityResult.passed)
        failureReasons.push(
          `LocalePurity: ${(localePurityResult.score * 100).toFixed(1)}% < ${localePurityResult.threshold * 100}%`
        );
      if (!blueprintResult.passed)
        failureReasons.push(`Blueprint: ${blueprintResult.issues.join("; ")}`);
      if (!seoAeoResult.passed) failureReasons.push(`SEO/AEO: ${seoAeoResult.issues.join("; ")}`);

      const failureReason = failureReasons.join(" | ");

      // Record failure in DB (no content written)
      await db
        .insert(pilotLocalizedContent)
        .values({
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
        } as any)
        .onConflictDoUpdate({
          target: [
            pilotLocalizedContent.entityType,
            pilotLocalizedContent.entityId,
            pilotLocalizedContent.locale,
          ],
          set: {
            failureReason,
            localePurityScore: localePurityResult.score,
            validationResults,
          } as any,
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

    const contentId = await atomicWrite(request, result.content, validationResults, {
      writerAgent: result.writerId,
      engineUsed: result.engineUsed,
      tokensUsed: undefined, // TODO: track if needed
      generationTimeMs: Date.now() - startTime,
    });

    // Mark as published (ready for rendering)
    await db
      .update(pilotLocalizedContent)
      .set({ status: "published" } as any)
      .where(eq(pilotLocalizedContent.id, contentId));

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

// ============================================================================
// NATIVE CONTENT ARCHITECTURE - 30 LOCALE SUPPORT
// ============================================================================

/**
 * Extended locale purity calculator for all 30 supported locales
 * Uses script validators from the cultural contexts system
 */
export function calculateLocalePurityExtended(
  text: string,
  targetLocale: NativeLocale,
  exemptions: string[] = []
): number {
  if (!text || text.trim().length === 0) return 1.0;

  // Remove universal technical terms
  let cleanText = text;
  for (const pattern of UNIVERSAL_TECHNICAL_PATTERNS) {
    cleanText = cleanText.replace(pattern, "");
  }

  // Remove dynamic exemptions
  for (const exemption of exemptions) {
    if (exemption && exemption.trim()) {
      const escapedExemption = exemption.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleanText = cleanText.replace(new RegExp(escapedExemption, "gi"), "");
    }
  }

  // Remove punctuation and numbers
  cleanText = cleanText.replace(/[0-9.,!?;:'"()\[\]{}<>@#$%^&*+=_~`\\|\/\-–—]/g, " ");
  cleanText = cleanText.trim();

  if (cleanText.length === 0) return 1.0;

  // Get primary scripts for this locale
  const primaryScripts = getPrimaryScripts(targetLocale);
  const primaryScript = primaryScripts[0] || "latin";
  const scriptRegex = SCRIPT_REGEX[primaryScript] || SCRIPT_REGEX.latin;

  // Count characters in target script
  const scriptMatches = cleanText.match(scriptRegex) || [];
  const scriptCharCount = scriptMatches.length;

  // Count total non-whitespace characters
  const totalChars = cleanText.replace(/\s/g, "").length;

  if (totalChars === 0) return 1.0;
  return scriptCharCount / totalChars;
}

/**
 * Validate content for native locale generation
 */
export function validateNativeContent(
  content: GeneratedAttractionContent,
  locale: NativeLocale,
  exemptions: string[] = []
): PilotValidationResults {
  // Calculate locale purity
  const allText = [
    content.introduction || "",
    content.whatToExpect || "",
    content.visitorTips || "",
    content.howToGetThere || "",
    content.metaTitle || "",
    content.metaDescription || "",
    content.answerCapsule || "",
    ...(content.faqs?.map(f => `${f.question} ${f.answer}`) || []),
  ].join(" ");

  const purityScore = calculateLocalePurityExtended(allText, locale, exemptions);
  const culturalContext = getCulturalContext(locale);
  const threshold = culturalContext?.quality.purityThreshold || 0.95;

  const completenessResult = validateCompleteness(content);
  const blueprintResult = validateBlueprint(content);
  const seoAeoResult = validateSeoAeo(content);

  return {
    completeness: completenessResult,
    localePurity: {
      passed: purityScore >= threshold,
      score: purityScore,
      threshold,
    },
    blueprint: blueprintResult,
    seoAeo: seoAeoResult,
  };
}

/**
 * Generate native content for any of the 30 supported locales
 */
export async function generateNativeContent(
  request: NativeGenerationRequest,
  attractionData: AttractionData
): Promise<{
  success: boolean;
  entityType: string;
  entityId: string;
  locale: string;
  destination: string;
  contentId?: string;
  validationResults?: PilotValidationResults;
  failureReason?: string;
  writerAgent?: string;
  engineUsed?: string;
  generationTimeMs?: number;
  culturalContextVersion?: string;
}> {
  const startTime = Date.now();

  // Validate locale is supported
  if (!getAllSupportedLocales().includes(request.locale)) {
    return {
      success: false,
      entityType: request.entityType,
      entityId: request.entityId,
      locale: request.locale,
      destination: request.destination,
      failureReason: `Unsupported locale: ${request.locale}`,
      generationTimeMs: Date.now() - startTime,
    };
  }

  const culturalContext = getCulturalContext(request.locale);
  if (!culturalContext) {
    return {
      success: false,
      entityType: request.entityType,
      entityId: request.entityId,
      locale: request.locale,
      destination: request.destination,
      failureReason: `No cultural context found for locale: ${request.locale}`,
      generationTimeMs: Date.now() - startTime,
    };
  }

  try {
    // Use the orchestrator's native content generation
    const orchestrator = new OctypoOrchestrator();
    const result = await orchestrator.generateNativeContent(
      request.entityType,
      request.entityId,
      request.destination,
      request.locale,
      attractionData
    );

    if (!result.success || !result.content) {
      // Record failure in native content table
      await db
        .insert(nativeLocalizedContent)
        .values({
          entityType: request.entityType,
          entityId: request.entityId,
          destination: request.destination,
          locale: request.locale,
          tier: culturalContext.tier,
          status: "failed",
          failureReason: result.failureReason || "Generation failed",
          localePurityScore: result.localePurityScore,
          writerAgent: result.writerAgent,
          engineUsed: result.engineUsed,
          generationTimeMs: result.generationTimeMs,
          culturalContextVersion: result.culturalContextVersion,
        } as any)
        .onConflictDoUpdate({
          target: [
            nativeLocalizedContent.entityType,
            nativeLocalizedContent.entityId,
            nativeLocalizedContent.locale,
          ],
          set: {
            status: "failed",
            failureReason: result.failureReason || "Generation failed",
            updatedAt: new Date(),
          } as any,
        });

      return {
        success: false,
        entityType: request.entityType,
        entityId: request.entityId,
        locale: request.locale,
        destination: request.destination,
        failureReason: result.failureReason,
        writerAgent: result.writerAgent,
        engineUsed: result.engineUsed,
        generationTimeMs: result.generationTimeMs,
        culturalContextVersion: result.culturalContextVersion,
      };
    }

    // Build validation results
    const exemptions = [
      attractionData.title,
      attractionData.venueName,
      attractionData.cityName,
      request.destination,
    ].filter((e): e is string => Boolean(e));

    const validationResults = validateNativeContent(result.content, request.locale, exemptions);

    // Insert or update native content
    const record = {
      entityType: request.entityType,
      entityId: request.entityId,
      destination: request.destination,
      locale: request.locale,
      tier: culturalContext.tier,
      title: request.title || attractionData.title,
      introduction: result.content.introduction,
      whatToExpect: result.content.whatToExpect,
      visitorTips: result.content.visitorTips,
      howToGetThere: result.content.howToGetThere,
      highlights: result.content.sensoryDescriptions,
      faq: result.content.faqs,
      answerCapsule: result.content.answerCapsule,
      metaTitle: result.content.metaTitle,
      metaDescription: result.content.metaDescription,
      localePurityScore: result.localePurityScore,
      validationResults: validationResults,
      status:
        validationResults.localePurity.passed && validationResults.completeness.passed
          ? "validated"
          : "failed",
      failureReason:
        validationResults.localePurity.passed && validationResults.completeness.passed
          ? undefined
          : "Validation failed",
      writerAgent: result.writerAgent,
      engineUsed: result.engineUsed,
      generationTimeMs: result.generationTimeMs,
      culturalContextVersion: result.culturalContextVersion,
    };

    // Upsert
    const existing = await db
      .select()
      .from(nativeLocalizedContent)
      .where(
        and(
          eq(nativeLocalizedContent.entityType, request.entityType as any),
          eq(nativeLocalizedContent.entityId, request.entityId),
          eq(nativeLocalizedContent.locale, request.locale)
        )
      )
      .limit(1);

    let contentId: string;
    if (existing.length > 0) {
      await db
        .update(nativeLocalizedContent)
        .set({ ...record, updatedAt: new Date() } as any)
        .where(eq(nativeLocalizedContent.id, existing[0].id));
      contentId = existing[0].id;
    } else {
      const inserted = await db
        .insert(nativeLocalizedContent)
        .values(record as any)
        .returning({ id: nativeLocalizedContent.id });
      contentId = inserted[0].id;
    }

    // Mark as published if validation passed
    if (validationResults.localePurity.passed && validationResults.completeness.passed) {
      await db
        .update(nativeLocalizedContent)
        .set({ status: "published", publishedAt: new Date() } as any)
        .where(eq(nativeLocalizedContent.id, contentId));
    }

    return {
      success: validationResults.localePurity.passed && validationResults.completeness.passed,
      entityType: request.entityType,
      entityId: request.entityId,
      locale: request.locale,
      destination: request.destination,
      contentId,
      validationResults,
      writerAgent: result.writerAgent,
      engineUsed: result.engineUsed,
      generationTimeMs: result.generationTimeMs,
      culturalContextVersion: result.culturalContextVersion,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      entityType: request.entityType,
      entityId: request.entityId,
      locale: request.locale,
      destination: request.destination,
      failureReason: errorMessage,
      generationTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Get native content for any supported locale
 */
export async function getNativeContent(
  entityType: string,
  entityId: string,
  locale: string
): Promise<typeof nativeLocalizedContent.$inferSelect | null> {
  const result = await db
    .select()
    .from(nativeLocalizedContent)
    .where(
      and(
        eq(nativeLocalizedContent.entityType, entityType as any),
        eq(nativeLocalizedContent.entityId, entityId),
        eq(nativeLocalizedContent.locale, locale),
        eq(nativeLocalizedContent.status, "published")
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Get native content coverage for an entity
 */
export async function getNativeContentCoverage(
  entityType: string,
  entityId: string
): Promise<{
  total: number;
  published: number;
  failed: number;
  locales: Array<{ locale: string; status: string; tier: number }>;
}> {
  const results = await db
    .select({
      locale: nativeLocalizedContent.locale,
      status: nativeLocalizedContent.status,
      tier: nativeLocalizedContent.tier,
    })
    .from(nativeLocalizedContent)
    .where(
      and(
        eq(nativeLocalizedContent.entityType, entityType as any),
        eq(nativeLocalizedContent.entityId, entityId)
      )
    );

  return {
    total: results.length,
    published: results.filter(r => r.status === "published").length,
    failed: results.filter(r => r.status === "failed").length,
    locales: results.map(r => ({
      locale: r.locale,
      status: r.status,
      tier: r.tier,
    })),
  };
}
