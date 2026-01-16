import { Router, Request, Response } from "express";
import { db } from "../db";
import { update9987Guides, update9987PublicHolidays, update9987Countries, destinationContent } from "@shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

const router = Router();

interface GuideSection {
  level: number;
  heading: string;
  content: string;
}

interface GuideTranslation {
  locale: string;
  title: string;
  summary: string;
  sections: GuideSection[];
  sourceUrl: string;
  lastFetched: string;
}

interface GuideSections {
  translations: Record<string, GuideTranslation>;
  primaryLocale: string;
}

const SECTION_TYPE_MAPPINGS: Record<string, string[]> = {
  sleep: ["Sleep", "Schlafen", "Dormir", "Dormire", "Sueño", "宿泊", "숙박", "住宿", "Спать", "Uyku"],
  eat: ["Eat", "Essen", "Manger", "Mangiare", "Comer", "食べる", "먹다", "美食", "Есть", "Yemek"],
  see: ["See", "Sehen", "Voir", "Vedere", "Ver", "見る", "보다", "景点", "Смотреть", "Görmek"],
  do: ["Do", "Aktivitäten", "Faire", "Fare", "Hacer", "する", "하다", "活动", "Делать", "Yapmak"],
  "get-in": ["Get in", "Anreise", "Arriver", "Arrivare", "Llegar", "着く", "도착", "到达", "Прибытие", "Ulaşım"],
  "get-around": ["Get around", "Mobilität", "Se déplacer", "Spostarsi", "Moverse", "移動", "이동", "交通", "Передвижение", "Dolaşmak"],
  buy: ["Buy", "Kaufen", "Acheter", "Comprare", "Comprar", "買う", "쇼핑", "购物", "Покупки", "Alışveriş"],
  drink: ["Drink", "Trinken", "Boire", "Bere", "Beber", "飲む", "마시다", "饮品", "Напитки", "İçecek"],
  background: ["Background", "Hintergrund", "Contexte", "Sfondo", "Contexto", "背景", "배경", "背景", "Фон", "Arka plan"],
  understand: ["Understand", "Verstehen", "Comprendre", "Capire", "Entender", "理解", "이해", "了解", "Понимать", "Anlamak"],
  respect: ["Respect", "Respekt", "Respecter", "Rispetto", "Respeto", "尊重", "존중", "尊重", "Уважение", "Saygı"],
  "stay-safe": ["Stay safe", "Sicherheit", "Sécurité", "Sicurezza", "Seguridad", "安全", "안전", "安全", "Безопасность", "Güvenlik"],
  "stay-healthy": ["Stay healthy", "Gesundheit", "Santé", "Salute", "Salud", "健康", "건강", "健康", "Здоровье", "Sağlık"],
  connect: ["Connect", "Verbinden", "Communiquer", "Comunicare", "Conectar", "通信", "연결", "通讯", "Связь", "İletişim"],
  cope: ["Cope", "Bewältigen", "Faire face", "Affrontare", "Afrontar", "対処", "대처", "应对", "Справиться", "Başa çıkmak"],
};

function findSectionByType(sections: GuideSection[], sectionType: string): GuideSection | null {
  const mappings = SECTION_TYPE_MAPPINGS[sectionType] || [];
  
  // First pass: Look for EXACT matches at level 2 (main sections)
  for (const section of sections) {
    if (section.level !== 2) continue;
    const headingLower = section.heading.toLowerCase().trim();
    for (const mapping of mappings) {
      if (headingLower === mapping.toLowerCase()) {
        return section;
      }
    }
  }
  
  // Second pass: Look for exact matches at any level
  for (const section of sections) {
    const headingLower = section.heading.toLowerCase().trim();
    for (const mapping of mappings) {
      if (headingLower === mapping.toLowerCase()) {
        return section;
      }
    }
  }
  
  // Third pass: Look for headings that START WITH the mapping (not contains)
  // This handles cases like "See & Do" or "Eat and Drink"
  for (const section of sections) {
    if (section.level !== 2) continue;
    const headingLower = section.heading.toLowerCase().trim();
    for (const mapping of mappings) {
      if (headingLower.startsWith(mapping.toLowerCase())) {
        return section;
      }
    }
  }
  
  return null;
}

