/**
 * Octopus Engine - Localizer
 * One-click localization to 17 languages
 *
 * Features:
 * - Batch translation with cost optimization
 * - SEO metadata translation
 * - URL slug generation per language
 * - RTL language support (Hebrew, Arabic)
 * - Quality review flags for critical content
 */

import { log } from '../lib/logger';
import { determineEngineTier, type TaskRequest, type ModelConfig } from './engine-optimizer';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Localizer] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[Localizer] ${msg}`, undefined, data),
};

// ============================================================================
// Types
// ============================================================================

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  enabled: boolean;
}

export interface LocalizedContent {
  languageCode: string;
  title: string;
  slug: string;
  content: string;
  metaDescription: string;
  metaKeywords: string[];
  translatedAt: Date;
  needsReview: boolean;
  reviewReason?: string;
}

export interface LocalizationJob {
  id: string;
  sourceLanguage: string;
  targetLanguages: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  results: Map<string, LocalizedContent>;
  startedAt: Date;
  completedAt?: Date;
  errors: { language: string; error: string }[];
}

export interface ContentToLocalize {
  id: string;
  title: string;
  slug: string;
  content: string;
  metaDescription: string;
  metaKeywords: string[];
  entityType?: string;
  destination?: string;
}

// ============================================================================
// Supported Languages (17 languages)
// ============================================================================

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', enabled: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', direction: 'rtl', enabled: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', enabled: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', enabled: true },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', enabled: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', enabled: true },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr', enabled: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr', enabled: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr', enabled: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr', enabled: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', enabled: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', enabled: true },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', direction: 'ltr', enabled: true },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'ltr', enabled: true },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr', enabled: true },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', direction: 'ltr', enabled: true },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr', enabled: true },
];

// Language-specific SEO considerations
const LANGUAGE_SEO_NOTES: Record<string, string[]> = {
  he: ['Right-to-left layout', 'Hebrew keywords differ from transliteration'],
  ar: ['Right-to-left layout', 'Consider regional Arabic variants (MSA vs Gulf)'],
  zh: ['Consider Simplified vs Traditional', 'Baidu SEO differs from Google'],
  ja: ['Mix of Hiragana, Katakana, Kanji important for SEO'],
  ko: ['Korean spacing rules differ from English'],
  ru: ['Cyrillic URL slugs may need transliteration'],
  th: ['Thai has no spaces between words'],
};

// ============================================================================
// Core Localization Functions
// ============================================================================

/**
 * Localize content to all enabled languages
 */
export async function localizeToAllLanguages(
  content: ContentToLocalize,
  sourceLanguage: string = 'en',
  options: {
    skipLanguages?: string[];
    priorityLanguages?: string[];
    forceReview?: boolean;
  } = {}
): Promise<LocalizationJob> {
  const jobId = `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const targetLanguages = SUPPORTED_LANGUAGES
    .filter(lang =>
      lang.enabled &&
      lang.code !== sourceLanguage &&
      !options.skipLanguages?.includes(lang.code)
    )
    .map(lang => lang.code);

  // Prioritize specified languages
  if (options.priorityLanguages?.length) {
    targetLanguages.sort((a, b) => {
      const aPriority = options.priorityLanguages!.includes(a) ? 0 : 1;
      const bPriority = options.priorityLanguages!.includes(b) ? 0 : 1;
      return aPriority - bPriority;
    });
  }

  const job: LocalizationJob = {
    id: jobId,
    sourceLanguage,
    targetLanguages,
    status: 'in_progress',
    progress: {
      total: targetLanguages.length,
      completed: 0,
      failed: 0,
    },
    results: new Map(),
    startedAt: new Date(),
    errors: [],
  };

  logger.info('Starting localization job', {
    jobId,
    sourceLanguage,
    targetCount: targetLanguages.length,
  });

  // Process each language
  for (const targetLang of targetLanguages) {
    try {
      const localized = await translateContent(content, sourceLanguage, targetLang);

      // Flag for review if needed
      if (options.forceReview || shouldFlagForReview(content, targetLang)) {
        localized.needsReview = true;
        localized.reviewReason = getReviewReason(content, targetLang);
      }

      job.results.set(targetLang, localized);
      job.progress.completed++;

      logger.info('Language completed', {
        jobId,
        language: targetLang,
        progress: `${job.progress.completed}/${job.progress.total}`,
      });
    } catch (error) {
      job.progress.failed++;
      job.errors.push({
        language: targetLang,
        error: String(error),
      });
      logger.error('Translation failed', { jobId, language: targetLang, error: String(error) });
    }
  }

  job.status = job.progress.failed === 0 ? 'completed' : 'completed';
  job.completedAt = new Date();

  logger.info('Localization job completed', {
    jobId,
    completed: job.progress.completed,
    failed: job.progress.failed,
    duration: `${(job.completedAt.getTime() - job.startedAt.getTime()) / 1000}s`,
  });

  return job;
}

/**
 * Translate content to a single language
 */
