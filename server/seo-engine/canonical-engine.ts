/**
 * Canonical Engine - Unified Canonical URL Management
 *
 * Ensures consistent canonical URLs across all content:
 * - Generates canonical URLs
 * - Manages alternate language URLs (hreflang)
 * - Handles canonical relationships between content
 * - Detects and resolves canonical conflicts
 */

import { db } from '../db';
import { contents, translations } from '../../shared/schema';
import { eq, and, ne } from 'drizzle-orm';
import {
  SEOEngineConfig,
  CanonicalResult,
  AlternateLink,
  ContentType,
} from './types';

export class CanonicalEngine {
  private config: SEOEngineConfig;

  // RTL locales
  private static RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];

  // Locale to hreflang mapping
  private static LOCALE_MAP: Record<string, string> = {
    en: 'en',
    ar: 'ar',
    zh: 'zh-Hans',
    hi: 'hi',
    ru: 'ru',
    de: 'de',
    fr: 'fr',
    ja: 'ja',
    ko: 'ko',
    pt: 'pt',
    es: 'es',
    it: 'it',
    nl: 'nl',
    tr: 'tr',
    fa: 'fa',
    ur: 'ur',
    he: 'he',
  };

  constructor(config: SEOEngineConfig) {
    this.config = config;
  }

  /**
   * Get canonical URL for content
   */
  async getCanonicalUrl(
    contentId: string,
    locale?: string
  ): Promise<CanonicalResult> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    // Check if this content has a canonical source (is a duplicate)
    const isCanonicalContent = !content.canonicalContentId || content.canonicalContentId === content.id;
    let canonicalSource: string | undefined;

    if (!isCanonicalContent && content.canonicalContentId) {
      const canonicalContent = await db.query.contents.findFirst({
        where: eq(contents.id, content.canonicalContentId),
      });
      if (canonicalContent) {
        canonicalSource = this.buildUrl(canonicalContent.type, canonicalContent.slug, locale);
      }
    }

    // Build canonical URL
    const canonical = canonicalSource || this.buildUrl(content.type, content.slug, locale);

    // Build alternate links for all available translations
    const alternates = await this.buildAlternateLinks(content, locale);

    return {
      canonical,
      alternates,
      isCanonicalContent,
      canonicalSource,
    };
  }

  /**
   * Build URL for content
   */
  buildUrl(type: string, slug: string, locale?: string): string {
    const basePath = this.getBasePath(type as ContentType);
    const path = `${basePath}/${slug}`;

    // English is default, no locale prefix
    if (!locale || locale === 'en') {
      return `${this.config.baseUrl}${path}`;
    }

    return `${this.config.baseUrl}/${locale}${path}`;
  }

  /**
   * Get base path for content type
   */
  private getBasePath(type: ContentType): string {
    const paths: Record<ContentType, string> = {
      attraction: '/attraction',
      hotel: '/hotel',
      article: '/article',
      dining: '/dining',
      district: '/district',
      transport: '/transport',
      event: '/event',
      itinerary: '/itinerary',
      landing_page: '/guide',
      case_study: '/case-study',
      off_plan: '/property',
    };
    return paths[type] || `/${type}`;
  }

  /**
   * Build alternate links (hreflang)
   */
  private async buildAlternateLinks(
    content: any,
    currentLocale?: string
  ): Promise<AlternateLink[]> {
    const alternates: AlternateLink[] = [];
    const basePath = this.getBasePath(content.type as ContentType);
    const path = `${basePath}/${content.slug}`;

    // Always add x-default pointing to English version
    alternates.push({
      hreflang: 'x-default',
      href: `${this.config.baseUrl}${path}`,
    });

    // Add English version
    alternates.push({
      hreflang: 'en',
      href: `${this.config.baseUrl}${path}`,
    });

    // Get available translations
    const contentTranslations = await db.query.translations.findMany({
      where: and(
        eq(translations.contentId, content.id),
        eq(translations.status, 'completed')
      ),
    });

    // Add alternate links for each completed translation
    for (const translation of contentTranslations) {
      const hreflang = CanonicalEngine.LOCALE_MAP[translation.locale] || translation.locale;
      alternates.push({
        hreflang,
        href: `${this.config.baseUrl}/${translation.locale}${path}`,
      });
    }

    // Also add supported locales that might not have translations yet
    // (for future-proofing and proper hreflang setup)
    for (const locale of this.config.supportedLocales) {
      if (locale === 'en') continue;

      const exists = alternates.some(
        (alt) => alt.hreflang === (CanonicalEngine.LOCALE_MAP[locale] || locale)
      );

      if (!exists) {
        // Check if translation exists
        const hasTranslation = contentTranslations.some(
          (t) => t.locale === locale
        );

        if (hasTranslation) {
          alternates.push({
            hreflang: CanonicalEngine.LOCALE_MAP[locale] || locale,
            href: `${this.config.baseUrl}/${locale}${path}`,
          });
        }
      }
    }

    return alternates;
  }

  /**
   * Generate canonical meta tag HTML
   */
  generateCanonicalTag(url: string): string {
    return `<link rel="canonical" href="${this.escapeHtml(url)}">`;
  }

  /**
   * Generate hreflang meta tags HTML
   */
  generateHreflangTags(alternates: AlternateLink[]): string {
    return alternates
      .map(
        (alt) =>
          `<link rel="alternate" hreflang="${alt.hreflang}" href="${this.escapeHtml(alt.href)}">`
      )
      .join('\n');
  }

  /**
   * Check for duplicate content across the site
   */
  async findDuplicates(contentId: string): Promise<{
    hasDuplicates: boolean;
    duplicates: Array<{ id: string; title: string; slug: string; similarity: number }>;
  }> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      return { hasDuplicates: false, duplicates: [] };
    }

    // Find content with same type and similar title
    const similarContent = await db.query.contents.findMany({
      where: and(
        eq(contents.type, content.type),
        ne(contents.id, contentId),
        eq(contents.status, 'published')
      ),
    });

    const duplicates: Array<{
      id: string;
      title: string;
      slug: string;
      similarity: number;
    }> = [];

    for (const other of similarContent) {
      const similarity = this.calculateSimilarity(content.title, other.title);
      if (similarity > 0.7) {
        duplicates.push({
          id: other.id,
          title: other.title,
          slug: other.slug,
          similarity: Math.round(similarity * 100),
        });
      }
    }

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates.sort((a, b) => b.similarity - a.similarity),
    };
  }

  /**
   * Set canonical relationship between content
   */
  async setCanonicalSource(
    contentId: string,
    canonicalContentId: string
  ): Promise<boolean> {
    try {
      await db
        .update(contents)
        .set({
          canonicalContentId,
          updatedAt: new Date(),
        } as any)
        .where(eq(contents.id, contentId));

      return true;
    } catch (error) {
      console.error('Failed to set canonical source:', error);
      return false;
    }
  }

  /**
   * Remove canonical relationship
   */
  async removeCanonicalSource(contentId: string): Promise<boolean> {
    try {
      await db
        .update(contents)
        .set({
          canonicalContentId: null,
          updatedAt: new Date(),
        } as any)
        .where(eq(contents.id, contentId));

      return true;
    } catch (error) {
      console.error('Failed to remove canonical source:', error);
      return false;
    }
  }

  /**
   * Validate canonical setup for content
   */
  async validateCanonical(contentId: string): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      return { isValid: false, issues: ['Content not found'], suggestions: [] };
    }

    // Check if canonical points to existing content
    if (content.canonicalContentId) {
      const canonicalContent = await db.query.contents.findFirst({
        where: eq(contents.id, content.canonicalContentId),
      });

      if (!canonicalContent) {
        issues.push('Canonical points to non-existent content');
      } else if (canonicalContent.status !== 'published') {
        issues.push('Canonical points to unpublished content');
      }
    }

    // Check for circular canonical references
    if (content.canonicalContentId) {
      const circular = await this.hasCircularCanonical(contentId);
      if (circular) {
        issues.push('Circular canonical reference detected');
      }
    }

    // Check for duplicate content without canonical
    const { hasDuplicates, duplicates } = await this.findDuplicates(contentId);
    if (hasDuplicates && !content.canonicalContentId) {
      suggestions.push(
        `Found ${duplicates.length} similar content items. Consider setting a canonical relationship.`
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Check for circular canonical references
   */
  private async hasCircularCanonical(
    contentId: string,
    visited: Set<string> = new Set()
  ): Promise<boolean> {
    if (visited.has(contentId)) {
      return true;
    }

    visited.add(contentId);

    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content?.canonicalContentId) {
      return false;
    }

    return this.hasCircularCanonical(content.canonicalContentId, visited);
  }

  /**
   * Calculate string similarity (Jaccard index)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
  }
}
