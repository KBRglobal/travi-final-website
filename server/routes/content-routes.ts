/**
 * Content Routes (unique routes only)
 *
 * CRUD and public content routes are handled by:
 *   - content-crud-routes.ts  (GET/POST/PATCH/DELETE /api/contents, versions, translations)
 *   - public-content-routes.ts (GET /api/public/contents, destinations, homepage-sections, etc.)
 *
 * This file contains only routes NOT covered by those modules:
 *   - GET /api/public/content/:slug/:locale (translated content by locale)
 *   - GET /api/public/content/:slug/translations (available translations/hreflang)
 *   - GET /api/public/homepage-config (unified homepage config with i18n)
 *   - GET /api/locales (supported locales list)
 */

import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { log } from "../lib/logger";
import { eq, and, desc } from "drizzle-orm";
import {
  SUPPORTED_LOCALES,
  contents,
  destinations,
  homepageSections,
  homepageCards,
  experienceCategories,
  regionLinks,
  heroSlides,
  homepageCta,
  homepageSeoMeta,
} from "@shared/schema";
import { getTranslations, getBulkTranslations } from "../cms-translations";
import { makeRenderSafeHomepageConfig } from "../lib/homepage-fallbacks";

// Base URL for canonical and hreflang URLs
const BASE_URL = process.env.APP_URL || "https://travi.world";

// Helper to strip sensitive fields for public access
function sanitizeContentForPublic(content: any) {
  if (!content) return content;
  const { affiliateLinks, translations, author, ...publicContent } = content;
  if (author) {
    publicContent.author = {
      firstName: author.firstName,
      lastName: author.lastName,
    };
  }
  return publicContent;
}

// Generate hreflang links for SEO across all 17 supported languages
function generateHreflangLinks(
  slug: string,
  contentType: string
): Array<{ locale: string; hreflang: string; url: string }> {
  const typePath = getContentTypePath(contentType);
  const basePath = `${typePath}/${slug}`;

  const links: Array<{ locale: string; hreflang: string; url: string }> = [];

  for (const localeConfig of SUPPORTED_LOCALES) {
    const locale = localeConfig.code;
    const url = locale === "en" ? `${BASE_URL}${basePath}` : `${BASE_URL}/${locale}${basePath}`;

    links.push({ locale, hreflang: locale, url });
  }

  // Add x-default pointing to English version (SEO requirement)
  links.push({
    locale: "x-default",
    hreflang: "x-default",
    url: `${BASE_URL}${basePath}`,
  });

  return links;
}

// Get URL path prefix for content type
function getContentTypePath(type: string): string {
  const paths: Record<string, string> = {
    attraction: "/attraction",
    hotel: "/hotel",
    article: "/article",
    dining: "/dining",
    district: "/district",
    transport: "/transport",
    event: "/event",
    itinerary: "/itinerary",
    landing_page: "/guide",
    case_study: "/case-study",
    off_plan: "/property",
  };
  return paths[type] || "/content";
}

