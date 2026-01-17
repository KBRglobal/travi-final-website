import { SUPPORTED_LOCALES, type Locale, tiqetsAttractions, helpCategories, helpArticles } from "@shared/schema";
import { storage } from "../storage";
import { db } from "../db";
import { eq, and } from "drizzle-orm";

const BASE_URL = process.env.BASE_URL || "https://travi.world";

// ===========================================
// ACTIVE LANGUAGES FILTER
// Only generate sitemaps for languages that are actually live
// Update this array when new translations go live
// ===========================================
const ACTIVE_LOCALES: Locale[] = ["en"];

// Helper to check if a locale is active
function isLocaleActive(locale: Locale): boolean {
  return ACTIVE_LOCALES.includes(locale);
}

// Get only active locales from SUPPORTED_LOCALES
function getActiveLocales() {
  return SUPPORTED_LOCALES.filter((l) => isLocaleActive(l.code as Locale));
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
    const activeAlternates = url.alternates.filter((a) => isLocaleActive(a.locale));

    for (const alt of activeAlternates) {
      xml += `    <xhtml:link rel="alternate" hreflang="${alt.locale}" href="${escapeXml(alt.url)}" />\n`;
    }
    // Add x-default pointing to English
    const enAlt = activeAlternates.find((a) => a.locale === "en");
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
function generateSitemapIndexXml(
  sitemaps: { loc: string; lastmod?: string }[]
): string {
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

// Get all URLs for a specific locale
async function getUrlsForLocale(locale: Locale): Promise<SitemapUrl[]> {
  // Skip inactive locales
  if (!isLocaleActive(locale)) {
    return [];
  }

  const urls: SitemapUrl[] = [];
  const now = new Date().toISOString().split("T")[0];

  // Static pages - ONLY pages that are actually implemented
  // Verified against client/src/routes/index.ts and client/src/App.tsx
  const staticPages = [
    // Core Pages
    { path: "", priority: 1.0, changefreq: "daily" as const },
    // /search - EXCLUDED: Legacy internal Dubai search page, not public-facing

    // Main Category Pages
    { path: "/destinations", priority: 0.9, changefreq: "daily" as const },
    { path: "/attractions", priority: 0.9, changefreq: "daily" as const },
    { path: "/hotels", priority: 0.9, changefreq: "daily" as const },
    { path: "/dining", priority: 0.8, changefreq: "daily" as const },
    { path: "/articles", priority: 0.8, changefreq: "daily" as const },
    { path: "/events", priority: 0.7, changefreq: "daily" as const },

    // Destination Pages (16 Tiqets cities)
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

    // Off-Plan Real Estate (only implemented pages)
    { path: "/dubai-real-estate", priority: 0.9, changefreq: "daily" as const },
    { path: "/dubai-off-plan-properties", priority: 0.9, changefreq: "daily" as const },

    // Guides Hub + RAK Guides
    { path: "/guides", priority: 0.8, changefreq: "weekly" as const },
    { path: "/guides/wynn-al-marjan-island", priority: 0.7, changefreq: "monthly" as const },
    { path: "/guides/jebel-jais-adventure", priority: 0.7, changefreq: "monthly" as const },
    { path: "/guides/dubai-to-rak-transport", priority: 0.7, changefreq: "monthly" as const },
    { path: "/guides/dubai-vs-rak", priority: 0.7, changefreq: "monthly" as const },
    { path: "/guides/where-to-stay-rak", priority: 0.7, changefreq: "monthly" as const },
    { path: "/guides/rak-real-estate-investment", priority: 0.7, changefreq: "monthly" as const },

    // Help Center - EXCLUDED: Currently broken ("Help center is currently unavailable")
    // { path: "/help", priority: 0.6, changefreq: "weekly" as const },

    // Glossary
    { path: "/glossary", priority: 0.6, changefreq: "monthly" as const },

    // Shopping & News
    { path: "/shopping", priority: 0.6, changefreq: "weekly" as const },
    { path: "/news", priority: 0.7, changefreq: "daily" as const },

    // Legal Pages (canonical + common aliases for user discovery)
    { path: "/privacy", priority: 0.3, changefreq: "yearly" as const },
    { path: "/privacy-policy", priority: 0.3, changefreq: "yearly" as const },
    { path: "/terms", priority: 0.3, changefreq: "yearly" as const },
    { path: "/terms-conditions", priority: 0.3, changefreq: "yearly" as const },
    { path: "/cookies", priority: 0.3, changefreq: "yearly" as const },
    { path: "/cookie-policy", priority: 0.3, changefreq: "yearly" as const },
    { path: "/security", priority: 0.3, changefreq: "yearly" as const },
    { path: "/affiliate-disclosure", priority: 0.3, changefreq: "yearly" as const },
    
    // Travel Guides (alias for /guides)
    { path: "/travel-guides", priority: 0.8, changefreq: "weekly" as const },

    // About & Contact
    { path: "/about", priority: 0.5, changefreq: "monthly" as const },
    { path: "/contact", priority: 0.5, changefreq: "monthly" as const },

    // Partner Pages
    { path: "/partners/join", priority: 0.5, changefreq: "monthly" as const },
  ];

  for (const page of staticPages) {
    // Only include alternates for ACTIVE locales
    const activeLocales = getActiveLocales();
    const alternates = activeLocales.map((l) => ({
      locale: l.code as Locale,
      url: l.code === "en" 
        ? `${BASE_URL}${page.path || "/"}` 
        : `${BASE_URL}/${l.code}${page.path}`,
    }));

    urls.push({
      loc: locale === "en" 
        ? `${BASE_URL}${page.path || "/"}` 
        : `${BASE_URL}/${locale}${page.path}`,
      lastmod: now,
      changefreq: page.changefreq,
      priority: page.priority,
      alternates,
    });
  }

  // Dynamic destination attraction pages (from tiqets_attractions - single source of truth)
  if (locale === "en") {
    try {
      const destinationCounts = await db
        .select({
          cityName: tiqetsAttractions.cityName,
        })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.status, "published"))
        .groupBy(tiqetsAttractions.cityName);
      
      for (const dest of destinationCounts) {
        if (!dest.cityName) continue;
        const slug = dest.cityName.toLowerCase().replace(/ /g, '-');
        urls.push({
          loc: `${BASE_URL}/attractions/list/${slug}`,
          lastmod: now,
          changefreq: "daily",
          priority: 0.85,
        });
      }
    } catch (error) {
      console.error("Error fetching destination attractions for sitemap:", error);
    }
  }

  // Dynamic content pages
  try {
    const contents = await storage.getContents();
    const publishedContents = contents.filter((c) => c.status === "published");

    for (const content of publishedContents) {
      const contentPath = `/${content.type}/${content.slug}`;
      const lastmod = content.updatedAt
        ? new Date(content.updatedAt).toISOString().split("T")[0]
        : now;

      // Get available translations for this content
      const translations = await storage.getTranslationsByContentId(content.id);

      // Filter to only ACTIVE locales that have translations
      const availableActiveLocales = ["en", ...translations.map((t) => t.locale)]
        .filter((l) => isLocaleActive(l as Locale)) as Locale[];

      const alternates = availableActiveLocales.map((l) => ({
        locale: l,
        url: l === "en" 
          ? `${BASE_URL}${contentPath}` 
          : `${BASE_URL}/${l}${contentPath}`,
      }));

      // Only add URL if this locale is active AND has a translation (or is English)
      if (isLocaleActive(locale) && (locale === "en" || translations.some((t) => t.locale === locale))) {
        urls.push({
          loc: locale === "en" 
            ? `${BASE_URL}${contentPath}` 
            : `${BASE_URL}/${locale}${contentPath}`,
          lastmod,
          changefreq: "weekly",
          priority: 0.7,
          alternates,
        });
      }
    }
  } catch (error) {
    console.error("Error fetching contents for sitemap:", error);
  }

  // Tiqets attractions pages (English only for now)
  if (locale === "en") {
    try {
      const attractions = await db.select({
        seoSlug: tiqetsAttractions.seoSlug,
        updatedAt: tiqetsAttractions.updatedAt,
      }).from(tiqetsAttractions);

      let addedCount = 0;
      for (const attraction of attractions) {
        if (attraction.seoSlug) {
          const attractionPath = `/attractions/${attraction.seoSlug}`;
          const lastmod = attraction.updatedAt
            ? new Date(attraction.updatedAt).toISOString().split("T")[0]
            : now;

          urls.push({
            loc: `${BASE_URL}${attractionPath}`,
            lastmod,
            changefreq: "weekly",
            priority: 0.6,
          });
          addedCount++;
        }
      }
      console.log(`Sitemap: Added ${addedCount} Tiqets attractions`);
    } catch (error) {
      console.error("Error fetching Tiqets attractions for sitemap:", error);
    }
  }

  // Help Center pages - DISABLED: Help center is currently broken
  // Uncomment when help center is fixed and working
  /*
  if (locale === "en") {
    try {
      // Get active help categories
      const categories = await db.select({
        slug: helpCategories.slug,
        updatedAt: helpCategories.updatedAt,
      }).from(helpCategories)
        .where(eq(helpCategories.isActive, true));

      let helpCount = 0;
      for (const category of categories) {
        if (category.slug) {
          const categoryPath = `/help/${category.slug}`;
          const lastmod = category.updatedAt
            ? new Date(category.updatedAt).toISOString().split("T")[0]
            : now;

          urls.push({
            loc: `${BASE_URL}${categoryPath}`,
            lastmod,
            changefreq: "weekly",
            priority: 0.5,
          });
          helpCount++;

          // Get published articles in this category
          const articles = await db.select({
            slug: helpArticles.slug,
            updatedAt: helpArticles.updatedAt,
            categorySlug: helpCategories.slug,
          }).from(helpArticles)
            .innerJoin(helpCategories, eq(helpArticles.categoryId, helpCategories.id))
            .where(and(
              eq(helpCategories.slug, category.slug),
              eq(helpArticles.status, "published")
            ));

          for (const article of articles) {
            if (article.slug && article.categorySlug) {
              const articlePath = `/help/${article.categorySlug}/${article.slug}`;
              const articleLastmod = article.updatedAt
                ? new Date(article.updatedAt).toISOString().split("T")[0]
                : now;

              urls.push({
                loc: `${BASE_URL}${articlePath}`,
                lastmod: articleLastmod,
                changefreq: "monthly",
                priority: 0.4,
              });
              helpCount++;
            }
          }
        }
      }
      if (helpCount > 0) {
        console.log(`Sitemap: Added ${helpCount} help center pages`);
      }
    } catch (error) {
      console.error("Error fetching help center pages for sitemap:", error);
    }
  }
  */

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
  const sitemaps = getActiveLocales().map((locale) => ({
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
    const sitemapXml = await generateLocaleSitemap(locale.code as Locale);
    sitemaps.set(`sitemap-${locale.code}.xml`, sitemapXml);
  }

  return sitemaps;
}

// Generate robots.txt with smart bot access control
// Updated to only reference ACTIVE locale sitemaps
export function generateRobotsTxt(): string {
  // Only include sitemaps for ACTIVE locales
  const activeSitemapLines = getActiveLocales()
    .map((l) => `Sitemap: ${BASE_URL}/sitemap-${l.code}.xml`)
    .join("\n");

  // Get list of INACTIVE locales to block
  const inactiveLocalePaths = SUPPORTED_LOCALES
    .filter((l) => !isLocaleActive(l.code as Locale))
    .map((l) => `Disallow: /${l.code}/`)
    .join("\n");

  return `# ===========================================
# TRAVI.World - robots.txt
# Updated: January 2026
# Strategy: SEO-first + AI Search Visibility
# ===========================================

# ===========================================
# SEARCH ENGINES (Primary)
# ===========================================
User-agent: Googlebot
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Disallow: /private/

User-agent: Googlebot-Image
Disallow: /admin/
Disallow: /api/

User-agent: Googlebot-News
Disallow: /admin/
Disallow: /api/

User-agent: Bingbot
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Disallow: /private/

User-agent: Slurp
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: DuckDuckBot
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: Baiduspider
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: YandexBot
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

# ===========================================
# AI SEARCH CRAWLERS (ALLOW)
# These power AI-generated answers
# ===========================================
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: Applebot
Allow: /

User-agent: YouBot
Allow: /

# ===========================================
# AI TRAINING CRAWLERS (BLOCK)
# Prevents model training, not search
# ===========================================
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Meta-ExternalAgent
Disallow: /

User-agent: Meta-ExternalFetcher
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: cohere-ai
Disallow: /

User-agent: Diffbot
Disallow: /

User-agent: Omgilibot
Disallow: /

User-agent: FacebookBot
Disallow: /

# ===========================================
# SOCIAL MEDIA PREVIEW BOTS (ALLOW)
# ===========================================
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: Pinterest
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: TelegramBot
Allow: /

User-agent: Slackbot
Allow: /

User-agent: Discordbot
Allow: /

# ===========================================
# SEO TOOLS (ALLOW)
# ===========================================
User-agent: AhrefsBot
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: SemrushBot
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: DotBot
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: Screaming Frog SEO Spider
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

# ===========================================
# TRAVEL PARTNERS (ALLOW)
# ===========================================
User-agent: TripAdvisor
Allow: /

User-agent: Viator
Allow: /

User-agent: GetYourGuide
Allow: /

User-agent: Klook
Allow: /

User-agent: Expedia
Allow: /

# ===========================================
# BLOCK INACTIVE LANGUAGE PATHS
# Remove from this list when translations go live
# ===========================================
User-agent: *
Disallow: /sv/
Disallow: /bn/
${inactiveLocalePaths}

# ===========================================
# DEFAULT RULE
# ===========================================
User-agent: *
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Disallow: /private/

# ===========================================
# SITEMAPS
# Only active locales included
# ===========================================
Sitemap: ${BASE_URL}/sitemap.xml
${activeSitemapLines}
`;
}