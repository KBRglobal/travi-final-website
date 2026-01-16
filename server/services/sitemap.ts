import { SUPPORTED_LOCALES, type Locale } from "@shared/schema";
import { storage } from "../storage";

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

  // Static pages
  const staticPages = [
    { path: "", priority: 1.0, changefreq: "daily" as const },
    { path: "/destinations", priority: 0.9, changefreq: "daily" as const },
    { path: "/attractions", priority: 0.9, changefreq: "daily" as const },
    { path: "/hotels", priority: 0.9, changefreq: "daily" as const },
    { path: "/dining", priority: 0.8, changefreq: "daily" as const },
    { path: "/things-to-do", priority: 0.8, changefreq: "daily" as const },
    { path: "/guides", priority: 0.8, changefreq: "daily" as const },
    { path: "/districts", priority: 0.8, changefreq: "weekly" as const },
    { path: "/articles", priority: 0.8, changefreq: "daily" as const },
    { path: "/real-estate", priority: 0.9, changefreq: "daily" as const },
    { path: "/events", priority: 0.7, changefreq: "daily" as const },

    // Destination Pages
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

    // Travel Style Guides
    { path: "/travel-styles/luxury-travel-complete-guide-2026", priority: 0.7, changefreq: "monthly" as const },
    { path: "/travel-styles/adventure-outdoors-complete-guide-2026", priority: 0.7, changefreq: "monthly" as const },
    { path: "/travel-styles/family-travel-complete-guide-2026", priority: 0.7, changefreq: "monthly" as const },
    { path: "/travel-styles/budget-travel-complete-guide-2026", priority: 0.7, changefreq: "monthly" as const },
    { path: "/travel-styles/honeymoon-romance-complete-guide-2026", priority: 0.7, changefreq: "monthly" as const },
    { path: "/travel-styles/solo-travel-complete-guide-2026", priority: 0.7, changefreq: "monthly" as const },

    // Off-Plan Property Pages
    { path: "/dubai-real-estate", priority: 0.9, changefreq: "daily" as const },
    { path: "/dubai-off-plan-properties", priority: 0.9, changefreq: "daily" as const },
    { path: "/dubai-off-plan-investment-guide", priority: 0.8, changefreq: "weekly" as const },
    { path: "/how-to-buy-dubai-off-plan", priority: 0.8, changefreq: "weekly" as const },
    { path: "/dubai-off-plan-payment-plans", priority: 0.8, changefreq: "weekly" as const },
    { path: "/best-off-plan-projects-dubai-2026", priority: 0.8, changefreq: "weekly" as const },
    { path: "/dubai-off-plan-business-bay", priority: 0.7, changefreq: "weekly" as const },
    { path: "/dubai-off-plan-marina", priority: 0.7, changefreq: "weekly" as const },
    { path: "/dubai-off-plan-jvc", priority: 0.7, changefreq: "weekly" as const },
    { path: "/dubai-off-plan-palm-jumeirah", priority: 0.7, changefreq: "weekly" as const },
    { path: "/dubai-off-plan-creek-harbour", priority: 0.7, changefreq: "weekly" as const },
    { path: "/dubai-off-plan-al-furjan", priority: 0.7, changefreq: "weekly" as const },
    { path: "/dubai-off-plan-villas", priority: 0.7, changefreq: "weekly" as const },
    { path: "/off-plan-emaar", priority: 0.7, changefreq: "weekly" as const },
    { path: "/off-plan-damac", priority: 0.7, changefreq: "weekly" as const },
    { path: "/off-plan-nakheel", priority: 0.7, changefreq: "weekly" as const },
    { path: "/off-plan-meraas", priority: 0.7, changefreq: "weekly" as const },
    { path: "/off-plan-sobha", priority: 0.7, changefreq: "weekly" as const },
    { path: "/off-plan-crypto-payments", priority: 0.7, changefreq: "weekly" as const },
    { path: "/off-plan-usdt", priority: 0.7, changefreq: "weekly" as const },
    { path: "/off-plan-golden-visa", priority: 0.7, changefreq: "weekly" as const },
    { path: "/off-plan-post-handover", priority: 0.7, changefreq: "weekly" as const },
    { path: "/off-plan-escrow", priority: 0.7, changefreq: "weekly" as const },
    { path: "/off-plan-vs-ready", priority: 0.7, changefreq: "weekly" as const },

    // District Pages
    { path: "/districts/downtown-dubai", priority: 0.8, changefreq: "weekly" as const },
    { path: "/districts/dubai-marina", priority: 0.8, changefreq: "weekly" as const },
    { path: "/districts/jbr-jumeirah-beach-residence", priority: 0.7, changefreq: "weekly" as const },
    { path: "/districts/palm-jumeirah", priority: 0.8, changefreq: "weekly" as const },
    { path: "/districts/jumeirah", priority: 0.7, changefreq: "weekly" as const },
    { path: "/districts/business-bay", priority: 0.7, changefreq: "weekly" as const },
    { path: "/districts/old-dubai", priority: 0.7, changefreq: "weekly" as const },
    { path: "/districts/dubai-creek-harbour", priority: 0.7, changefreq: "weekly" as const },
    { path: "/districts/dubai-south", priority: 0.7, changefreq: "weekly" as const },
    { path: "/districts/al-barsha", priority: 0.7, changefreq: "weekly" as const },
    { path: "/districts/difc", priority: 0.7, changefreq: "weekly" as const },
    { path: "/districts/dubai-hills-estate", priority: 0.7, changefreq: "weekly" as const },
    { path: "/districts/jvc", priority: 0.7, changefreq: "weekly" as const },
    { path: "/districts/bluewaters-island", priority: 0.7, changefreq: "weekly" as const },
    { path: "/districts/international-city", priority: 0.6, changefreq: "weekly" as const },
    { path: "/districts/al-karama", priority: 0.6, changefreq: "weekly" as const },

    // Tool Pages
    { path: "/tools-roi-calculator", priority: 0.7, changefreq: "monthly" as const },
    { path: "/tools-payment-calculator", priority: 0.7, changefreq: "monthly" as const },
    { path: "/tools-affordability-calculator", priority: 0.7, changefreq: "monthly" as const },
    { path: "/tools-currency-converter", priority: 0.7, changefreq: "monthly" as const },
    { path: "/tools-fees-calculator", priority: 0.7, changefreq: "monthly" as const },
    { path: "/tools-rental-yield-calculator", priority: 0.7, changefreq: "monthly" as const },
    { path: "/tools-mortgage-calculator", priority: 0.7, changefreq: "monthly" as const },

    // Comparison Pages
    { path: "/compare-off-plan-vs-ready", priority: 0.6, changefreq: "monthly" as const },
    { path: "/compare-jvc-vs-dubai-south", priority: 0.6, changefreq: "monthly" as const },
    { path: "/compare-emaar-vs-damac", priority: 0.6, changefreq: "monthly" as const },
    { path: "/compare-downtown-vs-marina", priority: 0.6, changefreq: "monthly" as const },
    { path: "/compare-60-40-vs-80-20", priority: 0.6, changefreq: "monthly" as const },
    { path: "/compare-sobha-vs-meraas", priority: 0.6, changefreq: "monthly" as const },
    { path: "/compare-crypto-vs-bank-transfer", priority: 0.6, changefreq: "monthly" as const },
    { path: "/compare-business-bay-vs-jlt", priority: 0.6, changefreq: "monthly" as const },
    { path: "/compare-new-vs-resale", priority: 0.6, changefreq: "monthly" as const },
    { path: "/compare-nakheel-vs-azizi", priority: 0.6, changefreq: "monthly" as const },
    { path: "/compare-villa-vs-apartment", priority: 0.6, changefreq: "monthly" as const },
    { path: "/compare-studio-vs-1bed", priority: 0.6, changefreq: "monthly" as const },

    // Case Studies
    { path: "/case-study-jvc-investor", priority: 0.6, changefreq: "monthly" as const },
    { path: "/case-study-crypto-buyer", priority: 0.6, changefreq: "monthly" as const },
    { path: "/case-study-golden-visa", priority: 0.6, changefreq: "monthly" as const },
    { path: "/case-study-expat-family", priority: 0.6, changefreq: "monthly" as const },
    { path: "/case-study-investor-flip", priority: 0.6, changefreq: "monthly" as const },
    { path: "/case-study-portfolio-diversification", priority: 0.6, changefreq: "monthly" as const },
    { path: "/case-study-off-plan-launch", priority: 0.6, changefreq: "monthly" as const },
    { path: "/case-study-retirement-planning", priority: 0.6, changefreq: "monthly" as const },

    // Pillar Content
    { path: "/dubai-roi-rental-yields", priority: 0.7, changefreq: "weekly" as const },
    { path: "/dubai-legal-security-guide", priority: 0.7, changefreq: "weekly" as const },

    // Other Pages
    { path: "/glossary", priority: 0.6, changefreq: "monthly" as const },
    { path: "/shopping", priority: 0.6, changefreq: "weekly" as const },
    { path: "/news", priority: 0.7, changefreq: "daily" as const },
    { path: "/privacy", priority: 0.3, changefreq: "yearly" as const },
    { path: "/terms", priority: 0.3, changefreq: "yearly" as const },
    { path: "/cookies", priority: 0.3, changefreq: "yearly" as const },
    { path: "/security", priority: 0.3, changefreq: "yearly" as const },
    { path: "/about", priority: 0.5, changefreq: "monthly" as const },
    { path: "/contact", priority: 0.5, changefreq: "monthly" as const },
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