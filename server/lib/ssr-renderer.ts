/**
 * SSR Renderer for Bots
 * Generates complete HTML pages for search engine and AI crawlers
 * 
 * COMPREHENSIVE COVERAGE:
 * - Legacy routes: /, /articles, /attractions, /hotels, /dining, /about, /contact, /privacy
 * - Destination routes: /destinations, /destinations/:slug, /destinations/:slug/hotels|attractions
 * - Guide routes: /guides, /guides/:slug, /travel-guides
 * - City pages: /singapore, /dubai, /bangkok, etc.
 * - Tiqets attractions: /attractions/:slug (tiqets-based)
 */

import { storage } from "../storage";
import { db } from "../db";
import type { Content, ContentWithRelations, Locale, ContentBlock } from "@shared/schema";
import { RTL_LOCALES, SUPPORTED_LOCALES, update9987Guides, tiqetsAttractions, contents } from "@shared/schema";
import { and, isNull } from "drizzle-orm";
import { eq, desc, sql } from "drizzle-orm";
import { 
  generateMetaTags, 
  generateStructuredData, 
  getCanonicalUrl,
  type MetaTagsOptions,
} from "./meta-tags";

const BASE_URL = "https://travi.world";
const SITE_NAME = "TRAVI";

// Destination metadata for SSR (mirrors client/src/data/destinations.ts)
const DESTINATION_DATA: Record<string, {
  name: string;
  country: string;
  tagline: string;
  description: string;
  heroImage: string;
  currency: string;
  language: string;
  timezone: string;
}> = {
  "singapore": {
    name: "Singapore",
    country: "Singapore",
    tagline: "Where East Meets West",
    description: "Discover Singapore - a stunning city-state where ultramodern architecture meets traditional culture. Experience world-class attractions, diverse cuisines, and vibrant neighborhoods.",
    heroImage: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&h=630&fit=crop",
    currency: "SGD",
    language: "English, Mandarin, Malay, Tamil",
    timezone: "GMT+8",
  },
  "dubai": {
    name: "Dubai",
    country: "United Arab Emirates",
    tagline: "The City of Gold",
    description: "Explore Dubai's iconic skyscrapers, luxury shopping, and desert adventures. From the Burj Khalifa to traditional souks, discover why millions visit this spectacular city.",
    heroImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&h=630&fit=crop",
    currency: "AED",
    language: "Arabic, English",
    timezone: "GMT+4",
  },
  "bangkok": {
    name: "Bangkok",
    country: "Thailand",
    tagline: "The City of Angels",
    description: "Experience Bangkok's grand temples, vibrant street food scene, and bustling markets. Thailand's capital offers an unforgettable blend of tradition and modernity.",
    heroImage: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&h=630&fit=crop",
    currency: "THB",
    language: "Thai, English",
    timezone: "GMT+7",
  },
  "paris": {
    name: "Paris",
    country: "France",
    tagline: "The City of Light",
    description: "Discover Paris - the world's most romantic city. From the Eiffel Tower to world-class museums, charming cafés, and haute cuisine, Paris captivates visitors endlessly.",
    heroImage: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&h=630&fit=crop",
    currency: "EUR",
    language: "French",
    timezone: "GMT+1",
  },
  "london": {
    name: "London",
    country: "United Kingdom",
    tagline: "A World in One City",
    description: "Explore London's iconic landmarks, world-class museums, and diverse neighborhoods. The British capital offers history, culture, and modern attractions for every traveler.",
    heroImage: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=630&fit=crop",
    currency: "GBP",
    language: "English",
    timezone: "GMT",
  },
  "istanbul": {
    name: "Istanbul",
    country: "Turkey",
    tagline: "Where Continents Meet",
    description: "Experience Istanbul's rich heritage spanning two continents. From the Blue Mosque to the Grand Bazaar, discover why this ancient city remains eternally captivating.",
    heroImage: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200&h=630&fit=crop",
    currency: "TRY",
    language: "Turkish",
    timezone: "GMT+3",
  },
  "new-york": {
    name: "New York City",
    country: "United States",
    tagline: "The City That Never Sleeps",
    description: "Discover New York City's iconic skyline, Broadway shows, and world-famous museums. From Central Park to Times Square, the Big Apple offers endless excitement.",
    heroImage: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&h=630&fit=crop",
    currency: "USD",
    language: "English",
    timezone: "GMT-5",
  },
  "tokyo": {
    name: "Tokyo",
    country: "Japan",
    tagline: "Where Tradition Meets Innovation",
    description: "Explore Tokyo's fascinating blend of ancient temples and cutting-edge technology. Japan's capital offers unique culture, amazing food, and unforgettable experiences.",
    heroImage: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=630&fit=crop",
    currency: "JPY",
    language: "Japanese",
    timezone: "GMT+9",
  },
  "hong-kong": {
    name: "Hong Kong",
    country: "China",
    tagline: "Asia's World City",
    description: "Experience Hong Kong's dramatic skyline, dim sum delights, and vibrant street markets. This dynamic city offers the perfect blend of East and West.",
    heroImage: "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=1200&h=630&fit=crop",
    currency: "HKD",
    language: "Cantonese, English",
    timezone: "GMT+8",
  },
  "rome": {
    name: "Rome",
    country: "Italy",
    tagline: "The Eternal City",
    description: "Walk through Rome's ancient ruins, Renaissance masterpieces, and vibrant piazzas. The Italian capital offers millennia of history and world-renowned cuisine.",
    heroImage: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&h=630&fit=crop",
    currency: "EUR",
    language: "Italian",
    timezone: "GMT+1",
  },
  "barcelona": {
    name: "Barcelona",
    country: "Spain",
    tagline: "Art, Architecture & Mediterranean Vibes",
    description: "Discover Barcelona's Gaudí masterpieces, stunning beaches, and vibrant nightlife. This Catalan gem offers art, culture, and Mediterranean charm year-round.",
    heroImage: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&h=630&fit=crop",
    currency: "EUR",
    language: "Spanish, Catalan",
    timezone: "GMT+1",
  },
  "amsterdam": {
    name: "Amsterdam",
    country: "Netherlands",
    tagline: "City of Canals",
    description: "Explore Amsterdam's iconic canals, world-class museums, and charming neighborhoods. The Dutch capital offers art, history, and a welcoming atmosphere.",
    heroImage: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&h=630&fit=crop",
    currency: "EUR",
    language: "Dutch, English",
    timezone: "GMT+1",
  },
  "abu-dhabi": {
    name: "Abu Dhabi",
    country: "United Arab Emirates",
    tagline: "The Capital of Culture",
    description: "Discover Abu Dhabi's stunning cultural landmarks, desert adventures, and luxury experiences. The UAE capital blends heritage with modern sophistication.",
    heroImage: "https://images.unsplash.com/photo-1512632578888-169bbfe94b38?w=1200&h=630&fit=crop",
    currency: "AED",
    language: "Arabic, English",
    timezone: "GMT+4",
  },
  "las-vegas": {
    name: "Las Vegas",
    country: "United States",
    tagline: "Entertainment Capital of the World",
    description: "Experience Las Vegas's world-famous casinos, shows, and nightlife. Beyond the Strip, discover incredible natural wonders and unforgettable adventures.",
    heroImage: "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=1200&h=630&fit=crop",
    currency: "USD",
    language: "English",
    timezone: "GMT-8",
  },
  "los-angeles": {
    name: "Los Angeles",
    country: "United States",
    tagline: "The City of Angels",
    description: "Explore Los Angeles's iconic beaches, Hollywood glamour, and diverse neighborhoods. The entertainment capital offers endless sunshine and attractions.",
    heroImage: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1200&h=630&fit=crop",
    currency: "USD",
    language: "English, Spanish",
    timezone: "GMT-8",
  },
  "miami": {
    name: "Miami",
    country: "United States",
    tagline: "The Magic City",
    description: "Experience Miami's stunning beaches, Art Deco architecture, and vibrant Latin culture. This tropical paradise offers nightlife, cuisine, and year-round sunshine.",
    heroImage: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&h=630&fit=crop",
    currency: "USD",
    language: "English, Spanish",
    timezone: "GMT-5",
  },
};

interface SSRRenderOptions {
  locale?: Locale;
  path: string;
  searchParams?: URLSearchParams;
}

/**
 * Main SSR render function - routes to appropriate renderer
 * Note: The path should already be normalized (locale stripped) by ssr-middleware
 */
