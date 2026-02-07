/**
 * Phase 6: Publish Hooks
 *
 * Event-driven hooks triggered when content moves to approved/published status:
 * 1. Enqueue translation jobs for all 17 locales
 * 2. Trigger AEO generation (EN first, then per locale)
 * 3. Trigger search index rebuild per locale
 *
 * Idempotent: if source_hash unchanged, skip re-processing
 */

import { db } from "../db";
import { contents, searchIndex, translations, type Content } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { log } from "../lib/logger";
import { enqueueTranslationJobs, computeSourceHash, QUEUE_CONFIG } from "./translation-queue";
import { generateFullAeo } from "./aeo-generator";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[PublishHooks] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[PublishHooks] ${msg}`, undefined, data),
};

// Content status that triggers hooks
const TRIGGER_STATUSES = ["approved", "published"];

// Native content generation - enabled by default, can be disabled via env
const NATIVE_CONTENT_ENABLED = process.env.NATIVE_CONTENT_ENABLED !== "false";

// Auto-translation queueing - enabled by default, can be disabled via env
const AUTO_TRANSLATION_ENABLED = process.env.DISABLE_AUTO_TRANSLATION !== "true";

/**
 * Main hook called when content status changes
 */
export async function onContentStatusChange(
  contentId: string,
  newStatus: string,
  previousStatus?: string
): Promise<void> {
  if (!TRIGGER_STATUSES.includes(newStatus)) {
    return;
  }

  // Skip if transitioning between approved and published (already processed)
  if (previousStatus && TRIGGER_STATUSES.includes(previousStatus) && newStatus !== "published") {
    return;
  }

  const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
  if (!content) {
    logger.error("Content not found", { contentId });
    return;
  }

  logger.info("Content status changed, triggering hooks", {
    contentId,
    newStatus,
    previousStatus,
    title: content.title,
  });

  try {
    // 1. Generate AEO for EN (source) first
    await generateAeoForContent(contentId);

    // 2. Enqueue native content generation or fallback to translation
    if (NATIVE_CONTENT_ENABLED) {
      await enqueueNativeContentForAllLocales(content);
      logger.info("Native content generation jobs queued", { contentId });
    } else if (AUTO_TRANSLATION_ENABLED) {
      await enqueueTranslationsForContent(content);
      logger.info("Translation jobs queued", { contentId });
    } else {
      logger.info("Both native content and auto-translation DISABLED", { contentId });
    }

    // 3. Update search index for EN
    await updateSearchIndex(content, "en");

    logger.info("Publish hooks completed", { contentId });
  } catch (error) {
    logger.error("Publish hooks failed", {
      contentId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Generate AEO content (answerCapsule, FAQ, JSON-LD)
 */
async function generateAeoForContent(contentId: string): Promise<void> {
  try {
    const result = await generateFullAeo(contentId);
    logger.info("AEO generated", {
      contentId,
      aeoScore: result.aeoScore,
      hasAnswerCapsule: !!result.answerCapsule,
      faqCount: result.faq?.length || 0,
    });
  } catch (error) {
    logger.error("AEO generation failed", {
      contentId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - continue with other hooks
  }
}

/**
 * Enqueue native content generation for all locales (tier-prioritized)
 * Uses the actual locale tiers from cultural-contexts/types.ts
 */
async function enqueueNativeContentForAllLocales(content: Content): Promise<void> {
  const { jobQueue } = await import("../job-queue");

  // All supported locales organized by tier (from cultural-contexts/types.ts)
  const LOCALE_TIERS: Record<number, string[]> = {
    1: ["en", "ar", "hi"],
    2: ["zh", "ru", "ur", "fr", "id"],
    3: ["de", "fa", "bn", "fil", "th", "vi", "ms"],
    4: ["es", "tr", "it", "ja", "ko", "he", "pt"],
    5: ["nl", "pl", "sv", "el", "cs", "ro", "uk", "hu"],
  };

  let queuedCount = 0;

  for (const [tierStr, locales] of Object.entries(LOCALE_TIERS)) {
    const tier = Number.parseInt(tierStr, 10);
    // Higher tier = higher priority number = processed later
    const priority = tier <= 2 ? 2 : tier <= 3 ? 5 : 8;

    for (const locale of locales) {
      if (locale === "en") continue; // Skip English - it's the source

      try {
        await jobQueue.addJob(
          "native_content_generate" as any,
          {
            contentId: content.id,
            locale,
            tier,
            entityType: content.type || "article",
          },
          { priority }
        );
        queuedCount++;
      } catch (err) {
        logger.error("Failed to queue native content job", {
          contentId: content.id,
          locale,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  logger.info("Queued native content generation", {
    contentId: content.id,
    localeCount: queuedCount,
  });
}

/**
 * Enqueue translation jobs for all locales
 */
async function enqueueTranslationsForContent(content: Content): Promise<void> {
  try {
    const jobs = await enqueueTranslationJobs(
      content.id,
      "en",
      content.status === "published" ? 10 : 5 // Higher priority for published
    );
    logger.info("Translation jobs enqueued", {
      contentId: content.id,
      jobCount: jobs.length,
    });
  } catch (error) {
    logger.error("Failed to enqueue translations", {
      contentId: content.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Update search index for a specific locale
 */
export async function updateSearchIndex(content: Content, locale: string): Promise<void> {
  try {
    // Get translated content if not EN
    let title = content.title;
    let metaDescription = content.metaDescription;
    let searchableText = "";

    if (locale !== "en") {
      const [translation] = await db
        .select()
        .from(translations)
        .where(and(eq(translations.contentId, content.id), eq(translations.locale, locale as any)));

      if (translation) {
        title = translation.title || content.title;
        metaDescription = translation.metaDescription || content.metaDescription;

        // Build searchable text from translated blocks
        if (translation.blocks) {
          searchableText = extractSearchableText(translation.blocks);
        }
      }
    } else {
      // EN: build from source blocks
      if (content.blocks) {
        searchableText = extractSearchableText(content.blocks);
      }
    }

    // Add title and meta to searchable text
    searchableText = [title, metaDescription, searchableText].filter(Boolean).join(" ");

    // Build URL
    const url = locale === "en" ? `/${content.slug}` : `/${locale}/${content.slug}`;

    // Upsert search index
    const indexId = `${content.id}-${locale}`;

    await db
      .insert(searchIndex)
      .values({
        contentId: indexId,
        title: title || "",
        contentType: content.type || "article",
        metaDescription,
        searchableText,
        url,
        image: content.heroImage || content.cardImage,
        locale,
      } as any)
      .onConflictDoUpdate({
        target: searchIndex.contentId,
        set: {
          title: title || "",
          metaDescription,
          searchableText,
          url,
          image: content.heroImage || content.cardImage,
          updatedAt: new Date(),
        } as any,
      });

    logger.info("Search index updated", { contentId: content.id, locale });
  } catch (error) {
    logger.error("Search index update failed", {
      contentId: content.id,
      locale,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Extract searchable text from content blocks
 */
function extractSearchableText(blocks: unknown[]): string {
  if (!blocks || !Array.isArray(blocks)) return "";

  const texts: string[] = [];

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;

    const b = block as Record<string, unknown>;

    // Extract text from data field
    if (b.data && typeof b.data === "object") {
      const data = b.data as Record<string, unknown>;
      if (typeof data.content === "string") {
        texts.push(data.content);
      }
      if (typeof data.text === "string") {
        texts.push(data.text);
      }
      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          if (typeof item === "string") {
            texts.push(item);
          }
        }
      }
    }
  }

  return texts.join(" ");
}

/**
 * Hook called after translation job completes
 */
export async function onTranslationComplete(contentId: string, locale: string): Promise<void> {
  const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
  if (!content) return;

  // Update search index for this locale
  await updateSearchIndex(content, locale);

  logger.info("Post-translation hooks completed", { contentId, locale });
}

/**
 * Trigger hooks manually for a content item (admin action)
 * Translation queueing respects AUTO_TRANSLATION_ENABLED flag
 */
export async function triggerHooksManually(contentId: string): Promise<{
  success: boolean;
  aeoGenerated: boolean;
  translationsQueued: number;
  searchIndexUpdated: boolean;
}> {
  const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
  if (!content) {
    return {
      success: false,
      aeoGenerated: false,
      translationsQueued: 0,
      searchIndexUpdated: false,
    };
  }

  let aeoGenerated = false;
  let translationsQueued = 0;
  let searchIndexUpdated = false;

  try {
    await generateAeoForContent(contentId);
    aeoGenerated = true;
  } catch (e) {
    logger.error("Manual AEO generation failed", { contentId });
  }

  // Queue native content generation or translations
  if (NATIVE_CONTENT_ENABLED) {
    try {
      await enqueueNativeContentForAllLocales(content);
      translationsQueued = 29; // All locales minus EN
      logger.info("Manual native content generation queued", {
        contentId,
        count: translationsQueued,
      });
    } catch (e) {
      logger.error("Manual native content queueing failed", { contentId });
    }
  } else if (AUTO_TRANSLATION_ENABLED) {
    try {
      const jobs = await enqueueTranslationJobs(content.id, "en", 10);
      translationsQueued = jobs.length;
      logger.info("Manual translation jobs queued", { contentId, count: translationsQueued });
    } catch (e) {
      logger.error("Manual translation queueing failed", { contentId });
    }
  } else {
    logger.info("Both native content and auto-translation DISABLED", { contentId });
  }

  try {
    await updateSearchIndex(content, "en");
    searchIndexUpdated = true;
  } catch (e) {
    logger.error("Manual search index update failed", { contentId });
  }

  return {
    success: true,
    aeoGenerated,
    translationsQueued,
    searchIndexUpdated,
  };
}

/**
 * Batch process all published content
 * Respects NATIVE_CONTENT_ENABLED and AUTO_TRANSLATION_ENABLED flags
 */
export async function batchProcessPublishedContent(limit: number = 100): Promise<number> {
  if (!NATIVE_CONTENT_ENABLED && !AUTO_TRANSLATION_ENABLED) {
    logger.info("Batch processing DISABLED - both native content and auto-translation are off");
    return 0;
  }

  const publishedContent = await db
    .select()
    .from(contents)
    .where(eq(contents.status, "published"))
    .limit(limit);

  let processed = 0;
  for (const content of publishedContent) {
    try {
      if (NATIVE_CONTENT_ENABLED) {
        await enqueueNativeContentForAllLocales(content);
        processed++;
      } else {
        const jobs = await enqueueTranslationJobs(content.id, "en", 5);
        if (jobs.length > 0) {
          processed++;
        }
      }
    } catch (error) {
      logger.error("Batch content processing failed", {
        contentId: content.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("Batch content processing completed", {
    processed,
    total: publishedContent.length,
    mode: NATIVE_CONTENT_ENABLED ? "native_content" : "translation",
  });
  return processed;
}
