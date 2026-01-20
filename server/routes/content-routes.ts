import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { db } from "../db";
import { eq, and, desc, notIlike } from "drizzle-orm";
import {
  insertContentSchema,
  SUPPORTED_LOCALES,
  ROLE_PERMISSIONS,
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
import {
  requireAuth,
  requirePermission,
  requireOwnContentOrPermission,
  checkReadOnlyMode,
  rateLimiters,
} from "../security";
import {
  checkOptimisticLock,
} from "../middleware/optimistic-locking";
import {
  requireOwnershipOrPermission,
} from "../middleware/idor-protection";
import {
  getTranslations,
  getBulkTranslations,
} from "../cms-translations";
import { sanitizeContentBlocks } from "../lib/sanitize-ai-output";
import { makeRenderSafeHomepageConfig } from "../lib/homepage-fallbacks";
import {
  guardManualPublish,
  isPublishGuardsEnabled,
} from "../publishing";
import { emitContentPublished, emitContentUpdated } from "../events";
import { enterprise } from "../enterprise";
import * as fs from "fs";
import * as path from "path";

// Base URL for canonical and hreflang URLs
const BASE_URL = process.env.APP_URL || "https://travi.world";

// Helper to strip sensitive fields for public access
function sanitizeContentForPublic(content: any) {
  if (!content) return content;
  const { affiliateLinks, translations, author, ...publicContent } = content;
  if (author) {
    publicContent.author = {
      firstName: author.firstName,
      lastName: author.lastName
    };
  }
  return publicContent;
}

// Generate hreflang links for SEO across all 17 supported languages
function generateHreflangLinks(slug: string, contentType: string): Array<{ locale: string; hreflang: string; url: string }> {
  const typePath = getContentTypePath(contentType);
  const basePath = `${typePath}/${slug}`;
  
  const links: Array<{ locale: string; hreflang: string; url: string }> = [];
  
  // First add all language-specific hreflang tags
  for (const localeConfig of SUPPORTED_LOCALES) {
    const locale = localeConfig.code;
    const url = locale === "en" 
      ? `${BASE_URL}${basePath}`
      : `${BASE_URL}/${locale}${basePath}`;
    
    links.push({ locale, hreflang: locale, url });
  }
  
  // Add x-default pointing to English version (SEO requirement)
  links.push({ 
    locale: "x-default", 
    hreflang: "x-default", 
    url: `${BASE_URL}${basePath}` 
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

// Audit logging helper
async function logAuditEvent(
  req: Request,
  actionType: string,
  entityType: string,
  entityId: string | null,
  description: string,
  beforeState?: Record<string, unknown>,
  afterState?: Record<string, unknown>
) {
  try {
    const user = (req as any).user;
    const userId = user?.claims?.sub;
    let userName = null;
    let userRole = null;

    if (userId) {
      const dbUser = await storage.getUser(userId);
      userName = dbUser ? `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || dbUser.email : null;
      userRole = dbUser?.role || null;
    }

    await storage.createAuditLog({
      userId: userId || null,
      userName,
      userRole,
      actionType: actionType as any,
      entityType: entityType as any,
      entityId,
      description,
      beforeState,
      afterState,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export function registerContentRoutes(app: Express): void {
  // Admin/CMS content list - requires authentication
  app.get("/api/contents", requireAuth, async (req, res) => {
    try {
      const { type, status, search } = req.query;
      const filters = {
        type: type as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
      };

      const contents = await storage.getContentsWithRelations(filters);
      res.json(contents);
    } catch (error) {
      console.error("Error fetching contents:", error);
      res.status(500).json({ error: "Failed to fetch contents" });
    }
  });

  // Content needing attention for dashboard
  app.get("/api/contents/attention", requireAuth, async (req, res) => {
    try {
      const contents = await storage.getContentsWithRelations({});
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const lowSeo = contents.filter(c =>
        c.status === "published" && (c.seoScore === null || c.seoScore === undefined || c.seoScore < 70)
      ).slice(0, 10);

      const noViews = contents.filter(c =>
        c.status === "published" && (!c.viewCount || c.viewCount < 10)
      ).slice(0, 10);

      const scheduledToday = contents.filter(c =>
        c.status === "scheduled" &&
        c.scheduledAt &&
        new Date(c.scheduledAt) >= todayStart &&
        new Date(c.scheduledAt) < todayEnd
      );

      res.json({ lowSeo, noViews, scheduledToday });
    } catch (error) {
      console.error("Error fetching attention items:", error);
      res.status(500).json({ error: "Failed to fetch attention items" });
    }
  });

  // Get content by ID
  app.get("/api/contents/:id", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContent(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Get content by slug
  app.get("/api/contents/slug/:slug", async (req, res) => {
    try {
      const content = await storage.getContentBySlug(req.params.slug);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      if (content.status === "published") {
        return res.json(content);
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Authentication required for unpublished content" });
      }

      res.json(content);
    } catch (error) {
      console.error("Error fetching content by slug:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

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
      
      if (!translation || translation.status !== "completed") {
        // Return 404 for unavailable translations - prevents caching/indexing of untranslated pages
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
    } catch (error) {
      console.error("Error fetching translated content:", error);
      res.status(500).json({ error: "Failed to fetch translated content" });
    }
  });

  // Get all available translations for content - for hreflang generation
  app.get("/api/public/content/:slug/translations", async (req, res) => {
    try {
      const { slug } = req.params;
      
      const content = await storage.getContentBySlug(slug);
      if (!content || content.status !== "published") {
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
        }))
      ];

      res.json({
        contentId: content.id,
        slug: content.slug,
        availableLocales,
        hreflang: generateHreflangLinks(content.slug, content.type),
      });
    } catch (error) {
      console.error("Error fetching content translations:", error);
      res.status(500).json({ error: "Failed to fetch translations" });
    }
  });

  // Generate JSON-LD schema for content
  app.get("/api/contents/:id/schema", async (req, res) => {
    try {
      const content = await storage.getContent(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      const { generateAllSchemas, schemasToJsonLd } = await import("../lib/schema-generator");

      let typeData: Record<string, unknown> = {};
      let authorName: string | undefined;

      if (content.type === "attraction" && content.attraction) {
        typeData = content.attraction;
      } else if (content.type === "hotel" && content.hotel) {
        typeData = content.hotel;
      } else if (content.type === "article" && content.article) {
        typeData = content.article;
      } else if (content.type === "event" && content.event) {
        typeData = content.event;
      } else if (content.type === "dining" && content.dining) {
        typeData = content.dining;
      } else if (content.type === "district" && content.district) {
        typeData = content.district;
      } else if (content.type === "transport" && content.transport) {
        typeData = content.transport;
      } else if (content.type === "itinerary" && content.itinerary) {
        typeData = content.itinerary;
      }

      if (content.authorId) {
        const author = await storage.getUser(content.authorId);
        if (author) {
          authorName = [author.firstName, author.lastName].filter(Boolean).join(" ") || author.username || undefined;
        }
      }

      const schemas = generateAllSchemas(content, typeData as any, authorName);
      const jsonLd = schemasToJsonLd(schemas);

      res.json({
        schemas,
        jsonLd,
        htmlEmbed: `<script type="application/ld+json">\n${jsonLd}\n</script>`
      });
    } catch (error) {
      console.error("Error generating schema:", error);
      res.status(500).json({ error: "Failed to generate schema" });
    }
  });

  // Public API for published content only
  app.get("/api/public/contents", async (req, res) => {
    try {
      const { type, search, limit } = req.query;
      const filters = {
        type: type as string | undefined,
        status: "published",
        search: search as string | undefined,
      };

      const contents = await storage.getContentsWithRelations(filters);
      const maxLimit = Math.min(parseInt(limit as string) || 50, 100);
      const sanitizedContents = contents.slice(0, maxLimit).map(sanitizeContentForPublic);
      res.json(sanitizedContents);
    } catch (error) {
      console.error("Error fetching public contents:", error);
      res.status(500).json({ error: "Failed to fetch contents" });
    }
  });

  // Public API for destinations - DATABASE IS SINGLE SOURCE OF TRUTH
  // NO static fallbacks, NO limits - returns ALL active destinations with mood fields
  // Filter out test destinations from public API
  app.get("/api/public/destinations", async (req, res) => {
    try {
      // Fetch ALL active destinations from database with mood/hero fields
      // Exclude test destinations from public API responses
      const allDestinations = await db
        .select({
          id: destinations.id,
          name: destinations.name,
          country: destinations.country,
          slug: destinations.slug,
          destinationLevel: destinations.destinationLevel,
          cardImage: destinations.cardImage,
          cardImageAlt: destinations.cardImageAlt,
          summary: destinations.summary,
          heroImage: destinations.heroImage,
          heroImageAlt: destinations.heroImageAlt,
          moodVibe: destinations.moodVibe,
          moodTagline: destinations.moodTagline,
          moodPrimaryColor: destinations.moodPrimaryColor,
        })
        .from(destinations)
        .where(and(
          eq(destinations.isActive, true),
          notIlike(destinations.name, '%test%')
        ))
        .orderBy(destinations.name);

      res.json(allDestinations);
    } catch (error) {
      console.error("Error fetching public destinations:", error);
      res.status(500).json({ error: "Failed to fetch destinations" });
    }
  });

  // Public API for homepage sections
  app.get("/api/public/homepage-sections", async (req, res) => {
    try {
      const sections = await db
        .select()
        .from(homepageSections)
        .where(eq(homepageSections.isVisible, true))
        .orderBy(homepageSections.sortOrder);

      res.json(sections);
    } catch (error) {
      console.error("Error fetching homepage sections:", error);
      res.status(500).json({ error: "Failed to fetch homepage sections" });
    }
  });

  // Public API for homepage category cards
  app.get("/api/public/homepage-cards", async (req, res) => {
    try {
      const cards = await db
        .select()
        .from(homepageCards)
        .where(eq(homepageCards.isActive, true))
        .orderBy(homepageCards.sortOrder);

      res.json(cards);
    } catch (error) {
      console.error("Error fetching homepage cards:", error);
      res.status(500).json({ error: "Failed to fetch homepage cards" });
    }
  });

  // Public API for experience categories
  app.get("/api/public/experience-categories", async (req, res) => {
    try {
      const categories = await db
        .select()
        .from(experienceCategories)
        .where(eq(experienceCategories.isActive, true))
        .orderBy(experienceCategories.sortOrder);

      res.json(categories);
    } catch (error) {
      console.error("Error fetching experience categories:", error);
      res.status(500).json({ error: "Failed to fetch experience categories" });
    }
  });

  // Public API for region links
  app.get("/api/public/region-links", async (req, res) => {
    try {
      const regions = await db
        .select()
        .from(regionLinks)
        .where(eq(regionLinks.isActive, true))
        .orderBy(regionLinks.sortOrder);

      res.json(regions);
    } catch (error) {
      console.error("Error fetching region links:", error);
      res.status(500).json({ error: "Failed to fetch region links" });
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
        featuredArticles
      ] = await Promise.all([
        db.select().from(homepageSections).orderBy(homepageSections.sortOrder),
        db.select().from(heroSlides).where(eq(heroSlides.isActive, true)).orderBy(heroSlides.sortOrder),
        db.select().from(homepageCards).where(eq(homepageCards.isActive, true)).orderBy(homepageCards.sortOrder),
        db.select().from(experienceCategories).where(eq(experienceCategories.isActive, true)).orderBy(experienceCategories.sortOrder),
        db.select().from(regionLinks).where(eq(regionLinks.isActive, true)).orderBy(regionLinks.sortOrder),
        db.select().from(homepageCta).limit(1),
        db.select().from(homepageSeoMeta).limit(1),
        db.select({
          id: destinations.id,
          name: destinations.name,
          country: destinations.country,
          slug: destinations.slug,
          cardImage: destinations.cardImage,
          cardImageAlt: destinations.cardImageAlt,
          summary: destinations.summary,
        }).from(destinations).where(eq(destinations.isActive, true)).orderBy(destinations.name),
        db.select({
          id: contents.id,
          title: contents.title,
          slug: contents.slug,
          cardImage: contents.cardImage,
          cardImageAlt: contents.cardImageAlt,
          summary: contents.summary,
          publishedAt: contents.publishedAt,
        }).from(contents).where(and(eq(contents.type, "article"), eq(contents.status, "published"))).orderBy(desc(contents.publishedAt)).limit(6),
      ]);

      const [
        sectionTranslations,
        heroSlideTranslations,
        cardTranslations,
        experienceTranslations,
        regionTranslations,
        ctaTranslations,
        seoMetaTranslations
      ] = await Promise.all([
        getBulkTranslations("homepage_section", sectionsData.map(s => s.id), locale),
        getBulkTranslations("hero_slide", heroSlidesData.map(s => s.id), locale),
        getBulkTranslations("homepage_card", cardsData.map(c => c.id), locale),
        getBulkTranslations("experience_category", experienceCategoriesData.map(e => e.id), locale),
        getBulkTranslations("region_link", regionLinksData.map(r => r.id), locale),
        ctaData[0] ? getTranslations("homepage_cta", ctaData[0].id, locale) : Promise.resolve({}),
        seoMetaData[0] ? getTranslations("homepage_seo_meta", seoMetaData[0].id, locale) : Promise.resolve({}),
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
      const translatedCta = ctaData[0] ? {
        ...ctaData[0],
        headline: ctaTrans.headline ?? ctaData[0].headline,
        subheadline: ctaTrans.subheadline ?? ctaData[0].subheadline,
        buttonText: ctaTrans.buttonText ?? ctaData[0].buttonText,
        helperText: ctaTrans.helperText ?? ctaData[0].helperText,
        inputPlaceholder: ctaTrans.inputPlaceholder ?? ctaData[0].inputPlaceholder,
      } : null;

      const seoTrans = seoMetaTranslations as Record<string, string | null>;
      const translatedSeoMeta = seoMetaData[0] ? {
        ...seoMetaData[0],
        metaTitle: seoTrans.metaTitle ?? seoMetaData[0].metaTitle,
        metaDescription: seoTrans.metaDescription ?? seoMetaData[0].metaDescription,
        ogTitle: seoTrans.ogTitle ?? seoMetaData[0].ogTitle,
        ogDescription: seoTrans.ogDescription ?? seoMetaData[0].ogDescription,
      } : null;

      const sectionsMap = translatedSections.reduce((acc, section) => {
        acc[section.sectionKey] = section;
        return acc;
      }, {} as Record<string, typeof translatedSections[0]>);

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
      console.error("Error fetching homepage config:", error);
      res.status(500).json({ error: "Failed to fetch homepage configuration" });
    }
  });

  // Content creation
  app.post("/api/contents", requirePermission("canCreate"), checkReadOnlyMode, rateLimiters.contentWrite, async (req, res) => {
    try {
      const parsed = insertContentSchema.parse(req.body) as any;

      if (parsed.blocks && Array.isArray(parsed.blocks)) {
        parsed.blocks = sanitizeContentBlocks(parsed.blocks);
      }

      if (!parsed.slug || parsed.slug.trim() === '') {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        parsed.slug = `draft-${parsed.type}-${timestamp}-${randomSuffix}`;
      }

      if (!parsed.title || parsed.title.trim() === '') {
        parsed.title = `Untitled ${parsed.type} Draft`;
      }

      const content = await storage.createContent(parsed);

      if (parsed.type === "attraction" && req.body.attraction) {
        await storage.createAttraction({ ...req.body.attraction, contentId: content.id });
      } else if (parsed.type === "hotel" && req.body.hotel) {
        await storage.createHotel({ ...req.body.hotel, contentId: content.id });
      } else if (parsed.type === "article" && req.body.article) {
        await storage.createArticle({ ...req.body.article, contentId: content.id });
      } else if (parsed.type === "event" && req.body.event) {
        await storage.createEvent({ ...req.body.event, contentId: content.id });
      } else if (parsed.type === "itinerary" && req.body.itinerary) {
        await storage.createItinerary({ ...req.body.itinerary, contentId: content.id });
      } else if (parsed.type === "dining" && req.body.dining) {
        await storage.createDining({ ...req.body.dining, contentId: content.id });
      } else if (parsed.type === "district" && req.body.district) {
        await storage.createDistrict({ ...req.body.district, contentId: content.id });
      } else if (parsed.type === "transport" && req.body.transport) {
        await storage.createTransport({ ...req.body.transport, contentId: content.id });
      }

      const fullContent = await storage.getContent(content.id);

      await logAuditEvent(req, "create", "content", content.id, `Created ${parsed.type}: ${parsed.title}`, undefined, { title: parsed.title, type: parsed.type, status: parsed.status || "draft" });

      enterprise.webhooks.trigger("content.created", {
        contentId: content.id,
        type: parsed.type,
        title: parsed.title,
        slug: parsed.slug,
        status: parsed.status || "draft",
        createdAt: new Date().toISOString(),
      }).catch(err => console.error("[Webhook] content.created trigger failed:", err));

      if (parsed.status === "published") {
        emitContentPublished(
          content.id,
          parsed.type,
          parsed.title,
          parsed.slug,
          'draft',
          'manual'
        );
      }

      res.status(201).json(fullContent);
    } catch (error) {
      console.error("Error creating content:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create content" });
    }
  });

  // Content update
  app.patch("/api/contents/:id", requireOwnContentOrPermission("canEdit"), checkOptimisticLock(), checkReadOnlyMode, rateLimiters.contentWrite, async (req, res) => {
    try {
      const existingContent = await storage.getContent(req.params.id);
      if (!existingContent) {
        return res.status(404).json({ error: "Content not found" });
      }

      const newStatus = req.body.status;
      const isPublishing = (newStatus === "published" || newStatus === "scheduled") &&
        existingContent.status !== "published" &&
        existingContent.status !== "scheduled";

      if (isPublishing) {
        const user = (req as any).user;
        const userId = user?.claims?.sub;
        const dbUser = userId ? await storage.getUser(userId) : null;
        const userRole = dbUser?.role || "viewer";
        const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];

        if (!permissions?.canPublish) {
          return res.status(403).json({
            error: "Permission denied: You do not have permission to publish content"
          });
        }
      }

      const latestVersion = await storage.getLatestVersionNumber(req.params.id);
      await storage.createContentVersion({
        contentId: req.params.id,
        versionNumber: latestVersion + 1,
        title: existingContent.title,
        slug: existingContent.slug,
        metaTitle: existingContent.metaTitle,
        metaDescription: existingContent.metaDescription,
        primaryKeyword: existingContent.primaryKeyword,
        heroImage: existingContent.heroImage,
        heroImageAlt: existingContent.heroImageAlt,
        blocks: existingContent.blocks || [],
        changedBy: req.body.changedBy || null,
        changeNote: req.body.changeNote || null,
      });

      const { attraction, hotel, article, event, itinerary, dining, district, transport, changedBy, changeNote, ...contentData } = req.body;

      if (contentData.publishedAt && typeof contentData.publishedAt === 'string') {
        contentData.publishedAt = new Date(contentData.publishedAt);
      }
      if (contentData.scheduledAt && typeof contentData.scheduledAt === 'string') {
        contentData.scheduledAt = new Date(contentData.scheduledAt);
      }

      if (contentData.status === "published" && existingContent.status !== "published") {
        if (isPublishGuardsEnabled()) {
          const guardResult = await guardManualPublish(req.params.id);
          if (!guardResult.success) {
            return res.status(422).json({
              error: "Publishing blocked by eligibility rules",
              message: guardResult.error,
              eligibility: guardResult.eligibility,
            });
          }
        }
      }

      if (contentData.status === "published" && existingContent.status !== "published" && !contentData.publishedAt) {
        contentData.publishedAt = new Date();
      }

      if (contentData.blocks && Array.isArray(contentData.blocks)) {
        contentData.blocks = sanitizeContentBlocks(contentData.blocks);
      }

      const updatedContent = await storage.updateContent(req.params.id, contentData);

      if (existingContent.type === "attraction" && attraction) {
        await storage.updateAttraction(req.params.id, attraction);
      } else if (existingContent.type === "hotel" && hotel) {
        await storage.updateHotel(req.params.id, hotel);
      } else if (existingContent.type === "article" && article) {
        await storage.updateArticle(req.params.id, article);
      } else if (existingContent.type === "event" && req.body.event) {
        await storage.updateEvent(req.params.id, req.body.event);
      } else if (existingContent.type === "itinerary" && itinerary) {
        await storage.updateItinerary(req.params.id, itinerary);
      } else if (existingContent.type === "dining" && dining) {
        await storage.updateDining(req.params.id, dining);
      } else if (existingContent.type === "district" && district) {
        await storage.updateDistrict(req.params.id, district);
      } else if (existingContent.type === "transport" && transport) {
        await storage.updateTransport(req.params.id, transport);
      }

      const fullContent = await storage.getContent(req.params.id);

      const actionType = req.body.status === "published" && existingContent.status !== "published" ? "publish" : "update";
      await logAuditEvent(req, actionType, "content", req.params.id,
        actionType === "publish" ? `Published: ${existingContent.title}` : `Updated: ${existingContent.title}`,
        { title: existingContent.title, status: existingContent.status },
        { title: fullContent?.title, status: fullContent?.status }
      );

      const webhookEvent = actionType === "publish" ? "content.published" : "content.updated";
      enterprise.webhooks.trigger(webhookEvent, {
        contentId: req.params.id,
        type: existingContent.type,
        title: fullContent?.title,
        slug: fullContent?.slug,
        status: fullContent?.status,
        previousStatus: existingContent.status,
        updatedAt: new Date().toISOString(),
      }).catch(err => console.error(`[Webhook] ${webhookEvent} trigger failed:`, err));

      if (actionType === "publish" && fullContent) {
        emitContentPublished(
          req.params.id,
          existingContent.type,
          fullContent.title,
          fullContent.slug,
          existingContent.status,
          'manual'
        );
      } else if (fullContent?.status === "published") {
        emitContentUpdated(
          req.params.id,
          existingContent.type,
          fullContent.title,
          fullContent.slug,
          fullContent.status
        );
      }

      res.json(fullContent);
    } catch (error) {
      console.error("Error updating content:", error);
      res.status(500).json({ error: "Failed to update content" });
    }
  });

  // Content deletion
  app.delete("/api/contents/:id", requireOwnershipOrPermission("canDelete"), checkReadOnlyMode, async (req, res) => {
    try {
      const existingContent = await storage.getContent(req.params.id);
      await storage.deleteContent(req.params.id);

      if (existingContent) {
        await logAuditEvent(req, "delete", "content", req.params.id, `Deleted: ${existingContent.title}`, { title: existingContent.title, type: existingContent.type });

        enterprise.webhooks.trigger("content.deleted", {
          contentId: req.params.id,
          type: existingContent.type,
          title: existingContent.title,
          slug: existingContent.slug,
          deletedAt: new Date().toISOString(),
        }).catch(err => console.error("[Webhook] content.deleted trigger failed:", err));
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ error: "Failed to delete content" });
    }
  });

  // Localization routes
  app.get("/api/locales", (req, res) => {
    res.json(SUPPORTED_LOCALES);
  });

  // NOTE: Additional content routes (translations, versions, bulk operations, etc.)
  // should be added here following the same pattern.
  // Due to the large size, key routes have been extracted.
  // Full migration requires extracting remaining routes from routes.ts.
}
