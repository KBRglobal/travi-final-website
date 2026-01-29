import { Helmet } from "react-helmet-async";
import { SITE_URL } from "@/lib/constants";

// Base organization schema for the site
interface OrganizationSchemaProps {
  locale?: string;
}

export function OrganizationSchema({ locale = "en" }: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TRAVI World",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      "Comprehensive travel information for 17 destinations worldwide. Detailed guides for 3,000+ attractions with opening hours, prices, and visitor tips.",
    inLanguage: locale,
    sameAs: ["https://www.instagram.com/travi_world", "https://www.tiktok.com/@travi.world"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: [
        "English",
        "Arabic",
        "French",
        "German",
        "Spanish",
        "Portuguese",
        "Chinese",
        "Japanese",
        "Hindi",
      ],
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// Tourism attraction schema
interface AttractionSchemaProps {
  name: string;
  description: string;
  image?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  openingHours?: string[];
  locale?: string;
}

export function AttractionSchema({
  name,
  description,
  image,
  address,
  rating,
  reviewCount,
  priceRange,
  openingHours,
  locale = "en",
}: AttractionSchemaProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name,
    description,
    image,
    inLanguage: locale,
    address: address
      ? {
          "@type": "PostalAddress",
          addressLocality: "Dubai",
          addressCountry: "AE",
          streetAddress: address,
        }
      : undefined,
    aggregateRating: rating
      ? {
          "@type": "AggregateRating",
          ratingValue: rating,
          reviewCount: reviewCount || 1,
          bestRating: 5,
        }
      : undefined,
    priceRange,
    openingHoursSpecification: openingHours?.map(hours => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: hours.split("-")[0],
      closes: hours.split("-")[1],
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// Hotel schema
interface HotelSchemaProps {
  name: string;
  description: string;
  image?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  starRating?: number;
  locale?: string;
}

export function HotelSchema({
  name,
  description,
  image,
  address,
  rating,
  reviewCount,
  priceRange,
  starRating,
  locale = "en",
}: HotelSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name,
    description,
    image,
    inLanguage: locale,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Dubai",
      addressCountry: "AE",
      streetAddress: address,
    },
    aggregateRating: rating
      ? {
          "@type": "AggregateRating",
          ratingValue: rating,
          reviewCount: reviewCount || 1,
          bestRating: 5,
        }
      : undefined,
    priceRange,
    starRating: starRating
      ? {
          "@type": "Rating",
          ratingValue: starRating,
        }
      : undefined,
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// Restaurant schema
interface RestaurantSchemaProps {
  name: string;
  description: string;
  image?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  cuisineType?: string;
  servesCuisine?: string[];
  locale?: string;
}

export function RestaurantSchema({
  name,
  description,
  image,
  address,
  rating,
  reviewCount,
  priceRange,
  cuisineType,
  servesCuisine,
  locale = "en",
}: RestaurantSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name,
    description,
    image,
    inLanguage: locale,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Dubai",
      addressCountry: "AE",
      streetAddress: address,
    },
    aggregateRating: rating
      ? {
          "@type": "AggregateRating",
          ratingValue: rating,
          reviewCount: reviewCount || 1,
          bestRating: 5,
        }
      : undefined,
    priceRange,
    servesCuisine: servesCuisine || [cuisineType],
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// Article schema for blog posts
interface ArticleSchemaProps {
  headline: string;
  description: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  locale?: string;
}

export function ArticleSchema({
  headline,
  description,
  image,
  datePublished,
  dateModified,
  author = "Travi Team",
  locale = "en",
}: ArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    image,
    inLanguage: locale,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: "Travi",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// Event schema
interface EventSchemaProps {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  image?: string;
  price?: number;
  currency?: string;
  locale?: string;
}

export function EventSchema({
  name,
  description,
  startDate,
  endDate,
  location,
  image,
  price,
  currency = "AED",
  locale = "en",
}: EventSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description,
    startDate,
    endDate: endDate || startDate,
    image,
    inLanguage: locale,
    location: {
      "@type": "Place",
      name: location || "Dubai",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Dubai",
        addressCountry: "AE",
      },
    },
    offers: price
      ? {
          "@type": "Offer",
          price,
          priceCurrency: currency,
          availability: "https://schema.org/InStock",
        }
      : undefined,
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// Breadcrumb schema (for SEO)
interface BreadcrumbSchemaProps {
  items: { name: string; url: string }[];
  locale?: string;
}

export function BreadcrumbSchema({ items, locale = "en" }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    inLanguage: locale,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// HowTo schema for travel tips and guides
interface HowToStep {
  name: string;
  text: string;
  image?: string;
  url?: string;
}

interface HowToSchemaProps {
  name: string;
  description: string;
  image?: string;
  totalTime?: string; // ISO 8601 duration format, e.g., "PT30M" for 30 minutes
  estimatedCost?: {
    value: number;
    currency: string;
  };
  steps: HowToStep[];
  locale?: string;
}

export function HowToSchema({
  name,
  description,
  image,
  totalTime,
  estimatedCost,
  steps,
  locale = "en",
}: HowToSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    image,
    inLanguage: locale,
    totalTime,
    estimatedCost: estimatedCost
      ? {
          "@type": "MonetaryAmount",
          value: estimatedCost.value,
          currency: estimatedCost.currency,
        }
      : undefined,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      image: step.image,
      url: step.url,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// Place schema for geographic locations
interface PlaceSchemaProps {
  name: string;
  description: string;
  image?: string;
  address?: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  telephone?: string;
  url?: string;
  openingHours?: string[];
  locale?: string;
}

export function PlaceSchema({
  name,
  description,
  image,
  address,
  geo,
  telephone,
  url,
  openingHours,
  locale = "en",
}: PlaceSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name,
    description,
    image,
    inLanguage: locale,
    url,
    telephone,
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: address.streetAddress,
          addressLocality: address.addressLocality,
          addressRegion: address.addressRegion,
          postalCode: address.postalCode,
          addressCountry: address.addressCountry,
        }
      : undefined,
    geo: geo
      ? {
          "@type": "GeoCoordinates",
          latitude: geo.latitude,
          longitude: geo.longitude,
        }
      : undefined,
    openingHoursSpecification: openingHours?.map(hours => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: hours.split("-")[0]?.trim(),
      closes: hours.split("-")[1]?.trim(),
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// TravelGuide schema - more specific than Article for travel content
interface TravelGuideSchemaProps {
  name: string;
  description: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  about: {
    name: string;
    type: "City" | "Country" | "TouristDestination" | "Place";
  };
  audience?: string;
  locale?: string;
}

export function TravelGuideSchema({
  name,
  description,
  image,
  datePublished,
  dateModified,
  author = "Travi Team",
  about,
  audience = "Travelers",
  locale = "en",
}: TravelGuideSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TravelGuide",
    name,
    description,
    image,
    inLanguage: locale,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: "Travi",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
    about: {
      "@type": about.type,
      name: about.name,
    },
    audience: {
      "@type": "Audience",
      audienceType: audience,
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// LocalBusiness schema for attractions, shops, etc.
interface LocalBusinessSchemaProps {
  name: string;
  description: string;
  image?: string;
  businessType?:
    | "LocalBusiness"
    | "TouristAttraction"
    | "Store"
    | "FoodEstablishment"
    | "LodgingBusiness";
  address?: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  telephone?: string;
  url?: string;
  priceRange?: string;
  rating?: number;
  reviewCount?: number;
  openingHours?: string[];
  locale?: string;
}

export function LocalBusinessSchema({
  name,
  description,
  image,
  businessType = "LocalBusiness",
  address,
  geo,
  telephone,
  url,
  priceRange,
  rating,
  reviewCount,
  openingHours,
  locale = "en",
}: LocalBusinessSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": businessType,
    name,
    description,
    image,
    inLanguage: locale,
    url,
    telephone,
    priceRange,
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: address.streetAddress,
          addressLocality: address.addressLocality,
          addressRegion: address.addressRegion,
          postalCode: address.postalCode,
          addressCountry: address.addressCountry,
        }
      : undefined,
    geo: geo
      ? {
          "@type": "GeoCoordinates",
          latitude: geo.latitude,
          longitude: geo.longitude,
        }
      : undefined,
    aggregateRating: rating
      ? {
          "@type": "AggregateRating",
          ratingValue: rating,
          reviewCount: reviewCount || 1,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    openingHoursSpecification: openingHours?.map(hours => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: hours.split("-")[0]?.trim(),
      closes: hours.split("-")[1]?.trim(),
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// City schema for destination pages
interface CitySchemaProps {
  name: string;
  description: string;
  image?: string;
  country: string;
  countryCode: string;
  population?: number;
  url?: string;
  containsPlace?: { name: string; type: string }[];
  locale?: string;
}

export function CitySchema({
  name,
  description,
  image,
  country,
  countryCode,
  population,
  url,
  containsPlace,
  locale = "en",
}: CitySchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "City",
    name,
    description,
    image,
    inLanguage: locale,
    url,
    population,
    containedInPlace: {
      "@type": "Country",
      name: country,
      identifier: countryCode,
    },
    containsPlace: containsPlace?.map(place => ({
      "@type": place.type,
      name: place.name,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// SpeakableSpecification for voice search optimization
interface SpeakableSchemaProps {
  cssSelector?: string[];
  xpath?: string[];
}

export function SpeakableSchema({ cssSelector, xpath }: SpeakableSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: cssSelector || [".speakable", "article h1", "article p:first-of-type"],
      xpath: xpath,
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// FAQPage schema for FAQ sections
interface FAQItem {
  question: string;
  answer: string;
}

interface FAQPageSchemaProps {
  faqs: FAQItem[];
  locale?: string;
}

export function FAQPageSchema({ faqs, locale = "en" }: FAQPageSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// WebSite schema for homepage with SearchAction
interface WebSiteSchemaProps {
  name?: string;
  url?: string;
  description?: string;
  searchUrl?: string;
  locale?: string;
}

export function WebSiteSchema({
  name = "TRAVI World",
  url = SITE_URL,
  description = "Comprehensive travel information for 17 destinations worldwide",
  searchUrl = `${SITE_URL}/search?q=`,
  locale = "en",
}: WebSiteSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${searchUrl}{search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
