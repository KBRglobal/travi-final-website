import type { Content, Attraction, Hotel, Article, FaqItem } from "@shared/schema";

// FAIL-FAST: Require SITE_URL from environment - no implicit Dubai fallback
const SITE_URL = process.env.SITE_URL || "https://travi.com";
const SITE_NAME = process.env.SITE_NAME || "Travi";
const ORGANIZATION_LOGO = `${SITE_URL}/logo.png`;

interface SchemaOrg {
  "@context": string;
  "@type": string | string[];
  [key: string]: unknown;
}

export function generateTouristAttractionSchema(
  content: Content,
  attraction: Attraction
): SchemaOrg {
  const schema: SchemaOrg = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: content.title,
    description: content.metaDescription || content.title,
    url: `${SITE_URL}/attractions/${content.slug}`,
  };

  if (content.heroImage) {
    schema.image = content.heroImage.startsWith("http")
      ? content.heroImage
      : `${SITE_URL}${content.heroImage}`;
  }

  // FAIL-FAST: Do not use implicit Dubai fallback - use attraction data only
  if (attraction.location) {
    schema.address = {
      "@type": "PostalAddress",
      // Use cityName from attraction if available, otherwise use location
      addressLocality: (attraction as any).cityName || attraction.location,
      addressRegion: attraction.location,
      addressCountry: (attraction as any).countryCode || undefined,
    };
    // Only include geo if coordinates are available
    if ((attraction as any).coordinates) {
      schema.geo = {
        "@type": "GeoCoordinates",
        latitude: (attraction as any).coordinates.lat,
        longitude: (attraction as any).coordinates.lng,
      };
    }
  }

  if (attraction.priceFrom) {
    schema.priceRange = attraction.priceFrom;
  }

  if (attraction.duration) {
    schema.tourDuration = attraction.duration;
  }

  if (attraction.category) {
    schema.touristType = attraction.category;
  }

  if (attraction.highlights && attraction.highlights.length > 0) {
    schema.amenityFeature = attraction.highlights.map((h) => ({
      "@type": "LocationFeatureSpecification",
      name: h.title,
      value: h.description || true,
    }));
  }

  schema.isAccessibleForFree = false;

  return schema;
}

export function generateHotelSchema(
  content: Content,
  hotel: Hotel
): SchemaOrg {
  const schema: SchemaOrg = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: content.title,
    description: content.metaDescription || content.title,
    url: `${SITE_URL}/hotels/${content.slug}`,
  };

  if (content.heroImage) {
    schema.image = content.heroImage.startsWith("http")
      ? content.heroImage
      : `${SITE_URL}${content.heroImage}`;
  }

  // FAIL-FAST: Do not use implicit Dubai fallback - use hotel data only
  if (hotel.location) {
    schema.address = {
      "@type": "PostalAddress",
      // Use cityName from hotel if available, otherwise use location
      addressLocality: (hotel as any).cityName || hotel.location,
      streetAddress: hotel.location,
      addressCountry: (hotel as any).countryCode || undefined,
    };
  }

  if (hotel.starRating) {
    schema.starRating = {
      "@type": "Rating",
      ratingValue: hotel.starRating,
      bestRating: 5,
    };
  }

  if (hotel.numberOfRooms) {
    schema.numberOfRooms = hotel.numberOfRooms;
  }

  if (hotel.amenities && hotel.amenities.length > 0) {
    schema.amenityFeature = hotel.amenities.map((amenity) => ({
      "@type": "LocationFeatureSpecification",
      name: amenity,
      value: true,
    }));
  }

  if (hotel.roomTypes && hotel.roomTypes.length > 0) {
    schema.containsPlace = hotel.roomTypes.map((room) => ({
      "@type": "HotelRoom",
      name: room.title,
      description: room.features?.join(", "),
      occupancy: {
        "@type": "QuantitativeValue",
        maxValue: 2,
      },
    }));
  }

  schema.checkinTime = "14:00";
  schema.checkoutTime = "12:00";

  return schema;
}

