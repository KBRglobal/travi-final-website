import type { Express, Request, Response } from "express";
import { eq, and, sql, ilike, desc, or } from "drizzle-orm";
import { db } from "../db";
import { tiqetsAttractions, affiliateClicks } from "@shared/schema";
import { generateAttractionContent } from "../ai/attraction-description-generator";
import {
  TIQETS_AFFILIATE_LINK,
  tiqetsDestinations,
  attractionsByDestination,
} from "../data/attractions-data";

/**
 * Get country from city name by looking up in tiqetsDestinations
 */
function getCountryFromCity(cityName: string): string {
  const citySlug = cityName.toLowerCase().replace(/\s+/g, "-");
  const destInfo = tiqetsDestinations[citySlug];
  if (destInfo) {
    return destInfo.country;
  }
  // Fallback mapping for common cities
  const cityCountryMap: Record<string, string> = {
    dubai: "United Arab Emirates",
    "abu dhabi": "United Arab Emirates",
    sharjah: "United Arab Emirates",
    ajman: "United Arab Emirates",
    "ras al khaimah": "United Arab Emirates",
    london: "United Kingdom",
    paris: "France",
    "new york": "United States",
    tokyo: "Japan",
    singapore: "Singapore",
    bangkok: "Thailand",
    barcelona: "Spain",
    rome: "Italy",
    amsterdam: "Netherlands",
  };
  return cityCountryMap[cityName.toLowerCase()] || "Unknown";
}