export async function renderSSR(path: string, locale: Locale = "en", searchParams?: URLSearchParams): Promise<{ html: string; status: number; redirect?: string }> {
  const options: SSRRenderOptions = { locale, path, searchParams };
  
  // Normalize path - ensure it starts with / and handle empty paths
  // Do NOT strip locale here - middleware already handles that
  const cleanPath = path === "" ? "/" : (path.startsWith("/") ? path : `/${path}`);
  
  if (cleanPath === "/" || cleanPath === "") {
    return renderHomepage(options);
  }
  
  if (cleanPath.startsWith("/article/")) {
    const slug = cleanPath.replace("/article/", "");
    return renderContentPage(slug, "article", options);
  }
  
  if (cleanPath.startsWith("/attraction/")) {
    const slug = cleanPath.replace("/attraction/", "");
    // Redirect singular /attraction/ to plural /attractions/ for Tiqets data
    return renderTiqetsAttractionPage(slug, options);
  }
  
  if (cleanPath.startsWith("/hotel/")) {
    const slug = cleanPath.replace("/hotel/", "");
    return renderContentPage(slug, "hotel", options);
  }
  
  if (cleanPath === "/articles") {
    return renderCategoryPage("article", options);
  }
  
  if (cleanPath === "/attractions") {
    return renderCategoryPage("attraction", options);
  }
  
  if (cleanPath === "/hotels") {
    return renderCategoryPage("hotel", options);
  }
  
  if (cleanPath === "/dining") {
    return renderCategoryPage("dining", options);
  }
  
  if (cleanPath === "/about") {
    return renderStaticPage("about", options);
  }
  
  if (cleanPath === "/contact") {
    return renderStaticPage("contact", options);
  }
  
  if (cleanPath === "/privacy") {
    return renderStaticPage("privacy", options);
  }
  
  // ====== NEW SSR ROUTES ======
  
  // Destinations hub page
  if (cleanPath === "/destinations") {
    return renderDestinationsHub(options);
  }
  
  // Destination detail pages: /destinations/:slug
  if (cleanPath.startsWith("/destinations/")) {
    const parts = cleanPath.replace("/destinations/", "").split("/");
    const slug = parts[0];
    const subpage = parts[1]; // hotels, attractions, dining, etc.
    
    if (subpage === "hotels") {
      return renderDestinationSubpage(slug, "hotels", options);
    }
    if (subpage === "attractions") {
      return renderDestinationSubpage(slug, "attractions", options);
    }
    if (subpage === "dining") {
      return renderDestinationSubpage(slug, "dining", options);
    }
    if (subpage === "guides") {
      return renderDestinationSubpage(slug, "guides", options);
    }
    if (!subpage) {
      return renderDestinationPage(slug, options);
    }
  }
  
  // Travel guides hub
  if (cleanPath === "/guides" || cleanPath === "/travel-guides") {
    return renderGuidesHub(options);
  }
  
  // Guide detail: /guides/:slug
  if (cleanPath.startsWith("/guides/")) {
    const slug = cleanPath.replace("/guides/", "");
    return renderGuidePage(slug, options);
  }
  
  // City shortcut pages: /singapore, /dubai, /bangkok, etc.
  const citySlug = cleanPath.replace("/", "");
  if (DESTINATION_DATA[citySlug]) {
    return renderDestinationPage(citySlug, options);
  }
  
  // Tiqets attraction detail: /attractions/:slug (different from /attraction/:slug)
  if (cleanPath.startsWith("/attractions/") && cleanPath !== "/attractions") {
    const slug = cleanPath.replace("/attractions/", "");
    return renderTiqetsAttractionPage(slug, options);
  }
  
  // ====== ADDITIONAL SSR ROUTES (Phase 2) ======
  
  // News hub page
  if (cleanPath === "/news") {
    return renderNewsHub(options);
  }
  
  // Events hub page
  if (cleanPath === "/events") {
    return renderEventsHub(options);
  }
  
  // Shopping hub page
  if (cleanPath === "/shopping") {
    return renderShoppingHub(options);
  }
  
  // Districts hub page
  if (cleanPath === "/districts") {
    return renderDistrictsHub(options);
  }
  
  // District detail pages: /districts/:slug
  if (cleanPath.startsWith("/districts/")) {
    const slug = cleanPath.replace("/districts/", "");
    return renderDistrictPage(slug, options);
  }
  
  // Dining/Restaurant detail pages: /dining/:slug
  if (cleanPath.startsWith("/dining/")) {
    const slug = cleanPath.replace("/dining/", "");
    return renderRestaurantPage(slug, options);
  }
  
  // Event detail pages: /events/:slug (if individual event pages exist)
  if (cleanPath.startsWith("/events/")) {
    const slug = cleanPath.replace("/events/", "");
    return renderEventPage(slug, options);
  }
  
  return render404(options);
}

/**
 * Render homepage with featured content
 */