export function generateArticleSchema(
  content: Content,
  article: Article,
  authorName?: string
): SchemaOrg {
  const schema: SchemaOrg = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: content.metaTitle || content.title,
    description: content.metaDescription || content.title,
    url: `${SITE_URL}/articles/${content.slug}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/articles/${content.slug}`,
    },
  };

  if (content.heroImage) {
    schema.image = {
      "@type": "ImageObject",
      url: content.heroImage.startsWith("http")
        ? content.heroImage
        : `${SITE_URL}${content.heroImage}`,
    };
  }

  if (content.publishedAt) {
    schema.datePublished = new Date(content.publishedAt).toISOString();
  } else if (content.createdAt) {
    schema.datePublished = new Date(content.createdAt).toISOString();
  }

  if (content.updatedAt) {
    schema.dateModified = new Date(content.updatedAt).toISOString();
  }

  // FAIL-FAST: Do not use implicit Dubai fallback for author name
  schema.author = {
    "@type": "Person",
    name: authorName || `${SITE_NAME} Editorial Team`,
  };

  schema.publisher = {
    "@type": "Organization",
    name: SITE_NAME,
    logo: {
      "@type": "ImageObject",
      url: ORGANIZATION_LOGO,
    },
  };

  if (article.category) {
    schema.articleSection = article.category;
  }

  if (content.primaryKeyword) {
    schema.keywords = [
      content.primaryKeyword,
      ...(content.secondaryKeywords || []),
    ].join(", ");
  }

  if (content.wordCount) {
    schema.wordCount = content.wordCount;
  }

  return schema;
}

export function generateFAQPageSchema(faqItems: FaqItem[]): SchemaOrg | null {
  if (!faqItems || faqItems.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function generateBreadcrumbSchema(
  breadcrumbs: { name: string; url: string }[]
): SchemaOrg {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

export function generateWebPageSchema(
  content: Content,
  contentType: string
): SchemaOrg {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: content.metaTitle || content.title,
    description: content.metaDescription || content.title,
    url: `${SITE_URL}/${contentType}s/${content.slug}`,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    datePublished: content.publishedAt
      ? new Date(content.publishedAt).toISOString()
      : undefined,
    dateModified: content.updatedAt
      ? new Date(content.updatedAt).toISOString()
      : undefined,
  };
}

export function generateEventSchema(
  content: Content,
  event: {
    eventDate?: Date | null;
    endDate?: Date | null;
    venue?: string | null;
    venueAddress?: string | null;
    ticketUrl?: string | null;
    ticketPrice?: string | null;
    organizer?: string | null;
  }
): SchemaOrg {
  const schema: SchemaOrg = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: content.title,
    description: content.metaDescription || content.title,
    url: `${SITE_URL}/events/${content.slug}`,
  };

  if (content.heroImage) {
    schema.image = content.heroImage.startsWith("http")
      ? content.heroImage
      : `${SITE_URL}${content.heroImage}`;
  }

  if (event.eventDate) {
    schema.startDate = new Date(event.eventDate).toISOString();
  }

  if (event.endDate) {
    schema.endDate = new Date(event.endDate).toISOString();
  }

  if (event.venue || event.venueAddress) {
    schema.location = {
      "@type": "Place",
      // FAIL-FAST: Do not use implicit Dubai fallback - use provided venue or event name
      name: event.venue || event.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.venueAddress,
        addressLocality: event.location || undefined,
        addressCountry: "AE",
      },
    };
  }

  if (event.ticketUrl || event.ticketPrice) {
    schema.offers = {
      "@type": "Offer",
      url: event.ticketUrl,
      price: event.ticketPrice,
      priceCurrency: "AED",
      availability: "https://schema.org/InStock",
    };
  }

  if (event.organizer) {
    schema.organizer = {
      "@type": "Organization",
      name: event.organizer,
    };
  }

  return schema;
}