function extractEssentialsFromSections(sections: GuideSection[]): Record<string, any> {
  const essentials: Record<string, any> = {
    visa: null,
    currency: null,
    weather: null,
    safety: null,
    health: null,
    language: null,
    electricity: null,
    timezone: null,
  };

  for (const section of sections) {
    const heading = section.heading.toLowerCase();
    const content = section.content;

    if (heading.includes("understand") || heading.includes("verstehen") || heading.includes("background")) {
      const visaMatch = content.match(/visa[s]?\s*(?:are\s*)?(?:required|not required|on arrival|free|exempt)/i);
      if (visaMatch) {
        essentials.visa = visaMatch[0];
      }
      
      const currencyMatch = content.match(/(?:currency|money|währung)[\s:]*([A-Z]{3}|\w+\s+\w+)/i);
      if (currencyMatch) {
        essentials.currency = currencyMatch[1];
      }
      
      const languageMatch = content.match(/(?:official language|spoken|language)[\s:]*(\w+)/i);
      if (languageMatch) {
        essentials.language = languageMatch[1];
      }
    }

    if (heading.includes("stay safe") || heading.includes("sicherheit") || heading.includes("security")) {
      essentials.safety = content.substring(0, 500);
    }

    if (heading.includes("stay healthy") || heading.includes("gesundheit") || heading.includes("health")) {
      essentials.health = content.substring(0, 500);
    }

    if (heading.includes("cope") || heading.includes("connect")) {
      const electricityMatch = content.match(/(?:electricity|voltage|plug|socket)[\s:]*(\d+\s*V|\w+\s+type)/i);
      if (electricityMatch) {
        essentials.electricity = electricityMatch[1];
      }
      
      const timezoneMatch = content.match(/(?:timezone|time zone|UTC|GMT)[\s:]*([+-]?\d+)/i);
      if (timezoneMatch) {
        essentials.timezone = `UTC${timezoneMatch[1]}`;
      }
    }
  }

  return essentials;
}

function categorizeSections(sections: GuideSection[]): Record<string, GuideSection[]> {
  const categorized: Record<string, GuideSection[]> = {};
  
  for (const [type, mappings] of Object.entries(SECTION_TYPE_MAPPINGS)) {
    categorized[type] = [];
    
    for (const section of sections) {
      const headingLower = section.heading.toLowerCase().trim();
      for (const mapping of mappings) {
        // Use exact match or startsWith for level 2, exact match only for nested
        const isExactMatch = headingLower === mapping.toLowerCase();
        const isStartsWithAtLevel2 = section.level === 2 && headingLower.startsWith(mapping.toLowerCase());
        
        if (isExactMatch || isStartsWithAtLevel2) {
          categorized[type].push(section);
          break;
        }
      }
    }
  }
  
  return categorized;
}

router.get("/api/public/destination-content/types", async (_req: Request, res: Response) => {
  res.json({
    sectionTypes: Object.keys(SECTION_TYPE_MAPPINGS),
    mappings: SECTION_TYPE_MAPPINGS,
  });
});

router.get("/api/public/destination-content/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const locale = (req.query.locale as string) || "en";

    const guideSlug = slug.endsWith("-travel-guide") ? slug : `${slug}-travel-guide`;

    const guide = await db
      .select()
      .from(update9987Guides)
      .where(eq(update9987Guides.slug, guideSlug))
      .limit(1);

    if (!guide.length) {
      return res.status(404).json({ 
        error: "Guide not found",
        slug: guideSlug,
        availableFormats: ["<destination-slug>", "<destination-slug>-travel-guide"]
      });
    }

    const guideData = guide[0];
    const sections = guideData.sections as GuideSections | null;
    const translation = sections?.translations?.[locale] || sections?.translations?.en;
    const availableLocales = sections?.translations ? Object.keys(sections.translations) : ["en"];

    const allSections = translation?.sections || [];
    const categorizedSections = categorizeSections(allSections);
    const essentials = extractEssentialsFromSections(allSections);

    let holidays: any[] = [];
    if (guideData.countryCode) {
      const today = new Date().toISOString().split('T')[0];
      holidays = await db
        .select()
        .from(update9987PublicHolidays)
        .where(
          and(
            eq(update9987PublicHolidays.countryCode, guideData.countryCode),
            gte(update9987PublicHolidays.date, today)
          )
        )
        .orderBy(update9987PublicHolidays.date)
        .limit(10);
    }

    res.json({
      id: guideData.id,
      slug: guideData.slug,
      title: translation?.title || guideData.title,
      summary: translation?.summary || "",
      destinationType: guideData.destinationType,
      countryCode: guideData.countryCode,
      locale,
      availableLocales,
      sections: categorizedSections,
      allSections: allSections,
      essentials,
      holidays: holidays.map(h => ({
        date: h.date,
        name: h.name,
        localName: h.localName,
        types: h.types,
        isGlobal: h.global,
      })),
      publishedAt: guideData.publishedAt,
      sourceUrl: translation?.sourceUrl,
      lastFetched: translation?.lastFetched,
      schemaOrg: {
        "@context": "https://schema.org",
        "@type": "TravelGuide",
        name: translation?.title || guideData.title,
        description: translation?.summary || "",
        url: `https://travi.world/destinations/${slug}`,
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
      },
    });
  } catch (error) {
    console.error("[Destination Content API] Error fetching destination content:", error);
    res.status(500).json({ error: "Failed to fetch destination content" });
  }
});

