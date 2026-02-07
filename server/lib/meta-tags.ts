/**
 * SEO Meta Tags Generator
 * Generates comprehensive meta tags for search engines and social media
 */

import type { ContentWithRelations, Locale } from "@shared/schema";
import { SUPPORTED_LOCALES } from "@shared/schema";

const BASE_URL = "https://travi.world";
const SITE_NAME = "TRAVI";
const DEFAULT_IMAGE = `${BASE_URL}/ogImage.jpg`;

export interface MetaTagsOptions {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: "website" | "article" | "place";
  locale?: Locale;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
  noIndex?: boolean;
}

export interface StructuredDataOptions {
  content?: ContentWithRelations;
  type:
    | "Article"
    | "Hotel"
    | "TouristAttraction"
    | "WebSite"
    | "FAQPage"
    | "BreadcrumbList"
    | "Organization"
    | "ItemList"
    | "Restaurant"
    | "Event";
  locale?: Locale;
  breadcrumbs?: { name: string; url: string }[];
  listItems?: { name: string; url: string; image?: string; description?: string }[];
  eventData?: { startDate?: string; endDate?: string; location?: string; venue?: string };
}

/**
 * Generate canonical URL with locale prefix
 */
export function getCanonicalUrl(path: string, locale?: Locale): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!locale || locale === "en") {
    return `${BASE_URL}${cleanPath}`;
  }
  return `${BASE_URL}/${locale}${cleanPath}`;
}

/**
 * Generate HTML meta tags string
 */
export function generateMetaTags(options: MetaTagsOptions): string {
  const {
    title,
    description,
    url,
    image = DEFAULT_IMAGE,
    type = "website",
    locale = "en",
    publishedTime,
    modifiedTime,
    author,
    section,
    tags = [],
    noIndex = false,
  } = options;

  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const ogType = type === "place" ? "place" : type;
  const metaTags: string[] = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${escapeHtml(fullTitle)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,

    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${escapeHtml(title)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:locale" content="${getOgLocale(locale)}">`,

    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    `<meta name="twitter:image:alt" content="${escapeHtml(title)}">`,

    noIndex
      ? `<meta name="robots" content="noindex, nofollow">`
      : `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`,
  ];

  if (publishedTime) {
    metaTags.push(`<meta property="article:published_time" content="${publishedTime}">`);
  }
  if (modifiedTime) {
    metaTags.push(`<meta property="article:modified_time" content="${modifiedTime}">`);
  }
  if (author) {
    metaTags.push(`<meta property="article:author" content="${escapeHtml(author)}">`);
  }
  if (section) {
    metaTags.push(`<meta property="article:section" content="${escapeHtml(section)}">`);
  }
  tags.forEach(tag => {
    metaTags.push(`<meta property="article:tag" content="${escapeHtml(tag)}">`);
  });

  SUPPORTED_LOCALES.forEach(({ code }) => {
    const altUrl = getCanonicalUrl(url.replace(BASE_URL, "").replace(`/${locale}/`, "/"), code);
    metaTags.push(`<link rel="alternate" hreflang="${code}" href="${altUrl}">`);
  });
  // x-default points to English version
  const xDefaultUrl = getCanonicalUrl(url.replace(BASE_URL, "").replace(`/${locale}/`, "/"), "en");
  metaTags.push(`<link rel="alternate" hreflang="x-default" href="${xDefaultUrl}">`);

  return metaTags.join("\n    ");
}

/**
 * Generate JSON-LD structured data
 */
function buildWebSiteSchema(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: BASE_URL,
    description:
      "Expert travel guides, reviews, and insights for destinations worldwide. Discover hotels, attractions, restaurants, and local experiences.",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

function buildArticleSchema(content: ContentWithRelations, locale: Locale): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: content.metaTitle || content.title,
    description: content.metaDescription || "",
    image: getContentImage(content),
    datePublished: content.publishedAt?.toISOString() || content.createdAt?.toISOString(),
    dateModified: content.updatedAt?.toISOString(),
    author: { "@type": "Organization", name: SITE_NAME, url: BASE_URL },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon.png` },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": getCanonicalUrl(`/article/${content.slug}`, locale),
    },
  };
}

function buildHotelSchema(content: ContentWithRelations, locale: Locale): object {
  const hotelLocation = extractLocation(content);
  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: content.title,
    description: content.metaDescription || "",
    image: getContentImage(content),
    url: getCanonicalUrl(`/hotel/${content.slug}`, locale),
    address: hotelLocation
      ? { "@type": "PostalAddress", addressLocality: hotelLocation }
      : undefined,
  };
}

function buildAttractionSchema(content: ContentWithRelations, locale: Locale): object {
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: content.title,
    description: content.metaDescription || "",
    image: getContentImage(content),
    url: getCanonicalUrl(`/attraction/${content.slug}`, locale),
    address: { "@type": "PostalAddress", addressLocality: extractLocation(content) },
  };
}

function buildFAQSchema(content: ContentWithRelations): object | null {
  if (!content?.blocks) return null;
  const faqItems = extractFAQs(content.blocks);
  if (faqItems.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

function buildBreadcrumbSchema(breadcrumbs: { name: string; url: string }[]): object | null {
  if (!breadcrumbs || breadcrumbs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function buildOrganizationSchema(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: "TRAVI World",
    url: BASE_URL,
    logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon.png`, width: 512, height: 512 },
    description:
      "Expert travel guides, reviews, and insights for destinations worldwide. Discover hotels, attractions, restaurants, and local experiences.",
    sameAs: [
      "https://twitter.com/traviworld",
      "https://www.facebook.com/traviworld",
      "https://www.instagram.com/traviworld",
      "https://www.linkedin.com/company/traviworld",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "info@travi.world",
      availableLanguage: ["English", "Arabic", "Hebrew"],
    },
    address: { "@type": "PostalAddress", addressCountry: "GI", addressLocality: "Gibraltar" },
    parentOrganization: { "@type": "Organization", name: "KBR Global" },
  };
}

