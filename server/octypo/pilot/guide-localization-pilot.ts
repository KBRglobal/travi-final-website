/**
 * PILOT: Guide Localization System
 * =================================
 * Native locale content generation for travel guides.
 * 
 * CONSTRAINTS:
 * - en, ar, fr locales ONLY (batch pilot phase)
 * - Guide entity type ONLY
 * - LocalePurity ≥98% hard gate
 * - Atomic write (all validators pass or nothing written)
 * - NO English fallback for non-English locales
 * 
 * Batch Pilot: 5 guides × 3 locales = 15 content sets
 */

import { db, pool } from "../../db";
import { pilotLocalizedGuides, type InsertPilotLocalizedGuide } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { calculateLocalePurity, LOCALE_PURITY_THRESHOLD } from "./localization-pilot";

let tableEnsured = false;
async function ensureGuideTableExists(): Promise<void> {
  if (tableEnsured) return;
  
  const createEnumSQL = `
    DO $$ 
    BEGIN
      -- Create enum type if it doesn't exist (for fresh environments)
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pilot_locale_status') THEN
        CREATE TYPE pilot_locale_status AS ENUM ('generating', 'validating', 'validated', 'failed', 'published');
      END IF;
    END $$;
  `;
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS pilot_localized_guides (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
      guide_slug VARCHAR(255) NOT NULL,
      locale VARCHAR(10) NOT NULL,
      destination VARCHAR(100) NOT NULL,
      introduction TEXT,
      what_to_expect TEXT,
      highlights JSONB,
      tips TEXT,
      faq JSONB,
      answer_capsule TEXT,
      meta_title VARCHAR(100),
      meta_description TEXT,
      source_guide_id INTEGER,
      locale_purity_score REAL,
      validation_results JSONB,
      status pilot_locale_status NOT NULL DEFAULT 'generating',
      failure_reason TEXT,
      writer_agent VARCHAR(100),
      engine_used VARCHAR(100),
      tokens_used INTEGER,
      generation_time_ms INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_pilot_localized_guides_slug_locale UNIQUE (guide_slug, locale)
    );
  `;
  
  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_pilot_localized_guides_status ON pilot_localized_guides(status);
    CREATE INDEX IF NOT EXISTS idx_pilot_localized_guides_locale ON pilot_localized_guides(locale);
  `;
  
  try {
    // Step 1: Ensure enum type exists
    await pool.query(createEnumSQL);
    // Step 2: Create table with proper enum type
    await pool.query(createTableSQL);
    // Step 3: Create indexes
    await pool.query(createIndexesSQL);
    console.log("[GuideLocalization] Ensured pilot_localized_guides table and enum exist");
    tableEnsured = true;
  } catch (err) {
    console.error("[GuideLocalization] Failed to create table:", err);
    throw err;
  }
}

// ============================================================================
// TYPES
// ============================================================================

// Supported locales for batch pilot
export type PilotLocale = "en" | "ar" | "fr";
export const PILOT_LOCALES: PilotLocale[] = ["en", "ar", "fr"];
export const RTL_LOCALES: PilotLocale[] = ["ar"];

export interface GuideLocalizationRequest {
  guideSlug: string;
  locale: PilotLocale;
  destination: string;
  sourceGuideId?: number;
}

