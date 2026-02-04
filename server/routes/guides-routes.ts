import { Router, Request, Response } from "express";
import { db } from "../db";
import { update9987Guides, destinations } from "@shared/schema";
import { eq, desc, ilike, and, isNotNull, sql } from "drizzle-orm";
import {
  importWikivoyageGuide,
  runFullWikivoyageIngestion,
  getAvailableDestinations,
  getAvailableLocales,
} from "../services/wikivoyage-ingestion";

const router = Router();

interface GuideTranslation {
  locale: string;
  title: string;
  summary: string;
  sections: Array<{ level: number; heading: string; content: string }>;
  sourceUrl: string;
  lastFetched: string;
}

interface GuideSections {
  translations: Record<string, GuideTranslation>;
  primaryLocale: string;
}

router.get("/api/public/guides", async (req: Request, res: Response) => {
  try {
    const locale = (req.query.locale as string) || "en";
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const guides = await db
      .select()
      .from(update9987Guides)
      .where(eq(update9987Guides.status, "published"))
      .orderBy(desc(update9987Guides.publishedAt))
      .limit(limit)
      .offset(offset);

    const formattedGuides = guides.map(guide => {
      const sections = guide.sections as GuideSections | null;
      const translation = sections?.translations?.[locale] || sections?.translations?.en;

      return {
        id: guide.id,
        slug: guide.slug,
        title: translation?.title || guide.title,
        summary: translation?.summary || "",
        locale,
        availableLocales: sections?.translations ? Object.keys(sections.translations) : ["en"],
        destinationType: guide.destinationType,
        publishedAt: guide.publishedAt,
        sourceUrl: translation?.sourceUrl,
      };
    });

    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(update9987Guides)
      .where(eq(update9987Guides.status, "published"));

    res.json({
      guides: formattedGuides,
      total: Number(total[0]?.count || 0),
      locale,
      limit,
      offset,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch guides" });
  }
});

router.get("/api/public/guides/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const locale = (req.query.locale as string) || "en";

    const guide = await db
      .select()
      .from(update9987Guides)
      .where(eq(update9987Guides.slug, slug))
      .limit(1);

    if (!guide.length) {
      return res.status(404).json({ error: "Guide not found" });
    }

    const guideData = guide[0];
    const sections = guideData.sections as GuideSections | null;
    const translation = sections?.translations?.[locale] || sections?.translations?.en;
    const availableLocales = sections?.translations ? Object.keys(sections.translations) : ["en"];

    // Extract SEO data from the guide (from rewrite service or default)
    const seoData = {
      metaTitle: guideData.metaTitle || translation?.title || guideData.title,
      metaDescription: guideData.metaDescription || translation?.summary || "",
      focusKeyword: guideData.focusKeyword || null,
      secondaryKeywords: (guideData.secondaryKeywords as string[] | null) || [],
    };

    // Get FAQs from rewrite service (if available)
    const faqs = (guideData.faqs as Array<{ question: string; answer: string }> | null) || [];

    // Get images from rewrite service (if available)
    const images =
      (guideData.images as Array<{
        id: string;
        url: string;
        altText: string;
        credit: string;
        section: string;
      }> | null) || [];

    // Get schema markup from rewrite service or generate default
    const schemaMarkup = (guideData.schemaMarkup as Record<string, unknown> | null) || null;

    // Get OG tags from rewrite service
    const ogTags = (guideData.ogTags as Record<string, string> | null) || null;

    // Build default schema.org if no custom schema markup
    const defaultSchemaOrg = {
      "@context": "https://schema.org",
      "@type": "TravelGuide",
      name: seoData.metaTitle,
      description: seoData.metaDescription,
      url: `https://travi.world/guides/${slug}`,
      inLanguage: locale,
      datePublished: guideData.publishedAt?.toISOString(),
      publisher: {
        "@type": "Organization",
        name: "TRAVI",
        url: "https://travi.world",
      },
      about: {
        "@type": "Place",
        name: translation?.title || guideData.title,
      },
    };

    // Parse rawData for quick facts and best time to visit
    const rawData = guideData.rawData as Record<string, unknown> | null;
    const quickFacts = (rawData?.quickFacts as Record<string, string> | null) || null;
    const bestTimeToVisit =
      (rawData?.bestTimeToVisit as {
        summary: string;
        months?: Array<{ month: string; rating: string; notes: string }>;
      } | null) || null;

    const formattedGuide = {
      id: guideData.id,
      slug: guideData.slug,
      title: translation?.title || guideData.title,
      summary: translation?.summary || "",
      sections: translation?.sections || [],
      originalContent: guideData.originalContent,
      rewrittenContent: guideData.rewrittenContent,
      locale,
      availableLocales,
      destinationType: guideData.destinationType,
      publishedAt: guideData.publishedAt,
      sourceUrl: translation?.sourceUrl,
      lastFetched: translation?.lastFetched,
      // New structured content fields
      seo: seoData,
      faqs,
      images,
      schemaMarkup,
      ogTags,
      quickFacts,
      bestTimeToVisit,
      // Keep legacy schemaOrg for backwards compatibility
      schemaOrg: schemaMarkup?.travelGuide || defaultSchemaOrg,
    };

    res.json(formattedGuide);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch guide" });
  }
});

