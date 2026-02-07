import { SUPPORTED_LOCALES, type Locale, tiqetsAttractions } from "@shared/schema";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { createLogger } from "../lib/logger";

const sitemapLog = createLogger("sitemap");

const BASE_URL = "https://travi.world";

// ===========================================
// ACTIVE LANGUAGES FILTER
// All 30 locales enabled for infrastructure
// January 2026: Expanded from 17 to 30 locales
// ===========================================
const ACTIVE_LOCALES = new Set<Locale>([
  // Tier 1 - Core Markets
  "en", // English - primary
  "ar", // Arabic
  "hi", // Hindi
  // Tier 2 - High ROI Markets
  "zh", // Chinese
  "ru", // Russian
  "ur", // Urdu
  "fr", // French
  "id", // Indonesian
  // Tier 3 - Growing Markets (Southeast Asia focus)
  "de", // German
  "fa", // Persian
  "bn", // Bengali
  "fil", // Filipino
  "th", // Thai
  "vi", // Vietnamese
  "ms", // Malay
  // Tier 4 - Niche Markets
  "es", // Spanish
  "tr", // Turkish
  "it", // Italian
  "ja", // Japanese
  "ko", // Korean
  "he", // Hebrew
  "pt", // Portuguese
  // Tier 5 - European Expansion
  "nl", // Dutch
  "pl", // Polish
  "sv", // Swedish
  "el", // Greek
  "cs", // Czech
  "ro", // Romanian
  "uk", // Ukrainian
  "hu", // Hungarian
  "da", // Danish
  "no", // Norwegian
]);

// Helper to check if a locale is active
function isLocaleActive(locale: Locale): boolean {
  return ACTIVE_LOCALES.has(locale);
}

// Get only active locales from SUPPORTED_LOCALES
function getActiveLocales() {
  return SUPPORTED_LOCALES.filter(l => isLocaleActive(l.code));
}

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  alternates?: { locale: Locale; url: string }[];
}

// Generate XML for a single URL entry
function generateUrlXml(url: SitemapUrl): string {
  let xml = "  <url>\n";
  xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;

  if (url.lastmod) {
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
  }

  if (url.changefreq) {
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
  }

  if (url.priority !== undefined) {
    xml += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
  }

  // Add hreflang alternates using xhtml:link
  // Only include ACTIVE locales
  if (url.alternates && url.alternates.length > 0) {
    const activeAlternates = url.alternates.filter(a => isLocaleActive(a.locale));

    for (const alt of activeAlternates) {
      xml += `    <xhtml:link rel="alternate" hreflang="${alt.locale}" href="${escapeXml(alt.url)}" />\n`;
    }
    // Add x-default pointing to English
    const enAlt = activeAlternates.find(a => a.locale === "en");
    if (enAlt) {
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(enAlt.url)}" />\n`;
    }
  }

  xml += "  </url>\n";
  return xml;
}

