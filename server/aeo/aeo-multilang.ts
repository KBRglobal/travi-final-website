/**
 * AEO Multi-Language Support
 * Automatic capsule translation and locale-specific optimization
 */

import { db } from '../db';
import { aeoAnswerCapsules, contents, translations } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { getAllUnifiedProviders } from '../ai/providers';
import { AEO_LOCALE_PRIORITY, ANSWER_CAPSULE_CONFIG } from './aeo-config';
import { log } from '../lib/logger';

const aeoLogger = {
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[AEO Multilang] ${msg}`, undefined, data),
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[AEO Multilang] ${msg}`, data),
};

// Locale metadata
export const LOCALE_METADATA: Record<string, {
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  aiOptimizations: string[];
}> = {
  en: {
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    aiOptimizations: ['Standard format', 'Direct answers'],
  },
  ar: {
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    aiOptimizations: ['RTL formatting', 'Cultural context', 'Numbers in Arabic'],
  },
  hi: {
    name: 'Hindi',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    aiOptimizations: ['Devanagari script', 'Indian context'],
  },
  zh: {
    name: 'Chinese',
    nativeName: '中文',
    direction: 'ltr',
    aiOptimizations: ['Simplified Chinese', 'Concise format'],
  },
  ru: {
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    aiOptimizations: ['Cyrillic script', 'Formal tone'],
  },
  fr: {
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    aiOptimizations: ['Formal address', 'European context'],
  },
  de: {
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    aiOptimizations: ['Formal address', 'Precise terminology'],
  },
  es: {
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    aiOptimizations: ['Latin American and European variants'],
  },
  he: {
    name: 'Hebrew',
    nativeName: 'עברית',
    direction: 'rtl',
    aiOptimizations: ['RTL formatting', 'Israeli context'],
  },
  ja: {
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    aiOptimizations: ['Keigo (polite form)', 'Mixed scripts'],
  },
  ko: {
    name: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    aiOptimizations: ['Hangul script', 'Formal tone'],
  },
  it: {
    name: 'Italian',
    nativeName: 'Italiano',
    direction: 'ltr',
    aiOptimizations: ['Formal address'],
  },
  tr: {
    name: 'Turkish',
    nativeName: 'Türkçe',
    direction: 'ltr',
    aiOptimizations: ['Turkish characters'],
  },
};

export interface TranslatedCapsule {
  locale: string;
  capsuleText: string;
  quickAnswer: string;
  keyFacts: string[];
  differentiator: string;
  qualityScore: number;
  translatedBy: 'ai' | 'human';
}

/**
 * Translate an existing capsule to another language
 */
export async function translateCapsule(
  contentId: string,
  sourceLocale: string,
  targetLocale: string
): Promise<TranslatedCapsule> {
  // Get source capsule
  const sourceCapsule = await db.query.aeoAnswerCapsules.findFirst({
    where: and(
      eq(aeoAnswerCapsules.contentId, contentId),
      eq(aeoAnswerCapsules.locale, sourceLocale as any)
    ),
  });

  if (!sourceCapsule) {
    throw new Error(`No capsule found for content ${contentId} in locale ${sourceLocale}`);
  }

  const targetMeta = LOCALE_METADATA[targetLocale];
  if (!targetMeta) {
    throw new Error(`Unsupported locale: ${targetLocale}`);
  }

  // Check if translation already exists
  const existingTranslation = await db.query.aeoAnswerCapsules.findFirst({
    where: and(
      eq(aeoAnswerCapsules.contentId, contentId),
      eq(aeoAnswerCapsules.locale, targetLocale as any)
    ),
  });

  if (existingTranslation && existingTranslation.qualityScore &&
      existingTranslation.qualityScore >= ANSWER_CAPSULE_CONFIG.qualityThresholds.acceptable) {
    return {
      locale: targetLocale,
      capsuleText: existingTranslation.capsuleText,
      quickAnswer: existingTranslation.quickAnswer || '',
      keyFacts: (existingTranslation.keyFacts as string[]) || [],
      differentiator: existingTranslation.differentiator || '',
      qualityScore: existingTranslation.qualityScore,
      translatedBy: existingTranslation.generatedByAI ? 'ai' : 'human',
    };
  }

  // Translate using AI
  const providers = getAllUnifiedProviders();
  if (providers.length === 0) {
    throw new Error('No AI provider available for translation');
  }

  const prompt = buildTranslationPrompt(
    sourceCapsule,
    sourceLocale,
    targetLocale,
    targetMeta
  );

  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages: [
          {
            role: 'system',
            content: getTranslationSystemPrompt(targetLocale, targetMeta),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2, // Low temperature for accurate translation
        maxTokens: 600,
        responseFormat: { type: 'json_object' },
      });

      const parsed = JSON.parse(result.content);

      const translatedCapsule: TranslatedCapsule = {
        locale: targetLocale,
        capsuleText: parsed.capsuleText || parsed.capsule_text || '',
        quickAnswer: parsed.quickAnswer || parsed.quick_answer || '',
        keyFacts: parsed.keyFacts || parsed.key_facts || [],
        differentiator: parsed.differentiator || '',
        qualityScore: 75, // Default score for translations
        translatedBy: 'ai',
      };

      // Save to database
      await saveCapsuleTranslation(contentId, targetLocale, translatedCapsule);

      aeoLogger.info('Capsule translated', { contentId, sourceLocale, targetLocale });
      return translatedCapsule;
    } catch (error) {
      aeoLogger.error('Translation failed with provider', { provider: provider.name, error });
    }
  }

  throw new Error('All translation providers failed');
}

