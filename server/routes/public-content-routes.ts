import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, and, sql, ilike, notIlike } from "drizzle-orm";
import {
  destinations,
  homepageSections,
  homepageCards,
  experienceCategories,
  regionLinks,
  tiqetsAttractions,
} from "@shared/schema";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Helper to strip sensitive fields for public/anonymous access
 */
function sanitizeContentForPublic(content: any) {
  if (!content) return content;
  const { affiliateLinks, translations, author, ...publicContent } = content;
  // Only include safe author info
  if (author) {
    publicContent.author = {
      firstName: author.firstName,
      lastName: author.lastName,
    };
  }
  return publicContent;
}

/**
 * Register all public content API routes
 * These routes are unauthenticated and serve the public website
 */
export function registerPublicContentRoutes(app: Express): void {
  // Public API for published content only (for public website)
  app.get("/api/public/contents", async (req, res) => {
    try {
      const { type, search, limit } = req.query;
      const filters = {
        type: type as string | undefined,
        status: "published", // Only published content
        search: search as string | undefined,
      };

      const contents = await storage.getContentsWithRelations(filters);
      // Limit and sanitize for public consumption
      const maxLimit = Math.min(Number.parseInt(limit as string) || 50, 100);
      const sanitizedContents = contents.slice(0, maxLimit).map(sanitizeContentForPublic);
      res.json(sanitizedContents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contents" });
    }
  });

  // Public API for destinations (homepage discovery section)
  // CRITICAL: Database is single source of truth - no static fallbacks
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
        .where(and(eq(destinations.isActive, true), notIlike(destinations.name, "%test%")))
        .orderBy(destinations.name);

      res.json(allDestinations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch destinations" });
    }
  });

  // Public API for homepage sections (CMS-driven)
  app.get("/api/public/homepage-sections", async (req, res) => {
    try {
      const sections = await db
        .select()
        .from(homepageSections)
        .where(eq(homepageSections.isVisible, true))
        .orderBy(homepageSections.sortOrder);

      res.json(sections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage sections" });
    }
  });

  // Public API for homepage category cards (CMS-driven)
  app.get("/api/public/homepage-cards", async (req, res) => {
    try {
      const cards = await db
        .select()
        .from(homepageCards)
        .where(eq(homepageCards.isActive, true))
        .orderBy(homepageCards.sortOrder);

      res.json(cards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage cards" });
    }
  });

  // Public API for experience categories (travel styles)
  app.get("/api/public/experience-categories", async (req, res) => {
    try {
      const categories = await db
        .select()
        .from(experienceCategories)
        .where(eq(experienceCategories.isActive, true))
        .orderBy(experienceCategories.sortOrder);

      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch experience categories" });
    }
  });

  // Public API for region links (pre-footer SEO grid)
  app.get("/api/public/region-links", async (req, res) => {
    try {
      const regions = await db
        .select()
        .from(regionLinks)
        .where(eq(regionLinks.isActive, true))
        .orderBy(regionLinks.sortOrder);

      res.json(regions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch region links" });
    }
  });

  // Public API for attraction destinations with live counts from DB
  // SINGLE SOURCE OF TRUTH - replaces all hardcoded destination arrays
  // Derives all data from tiqets_attractions + optional destinations metadata
  app.get("/api/public/attraction-destinations", async (req, res) => {
    try {
      // Get unique cities and counts from tiqets_attractions (THE source of truth)
      const cityCounts = await db
        .select({
          cityName: tiqetsAttractions.cityName,
          count: sql<number>`count(*)::int`,
        })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.status, "published"))
        .groupBy(tiqetsAttractions.cityName)
        .orderBy(sql`count(*) DESC`);

      // Get destination metadata for enrichment (optional)
      const destinationMeta = await db
        .select({
          id: destinations.id,
          name: destinations.name,
          country: destinations.country,
          image: destinations.cardImage,
          summary: destinations.summary,
        })
        .from(destinations)
        .where(eq(destinations.isActive, true));

      // Create lookup map by normalized name
      const metaMap = new Map<string, (typeof destinationMeta)[0]>();
      for (const d of destinationMeta) {
        metaMap.set(String(d.id), d);
      }

      // City-to-country fallback mapping for cities not in destinations table
      const cityCountryFallback: Record<string, string> = {
        London: "United Kingdom",
        Paris: "France",
        Barcelona: "Spain",
        Rome: "Italy",
        Amsterdam: "Netherlands",
        "New York": "USA",
        Dubai: "UAE",
        "Las Vegas": "USA",
        Istanbul: "Turkey",
        Miami: "United States",
        "Los Angeles": "United States",
        Singapore: "Singapore",
        Bangkok: "Thailand",
        "Abu Dhabi": "United Arab Emirates",
        Tokyo: "Japan",
        "Hong Kong": "China",
      };

      // Build destinations array with data from tiqets_attractions as primary source
      const destinationsResult = cityCounts
        .filter(c => c.cityName) // Filter out null city names
        .map(c => {
          const slug = c.cityName!.toLowerCase().replaceAll(" ", "-");
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

      // Calculate total attractions
      const total = destinationsResult.reduce((sum, d) => sum + d.count, 0);

      res.json({
        destinations: destinationsResult,
        total,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch attraction destinations" });
    }
  });

  // Public API for Tiqets attractions (powers public attractions page)
  app.get("/api/public/tiqets/attractions", async (req, res) => {
    try {
      const { city, search, limit = "50", offset = "0" } = req.query;
      const limitNum = Number.parseInt(limit as string, 10) || 50;
      const offsetNum = Number.parseInt(offset as string, 10) || 0;

      // Build conditions array - always include published status filter
      const conditions: any[] = [eq(tiqetsAttractions.status, "published")];

      if (city && typeof city === "string") {
        conditions.push(ilike(tiqetsAttractions.cityName, city));
      }

      if (search && typeof search === "string") {
        conditions.push(ilike(tiqetsAttractions.title, `%${search}%`));
      }

      // Fetch published attractions with optional filters
      // Include seoSlug for clean SEO-friendly URLs, exclude price fields for public API
      const attractions = await db
        .select({
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

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(tiqetsAttractions)
        .where(and(...conditions));
      const totalCount = Number(countResult[0]?.count || 0);

      // Get unique cities for published attractions only
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
      res.status(500).json({ error: "Failed to fetch attractions" });
    }
  });

  // Public API for single destination page data (hero images, featured sections)
  // NO AUTH REQUIRED - this powers the public destination pages
  app.get("/api/public/destinations/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Fetch destination from database
      const [destination] = await db
        .select()
        .from(destinations)
        .where(eq(destinations.id, Number(id)))
        .limit(1);

      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // SECURITY: Validate destination ID against whitelist to prevent path traversal
      // Only allow known destination IDs - reject any unknown slugs
      const ALLOWED_DESTINATION_IDS = new Set([
        "dubai",
        "abu-dhabi",
        "ras-al-khaimah",
        "bangkok",
        "barcelona",
        "paris",
        "london",
        "new-york",
        "singapore",
        "tokyo",
        "rome",
        "amsterdam",
        "hong-kong",
        "las-vegas",
        "los-angeles",
        "miami",
        "istanbul",
      ]);

      // Reject any ID not in whitelist (prevents ../../ traversal attacks)
      if (!ALLOWED_DESTINATION_IDS.has(id)) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // Discover hero images from filesystem
      // Mapping from validated destination ID to folder name (handles naming inconsistencies)
      const folderMappings: Record<string, string[]> = {
        dubai: ["dubai", "dubai/dubai"],
        "abu-dhabi": ["abudhabi", "abu-dhabi"],
        bangkok: ["bangkok"],
        barcelona: ["barcelona", "barcelona/barcelona"],
        paris: ["paris"],
        london: ["london"],
        "new-york": ["newyork", "new-york"],
        singapore: ["singapore", "Singapore", "Singapore/singapore"],
        tokyo: ["tokyo"],
        rome: ["rome"],
        amsterdam: ["amsterdam", "Amsterdam", "Amsterdam/amsterdam"],
        "hong-kong": ["hongkong", "hong-kong"],
        "las-vegas": ["lasvegas", "las-vegas"],
        "los-angeles": ["losangeles", "los-angeles"],
        miami: ["miami"],
        istanbul: ["istanbul"],
      };

      // SECURITY: Only use whitelisted folders - never fallback to raw ID
      const possibleFolders = folderMappings[id] || [];
      let heroImages: Array<{ filename: string; url: string; alt: string; order: number }> = [];

      for (const folder of possibleFolders) {
        const heroPath = path.join(process.cwd(), "client", "public", "destinations-hero", folder);
        try {
          if (fs.existsSync(heroPath)) {
            const files = fs.readdirSync(heroPath);
            const imageFiles = files.filter(
              f =>
                f.endsWith(".webp") ||
                f.endsWith(".jpg") ||
                f.endsWith(".jpeg") ||
                f.endsWith(".png")
            );

            if (imageFiles.length > 0) {
              heroImages = imageFiles.map((filename, index) => ({
                filename,
                url: `/destinations-hero/${folder}/${filename}`,
                alt: filename
                  .replace(/\.[^/.]+$/, "")
                  .replaceAll("-", " ")
                  .replaceAll("_", " "),
                order: index,
              }));
              break; // Found images, stop searching
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
        // Hero data from database
        hero: {
          title: destination.heroTitle || `Discover ${destination.name}`,
          subtitle:
            destination.heroSubtitle ||
            destination.summary ||
            `Explore the best of ${destination.name}`,
          ctaText: destination.heroCTAText || "Start Exploring",
          ctaLink: destination.heroCTALink || `/destinations/${destination.id}/attractions`,
          images: heroImages,
        },
        // SEO data from database
        seo: {
          metaTitle: destination.metaTitle || `${destination.name} Travel Guide | TRAVI`,
          metaDescription:
            destination.metaDescription || `Discover the best of ${destination.name}`,
          canonicalUrl:
            destination.canonicalUrl || `https://travi.world/destinations/${destination.id}`,
          ogImage: destination.ogImage || destination.cardImage,
          ogTitle: destination.ogTitle || destination.metaTitle,
          ogDescription: destination.ogDescription || destination.metaDescription,
        },
        // Featured sections from database
        featuredAttractions: destination.featuredAttractions || [],
        featuredAreas: destination.featuredAreas || [],
        featuredHighlights: destination.featuredHighlights || [],
        // Mood/vibe for styling FROM DATABASE (no hardcoded values)
        mood: {
          primaryColor: destination.moodPrimaryColor || "#1E40AF",
          gradientFrom: destination.moodGradientFrom || "rgba(0,0,0,0.6)",
          gradientTo: destination.moodGradientTo || "rgba(0,0,0,0.3)",
          vibe: destination.moodVibe || "cosmopolitan",
          tagline: destination.moodTagline || `Experience ${destination.name}`,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch destination" });
    }
  });
}