router.get("/api/public/destination-content/:slug/section/:sectionType", async (req: Request, res: Response) => {
  try {
    const { slug, sectionType } = req.params;
    const locale = (req.query.locale as string) || "en";

    const validSectionTypes = Object.keys(SECTION_TYPE_MAPPINGS);
    if (!validSectionTypes.includes(sectionType)) {
      return res.status(400).json({ 
        error: "Invalid section type",
        validTypes: validSectionTypes,
        requested: sectionType
      });
    }

    const guideSlug = slug.endsWith("-travel-guide") ? slug : `${slug}-travel-guide`;

    const guide = await db
      .select()
      .from(update9987Guides)
      .where(eq(update9987Guides.slug, guideSlug))
      .limit(1);

    if (!guide.length) {
      return res.status(404).json({ error: "Guide not found" });
    }

    const guideData = guide[0];
    const sections = guideData.sections as GuideSections | null;
    const translation = sections?.translations?.[locale] || sections?.translations?.en;
    const allSections = translation?.sections || [];

    const matchedSection = findSectionByType(allSections, sectionType);

    if (!matchedSection) {
      return res.status(404).json({ 
        error: "Section not found",
        sectionType,
        availableSections: allSections.map(s => s.heading)
      });
    }

    const relatedSections = allSections.filter(s => {
      const headingLower = s.heading.toLowerCase();
      const mappings = SECTION_TYPE_MAPPINGS[sectionType] || [];
      return mappings.some(m => headingLower.includes(m.toLowerCase())) && s !== matchedSection;
    });

    res.json({
      slug: guideData.slug,
      destinationTitle: translation?.title || guideData.title,
      sectionType,
      locale,
      section: {
        heading: matchedSection.heading,
        content: matchedSection.content,
        level: matchedSection.level,
      },
      relatedSections: relatedSections.map(s => ({
        heading: s.heading,
        content: s.content,
        level: s.level,
      })),
      sourceUrl: translation?.sourceUrl,
      lastFetched: translation?.lastFetched,
    });
  } catch (error) {
    console.error("[Destination Content API] Error fetching section:", error);
    res.status(500).json({ error: "Failed to fetch section" });
  }
});