/**
 * Build translation prompt
 */
function buildTranslationPrompt(
  sourceCapsule: any,
  sourceLocale: string,
  targetLocale: string,
  targetMeta: typeof LOCALE_METADATA[string]
): string {
  return `Translate the following Answer Capsule from ${LOCALE_METADATA[sourceLocale]?.name || sourceLocale} to ${targetMeta.name}.

SOURCE CAPSULE:
capsuleText: ${sourceCapsule.capsuleText}
quickAnswer: ${sourceCapsule.quickAnswer || 'N/A'}
keyFacts: ${JSON.stringify(sourceCapsule.keyFacts || [])}
differentiator: ${sourceCapsule.differentiator || 'N/A'}

TRANSLATION REQUIREMENTS:
1. Maintain the factual accuracy and meaning
2. Keep the capsuleText between ${ANSWER_CAPSULE_CONFIG.minWords}-${ANSWER_CAPSULE_CONFIG.maxWords} words
3. Use natural, native ${targetMeta.name} phrasing
4. ${targetMeta.direction === 'rtl' ? 'Format for right-to-left display' : 'Use standard left-to-right formatting'}
5. Adapt cultural references appropriately
6. Keep numbers and statistics accurate

OPTIMIZATIONS FOR ${targetMeta.name.toUpperCase()}:
${targetMeta.aiOptimizations.map(o => `- ${o}`).join('\n')}

Respond with valid JSON:
{
  "capsuleText": "...",
  "quickAnswer": "...",
  "keyFacts": ["...", "..."],
  "differentiator": "..."
}`;
}

/**
 * Get system prompt for translation
 */
function getTranslationSystemPrompt(
  targetLocale: string,
  targetMeta: typeof LOCALE_METADATA[string]
): string {
  return `You are an expert translator specializing in travel content and Answer Engine Optimization (AEO).
Your task is to translate content to ${targetMeta.name} (${targetMeta.nativeName}) while:
- Maintaining SEO and AEO effectiveness
- Using natural, fluent ${targetMeta.name}
- Preserving factual accuracy
- Adapting cultural context appropriately

Output ${targetMeta.direction === 'rtl' ? 'right-to-left' : 'standard'} formatted text.
Do not add any content that wasn't in the original.`;
}

/**
 * Save translated capsule to database
 */