// Escape special XML characters
function escapeXml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// Generate sitemap XML
function generateSitemapXml(urls: SitemapUrl[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  for (const url of urls) {
    xml += generateUrlXml(url);
  }

  xml += "</urlset>";
  return xml;
}

// Generate sitemap index XML
function generateSitemapIndexXml(sitemaps: { loc: string; lastmod?: string }[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const sitemap of sitemaps) {
    xml += "  <sitemap>\n";
    xml += `    <loc>${escapeXml(sitemap.loc)}</loc>\n`;
    if (sitemap.lastmod) {
      xml += `    <lastmod>${sitemap.lastmod}</lastmod>\n`;
    }
    xml += "  </sitemap>\n";
  }

  xml += "</sitemapindex>";
  return xml;
}

// Static pages definition - ONLY real, indexable pages
// Updated January 2026: Global travel platform (no Dubai bias at top level)
const STATIC_PAGES = [
  // Core Pages
  { path: "", priority: 1, changefreq: "daily" as const },

  // Main Category Pages (ONLY pages with real content)
  { path: "/destinations", priority: 0.9, changefreq: "daily" as const },
  { path: "/attractions", priority: 0.9, changefreq: "daily" as const },
  { path: "/guides", priority: 0.8, changefreq: "weekly" as const },
  { path: "/news", priority: 0.7, changefreq: "daily" as const },

  // Destination Pages (17 cities)
  { path: "/destinations/dubai", priority: 0.9, changefreq: "weekly" as const },
  { path: "/destinations/paris", priority: 0.9, changefreq: "weekly" as const },
  { path: "/destinations/tokyo", priority: 0.9, changefreq: "weekly" as const },
  { path: "/destinations/new-york", priority: 0.9, changefreq: "weekly" as const },
  { path: "/destinations/london", priority: 0.9, changefreq: "weekly" as const },
  { path: "/destinations/barcelona", priority: 0.9, changefreq: "weekly" as const },
  { path: "/destinations/singapore", priority: 0.9, changefreq: "weekly" as const },
  { path: "/destinations/bangkok", priority: 0.9, changefreq: "weekly" as const },
  { path: "/destinations/abu-dhabi", priority: 0.8, changefreq: "weekly" as const },
  { path: "/destinations/amsterdam", priority: 0.8, changefreq: "weekly" as const },
  { path: "/destinations/hong-kong", priority: 0.8, changefreq: "weekly" as const },
  { path: "/destinations/istanbul", priority: 0.8, changefreq: "weekly" as const },
  { path: "/destinations/las-vegas", priority: 0.8, changefreq: "weekly" as const },
  { path: "/destinations/los-angeles", priority: 0.8, changefreq: "weekly" as const },
  { path: "/destinations/miami", priority: 0.8, changefreq: "weekly" as const },
  { path: "/destinations/rome", priority: 0.8, changefreq: "weekly" as const },
  { path: "/destinations/ras-al-khaimah", priority: 0.8, changefreq: "weekly" as const },

  // Dubai-specific content (allowed under /destinations/dubai/ hierarchy)
  { path: "/destinations/dubai/real-estate", priority: 0.9, changefreq: "daily" as const },
  { path: "/destinations/dubai/off-plan", priority: 0.9, changefreq: "daily" as const },
  {
    path: "/destinations/dubai/guides/rak-transport",
    priority: 0.7,
    changefreq: "monthly" as const,
  },
  {
    path: "/destinations/dubai/guides/rak-comparison",
    priority: 0.7,
    changefreq: "monthly" as const,
  },

  // Guide Pages (global)
  { path: "/guides/wynn-al-marjan-island", priority: 0.7, changefreq: "monthly" as const },
  { path: "/guides/jebel-jais-adventure", priority: 0.7, changefreq: "monthly" as const },
  { path: "/guides/where-to-stay-rak", priority: 0.7, changefreq: "monthly" as const },
  { path: "/guides/rak-real-estate-investment", priority: 0.7, changefreq: "monthly" as const },

  // Legal Pages (canonical only - no duplicates)
  { path: "/privacy", priority: 0.3, changefreq: "yearly" as const },
  { path: "/terms", priority: 0.3, changefreq: "yearly" as const },
  { path: "/cookies", priority: 0.3, changefreq: "yearly" as const },
  { path: "/security", priority: 0.3, changefreq: "yearly" as const },
  { path: "/affiliate-disclosure", priority: 0.3, changefreq: "yearly" as const },

  // Company Pages
  { path: "/about", priority: 0.5, changefreq: "monthly" as const },
  { path: "/contact", priority: 0.5, changefreq: "monthly" as const },

  // Partner Pages
  { path: "/partners/join", priority: 0.5, changefreq: "monthly" as const },
];

function buildLocaleUrl(locale: Locale, path: string): string {
  return locale === "en" ? `${BASE_URL}${path || "/"}` : `${BASE_URL}/${locale}${path}`;
}

function getStaticPageUrls(locale: Locale, now: string): SitemapUrl[] {
  const activeLocales = getActiveLocales();
  return STATIC_PAGES.map(page => {
    const alternates = activeLocales.map(l => ({
      locale: l.code,
      url: buildLocaleUrl(l.code, page.path),
    }));

    return {
      loc: buildLocaleUrl(locale, page.path),
      lastmod: now,
      changefreq: page.changefreq,
      priority: page.priority,
      alternates,
    };
  });
}

async function getDestinationAttractionUrls(now: string): Promise<SitemapUrl[]> {
  try {
    const destinationCounts = await db
      .select({ cityName: tiqetsAttractions.cityName })
      .from(tiqetsAttractions)
      .where(eq(tiqetsAttractions.status, "published"))
      .groupBy(tiqetsAttractions.cityName);

    return destinationCounts
      .filter(dest => !!dest.cityName)
      .map(dest => ({
        loc: `${BASE_URL}/attractions/list/${dest.cityName!.toLowerCase().replaceAll(" ", "-")}`,
        lastmod: now,
        changefreq: "daily" as const,
        priority: 0.85,
      }));
  } catch (error) {
    sitemapLog.error({ err: error }, "Sitemap generation error");
    return [];
  }
}

async function getDynamicContentUrls(locale: Locale, now: string): Promise<SitemapUrl[]> {
  try {
    const contents = await storage.getContents();
    const publishedContents = contents.filter(c => c.status === "published");
    const urls: SitemapUrl[] = [];

    for (const content of publishedContents) {
      const contentPath = `/${content.type}/${content.slug}`;
      const lastmod = content.updatedAt
        ? new Date(content.updatedAt).toISOString().split("T")[0]
        : now;

      const translations = await storage.getTranslationsByContentId(content.id);
      const availableActiveLocales = ["en", ...translations.map(t => t.locale)].filter(l =>
        isLocaleActive(l as Locale)
      ) as Locale[];

      const alternates = availableActiveLocales.map(l => ({
        locale: l,
        url: l === "en" ? `${BASE_URL}${contentPath}` : `${BASE_URL}/${l}${contentPath}`,
      }));

      const hasTranslation = locale === "en" || translations.some(t => t.locale === locale);
      if (isLocaleActive(locale) && hasTranslation) {
        urls.push({
          loc:
            locale === "en" ? `${BASE_URL}${contentPath}` : `${BASE_URL}/${locale}${contentPath}`,
          lastmod,
          changefreq: "weekly",
          priority: 0.7,
          alternates,
        });
      }
    }
    return urls;
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function getTiqetsAttractionUrls(now: string): Promise<SitemapUrl[]> {
  try {
    const attractions = await db
      .select({
        seoSlug: tiqetsAttractions.seoSlug,
        updatedAt: tiqetsAttractions.updatedAt,
      })
      .from(tiqetsAttractions);

    return attractions
      .filter(a => !!a.seoSlug)
      .map(attraction => ({
        loc: `${BASE_URL}/attractions/${attraction.seoSlug}`,
        lastmod: attraction.updatedAt
          ? new Date(attraction.updatedAt).toISOString().split("T")[0]
          : now,
        changefreq: "weekly" as const,
        priority: 0.6,
      }));
  } catch (error) {
    sitemapLog.error({ err: error }, "Sitemap generation error");
    return [];
  }
}

// Get all URLs for a specific locale
async function getUrlsForLocale(locale: Locale): Promise<SitemapUrl[]> {
  if (!isLocaleActive(locale)) return [];

  const now = new Date().toISOString().split("T")[0];
  const urls: SitemapUrl[] = getStaticPageUrls(locale, now);

  if (locale === "en") {
    urls.push(...(await getDestinationAttractionUrls(now)));
  }

  urls.push(...(await getDynamicContentUrls(locale, now)));

  if (locale === "en") {
    urls.push(...(await getTiqetsAttractionUrls(now)));
  }

  return urls;
}

// Generate sitemap for a specific locale
export async function generateLocaleSitemap(locale: Locale): Promise<string> {
  // Return empty sitemap for inactive locales
  if (!isLocaleActive(locale)) {
    return generateSitemapXml([]);
  }

  const urls = await getUrlsForLocale(locale);
  return generateSitemapXml(urls);
}

// Generate main sitemap index
// Only includes ACTIVE locales
export async function generateSitemapIndex(): Promise<string> {
  const now = new Date().toISOString().split("T")[0];

  // Only generate sitemap entries for ACTIVE locales
  const sitemaps = getActiveLocales().map(locale => ({
    loc: `${BASE_URL}/sitemap-${locale.code}.xml`,
    lastmod: now,
  }));

  return generateSitemapIndexXml(sitemaps);
}

// Generate all sitemaps (for build time or cron job)
// Only generates for ACTIVE locales
export async function generateAllSitemaps(): Promise<Map<string, string>> {
  const sitemaps = new Map<string, string>();

  // Generate main sitemap index
  sitemaps.set("sitemap.xml", await generateSitemapIndex());

  // Generate locale-specific sitemaps ONLY for active locales
  for (const locale of getActiveLocales()) {
    const sitemapXml = await generateLocaleSitemap(locale.code);
    sitemaps.set(`sitemap-${locale.code}.xml`, sitemapXml);
  }

  return sitemaps;
}

// Generate robots.txt
// Clean, standards-compliant format for maximum crawlability
export function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Disallow: /private/

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;
}