async function renderHomepage(options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  // Normalized attraction type for homepage
  interface FeaturedAttraction {
    title: string;
    slug: string;
    description?: string;
  }
  
  let featuredAttractions: FeaturedAttraction[] = [];
  let hotels: Content[] = [];
  let articles: Content[] = [];
  
  // Fetch Tiqets attractions separately (this is where real data is)
  try {
    const tiqetsResults = await db
      .select({
        slug: tiqetsAttractions.slug,
        seoSlug: tiqetsAttractions.seoSlug,
        title: tiqetsAttractions.title,
        description: tiqetsAttractions.description,
        tiqetsSummary: tiqetsAttractions.tiqetsSummary,
        cityName: tiqetsAttractions.cityName,
      })
      .from(tiqetsAttractions)
      .orderBy(desc(tiqetsAttractions.updatedAt))
      .limit(6);
    
    featuredAttractions = tiqetsResults.map(item => ({
      title: item.title || item.slug,
      slug: item.seoSlug || item.slug, // Prefer seo_slug for clean URLs
      description: item.description || item.tiqetsSummary || `Attraction in ${item.cityName || 'various destinations'}`,
    }));
  } catch (error) {
    console.error("[SSR] Error fetching tiqets attractions for homepage:", error);
  }
  
  // Fetch hotels and articles from contents table
  try {
    const results = await Promise.all([
      storage.getContents({ type: "hotel", status: "published" }),
      storage.getContents({ type: "article", status: "published" }),
    ]);
    hotels = results[0] || [];
    articles = results[1] || [];
  } catch (error) {
    console.error("[SSR] Error fetching homepage content:", error);
  }

  const featuredHotels = hotels.slice(0, 6);
  const featuredArticles = articles.slice(0, 6);

  const metaTags = generateMetaTags({
    title: "TRAVI - Expert Travel Guides & Reviews",
    description: "Discover the best hotels, attractions, restaurants, and local experiences worldwide. TRAVI provides expert travel guides with honest reviews and insider tips.",
    url: getCanonicalUrl("/", locale),
    type: "website",
    locale,
  });

  const structuredData = [
    generateStructuredData({ type: "WebSite", locale }),
    generateStructuredData({ type: "Organization", locale }),
    generateStructuredData({
      type: "BreadcrumbList",
      breadcrumbs: [{ name: "Home", url: getCanonicalUrl("/", locale) }],
    }),
  ].join("\n");

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
          <ul>
            <li><a href="${getCanonicalUrl("/attractions", locale)}">Attractions</a></li>
            <li><a href="${getCanonicalUrl("/hotels", locale)}">Hotels</a></li>
            <li><a href="${getCanonicalUrl("/articles", locale)}">Articles</a></li>
            <li><a href="${getCanonicalUrl("/dining", locale)}">Dining</a></li>
          </ul>
        </nav>
      </header>
      
      <main>
        <section aria-labelledby="hero-heading">
          <h1 id="hero-heading">Expert Travel Guides for World Destinations</h1>
          <p>Discover curated recommendations for hotels, attractions, restaurants, and authentic local experiences. Our expert team provides honest reviews and insider tips.</p>
        </section>
        
        ${featuredAttractions.length > 0 ? `
        <section aria-labelledby="attractions-heading">
          <h2 id="attractions-heading">Popular Attractions</h2>
          <ul>
            ${featuredAttractions.map(item => `
              <li>
                <article>
                  <h3><a href="${getCanonicalUrl(`/attractions/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h3>
                  ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
                </article>
              </li>
            `).join("")}
          </ul>
          <a href="${getCanonicalUrl("/attractions", locale)}">View all attractions</a>
        </section>
        ` : ""}
        
        ${featuredHotels.length > 0 ? `
        <section aria-labelledby="hotels-heading">
          <h2 id="hotels-heading">Top Hotels</h2>
          <ul>
            ${featuredHotels.map(item => `
              <li>
                <article>
                  <h3><a href="${getCanonicalUrl(`/hotel/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h3>
                  ${item.metaDescription ? `<p>${escapeHtml(item.metaDescription)}</p>` : ""}
                </article>
              </li>
            `).join("")}
          </ul>
          <a href="${getCanonicalUrl("/hotels", locale)}">View all hotels</a>
        </section>
        ` : ""}
        
        ${featuredArticles.length > 0 ? `
        <section aria-labelledby="articles-heading">
          <h2 id="articles-heading">Latest Articles</h2>
          <ul>
            ${featuredArticles.map(item => `
              <li>
                <article>
                  <h3><a href="${getCanonicalUrl(`/article/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h3>
                  ${item.metaDescription ? `<p>${escapeHtml(item.metaDescription)}</p>` : ""}
                </article>
              </li>
            `).join("")}
          </ul>
          <a href="${getCanonicalUrl("/articles", locale)}">View all articles</a>
        </section>
        ` : ""}
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render individual content page (article, attraction, hotel)
 */
async function renderContentPage(
  slug: string,
  contentType: string,
  options: SSRRenderOptions
): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  // Fetch content with proper error handling
  let content: ContentWithRelations | undefined;
  try {
    content = await storage.getContentBySlug(slug);
  } catch (error) {
    console.error(`[SSR] Error fetching content by slug "${slug}":`, error);
    return render404(options);
  }
  
  // Return 404 if content doesn't exist or isn't published
  if (!content || content.status !== "published") {
    return render404(options);
  }

  const urlPath = `/${contentType}/${slug}`;
  const image = getContentImage(content);
  
  const metaTags = generateMetaTags({
    title: content.metaTitle || content.title,
    description: content.metaDescription || "",
    url: getCanonicalUrl(urlPath, locale),
    image,
    type: contentType === "article" ? "article" : "place",
    locale,
    publishedTime: content.publishedAt?.toISOString(),
    modifiedTime: content.updatedAt?.toISOString(),
    section: contentType,
  });

  const schemaType = contentType === "hotel" ? "Hotel" 
    : contentType === "attraction" ? "TouristAttraction" 
    : "Article";

  const structuredData = [
    generateStructuredData({ content, type: schemaType as any, locale }),
    generateStructuredData({ content, type: "FAQPage", locale }),
    generateStructuredData({
      type: "BreadcrumbList",
      breadcrumbs: [
        { name: "Home", url: getCanonicalUrl("/", locale) },
        { name: capitalizeFirst(contentType) + "s", url: getCanonicalUrl(`/${contentType}s`, locale) },
        { name: content.title, url: getCanonicalUrl(urlPath, locale) },
      ],
    }),
  ].filter(Boolean).join("\n");

  const bodyContent = renderContentBlocks(content.blocks || [], locale);

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li><a href="${getCanonicalUrl(`/${contentType}s`, locale)}">${capitalizeFirst(contentType)}s</a></li>
            <li aria-current="page">${escapeHtml(content.title)}</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <article>
          <header>
            <h1>${escapeHtml(content.title)}</h1>
            ${content.metaDescription ? `<p class="lead">${escapeHtml(content.metaDescription)}</p>` : ""}
            ${content.publishedAt ? `<time datetime="${content.publishedAt.toISOString()}">${formatDate(content.publishedAt, locale)}</time>` : ""}
          </header>
          
          <div class="content">
            ${bodyContent}
          </div>
        </article>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render category listing page with pagination support for attractions
 */
async function renderCategoryPage(
  contentType: string,
  options: SSRRenderOptions
): Promise<{ html: string; status: number }> {
  const { locale = "en", searchParams } = options;
  
  // Pagination constants
  const ITEMS_PER_PAGE = 50;
  
  // Parse page number from query params (only for attractions)
  let currentPage = 1;
  let totalPages = 1;
  let totalCount = 0;
  
  if (contentType === "attraction" && searchParams) {
    const pageParam = searchParams.get("page");
    if (pageParam) {
      const parsed = parseInt(pageParam, 10);
      if (!isNaN(parsed) && parsed >= 1) {
        currentPage = parsed;
      }
    }
  }
  
  // Normalized content items for rendering
  interface NormalizedItem {
    title: string;
    slug: string;
    description?: string;
  }
  let normalizedItems: NormalizedItem[] = [];
  
  // For attractions, use tiqets_attractions table which has actual data (with pagination)
  if (contentType === "attraction") {
    try {
      // Get total count for pagination
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tiqetsAttractions);
      
      totalCount = countResult[0]?.count || 0;
      totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
      
      // Ensure current page is valid
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
      }
      
      // Calculate offset
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      
      const tiqetsResults = await db
        .select({
          slug: tiqetsAttractions.slug,
          seoSlug: tiqetsAttractions.seoSlug,
          title: tiqetsAttractions.title,
          description: tiqetsAttractions.description,
          tiqetsSummary: tiqetsAttractions.tiqetsSummary,
          cityName: tiqetsAttractions.cityName,
        })
        .from(tiqetsAttractions)
        .orderBy(desc(tiqetsAttractions.updatedAt))
        .limit(ITEMS_PER_PAGE)
        .offset(offset);
      
      normalizedItems = tiqetsResults.map(item => ({
        title: item.title || item.slug,
        slug: item.seoSlug || item.slug, // Prefer seo_slug for clean URLs
        description: item.description || item.tiqetsSummary || `Attraction in ${item.cityName || 'various destinations'}`,
      }));
    } catch (error) {
      console.error(`[SSR] Error fetching tiqets attractions:`, error);
    }
  } else {
    // For other content types, directly query contents table (no pagination for now)
    try {
      const contentResults = await db
        .select({
          slug: contents.slug,
          title: contents.title,
          metaDescription: contents.metaDescription,
        })
        .from(contents)
        .where(
          and(
            eq(contents.type, contentType as any),
            eq(contents.status, "published"),
            isNull(contents.deletedAt)
          )
        )
        .orderBy(desc(contents.createdAt))
        .limit(50);
      
      normalizedItems = contentResults.map(item => ({
        title: item.title,
        slug: item.slug,
        description: item.metaDescription || undefined,
      }));
      console.log(`[SSR] Fetched ${normalizedItems.length} ${contentType} items from database`);
    } catch (error) {
      console.error(`[SSR] Error fetching ${contentType} content:`, error);
    }
  }
  
  const baseUrlPath = `/${contentType}s`;
  // For attractions with pagination, include page in canonical URL (except page 1)
  const urlPath = contentType === "attraction" && currentPage > 1 
    ? `${baseUrlPath}?page=${currentPage}` 
    : baseUrlPath;
  
  const titles: Record<string, string> = {
    article: "Travel Articles & Guides",
    attraction: "Tourist Attractions",
    hotel: "Hotels & Accommodations",
    dining: "Restaurants & Dining",
  };
  
  const descriptions: Record<string, string> = {
    article: "Browse our collection of expert travel guides, tips, and articles covering destinations worldwide.",
    attraction: "Discover top tourist attractions, landmarks, and must-see places with reviews and visitor information.",
    hotel: "Find the best hotels and accommodations with honest reviews, photos, and booking information.",
    dining: "Explore restaurants, cafes, and dining experiences with menus, reviews, and recommendations.",
  };

  const title = titles[contentType] || `${capitalizeFirst(contentType)}s`;
  // Add page number to description for SEO if paginated
  const baseDescription = descriptions[contentType] || `Browse all ${contentType}s on TRAVI.`;
  const description = contentType === "attraction" && currentPage > 1
    ? `${baseDescription} Page ${currentPage} of ${totalPages}.`
    : baseDescription;
  
  // Page title with pagination
  const pageTitle = contentType === "attraction" && currentPage > 1
    ? `${title} - Page ${currentPage} | ${SITE_NAME}`
    : `${title} | ${SITE_NAME}`;

  const metaTags = generateMetaTags({
    title: pageTitle,
    description,
    url: getCanonicalUrl(urlPath, locale),
    type: "website",
    locale,
  });

  // Build list items for ItemList structured data (use /attractions/ path for attractions)
  const itemUrlPrefix = contentType === "attraction" ? "/attractions" : `/${contentType}`;
  const listItems = normalizedItems.slice(0, 20).map(item => ({
    name: item.title,
    url: getCanonicalUrl(`${itemUrlPrefix}/${item.slug}`, locale),
    description: item.description || undefined,
  }));

  const structuredData = [
    generateStructuredData({
      type: "BreadcrumbList",
      breadcrumbs: [
        { name: "Home", url: getCanonicalUrl("/", locale) },
        { name: title, url: getCanonicalUrl(baseUrlPath, locale) },
      ],
    }),
    listItems.length > 0 ? generateStructuredData({
      type: "ItemList",
      listItems,
      locale,
    }) : "",
  ].filter(Boolean).join("\n");

  // Generate pagination HTML for attractions
  const paginationHtml = contentType === "attraction" && totalPages > 1 ? `
          <nav aria-label="Pagination">
            ${currentPage > 1 
              ? `<a href="${getCanonicalUrl(`${baseUrlPath}${currentPage === 2 ? '' : `?page=${currentPage - 1}`}`, locale)}" rel="prev">Previous</a>`
              : `<span>Previous</span>`
            }
            <span>Page ${currentPage} of ${totalPages}</span>
            ${currentPage < totalPages 
              ? `<a href="${getCanonicalUrl(`${baseUrlPath}?page=${currentPage + 1}`, locale)}" rel="next">Next</a>`
              : `<span>Next</span>`
            }
          </nav>
  ` : "";

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li aria-current="page">${title}</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <section aria-labelledby="page-heading">
          <h1 id="page-heading">${title}${contentType === "attraction" && currentPage > 1 ? ` - Page ${currentPage}` : ""}</h1>
          <p>${baseDescription}</p>
          
          ${normalizedItems.length > 0 ? `
          <ul class="content-list">
            ${normalizedItems.map(item => `
              <li>
                <article>
                  <h2><a href="${getCanonicalUrl(`${itemUrlPrefix}/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h2>
                  ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
                </article>
              </li>
            `).join("")}
          </ul>
          ${paginationHtml}
          ` : `<p>No ${contentType}s found.</p>`}
        </section>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render static pages (about, contact, privacy)
 */
