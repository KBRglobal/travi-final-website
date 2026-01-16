/**
 * Content Localization Management - Type Definitions
 *
 * Feature flag: ENABLE_LOCALIZATION=true
 */

export function isLocalizationEnabled(): boolean {
  return process.env.ENABLE_LOCALIZATION === 'true';
}

/**
 * Supported locale.
 */
export interface Locale {
  code: string;       // e.g., 'en', 'ar', 'fr'
  name: string;       // e.g., 'English', 'Arabic'
  nativeName: string; // e.g., 'English', 'العربية'
  direction: 'ltr' | 'rtl';
  isDefault: boolean;
  isEnabled: boolean;
  fallbackLocale?: string;
}

/**
 * Translation status.
 */
export type TranslationStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'outdated';

/**
 * Content translation record.
 */
export interface ContentTranslation {
  id: string;
  contentId: string;
  sourceLocale: string;
  targetLocale: string;
  status: TranslationStatus;
  translatedFields: Record<string, string>;
  translatedBy?: string;
  reviewedBy?: string;
  sourceVersion: number;
  translatedAt?: Date;
  reviewedAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Translation job.
 */
export interface TranslationJob {
  id: string;
  contentIds: string[];
  sourceLocale: string;
  targetLocales: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  assignedTo?: string;
  dueDate?: Date;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Locale coverage stats.
 */
export interface LocaleCoverage {
  locale: string;
  totalContent: number;
  translated: number;
  pending: number;
  outdated: number;
  coverage: number;
}

/**
 * Translation memory entry.
 */
export interface TranslationMemoryEntry {
  sourceText: string;
  sourceLocale: string;
  targetText: string;
  targetLocale: string;
  context?: string;
  usageCount: number;
  lastUsed: Date;
}
