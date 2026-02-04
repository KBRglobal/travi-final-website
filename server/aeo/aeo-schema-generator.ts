/**
 * AEO Schema Generator
 * Generates enhanced Schema.org markup optimized for AI platform consumption
 * Includes FAQPage, HowTo, and other schemas that AI platforms prefer
 */

import { db } from "../db";
import {
  contents,
  attractions,
  hotels,
  dining,
  districts,
  articles,
  events,
  destinations,
  aeoAnswerCapsules,
  aeoSchemaEnhancements,
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";

// City to currency mapping (destination-agnostic)
const CITY_CURRENCY_MAP: Record<string, string> = {
  dubai: "AED",
  "abu dhabi": "AED",
  "ras al khaimah": "AED",
  paris: "EUR",
  london: "GBP",
  "new york": "USD",
  tokyo: "JPY",
  singapore: "SGD",
  barcelona: "EUR",
  rome: "EUR",
  amsterdam: "EUR",
  bangkok: "THB",
  "hong kong": "HKD",
  istanbul: "TRY",
  "las vegas": "USD",
  "los angeles": "USD",
  miami: "USD",
};

function getCurrencyForCity(cityName: string): string | undefined {
  return CITY_CURRENCY_MAP[cityName.toLowerCase()];
}

// Types
export interface SchemaOptions {
  includeAnswerCapsule?: boolean;
  includeFAQ?: boolean;
  includeHowTo?: boolean;
  includeBreadcrumbs?: boolean;
  siteUrl?: string;
  locale?: string;
}

export interface GeneratedSchema {
  "@context": string;
  "@graph": any[];
}

const DEFAULT_SITE_URL = "https://travi.world";

/**
 * Generate comprehensive AEO-optimized schema for content
 */
export async function generateAEOSchema(
  contentId: string,
  options: SchemaOptions = {}
): Promise<GeneratedSchema> {
  const {
    includeAnswerCapsule = true,
    includeFAQ = true,
    includeHowTo = true,
    includeBreadcrumbs = true,
    siteUrl = DEFAULT_SITE_URL,
    locale = "en",
  } = options;

  // Fetch content
  const content = await db.query.contents.findFirst({
    where: eq(contents.id, contentId),
  });

  if (!content) {
    throw new Error(`Content not found: ${contentId}`);
  }

  const graph: any[] = [];

  // Add WebPage schema (always)
  graph.push(generateWebPageSchema(content, siteUrl));

  // Add Breadcrumbs
  if (includeBreadcrumbs) {
    graph.push(generateBreadcrumbSchema(content, siteUrl));
  }

  // Add type-specific schema
  const typeSchema = await generateTypeSpecificSchema(content, siteUrl);
  if (typeSchema) {
    graph.push(typeSchema);
  }

  // Add FAQ schema
  if (includeFAQ) {
    const faqSchema = await generateFAQSchema(content, contentId);
    if (faqSchema) {
      graph.push(faqSchema);
    }
  }

  // Add HowTo schema for applicable content
  if (includeHowTo && ["article", "transport", "itinerary"].includes(content.type)) {
    const howToSchema = await generateHowToSchema(content, contentId);
    if (howToSchema) {
      graph.push(howToSchema);
    }
  }

  // Add Answer Capsule as Speakable schema
  if (includeAnswerCapsule) {
    const capsule = await db.query.aeoAnswerCapsules.findFirst({
      where: and(
        eq(aeoAnswerCapsules.contentId, contentId),
        eq(aeoAnswerCapsules.locale, locale as any)
      ),
    });

    if (capsule) {
      graph.push(generateSpeakableSchema(content, capsule, siteUrl));
    }
  }

  // Add Organization schema
  graph.push(generateOrganizationSchema(siteUrl));

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

/**
 * Generate WebPage schema
 */
function generateWebPageSchema(content: any, siteUrl: string): any {
  return {
    "@type": "WebPage",
    "@id": `${siteUrl}/${content.type}s/${content.slug}#webpage`,
    url: `${siteUrl}/${content.type}s/${content.slug}`,
    name: content.metaTitle || content.title,
    description: content.metaDescription,
    inLanguage: "en",
    isPartOf: {
      "@id": `${siteUrl}/#website`,
    },
    about: {
      "@id": `${siteUrl}/${content.type}s/${content.slug}#${content.type}`,
    },
    datePublished: content.publishedAt?.toISOString() || content.createdAt?.toISOString(),
    dateModified: content.updatedAt?.toISOString(),
    ...(content.primaryKeyword && { keywords: content.primaryKeyword }),
  };
}

/**
 * Generate Breadcrumb schema
 */
function generateBreadcrumbSchema(content: any, siteUrl: string): any {
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: siteUrl,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: getTypePluralName(content.type),
      item: `${siteUrl}/${content.type}s`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: content.title,
      item: `${siteUrl}/${content.type}s/${content.slug}`,
    },
  ];

  return {
    "@type": "BreadcrumbList",
    "@id": `${siteUrl}/${content.type}s/${content.slug}#breadcrumb`,
    itemListElement: items,
  };
}

