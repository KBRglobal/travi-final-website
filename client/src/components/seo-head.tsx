import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SUPPORTED_LOCALES, RTL_LOCALES, type Locale } from "@shared/schema";

export interface SEOHeadProps {
  title: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  keywords?: string[];
  noIndex?: boolean;
  noindex?: boolean;
  availableTranslations?: Locale[];
}

const OG_LOCALE_MAP: Record<string, string> = {
  en: "en_US", ar: "ar_AE", hi: "hi_IN", zh: "zh_CN", ru: "ru_RU",
  ur: "ur_PK", fr: "fr_FR", de: "de_DE", fa: "fa_IR", bn: "bn_BD",
  fil: "fil_PH", es: "es_ES", tr: "tr_TR", it: "it_IT", ja: "ja_JP",
  ko: "ko_KR", he: "he_IL", pt: "pt_PT", nl: "nl_NL", pl: "pl_PL",
  sv: "sv_SE", th: "th_TH", vi: "vi_VN", id: "id_ID", ms: "ms_MY",
  cs: "cs_CZ", el: "el_GR", da: "da_DK", no: "nb_NO", ro: "ro_RO",
  hu: "hu_HU", uk: "uk_UA"
};

export function SEOHead({
  title,
  description = "",
  canonicalPath = "",
  ogImage,
  ogType = "website",
  publishedTime,
  modifiedTime,
  author,
  keywords,
  noIndex = false,
  noindex,
  availableTranslations,
}: SEOHeadProps) {
  const shouldNoIndex = noIndex || noindex || false;
  const { locale } = useLocale();

  const getLocalizedUrl = (path: string, targetLocale?: Locale): string => {
    const loc = targetLocale || locale;
    if (loc === "en") return path;
    return `/${loc}${path === "/" ? "" : path}`;
  };

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
  const canonicalUrl = `${baseUrl}${getLocalizedUrl(normalizedCanonicalPath, locale)}`;

  const hreflangUrls = (availableTranslations || SUPPORTED_LOCALES.map((l) => l.code)).map(
    (loc) => ({
      locale: loc,
      url: `${baseUrl}${getLocalizedUrl(normalizedCanonicalPath, loc)}`,
    })
  );

  const ogLocale = OG_LOCALE_MAP[locale] || `${locale}_${locale.toUpperCase()}`;
  const xDefaultUrl = `${baseUrl}${getLocalizedUrl(normalizedCanonicalPath, "en")}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(", ")} />
      )}
      {author && <meta name="author" content={author} />}
      <meta name="robots" content={shouldNoIndex ? "noindex, nofollow" : "index, follow"} />
      
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="TRAVI World" />
      <meta property="og:locale" content={ogLocale} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      
      {ogType === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {ogType === "article" && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {ogType === "article" && author && (
        <meta property="article:author" content={author} />
      )}
      
      <link rel="canonical" href={canonicalUrl} />
      
      {hreflangUrls.map(({ locale: loc, url }) => (
        <link key={loc} rel="alternate" hrefLang={loc} href={url} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={xDefaultUrl} />
    </Helmet>
  );
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
