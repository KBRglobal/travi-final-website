import { useEffect } from "react";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { SUPPORTED_LOCALES, RTL_LOCALES, type Locale } from "@shared/schema";

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  keywords?: string[];
  noIndex?: boolean;
  availableTranslations?: Locale[];
}

export function SEOHead({
  title,
  description,
  canonicalPath = "",
  ogImage,
  ogType = "website",
  publishedTime,
  modifiedTime,
  author,
  keywords,
  noIndex = false,
  availableTranslations,
}: SEOHeadProps) {
  const { locale, isRTL, localePath } = useLocale();

  // Helper to generate localized URL for a specific locale
  const getLocalizedUrl = (path: string, targetLocale?: Locale): string => {
    const loc = targetLocale || locale;
    if (loc === "en") return path;
    return `/${loc}${path === "/" ? "" : path}`;
  };

  // Map duplicate paths to their canonical versions
  const getCanonicalPath = (path: string): string => {
    const canonicalMappings: Record<string, string> = {
      "/privacy-policy": "/privacy",
      "/terms-conditions": "/terms",
      "/cookie-policy": "/cookies",
    };
    return canonicalMappings[path] || path;
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://travi.world";
  const normalizedCanonicalPath = getCanonicalPath(canonicalPath);
  // Canonical URL should ALWAYS point to the non-prefixed (English) version for SEO
  const canonicalUrl = `${baseUrl}${normalizedCanonicalPath}`;

  // Generate hreflang URLs for all available translations
  const hreflangUrls = (availableTranslations || SUPPORTED_LOCALES.map((l) => l.code)).map(
    (loc) => ({
      locale: loc,
      url: `${baseUrl}${getLocalizedUrl(normalizedCanonicalPath, loc)}`,
    })
  );

  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper to update or create meta tag
    const setMetaTag = (name: string, contents: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = contents;
    };

    // Helper to update or create link tag
    const setLinkTag = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]:not([hreflang])`;
      let link = document.querySelector(selector) as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        if (hreflang) link.hreflang = hreflang;
        document.head.appendChild(link);
      }
      link.href = href;
    };

    // Basic meta tags
    setMetaTag("description", description);
    if (keywords && keywords.length > 0) {
      setMetaTag("keywords", keywords.join(", "));
    }
    if (author) {
      setMetaTag("author", author);
    }
    if (noIndex) {
      setMetaTag("robots", "noindex, nofollow");
    } else {
      setMetaTag("robots", "index, follow");
    }

    // Open Graph meta tags
    setMetaTag("og:title", title, true);
    setMetaTag("og:description", description, true);
    setMetaTag("og:type", ogType, true);
    setMetaTag("og:url", canonicalUrl, true);
    setMetaTag("og:site_name", "TRAVI World", true);
    setMetaTag("og:locale", locale.replace("-", "_"), true);
    if (ogImage) {
      setMetaTag("og:image", ogImage, true);
    }

    // Twitter Card meta tags
    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", title);
    setMetaTag("twitter:description", description);
    if (ogImage) {
      setMetaTag("twitter:image", ogImage);
    }

    // Article-specific meta tags
    if (ogType === "article") {
      if (publishedTime) {
        setMetaTag("article:published_time", publishedTime, true);
      }
      if (modifiedTime) {
        setMetaTag("article:modified_time", modifiedTime, true);
      }
      if (author) {
        setMetaTag("article:author", author, true);
      }
    }

    // Canonical URL
    setLinkTag("canonical", canonicalUrl);

    // hreflang tags for international SEO
    // Clear existing hreflang tags
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());

    // Add hreflang for each available translation
    hreflangUrls.forEach(({ locale: loc, url }) => {
      setLinkTag("alternate", url, loc);
    });

    // Add x-default hreflang (points to English version)
    setLinkTag("alternate", `${baseUrl}${getLocalizedUrl(normalizedCanonicalPath, "en")}`, "x-default");

    // Add alternate locale OG tags
    hreflangUrls
      .filter(({ locale: loc }) => loc !== locale)
      .forEach(({ locale: loc }) => {
        setMetaTag(`og:locale:alternate`, loc.replace("-", "_"), true);
      });
  }, [
    title,
    description,
    canonicalUrl,
    normalizedCanonicalPath,
    ogImage,
    ogType,
    publishedTime,
    modifiedTime,
    author,
    keywords,
    noIndex,
    locale,
    hreflangUrls,
    baseUrl,
  ]);

  return null; // This component only manages head tags, doesn't render anything
}

// Component to inject JSON-LD structured data
interface StructuredDataProps {
  type: "Article" | "Hotel" | "Restaurant" | "TouristAttraction" | "Place" | "WebPage";
  data: Record<string, unknown>;
}

export function StructuredData({ type, data }: StructuredDataProps) {
  const { locale } = useLocale();

  useEffect(() => {
    const scriptId = `structured-data-${type}`;
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": type,
      inLanguage: locale,
      ...data,
    };

    script.textContent = JSON.stringify(structuredData);

    return () => {
      script.remove();
    };
  }, [type, data, locale]);

  return null;
}

// Pre-made structured data generators
export function generateArticleStructuredData(article: {
  title: string;
  description: string;
  image?: string;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  url: string;
}) {
  return {
    headline: article.title,
    description: article.description,
    image: article.image,
    author: article.author
      ? {
          "@type": "Person",
          name: article.author,
        }
      : undefined,
    datePublished: article.publishedDate,
    dateModified: article.modifiedDate,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": article.url,
    },
    publisher: {
      "@type": "Organization",
      name: "Travi",
      logo: {
        "@type": "ImageObject",
        url: "https://travi.world/logo.png",
      },
    },
  };
}

export function generateHotelStructuredData(hotel: {
  name: string;
  description: string;
  image?: string;
  address?: string;
  priceRange?: string;
  rating?: number;
  url: string;
}) {
  return {
    name: hotel.name,
    description: hotel.description,
    image: hotel.image,
    address: hotel.address
      ? {
          "@type": "PostalAddress",
          addressLocality: "Dubai",
          addressCountry: "AE",
          streetAddress: hotel.address,
        }
      : undefined,
    priceRange: hotel.priceRange,
    aggregateRating: hotel.rating
      ? {
          "@type": "AggregateRating",
          ratingValue: hotel.rating,
          bestRating: 5,
        }
      : undefined,
    url: hotel.url,
  };
}

export function generateAttractionStructuredData(attraction: {
  name: string;
  description: string;
  image?: string;
  address?: string;
  openingHours?: string;
  url: string;
}) {
  return {
    name: attraction.name,
    description: attraction.description,
    image: attraction.image,
    address: attraction.address
      ? {
          "@type": "PostalAddress",
          addressLocality: "Dubai",
          addressCountry: "AE",
          streetAddress: attraction.address,
        }
      : undefined,
    openingHoursSpecification: attraction.openingHours,
    url: attraction.url,
    geo: {
      "@type": "GeoCoordinates",
      addressCountry: "AE",
    },
  };
}

// ==================== Image SEO Structured Data ====================

export interface ImageSeoStructuredData {
  contentUrl: string;
  name: string;
  description: string;
  width?: number;
  height?: number;
  datePublished?: string;
  author?: string;
  license?: string;
  contentLocation?: {
    name: string;
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
    latitude?: string;
    longitude?: string;
  };
  caption?: string;
  keywords?: string[];
}

/**
 * Generate ImageObject schema markup
 */
export function generateImageObjectStructuredData(image: ImageSeoStructuredData, pageUrl?: string) {
  const schema: Record<string, unknown> = {
    "@type": "ImageObject",
    contentUrl: image.contentUrl,
    name: image.name,
    description: image.description,
  };

  if (pageUrl) {
    schema.url = pageUrl;
  }

  if (image.width && image.height) {
    schema.width = String(image.width);
    schema.height = String(image.height);
  }

  if (image.datePublished) {
    schema.datePublished = image.datePublished;
  }

  if (image.author) {
    schema.author = {
      "@type": "Organization",
      name: image.author,
    };
  }

  if (image.license) {
    schema.license = image.license;
  }

  // Detect format from URL
  const formatMatch = image.contentUrl.match(/\.(webp|jpg|jpeg|png|gif)(\?|$)/i);
  if (formatMatch) {
    const format = formatMatch[1].toLowerCase();
    schema.encodingFormat = `image/${format === 'jpg' ? 'jpeg' : format}`;
  }

  if (image.contentLocation) {
    schema.contentLocation = {
      "@type": "Place",
      name: image.contentLocation.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: image.contentLocation.addressLocality || "Dubai",
        addressRegion: image.contentLocation.addressRegion || "Dubai",
        addressCountry: image.contentLocation.addressCountry || "AE",
      },
    };

    if (image.contentLocation.latitude && image.contentLocation.longitude) {
      (schema.contentLocation as Record<string, unknown>).geo = {
        "@type": "GeoCoordinates",
        latitude: image.contentLocation.latitude,
        longitude: image.contentLocation.longitude,
      };
    }
  }

  if (image.caption) {
    schema.caption = image.caption;
  }

  if (image.keywords && image.keywords.length > 0) {
    schema.keywords = image.keywords.join(", ");
  }

  return schema;
}

/**
 * Generate multiple ImageObject schemas for a gallery
 */
export function generateGalleryStructuredData(
  images: ImageSeoStructuredData[],
  pageUrl?: string
) {
  return images.map((image) => generateImageObjectStructuredData(image, pageUrl));
}

/**
 * Component to inject ImageObject structured data
 */
interface ImageStructuredDataProps {
  image: ImageSeoStructuredData;
  pageUrl?: string;
}

export function ImageStructuredData({ image, pageUrl }: ImageStructuredDataProps) {
  const { locale } = useLocale();

  useEffect(() => {
    const scriptId = `structured-data-image-${image.contentUrl.replace(/[^a-z0-9]/gi, '')}`;
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    const structuredData = {
      "@context": "https://schema.org",
      inLanguage: locale,
      ...generateImageObjectStructuredData(image, pageUrl),
    };

    script.textContent = JSON.stringify(structuredData);

    return () => {
      script.remove();
    };
  }, [image, pageUrl, locale]);

  return null;
}

/**
 * Component to inject multiple ImageObject structured data (gallery)
 */
interface GalleryStructuredDataProps {
  images: ImageSeoStructuredData[];
  pageUrl?: string;
}

export function GalleryStructuredData({ images, pageUrl }: GalleryStructuredDataProps) {
  const { locale } = useLocale();

  useEffect(() => {
    const scriptId = `structured-data-gallery`;
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      inLanguage: locale,
      image: generateGalleryStructuredData(images, pageUrl),
    };

    script.textContent = JSON.stringify(structuredData);

    return () => {
      script.remove();
    };
  }, [images, pageUrl, locale]);

  return null;
}