export async function translateContent(
  content: ContentToLocalize,
  sourceLanguage: string,
  targetLanguage: string
): Promise<LocalizedContent> {
  const targetLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage);

  if (!targetLangInfo) {
    throw new Error(`Unsupported language: ${targetLanguage}`);
  }

  // Determine engine tier for translation
  const taskRequest: TaskRequest = {
    type: 'translation',
    priority: 'medium',
    isImmediatePublish: false,
    estimatedInputTokens: content.content.length / 4,
    estimatedOutputTokens: content.content.length / 3, // Translations can be longer
    requiresAccuracy: targetLangInfo.direction === 'rtl', // RTL needs more attention
    language: targetLanguage,
  };

  const engineDecision = determineEngineTier(taskRequest);

  // Build translation prompt
  const prompt = buildTranslationPrompt(content, sourceLanguage, targetLanguage, targetLangInfo);

  // Call AI for translation (placeholder - integrate with actual AI provider)
  const translatedData = await executeTranslation(prompt, engineDecision.model);

  // Generate localized slug
  const localizedSlug = generateLocalizedSlug(content.slug, targetLanguage, translatedData.title);

  return {
    languageCode: targetLanguage,
    title: translatedData.title,
    slug: localizedSlug,
    content: translatedData.content,
    metaDescription: translatedData.metaDescription,
    metaKeywords: translatedData.metaKeywords,
    translatedAt: new Date(),
    needsReview: false,
  };
}

/**
 * Build translation prompt
 */
function buildTranslationPrompt(
  content: ContentToLocalize,
  sourceLanguage: string,
  targetLanguage: string,
  targetLangInfo: Language
): string {
  const seoNotes = LANGUAGE_SEO_NOTES[targetLanguage] || [];

  return `
You are a professional translator specializing in travel content.
Translate the following content from ${sourceLanguage} to ${targetLangInfo.name} (${targetLangInfo.nativeName}).

IMPORTANT GUIDELINES:
1. Maintain SEO-friendly structure
2. Keep proper nouns (hotel names, place names) in their original form or provide both
3. Adapt cultural references appropriately
4. Ensure natural, fluent ${targetLangInfo.nativeName} - not literal translation
5. Preserve markdown formatting
${seoNotes.length ? `6. Language-specific notes:\n${seoNotes.map(n => `   - ${n}`).join('\n')}` : ''}

SOURCE CONTENT:
Title: ${content.title}
Meta Description: ${content.metaDescription}
Meta Keywords: ${content.metaKeywords.join(', ')}

---
${content.content}
---

Respond with JSON:
{
  "title": "translated title",
  "metaDescription": "translated meta description (max 160 chars)",
  "metaKeywords": ["keyword1", "keyword2", ...],
  "content": "full translated content with markdown preserved"
}
`.trim();
}

/**
 * Execute translation with AI
 */
async function executeTranslation(
  prompt: string,
  model: ModelConfig
): Promise<{
  title: string;
  content: string;
  metaDescription: string;
  metaKeywords: string[];
}> {
  // This would integrate with the actual AI provider
  // For now, return placeholder that indicates structure

  // In production, this would call:
  // const provider = getProviderForModel(model);
  // const result = await provider.generateCompletion({ messages: [...], ... });

  logger.info('Would execute translation with model', { model: model.model });

  // Placeholder return - in production this calls the AI
  return {
    title: '[TRANSLATION PENDING]',
    content: '[TRANSLATION PENDING - Connect AI provider]',
    metaDescription: '[TRANSLATION PENDING]',
    metaKeywords: [],
  };
}

/**
 * Generate localized URL slug
 */
function generateLocalizedSlug(
  originalSlug: string,
  targetLanguage: string,
  translatedTitle: string
): string {
  // For RTL languages and non-Latin scripts, keep original slug with language prefix
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage);

  if (lang?.direction === 'rtl' || ['zh', 'ja', 'ko', 'th', 'ru'].includes(targetLanguage)) {
    // Use language prefix with original slug
    return `/${targetLanguage}${originalSlug}`;
  }

  // For Latin-based languages, try to create localized slug
  const slugBase = translatedTitle
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Keep original structure, replace last segment
  const parts = originalSlug.split('/');
  parts[parts.length - 1] = slugBase || parts[parts.length - 1];

  return `/${targetLanguage}${parts.join('/')}`;
}

/**
 * Determine if content needs human review
 */
function shouldFlagForReview(content: ContentToLocalize, targetLanguage: string): boolean {
  // Always review RTL languages
  if (['he', 'ar'].includes(targetLanguage)) {
    return true;
  }

  // Review if content has legal/safety information
  const legalTerms = ['warning', 'caution', 'legal', 'prohibited', 'visa', 'permit'];
  if (legalTerms.some(term => content.content.toLowerCase().includes(term))) {
    return true;
  }

  // Review for Asian languages with complex scripts
  if (['zh', 'ja', 'ko'].includes(targetLanguage)) {
    return true;
  }

  return false;
}