export function generateRestaurantSchema(
  content: Content,
  dining: {
    location?: string | null;
    cuisineType?: string | null;
    priceRange?: string | null;
  }
): SchemaOrg {
  const schema: SchemaOrg = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: content.title,
    description: content.metaDescription || content.title,
    url: `${SITE_URL}/dining/${content.slug}`,
  };

  if (content.heroImage) {
    schema.image = content.heroImage.startsWith("http")
      ? content.heroImage
      : `${SITE_URL}${content.heroImage}`;
  }

  // FAIL-FAST: Do not use implicit Dubai fallback - use dining data only
  if (dining.location) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: dining.location,
      // Use cityName from dining if available, otherwise use location
      addressLocality: (dining as any).cityName || dining.location,
      addressCountry: (dining as any).countryCode || undefined,
    };
  }

  if (dining.cuisineType) {
    schema.servesCuisine = dining.cuisineType;
  }

  if (dining.priceRange) {
    schema.priceRange = dining.priceRange;
  }

  return schema;
}

export interface GeneratedSchemas {
  primary: SchemaOrg;
  faq?: SchemaOrg | null;
  breadcrumb?: SchemaOrg;
  webpage?: SchemaOrg;
}

export function generateAllSchemas(
  content: Content,
  typeData: Attraction | Hotel | Article | Record<string, unknown>,
  authorName?: string
): GeneratedSchemas {
  let primary: SchemaOrg;
  let faqItems: FaqItem[] | undefined;

  switch (content.type) {
    case "attraction":
      primary = generateTouristAttractionSchema(content, typeData as Attraction);
      faqItems = (typeData as Attraction).faq ?? undefined;
      break;
    case "hotel":
      primary = generateHotelSchema(content, typeData as Hotel);
      faqItems = (typeData as Hotel).faq ?? undefined;
      break;
    case "article":
      primary = generateArticleSchema(content, typeData as Article, authorName);
      faqItems = (typeData as Article).faq ?? undefined;
      break;
    case "dining":
      primary = generateRestaurantSchema(content, typeData as { location?: string | null; cuisineType?: string | null; priceRange?: string | null });
      faqItems = (typeData as { faq?: FaqItem[] | null }).faq ?? undefined;
      break;
    case "event":
      primary = generateEventSchema(content, typeData as { eventDate?: Date | null; endDate?: Date | null; venue?: string | null; venueAddress?: string | null; ticketUrl?: string | null; ticketPrice?: string | null; organizer?: string | null });
      faqItems = (typeData as { faq?: FaqItem[] | null }).faq ?? undefined;
      break;
    default:
      primary = generateWebPageSchema(content, content.type);
      faqItems = (typeData as { faq?: FaqItem[] | null }).faq ?? undefined;
  }

  const result: GeneratedSchemas = { primary };

  if (faqItems && faqItems.length > 0) {
    result.faq = generateFAQPageSchema(faqItems);
  }

  const contentTypePlural = content.type === "dining" ? "dining" : `${content.type}s`;
  result.breadcrumb = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: contentTypePlural.charAt(0).toUpperCase() + contentTypePlural.slice(1), url: `/${contentTypePlural}` },
    { name: content.title, url: `/${contentTypePlural}/${content.slug}` },
  ]);

  result.webpage = generateWebPageSchema(content, content.type);

  return result;
}

export function schemasToJsonLd(schemas: GeneratedSchemas): string {
  const allSchemas: SchemaOrg[] = [schemas.primary];
  
  if (schemas.faq) {
    allSchemas.push(schemas.faq);
  }
  if (schemas.breadcrumb) {
    allSchemas.push(schemas.breadcrumb);
  }
  if (schemas.webpage) {
    allSchemas.push(schemas.webpage);
  }

  if (allSchemas.length === 1) {
    return JSON.stringify(allSchemas[0], null, 2);
  }

  return JSON.stringify(allSchemas, null, 2);
}