/**
 * Generate type-specific schema
 */
async function generateTypeSpecificSchema(content: any, siteUrl: string): Promise<any | null> {
  const contentId = content.id;

  switch (content.type) {
    case "attraction": {
      const attraction = await db.query.attractions.findFirst({
        where: eq(attractions.contentId, contentId),
      });
      if (!attraction) return null;

      return {
        "@type": "TouristAttraction",
        "@id": `${siteUrl}/attractions/${content.slug}#attraction`,
        name: content.title,
        description: content.metaDescription,
        image: content.heroImage,
        url: `${siteUrl}/attractions/${content.slug}`,
        address: attraction.location
          ? {
              "@type": "PostalAddress",
              addressLocality: attraction.location,
            }
          : undefined,
        ...(attraction.priceFrom && {
          priceRange: attraction.priceFrom,
        }),
        ...(attraction.duration && {
          timeRequired: attraction.duration,
        }),
        touristType: attraction.targetAudience || [],
        publicAccess: true,
        isAccessibleForFree: false,
      };
    }

    case "hotel": {
      const hotel = await db.query.hotels.findFirst({
        where: eq(hotels.contentId, contentId),
      });
      if (!hotel) return null;

      return {
        "@type": "Hotel",
        "@id": `${siteUrl}/hotels/${content.slug}#hotel`,
        name: content.title,
        description: content.metaDescription,
        image: content.heroImage,
        url: `${siteUrl}/hotels/${content.slug}`,
        address: hotel.location
          ? {
              "@type": "PostalAddress",
              addressLocality: hotel.location,
            }
          : undefined,
        ...(hotel.starRating && {
          starRating: {
            "@type": "Rating",
            ratingValue: hotel.starRating,
            bestRating: 5,
          },
        }),
        amenityFeature: (hotel.amenities || []).map((amenity: string) => ({
          "@type": "LocationFeatureSpecification",
          name: amenity,
          value: true,
        })),
        ...(hotel.numberOfRooms && {
          numberOfRooms: hotel.numberOfRooms,
        }),
      };
    }

    case "dining": {
      const restaurant = await db.query.dining.findFirst({
        where: eq(dining.contentId, contentId),
      });
      if (!restaurant) return null;

      return {
        "@type": "Restaurant",
        "@id": `${siteUrl}/dining/${content.slug}#restaurant`,
        name: content.title,
        description: content.metaDescription,
        image: content.heroImage,
        url: `${siteUrl}/dining/${content.slug}`,
        address: restaurant.location
          ? {
              "@type": "PostalAddress",
              addressLocality: restaurant.location,
            }
          : undefined,
        ...(restaurant.cuisineType && {
          servesCuisine: restaurant.cuisineType,
        }),
        ...(restaurant.priceRange && {
          priceRange: restaurant.priceRange,
        }),
      };
    }

    case "district": {
      const district = await db.query.districts.findFirst({
        where: eq(districts.contentId, contentId),
      });
      if (!district) return null;

      // Get country from destination if available (destination-agnostic)
      let countryCode: string | undefined;
      if (district.destinationId) {
        const dest = await db.query.destinations.findFirst({
          where: eq(destinations.id, district.destinationId),
        });
        countryCode = dest?.country;
      }

      return {
        "@type": ["Place", "TouristDestination"],
        "@id": `${siteUrl}/districts/${content.slug}#district`,
        name: content.title,
        description: content.metaDescription,
        image: content.heroImage,
        url: `${siteUrl}/districts/${content.slug}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: district.neighborhood || district.location,
          // Only include country if known (destination-agnostic)
          ...(countryCode && { addressCountry: countryCode }),
        },
        touristType: district.targetAudience || [],
      };
    }

    case "event": {
      const event = await db.query.events.findFirst({
        where: eq(events.contentId, contentId),
      });
      if (!event) return null;

      // Try to infer currency from venue location (destination-agnostic)
      const venueLower = (event.venue || "").toLowerCase();
      const currency = getCurrencyForCity(venueLower);

      return {
        "@type": "Event",
        "@id": `${siteUrl}/events/${content.slug}#event`,
        name: content.title,
        description: content.metaDescription,
        image: content.heroImage,
        url: `${siteUrl}/events/${content.slug}`,
        startDate: event.eventDate?.toISOString(),
        endDate: event.endDate?.toISOString(),
        location: event.venue
          ? {
              "@type": "Place",
              name: event.venue,
              address: event.venueAddress,
            }
          : undefined,
        ...(event.ticketUrl && {
          offers: {
            "@type": "Offer",
            url: event.ticketUrl,
            ...(event.ticketPrice && { price: event.ticketPrice }),
            // Only include currency if we can determine it (destination-agnostic)
            ...(currency && { priceCurrency: currency }),
            availability: "https://schema.org/InStock",
          },
        }),
        ...(event.organizer && {
          organizer: {
            "@type": "Organization",
            name: event.organizer,
          },
        }),
      };
    }

    case "article": {
      const article = await db.query.articles.findFirst({
        where: eq(articles.contentId, contentId),
      });

      return {
        "@type": "Article",
        "@id": `${siteUrl}/articles/${content.slug}#article`,
        headline: content.title,
        description: content.metaDescription,
        image: content.heroImage,
        url: `${siteUrl}/articles/${content.slug}`,
        datePublished: content.publishedAt?.toISOString() || content.createdAt?.toISOString(),
        dateModified: content.updatedAt?.toISOString(),
        author: {
          "@type": "Organization",
          name: "TRAVI",
          url: siteUrl,
        },
        publisher: {
          "@type": "Organization",
          name: "TRAVI",
          logo: {
            "@type": "ImageObject",
            url: `${siteUrl}/logo.png`,
          },
        },
        ...(article?.category && {
          articleSection: article.category,
        }),
        ...(content.wordCount && {
          wordCount: content.wordCount,
        }),
      };
    }

    default:
      return null;
  }
}

