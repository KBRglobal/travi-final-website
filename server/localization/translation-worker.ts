/**
 * Phase 6: Translation Worker
 *
 * ENABLED (January 2026): Automatic translation re-enabled for RSS integration.
 *
 * Features:
 * - 8 AI providers with language-family optimization (NO DeepL)
 * - Exponential backoff on rate limits
 * - Parallel field translation
 * - Content block translation
 * - SEO-optimized translations
 */

// ============================================================================
// TRANSLATION WORKER - ENABLED
// ============================================================================
const TRANSLATION_WORKER_ENABLED = process.env.ENABLE_TRANSLATION_WORKER !== "false";

import { db } from "../db";
import {
  contents,
  translations,
  contentHighlights,
  contentHighlightTranslations,
  hotels,
  attractions,
  type TranslationJob,
  type ContentBlock,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { log } from "../lib/logger";
import {
  getNextPendingJob,
  markJobInProgress,
  markJobCompleted,
  markJobFailed,
  pauseQueue,
  QUEUE_CONFIG,
} from "./translation-queue";
import { updateSearchIndex } from "./publish-hooks";
import { getAITranslationService, RTL_LANGUAGES, CJK_LANGUAGES } from "./ai-translation-service";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[TranslationWorker] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[TranslationWorker] ${msg}`, undefined, data),
  debug: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[TranslationWorker] ${msg}`, data),
};

// RTL locales (using imported set)
const RTL_LOCALES = Array.from(RTL_LANGUAGES);

// AI Translation provider type (replaces DeepL-based system)
type TranslationProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "mistral"
  | "groq"
  | "openrouter"
  | "perplexity"
  | "helicone";

// CJK locales (using imported set) - for logging/reference
const CJK_LOCALES = Array.from(CJK_LANGUAGES);

/**
 * Translate text using AI Translation Service with language-optimized providers
 */