router.get("/api/public/holidays/:countryCode", async (req: Request, res: Response) => {
  try {
    const { countryCode } = req.params;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const limit = parseInt(req.query.limit as string) || 50;
    const upcoming = req.query.upcoming === "true";

    const upperCountryCode = countryCode.toUpperCase();

    let query = db
      .select()
      .from(update9987PublicHolidays)
      .where(eq(update9987PublicHolidays.countryCode, upperCountryCode));

    if (upcoming) {
      const today = new Date().toISOString().split('T')[0];
      query = db
        .select()
        .from(update9987PublicHolidays)
        .where(
          and(
            eq(update9987PublicHolidays.countryCode, upperCountryCode),
            gte(update9987PublicHolidays.date, today)
          )
        );
    } else {
      query = db
        .select()
        .from(update9987PublicHolidays)
        .where(
          and(
            eq(update9987PublicHolidays.countryCode, upperCountryCode),
            eq(update9987PublicHolidays.year, year)
          )
        );
    }

    const holidays = await query
      .orderBy(update9987PublicHolidays.date)
      .limit(limit);

    if (!holidays.length) {
      return res.json({
        countryCode: upperCountryCode,
        year: upcoming ? null : year,
        upcoming,
        holidays: [],
        message: "No holidays found for this country/period"
      });
    }

    const byMonth: Record<string, any[]> = {};
    holidays.forEach(h => {
      const month = h.date.substring(0, 7);
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push({
        date: h.date,
        name: h.name,
        localName: h.localName,
        types: h.types,
        isGlobal: h.global,
        isFixed: h.fixed,
      });
    });

    res.json({
      countryCode: upperCountryCode,
      year: upcoming ? null : year,
      upcoming,
      total: holidays.length,
      holidays: holidays.map(h => ({
        date: h.date,
        name: h.name,
        localName: h.localName,
        types: h.types,
        isGlobal: h.global,
        isFixed: h.fixed,
        counties: h.counties,
      })),
      byMonth,
    });
  } catch (error) {
    console.error("[Holidays API] Error fetching holidays:", error);
    res.status(500).json({ error: "Failed to fetch holidays" });
  }
});

router.get("/api/public/destination-content/:slug/essentials", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const locale = (req.query.locale as string) || "en";

    const guideSlug = slug.endsWith("-travel-guide") ? slug : `${slug}-travel-guide`;

    const guide = await db
      .select()
      .from(update9987Guides)
      .where(eq(update9987Guides.slug, guideSlug))
      .limit(1);

    if (!guide.length) {
      return res.status(404).json({ error: "Guide not found" });
    }

    const guideData = guide[0];
    const sections = guideData.sections as GuideSections | null;
    const translation = sections?.translations?.[locale] || sections?.translations?.en;
    const allSections = translation?.sections || [];

    const essentials = extractEssentialsFromSections(allSections);

    const understandSection = findSectionByType(allSections, "understand");
    const safetySection = findSectionByType(allSections, "stay-safe");
    const healthSection = findSectionByType(allSections, "stay-healthy");
    const connectSection = findSectionByType(allSections, "connect");
    const respectSection = findSectionByType(allSections, "respect");
    const getInSection = findSectionByType(allSections, "get-in");
    const getAroundSection = findSectionByType(allSections, "get-around");

    let countryInfo = null;
    if (guideData.countryCode) {
      const country = await db
        .select()
        .from(update9987Countries)
        .where(eq(update9987Countries.iso2, guideData.countryCode))
        .limit(1);
      
      if (country.length) {
        countryInfo = {
          name: country[0].name,
          iso2: country[0].iso2,
          iso3: country[0].iso3,
          capital: country[0].capital,
          currency: country[0].currency,
          currencyName: country[0].currencyName,
          currencySymbol: country[0].currencySymbol,
          region: country[0].region,
          subregion: country[0].subregion,
          phoneCode: country[0].phoneCode,
          tld: country[0].tld,
          emoji: country[0].emoji,
          latitude: country[0].latitude,
          longitude: country[0].longitude,
          translations: country[0].translations,
          timezones: country[0].timezones,
        };
      }
    }

    res.json({
      slug: guideData.slug,
      destinationTitle: translation?.title || guideData.title,
      locale,
      countryCode: guideData.countryCode,
      countryInfo,
      essentials: {
        ...essentials,
        ...(countryInfo && {
          currency: countryInfo.currency,
          currencyName: countryInfo.currencyName,
          currencySymbol: countryInfo.currencySymbol,
          phoneCode: countryInfo.phoneCode,
          timezones: countryInfo.timezones,
        }),
      },
      sections: {
        understand: understandSection ? {
          heading: understandSection.heading,
          content: understandSection.content,
        } : null,
        safety: safetySection ? {
          heading: safetySection.heading,
          content: safetySection.content,
        } : null,
        health: healthSection ? {
          heading: healthSection.heading,
          content: healthSection.content,
        } : null,
        communication: connectSection ? {
          heading: connectSection.heading,
          content: connectSection.content,
        } : null,
        respect: respectSection ? {
          heading: respectSection.heading,
          content: respectSection.content,
        } : null,
        gettingIn: getInSection ? {
          heading: getInSection.heading,
          content: getInSection.content,
        } : null,
        gettingAround: getAroundSection ? {
          heading: getAroundSection.heading,
          content: getAroundSection.content,
        } : null,
      },
      sourceUrl: translation?.sourceUrl,
      lastFetched: translation?.lastFetched,
    });
  } catch (error) {
    console.error("[Destination Content API] Error fetching essentials:", error);
    res.status(500).json({ error: "Failed to fetch essentials" });
  }
});

