/**
 * Auto-Translation Service
 * Automatically translates newly generated destination content
 * 
 * Triggered after:
 * - Destination content generation
 * - Article publishing
 */

import { db } from "../db";
import { 
  destinations, destinationContent, aiGenerationLogs,
  SUPPORTED_LOCALES, type Locale 
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { createLogger } from "../lib/logger";
import { 
  translateContent, 
  generateContentHash,
  assertTranslationEnabled,
  TranslationDisabledError
} from "./translation-service";

const logger = createLogger("auto-translation");

// Priority order for translation (tier 1 markets first)
const TRANSLATION_PRIORITY: Locale[] = [
  "ar", "he", "ru", "zh", "hi", // Tier 1 - Core markets
  "fr", "de", "es", "it", "ja", // Tier 2 - Major markets
  "ko", "tr",                   // Tier 3 - Secondary markets
];

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * DISABLED (January 2026): Automatic translation is permanently disabled.
 * All translations must be done manually via admin UI.
 */
export const autoTranslationConfig = {
  enabled: false, // HARD DISABLE: All translation must be done manually via admin UI
  maxTranslationsPerDay: 50,
  priorityTiers: [1, 2], // Only auto-translate tier 1 and 2 languages
  delayBetweenTranslations: 2000, // ms between API calls
  useBatchMode: true, // Use batch API for 50% savings
};

// ============================================================================
// DESTINATION TRANSLATION
// ============================================================================

interface DestinationTranslationResult {
  queued: number;
  completed: number;
  failed: number;
  errors: string[];
}

/**
 * Queue translations for a newly generated destination
 * Called automatically after destination content generation
 * 
 * DISABLED (January 2026): All automatic translation is permanently disabled.
 * This function now throws TranslationDisabledError immediately.
 */
export async function translateDestinationContent(
  destinationId: string,
  options?: {
    priorityOnly?: boolean; // Only translate priority languages
    immediate?: boolean; // Translate now vs. queue for batch
  }
): Promise<DestinationTranslationResult> {
  // HARD DISABLE: Throws TranslationDisabledError
  assertTranslationEnabled('translateDestinationContent');
  
  if (!autoTranslationConfig.enabled) {
    logger.info("Auto-translation is disabled");
    return { queued: 0, completed: 0, failed: 0, errors: [] };
  }

  const result: DestinationTranslationResult = {
    queued: 0,
    completed: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get destination
    const [destination] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, destinationId));

    if (!destination) {
      result.errors.push("Destination not found");
      return result;
    }

    // Get active destination content for hero section
    const [heroContent] = await db
      .select()
      .from(destinationContent)
      .where(
        and(
          eq(destinationContent.destinationId, destinationId),
          eq(destinationContent.contentType, "hero"),
          eq(destinationContent.isActive, true)
        )
      );

    // Determine which locales to translate
    const targetLocales = SUPPORTED_LOCALES.filter(locale => {
      if (locale.code === "en") return false; // Skip source language
      if (options?.priorityOnly && !TRANSLATION_PRIORITY.slice(0, 5).includes(locale.code)) {
        return false;
      }
      if (autoTranslationConfig.priorityTiers.length > 0) {
        return autoTranslationConfig.priorityTiers.includes(locale.tier);
      }
      return true;
    });

    logger.info(
      `Queuing translations for ${destination.name} to ${targetLocales.length} languages`
    );

    // Build translatable content
    const translatableContent: {
      title?: string;
      metaTitle?: string;
      metaDescription?: string;
    } = {
      title: destination.name,
      metaTitle: destination.metaTitle || `${destination.name} Travel Guide 2025 | Travi`,
      metaDescription: destination.metaDescription || "",
    };

    // Extract text from hero content for translation
    if (heroContent?.content) {
      const heroData = heroContent.content as { title?: string; description?: string };
      if (heroData.title) translatableContent.title = heroData.title;
      if (heroData.description) {
        translatableContent.metaDescription = heroData.description.substring(0, 160);
      }
    }

    if (options?.immediate) {
      // Immediate translation mode - translate now one by one
      const translatedResults: Record<string, any> = {};
      
      for (const locale of targetLocales) {
        try {
          const translatedContent = await translateContent(
            translatableContent,
            "en",
            locale.code
          );

          if (translatedContent) {
            // Store translated content for logging
            translatedResults[locale.code] = {
              title: translatedContent.title,
              metaTitle: translatedContent.metaTitle,
              metaDescription: translatedContent.metaDescription,
              translatedAt: new Date().toISOString(),
            };

            result.completed++;
            logger.info(`Translated ${destination.name} to ${locale.name}`);
          }

          // Add delay between translations
          await new Promise(resolve => 
            setTimeout(resolve, autoTranslationConfig.delayBetweenTranslations)
          );
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to translate to ${locale.code}: ${error}`);
          logger.error({ error: String(error) }, `Translation to ${locale.code} failed`);
        }
      }

      // Persist translations to destination record
      if (result.completed > 0) {
        // Re-fetch current translations to avoid overwriting concurrent updates
        const [freshDest] = await db
          .select({ translations: destinations.translations })
          .from(destinations)
          .where(eq(destinations.id, destinationId));
        
        const existingTranslations = (freshDest?.translations as Record<string, any>) || {};
        const mergedTranslations = { ...existingTranslations, ...translatedResults };

        await db
          .update(destinations)
          .set({ 
            translations: mergedTranslations,
            updatedAt: new Date() 
          } as any)
          .where(eq(destinations.id, destinationId));

        // Also log for audit trail
        await db.insert(aiGenerationLogs).values({
          targetType: "destination_translation_completed",
          targetId: destinationId,
          provider: "immediate",
          model: "translation",
          prompt: JSON.stringify({
            sourceContent: translatableContent,
            localesTranslated: Object.keys(translatedResults),
            translationCount: result.completed,
          }),
          success: true,
          seoScore: null,
          qualityTier: null,
          duration: result.completed,
        } as any);

        logger.info(
          `Persisted ${result.completed} translations for ${destination.name} to destination record`
        );
      }
    } else {
      // Batch mode - create batch job for later processing
      if (autoTranslationConfig.useBatchMode) {
        try {
          // NOTE: batchTranslation module removed - batch translation is disabled
          const batchJobId = `batch_disabled_${Date.now()}`;

          // Log the batch job creation
          await db.insert(aiGenerationLogs).values({
            targetType: "destination_translation",
            targetId: destinationId,
            provider: "batch",
            model: "translation-batch",
            prompt: `Batch translation to ${targetLocales.length} languages`,
            success: true,
            seoScore: null,
            qualityTier: null,
            duration: 0,
          } as any);

          result.queued = targetLocales.length;
          logger.info(
            `Queued batch translation for ${destination.name} - Job ID: ${batchJobId}`
          );
        } catch (error) {
          result.errors.push(`Failed to create batch job: ${error}`);
          logger.error({ error: String(error) }, "Batch translation job creation failed");
        }
      } else {
        // Queue for individual processing later
        result.queued = targetLocales.length;
        
        // Log the queued translations
        await db.insert(aiGenerationLogs).values({
          targetType: "destination_translation_queue",
          targetId: destinationId,
          provider: "queue",
          model: "pending",
          prompt: `Queued translations to: ${targetLocales.map(l => l.code).join(", ")}`,
          success: true,
          seoScore: null,
          qualityTier: null,
          duration: 0,
        } as any);

        logger.info(
          `Queued ${result.queued} translations for ${destination.name}`
        );
      }
    }

    return result;
  } catch (error) {
    logger.error({ error: String(error) }, "Auto-translation failed");
    result.errors.push(String(error));
    return result;
  }
}

/**
 * Retrieve translated content for a destination from the destinations table
 * Returns translations keyed by locale code
 */
export async function getDestinationTranslations(
  destinationId: string
): Promise<Record<string, { title: string; metaTitle: string; metaDescription: string; translatedAt: string }>> {
  const [destination] = await db
    .select({ translations: destinations.translations })
    .from(destinations)
    .where(eq(destinations.id, destinationId));

  if (!destination || !destination.translations) {
    return {};
  }

  return destination.translations as Record<string, { title: string; metaTitle: string; metaDescription: string; translatedAt: string }>;
}

/**
 * Get all translated destinations with their locales
 */
export async function getAllDestinationTranslations(): Promise<
  Map<string, { locales: string[]; translatedAt: string }>
> {
  const result = new Map<string, { locales: string[]; translatedAt: string }>();

  // Get all destinations with translations
  const allDestinations = await db
    .select({ 
      id: destinations.id, 
      translations: destinations.translations,
      updatedAt: destinations.updatedAt 
    })
    .from(destinations)
    .where(eq(destinations.hasPage, true));

  for (const dest of allDestinations) {
    if (!dest.translations || typeof dest.translations !== 'object') continue;
    
    const translations = dest.translations as Record<string, any>;
    const locales = Object.keys(translations);
    
    if (locales.length > 0) {
      // Get latest translatedAt from translations
      let latestTranslatedAt = "";
      for (const locale of locales) {
        const t = translations[locale];
        if (t?.translatedAt && t.translatedAt > latestTranslatedAt) {
          latestTranslatedAt = t.translatedAt;
        }
      }
      
      result.set(dest.id, {
        locales,
        translatedAt: latestTranslatedAt || dest.updatedAt?.toISOString() || "",
      });
    }
  }

  return result;
}

/**
 * Get translation coverage statistics for destinations
 */
export async function getDestinationTranslationCoverage(): Promise<{
  totalDestinations: number;
  byLocale: Record<string, { translated: number; pending: number; percentage: number }>;
  overallCoverage: number;
}> {
  const coverage: Record<string, { translated: number; pending: number; percentage: number }> = {};
  
  // Initialize all locales
  for (const locale of SUPPORTED_LOCALES) {
    if (locale.code !== "en") {
      coverage[locale.code] = { translated: 0, pending: 0, percentage: 0 };
    }
  }

  // Get total destinations with content
  const [{ count: totalDestinations }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(destinations)
    .where(eq(destinations.hasPage, true));

  // Get all destination translations from destinations table
  const translationMap = await getAllDestinationTranslations();

  // Calculate coverage per locale
  for (const [, { locales }] of translationMap) {
    for (const localeCode of locales) {
      if (coverage[localeCode]) {
        coverage[localeCode].translated++;
      }
    }
  }

  // Calculate percentages
  let totalTranslated = 0;
  const totalLocales = Object.keys(coverage).length;
  
  for (const localeCode of Object.keys(coverage)) {
    const translated = coverage[localeCode].translated;
    coverage[localeCode].percentage = totalDestinations > 0
      ? Math.round((translated / totalDestinations) * 100)
      : 0;
    coverage[localeCode].pending = totalDestinations - translated;
    totalTranslated += translated;
  }

  // Overall coverage is average across all locales
  const maxTranslations = totalDestinations * totalLocales;
  const overallCoverage = maxTranslations > 0
    ? Math.round((totalTranslated / maxTranslations) * 100)
    : 0;

  return { 
    totalDestinations: totalDestinations || 0, 
    byLocale: coverage, 
    overallCoverage 
  };
}

/**
 * Process pending translation jobs
 * Called by auto-pilot scheduler
 */
export async function processPendingTranslations(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  // Check batch translation jobs status
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    // Get pending batch jobs from logs
    const pendingLogs = await db
      .select()
      .from(aiGenerationLogs)
      .where(
        and(
          eq(aiGenerationLogs.targetType, "destination_translation_queue"),
          eq(aiGenerationLogs.success, true)
        )
      )
      .limit(autoTranslationConfig.maxTranslationsPerDay);

    logger.info(`Processing ${pendingLogs.length} pending translation jobs`);

    for (const log of pendingLogs) {
      try {
        // Process the translation
        const translationResult = await translateDestinationContent(
          log.targetId || "",
          { priorityOnly: true, immediate: true }
        );

        processed++;
        succeeded += translationResult.completed;
        failed += translationResult.failed;

        // Mark as processed by updating the log
        await db
          .update(aiGenerationLogs)
          .set({ 
            targetType: "destination_translation_completed",
            duration: translationResult.completed,
          } as any)
          .where(eq(aiGenerationLogs.id, log.id));

      } catch (error) {
        failed++;
        logger.error(
          { error: String(error), logId: log.id },
          "Translation processing failed"
        );
      }
    }

    logger.info(
      `Translation processing complete: ${succeeded} succeeded, ${failed} failed`
    );
  } catch (error) {
    logger.error({ error: String(error) }, "Pending translation processing failed");
  }

  return { processed, succeeded, failed };
}

/**
 * One-time migration: Backfill translations from aiGenerationLogs to destinations.translations
 * Run this to migrate any translations that were stored in logs before the schema change
 */
export async function backfillTranslationsFromLogs(): Promise<{ migrated: number; skipped: number }> {
  let migrated = 0;
  let skipped = 0;

  try {
    // Get all completed translation logs that might have translation data
    const logs = await db
      .select()
      .from(aiGenerationLogs)
      .where(eq(aiGenerationLogs.targetType, "destination_translation_completed"))
      .orderBy(sql`${aiGenerationLogs.createdAt} ASC`);

    logger.info(`Found ${logs.length} translation logs to check for backfill`);

    for (const log of logs) {
      if (!log.targetId || !log.prompt) {
        skipped++;
        continue;
      }

      try {
        const data = JSON.parse(log.prompt);
        const logTranslations = data.translations;
        
        if (!logTranslations || typeof logTranslations !== 'object' || Object.keys(logTranslations).length === 0) {
          skipped++;
          continue;
        }

        // Get current destination translations
        const [dest] = await db
          .select({ id: destinations.id, translations: destinations.translations })
          .from(destinations)
          .where(eq(destinations.id, log.targetId));

        if (!dest) {
          skipped++;
          continue;
        }

        const existingTranslations = (dest.translations as Record<string, any>) || {};
        
        // Merge log translations into existing (existing takes precedence as it's more current)
        let hasNewTranslations = false;
        for (const [locale, translation] of Object.entries(logTranslations)) {
          if (!existingTranslations[locale]) {
            existingTranslations[locale] = translation;
            hasNewTranslations = true;
          }
        }

        if (hasNewTranslations) {
          await db
            .update(destinations)
            .set({ translations: existingTranslations } as any)
            .where(eq(destinations.id, log.targetId));
          migrated++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }

    logger.info(`Backfill complete: ${migrated} destinations updated, ${skipped} skipped`);
  } catch (error) {
    logger.error({ error: String(error) }, "Translation backfill failed");
  }

  return { migrated, skipped };
}
