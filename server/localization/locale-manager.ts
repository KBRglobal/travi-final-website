/**
 * Content Localization - Locale Manager
 */

import {
  Locale,
  ContentTranslation,
  TranslationStatus,
  TranslationJob,
  LocaleCoverage,
  TranslationMemoryEntry,
} from "./types";

// In-memory stores
const locales = new Map<string, Locale>();
const translations = new Map<string, ContentTranslation>();
const translationJobs = new Map<string, TranslationJob>();
const translationMemory: TranslationMemoryEntry[] = [];

// Initialize all 17 supported locales for global SEO competition
const defaultLocales: Locale[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    direction: "ltr",
    isDefault: true,
    isEnabled: true,
  },
  {
    code: "he",
    name: "Hebrew",
    nativeName: "Hebrew",
    direction: "rtl",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    direction: "rtl",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "zh",
    name: "Chinese",
    nativeName: "中文",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "nl",
    name: "Dutch",
    nativeName: "Nederlands",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "tr",
    name: "Turkish",
    nativeName: "Türkçe",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "pl",
    name: "Polish",
    nativeName: "Polski",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
  {
    code: "th",
    name: "Thai",
    nativeName: "ไทย",
    direction: "ltr",
    isDefault: false,
    isEnabled: true,
    fallbackLocale: "en",
  },
];

for (const locale of defaultLocales) {
  locales.set(locale.code, locale);
}

/**
 * Get all locales.
 */
export function getAllLocales(): Locale[] {
  return Array.from(locales.values());
}

/**
 * Get enabled locales.
 */
export function getEnabledLocales(): Locale[] {
  return Array.from(locales.values()).filter(l => l.isEnabled);
}

/**
 * Get default locale.
 */
export function getDefaultLocale(): Locale {
  return Array.from(locales.values()).find(l => l.isDefault) || defaultLocales[0];
}

/**
 * Get locale by code.
 */
export function getLocale(code: string): Locale | null {
  return locales.get(code) || null;
}

/**
 * Enable/disable locale.
 */
export function setLocaleEnabled(code: string, enabled: boolean): Locale | null {
  const locale = locales.get(code);
  if (!locale) return null;

  locale.isEnabled = enabled;
  locales.set(code, locale);
  return locale;
}

/**
 * Add new locale.
 */
export function addLocale(locale: Locale): Locale {
  locales.set(locale.code, locale);
  return locale;
}

/**
 * Create translation record.
 */
