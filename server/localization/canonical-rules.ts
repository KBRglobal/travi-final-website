/**
 * Phase 6: Canonical Rules
 * 
 * Defines English (en) as the ALWAYS canonical source of truth.
 * Translations are ALWAYS derived from English, never from other translations.
 * This prevents circular dependencies and ensures consistency.
 * 
 * HARD CONSTRAINTS:
 * - English (en) is ALWAYS the canonical locale
 * - No content can be translated from a non-English source
 * - All translation chains originate from English
 */

import { db } from '../db';
import { contents, type Content } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[CanonicalRules] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => 
    log.error(`[CanonicalRules] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[CanonicalRules] WARN: ${msg}`, data),
};

export const CANONICAL_LOCALE = 'en' as const;

export interface CanonicalContent {
  content: Content;
  locale: typeof CANONICAL_LOCALE;
  isCanonical: true;
  lastUpdated: Date;
  sourceHash: string;
}

export interface CanonicalValidation {
  isValid: boolean;
  sourceLocale: string;
  targetLocale: string;
  error?: string;
}

/**
 * Get the canonical (English) content for a given content ID.
 * The canonical content is ALWAYS the English source.
 * 
 * @param contentId - The ID of the content to retrieve
 * @returns The canonical content with metadata, or null if not found
 */
export async function getCanonicalContent(contentId: string): Promise<CanonicalContent | null> {
  try {
    const [content] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, contentId));

    if (!content) {
      logger.warn('Content not found for canonical lookup', { contentId });
      return null;
    }

    const sourceHash = computeCanonicalHash(content);

    return {
      content,
      locale: CANONICAL_LOCALE,
      isCanonical: true,
      lastUpdated: content.updatedAt || content.createdAt || new Date(),
      sourceHash,
    };
  } catch (error) {
    logger.error('Failed to get canonical content', { 
      contentId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
}

/**
 * Compute a hash of the canonical content for change detection.
 * Used to determine if translations need to be regenerated.
 */
export function computeCanonicalHash(content: Content): string {
  const crypto = require('crypto');
  
  const hashableData = {
    title: content.title,
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
    blocks: content.blocks,
    answerCapsule: content.answerCapsule,
    primaryKeyword: content.primaryKeyword,
    secondaryKeywords: content.secondaryKeywords,
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(hashableData))
    .digest('hex')
    .substring(0, 32);
}

/**
 * Validate that a translation request follows canonical rules.
 * 
 * RULES:
 * 1. Source locale MUST be English (en)
 * 2. Target locale MUST NOT be English
 * 3. No circular translation chains allowed
 */
export function validateTranslationChain(
  sourceLocale: string,
  targetLocale: string
): CanonicalValidation {
  if (sourceLocale !== CANONICAL_LOCALE) {
    return {
      isValid: false,
      sourceLocale,
      targetLocale,
      error: `Source locale must be English (en). Got: ${sourceLocale}. Translations must always derive from English to prevent circular dependencies.`,
    };
  }

  if (targetLocale === CANONICAL_LOCALE) {
    return {
      isValid: false,
      sourceLocale,
      targetLocale,
      error: 'Cannot translate into English (en). English is the canonical source.',
    };
  }

  if (sourceLocale === targetLocale) {
    return {
      isValid: false,
      sourceLocale,
      targetLocale,
      error: 'Source and target locales cannot be the same.',
    };
  }

  return {
    isValid: true,
    sourceLocale,
    targetLocale,
  };
}

/**
 * Ensure a translation job uses the correct canonical source.
 * This is a guard function to prevent accidental non-English source translations.
 */
export function enforceCanonicalSource(requestedSourceLocale: string): string {
  if (requestedSourceLocale !== CANONICAL_LOCALE) {
    logger.warn('Non-canonical source locale requested, forcing English', {
      requested: requestedSourceLocale,
      enforced: CANONICAL_LOCALE,
    });
  }
  return CANONICAL_LOCALE;
}

/**
 * Check if a locale is the canonical locale.
 */
export function isCanonicalLocale(locale: string): boolean {
  return locale === CANONICAL_LOCALE;
}

/**
 * Get translatable fields from canonical content.
 * Returns the fields that should be translated, excluding system fields.
 */
export function getTranslatableFields(content: Content): {
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  blocks: unknown[];
  answerCapsule: string | null;
} {
  return {
    title: content.title,
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
    blocks: content.blocks || [],
    answerCapsule: content.answerCapsule,
  };
}