/**
 * Get reason for review flag
 */
function getReviewReason(content: ContentToLocalize, targetLanguage: string): string {
  const reasons: string[] = [];

  if (['he', 'ar'].includes(targetLanguage)) {
    reasons.push('RTL language - verify layout');
  }

  if (['zh', 'ja', 'ko'].includes(targetLanguage)) {
    reasons.push('Complex script - verify accuracy');
  }

  const legalTerms = ['warning', 'caution', 'legal', 'prohibited', 'visa', 'permit'];
  if (legalTerms.some(term => content.content.toLowerCase().includes(term))) {
    reasons.push('Contains legal/safety information');
  }

  return reasons.join('; ') || 'Automatic review flag';
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Localize multiple content pieces
 */
export async function batchLocalize(
  contents: ContentToLocalize[],
  sourceLanguage: string = 'en',
  targetLanguages?: string[]
): Promise<{
  jobs: LocalizationJob[];
  stats: {
    totalContent: number;
    totalTranslations: number;
    estimatedTimeMinutes: number;
    estimatedCostUSD: number;
  };
}> {
  const languages = targetLanguages || SUPPORTED_LANGUAGES
    .filter(l => l.enabled && l.code !== sourceLanguage)
    .map(l => l.code);

  const jobs: LocalizationJob[] = [];

  const stats = {
    totalContent: contents.length,
    totalTranslations: contents.length * languages.length,
    estimatedTimeMinutes: Math.ceil((contents.length * languages.length * 5) / 60), // ~5 sec per translation
    estimatedCostUSD: contents.length * languages.length * 0.002, // ~$0.002 per translation with fast tier
  };

  logger.info('Starting batch localization', stats);

  for (const content of contents) {
    const job = await localizeToAllLanguages(content, sourceLanguage, {
      skipLanguages: SUPPORTED_LANGUAGES
        .filter(l => !languages.includes(l.code))
        .map(l => l.code),
    });
    jobs.push(job);
  }

  return { jobs, stats };
}

// ============================================================================
// Language Management
// ============================================================================

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): Language[] {
  return [...SUPPORTED_LANGUAGES];
}

/**
 * Get enabled languages only
 */
export function getEnabledLanguages(): Language[] {
  return SUPPORTED_LANGUAGES.filter(l => l.enabled);
}

/**
 * Get RTL languages
 */
export function getRTLLanguages(): Language[] {
  return SUPPORTED_LANGUAGES.filter(l => l.direction === 'rtl');
}

/**
 * Enable/disable a language
 */
export function setLanguageEnabled(code: string, enabled: boolean): boolean {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  if (lang) {
    lang.enabled = enabled;
    return true;
  }
  return false;
}

// ============================================================================
// Localization Stats
// ============================================================================

export interface LocalizationStats {
  totalJobsCompleted: number;
  totalTranslations: number;
  byLanguage: Record<string, number>;
  averageTimePerTranslation: number;
  needsReviewCount: number;
}

let localizationStats: LocalizationStats = {
  totalJobsCompleted: 0,
  totalTranslations: 0,
  byLanguage: {},
  averageTimePerTranslation: 0,
  needsReviewCount: 0,
};

export function getLocalizationStats(): LocalizationStats {
  return { ...localizationStats };
}

export function resetLocalizationStats(): void {
  localizationStats = {
    totalJobsCompleted: 0,
    totalTranslations: 0,
    byLanguage: {},
    averageTimePerTranslation: 0,
    needsReviewCount: 0,
  };
}

// ============================================================================
// Integration Helpers
// ============================================================================

/**
 * Get hreflang tags for localized content
 */
export function generateHreflangTags(
  baseUrl: string,
  localizedSlugs: Map<string, string>
): string[] {
  const tags: string[] = [];

  // Use Array.from for compatibility
  const entries = Array.from(localizedSlugs.entries());
  for (const entry of entries) {
    const langCode = entry[0];
    const slug = entry[1];
    tags.push(`<link rel="alternate" hreflang="${langCode}" href="${baseUrl}${slug}" />`);
  }

  // Add x-default
  const defaultSlug = localizedSlugs.get('en') || (entries.length > 0 ? entries[0][1] : undefined);
  if (defaultSlug) {
    tags.push(`<link rel="alternate" hreflang="x-default" href="${baseUrl}${defaultSlug}" />`);
  }

  return tags;
}

/**
 * Get language switcher data
 */
export function getLanguageSwitcherData(
  currentLanguage: string,
  localizedSlugs: Map<string, string>
): { code: string; name: string; nativeName: string; url: string; current: boolean }[] {
  return SUPPORTED_LANGUAGES
    .filter(lang => lang.enabled && localizedSlugs.has(lang.code))
    .map(lang => ({
      code: lang.code,
      name: lang.name,
      nativeName: lang.nativeName,
      url: localizedSlugs.get(lang.code)!,
      current: lang.code === currentLanguage,
    }));
}