export function createTranslation(
  contentId: string,
  sourceLocale: string,
  targetLocale: string
): ContentTranslation {
  const id = `trans-${contentId}-${targetLocale}`;

  const translation: ContentTranslation = {
    id,
    contentId,
    sourceLocale,
    targetLocale,
    status: "not_started",
    translatedFields: {},
    sourceVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  translations.set(id, translation);
  return translation;
}

/**
 * Get translation.
 */
export function getTranslation(contentId: string, targetLocale: string): ContentTranslation | null {
  const id = `trans-${contentId}-${targetLocale}`;
  return translations.get(id) || null;
}

/**
 * Get all translations for content.
 */
export function getContentTranslations(contentId: string): ContentTranslation[] {
  return Array.from(translations.values()).filter(t => t.contentId === contentId);
}

/**
 * Update translation.
 */
export function updateTranslation(
  contentId: string,
  targetLocale: string,
  updates: Partial<
    Pick<ContentTranslation, "status" | "translatedFields" | "translatedBy" | "reviewedBy">
  >
): ContentTranslation | null {
  const id = `trans-${contentId}-${targetLocale}`;
  const translation = translations.get(id);

  if (!translation) return null;

  Object.assign(translation, updates, { updatedAt: new Date() });

  if (updates.status === "in_progress" && !translation.translatedAt) {
    translation.translatedAt = new Date();
  }
  if (updates.status === "approved" && !translation.reviewedAt) {
    translation.reviewedAt = new Date();
  }
  if (updates.status === "published" && !translation.publishedAt) {
    translation.publishedAt = new Date();
  }

  translations.set(id, translation);
  return translation;
}

/**
 * Mark translations as outdated.
 */
export function markTranslationsOutdated(contentId: string): number {
  let count = 0;
  for (const [id, translation] of translations) {
    if (translation.contentId === contentId && translation.status === "published") {
      translation.status = "outdated";
      translation.updatedAt = new Date();
      translations.set(id, translation);
      count++;
    }
  }
  return count;
}

/**
 * Create translation job.
 */
export function createTranslationJob(
  contentIds: string[],
  sourceLocale: string,
  targetLocales: string[],
  priority: "low" | "medium" | "high" | "urgent" = "medium",
  dueDate?: Date
): TranslationJob {
  const job: TranslationJob = {
    id: `job-${Date.now()}`,
    contentIds,
    sourceLocale,
    targetLocales,
    priority,
    status: "pending",
    progress: 0,
    dueDate,
    createdAt: new Date(),
  };

  // Initialize translation records
  for (const contentId of contentIds) {
    for (const targetLocale of targetLocales) {
      if (!getTranslation(contentId, targetLocale)) {
        createTranslation(contentId, sourceLocale, targetLocale);
      }
    }
  }

  translationJobs.set(job.id, job);
  return job;
}

/**
 * Get translation job.
 */
export function getTranslationJob(jobId: string): TranslationJob | null {
  return translationJobs.get(jobId) || null;
}

/**
 * Get pending translation jobs.
 */
export function getPendingJobs(): TranslationJob[] {
  return Array.from(translationJobs.values())
    .filter(j => j.status === "pending" || j.status === "in_progress")
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

/**
 * Update job progress.
 */
export function updateJobProgress(jobId: string, progress: number): TranslationJob | null {
  const job = translationJobs.get(jobId);
  if (!job) return null;

  job.progress = Math.min(100, Math.max(0, progress));
  job.status = progress >= 100 ? "completed" : "in_progress";

  if (job.status === "completed") {
    job.completedAt = new Date();
  }

  translationJobs.set(jobId, job);
  return job;
}

/**
 * Get locale coverage.
 */
export function getLocaleCoverage(totalContentCount: number): LocaleCoverage[] {
  const coverage: LocaleCoverage[] = [];

  for (const locale of getEnabledLocales()) {
    if (locale.isDefault) continue;

    const localeTranslations = Array.from(translations.values()).filter(
      t => t.targetLocale === locale.code
    );

    const translated = localeTranslations.filter(t => t.status === "published").length;
    const pending = localeTranslations.filter(t =>
      ["not_started", "in_progress", "pending_review"].includes(t.status)
    ).length;
    const outdated = localeTranslations.filter(t => t.status === "outdated").length;

    coverage.push({
      locale: locale.code,
      totalContent: totalContentCount,
      translated,
      pending,
      outdated,
      coverage: totalContentCount > 0 ? (translated / totalContentCount) * 100 : 0,
    });
  }

  return coverage;
}

/**
 * Add to translation memory.
 */
export function addToTranslationMemory(
  sourceText: string,
  sourceLocale: string,
  targetText: string,
  targetLocale: string,
  context?: string
): void {
  const existing = translationMemory.find(
    e =>
      e.sourceText === sourceText &&
      e.sourceLocale === sourceLocale &&
      e.targetLocale === targetLocale
  );

  if (existing) {
    existing.targetText = targetText;
    existing.usageCount++;
    existing.lastUsed = new Date();
  } else {
    translationMemory.push({
      sourceText,
      sourceLocale,
      targetText,
      targetLocale,
      context,
      usageCount: 1,
      lastUsed: new Date(),
    });
  }
}

/**
 * Search translation memory.
 */
export function searchTranslationMemory(
  sourceText: string,
  sourceLocale: string,
  targetLocale: string
): TranslationMemoryEntry | null {
  return (
    translationMemory.find(
      e =>
        e.sourceText === sourceText &&
        e.sourceLocale === sourceLocale &&
        e.targetLocale === targetLocale
    ) || null
  );
}

/**
 * Get translation stats.
 */
export function getTranslationStats(): {
  totalTranslations: number;
  byStatus: Record<TranslationStatus, number>;
  pendingJobs: number;
  memorySize: number;
} {
  const byStatus: Record<TranslationStatus, number> = {
    not_started: 0,
    in_progress: 0,
    pending_review: 0,
    approved: 0,
    published: 0,
    outdated: 0,
  };

  for (const t of translations.values()) {
    byStatus[t.status]++;
  }

  return {
    totalTranslations: translations.size,
    byStatus,
    pendingJobs: getPendingJobs().length,
    memorySize: translationMemory.length,
  };
}