export function registerContentRoutes(app: Express): void {
  // Get translated content by slug and locale - SEO-optimized for 17 languages
  app.get("/api/public/content/:slug/:locale", async (req, res) => {
    try {
      const { slug, locale } = req.params;

      // Validate locale
      const validLocales = SUPPORTED_LOCALES.map(l => l.code);
      if (!validLocales.includes(locale as any)) {
        return res.status(400).json({ error: "Invalid locale", validLocales });
      }

      // Get base content
      const content = await storage.getContentBySlug(slug);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      if (content.status !== "published") {
        return res.status(404).json({ error: "Content not published" });
      }

      // If English, return original content
      if (locale === "en") {
        const sanitized = sanitizeContentForPublic(content);
        return res.json({
          ...sanitized,
          locale: "en",
          isTranslated: false,
          hreflang: generateHreflangLinks(content.slug, content.type),
        });
      }

      // Get translation for the specified locale
      const translation = await storage.getTranslation(content.id, locale as any);

      if (translation?.status !== "completed") {
        const typePath = getContentTypePath(content.type);
        return res.status(404).json({
          error: "Translation not available",
          requestedLocale: locale,
          translationStatus: translation?.status || "not_available",
          fallbackAvailable: true,
          fallbackLocale: "en",
          fallbackUrl: `${BASE_URL}${typePath}/${slug}`,
          hreflang: generateHreflangLinks(content.slug, content.type),
        });
      }

      // Merge translated fields with original content
      const sanitized = sanitizeContentForPublic(content);
      const translatedContent = {
        ...sanitized,
        title: translation.title || content.title,
        metaTitle: translation.metaTitle || content.metaTitle,
        metaDescription: translation.metaDescription || content.metaDescription,
        blocks: translation.blocks || content.blocks,
        answerCapsule: translation.answerCapsule,
        locale,
        isTranslated: true,
        translatedAt: translation.updatedAt,
        translationProvider: translation.translationProvider,
        hreflang: generateHreflangLinks(content.slug, content.type),
      };

      res.json(translatedContent);
    } catch {
      res.status(500).json({ error: "Failed to fetch translated content" });
    }
  });

  // Get all available translations for content - for hreflang generation
  app.get("/api/public/content/:slug/translations", async (req, res) => {
    try {
      const { slug } = req.params;

      const content = await storage.getContentBySlug(slug);
      if (content?.status !== "published") {
        return res.status(404).json({ error: "Content not found" });
      }

      const allTranslations = await storage.getTranslationsByContentId(content.id);
      const completedTranslations = allTranslations.filter(t => t.status === "completed");

      const availableLocales = [
        { code: "en", name: "English", isDefault: true },
        ...completedTranslations.map(t => ({
          code: t.locale,
          name: SUPPORTED_LOCALES.find(l => l.code === t.locale)?.name || t.locale,
          isDefault: false,
          translatedAt: t.updatedAt,
        })),
      ];

      res.json({
        contentId: content.id,
        slug: content.slug,
        availableLocales,
        hreflang: generateHreflangLinks(content.slug, content.type),
      });
    } catch {
      res.status(500).json({ error: "Failed to fetch translations" });
    }
  });

  // Unified Homepage Config API
  app.get("/api/public/homepage-config", async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";

      const [
        sectionsData,
        heroSlidesData,
        cardsData,
        experienceCategoriesData,
        regionLinksData,
        ctaData,
        seoMetaData,
        featuredDestinations,
        featuredArticles,
      ] = await Promise.all([
        db.select().from(homepageSections).orderBy(homepageSections.sortOrder),
        db
          .select()
          .from(heroSlides)
          .where(eq(heroSlides.isActive, true))
          .orderBy(heroSlides.sortOrder),
        db
          .select()
          .from(homepageCards)
          .where(eq(homepageCards.isActive, true))
          .orderBy(homepageCards.sortOrder),
        db
          .select()
          .from(experienceCategories)
          .where(eq(experienceCategories.isActive, true))
          .orderBy(experienceCategories.sortOrder),
        db
          .select()
          .from(regionLinks)
          .where(eq(regionLinks.isActive, true))
          .orderBy(regionLinks.sortOrder),
        db.select().from(homepageCta).limit(1),
        db.select().from(homepageSeoMeta).limit(1),
        db
          .select({
            id: destinations.id,
            name: destinations.name,
            country: destinations.country,
            slug: destinations.slug,
            cardImage: destinations.cardImage,
            cardImageAlt: destinations.cardImageAlt,
            summary: destinations.summary,
          })
          .from(destinations)
          .where(eq(destinations.isActive, true))
          .orderBy(destinations.name),
        db
          .select({
            id: contents.id,
            title: contents.title,
            slug: contents.slug,
            cardImage: contents.cardImage,
            cardImageAlt: contents.cardImageAlt,
            summary: contents.summary,
            publishedAt: contents.publishedAt,
          })
          .from(contents)
          .where(and(eq(contents.type, "article"), eq(contents.status, "published")))
          .orderBy(desc(contents.publishedAt))
          .limit(6),
      ]);

      const [
        sectionTranslations,
        heroSlideTranslations,
        cardTranslations,
        experienceTranslations,
        regionTranslations,
        ctaTranslations,
        seoMetaTranslations,
      ] = await Promise.all([
        getBulkTranslations(
          "homepage_section",
          sectionsData.map(s => s.id),
          locale
        ),
        getBulkTranslations(
          "hero_slide",
          heroSlidesData.map(s => s.id),
          locale
        ),
        getBulkTranslations(
          "homepage_card",
          cardsData.map(c => c.id),
          locale
        ),
        getBulkTranslations(
          "experience_category",
          experienceCategoriesData.map(e => e.id),
          locale
        ),
        getBulkTranslations(
          "region_link",
          regionLinksData.map(r => r.id),
          locale
        ),
        ctaData[0] ? getTranslations("homepage_cta", ctaData[0].id, locale) : Promise.resolve({}),
        seoMetaData[0]
          ? getTranslations("homepage_seo_meta", seoMetaData[0].id, locale)
          : Promise.resolve({}),
      ]);

      const translatedSections = sectionsData.map(section => {
        const trans = sectionTranslations.get(String(section.id)) || {};
        return {
          ...section,
          title: trans.title ?? section.title,
          subtitle: trans.subtitle ?? section.subtitle,
        };
      });

      const translatedHeroSlides = heroSlidesData.map(slide => {
        const trans = heroSlideTranslations.get(String(slide.id)) || {};
        return {
          ...slide,
          headline: trans.headline ?? slide.headline,
          subheadline: trans.subheadline ?? slide.subheadline,
          ctaText: trans.ctaText ?? slide.ctaText,
        };
      });

      const translatedCards = cardsData.map(card => {
        const trans = cardTranslations.get(String(card.id)) || {};
        return {
          ...card,
          title: trans.title ?? card.title,
          subtitle: trans.subtitle ?? card.subtitle,
        };
      });

      const translatedExperiences = experienceCategoriesData.map(exp => {
        const trans = experienceTranslations.get(String(exp.id)) || {};
        return {
          ...exp,
          name: trans.name ?? exp.name,
          description: trans.description ?? exp.description,
        };
      });

      const translatedRegions = regionLinksData.map(region => {
        const trans = regionTranslations.get(String(region.id)) || {};
        return {
          ...region,
          name: trans.name ?? region.name,
        };
      });

      const ctaTrans = ctaTranslations as Record<string, string | null>;
      const translatedCta = ctaData[0]
        ? {
            ...ctaData[0],
            headline: ctaTrans.headline ?? ctaData[0].headline,
            subheadline: ctaTrans.subheadline ?? ctaData[0].subheadline,
            buttonText: ctaTrans.buttonText ?? ctaData[0].buttonText,
            helperText: ctaTrans.helperText ?? ctaData[0].helperText,
            inputPlaceholder: ctaTrans.inputPlaceholder ?? ctaData[0].inputPlaceholder,
          }
        : null;

      const seoTrans = seoMetaTranslations as Record<string, string | null>;
      const translatedSeoMeta = seoMetaData[0]
        ? {
            ...seoMetaData[0],
            metaTitle: seoTrans.metaTitle ?? seoMetaData[0].metaTitle,
            metaDescription: seoTrans.metaDescription ?? seoMetaData[0].metaDescription,
            ogTitle: seoTrans.ogTitle ?? seoMetaData[0].ogTitle,
            ogDescription: seoTrans.ogDescription ?? seoMetaData[0].ogDescription,
          }
        : null;

      const sectionsMap = translatedSections.reduce(
        (acc, section) => {
          acc[section.sectionKey] = section;
          return acc;
        },
        {} as Record<string, (typeof translatedSections)[0]>
      );

      const rawConfig = {
        locale,
        sections: sectionsMap,
        sectionsList: translatedSections,
        hero: {
          slides: translatedHeroSlides,
        },
        quickCategories: translatedCards,
        experienceCategories: translatedExperiences,
        regionLinks: translatedRegions,
        cta: translatedCta,
        seoMeta: translatedSeoMeta,
        featuredDestinations,
        featuredArticles,
      };

      const renderSafeConfig = makeRenderSafeHomepageConfig(rawConfig);
      res.json(renderSafeConfig);
    } catch (error) {
      log.error("[homepage-config] Error:", error);

      const fallbackConfig = {
        locale: "en",
        sections: {},
        sectionsList: [],
        hero: { slides: [] },
        quickCategories: [],
        experienceCategories: [],
        regionLinks: [],
        cta: null,
        seoMeta: null,
        featuredDestinations: [],
        featuredArticles: [],
      };
      res.json(fallbackConfig);
    }
  });

  // Localization routes
  app.get("/api/locales", (_req, res) => {
    res.json(SUPPORTED_LOCALES);
  });
}