router.get("/api/public/guides/destination/:destinationId", async (req: Request, res: Response) => {
  try {
    const { destinationId } = req.params;
    const locale = (req.query.locale as string) || "en";
    const slug = `${destinationId}-travel-guide`;

    const guide = await db
      .select()
      .from(update9987Guides)
      .where(eq(update9987Guides.slug, slug))
      .limit(1);

    if (!guide.length) {
      return res.status(404).json({ error: "Guide not found for destination" });
    }

    const guideData = guide[0];
    const sections = guideData.sections as GuideSections | null;
    const translation = sections?.translations?.[locale] || sections?.translations?.en;

    res.json({
      id: guideData.id,
      slug: guideData.slug,
      title: translation?.title || guideData.title,
      summary: translation?.summary || "",
      sections: translation?.sections || [],
      locale,
      availableLocales: sections?.translations ? Object.keys(sections.translations) : ["en"],
      sourceUrl: translation?.sourceUrl,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch destination guide" });
  }
});

router.post("/api/admin/guides/import-wikivoyage", async (req: Request, res: Response) => {
  try {
    const { destinationId, locales } = req.body;

    if (!destinationId) {
      return res.status(400).json({ error: "destinationId is required" });
    }

    const destName = destinationId
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
    const targetLocales = locales || getAvailableLocales();

    const result = await (importWikivoyageGuide as any)(destinationId, destName, targetLocales);

    res.json({
      success: result.success,
      imported: result.imported,
      errors: result.errors,
      message: result.success
        ? `Successfully imported ${result.imported} language versions for ${destName}`
        : `Failed to import guide for ${destName}`,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to import guide from Wikivoyage" });
  }
});

router.post("/api/admin/guides/import-all-wikivoyage", async (req: Request, res: Response) => {
  try {
    res.json({
      message: "Full Wikivoyage ingestion started in background",
      destinations: getAvailableDestinations(),
      locales: getAvailableLocales(),
    });

    runFullWikivoyageIngestion().catch(console.error);
  } catch (error) {
    res.status(500).json({ error: "Failed to start full Wikivoyage import" });
  }
});

router.get("/api/admin/guides/wikivoyage-status", async (req: Request, res: Response) => {
  try {
    const guides = await db
      .select({
        id: update9987Guides.id,
        title: update9987Guides.title,
        slug: update9987Guides.slug,
        status: update9987Guides.status,
        publishedAt: update9987Guides.publishedAt,
        sections: update9987Guides.sections,
        rawData: update9987Guides.rawData,
      })
      .from(update9987Guides)
      .orderBy(desc(update9987Guides.publishedAt));

    const summary = guides.map(g => {
      const sections = g.sections as GuideSections | null;
      const rawData = g.rawData as { source?: string; locales?: string[] } | null;

      return {
        id: g.id,
        title: g.title,
        slug: g.slug,
        status: g.status,
        publishedAt: g.publishedAt,
        source: rawData?.source || "unknown",
        localesCount: sections?.translations ? Object.keys(sections.translations).length : 0,
        locales: sections?.translations ? Object.keys(sections.translations) : [],
      };
    });

    res.json({
      total: guides.length,
      guides: summary,
      availableDestinations: getAvailableDestinations(),
      availableLocales: getAvailableLocales(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get Wikivoyage status" });
  }
});

export default router;