async function saveCapsuleTranslation(
  contentId: string,
  locale: string,
  capsule: TranslatedCapsule
): Promise<void> {
  const existing = await db.query.aeoAnswerCapsules.findFirst({
    where: and(
      eq(aeoAnswerCapsules.contentId, contentId),
      eq(aeoAnswerCapsules.locale, locale as any)
    ),
  });

  if (existing) {
    await db.update(aeoAnswerCapsules)
      .set({
        capsuleText: capsule.capsuleText,
        quickAnswer: capsule.quickAnswer,
        keyFacts: capsule.keyFacts,
        differentiator: capsule.differentiator,
        qualityScore: capsule.qualityScore,
        generatedByAI: capsule.translatedBy === 'ai',
        updatedAt: new Date(),
      } as any)
      .where(eq(aeoAnswerCapsules.id, existing.id));
  } else {
    await db.insert(aeoAnswerCapsules).values({
      contentId,
      locale: locale as any,
      capsuleText: capsule.capsuleText,
      quickAnswer: capsule.quickAnswer,
      keyFacts: capsule.keyFacts,
      differentiator: capsule.differentiator,
      qualityScore: capsule.qualityScore,
      generatedByAI: capsule.translatedBy === 'ai',
    } as any);
  }
}

/**
 * Batch translate capsules for a content to all priority locales
 */
export async function translateToAllLocales(
  contentId: string,
  sourceLocale: string = 'en'
): Promise<{ success: string[]; failed: string[] }> {
  const allLocales = [
    ...AEO_LOCALE_PRIORITY.tier1,
    ...AEO_LOCALE_PRIORITY.tier2,
    ...AEO_LOCALE_PRIORITY.tier3,
  ].filter(l => l !== sourceLocale);

  const success: string[] = [];
  const failed: string[] = [];

  for (const locale of allLocales) {
    try {
      await translateCapsule(contentId, sourceLocale, locale);
      success.push(locale);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      aeoLogger.error('Failed to translate to locale', { contentId, locale, error });
      failed.push(locale);
    }
  }

  aeoLogger.info('Batch translation completed', { contentId, success: success.length, failed: failed.length });
  return { success, failed };
}

/**
 * Get translation coverage for a content
 */
export async function getTranslationCoverage(contentId: string): Promise<{
  total: number;
  translated: number;
  coverage: number;
  byTier: {
    tier1: { total: number; translated: number };
    tier2: { total: number; translated: number };
    tier3: { total: number; translated: number };
  };
  missing: string[];
}> {
  const allLocales = [
    ...AEO_LOCALE_PRIORITY.tier1,
    ...AEO_LOCALE_PRIORITY.tier2,
    ...AEO_LOCALE_PRIORITY.tier3,
  ];

  const existingCapsules = await db
    .select({ locale: aeoAnswerCapsules.locale })
    .from(aeoAnswerCapsules)
    .where(eq(aeoAnswerCapsules.contentId, contentId));

  const translatedLocales = new Set(existingCapsules.map(c => c.locale));
  const missing = allLocales.filter(l => !translatedLocales.has(l as any));

  const countTranslated = (locales: readonly string[]) =>
    locales.filter(l => translatedLocales.has(l as any)).length;

  return {
    total: allLocales.length,
    translated: translatedLocales.size,
    coverage: Math.round((translatedLocales.size / allLocales.length) * 100),
    byTier: {
      tier1: {
        total: AEO_LOCALE_PRIORITY.tier1.length,
        translated: countTranslated(AEO_LOCALE_PRIORITY.tier1),
      },
      tier2: {
        total: AEO_LOCALE_PRIORITY.tier2.length,
        translated: countTranslated(AEO_LOCALE_PRIORITY.tier2),
      },
      tier3: {
        total: AEO_LOCALE_PRIORITY.tier3.length,
        translated: countTranslated(AEO_LOCALE_PRIORITY.tier3),
      },
    },
    missing,
  };
}

/**
 * Get all supported locales with metadata
 */
export function getSupportedLocales(): Array<{
  code: string;
  name: string;
  nativeName: string;
  tier: 1 | 2 | 3;
  direction: 'ltr' | 'rtl';
}> {
  const getTier = (locale: string): 1 | 2 | 3 => {
    if ((AEO_LOCALE_PRIORITY.tier1 as readonly string[]).includes(locale)) return 1;
    if ((AEO_LOCALE_PRIORITY.tier2 as readonly string[]).includes(locale)) return 2;
    return 3;
  };

  return Object.entries(LOCALE_METADATA).map(([code, meta]) => ({
    code,
    name: meta.name,
    nativeName: meta.nativeName,
    tier: getTier(code),
    direction: meta.direction,
  }));
}