// ============ GUIDE REWRITE ENDPOINTS ============

import { guideRewriteService } from "../services/guide-rewrite-service";

// Get rewrite status for all guides
router.get("/api/destination-content/guides/rewrite-status", async (req: Request, res: Response) => {
  try {
    const status = await guideRewriteService.getRewriteStatus();
    res.json({ guides: status, total: status.length });
  } catch (error) {
    console.error("[Guide Rewrite] Error getting status:", error);
    res.status(500).json({ error: "Failed to get rewrite status" });
  }
});

// Rewrite a single guide by slug
router.post("/api/destination-content/guides/:slug/rewrite", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    console.log(`[Guide Rewrite] Starting rewrite for: ${slug}`);
    
    const result = await guideRewriteService.rewriteGuide(slug);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Guide ${slug} rewritten successfully`,
        cost: result.cost,
        model: result.model,
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error("[Guide Rewrite] Error:", error);
    res.status(500).json({ error: "Failed to rewrite guide" });
  }
});

// Rewrite all 19 target destinations
router.post("/api/destination-content/guides/rewrite-all", async (req: Request, res: Response) => {
  try {
    console.log("[Guide Rewrite] Starting batch rewrite for all destinations");
    
    // Return immediately and process in background
    res.json({
      success: true,
      message: "Batch rewrite started. Check /api/destination-content/guides/rewrite-status for progress.",
    });
    
    // Process in background with proper error handling
    console.log("[Guide Rewrite] Initiating background process...");
    
    // Use setImmediate to ensure the response is sent first
    setImmediate(async () => {
      try {
        console.log("[Guide Rewrite] Background process started");
        const results = await guideRewriteService.rewriteAllDestinations();
        console.log("[Guide Rewrite] Batch complete:", JSON.stringify(results));
      } catch (error) {
        console.error("[Guide Rewrite] Background batch error:", error);
      }
    });
    
  } catch (error) {
    console.error("[Guide Rewrite] Error starting batch:", error);
    res.status(500).json({ error: "Failed to start batch rewrite" });
  }
});

// FORCE rewrite all guides (clears existing rewrites and starts fresh)
// Use this when prompt/quality has been improved
router.post("/api/destination-content/guides/force-rewrite-all", async (req: Request, res: Response) => {
  try {
    console.log("[Guide Rewrite] FORCE REWRITE: Clearing all existing rewrites and starting fresh");
    
    // Return immediately and process in background
    res.json({
      success: true,
      message: "Force rewrite started. All existing rewrites cleared. Check /api/destination-content/guides/rewrite-status for progress.",
    });
    
    // Process in background
    setImmediate(async () => {
      try {
        console.log("[Guide Rewrite] Force rewrite background process started");
        const results = await guideRewriteService.forceRewriteAllDestinations();
        console.log("[Guide Rewrite] Force rewrite complete:", JSON.stringify(results));
      } catch (error) {
        console.error("[Guide Rewrite] Force rewrite error:", error);
      }
    });
    
  } catch (error) {
    console.error("[Guide Rewrite] Error starting force rewrite:", error);
    res.status(500).json({ error: "Failed to start force rewrite" });
  }
});

// Get structured guide data (for frontend rendering)
router.get("/api/destination-content/guides/:slug/structured", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const [guide] = await db.select()
      .from(update9987Guides)
      .where(eq(update9987Guides.slug, slug))
      .limit(1);
    
    if (!guide) {
      return res.status(404).json({ error: "Guide not found" });
    }
    
    // If rewritten content exists, parse and return it
    if (guide.rewrittenContent) {
      try {
        const structured = JSON.parse(guide.rewrittenContent);
        return res.json(structured);
      } catch {
        // Fall through to raw content
      }
    }
    
    // Return basic guide data if not rewritten yet
    res.json({
      id: guide.id,
      title: guide.title,
      slug: guide.slug,
      status: guide.status,
      hasRewrittenContent: false,
      originalContentLength: guide.originalContent?.length || 0,
    });
  } catch (error) {
    console.error("[Guide Structured] Error:", error);
    res.status(500).json({ error: "Failed to get structured guide" });
  }
});

// ============ MOBILITY DATA ENDPOINTS ============

// Public: GET mobility data for destination
router.get("/api/public/destinations/:slug/mobility", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const mobilityData = await db.select()
      .from(destinationContent)
      .where(and(
        eq(destinationContent.destinationId, slug),
        eq(destinationContent.contentType, "mobility"),
        eq(destinationContent.isActive, true)
      ))
      .limit(1);
    
    if (!mobilityData.length) {
      return res.status(404).json({ 
        error: "Mobility data not found",
        slug,
        message: "No mobility/transport data available for this destination yet"
      });
    }
    
    const record = mobilityData[0];
    const content = record.content as Record<string, any>;
    
    res.json({
      destinationId: slug,
      ...content,
      updatedAt: record.updatedAt,
    });
  } catch (error) {
    console.error("[Mobility API] Error fetching mobility data:", error);
    res.status(500).json({ error: "Failed to fetch mobility data" });
  }
});

// Admin: GET mobility data for editing
router.get("/api/admin/destinations/:slug/mobility", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const mobilityData = await db.select()
      .from(destinationContent)
      .where(and(
        eq(destinationContent.destinationId, slug),
        eq(destinationContent.contentType, "mobility")
      ))
      .limit(1);
    
    if (!mobilityData.length) {
      return res.json({
        destinationId: slug,
        exists: false,
        data: null,
      });
    }
    
    const record = mobilityData[0];
    
    res.json({
      destinationId: slug,
      exists: true,
      data: record.content,
      isActive: record.isActive,
      version: record.version,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
    });
  } catch (error) {
    console.error("[Mobility Admin API] Error fetching mobility data:", error);
    res.status(500).json({ error: "Failed to fetch mobility data" });
  }
});

// Admin: PUT (upsert) mobility data
router.put("/api/admin/destinations/:slug/mobility", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const mobilityContent = req.body;
    
    // Check if record exists
    const existing = await db.select()
      .from(destinationContent)
      .where(and(
        eq(destinationContent.destinationId, slug),
        eq(destinationContent.contentType, "mobility")
      ))
      .limit(1);
    
    if (existing.length) {
      // Update existing record
      await db.update(destinationContent)
        .set({
          content: mobilityContent,
          isActive: true,
          version: (existing[0].version || 1) + 1,
          updatedAt: new Date(),
        })
        .where(eq(destinationContent.id, existing[0].id));
      
      res.json({
        success: true,
        message: "Mobility data updated",
        version: (existing[0].version || 1) + 1,
      });
    } else {
      // Insert new record
      await db.insert(destinationContent).values({
        destinationId: slug,
        contentType: "mobility",
        content: mobilityContent,
        isActive: true,
        version: 1,
      });
      
      res.json({
        success: true,
        message: "Mobility data created",
        version: 1,
      });
    }
  } catch (error) {
    console.error("[Mobility Admin API] Error saving mobility data:", error);
    res.status(500).json({ error: "Failed to save mobility data" });
  }
});

router.get("/api/public/destinations/:slug/seasons", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const seasonsData = await db.select()
      .from(destinationContent)
      .where(and(
        eq(destinationContent.destinationId, slug),
        eq(destinationContent.contentType, "seasons"),
        eq(destinationContent.isActive, true)
      ))
      .limit(1);
    
    if (!seasonsData.length) {
      return res.status(404).json({ 
        error: "Seasons data not found",
        slug,
        message: "No climate data available for this destination yet"
      });
    }
    
    const content = seasonsData[0].content as { seasons: any[] };
    
    res.json({
      destinationId: slug,
      seasons: content.seasons || [],
      generatedBy: seasonsData[0].generatedBy,
      generatedModel: seasonsData[0].generatedModel,
      updatedAt: seasonsData[0].updatedAt,
    });
  } catch (error) {
    console.error("[Seasons API] Error fetching seasons:", error);
    res.status(500).json({ error: "Failed to fetch seasons data" });
  }
});

export default router;