async function renderStaticPage(
  page: string,
  options: SSRRenderOptions
): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  const pages: Record<string, { title: string; description: string; content: string }> = {
    about: {
      title: "About TRAVI",
      description: "Learn about TRAVI, your trusted source for expert travel guides, honest reviews, and insider tips for destinations worldwide.",
      content: `
        <h1>About TRAVI</h1>
        <p>TRAVI is your trusted companion for travel discovery. Our team of travel experts and local insiders provides comprehensive guides to help you explore destinations worldwide.</p>
        <h2>Our Mission</h2>
        <p>We believe travel should be accessible, informed, and authentic. Our mission is to provide accurate, up-to-date information that helps travelers make confident decisions.</p>
        <h2>What We Offer</h2>
        <ul>
          <li>Expert hotel reviews with honest assessments</li>
          <li>Comprehensive attraction guides with visitor tips</li>
          <li>Restaurant recommendations from local food experts</li>
          <li>Transportation guides for navigating new cities</li>
          <li>Cultural insights and travel tips</li>
        </ul>
        <h2>Contact Us</h2>
        <p>Have questions or suggestions? We'd love to hear from you. Visit our <a href="${getCanonicalUrl("/contact", locale)}">contact page</a>.</p>
      `,
    },
    contact: {
      title: "Contact TRAVI",
      description: "Get in touch with the TRAVI team. We welcome your questions, feedback, and partnership inquiries.",
      content: `
        <h1>Contact Us</h1>
        <p>We're here to help! Whether you have questions about our content, partnership opportunities, or feedback to share, we'd love to hear from you.</p>
        <h2>General Inquiries</h2>
        <p>For general questions about TRAVI, our content, or travel recommendations, please email us at hello@travi.world.</p>
        <h2>Partnerships</h2>
        <p>Interested in partnering with TRAVI? Hotels, attractions, and tourism boards can reach our partnerships team at partners@travi.world.</p>
        <h2>Press</h2>
        <p>Media inquiries can be directed to press@travi.world.</p>
      `,
    },
    privacy: {
      title: "Privacy Policy",
      description: "Read TRAVI's privacy policy to understand how we collect, use, and protect your personal information.",
      content: `
        <h1>Privacy Policy</h1>
        <p>Last updated: December 2025</p>
        <p>At TRAVI, we are committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information.</p>
        <h2>Information We Collect</h2>
        <p>We collect information you provide directly, such as when you subscribe to our newsletter or contact us. We also collect usage data through cookies and analytics.</p>
        <h2>How We Use Your Information</h2>
        <ul>
          <li>To provide and improve our services</li>
          <li>To send newsletters and updates (with your consent)</li>
          <li>To analyze usage patterns and improve our content</li>
          <li>To respond to your inquiries</li>
        </ul>
        <h2>Your Rights</h2>
        <p>You have the right to access, correct, or delete your personal data. Contact us at privacy@travi.world for any privacy-related requests.</p>
      `,
    },
  };

  const pageData = pages[page];
  if (!pageData) {
    return render404(options);
  }

  const metaTags = generateMetaTags({
    title: `${pageData.title} | ${SITE_NAME}`,
    description: pageData.description,
    url: getCanonicalUrl(`/${page}`, locale),
    type: "website",
    locale,
  });

  const structuredData = generateStructuredData({
    type: "BreadcrumbList",
    breadcrumbs: [
      { name: "Home", url: getCanonicalUrl("/", locale) },
      { name: pageData.title, url: getCanonicalUrl(`/${page}`, locale) },
    ],
  });

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li aria-current="page">${pageData.title}</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <article>
          ${pageData.content}
        </article>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

// ========================================
// NEW SSR RENDERERS
// ========================================

/**
 * Render destinations hub page
 */
async function renderDestinationsHub(options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  const destinations = Object.entries(DESTINATION_DATA).map(([slug, data]) => ({
    slug,
    ...data,
  }));

  const metaTags = generateMetaTags({
    title: "Travel Destinations - Explore World Cities | TRAVI",
    description: "Discover top travel destinations worldwide. From Singapore to Paris, Dubai to Tokyo - explore hotels, attractions, and travel guides for 16+ amazing cities.",
    url: getCanonicalUrl("/destinations", locale),
    type: "website",
    locale,
  });

  const structuredData = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Travel Destinations",
    "description": "Explore travel destinations worldwide with TRAVI",
    "url": `${BASE_URL}/destinations`,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": destinations.map((dest, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "City",
          "name": dest.name,
          "url": `${BASE_URL}/destinations/${dest.slug}`,
        }
      }))
    }
  })}</script>`;

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
          <ul>
            <li><a href="${getCanonicalUrl("/destinations", locale)}">Destinations</a></li>
            <li><a href="${getCanonicalUrl("/attractions", locale)}">Attractions</a></li>
            <li><a href="${getCanonicalUrl("/hotels", locale)}">Hotels</a></li>
            <li><a href="${getCanonicalUrl("/guides", locale)}">Guides</a></li>
          </ul>
        </nav>
      </header>
      
      <main>
        <section aria-labelledby="destinations-heading">
          <h1 id="destinations-heading">Explore World Destinations</h1>
          <p>Discover comprehensive travel guides, hotels, attractions, and local tips for the world's most exciting cities.</p>
          
          <ul class="content-list">
            ${destinations.map(dest => `
              <li>
                <article>
                  <h2><a href="${getCanonicalUrl(`/destinations/${dest.slug}`, locale)}">${escapeHtml(dest.name)}, ${escapeHtml(dest.country)}</a></h2>
                  <p><strong>${escapeHtml(dest.tagline)}</strong></p>
                  <p>${escapeHtml(dest.description)}</p>
                  <p>
                    <a href="${getCanonicalUrl(`/destinations/${dest.slug}/hotels`, locale)}">Hotels in ${escapeHtml(dest.name)}</a> |
                    <a href="${getCanonicalUrl(`/destinations/${dest.slug}/attractions`, locale)}">Attractions in ${escapeHtml(dest.name)}</a>
                  </p>
                </article>
              </li>
            `).join("")}
          </ul>
        </section>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render individual destination page
 */
async function renderDestinationPage(slug: string, options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  const destination = DESTINATION_DATA[slug];
  if (!destination) {
    return render404(options);
  }

  const metaTags = generateMetaTags({
    title: `${destination.name} Travel Guide - Hotels, Attractions & Tips | TRAVI`,
    description: destination.description,
    url: getCanonicalUrl(`/destinations/${slug}`, locale),
    image: destination.heroImage,
    type: "place",
    locale,
  });

  const structuredData = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TravelGuide",
    "name": `${destination.name} Travel Guide`,
    "description": destination.description,
    "url": `${BASE_URL}/destinations/${slug}`,
    "image": destination.heroImage,
    "about": {
      "@type": "City",
      "name": destination.name,
      "containedInPlace": {
        "@type": "Country",
        "name": destination.country
      }
    },
    "publisher": {
      "@type": "Organization",
      "name": "TRAVI",
      "url": BASE_URL
    }
  })}</script>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "Destinations", "item": `${BASE_URL}/destinations` },
      { "@type": "ListItem", "position": 3, "name": destination.name, "item": `${BASE_URL}/destinations/${slug}` }
    ]
  })}</script>`;

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
          <ul>
            <li><a href="${getCanonicalUrl("/destinations", locale)}">Destinations</a></li>
            <li><a href="${getCanonicalUrl("/attractions", locale)}">Attractions</a></li>
            <li><a href="${getCanonicalUrl("/hotels", locale)}">Hotels</a></li>
            <li><a href="${getCanonicalUrl("/guides", locale)}">Guides</a></li>
          </ul>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li><a href="${getCanonicalUrl("/destinations", locale)}">Destinations</a></li>
            <li aria-current="page">${escapeHtml(destination.name)}</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <article>
          <header>
            <figure>
              <img src="${escapeHtml(destination.heroImage)}" alt="${escapeHtml(destination.name)} skyline and landmarks" loading="lazy">
            </figure>
            <p><strong>Travel Guide</strong></p>
            <h1>${escapeHtml(destination.name)}</h1>
            <p class="tagline">${escapeHtml(destination.tagline)}</p>
            <p>${escapeHtml(destination.description)}</p>
          </header>
          
          <section aria-labelledby="quick-facts">
            <h2 id="quick-facts">Quick Facts</h2>
            <dl>
              <dt>Country</dt>
              <dd>${escapeHtml(destination.country)}</dd>
              <dt>Currency</dt>
              <dd>${escapeHtml(destination.currency)}</dd>
              <dt>Languages</dt>
              <dd>${escapeHtml(destination.language)}</dd>
              <dt>Timezone</dt>
              <dd>${escapeHtml(destination.timezone)}</dd>
            </dl>
          </section>
          
          <section aria-labelledby="explore-ctas">
            <h2 id="explore-ctas">Explore ${escapeHtml(destination.name)}</h2>
            <ul>
              <li>
                <a href="${getCanonicalUrl(`/destinations/${slug}/hotels`, locale)}">
                  <strong>Find Hotels in ${escapeHtml(destination.name)}</strong>
                  <p>Compare prices from 100+ booking sites and find the best deals.</p>
                </a>
              </li>
              <li>
                <a href="${getCanonicalUrl(`/destinations/${slug}/attractions`, locale)}">
                  <strong>Tours & Attractions</strong>
                  <p>Skip-the-line tickets and guided tours for top attractions.</p>
                </a>
              </li>
              <li>
                <a href="${getCanonicalUrl(`/guides/${slug}`, locale)}">
                  <strong>Travel Guides</strong>
                  <p>Expert tips and insider knowledge for your trip.</p>
                </a>
              </li>
            </ul>
          </section>
        </article>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render destination subpage (hotels/attractions/dining/guides)
 */