export function registerAttractionsRoutes(app: Express): void {
  // Get list of attractions for a destination
  app.get("/api/attractions/search", async (req: Request, res: Response) => {
    try {
      const { destination, category, page = 1, pageSize = 20 } = req.query;

      const destSlug = destination ? String(destination).toLowerCase() : "dubai";
      const destInfo = tiqetsDestinations[destSlug];

      if (!destInfo) {
        return res.status(400).json({
          error:
            "Invalid destination. Must be one of: " + Object.keys(tiqetsDestinations).join(", "),
        });
      }

      let attractions = attractionsByDestination[destSlug] || [];

      if (category && typeof category === "string") {
        attractions = attractions.filter(a =>
          a.category.toLowerCase().includes(category.toLowerCase())
        );
      }

      const pageNum = Math.max(1, Number.parseInt(String(page), 10) || 1);
      const pageSizeNum = Math.min(50, Math.max(1, Number.parseInt(String(pageSize), 10) || 20));
      const total = attractions.length;
      const totalPages = Math.ceil(total / pageSizeNum);
      const startIdx = (pageNum - 1) * pageSizeNum;
      const paginatedAttractions = attractions.slice(startIdx, startIdx + pageSizeNum);

      // Add affiliate link to each attraction
      const attractionsWithAffiliate = paginatedAttractions.map(a => ({
        ...a,
        destination: destInfo.name,
        country: destInfo.country,
        affiliateLink: TIQETS_AFFILIATE_LINK,
      }));

      res.json({
        attractions: attractionsWithAffiliate,
        destination: destInfo,
        affiliateLink: TIQETS_AFFILIATE_LINK,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attractions" });
    }
  });

  // Get attraction by slug only (searches all cities) - for legacy shorthand URLs
  // IMPORTANT: This route must come BEFORE /api/attractions/:destination/:attractionId
  app.get("/api/attractions/by-slug/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;

      // First try to find by seo_slug
      let attraction = await db
        .select()
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.seoSlug, slug))
        .limit(1);

      // Fallback to original slug
      if (!attraction.length) {
        attraction = await db
          .select()
          .from(tiqetsAttractions)
          .where(eq(tiqetsAttractions.slug, slug))
          .limit(1);
      }

      if (!attraction.length) {
        return res.status(404).json({ error: "Attraction not found" });
      }

      const attr = attraction[0];
      const citySlug = attr.cityName.toLowerCase().replace(/\s+/g, "-");

      // Return with redirect hint if different from canonical URL
      const canonicalSlug = attr.seoSlug || attr.slug;
      const shouldRedirect = slug !== canonicalSlug;

      // Get related attractions
      const relatedAttractions = await db
        .select()
        .from(tiqetsAttractions)
        .where(
          and(
            ilike(tiqetsAttractions.cityName, attr.cityName),
            eq(tiqetsAttractions.status, "ready"),
            sql`${tiqetsAttractions.id} != ${attr.id}`
          )
        )
        .limit(6);

      res.json({
        attraction: {
          ...attr,
          name: attr.title,
          destination: attr.cityName,
          country: getCountryFromCity(attr.cityName || ""),
          relatedAttractions: relatedAttractions.map(r => ({
            id: r.id,
            name: r.title,
            // Using tiqetsImages array - schema stores images as JSON array
            image:
              (r.tiqetsImages as Array<{ small?: string; medium?: string; large?: string }>)?.[0]
                ?.medium || "",
            category: r.primaryCategory || "Attraction",
            // Using priceUsd - attractions are priced in USD from Tiqets API
            price: Number(r.priceUsd) || 0,
            currency: "USD",
            href: `/${citySlug}/attractions/${r.seoSlug || r.slug}`,
            affiliateLink: TIQETS_AFFILIATE_LINK,
          })),
        },
        // Tiqets affiliate link for all booking CTAs
        affiliateLink: TIQETS_AFFILIATE_LINK,
        aiGenerated: !!attr.aiContent,
        ...(shouldRedirect ? { redirect: `/${citySlug}/attractions/${canonicalSlug}` } : {}),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attraction" });
    }
  });

  // Get attraction details with AI-generated content
  app.get("/api/attractions/:destination/:attractionId", async (req: Request, res: Response) => {
    try {
      const { destination, attractionId } = req.params;
      const { aiContent = "true" } = req.query;
      const enableAI = aiContent !== "false";

      const destSlug = destination.toLowerCase();
      const destInfo = tiqetsDestinations[destSlug];

      if (!destInfo) {
        return res.status(400).json({
          error:
            "Invalid destination. Must be one of: " + Object.keys(tiqetsDestinations).join(", "),
        });
      }

      const attractions = attractionsByDestination[destSlug] || [];
      const attraction = attractions.find(a => a.id === attractionId);

      if (!attraction) {
        return res.status(404).json({ error: "Attraction not found" });
      }

      // Build full attraction response
      const fullAttraction: any = {
        ...attraction,
        destination: destInfo.name,
        country: destInfo.country,
        affiliateLink: TIQETS_AFFILIATE_LINK,
        location: {
          city: destInfo.name,
          country: destInfo.country,
          address: `${attraction.name}, ${destInfo.name}`,
        },
      };

      // Generate AI content if enabled
      let aiGenerated = false;
      if (enableAI) {
        try {
          const aiResult = await generateAttractionContent(
            attraction.name,
            destInfo.name,
            attraction.category,
            `${(attraction as any).price} ${(attraction as any).currency}`,
            (attraction as any).duration
          );

          fullAttraction.introduction = aiResult.introduction;
          fullAttraction.whatToExpect = aiResult.whatToExpect;
          fullAttraction.highlights = aiResult.highlights;
          fullAttraction.visitorTips = aiResult.visitorTips;
          fullAttraction.faqItems = aiResult.faqItems;
          fullAttraction.metaTitle = aiResult.metaTitle;
          fullAttraction.metaDescription = aiResult.metaDescription;
          aiGenerated = true;
        } catch (aiError) {
          // Fallback content
          fullAttraction.introduction = `${attraction.name} is one of ${destInfo.name}'s most popular attractions, offering visitors an unforgettable experience.`;
          fullAttraction.whatToExpect = [
            `Experience the best of ${destInfo.name}`,
            "Professional guides and modern facilities",
            "Photography opportunities throughout",
          ];
          fullAttraction.highlights = [
            `Top-rated attraction in ${destInfo.name}`,
            "Perfect for all ages",
          ];
          fullAttraction.visitorTips = [
            "Book tickets online in advance",
            "Arrive early to avoid crowds",
            "Wear comfortable walking shoes",
          ];
          fullAttraction.faqItems = [
            {
              question: `How much are tickets for ${attraction.name}?`,
              answer: `Tickets start from ${(attraction as any).price} ${(attraction as any).currency}. Check the booking page for the latest prices.`,
            },
            {
              question: "What are the opening hours?",
              answer: "Please check the ticket options page for current opening hours.",
            },
            {
              question: `How long should I spend at ${attraction.name}?`,
              answer: `Most visitors spend ${(attraction as any).duration || "2-3 hours"} at this attraction.`,
            },
          ];
          fullAttraction.metaTitle = `${attraction.name} – Complete Guide 2026`;
          fullAttraction.metaDescription = `Discover ${attraction.name} in ${destInfo.name}. Complete visitor guide with tickets, tips, and insider information.`;
        }
      }

      // Related attractions from same destination
      fullAttraction.relatedAttractions = attractions
        .filter(a => a.id !== attractionId)
        .slice(0, 4)
        .map(a => ({
          id: a.id,
          name: a.name,
          image: (a as any).image,
          category: a.category,
          price: (a as any).price,
          currency: (a as any).currency,
          href: `/attractions/${destSlug}/${a.id}`,
          affiliateLink: TIQETS_AFFILIATE_LINK,
        }));

      res.json({
        attraction: fullAttraction,
        affiliateLink: TIQETS_AFFILIATE_LINK,
        aiGenerated,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attraction details" });
    }
  });

  // Get list of whitelisted destinations
  app.get("/api/attractions/destinations", async (_req: Request, res: Response) => {
    try {
      const destinations = Object.entries(tiqetsDestinations).map(([slug, info]) => ({
        slug,
        ...info,
        attractionCount: (attractionsByDestination[slug] || []).length,
      }));

      res.json({
        destinations,
        affiliateLink: TIQETS_AFFILIATE_LINK,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch destinations" });
    }
  });

  // ============================================================================
  // PUBLIC TIQETS ATTRACTIONS API - Database-backed with AI-generated content
  // ============================================================================

  // Affiliate click tracking endpoint
  app.post("/api/affiliate/click", async (req: Request, res: Response) => {
    try {
      const { attractionId, destination } = req.body;

      // Validate attractionId is provided
      if (!attractionId || typeof attractionId !== "string") {
        return res.status(400).json({ error: "attractionId is required and must be a string" });
      }

      const userAgent = req.headers["user-agent"] || null;
      const referrer = req.headers.referer || null;
      const sessionId = (req as any).sessionID || req.headers["x-session-id"] || null;

      await db.insert(affiliateClicks).values({
        attractionId,
        destination,
        userAgent,
        referrer,
        sessionId,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // Blueprint URL: /:destination/attractions/:seoSlug (e.g., /dubai/attractions/burj-khalifa)
  // Get a single attraction by destination and seo_slug (with fallback to original slug)
  app.get("/api/public/:destination/attractions/:slug", async (req: Request, res: Response) => {
    try {
      const { destination, slug } = req.params;

      // First try to find by seo_slug (preferred, short URL)
      let attraction = await db
        .select()
        .from(tiqetsAttractions)
        .where(
          and(
            ilike(tiqetsAttractions.cityName, destination),
            eq(tiqetsAttractions.seoSlug, slug),
            eq(tiqetsAttractions.status, "published")
          )
        )
        .limit(1);

      // Fallback to original slug for backward compatibility
      if (!attraction.length) {
        attraction = await db
          .select()
          .from(tiqetsAttractions)
          .where(
            and(
              ilike(tiqetsAttractions.cityName, destination),
              eq(tiqetsAttractions.slug, slug),
              eq(tiqetsAttractions.status, "published")
            )
          )
          .limit(1);

        // If found by old slug and has seo_slug, suggest redirect (with related attractions)
        if (attraction.length && attraction[0].seoSlug) {
          // Get related attractions even for redirect response
          const relatedAttractions = await db
            .select()
            .from(tiqetsAttractions)
            .where(
              and(
                ilike(tiqetsAttractions.cityName, destination),
                eq(tiqetsAttractions.status, "published"),
                sql`${tiqetsAttractions.id} != ${attraction[0].id}`
              )
            )
            .limit(6);

          return res.json({
            attraction: attraction[0],
            relatedAttractions,
            affiliateLink: TIQETS_AFFILIATE_LINK,
            redirect: `/${destination}/attractions/${attraction[0].seoSlug}`,
          });
        }
      }

      if (!attraction.length) {
        return res.status(404).json({ error: "Attraction not found" });
      }

      // Get related attractions from the same city (excluding current one)
      const relatedAttractions = await db
        .select()
        .from(tiqetsAttractions)
        .where(
          and(
            ilike(tiqetsAttractions.cityName, destination),
            eq(tiqetsAttractions.status, "published"),
            sql`${tiqetsAttractions.id} != ${attraction[0].id}`
          )
        )
        .limit(6);

      // Extract AI content fields for the frontend
      const attr = attraction[0];
      const aiContent = (attr.aiContent as Record<string, any>) || {};

      // Normalize different key formats from AI content
      const getField = (obj: Record<string, any>, ...keys: string[]) => {
        for (const key of keys) {
          if (obj[key] !== undefined) return obj[key];
        }
        return null;
      };

      // Build enriched attraction response (exclude price fields from public API)
      // Note: Only priceUsd exists in schema (priceLocal, priceFrom not available)
      const { priceUsd, ...attrWithoutPrices } = attr;
      const enrichedAttraction = {
        ...attrWithoutPrices,
        name: attr.title,
        destination: attr.cityName,
        country: destination === "dubai" ? "UAE" : destination,
        image:
          (attr.tiqetsImages as Array<{ small?: string; medium?: string; large?: string }>)?.[0]
            ?.medium || "", // Using tiqetsImages (no imageUrl column in schema)
        rating: Number(attr.tiqetsRating) || 4.5, // Using tiqetsRating (no rating column in schema)
        reviews: Number(attr.tiqetsReviewCount) || 100, // Using tiqetsReviewCount (no reviewCount column in schema)
        duration: attr.duration || "2-3 hours",
        category: attr.primaryCategory || "Attraction",
        location: {
          city: attr.cityName,
          country: destination === "dubai" ? "UAE" : destination,
          address: attr.venueAddress || `${attr.title}, ${attr.cityName}`,
          latitude: attr.latitude || null,
          longitude: attr.longitude || null,
        },
        introduction:
          getField(
            aiContent,
            "whyVisit",
            "why_visit",
            "Why Visit",
            "introduction",
            "Introduction"
          ) || "",
        whatToExpect: (() => {
          const wte = getField(aiContent, "whatToExpect", "what_to_expect", "What to Expect");
          return Array.isArray(wte) ? wte : [];
        })(),
        highlights: (() => {
          const hl = getField(aiContent, "highlights", "Highlights");
          return Array.isArray(hl) ? hl : [];
        })(),
        visitorTips: (() => {
          const tips = getField(aiContent, "visitorTips", "visitor_tips", "Visitor Tips");
          if (Array.isArray(tips)) {
            return tips
              .map((t: any) => (typeof t === "string" ? t : t.description || t.text || t.tip || ""))
              .filter(Boolean);
          }
          return [];
        })(),
        howToGetThere:
          getField(
            aiContent,
            "howToGet",
            "how_to_get_there",
            "How to Get There",
            "howToGetThere"
          ) || "",
        faqItems: (() => {
          const faqs = getField(aiContent, "faqs", "FAQs");
          if (Array.isArray(faqs)) {
            return faqs.map((f: any) => ({
              question: f.question || f.q || "",
              answer: f.answer || f.a || "",
            }));
          }
          return [];
        })(),
        metaTitle: `${attr.title} - Complete Guide 2026 | TRAVI`,
        metaDescription:
          getField(aiContent, "answerCapsule", "answer_capsule", "Answer Capsule") || "",
        relatedAttractions: relatedAttractions.map(r => ({
          id: r.id,
          name: r.title,
          image:
            (r.tiqetsImages as Array<{ small?: string; medium?: string; large?: string }>)?.[0]
              ?.medium || "", // Using tiqetsImages (no imageUrl column in schema)
          category: r.primaryCategory || "Attraction",
          href: `/${destination}/attractions/${r.seoSlug || r.slug}`,
          seoSlug: r.seoSlug,
          slug: r.slug,
          tiqetsRating: r.tiqetsRating,
          duration: r.duration,
          tiqetsImages: r.tiqetsImages,
          affiliateLink: TIQETS_AFFILIATE_LINK,
        })),
      };

      res.json({
        attraction: enrichedAttraction,
        affiliateLink: TIQETS_AFFILIATE_LINK,
        aiGenerated: !!attr.aiContent,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attraction details" });
    }
  });

  // Legacy URL: /api/public/attractions/:city/:slug (backwards compatibility)
  // Get a single attraction by city and slug (public, no auth required)
  app.get("/api/public/attractions/:city/:slug", async (req: Request, res: Response) => {
    try {
      const { city, slug } = req.params;

      // Query tiqets_attractions table with case-insensitive city match and status filter
      const attraction = await db
        .select()
        .from(tiqetsAttractions)
        .where(
          and(
            ilike(tiqetsAttractions.cityName, city),
            eq(tiqetsAttractions.slug, slug),
            eq(tiqetsAttractions.status, "published")
          )
        )
        .limit(1);

      if (!attraction.length) {
        return res.status(404).json({ error: "Attraction not found" });
      }

      res.json({
        attraction: attraction[0],
        affiliateLink: TIQETS_AFFILIATE_LINK,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attraction details" });
    }
  });

  // Get list of ready attractions for a city (public, no auth required)
  app.get("/api/public/attractions/:city", async (req: Request, res: Response) => {
    try {
      const { city } = req.params;
      const { page = "1", pageSize = "20" } = req.query;

      // Parse and validate pagination params
      const pageNum = Math.max(1, Number.parseInt(String(page), 10) || 1);
      const pageSizeNum = Math.min(50, Math.max(1, Number.parseInt(String(pageSize), 10) || 20));
      const offset = (pageNum - 1) * pageSizeNum;

      // Get total count first (with case-insensitive city match)
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tiqetsAttractions)
        .where(
          and(eq(tiqetsAttractions.status, "published"), ilike(tiqetsAttractions.cityName, city))
        );

      const total = countResult[0]?.count || 0;
      const totalPages = Math.ceil(total / pageSizeNum);

      // Query with SQL-level pagination
      const attractions = await db
        .select()
        .from(tiqetsAttractions)
        .where(
          and(eq(tiqetsAttractions.status, "published"), ilike(tiqetsAttractions.cityName, city))
        )
        .limit(pageSizeNum)
        .offset(offset);

      res.json({
        attractions,
        city,
        affiliateLink: TIQETS_AFFILIATE_LINK,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attractions" });
    }
  });

  // Get all published attractions across all cities (public, no auth required)
  // This is used by the main /attractions listing page
  // Supports: city filter, text search (q), pagination
  app.get("/api/public/attractions", async (req: Request, res: Response) => {
    try {
      const { page = "1", pageSize = "24", city, q } = req.query;

      // Parse and validate pagination params
      const pageNum = Math.max(1, Number.parseInt(String(page), 10) || 1);
      const pageSizeNum = Math.min(100, Math.max(1, Number.parseInt(String(pageSize), 10) || 24));
      const offset = (pageNum - 1) * pageSizeNum;

      // Build conditions
      const conditions = [eq(tiqetsAttractions.status, "published")];

      // City filter - normalize city names (handle slug format like "new-york" -> "New York")
      if (city && typeof city === "string" && city !== "all") {
        const normalizedCity = city
          .split("-")
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        conditions.push(ilike(tiqetsAttractions.cityName, normalizedCity));
      }

      // Text search - search in title and metaDescription
      if (q && typeof q === "string" && q.trim()) {
        const searchTerm = `%${q.trim()}%`;
        conditions.push(
          or(
            ilike(tiqetsAttractions.title, searchTerm),
            ilike(tiqetsAttractions.metaDescription, searchTerm)
          )!
        );
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tiqetsAttractions)
        .where(and(...conditions));

      const total = countResult[0]?.count || 0;
      const totalPages = Math.ceil(total / pageSizeNum);

      // Query with SQL-level pagination
      const attractions = await db
        .select({
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

      // Transform to match ContentWithRelations format expected by frontend
      const transformedAttractions = attractions.map(attr => {
        // Extract image URL from various possible formats
        // tiqetsImages is an array of image objects with {large, medium, small, extra_large} keys
        const images = attr.images as any;
        const tiqetsImages = attr.tiqetsImages as any;
        let imageUrl: string | null = null;

        // First check tiqetsImages (primary image source)
        if (tiqetsImages && Array.isArray(tiqetsImages) && tiqetsImages.length > 0) {
          const firstImage = tiqetsImages[0];
          // Handle both object format {large, medium} and string format
          if (typeof firstImage === "object" && firstImage !== null) {
            imageUrl =
              firstImage.large || firstImage.extra_large || firstImage.medium || firstImage.small;
          } else if (typeof firstImage === "string") {
            imageUrl = firstImage;
          }
        }

        // Fallback to images array if tiqetsImages didn't provide a URL
        if (!imageUrl && images && Array.isArray(images) && images.length > 0) {
          const firstImage = images[0];
          if (typeof firstImage === "object" && firstImage !== null) {
            imageUrl =
              firstImage.large || firstImage.extra_large || firstImage.medium || firstImage.url;
          } else if (typeof firstImage === "string") {
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
          rating: attr.rating ? Number.parseFloat(String(attr.rating)) : null,
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
        totalPages,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attractions" });
    }
  });
}
