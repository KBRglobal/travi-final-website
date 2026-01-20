import type { Express, Request, Response } from "express";
import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { eq, and, desc, sql, ilike, or, not, notIlike } from "drizzle-orm";
import {
  destinations,
  homepageSections,
  homepageCards,
  experienceCategories,
  regionLinks,
  heroSlides,
  homepageCta,
  homepageSeoMeta,
  pageSeo,
  destinationsIndexConfig,
  contents,
  pageLayouts,
  tiqetsAttractions,
  SUPPORTED_LOCALES,
} from "@shared/schema";
import { makeRenderSafeHomepageConfig } from "../lib/homepage-fallbacks";
import { getTranslations, getBulkTranslations } from "../cms-translations";
import * as fs from "fs";
import * as path from "path";

const TIQETS_AFFILIATE_LINK = "https://tiqets.tpo.lu/k16k6RXU";

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

export function registerPublicApiRoutes(app: Express): void {
  const router = Router();

  // Public API for published content only (for public website)
  // Original: /api/public/contents (line ~5741)
  router.get("/contents", async (req, res) => {
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

  // Public API for destinations index hero carousel
  // Database-driven hero configuration for /destinations page
  router.get("/destinations-index/hero", async (req, res) => {
    try {
      const [config] = await db.select().from(destinationsIndexConfig).limit(1);
      
      // No config at all - return empty values per CMS contract (no fallbacks)
      if (!config) {
        return res.json({
          heroSlides: [],
          heroTitle: null,
          heroSubtitle: null,
          heroDescription: null,
          heroCTAText: null,
          heroCTALink: null,
        });
      }
      
      // Get active slides sorted by order (may be empty, that's OK)
      const heroSlidesArray = Array.isArray(config.heroSlides) ? config.heroSlides : [];
      const activeSlides = heroSlidesArray
        .filter((slide: any) => slide.isActive)
        .sort((a: any, b: any) => a.order - b.order);
      
      // Enrich slides with destination data
      const enrichedSlides = [];
      for (const slide of activeSlides) {
        const [destination] = await db
          .select({
            id: destinations.id,
            name: destinations.name,
            slug: destinations.slug,
            country: destinations.country,
          })
          .from(destinations)
          .where(eq(destinations.id, slide.destinationId))
          .limit(1);
        
        if (destination) {
          enrichedSlides.push({
            ...slide,
            destination,
          });
        }
      }
      
      // Return database values - no fallbacks per CMS contract
      res.json({
        heroSlides: enrichedSlides,
        heroTitle: config.heroTitle ?? null,
        heroSubtitle: config.heroSubtitle ?? null,
        heroDescription: config.heroDescription ?? null,
        heroCTAText: config.heroCTAText ?? null,
        heroCTALink: config.heroCTALink ?? null,
      });
    } catch (error) {
      console.error("Error fetching destinations index hero:", error);
      res.status(500).json({ error: "Failed to fetch destinations index hero" });
    }
  });

  // Public API for destinations (homepage discovery section)
  // Original: /api/public/destinations (line ~5762)
  router.get("/destinations", async (req, res) => {
    try {
      const { limit, level } = req.query;
      const maxLimit = Math.min(parseInt(limit as string) || 50, 50);

      console.log("[PublicAPI] Fetching destinations with notIlike filter for test");
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

  // Public API for single destination page data
  // Original: /api/public/destinations/:id (line ~6025)
  router.get("/destinations/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Query destination by ID with is_active check - NO HARDCODED WHITELIST
      // Database is single source of truth - any destination with is_active=true is accessible
      const [destination] = await db
        .select()
        .from(destinations)
        .where(and(eq(destinations.id, id), eq(destinations.isActive, true)))
        .limit(1);

      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // Dynamic folder mapping for hero images - use destination ID and common variations
      const possibleFolders = [
        id,
        `${id}/${id}`,
        id.replace(/-/g, ""),
        id.charAt(0).toUpperCase() + id.slice(1),
        `${id.charAt(0).toUpperCase() + id.slice(1)}/${id}`,
      ];
      let heroImages: Array<{ filename: string; url: string; alt: string; order: number }> = [];

      for (const folder of possibleFolders) {
        const heroPath = path.join(process.cwd(), "client", "public", "destinations-hero", folder);
        try {
          if (fs.existsSync(heroPath)) {
            const files = fs.readdirSync(heroPath);
            const imageFiles = files.filter(f =>
              f.endsWith(".webp") || f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".png")
            );

            if (imageFiles.length > 0) {
              heroImages = imageFiles.map((filename, index) => ({
                filename,
                url: `/destinations-hero/${folder}/${filename}`,
                alt: filename.replace(/\.[^/.]+$/, "").replace(/-/g, " ").replace(/_/g, " "),
                order: index,
              }));
              break;
            }
          }
        } catch (e) {
          // Folder doesn't exist or can't be read, continue to next
        }
      }

      // Return destination data with hero images and featured sections
      // ALL DATA FROM DATABASE - NO STATIC FALLBACKS
      res.json({
        id: destination.id,
        name: destination.name,
        country: destination.country,
        slug: destination.slug,
        summary: destination.summary,
        cardImage: destination.cardImage,
        cardImageAlt: destination.cardImageAlt,
        // Hero data from database - NO FALLBACKS (Railway PostgreSQL is source of truth)
        hero: {
          title: destination.heroTitle,
          subtitle: destination.heroSubtitle,
          ctaText: destination.heroCTAText,
          ctaLink: destination.heroCTALink,
          images: heroImages,
        },
        // SEO data from database - NO FALLBACKS (Railway PostgreSQL is source of truth)
        seo: {
          metaTitle: destination.metaTitle,
          metaDescription: destination.metaDescription,
          canonicalUrl: destination.canonicalUrl,
          ogImage: destination.ogImage,
          ogTitle: destination.ogTitle,
          ogDescription: destination.ogDescription,
        },
        // Featured sections from database
        featuredAttractions: destination.featuredAttractions || [],
        featuredAreas: destination.featuredAreas || [],
        featuredHighlights: destination.featuredHighlights || [],
        // Mood/vibe for styling - NO FALLBACKS (Railway PostgreSQL is source of truth)
        mood: {
          primaryColor: destination.moodPrimaryColor,
          gradientFrom: destination.moodGradientFrom,
          gradientTo: destination.moodGradientTo,
          vibe: destination.moodVibe,
          tagline: destination.moodTagline,
        },
      });
    } catch (error) {
      console.error("Error fetching destination:", error);
      res.status(500).json({ error: "Failed to fetch destination" });
    }
  });

  // Public API for homepage sections (CMS-driven)
  // Original: /api/public/homepage-sections (line ~5792)
  router.get("/homepage-sections", async (req, res) => {
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

  // Public API for homepage category cards (CMS-driven)
  // Original: /api/public/homepage-cards (line ~5808)
  router.get("/homepage-cards", async (req, res) => {
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

  // Public API for experience categories (travel styles)
  // Original: /api/public/experience-categories (line ~5824)
  router.get("/experience-categories", async (req, res) => {
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

  // Public API for region links (pre-footer SEO grid)
  // Original: /api/public/region-links (line ~5840)
  router.get("/region-links", async (req, res) => {
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

  // DEPRECATED: Migrated to Tiqets system
  // Original: /api/public/travi/locations (line ~5857)
  router.get("/travi/locations", async (req, res) => {
    res.json({
      message: "Deprecated - use Tiqets API",
      locations: [],
      migration: "This endpoint has been migrated to the Tiqets integration system"
    });
  });

  // DEPRECATED: Migrated to Tiqets system
  // Original: /api/public/travi/locations/:city/:slug (line ~5867)
  router.get("/travi/locations/:city/:slug", async (req, res) => {
    res.json({
      message: "Deprecated - use Tiqets API",
      migration: "This endpoint has been migrated to the Tiqets integration system"
    });
  });

  // Public API for attraction destinations with live counts from DB
  // Original: /api/public/attraction-destinations (line ~5877)
  router.get("/attraction-destinations", async (req, res) => {
    try {
      const cityCounts = await db
        .select({
          cityName: tiqetsAttractions.cityName,
          count: sql<number>`count(*)::int`,
        })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.status, "published"))
        .groupBy(tiqetsAttractions.cityName)
        .orderBy(sql`count(*) DESC`);

      const destinationMeta = await db
        .select({
          id: destinations.id,
          name: destinations.name,
          country: destinations.country,
          image: destinations.cardImage,
          summary: destinations.summary,
        })
        .from(destinations)
        .where(and(
          eq(destinations.isActive, true),
          notIlike(destinations.name, '%test%')
        ));

      const metaMap = new Map<string, typeof destinationMeta[0]>();
      for (const d of destinationMeta) {
        metaMap.set(d.id, d);
      }

      const cityCountryFallback: Record<string, string> = {
        "London": "United Kingdom",
        "Paris": "France",
        "Barcelona": "Spain",
        "Rome": "Italy",
        "Amsterdam": "Netherlands",
        "New York": "USA",
        "Dubai": "UAE",
        "Las Vegas": "USA",
        "Istanbul": "Turkey",
        "Miami": "United States",
        "Los Angeles": "United States",
        "Singapore": "Singapore",
        "Bangkok": "Thailand",
        "Abu Dhabi": "United Arab Emirates",
        "Tokyo": "Japan",
        "Hong Kong": "China",
      };

      const destinationsResult = cityCounts
        .filter(c => c.cityName)
        .map(c => {
          const slug = c.cityName!.toLowerCase().replace(/ /g, '-');
          const meta = metaMap.get(slug);
          return {
            slug,
            name: meta?.name || c.cityName!,
            country: meta?.country || cityCountryFallback[c.cityName!] || "Unknown",
            image: meta?.image || `/cards/${slug}.webp`,
            summary: meta?.summary || null,
            count: c.count,
          };
        });

      const total = destinationsResult.reduce((sum, d) => sum + d.count, 0);

      res.json({
        destinations: destinationsResult,
        total,
      });
    } catch (error: any) {
      console.error("Error fetching attraction destinations:", error);
      res.status(500).json({ error: "Failed to fetch attraction destinations" });
    }
  });

  // Public API for Tiqets attractions (powers public attractions page)
  // Original: /api/public/tiqets/attractions (line ~5958)
  router.get("/tiqets/attractions", async (req, res) => {
    try {
      const { city, search, limit = "50", offset = "0" } = req.query;
      const limitNum = parseInt(limit as string, 10) || 50;
      const offsetNum = parseInt(offset as string, 10) || 0;

      const conditions: any[] = [eq(tiqetsAttractions.status, "published")];

      if (city && typeof city === 'string') {
        conditions.push(ilike(tiqetsAttractions.cityName, city));
      }

      if (search && typeof search === 'string') {
        conditions.push(ilike(tiqetsAttractions.title, `%${search}%`));
      }

      const attractions = await db.select({
        id: tiqetsAttractions.id,
        tiqetsId: tiqetsAttractions.tiqetsId,
        title: tiqetsAttractions.title,
        slug: tiqetsAttractions.slug,
        seoSlug: tiqetsAttractions.seoSlug,
        cityName: tiqetsAttractions.cityName,
        venueName: tiqetsAttractions.venueName,
        duration: tiqetsAttractions.duration,
        productUrl: tiqetsAttractions.productUrl,
        status: tiqetsAttractions.status,
        tiqetsRating: tiqetsAttractions.tiqetsRating,
        tiqetsReviewCount: tiqetsAttractions.tiqetsReviewCount,
        primaryCategory: tiqetsAttractions.primaryCategory,
        tiqetsImages: tiqetsAttractions.tiqetsImages,
      })
      .from(tiqetsAttractions)
      .where(and(...conditions))
      .orderBy(tiqetsAttractions.title)
      .limit(limitNum)
      .offset(offsetNum);

      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(tiqetsAttractions)
        .where(and(...conditions));
      const totalCount = Number(countResult[0]?.count || 0);

      const citiesResult = await db
        .selectDistinct({ city: tiqetsAttractions.cityName })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.status, "published"))
        .orderBy(tiqetsAttractions.cityName);

      res.json({
        attractions,
        total: totalCount,
        cities: citiesResult.map(c => c.city),
      });
    } catch (error: any) {
      console.error("Error fetching tiqets attractions:", error);
      res.status(500).json({ error: "Failed to fetch attractions" });
    }
  });

  // Unified Homepage Config API
  // Original: /api/public/homepage-config (line ~6142)
  router.get("/homepage-config", async (req, res) => {
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
        db.select()
          .from(homepageSections)
          .orderBy(homepageSections.sortOrder),

        db.select()
          .from(heroSlides)
          .where(eq(heroSlides.isActive, true))
          .orderBy(heroSlides.sortOrder),

        db.select()
          .from(homepageCards)
          .where(eq(homepageCards.isActive, true))
          .orderBy(homepageCards.sortOrder),

        db.select()
          .from(experienceCategories)
          .where(eq(experienceCategories.isActive, true))
          .orderBy(experienceCategories.sortOrder),

        db.select()
          .from(regionLinks)
          .where(eq(regionLinks.isActive, true))
          .orderBy(regionLinks.sortOrder),

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
        })
          .from(destinations)
          .where(eq(destinations.isActive, true))
          .orderBy(destinations.name),

        db.select({
          id: contents.id,
          title: contents.title,
          slug: contents.slug,
          cardImage: contents.cardImage,
          cardImageAlt: contents.cardImageAlt,
          summary: contents.summary,
          publishedAt: contents.publishedAt,
        })
          .from(contents)
          .where(
            and(
              eq(contents.type, "article"),
              eq(contents.status, "published")
            )
          )
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

  // Get public translated content
  // Original: /api/public/content/:slug/:locale (line ~14632)
  router.get("/content/:slug/:locale", async (req, res) => {
    try {
      const { slug, locale } = req.params;

      const content = await storage.getContentBySlug(slug);
      if (!content || content.status !== "published") {
        return res.status(404).json({ error: "Content not found" });
      }

      if (locale === "en") {
        return res.json(content);
      }

      const translation = await storage.getTranslation(content.id, locale as any);
      if (!translation || translation.status !== "completed") {
        return res.json(content);
      }

      res.json({
        ...content,
        title: translation.title || content.title,
        metaTitle: translation.metaTitle || content.metaTitle,
        metaDescription: translation.metaDescription || content.metaDescription,
        blocks: translation.blocks || content.blocks,
        locale,
        isTranslated: true,
      });
    } catch (error) {
      console.error("Error fetching translated content:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Get published layout (for public viewing)
  // Original: /api/public/layouts/:slug (line ~14832)
  router.get("/layouts/:slug", async (req, res) => {
    try {
      const { slug } = req.params;

      const layout = await db
        .select({
          slug: pageLayouts.slug,
          title: pageLayouts.title,
          components: pageLayouts.components,
          publishedAt: pageLayouts.publishedAt,
        })
        .from(pageLayouts)
        .where(and(
          eq(pageLayouts.slug, slug),
          eq(pageLayouts.status, "published")
        ))
        .limit(1);

      if (layout.length === 0) {
        return res.status(404).json({ error: "Layout not found" });
      }

      res.json(layout[0]);
    } catch (error) {
      console.error("Error fetching public layout:", error);
      res.status(500).json({ error: "Failed to fetch layout" });
    }
  });

  // PUBLIC: Get survey by slug (no auth required)
  // Original: /api/public/surveys/:slug (line ~18680)
  router.get("/surveys/:slug", async (req, res) => {
    try {
      const survey = await storage.getSurveyBySlug(req.params.slug);

      if (!survey) {
        return res.status(404).json({ error: "Survey not found" });
      }

      if (survey.status !== "active") {
        return res.status(404).json({ error: "Survey is not available" });
      }

      const now = new Date();
      if (survey.startsAt && now < survey.startsAt) {
        return res.status(404).json({ error: "Survey has not started yet" });
      }
      if (survey.endsAt && now > survey.endsAt) {
        return res.status(404).json({ error: "Survey has ended" });
      }

      res.json({
        id: survey.id,
        title: survey.title,
        description: survey.description,
        slug: survey.slug,
        definition: survey.definition,
      });
    } catch (error) {
      console.error("Error fetching public survey:", error);
      res.status(500).json({ error: "Failed to fetch survey" });
    }
  });

  // PUBLIC: Submit survey response (no auth required)
  // Original: /api/public/surveys/:slug/responses (line ~18717)
  router.post("/surveys/:slug/responses", async (req, res) => {
    try {
      const survey = await storage.getSurveyBySlug(req.params.slug);

      if (!survey) {
        return res.status(404).json({ error: "Survey not found" });
      }

      if (survey.status !== "active") {
        return res.status(400).json({ error: "Survey is not accepting responses" });
      }

      const now = new Date();
      if (survey.startsAt && now < survey.startsAt) {
        return res.status(400).json({ error: "Survey has not started yet" });
      }
      if (survey.endsAt && now > survey.endsAt) {
        return res.status(400).json({ error: "Survey has ended" });
      }

      const { answers, respondentEmail, respondentName, isComplete } = req.body;

      if (!answers || typeof answers !== "object") {
        return res.status(400).json({ error: "Answers are required" });
      }

      const response = await storage.createSurveyResponse({
        surveyId: survey.id,
        answers,
        respondentEmail,
        respondentName,
        isComplete: isComplete ?? true,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          referrer: req.get("referer"),
          completedAt: new Date().toISOString(),
        },
      });

      res.status(201).json({ success: true, responseId: response.id });
    } catch (error) {
      console.error("Error submitting survey response:", error);
      res.status(500).json({ error: "Failed to submit response" });
    }
  });

  // Blueprint URL: /:destination/attractions/:seoSlug
  // Original: /api/public/:destination/attractions/:slug (line ~3389)
  router.get("/:destination/attractions/:slug", async (req: Request, res: Response) => {
    try {
      const { destination, slug } = req.params;

      let attraction = await db.select()
        .from(tiqetsAttractions)
        .where(and(
          ilike(tiqetsAttractions.cityName, destination),
          eq(tiqetsAttractions.seoSlug, slug),
          eq(tiqetsAttractions.status, "published")
        ))
        .limit(1);

      if (!attraction.length) {
        attraction = await db.select()
          .from(tiqetsAttractions)
          .where(and(
            ilike(tiqetsAttractions.cityName, destination),
            eq(tiqetsAttractions.slug, slug),
            eq(tiqetsAttractions.status, "published")
          ))
          .limit(1);

        if (attraction.length && attraction[0].seoSlug) {
          const relatedAttractions = await db.select()
            .from(tiqetsAttractions)
            .where(and(
              ilike(tiqetsAttractions.cityName, destination),
              eq(tiqetsAttractions.status, "published"),
              sql`${tiqetsAttractions.id} != ${attraction[0].id}`
            ))
            .limit(6);

          return res.json({
            attraction: attraction[0],
            relatedAttractions,
            affiliateLink: TIQETS_AFFILIATE_LINK,
            redirect: `/${destination}/attractions/${attraction[0].seoSlug}`
          });
        }
      }

      if (!attraction.length) {
        return res.status(404).json({ error: "Attraction not found" });
      }

      const relatedAttractions = await db.select()
        .from(tiqetsAttractions)
        .where(and(
          ilike(tiqetsAttractions.cityName, destination),
          eq(tiqetsAttractions.status, "published"),
          sql`${tiqetsAttractions.id} != ${attraction[0].id}`
        ))
        .limit(6);

      const attr = attraction[0];
      const aiContent = attr.aiContent as Record<string, any> || {};

      const getField = (obj: Record<string, any>, ...keys: string[]) => {
        for (const key of keys) {
          if (obj[key] !== undefined) return obj[key];
        }
        return null;
      };

      const { priceUsd, priceLocal, priceFrom, ...attrWithoutPrices } = attr as any;
      const enrichedAttraction = {
        ...attrWithoutPrices,
        name: attr.title,
        destination: attr.cityName,
        country: destination === 'dubai' ? 'UAE' : destination,
        image: (attr as any).imageUrl,
        rating: Number((attr as any).rating) || 4.5,
        reviews: Number((attr as any).reviewCount) || 100,
        duration: attr.duration || '2-3 hours',
        category: attr.primaryCategory || 'Attraction',
        location: {
          city: attr.cityName,
          country: destination === 'dubai' ? 'UAE' : destination,
          address: attr.venueAddress || `${attr.title}, ${attr.cityName}`,
          latitude: attr.latitude || null,
          longitude: attr.longitude || null,
        },
        introduction: getField(aiContent, 'whyVisit', 'why_visit', 'Why Visit', 'introduction', 'Introduction') || '',
        whatToExpect: (() => {
          const wte = getField(aiContent, 'whatToExpect', 'what_to_expect', 'What to Expect');
          return Array.isArray(wte) ? wte : [];
        })(),
        highlights: (() => {
          const hl = getField(aiContent, 'highlights', 'Highlights');
          return Array.isArray(hl) ? hl : [];
        })(),
        visitorTips: (() => {
          const tips = getField(aiContent, 'visitorTips', 'visitor_tips', 'Visitor Tips');
          if (Array.isArray(tips)) {
            return tips.map((t: any) => typeof t === 'string' ? t : t.description || t.text || t.tip || '').filter(Boolean);
          }
          return [];
        })(),
        howToGetThere: getField(aiContent, 'howToGet', 'how_to_get_there', 'How to Get There', 'howToGetThere') || '',
        faqItems: (() => {
          const faqs = getField(aiContent, 'faqs', 'FAQs');
          if (Array.isArray(faqs)) {
            return faqs.map((f: any) => ({
              question: f.question || f.q || '',
              answer: f.answer || f.a || ''
            }));
          }
          return [];
        })(),
        metaTitle: `${attr.title} - Complete Guide 2026 | TRAVI`,
        metaDescription: getField(aiContent, 'answerCapsule', 'answer_capsule', 'Answer Capsule') || '',
        relatedAttractions: relatedAttractions.map(r => ({
          id: r.id,
          name: r.title,
          image: (r as any).imageUrl,
          category: r.primaryCategory || 'Attraction',
          href: `/${destination}/attractions/${r.seoSlug || r.slug}`,
          seoSlug: r.seoSlug,
          slug: r.slug,
          tiqetsRating: r.tiqetsRating,
          duration: r.duration,
          tiqetsImages: r.tiqetsImages,
          affiliateLink: TIQETS_AFFILIATE_LINK
        }))
      };

      res.json({
        attraction: enrichedAttraction,
        affiliateLink: TIQETS_AFFILIATE_LINK,
        aiGenerated: !!attr.aiContent
      });
    } catch (error) {
      console.error("[Public Attractions API] Detail error:", error);
      res.status(500).json({ error: "Failed to fetch attraction details" });
    }
  });

  // Legacy URL: /api/public/attractions/:city/:slug
  // Original: /api/public/attractions/:city/:slug (line ~3537)
  router.get("/attractions/:city/:slug", async (req: Request, res: Response) => {
    try {
      const { city, slug } = req.params;

      const attraction = await db.select()
        .from(tiqetsAttractions)
        .where(and(
          ilike(tiqetsAttractions.cityName, city),
          eq(tiqetsAttractions.slug, slug),
          eq(tiqetsAttractions.status, "published")
        ))
        .limit(1);

      if (!attraction.length) {
        return res.status(404).json({ error: "Attraction not found" });
      }

      res.json({
        attraction: attraction[0],
        affiliateLink: TIQETS_AFFILIATE_LINK
      });
    } catch (error) {
      console.error("[Public Attractions API] Detail error:", error);
      res.status(500).json({ error: "Failed to fetch attraction details" });
    }
  });

  // Get list of ready attractions for a city
  // Original: /api/public/attractions/:city (line ~3566)
  router.get("/attractions/:city", async (req: Request, res: Response) => {
    try {
      const { city } = req.params;
      const { page = "1", pageSize = "20" } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const pageSizeNum = Math.min(50, Math.max(1, parseInt(String(pageSize), 10) || 20));
      const offset = (pageNum - 1) * pageSizeNum;

      const countResult = await db.select({ count: sql<number>`count(*)::int` })
        .from(tiqetsAttractions)
        .where(and(
          eq(tiqetsAttractions.status, "published"),
          ilike(tiqetsAttractions.cityName, city)
        ));

      const total = countResult[0]?.count || 0;
      const totalPages = Math.ceil(total / pageSizeNum);

      const attractions = await db.select()
        .from(tiqetsAttractions)
        .where(and(
          eq(tiqetsAttractions.status, "published"),
          ilike(tiqetsAttractions.cityName, city)
        ))
        .limit(pageSizeNum)
        .offset(offset);

      res.json({
        attractions,
        city,
        affiliateLink: TIQETS_AFFILIATE_LINK,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages
      });
    } catch (error) {
      console.error("[Public Attractions API] List error:", error);
      res.status(500).json({ error: "Failed to fetch attractions" });
    }
  });

  // Get all published attractions across all cities
  // Original: /api/public/attractions (line ~3615)
  router.get("/attractions", async (req: Request, res: Response) => {
    try {
      const { page = "1", pageSize = "24", city, q } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(String(pageSize), 10) || 24));
      const offset = (pageNum - 1) * pageSizeNum;

      const conditions = [eq(tiqetsAttractions.status, "published")];

      if (city && typeof city === 'string' && city !== 'all') {
        const normalizedCity = city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        conditions.push(ilike(tiqetsAttractions.cityName, normalizedCity));
      }

      if (q && typeof q === 'string' && q.trim()) {
        const searchTerm = `%${q.trim()}%`;
        conditions.push(
          or(
            ilike(tiqetsAttractions.title, searchTerm),
            ilike(tiqetsAttractions.metaDescription, searchTerm)
          )!
        );
      }

      const countResult = await db.select({ count: sql<number>`count(*)::int` })
        .from(tiqetsAttractions)
        .where(and(...conditions));

      const total = countResult[0]?.count || 0;
      const totalPages = Math.ceil(total / pageSizeNum);

      const attractions = await db.select({
        id: tiqetsAttractions.id,
        title: tiqetsAttractions.title,
        slug: tiqetsAttractions.slug,
        cityName: tiqetsAttractions.cityName,
        cityId: tiqetsAttractions.cityId,
        metaDescription: tiqetsAttractions.metaDescription,
        images: tiqetsAttractions.images,
        tiqetsImages: tiqetsAttractions.tiqetsImages,
        rating: tiqetsAttractions.tiqetsRating,
        reviewCount: tiqetsAttractions.tiqetsReviewCount,
        priceUsd: tiqetsAttractions.priceUsd,
        primaryCategory: tiqetsAttractions.primaryCategory,
        qualityScore: tiqetsAttractions.qualityScore,
      })
        .from(tiqetsAttractions)
        .where(and(...conditions))
        .orderBy(desc(tiqetsAttractions.qualityScore))
        .limit(pageSizeNum)
        .offset(offset);

      const transformedAttractions = attractions.map(attr => {
        const images = attr.images as any;
        const tiqetsImages = attr.tiqetsImages as any;
        let imageUrl: string | null = null;

        if (tiqetsImages && Array.isArray(tiqetsImages) && tiqetsImages.length > 0) {
          const firstImage = tiqetsImages[0];
          if (typeof firstImage === 'object' && firstImage !== null) {
            imageUrl = firstImage.large || firstImage.extra_large || firstImage.medium || firstImage.small;
          } else if (typeof firstImage === 'string') {
            imageUrl = firstImage;
          }
        }

        if (!imageUrl && images && Array.isArray(images) && images.length > 0) {
          const firstImage = images[0];
          if (typeof firstImage === 'object' && firstImage !== null) {
            imageUrl = firstImage.large || firstImage.extra_large || firstImage.medium || firstImage.url;
          } else if (typeof firstImage === 'string') {
            imageUrl = firstImage;
          }
        }

        return {
          id: attr.id,
          title: attr.title,
          slug: attr.slug,
          type: "attraction" as const,
          status: "published" as const,
          cityName: attr.cityName,
          cityId: attr.cityId,
          metaDescription: attr.metaDescription,
          heroImage: imageUrl,
          cardImage: imageUrl,
          rating: attr.rating ? parseFloat(String(attr.rating)) : null,
          reviewCount: attr.reviewCount,
          priceUsd: attr.priceUsd,
          primaryCategory: attr.primaryCategory,
          qualityScore: attr.qualityScore,
        };
      });

      res.json({
        attractions: transformedAttractions,
        affiliateLink: TIQETS_AFFILIATE_LINK,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages
      });
    } catch (error) {
      console.error("[Public Attractions API] All attractions error:", error);
      res.status(500).json({ error: "Failed to fetch attractions" });
    }
  });

  // ============================================================================
  // PAGE SEO PUBLIC API - SEO data for any page (read from database only)
  // ============================================================================
  router.get("/page-seo/:pagePath(*)", async (req: Request, res: Response) => {
    try {
      const pagePath = "/" + req.params.pagePath;
      const [seoData] = await db.select().from(pageSeo).where(eq(pageSeo.pagePath, pagePath));
      
      if (!seoData) {
        // Return empty SEO - NO FALLBACKS as per requirements
        return res.json({
          pagePath,
          metaTitle: null,
          metaDescription: null,
          canonicalUrl: null,
          ogTitle: null,
          ogDescription: null,
          ogImage: null,
          robotsMeta: null,
          jsonLdSchema: null,
        });
      }
      
      // Return only public SEO fields
      res.json({
        pagePath: seoData.pagePath,
        metaTitle: seoData.metaTitle,
        metaDescription: seoData.metaDescription,
        canonicalUrl: seoData.canonicalUrl,
        ogTitle: seoData.ogTitle,
        ogDescription: seoData.ogDescription,
        ogImage: seoData.ogImage,
        robotsMeta: seoData.robotsMeta,
        jsonLdSchema: seoData.jsonLdSchema,
      });
    } catch (error) {
      console.error("Error fetching public page SEO:", error);
      res.status(500).json({ error: "Failed to fetch page SEO" });
    }
  });

  // ============================================================================
  // PUBLIC STATS API - Dynamic counts from database (single source of truth)
  // ============================================================================
  router.get("/stats", async (_req: Request, res: Response) => {
    try {
      const [destinationCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(destinations)
        .where(and(
          eq(destinations.isActive, true),
          notIlike(destinations.name, '%test%')
        ));
      
      const [attractionCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tiqetsAttractions);
      
      const [publishedContentCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(contents)
        .where(eq(contents.status, "published"));
      
      res.json({
        destinations: destinationCount?.count || 0,
        attractions: attractionCount?.count || 0,
        publishedContent: publishedContentCount?.count || 0,
      });
    } catch (error) {
      console.error("Error fetching public stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.use("/api/public", router);
}