async function renderDestinationSubpage(
  slug: string, 
  subpage: "hotels" | "attractions" | "dining" | "guides",
  options: SSRRenderOptions
): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  const destination = DESTINATION_DATA[slug];
  if (!destination) {
    return render404(options);
  }

  const titles: Record<string, string> = {
    hotels: `Hotels in ${destination.name}`,
    attractions: `Attractions in ${destination.name}`,
    dining: `Restaurants in ${destination.name}`,
    guides: `Travel Guides for ${destination.name}`,
  };

  const descriptions: Record<string, string> = {
    hotels: `Find the best hotels in ${destination.name}. Compare prices, read reviews, and book accommodations for your trip.`,
    attractions: `Discover top attractions in ${destination.name}. Book tours, skip-the-line tickets, and experiences.`,
    dining: `Explore restaurants and dining options in ${destination.name}. From local favorites to fine dining.`,
    guides: `Expert travel guides for ${destination.name}. Tips, itineraries, and insider knowledge.`,
  };

  const metaTags = generateMetaTags({
    title: `${titles[subpage]} | TRAVI`,
    description: descriptions[subpage],
    url: getCanonicalUrl(`/destinations/${slug}/${subpage}`, locale),
    image: destination.heroImage,
    type: "website",
    locale,
  });

  const structuredData = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "Destinations", "item": `${BASE_URL}/destinations` },
      { "@type": "ListItem", "position": 3, "name": destination.name, "item": `${BASE_URL}/destinations/${slug}` },
      { "@type": "ListItem", "position": 4, "name": capitalizeFirst(subpage), "item": `${BASE_URL}/destinations/${slug}/${subpage}` }
    ]
  })}</script>`;

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li><a href="${getCanonicalUrl("/destinations", locale)}">Destinations</a></li>
            <li><a href="${getCanonicalUrl(`/destinations/${slug}`, locale)}">${escapeHtml(destination.name)}</a></li>
            <li aria-current="page">${capitalizeFirst(subpage)}</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <section aria-labelledby="page-heading">
          <h1 id="page-heading">${escapeHtml(titles[subpage])}</h1>
          <p>${escapeHtml(descriptions[subpage])}</p>
          
          <p>Browse our curated selection of ${subpage} in ${escapeHtml(destination.name)}. 
             We compare prices and reviews to help you find the perfect options for your trip.</p>
          
          <nav aria-label="Related sections">
            <h2>Explore More in ${escapeHtml(destination.name)}</h2>
            <ul>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}`, locale)}">Overview</a></li>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}/hotels`, locale)}">Hotels</a></li>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}/attractions`, locale)}">Attractions</a></li>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}/dining`, locale)}">Dining</a></li>
            </ul>
          </nav>
        </section>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render guides hub page
 */
async function renderGuidesHub(options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  // Fetch guides from database
  let guides: any[] = [];
  try {
    guides = await db
      .select()
      .from(update9987Guides)
      .where(eq(update9987Guides.status, "published"))
      .orderBy(desc(update9987Guides.publishedAt))
      .limit(50);
  } catch (error) {
    console.error("[SSR] Error fetching guides:", error);
  }

  const metaTags = generateMetaTags({
    title: "Travel Guides - Expert Tips & Destination Guides | TRAVI",
    description: "Comprehensive travel guides with expert tips, itineraries, and insider knowledge. Explore destinations worldwide with TRAVI's curated travel content.",
    url: getCanonicalUrl("/guides", locale),
    type: "website",
    locale,
  });

  // Only include ItemList in structured data if there are guides
  const collectionPageData: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Travel Guides",
    "description": "Expert travel guides for destinations worldwide",
    "url": `${BASE_URL}/guides`,
  };
  
  // Only add ItemList if we have guides to display
  if (guides.length > 0) {
    collectionPageData.mainEntity = {
      "@type": "ItemList",
      "itemListElement": guides.slice(0, 20).map((guide, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "TravelGuide",
          "name": guide.title,
          "url": `${BASE_URL}/guides/${guide.slug}`,
        }
      }))
    };
  }
  
  const structuredData = `<script type="application/ld+json">${JSON.stringify(collectionPageData)}</script>`;

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
          <ul>
            <li><a href="${getCanonicalUrl("/destinations", locale)}">Destinations</a></li>
            <li><a href="${getCanonicalUrl("/attractions", locale)}">Attractions</a></li>
            <li><a href="${getCanonicalUrl("/hotels", locale)}">Hotels</a></li>
            <li><a href="${getCanonicalUrl("/guides", locale)}">Guides</a></li>
          </ul>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li aria-current="page">Travel Guides</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <section aria-labelledby="guides-heading">
          <h1 id="guides-heading">Travel Guides</h1>
          <p>Expert travel guides with insider tips, detailed itineraries, and practical information for destinations worldwide.</p>
          
          ${guides.length > 0 ? `
          <ul class="content-list">
            ${guides.map(guide => `
              <li>
                <article>
                  <h2><a href="${getCanonicalUrl(`/guides/${guide.slug}`, locale)}">${escapeHtml(guide.title || guide.slug)}</a></h2>
                  ${guide.metaDescription ? `<p>${escapeHtml(guide.metaDescription)}</p>` : ""}
                </article>
              </li>
            `).join("")}
          </ul>
          ` : `
          <p>Travel guides are being prepared. Check back soon for comprehensive destination guides.</p>
          `}
        </section>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render individual guide page
 */