function buildItemListSchema(
  listItems: { name: string; url: string; image?: string; description?: string }[]
): object | null {
  if (!listItems || listItems.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: listItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Thing",
        name: item.name,
        url: item.url,
        ...(item.image && { image: item.image }),
        ...(item.description && { description: item.description }),
      },
    })),
    numberOfItems: listItems.length,
  };
}

function buildRestaurantSchema(content: ContentWithRelations, locale: Locale): object {
  const restaurantLocation = extractLocation(content);
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: content.title,
    description: content.metaDescription || "",
    image: getContentImage(content),
    url: getCanonicalUrl(`/dining/${content.slug}`, locale),
    address: restaurantLocation
      ? { "@type": "PostalAddress", addressLocality: restaurantLocation }
      : undefined,
    servesCuisine: content.dining?.cuisineType || "International",
    priceRange: content.dining?.priceRange || "$$",
  };
}

function buildEventSchema(content: ContentWithRelations, locale: Locale, eventData: any): object {
  const eventInfo = eventData || {};
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: content.title,
    description: content.metaDescription || "",
    image: getContentImage(content),
    url: getCanonicalUrl(`/events/${content.slug}`, locale),
    startDate: eventInfo.startDate || content.publishedAt?.toISOString(),
    ...(eventInfo.endDate && { endDate: eventInfo.endDate }),
    location:
      eventInfo.venue || eventInfo.location
        ? {
            "@type": "Place",
            name: eventInfo.venue || eventInfo.location,
            address: eventInfo.location
              ? { "@type": "PostalAddress", addressLocality: eventInfo.location }
              : undefined,
          }
        : undefined,
    organizer: { "@type": "Organization", name: SITE_NAME, url: BASE_URL },
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };
}

export function generateStructuredData(options: StructuredDataOptions): string {
  const { content, type, locale = "en", breadcrumbs, listItems, eventData } = options;

  const schema = buildSchemaByType(type, content, locale, breadcrumbs, listItems, eventData);
  if (!schema) return "";

  const schemas = Array.isArray(schema) ? schema : [schema];
  const schemaJson =
    schemas.length === 1 ? JSON.stringify(schemas[0], null, 2) : JSON.stringify(schemas, null, 2);
  return `<script type="application/ld+json">${schemaJson}</script>`;
}

function buildSchemaByType(
  type: string,
  content: ContentWithRelations | undefined,
  locale: Locale,
  breadcrumbs?: { name: string; url: string }[],
  listItems?: { name: string; url: string; image?: string; description?: string }[],
  eventData?: any
): object | null {
  switch (type) {
    case "WebSite":
      return buildWebSiteSchema();
    case "Article":
      return content ? buildArticleSchema(content, locale) : null;
    case "Hotel":
      return content ? buildHotelSchema(content, locale) : null;
    case "TouristAttraction":
      return content ? buildAttractionSchema(content, locale) : null;
    case "FAQPage":
      return content ? buildFAQSchema(content) : null;
    case "BreadcrumbList":
      return buildBreadcrumbSchema(breadcrumbs || []);
    case "Organization":
      return buildOrganizationSchema();
    case "ItemList":
      return buildItemListSchema(listItems || []);
    case "Restaurant":
      return content ? buildRestaurantSchema(content, locale) : null;
    case "Event":
      return content ? buildEventSchema(content, locale, eventData) : null;
    default:
      return null;
  }
}

/**
 * Get image from content blocks or use default
 */
function getContentImage(content: ContentWithRelations): string {
  if (!content.blocks || !Array.isArray(content.blocks)) {
    return DEFAULT_IMAGE;
  }

  for (const block of content.blocks) {
    if (block.type === "hero" && block.data?.imageUrl) {
      return String(block.data.imageUrl);
    }
    if (block.type === "image" && block.data?.src) {
      return String(block.data.src);
    }
  }

  return DEFAULT_IMAGE;
}

/**
 * Extract location from content
 * Returns empty string if no location is found - avoids hardcoding any destination
 */
function extractLocation(content: ContentWithRelations, fallbackDestination?: string): string {
  if (content.attraction?.location) {
    return content.attraction.location;
  }
  if (content.hotel?.location) {
    return content.hotel.location;
  }
  if (content.dining?.location) {
    return content.dining.location;
  }
  return fallbackDestination || "";
}

/**
 * Extract FAQs from content blocks
 */
function extractFAQs(blocks: any[]): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];

  for (const block of blocks) {
    if (block.type === "FAQ" || block.type === "faq") {
      const items = block.data?.items || block.data?.faqs || [];
      for (const item of items) {
        if (item.question && item.answer) {
          faqs.push({
            question: String(item.question),
            answer: String(item.answer),
          });
        }
      }
    }
  }

  return faqs;
}

/**
 * Convert locale to Open Graph locale format
 */
function getOgLocale(locale: Locale): string {
  const localeMap: Record<string, string> = {
    en: "en_US",
    ar: "ar_AE",
    hi: "hi_IN",
    zh: "zh_CN",
    ru: "ru_RU",
    ur: "ur_PK",
    fr: "fr_FR",
    de: "de_DE",
    fa: "fa_IR",
    bn: "bn_BD",
    fil: "fil_PH",
    es: "es_ES",
    tr: "tr_TR",
    it: "it_IT",
    ja: "ja_JP",
    ko: "ko_KR",
    he: "he_IL",
  };
  return localeMap[locale as any] || "en_US";
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