async function translateText(
  text: string,
  sourceLocale: string,
  targetLocale: string,
  _providers?: TranslationProvider[] // Legacy param, now uses language-based routing
): Promise<{ translation: string; provider: TranslationProvider }> {
  try {
    const translationService = getAITranslationService();
    const result = await translationService.translateContent(text, sourceLocale, targetLocale, {
      seoOptimized: true,
    });

    return {
      translation: result.translatedText,
      provider: result.provider as TranslationProvider,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Translation failed for ${targetLocale}`, { error: errorMsg });

    // Check for rate limit - pause queue
    if (errorMsg.includes("rate") || errorMsg.includes("429")) {
      pauseQueue(`Rate limit hit during translation to ${targetLocale}`);
    }

    throw new Error(`Translation to ${targetLocale} failed: ${errorMsg}`);
  }
}

// Legacy provider functions removed - now using AITranslationService
// which provides language-optimized provider routing with 8 AI providers

/**
 * Translate content blocks (JSONB array)
 * ContentBlock structure: { id?, type, data: Record<string, unknown>, order? }
 */
async function translateBlocks(
  blocks: ContentBlock[],
  sourceLocale: string,
  targetLocale: string
): Promise<ContentBlock[]> {
  if (!blocks || blocks.length === 0) return [];

  const translatedBlocks: ContentBlock[] = [];

  for (const block of blocks) {
    const translatedBlock: ContentBlock = {
      ...block,
      data: { ...block.data },
    };

    // Translate text content in blocks - content is stored in data.content or data.text
    const textContent = block.data?.content || block.data?.text;

    if (block.type === "text" && typeof textContent === "string") {
      const { translation } = await translateText(textContent, sourceLocale, targetLocale);
      translatedBlock.data.content = translation;
    } else if (block.type === "heading" && typeof textContent === "string") {
      const { translation } = await translateText(textContent, sourceLocale, targetLocale);
      translatedBlock.data.content = translation;
    } else if (block.type === "list" && Array.isArray(block.data?.items)) {
      const translatedItems: string[] = [];
      for (const item of block.data.items as string[]) {
        if (typeof item === "string") {
          const { translation } = await translateText(item, sourceLocale, targetLocale);
          translatedItems.push(translation);
        } else {
          translatedItems.push(item);
        }
      }
      translatedBlock.data.items = translatedItems;
    }

    translatedBlocks.push(translatedBlock);
  }

  return translatedBlocks;
}

/**
 * Translate FAQ items
 */
async function translateFaq(
  faq: Array<{ question: string; answer: string }>,
  sourceLocale: string,
  targetLocale: string
): Promise<Array<{ question: string; answer: string }>> {
  if (!faq || faq.length === 0) return [];

  const translatedFaq: Array<{ question: string; answer: string }> = [];

  for (const item of faq) {
    const [questionResult, answerResult] = await Promise.all([
      translateText(item.question, sourceLocale, targetLocale),
      translateText(item.answer, sourceLocale, targetLocale),
    ]);

    translatedFaq.push({
      question: questionResult.translation,
      answer: answerResult.translation,
    });
  }

  return translatedFaq;
}

/**
 * Process a single translation job
 */
export async function processTranslationJob(job: TranslationJob): Promise<void> {
  const { contentId, sourceLocale, targetLocale, fields } = job;

  // Fetch source content
  const [sourceContent] = await db.select().from(contents).where(eq(contents.id, contentId));

  if (!sourceContent) {
    throw new Error(`Content not found: ${contentId}`);
  }

  // Get optimal providers for target language (routing handled by AITranslationService)
  // The providers parameter is now legacy - AITranslationService uses language-optimized routing
  let usedProvider: TranslationProvider = "openai";

  // Translate each field
  const translatedData: {
    title?: string;
    metaTitle?: string;
    metaDescription?: string;
    blocks?: ContentBlock[];
    answerCapsule?: string;
  } = {};

  for (const field of fields || []) {
    switch (field) {
      case "title":
        if (sourceContent.title) {
          const result = await translateText(sourceContent.title, sourceLocale, targetLocale);
          translatedData.title = result.translation;
          usedProvider = result.provider;
        }
        break;

      case "metaTitle":
        if (sourceContent.metaTitle) {
          const result = await translateText(sourceContent.metaTitle, sourceLocale, targetLocale);
          translatedData.metaTitle = result.translation;
          usedProvider = result.provider;
        }
        break;

      case "metaDescription":
        if (sourceContent.metaDescription) {
          const result = await translateText(
            sourceContent.metaDescription,
            sourceLocale,
            targetLocale
          );
          translatedData.metaDescription = result.translation;
          usedProvider = result.provider;
        }
        break;

      case "blocks":
        if (sourceContent.blocks && sourceContent.blocks.length > 0) {
          translatedData.blocks = await translateBlocks(
            sourceContent.blocks,
            sourceLocale,
            targetLocale
          );
        }
        break;

      case "answerCapsule":
        if (sourceContent.answerCapsule) {
          const result = await translateText(
            sourceContent.answerCapsule,
            sourceLocale,
            targetLocale
          );
          translatedData.answerCapsule = result.translation;
          usedProvider = result.provider;
        }
        break;

      case "faq":
        // FAQ is stored on entity tables (hotels, attractions), handle separately
        await translateEntityFaq(contentId, sourceLocale, targetLocale);
        break;

      case "highlights":
        await translateContentHighlights(contentId, sourceLocale, targetLocale);
        break;

      case "tags":
        // Tags labels are stored in tagDefinitions.labelTranslations
        // This is handled at taxonomy level, not per-content
        break;
    }
  }

  // Upsert translation record
  const [existingTranslation] = await db
    .select()
    .from(translations)
    .where(
      and(eq(translations.contentId, contentId), eq(translations.locale, targetLocale as any))
    );

  if (existingTranslation) {
    await db
      .update(translations)
      .set({
        ...translatedData,
        status: "completed",
        translationProvider: usedProvider,
        updatedAt: new Date(),
      } as any)
      .where(eq(translations.id, existingTranslation.id));
  } else {
    await db.insert(translations).values({
      contentId,
      locale: targetLocale as any,
      ...translatedData,
      status: "completed",
      translationProvider: usedProvider,
    } as any);
  }

  logger.info("Translation completed", { contentId, targetLocale, provider: usedProvider });
}

/**
 * Translate FAQ for entities (hotels, attractions)
 */
async function translateEntityFaq(
  contentId: string,
  sourceLocale: string,
  targetLocale: string
): Promise<void> {
  // Check if this content is a hotel or attraction
  const [hotel] = await db.select().from(hotels).where(eq(hotels.contentId, contentId));

  if (hotel?.faq && hotel.faq.length > 0) {
    const translatedFaq = await translateFaq(hotel.faq, sourceLocale, targetLocale);
    // Store translated FAQ in a separate location or JSONB field
    // For now, we'll store in the translation record's blocks as a special block type
    logger.debug("Hotel FAQ translated", { contentId, items: translatedFaq.length });
    return;
  }

  const [attraction] = await db
    .select()
    .from(attractions)
    .where(eq(attractions.contentId, contentId));

  if (attraction?.faq && attraction.faq.length > 0) {
    const translatedFaq = await translateFaq(attraction.faq, sourceLocale, targetLocale);
    logger.debug("Attraction FAQ translated", { contentId, items: translatedFaq.length });
  }
}

/**
 * Translate content highlights
 */
async function translateContentHighlights(
  contentId: string,
  sourceLocale: string,
  targetLocale: string
): Promise<void> {
  const highlights = await db
    .select()
    .from(contentHighlights)
    .where(eq(contentHighlights.contentId, contentId));

  for (const highlight of highlights) {
    const { translation, provider } = await translateText(
      highlight.textEn,
      sourceLocale,
      targetLocale
    );

    // Upsert highlight translation
    const [existing] = await db
      .select()
      .from(contentHighlightTranslations)
      .where(
        and(
          eq(contentHighlightTranslations.highlightId, highlight.id),
          eq(contentHighlightTranslations.locale, targetLocale)
        )
      );

    if (existing) {
      await db
        .update(contentHighlightTranslations)
        .set({
          text: translation,
          translatedAt: new Date(),
          translationProvider: provider,
        } as any)
        .where(eq(contentHighlightTranslations.id, existing.id));
    } else {
      await db.insert(contentHighlightTranslations).values({
        highlightId: highlight.id,
        locale: targetLocale,
        text: translation,
        translatedAt: new Date(),
        translationProvider: provider,
      } as any);
    }
  }

  logger.debug("Highlights translated", { contentId, targetLocale, count: highlights.length });
}

/**
 * Run the translation worker loop
 * Re-enabled (January 2026) for RSS integration.
 */
export async function runWorkerLoop(): Promise<void> {
  // Check if translation worker is enabled
  if (!TRANSLATION_WORKER_ENABLED) {
    logger.info(
      "Translation worker DISABLED via environment - set ENABLE_TRANSLATION_WORKER=true to enable"
    );
    return; // Exit immediately, do not loop
  }

  logger.info("Translation worker STARTING - processing jobs");

  while (true) {
    try {
      const job = await getNextPendingJob();

      if (!job) {
        await new Promise(resolve => setTimeout(resolve, QUEUE_CONFIG.POLL_INTERVAL_MS));
        continue;
      }

      const markedJob = await markJobInProgress(job.id);
      if (!markedJob) {
        continue;
      }

      try {
        await processTranslationJob(markedJob);
        await markJobCompleted(job.id);

        // Update search index for the translated locale
        const [content] = await db.select().from(contents).where(eq(contents.id, job.contentId));

        if (content) {
          await updateSearchIndex(content, job.targetLocale);
          logger.debug("Search index updated for locale", {
            contentId: job.contentId,
            locale: job.targetLocale,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        await markJobFailed(job.id, errorMsg);
      }
    } catch (error) {
      logger.error("Worker loop error", { error: String(error) });
      await new Promise(resolve => setTimeout(resolve, QUEUE_CONFIG.POLL_INTERVAL_MS));
    }
  }
}