async function renderGuidePage(slug: string, options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  // Fetch guide from database
  let guide: any = null;
  try {
    const results = await db
      .select()
      .from(update9987Guides)
      .where(eq(update9987Guides.slug, slug))
      .limit(1);
    guide = results[0];
  } catch (error) {
    console.error(`[SSR] Error fetching guide "${slug}":`, error);
  }

  if (!guide) {
    // Try to find a destination match for the guide
    const destination = DESTINATION_DATA[slug];
    if (destination) {
      // Return a destination-based guide page
      return renderDestinationGuideFallback(slug, destination, options);
    }
    return render404(options);
  }

  // Extract guide content - use rewritten_content if available, fall back to sections
  const title = guide.title || slug;
  const summary = guide.metaDescription || "";
  const rewrittenContent = guide.rewrittenContent as string | null;
  const originalContent = guide.originalContent as string | null;
  const faqs = guide.faqs as Array<{ question: string; answer: string }> | null;
  
  // For backwards compatibility, also check sections
  const sections = guide.sections as any;
  const translation = sections?.translations?.[locale] || sections?.translations?.en || {};
  const sectionContent = translation.sections || [];

  const metaTags = generateMetaTags({
    title: `${title} - Travel Guide | TRAVI`,
    description: summary || `Comprehensive travel guide for ${title}. Expert tips, insider knowledge, and practical information.`,
    url: getCanonicalUrl(`/guides/${slug}`, locale),
    type: "article",
    locale,
  });

  // Build FAQ schema if FAQs exist
  const faqSchema = faqs && faqs.length > 0 ? `
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  })}</script>` : "";

  const structuredData = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TravelGuide",
    "name": title,
    "description": summary,
    "url": `${BASE_URL}/guides/${slug}`,
    "inLanguage": locale,
    "datePublished": guide.publishedAt?.toISOString(),
    "publisher": {
      "@type": "Organization",
      "name": "TRAVI",
      "url": BASE_URL
    }
  })}</script>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "Travel Guides", "item": `${BASE_URL}/guides` },
      { "@type": "ListItem", "position": 3, "name": title, "item": `${BASE_URL}/guides/${slug}` }
    ]
  })}</script>${faqSchema}`;

  // Render sections content - prioritize rewritten_content over sections
  let mainContentHtml = "";
  
  if (rewrittenContent) {
    // Use the AI-rewritten HTML content directly (sanitize for safety)
    mainContentHtml = rewrittenContent;
  } else if (originalContent) {
    // Fall back to original content
    mainContentHtml = originalContent;
  } else if (Array.isArray(sectionContent) && sectionContent.length > 0) {
    // Fall back to structured sections
    mainContentHtml = sectionContent.map((section: any) => `
      <section>
        <h${Math.min(section.level || 2, 6)}>${escapeHtml(section.heading || "")}</h${Math.min(section.level || 2, 6)}>
        <p>${escapeHtml(section.content || "")}</p>
      </section>
    `).join("");
  }
  
  // Render FAQs if available
  let faqsHtml = "";
  if (faqs && Array.isArray(faqs) && faqs.length > 0) {
    faqsHtml = `
      <section class="faqs">
        <h2>Frequently Asked Questions</h2>
        <dl>
          ${faqs.map(faq => `
            <div class="faq-item">
              <dt>${escapeHtml(faq.question)}</dt>
              <dd>${escapeHtml(faq.answer)}</dd>
            </div>
          `).join("")}
        </dl>
      </section>
    `;
  }

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li><a href="${getCanonicalUrl("/guides", locale)}">Travel Guides</a></li>
            <li aria-current="page">${escapeHtml(title)}</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <article>
          <header>
            <h1>${escapeHtml(title)}</h1>
            ${summary ? `<p class="lead">${escapeHtml(summary)}</p>` : ""}
          </header>
          
          <div class="content">
            ${mainContentHtml || `<p>Everything you need to know about visiting ${escapeHtml(title)}.</p>`}
          </div>
          
          ${faqsHtml}
        </article>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Fallback guide page when no DB entry exists but destination is valid
 */
async function renderDestinationGuideFallback(
  slug: string, 
  destination: typeof DESTINATION_DATA[string],
  options: SSRRenderOptions
): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;

  const metaTags = generateMetaTags({
    title: `${destination.name} Travel Guide | TRAVI`,
    description: destination.description,
    url: getCanonicalUrl(`/guides/${slug}`, locale),
    image: destination.heroImage,
    type: "article",
    locale,
  });

  const structuredData = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TravelGuide",
    "name": `${destination.name} Travel Guide`,
    "description": destination.description,
    "url": `${BASE_URL}/guides/${slug}`,
    "about": {
      "@type": "City",
      "name": destination.name
    },
    "publisher": {
      "@type": "Organization",
      "name": "TRAVI",
      "url": BASE_URL
    }
  })}</script>`;

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li><a href="${getCanonicalUrl("/guides", locale)}">Travel Guides</a></li>
            <li aria-current="page">${escapeHtml(destination.name)}</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <article>
          <header>
            <figure>
              <img src="${escapeHtml(destination.heroImage)}" alt="${escapeHtml(destination.name)}" loading="lazy">
            </figure>
            <h1>${escapeHtml(destination.name)} Travel Guide</h1>
            <p class="lead">${escapeHtml(destination.description)}</p>
          </header>
          
          <section>
            <h2>Plan Your Trip to ${escapeHtml(destination.name)}</h2>
            <p>${escapeHtml(destination.tagline)}</p>
            
            <h3>Essential Information</h3>
            <dl>
              <dt>Country</dt>
              <dd>${escapeHtml(destination.country)}</dd>
              <dt>Currency</dt>
              <dd>${escapeHtml(destination.currency)}</dd>
              <dt>Languages</dt>
              <dd>${escapeHtml(destination.language)}</dd>
              <dt>Time Zone</dt>
              <dd>${escapeHtml(destination.timezone)}</dd>
            </dl>
          </section>
          
          <section>
            <h2>Explore More</h2>
            <ul>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}`, locale)}">Destination Overview</a></li>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}/hotels`, locale)}">Hotels in ${escapeHtml(destination.name)}</a></li>
              <li><a href="${getCanonicalUrl(`/destinations/${slug}/attractions`, locale)}">Top Attractions</a></li>
            </ul>
          </section>
        </article>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render Tiqets attraction detail page
 */