export interface GeneratedGuideContent {
  introduction?: string;
  whatToExpect?: string;
  highlights?: string[];
  tips?: string;
  faq?: Array<{ question: string; answer: string }>;
  answerCapsule?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface GuideValidationResults {
  completeness: { passed: boolean; missingSections: string[] };
  localePurity: { passed: boolean; score: number; threshold: number };
  blueprint: { passed: boolean; issues: string[] };
  seoAeo: { passed: boolean; issues: string[] };
  rtl?: { passed: boolean; issues: string[] };
}

export interface GuideLocalizationResult {
  success: boolean;
  guideSlug: string;
  locale: string;
  destination: string;
  contentId?: string;
  validationResults?: GuideValidationResults;
  failureReason?: string;
  writerAgent?: string;
  engineUsed?: string;
  generationTimeMs?: number;
}

// ============================================================================
// SEO/AEO ARTIFACT BUILDER (Template-Based, Deterministic)
// ============================================================================

export interface OpenGraphArtifact {
  title: string;
  description: string;
  type: "article";
  locale: string;
  url: string;
  siteName: string;
}

export interface TwitterCardArtifact {
  card: "summary_large_image";
  title: string;
  description: string;
  site?: string;
}

export interface ArticleSchema {
  "@type": "Article";
  headline: string;
  description: string;
  inLanguage: string;
  mainEntityOfPage: { "@type": "WebPage"; "@id": string };
  publisher: { "@type": "Organization"; name: string };
  datePublished?: string;
  dateModified?: string;
}

export interface FAQPageSchema {
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
}

export interface SpeakableSchema {
  "@type": "SpeakableSpecification";
  cssSelector: string[];
}

export interface JsonLdArtifact {
  "@context": "https://schema.org";
  "@graph": Array<ArticleSchema | FAQPageSchema | { "@type": "WebPage"; speakable: SpeakableSchema }>;
}

export interface SeoArtifacts {
  openGraph: OpenGraphArtifact;
  twitterCard: TwitterCardArtifact;
  jsonLd: JsonLdArtifact;
}

const LOCALE_TO_OG_LOCALE: Record<PilotLocale, string> = {
  en: "en_US",
  ar: "ar_AE",
  fr: "fr_FR",
};

const LOCALE_TO_LANGUAGE_CODE: Record<PilotLocale, string> = {
  en: "en",
  ar: "ar",
  fr: "fr",
};

export function buildSeoArtifacts(
  content: GeneratedGuideContent,
  locale: PilotLocale,
  guideSlug: string,
  destination: string,
  baseUrl: string = ""
): SeoArtifacts {
  const url = `${baseUrl}/pilot/${locale}/guides/${guideSlug}`;
  const title = content.metaTitle || guideSlug;
  const description = content.metaDescription || "";
  const ogLocale = LOCALE_TO_OG_LOCALE[locale];
  const langCode = LOCALE_TO_LANGUAGE_CODE[locale];
  
  const openGraph: OpenGraphArtifact = {
    title,
    description,
    type: "article",
    locale: ogLocale,
    url,
    siteName: "Travi CMS",
  };
  
  const twitterCard: TwitterCardArtifact = {
    card: "summary_large_image",
    title,
    description,
  };
  
  const articleSchema: ArticleSchema = {
    "@type": "Article",
    headline: title,
    description,
    inLanguage: langCode,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    publisher: {
      "@type": "Organization",
      name: "Travi CMS",
    },
    dateModified: new Date().toISOString(),
  };
  
  const faqPageSchema: FAQPageSchema = {
    "@type": "FAQPage",
    mainEntity: (content.faq || []).map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  
  const speakableSpec: SpeakableSchema = {
    "@type": "SpeakableSpecification",
    cssSelector: [
      '[data-testid="text-answer-capsule"]',
      '[data-testid="text-introduction"]',
    ],
  };
  
  const jsonLd: JsonLdArtifact = {
    "@context": "https://schema.org",
    "@graph": [
      articleSchema,
      ...(content.faq && content.faq.length > 0 ? [faqPageSchema] : []),
      {
        "@type": "WebPage",
        "@id": url,
        url: url,
        name: title,
        inLanguage: langCode,
        speakable: speakableSpec,
      } as { "@type": "WebPage"; speakable: SpeakableSchema },
    ],
  };
  
  return {
    openGraph,
    twitterCard,
    jsonLd,
  };
}

// ============================================================================
// GUIDE-SPECIFIC VALIDATORS
// ============================================================================

const GUIDE_REQUIRED_SECTIONS = [
  "introduction",
  "whatToExpect",
  "highlights",
  "tips",
  "faq",
  "answerCapsule",
  "metaTitle",
  "metaDescription",
] as const;

export function validateGuideCompleteness(content: GeneratedGuideContent): {
  passed: boolean;
  missingSections: string[];
} {
  const missingSections: string[] = [];
  
  for (const section of GUIDE_REQUIRED_SECTIONS) {
    if (section === "faq") {
      if (!content.faq || content.faq.length === 0) {
        missingSections.push("faq");
      }
    } else if (section === "highlights") {
      if (!content.highlights || content.highlights.length === 0) {
        missingSections.push("highlights");
      }
    } else {
      const value = content[section as keyof GeneratedGuideContent];
      if (!value || (typeof value === "string" && value.trim().length === 0)) {
        missingSections.push(section);
      }
    }
  }
  
  const passed = missingSections.length === 0;
  console.log(`[GuideCompletenessValidator] Passed: ${passed}, Missing: ${missingSections.join(", ") || "none"}`);
  
  return { passed, missingSections };
}

export function validateGuideLocalePurity(
  content: GeneratedGuideContent,
  locale: PilotLocale,
  exemptions: string[] = []
): { passed: boolean; score: number; threshold: number } {
  const allText = [
    content.introduction || "",
    content.whatToExpect || "",
    content.tips || "",
    content.metaTitle || "",
    content.metaDescription || "",
    content.answerCapsule || "",
    ...(content.highlights || []),
    ...(content.faq?.map(f => `${f.question} ${f.answer}`) || []),
  ].join(" ");
  
  const score = calculateLocalePurity(allText, locale, exemptions);
  const passed = score >= LOCALE_PURITY_THRESHOLD;
  
  console.log(`[GuideLocalePurityValidator] Locale: ${locale}, Score: ${(score * 100).toFixed(1)}%, Threshold: ${LOCALE_PURITY_THRESHOLD * 100}%, Passed: ${passed}`);
  
  return { passed, score, threshold: LOCALE_PURITY_THRESHOLD };
}

const GUIDE_BLUEPRINT_REQUIREMENTS = {
  introduction: { min: 40, max: 80 },
  whatToExpect: { min: 100, max: 300 },
  tips: { min: 100, max: 250 },
  highlightsCount: { min: 3, max: 10 },
  faqCount: { min: 5, max: 10 },
  metaTitle: { min: 30, max: 60 },
  metaDescription: { min: 120, max: 160 },
};

function countWords(text: string | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export function validateGuideBlueprint(content: GeneratedGuideContent): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  const introWords = countWords(content.introduction);
  if (introWords < GUIDE_BLUEPRINT_REQUIREMENTS.introduction.min) {
    issues.push(`Introduction too short: ${introWords} words (min: ${GUIDE_BLUEPRINT_REQUIREMENTS.introduction.min})`);
  }
  
  const whatWords = countWords(content.whatToExpect);
  if (whatWords < GUIDE_BLUEPRINT_REQUIREMENTS.whatToExpect.min) {
    issues.push(`whatToExpect too short: ${whatWords} words (min: ${GUIDE_BLUEPRINT_REQUIREMENTS.whatToExpect.min})`);
  }
  
  const tipsWords = countWords(content.tips);
  if (tipsWords < GUIDE_BLUEPRINT_REQUIREMENTS.tips.min) {
    issues.push(`Tips too short: ${tipsWords} words (min: ${GUIDE_BLUEPRINT_REQUIREMENTS.tips.min})`);
  }
  
  const highlightsCount = content.highlights?.length || 0;
  if (highlightsCount < GUIDE_BLUEPRINT_REQUIREMENTS.highlightsCount.min) {
    issues.push(`Highlights count too low: ${highlightsCount} (min: ${GUIDE_BLUEPRINT_REQUIREMENTS.highlightsCount.min})`);
  }
  
  const faqCount = content.faq?.length || 0;
  if (faqCount < GUIDE_BLUEPRINT_REQUIREMENTS.faqCount.min) {
    issues.push(`FAQ count too low: ${faqCount} (min: ${GUIDE_BLUEPRINT_REQUIREMENTS.faqCount.min})`);
  }
  
  const titleLength = (content.metaTitle || "").length;
  if (titleLength < GUIDE_BLUEPRINT_REQUIREMENTS.metaTitle.min || titleLength > GUIDE_BLUEPRINT_REQUIREMENTS.metaTitle.max) {
    issues.push(`Meta title length: ${titleLength} chars (should be ${GUIDE_BLUEPRINT_REQUIREMENTS.metaTitle.min}-${GUIDE_BLUEPRINT_REQUIREMENTS.metaTitle.max})`);
  }
  
  const descLength = (content.metaDescription || "").length;
  if (descLength < GUIDE_BLUEPRINT_REQUIREMENTS.metaDescription.min || descLength > GUIDE_BLUEPRINT_REQUIREMENTS.metaDescription.max) {
    issues.push(`Meta description length: ${descLength} chars (should be ${GUIDE_BLUEPRINT_REQUIREMENTS.metaDescription.min}-${GUIDE_BLUEPRINT_REQUIREMENTS.metaDescription.max})`);
  }
  
  const passed = issues.length === 0;
  console.log(`[GuideBlueprintValidator] Passed: ${passed}, Issues: ${issues.length}`);
  
  return { passed, issues };
}

export function validateGuideSeoAeo(content: GeneratedGuideContent): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (!content.answerCapsule || content.answerCapsule.length < 50) {
    issues.push("Answer capsule missing or too short (min 50 chars)");
  }
  
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
  
  if (content.metaDescription && content.metaTitle) {
    const titleStart = content.metaTitle.slice(0, 20).toLowerCase();
    const descStart = content.metaDescription.slice(0, 20).toLowerCase();
    if (titleStart === descStart) {
      issues.push("Meta description starts the same as title - needs variation");
    }
  }
  
  const passed = issues.length === 0;
  console.log(`[GuideSEO/AEOValidator] Passed: ${passed}, Issues: ${issues.length}`);
  
  return { passed, issues };
}

export function validateGuideRTL(content: GeneratedGuideContent, locale: PilotLocale): {
  passed: boolean;
  issues: string[];
} {
  // RTL validation only applies to Arabic
  if (!RTL_LOCALES.includes(locale)) {
    return { passed: true, issues: [] };
  }
  
  const issues: string[] = [];
  const arabicRegex = /[\u0600-\u06FF]/;
  
  if (content.introduction && !arabicRegex.test(content.introduction)) {
    issues.push("Introduction does not contain Arabic characters");
  }
  if (content.metaTitle && !arabicRegex.test(content.metaTitle)) {
    issues.push("Meta title does not contain Arabic characters");
  }
  if (content.metaDescription && !arabicRegex.test(content.metaDescription)) {
    issues.push("Meta description does not contain Arabic characters");
  }
  
  const passed = issues.length === 0;
  console.log(`[GuideRTLValidator] Passed: ${passed}, Issues: ${issues.length}`);
  
  return { passed, issues };
}

// ============================================================================
// ATOMIC WRITE PATH
// ============================================================================

async function atomicWriteGuide(
  request: GuideLocalizationRequest,
  content: GeneratedGuideContent,
  validationResults: GuideValidationResults,
  metadata: {
    writerAgent?: string;
    engineUsed?: string;
    tokensUsed?: number;
    generationTimeMs?: number;
  }
): Promise<string> {
  await ensureGuideTableExists();
  
  const record = {
    guideSlug: request.guideSlug,
    locale: request.locale,
    destination: request.destination,
    sourceGuideId: request.sourceGuideId,
    introduction: content.introduction,
    whatToExpect: content.whatToExpect,
    highlights: content.highlights,
    tips: content.tips,
    faq: content.faq,
    answerCapsule: content.answerCapsule,
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
    localePurityScore: validationResults.localePurity.score,
    validationResults: validationResults,
    status: "validated" as const,
    writerAgent: metadata.writerAgent,
    engineUsed: metadata.engineUsed,
    tokensUsed: metadata.tokensUsed,
    generationTimeMs: metadata.generationTimeMs,
  };
  
  const existing = await db
    .select()
    .from(pilotLocalizedGuides)
    .where(
      and(
        eq(pilotLocalizedGuides.guideSlug, request.guideSlug),
        eq(pilotLocalizedGuides.locale, request.locale)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    await db
      .update(pilotLocalizedGuides)
      .set({
        introduction: record.introduction,
        whatToExpect: record.whatToExpect,
        highlights: record.highlights,
        tips: record.tips,
        faq: record.faq,
        answerCapsule: record.answerCapsule,
        metaTitle: record.metaTitle,
        metaDescription: record.metaDescription,
        localePurityScore: record.localePurityScore,
        validationResults: record.validationResults,
        status: record.status,
        writerAgent: record.writerAgent,
        engineUsed: record.engineUsed,
        tokensUsed: record.tokensUsed,
        generationTimeMs: record.generationTimeMs,
      } as any)
      .where(eq(pilotLocalizedGuides.id, existing[0].id));
    return existing[0].id;
  } else {
    const inserted = await db
      .insert(pilotLocalizedGuides)
      .values({
        guideSlug: record.guideSlug,
        locale: record.locale,
        destination: record.destination,
        sourceGuideId: record.sourceGuideId,
        introduction: record.introduction,
        whatToExpect: record.whatToExpect,
        highlights: record.highlights,
        tips: record.tips,
        faq: record.faq,
        answerCapsule: record.answerCapsule,
        metaTitle: record.metaTitle,
        metaDescription: record.metaDescription,
        localePurityScore: record.localePurityScore,
        validationResults: record.validationResults,
        status: record.status,
        writerAgent: record.writerAgent,
        engineUsed: record.engineUsed,
        tokensUsed: record.tokensUsed,
        generationTimeMs: record.generationTimeMs,
      } as any)
      .returning({ id: pilotLocalizedGuides.id });
    return inserted[0].id;
  }
}

// ============================================================================
// GUIDE CONTENT OPERATIONS
// ============================================================================

export async function getLocalizedGuideContent(
  guideSlug: string,
  locale: PilotLocale
): Promise<{
  found: boolean;
  content?: GeneratedGuideContent & {
    id: string;
    status: string;
    destination: string;
    validationResults?: GuideValidationResults;
    localePurityScore?: number;
  };
  status?: string;
}> {
  await ensureGuideTableExists();
  
  const result = await db
    .select()
    .from(pilotLocalizedGuides)
    .where(
      and(
        eq(pilotLocalizedGuides.guideSlug, guideSlug),
        eq(pilotLocalizedGuides.locale, locale)
      )
    )
    .limit(1);
  
  if (result.length === 0) {
    return { found: false };
  }
  
  const row = result[0];
  return {
    found: true,
    content: {
      id: row.id,
      status: row.status,
      destination: row.destination,
      introduction: row.introduction || undefined,
      whatToExpect: row.whatToExpect || undefined,
      highlights: (row.highlights as string[]) || undefined,
      tips: row.tips || undefined,
      faq: (row.faq as Array<{ question: string; answer: string }>) || undefined,
      answerCapsule: row.answerCapsule || undefined,
      metaTitle: row.metaTitle || undefined,
      metaDescription: row.metaDescription || undefined,
      validationResults: row.validationResults as GuideValidationResults | undefined,
      localePurityScore: row.localePurityScore || undefined,
    },
    status: row.status,
  };
}

export async function saveLocalizedGuideContent(
  request: GuideLocalizationRequest,
  content: GeneratedGuideContent,
  options?: {
    writerAgent?: string;
    engineUsed?: string;
  }
): Promise<GuideLocalizationResult> {
  await ensureGuideTableExists();
  
  const startTime = Date.now();
  
  console.log(`[GuideLocalization] Starting validation for ${request.guideSlug} (${request.locale})`);
  
  if (!request.destination || request.destination.trim() === "") {
    throw new Error("GUIDE_FAIL: destination is REQUIRED - no fallback allowed");
  }
  if (!request.locale || !["en", "ar", "fr"].includes(request.locale)) {
    throw new Error("GUIDE_FAIL: locale must be 'en', 'ar', or 'fr' only");
  }
  
  const exemptions = [request.guideSlug, request.destination].filter(Boolean);
  
  const completenessResult = validateGuideCompleteness(content);
  const localePurityResult = validateGuideLocalePurity(content, request.locale, exemptions);
  const blueprintResult = validateGuideBlueprint(content);
  const seoAeoResult = validateGuideSeoAeo(content);
  const rtlResult = validateGuideRTL(content, request.locale);
  
  const validationResults: GuideValidationResults = {
    completeness: completenessResult,
    localePurity: localePurityResult,
    blueprint: blueprintResult,
    seoAeo: seoAeoResult,
    rtl: rtlResult,
  };
  
  const allPassed =
    completenessResult.passed &&
    localePurityResult.passed &&
    blueprintResult.passed &&
    seoAeoResult.passed &&
    rtlResult.passed;
  
  if (!allPassed) {
    const failureReasons: string[] = [];
    if (!completenessResult.passed) failureReasons.push(`Completeness: missing ${completenessResult.missingSections.join(", ")}`);
    if (!localePurityResult.passed) failureReasons.push(`LocalePurity: ${(localePurityResult.score * 100).toFixed(1)}% < ${localePurityResult.threshold * 100}%`);
    if (!blueprintResult.passed) failureReasons.push(`Blueprint: ${blueprintResult.issues.join("; ")}`);
    if (!seoAeoResult.passed) failureReasons.push(`SEO/AEO: ${seoAeoResult.issues.join("; ")}`);
    if (!rtlResult.passed) failureReasons.push(`RTL: ${rtlResult.issues.join("; ")}`);
    
    const failureReason = failureReasons.join(" | ");
    console.log(`[GuideLocalization] VALIDATION FAILED: ${failureReason}`);
    
    await db.insert(pilotLocalizedGuides).values({
      guideSlug: request.guideSlug,
      locale: request.locale,
      destination: request.destination,
      sourceGuideId: request.sourceGuideId,
      status: "failed",
      failureReason,
      localePurityScore: localePurityResult.score,
      validationResults,
      writerAgent: options?.writerAgent,
      engineUsed: options?.engineUsed,
      generationTimeMs: Date.now() - startTime,
    } as any).onConflictDoUpdate({
      target: [pilotLocalizedGuides.guideSlug, pilotLocalizedGuides.locale],
      set: {
        failureReason,
        localePurityScore: localePurityResult.score,
        validationResults,
      } as any,
    });
    
    return {
      success: false,
      guideSlug: request.guideSlug,
      locale: request.locale,
      destination: request.destination,
      validationResults,
      failureReason,
      writerAgent: options?.writerAgent,
      engineUsed: options?.engineUsed,
      generationTimeMs: Date.now() - startTime,
    };
  }
  
  console.log(`[GuideLocalization] All validators passed - writing content`);
  
  const contentId = await atomicWriteGuide(request, content, validationResults, {
    writerAgent: options?.writerAgent,
    engineUsed: options?.engineUsed,
    generationTimeMs: Date.now() - startTime,
  });
  
  await db
    .update(pilotLocalizedGuides)
    .set({ status: "published" } as any)
    .where(eq(pilotLocalizedGuides.id, contentId));
  
  console.log(`[GuideLocalization] SUCCESS: Guide content written with ID ${contentId}`);
  
  return {
    success: true,
    guideSlug: request.guideSlug,
    locale: request.locale,
    destination: request.destination,
    contentId,
    validationResults,
    writerAgent: options?.writerAgent,
    engineUsed: options?.engineUsed,
    generationTimeMs: Date.now() - startTime,
  };
}

export async function getGuideLocalizationStatus(guideSlug: string): Promise<{
  en: { exists: boolean; status?: string };
  ar: { exists: boolean; status?: string };
  fr: { exists: boolean; status?: string };
}> {
  const results = await db
    .select({ locale: pilotLocalizedGuides.locale, status: pilotLocalizedGuides.status })
    .from(pilotLocalizedGuides)
    .where(eq(pilotLocalizedGuides.guideSlug, guideSlug));
  
  const enResult = results.find(r => r.locale === "en");
  const arResult = results.find(r => r.locale === "ar");
  const frResult = results.find(r => r.locale === "fr");
  
  return {
    en: { exists: !!enResult, status: enResult?.status },
    ar: { exists: !!arResult, status: arResult?.status },
    fr: { exists: !!frResult, status: frResult?.status },
  };
}

// Re-export the constant for use in this module
export { LOCALE_PURITY_THRESHOLD };