/**
 * Generate FAQ schema from content FAQ data
 */
async function generateFAQSchema(content: any, contentId: string): Promise<any | null> {
  let faqData: any[] = [];

  // Fetch FAQ from type-specific table
  switch (content.type) {
    case "attraction": {
      const attraction = await db.query.attractions.findFirst({
        where: eq(attractions.contentId, contentId),
      });
      faqData = attraction?.faq || [];
      break;
    }
    case "hotel": {
      const hotel = await db.query.hotels.findFirst({
        where: eq(hotels.contentId, contentId),
      });
      faqData = hotel?.faq || [];
      break;
    }
    case "dining": {
      const restaurant = await db.query.dining.findFirst({
        where: eq(dining.contentId, contentId),
      });
      faqData = restaurant?.faq || [];
      break;
    }
    case "district": {
      const district = await db.query.districts.findFirst({
        where: eq(districts.contentId, contentId),
      });
      faqData = district?.faq || [];
      break;
    }
    case "article": {
      const article = await db.query.articles.findFirst({
        where: eq(articles.contentId, contentId),
      });
      faqData = article?.faq || [];
      break;
    }
  }

  if (!faqData || faqData.length === 0) return null;

  return {
    "@type": "FAQPage",
    "@id": `${DEFAULT_SITE_URL}/${content.type}s/${content.slug}#faq`,
    mainEntity: faqData.map((item: any) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/**
 * Generate HowTo schema for instructional content
 */
async function generateHowToSchema(content: any, contentId: string): Promise<any | null> {
  // Extract steps from content blocks
  const blocks = content.blocks || [];
  const steps: any[] = [];

  let currentStep = 1;
  for (const block of blocks) {
    if (block.type === "heading" && block.level === 2) {
      // H2 headings become steps
      steps.push({
        "@type": "HowToStep",
        position: currentStep,
        name: block.content || block.text,
        text: "", // Will be filled with subsequent paragraphs
      });
      currentStep++;
    } else if (block.type === "paragraph" && steps.length > 0) {
      // Add paragraph content to current step
      const lastStep = steps[steps.length - 1];
      lastStep.text += (lastStep.text ? " " : "") + (block.content || block.text);
    }
  }

  if (steps.length < 2) return null; // Need at least 2 steps for HowTo

  return {
    "@type": "HowTo",
    "@id": `${DEFAULT_SITE_URL}/${content.type}s/${content.slug}#howto`,
    name: content.title,
    description: content.metaDescription,
    step: steps,
    totalTime: steps.length > 5 ? "PT30M" : "PT15M", // Estimate based on steps
  };
}

/**
 * Generate Speakable schema for answer capsule (voice assistant optimization)
 */
function generateSpeakableSchema(content: any, capsule: any, siteUrl: string): any {
  return {
    "@type": "WebPage",
    "@id": `${siteUrl}/${content.type}s/${content.slug}#speakable`,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".answer-capsule", ".quick-answer"],
      xpath: ["//p[@class='answer-capsule']", "//div[@class='key-facts']"],
    },
    mainContentOfPage: {
      "@type": "WebPageElement",
      cssSelector: ".answer-capsule",
      text: capsule.capsuleText,
    },
  };
}

/**
 * Generate Organization schema
 */
function generateOrganizationSchema(siteUrl: string): any {
  return {
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "TRAVI",
    alternateName: "TRAVI Travel",
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/logo.png`,
    },
    sameAs: [
      "https://twitter.com/traviworld",
      "https://www.facebook.com/traviworld",
      "https://www.instagram.com/traviworld",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "info@travi.world",
    },
    description:
      "TRAVI is a travel intelligence platform providing personalized trip planning, destination guides, and unified booking for Dubai and beyond.",
  };
}

/**
 * Get plural name for content type
 */
function getTypePluralName(type: string): string {
  const names: Record<string, string> = {
    attraction: "Attractions",
    hotel: "Hotels",
    dining: "Restaurants",
    district: "Districts",
    article: "Articles",
    event: "Events",
    transport: "Transport",
    itinerary: "Itineraries",
  };
  return names[type] || type.charAt(0).toUpperCase() + type.slice(1) + "s";
}

/**
 * Save schema enhancement to database
 */
export async function saveSchemaEnhancement(
  contentId: string,
  schemaType: string,
  schemaData: Record<string, unknown>
): Promise<void> {
  // Check if exists
  const existing = await db.query.aeoSchemaEnhancements.findFirst({
    where: and(
      eq(aeoSchemaEnhancements.contentId, contentId),
      eq(aeoSchemaEnhancements.schemaType, schemaType)
    ),
  });

  if (existing) {
    await db
      .update(aeoSchemaEnhancements)
      .set({
        schemaData,
        updatedAt: new Date(),
        validationStatus: "pending",
      } as any)
      .where(eq(aeoSchemaEnhancements.id, existing.id));
  } else {
    await db.insert(aeoSchemaEnhancements).values({
      contentId,
      schemaType,
      schemaData,
      isActive: true,
      validationStatus: "pending",
    } as any);
  }
}

/**
 * Validate schema against schema.org standards
 */
export function validateSchema(schema: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required fields
  if (!schema["@context"]) {
    errors.push("Missing @context");
  }

  if (!schema["@graph"] && !schema["@type"]) {
    errors.push("Missing @graph or @type");
  }

  // Check graph items
  if (schema["@graph"]) {
    for (const item of schema["@graph"]) {
      if (!item["@type"]) {
        errors.push("Item missing @type");
      }
      if (!item["@id"] && item["@type"] !== "BreadcrumbList") {
        warnings.push(`${item["@type"]} missing @id`);
      }
    }
  }

  // Check for FAQPage
  const hasFAQ = schema["@graph"]?.some((item: any) => item["@type"] === "FAQPage");
  if (!hasFAQ) {
    warnings.push("Consider adding FAQPage schema for better AI extraction");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate schema for all content types
 */
export async function batchGenerateSchemas(
  contentIds: string[],
  options: SchemaOptions = {}
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const contentId of contentIds) {
    try {
      const schema = await generateAEOSchema(contentId, options);

      // Save to content's seoSchema field
      await db
        .update(contents)
        .set({
          seoSchema: schema as any,
          updatedAt: new Date(),
        } as any)
        .where(eq(contents.id, contentId));

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(
        `${contentId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return results;
}