async function renderTiqetsAttractionPage(slug: string, options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  // Try to fetch from tiqets_attractions table - prefer seo_slug (clean URL) then fall back to legacy slug
  let attraction: any = null;
  try {
    // First try seo_slug (clean, user-friendly URLs)
    let results = await db
      .select()
      .from(tiqetsAttractions)
      .where(eq(tiqetsAttractions.seoSlug, slug))
      .limit(1);
    
    if (!results[0]) {
      // Fall back to legacy slug for backwards compatibility
      results = await db
        .select()
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.slug, slug))
        .limit(1);
      
      // If found via legacy slug, redirect to seo_slug for SEO
      if (results[0] && results[0].seoSlug) {
        const redirectUrl = `/attractions/${results[0].seoSlug}`;
        return {
          html: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${redirectUrl}"><link rel="canonical" href="${BASE_URL}${redirectUrl}"></head><body>Redirecting...</body></html>`,
          status: 301,
          redirect: redirectUrl
        } as any;
      }
    }
    attraction = results[0];
  } catch (error) {
    console.error(`[SSR] Error fetching tiqets attraction "${slug}":`, error);
  }

  if (!attraction) {
    return render404(options);
  }
  
  // Use seo_slug for canonical URL if available
  const canonicalSlug = attraction.seoSlug || slug;

  const title = attraction.title || slug;
  // Use correct field names from schema: description, tiqetsSummary, or tiqetsDescription
  const description = attraction.description || attraction.tiqetsSummary || attraction.tiqetsDescription || "";
  // Schema uses cityName, not city
  const city = attraction.cityName || "";
  // Get image from tiqetsImages array or images array
  let imageUrl = `${BASE_URL}/ogImage.jpg`;
  if (attraction.images && Array.isArray(attraction.images) && attraction.images.length > 0) {
    imageUrl = attraction.images[0]?.url || imageUrl;
  } else if (attraction.tiqetsImages && Array.isArray(attraction.tiqetsImages) && attraction.tiqetsImages.length > 0) {
    const firstImg = attraction.tiqetsImages[0];
    imageUrl = firstImg?.large || firstImg?.medium || firstImg?.small || imageUrl;
  }

  const metaTags = generateMetaTags({
    title: `${title} - Tickets & Tours | TRAVI`,
    description: description.slice(0, 160),
    url: getCanonicalUrl(`/attractions/${canonicalSlug}`, locale),
    image: imageUrl,
    type: "place",
    locale,
  });

  const structuredData = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    "name": title,
    "description": description,
    "url": `${BASE_URL}/attractions/${canonicalSlug}`,
    "image": imageUrl,
    ...(city && {
      "address": {
        "@type": "PostalAddress",
        "addressLocality": city
      }
    })
  })}</script>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "Attractions", "item": `${BASE_URL}/attractions` },
      { "@type": "ListItem", "position": 3, "name": title, "item": `${BASE_URL}/attractions/${canonicalSlug}` }
    ]
  })}</script>`;

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li><a href="${getCanonicalUrl("/attractions", locale)}">Attractions</a></li>
            <li aria-current="page">${escapeHtml(title)}</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <article>
          <header>
            <figure>
              <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy">
            </figure>
            <h1>${escapeHtml(title)}</h1>
            ${city ? `<p><strong>Location:</strong> ${escapeHtml(city)}</p>` : ""}
          </header>
          
          <div class="content">
            <p>${escapeHtml(description)}</p>
          </div>
          
          <section>
            <h2>Book Tickets</h2>
            <p>Skip-the-line tickets and guided tours available. Compare prices and book your experience.</p>
          </section>
        </article>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

// ====== PHASE 2: NEW SSR RENDER FUNCTIONS ======

/**
 * Render News hub page
 */
async function renderNewsHub(options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  let newsArticles: Content[] = [];
  try {
    const results = await storage.getContents({ type: "article", status: "published" });
    newsArticles = (results || []).filter(a => 
      a.slug?.includes("news") || 
      a.title?.toLowerCase().includes("news") ||
      a.type === "article"
    ).slice(0, 20);
  } catch (error) {
    console.error("[SSR] Error fetching news:", error);
  }

  const metaTags = generateMetaTags({
    title: "Travel News & Updates | TRAVI",
    description: "Stay updated with the latest travel news, destination updates, and industry insights. Get breaking news about airlines, hotels, and travel destinations worldwide.",
    url: getCanonicalUrl("/news", locale),
    type: "website",
    locale,
  });

  const structuredData = generateStructuredData({
    type: "BreadcrumbList",
    breadcrumbs: [
      { name: "Home", url: getCanonicalUrl("/", locale) },
      { name: "News", url: getCanonicalUrl("/news", locale) },
    ],
  });

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li aria-current="page">News</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <section aria-labelledby="page-heading">
          <h1 id="page-heading">Travel News & Updates</h1>
          <p>Stay informed with the latest travel news, destination updates, and industry insights from around the world.</p>
          
          ${newsArticles.length > 0 ? `
          <ul class="content-list">
            ${newsArticles.map(item => `
              <li>
                <article>
                  <h2><a href="${getCanonicalUrl(`/article/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h2>
                  ${item.metaDescription ? `<p>${escapeHtml(item.metaDescription)}</p>` : ""}
                  ${item.publishedAt ? `<time datetime="${item.publishedAt.toISOString()}">${formatDate(item.publishedAt, locale)}</time>` : ""}
                </article>
              </li>
            `).join("")}
          </ul>
          ` : `<p>No news articles available at this time.</p>`}
        </section>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render Events hub page
 */
async function renderEventsHub(options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  let events: Content[] = [];
  try {
    const results = await storage.getContents({ type: "event", status: "published" });
    events = (results || []).slice(0, 20);
  } catch (error) {
    console.error("[SSR] Error fetching events:", error);
  }

  const metaTags = generateMetaTags({
    title: "Events & Festivals | TRAVI",
    description: "Discover upcoming events, festivals, and celebrations around the world. Find cultural events, concerts, exhibitions, and local festivals to plan your travels.",
    url: getCanonicalUrl("/events", locale),
    type: "website",
    locale,
  });

  const structuredData = generateStructuredData({
    type: "BreadcrumbList",
    breadcrumbs: [
      { name: "Home", url: getCanonicalUrl("/", locale) },
      { name: "Events", url: getCanonicalUrl("/events", locale) },
    ],
  });

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li aria-current="page">Events</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <section aria-labelledby="page-heading">
          <h1 id="page-heading">Events & Festivals</h1>
          <p>Explore upcoming events, festivals, and cultural celebrations at destinations worldwide. Plan your trip around unforgettable experiences.</p>
          
          ${events.length > 0 ? `
          <ul class="content-list">
            ${events.map(item => `
              <li>
                <article>
                  <h2><a href="${getCanonicalUrl(`/events/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h2>
                  ${item.metaDescription ? `<p>${escapeHtml(item.metaDescription)}</p>` : ""}
                </article>
              </li>
            `).join("")}
          </ul>
          ` : `<p>No upcoming events available at this time. Check back soon for new event listings.</p>`}
        </section>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render Shopping hub page
 */
async function renderShoppingHub(options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;

  const metaTags = generateMetaTags({
    title: "Shopping Guides & Destinations | TRAVI",
    description: "Discover the best shopping destinations, markets, malls, and boutiques around the world. Find shopping guides with tips on local products, duty-free, and souvenirs.",
    url: getCanonicalUrl("/shopping", locale),
    type: "website",
    locale,
  });

  const structuredData = generateStructuredData({
    type: "BreadcrumbList",
    breadcrumbs: [
      { name: "Home", url: getCanonicalUrl("/", locale) },
      { name: "Shopping", url: getCanonicalUrl("/shopping", locale) },
    ],
  });

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li aria-current="page">Shopping</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <section aria-labelledby="page-heading">
          <h1 id="page-heading">Shopping Guides & Destinations</h1>
          <p>Explore the world's best shopping experiences, from luxury malls to traditional markets. Find unique souvenirs, local crafts, and duty-free bargains.</p>
          
          <section aria-labelledby="dubai-shopping">
            <h2 id="dubai-shopping">Dubai Shopping</h2>
            <p>Dubai is a shopper's paradise with world-class malls, traditional souks, and tax-free shopping. Explore everything from gold and spices to high-end fashion.</p>
            <ul>
              <li><strong>Dubai Mall</strong> - The world's largest shopping destination</li>
              <li><strong>Mall of the Emirates</strong> - Luxury brands and Ski Dubai</li>
              <li><strong>Gold Souk</strong> - Traditional gold marketplace in Deira</li>
              <li><strong>Spice Souk</strong> - Aromatic spices and traditional goods</li>
            </ul>
          </section>
        </section>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render Districts hub page
 */
async function renderDistrictsHub(options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  let districts: Content[] = [];
  try {
    const results = await storage.getContents({ type: "district", status: "published" });
    districts = results || [];
  } catch (error) {
    console.error("[SSR] Error fetching districts:", error);
  }

  // Fallback districts data
  const dubaiDistricts = [
    { slug: "downtown-dubai", name: "Downtown Dubai", description: "Home to Burj Khalifa and Dubai Mall" },
    { slug: "dubai-marina", name: "Dubai Marina", description: "Waterfront living and dining" },
    { slug: "palm-jumeirah", name: "Palm Jumeirah", description: "Iconic palm-shaped island" },
    { slug: "jbr-jumeirah-beach-residence", name: "JBR", description: "Beach lifestyle and dining" },
    { slug: "business-bay", name: "Business Bay", description: "Modern business and residential hub" },
    { slug: "old-dubai", name: "Old Dubai", description: "Historic heart with souks and Creek" },
    { slug: "difc", name: "DIFC", description: "Financial center with art galleries" },
    { slug: "dubai-hills-estate", name: "Dubai Hills Estate", description: "Premium residential community" },
  ];

  const metaTags = generateMetaTags({
    title: "Dubai Districts & Neighborhoods | TRAVI",
    description: "Explore Dubai's diverse districts and neighborhoods. From Downtown's skyline to Marina's waterfront, discover the best areas to stay, dine, and experience.",
    url: getCanonicalUrl("/districts", locale),
    type: "website",
    locale,
  });

  const structuredData = generateStructuredData({
    type: "BreadcrumbList",
    breadcrumbs: [
      { name: "Home", url: getCanonicalUrl("/", locale) },
      { name: "Districts", url: getCanonicalUrl("/districts", locale) },
    ],
  });

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li aria-current="page">Districts</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <section aria-labelledby="page-heading">
          <h1 id="page-heading">Dubai Districts & Neighborhoods</h1>
          <p>Discover Dubai's unique districts, each offering its own character, attractions, and experiences. Find the perfect neighborhood for your stay.</p>
          
          <ul class="content-list">
            ${districts.length > 0 ? 
              districts.map(item => `
                <li>
                  <article>
                    <h2><a href="${getCanonicalUrl(`/districts/${item.slug}`, locale)}">${escapeHtml(item.title)}</a></h2>
                    ${item.metaDescription ? `<p>${escapeHtml(item.metaDescription)}</p>` : ""}
                  </article>
                </li>
              `).join("") :
              dubaiDistricts.map(d => `
                <li>
                  <article>
                    <h2><a href="${getCanonicalUrl(`/districts/${d.slug}`, locale)}">${escapeHtml(d.name)}</a></h2>
                    <p>${escapeHtml(d.description)}</p>
                  </article>
                </li>
              `).join("")
            }
          </ul>
        </section>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render individual district page
 */
async function renderDistrictPage(slug: string, options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  let content: ContentWithRelations | undefined;
  try {
    content = await storage.getContentBySlug(slug);
  } catch (error) {
    console.error(`[SSR] Error fetching district "${slug}":`, error);
  }

  // Generate district name from slug if no content found
  const districtName = content?.title || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const description = content?.metaDescription || `Explore ${districtName} - one of Dubai's premier districts. Discover attractions, hotels, restaurants, and experiences in this vibrant neighborhood.`;

  const metaTags = generateMetaTags({
    title: `${districtName} - Dubai District Guide | TRAVI`,
    description,
    url: getCanonicalUrl(`/districts/${slug}`, locale),
    type: "place",
    locale,
  });

  const structuredData = [
    generateStructuredData({
      type: "BreadcrumbList",
      breadcrumbs: [
        { name: "Home", url: getCanonicalUrl("/", locale) },
        { name: "Districts", url: getCanonicalUrl("/districts", locale) },
        { name: districtName, url: getCanonicalUrl(`/districts/${slug}`, locale) },
      ],
    }),
  ].join("\n");

  const bodyContent = content?.blocks ? renderContentBlocks(content.blocks, locale) : `
    <p>${escapeHtml(description)}</p>
    <section>
      <h2>About ${escapeHtml(districtName)}</h2>
      <p>This district offers a unique blend of attractions, dining, and accommodation options for visitors and residents alike.</p>
    </section>
  `;

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li><a href="${getCanonicalUrl("/districts", locale)}">Districts</a></li>
            <li aria-current="page">${escapeHtml(districtName)}</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <article>
          <h1>${escapeHtml(districtName)}</h1>
          <div class="content">
            ${bodyContent}
          </div>
        </article>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render individual restaurant/dining page
 */
async function renderRestaurantPage(slug: string, options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  let content: ContentWithRelations | undefined;
  try {
    content = await storage.getContentBySlug(slug);
  } catch (error) {
    console.error(`[SSR] Error fetching restaurant "${slug}":`, error);
    return render404(options);
  }

  if (!content || content.status !== "published") {
    return render404(options);
  }

  const image = getContentImage(content);

  const metaTags = generateMetaTags({
    title: content.metaTitle || content.title,
    description: content.metaDescription || "",
    url: getCanonicalUrl(`/dining/${slug}`, locale),
    image,
    type: "place",
    locale,
  });

  // Generate Restaurant schema (new addition for SEO)
  const restaurantSchema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: content.title,
    description: content.metaDescription || "",
    image: image,
    url: getCanonicalUrl(`/dining/${slug}`, locale),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Dubai",
      addressCountry: "AE",
    },
    servesCuisine: content.dining?.cuisineType || "International",
  };

  const structuredData = [
    `<script type="application/ld+json">${JSON.stringify(restaurantSchema, null, 2)}</script>`,
    generateStructuredData({
      type: "BreadcrumbList",
      breadcrumbs: [
        { name: "Home", url: getCanonicalUrl("/", locale) },
        { name: "Dining", url: getCanonicalUrl("/dining", locale) },
        { name: content.title, url: getCanonicalUrl(`/dining/${slug}`, locale) },
      ],
    }),
  ].join("\n");

  const bodyContent = renderContentBlocks(content.blocks || [], locale);

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li><a href="${getCanonicalUrl("/dining", locale)}">Dining</a></li>
            <li aria-current="page">${escapeHtml(content.title)}</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <article>
          <header>
            <h1>${escapeHtml(content.title)}</h1>
            ${content.metaDescription ? `<p class="lead">${escapeHtml(content.metaDescription)}</p>` : ""}
          </header>
          
          <div class="content">
            ${bodyContent}
          </div>
        </article>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render individual event page
 */
async function renderEventPage(slug: string, options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  let content: ContentWithRelations | undefined;
  try {
    content = await storage.getContentBySlug(slug);
  } catch (error) {
    console.error(`[SSR] Error fetching event "${slug}":`, error);
    return render404(options);
  }

  if (!content || content.status !== "published") {
    return render404(options);
  }

  const image = getContentImage(content);

  const metaTags = generateMetaTags({
    title: content.metaTitle || content.title,
    description: content.metaDescription || "",
    url: getCanonicalUrl(`/events/${slug}`, locale),
    image,
    type: "website",
    locale,
  });

  // Generate Event schema (new addition for SEO)
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: content.title,
    description: content.metaDescription || "",
    image: image,
    url: getCanonicalUrl(`/events/${slug}`, locale),
    location: {
      "@type": "Place",
      name: (content.event as any)?.venueName || content.event?.venue || "Dubai",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Dubai",
        addressCountry: "AE",
      },
    },
    startDate: (content.event as any)?.startDate?.toISOString() || content.event?.eventDate?.toISOString() || content.publishedAt?.toISOString(),
    endDate: content.event?.endDate?.toISOString(),
    organizer: {
      "@type": "Organization",
      name: SITE_NAME,
      url: BASE_URL,
    },
  };

  const structuredData = [
    `<script type="application/ld+json">${JSON.stringify(eventSchema, null, 2)}</script>`,
    generateStructuredData({
      type: "BreadcrumbList",
      breadcrumbs: [
        { name: "Home", url: getCanonicalUrl("/", locale) },
        { name: "Events", url: getCanonicalUrl("/events", locale) },
        { name: content.title, url: getCanonicalUrl(`/events/${slug}`, locale) },
      ],
    }),
  ].join("\n");

  const bodyContent = renderContentBlocks(content.blocks || [], locale);

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li><a href="${getCanonicalUrl("/events", locale)}">Events</a></li>
            <li aria-current="page">${escapeHtml(content.title)}</li>
          </ol>
        </nav>
      </header>
      
      <main>
        <article>
          <header>
            <h1>${escapeHtml(content.title)}</h1>
            ${content.metaDescription ? `<p class="lead">${escapeHtml(content.metaDescription)}</p>` : ""}
          </header>
          
          <div class="content">
            ${bodyContent}
          </div>
        </article>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}

/**
 * Render 404 page
 */
async function render404(options: SSRRenderOptions): Promise<{ html: string; status: number }> {
  const { locale = "en" } = options;
  
  const metaTags = generateMetaTags({
    title: "Page Not Found | TRAVI",
    description: "The page you're looking for could not be found. Explore our travel guides and recommendations.",
    url: getCanonicalUrl("/404", locale),
    type: "website",
    locale,
  });

  const html = wrapInHtml({
    metaTags,
    structuredData: "",
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
      </header>
      
      <main>
        <section>
          <h1>Page Not Found</h1>
          <p>Sorry, the page you're looking for doesn't exist or has been moved.</p>
          <p><a href="${getCanonicalUrl("/", locale)}">Return to homepage</a></p>
        </section>
      </main>
      
      ${renderFooter(locale)}
    `,
  });

  return { html, status: 404 };
}

/**
 * Render content blocks to semantic HTML
 */
function renderContentBlocks(blocks: ContentBlock[], locale: Locale): string {
  if (!blocks || !Array.isArray(blocks)) return "";
  
  const sortedBlocks = [...blocks].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  return sortedBlocks.map(block => {
    const data = block.data || {};
    
    switch (block.type) {
      case "hero":
        return `
          <figure>
            ${data.imageUrl ? `<img src="${escapeHtml(String(data.imageUrl))}" alt="${escapeHtml(String(data.title || data.alt || ""))}" loading="lazy">` : ""}
            ${data.caption ? `<figcaption>${escapeHtml(String(data.caption))}</figcaption>` : ""}
          </figure>
        `;
        
      case "heading":
        const level = Math.min(Math.max(Number(data.level) || 2, 1), 6);
        return `<h${level}>${escapeHtml(String(data.text || ""))}</h${level}>`;
        
      case "text":
      case "paragraph":
        return `<p>${escapeHtml(String(data.text || data.content || ""))}</p>`;
        
      case "image":
        return `
          <figure>
            <img src="${escapeHtml(String(data.src || data.url || ""))}" alt="${escapeHtml(String(data.alt || ""))}" loading="lazy">
            ${data.caption ? `<figcaption>${escapeHtml(String(data.caption))}</figcaption>` : ""}
          </figure>
        `;
        
      case "gallery":
        const images = Array.isArray(data.images) ? data.images : [];
        if (images.length === 0) return "";
        return `
          <figure>
            ${images.map((img: any) => `
              <img src="${escapeHtml(String(img.src || img.url || ""))}" alt="${escapeHtml(String(img.alt || ""))}" loading="lazy">
            `).join("")}
            ${data.caption ? `<figcaption>${escapeHtml(String(data.caption))}</figcaption>` : ""}
          </figure>
        `;
        
      case "FAQ":
      case "faq":
        const items = Array.isArray(data.items) ? data.items : Array.isArray(data.faqs) ? data.faqs : [];
        if (items.length === 0) return "";
        return `
          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading">Frequently Asked Questions</h2>
            <dl>
              ${items.map((item: any) => `
                <dt>${escapeHtml(String(item.question || ""))}</dt>
                <dd>${escapeHtml(String(item.answer || ""))}</dd>
              `).join("")}
            </dl>
          </section>
        `;
        
      case "list":
        const listItems = Array.isArray(data.items) ? data.items : [];
        const ordered = data.ordered === true;
        const tag = ordered ? "ol" : "ul";
        return `
          <${tag}>
            ${listItems.map((item: any) => `<li>${escapeHtml(String(item.text || item || ""))}</li>`).join("")}
          </${tag}>
        `;
        
      case "quote":
      case "blockquote":
        return `
          <blockquote>
            <p>${escapeHtml(String(data.text || data.quote || ""))}</p>
            ${data.author ? `<cite>${escapeHtml(String(data.author))}</cite>` : ""}
          </blockquote>
        `;
        
      case "divider":
        return `<hr>`;
        
      default:
        if (data.text || data.content) {
          return `<p>${escapeHtml(String(data.text || data.content || ""))}</p>`;
        }
        return "";
    }
  }).filter(Boolean).join("\n");
}

/**
 * Render footer
 */
function renderFooter(locale: Locale): string {
  return `
    <footer>
      <nav aria-label="Footer navigation">
        <ul>
          <li><a href="${getCanonicalUrl("/about", locale)}">About</a></li>
          <li><a href="${getCanonicalUrl("/contact", locale)}">Contact</a></li>
          <li><a href="${getCanonicalUrl("/privacy", locale)}">Privacy Policy</a></li>
        </ul>
      </nav>
      <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
    </footer>
  `;
}

/**
 * Wrap content in full HTML document
 */
function wrapInHtml(params: {
  metaTags: string;
  structuredData: string;
  locale: Locale;
  content: string;
}): string {
  const { metaTags, structuredData, locale, content } = params;
  const dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
  const lang = locale;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
    ${metaTags}
    ${structuredData}
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
      header, footer { padding: 20px 0; }
      nav ul { list-style: none; padding: 0; display: flex; gap: 20px; flex-wrap: wrap; }
      main { padding: 20px 0; }
      article { max-width: 800px; }
      figure { margin: 20px 0; }
      img { max-width: 100%; height: auto; }
      dl { margin: 20px 0; }
      dt { font-weight: bold; margin-top: 15px; }
      dd { margin-left: 20px; }
      .content-list { list-style: none; padding: 0; }
      .content-list li { margin: 20px 0; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
      .content-list h2 { margin-top: 0; }
      [dir="rtl"] dd { margin-right: 20px; margin-left: 0; }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
}

/**
 * Get image from content
 */
function getContentImage(content: ContentWithRelations): string {
  if (!content.blocks || !Array.isArray(content.blocks)) {
    return `${BASE_URL}/ogImage.jpg`;
  }
  
  for (const block of content.blocks) {
    if (block.type === "hero" && block.data?.imageUrl) {
      return String(block.data.imageUrl);
    }
    if (block.type === "image" && block.data?.src) {
      return String(block.data.src);
    }
  }
  
  return `${BASE_URL}/ogImage.jpg`;
}

/**
 * Format date for display
 */
function formatDate(date: Date, locale: Locale): string {
  try {
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return date.toISOString().split("T")[0];
  }
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}
