import { Helmet } from "react-helmet-async";

// Base organization schema for the site
interface OrganizationSchemaProps {
  locale?: string;
}

export function OrganizationSchema({ locale = "en" }: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Travi",
    url: "https://travi.world",
    logo: "https://travi.world/logo.png",
    description: "Your ultimate guide to Dubai - attractions, hotels, dining, and more.",
    inLanguage: locale,
    sameAs: [
      "https://twitter.com/travi",
      "https://facebook.com/travi",
      "https://instagram.com/travi",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "Arabic", "French", "German", "Spanish", "Portuguese", "Chinese", "Japanese", "Hindi"],
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
    openingHoursSpecification: openingHours?.map((hours) => ({
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
        url: "https://travi.world/logo.png",
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
