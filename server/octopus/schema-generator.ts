/**
 * Octopus Engine - Schema Generator
 * Full Schema.org markup generation for SEO/AEO optimization
 *
 * Supported schemas (by priority):
 * 1. FAQPage - mandatory for all
 * 2. HowTo - for step-by-step guides
 * 3. TouristTrip - for detailed itineraries
 * 4. Event - for dated events/festivals
 */

import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Schema Generator] ${msg}`, data),
};

// ============================================================================
// Types
// ============================================================================

export interface SchemaMarkup {
  type: string;
  schema: Record<string, unknown>;
  jsonLd: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface HotelSchemaData {
  name: string;
  description?: string;
  address: {
    streetAddress?: string;
    addressLocality: string;
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
  starRating?: number;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  amenities?: string[];
  images?: string[];
  checkInTime?: string;
  checkOutTime?: string;
}

export interface RestaurantSchemaData {
  name: string;
  description?: string;
  address: {
    streetAddress?: string;
    addressLocality: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  telephone?: string;
  url?: string;
  servesCuisine: string;
  priceRange?: string;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  openingHours?: string[];
  menu?: string;
  acceptsReservations?: boolean;
}

export interface AttractionSchemaData {
  name: string;
  description?: string;
  address: {
    addressLocality: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  isAccessibleForFree?: boolean;
  publicAccess?: boolean;
  openingHours?: string[];
  images?: string[];
}

export interface EventSchemaData {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    address: string;
  };
  image?: string;
  offers?: {
    price?: number;
    priceCurrency?: string;
    url?: string;
  };
  performer?: string;
  organizer?: string;
}

export interface HowToSchemaData {
  name: string;
  description?: string;
  totalTime?: string;
  estimatedCost?: {
    currency: string;
    value: number;
  };
  steps: {
    name: string;
    text: string;
    image?: string;
  }[];
  tools?: string[];
  supplies?: string[];
}

export interface TouristTripSchemaData {
  name: string;
  description?: string;
  itinerary: {
    dayNumber: number;
    name: string;
    description?: string;
    attractions: string[];
  }[];
  touristType?: string[];
}

// ============================================================================
// Core Schema Generators
// ============================================================================

/**
 * Generate Hotel schema
 */
export function generateHotelSchema(data: HotelSchemaData): SchemaMarkup {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: data.name,
    address: {
      '@type': 'PostalAddress',
      ...data.address,
    },
  };

  if (data.description) schema.description = data.description;
  if (data.telephone) schema.telephone = data.telephone;
  if (data.url) schema.url = data.url;
  if (data.priceRange) schema.priceRange = data.priceRange;

  if (data.geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: data.geo.latitude,
      longitude: data.geo.longitude,
    };
  }

  if (data.starRating) {
    schema.starRating = {
      '@type': 'Rating',
      ratingValue: data.starRating,
    };
  }

  if (data.aggregateRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.aggregateRating.ratingValue,
      reviewCount: data.aggregateRating.reviewCount,
    };
  }

  if (data.amenities && data.amenities.length > 0) {
    schema.amenityFeature = data.amenities.map(amenity => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity,
    }));
  }

  if (data.images && data.images.length > 0) {
    schema.image = data.images;
  }

  if (data.checkInTime) schema.checkinTime = data.checkInTime;
  if (data.checkOutTime) schema.checkoutTime = data.checkOutTime;

  return {
    type: 'Hotel',
    schema,
    jsonLd: JSON.stringify(schema, null, 2),
  };
}

/**
 * Generate Restaurant schema
 */
export function generateRestaurantSchema(data: RestaurantSchemaData): SchemaMarkup {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: data.name,
    servesCuisine: data.servesCuisine,
    address: {
      '@type': 'PostalAddress',
      ...data.address,
    },
  };

  if (data.description) schema.description = data.description;
  if (data.telephone) schema.telephone = data.telephone;
  if (data.url) schema.url = data.url;
  if (data.priceRange) schema.priceRange = data.priceRange;
  if (data.menu) schema.menu = data.menu;

  if (data.geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: data.geo.latitude,
      longitude: data.geo.longitude,
    };
  }

  if (data.aggregateRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.aggregateRating.ratingValue,
      reviewCount: data.aggregateRating.reviewCount,
    };
  }

  if (data.openingHours) {
    schema.openingHoursSpecification = data.openingHours;
  }

  if (data.acceptsReservations !== undefined) {
    schema.acceptsReservations = data.acceptsReservations;
  }

  return {
    type: 'Restaurant',
    schema,
    jsonLd: JSON.stringify(schema, null, 2),
  };
}

/**
 * Generate TouristAttraction schema
 */
export function generateAttractionSchema(data: AttractionSchemaData): SchemaMarkup {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: data.name,
    address: {
      '@type': 'PostalAddress',
      ...data.address,
    },
  };

  if (data.description) schema.description = data.description;

  if (data.geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: data.geo.latitude,
      longitude: data.geo.longitude,
    };
  }

  if (data.isAccessibleForFree !== undefined) {
    schema.isAccessibleForFree = data.isAccessibleForFree;
  }

  if (data.publicAccess !== undefined) {
    schema.publicAccess = data.publicAccess;
  }

  if (data.openingHours) {
    schema.openingHoursSpecification = data.openingHours;
  }

  if (data.images && data.images.length > 0) {
    schema.image = data.images;
  }

  return {
    type: 'TouristAttraction',
    schema,
    jsonLd: JSON.stringify(schema, null, 2),
  };
}

/**
 * Generate Event schema (for festivals, special events)
 */
export function generateEventSchema(data: EventSchemaData): SchemaMarkup {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: data.name,
    startDate: data.startDate,
    location: {
      '@type': 'Place',
      name: data.location.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: data.location.address,
      },
    },
  };

  if (data.description) schema.description = data.description;
  if (data.endDate) schema.endDate = data.endDate;
  if (data.image) schema.image = data.image;

  if (data.offers) {
    schema.offers = {
      '@type': 'Offer',
      price: data.offers.price,
      priceCurrency: data.offers.priceCurrency || 'USD',
      url: data.offers.url,
    };
  }

  if (data.performer) {
    schema.performer = {
      '@type': 'PerformingGroup',
      name: data.performer,
    };
  }

  if (data.organizer) {
    schema.organizer = {
      '@type': 'Organization',
      name: data.organizer,
    };
  }

  return {
    type: 'Event',
    schema,
    jsonLd: JSON.stringify(schema, null, 2),
  };
}

/**
 * Generate HowTo schema (for step-by-step guides)
 */
export function generateHowToSchema(data: HowToSchemaData): SchemaMarkup {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: data.name,
    step: data.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image ? { image: step.image } : {}),
    })),
  };

  if (data.description) schema.description = data.description;
  if (data.totalTime) schema.totalTime = data.totalTime;

  if (data.estimatedCost) {
    schema.estimatedCost = {
      '@type': 'MonetaryAmount',
      currency: data.estimatedCost.currency,
      value: data.estimatedCost.value,
    };
  }

  if (data.tools && data.tools.length > 0) {
    schema.tool = data.tools.map(tool => ({
      '@type': 'HowToTool',
      name: tool,
    }));
  }

  if (data.supplies && data.supplies.length > 0) {
    schema.supply = data.supplies.map(supply => ({
      '@type': 'HowToSupply',
      name: supply,
    }));
  }

  return {
    type: 'HowTo',
    schema,
    jsonLd: JSON.stringify(schema, null, 2),
  };
}

/**
 * Generate TouristTrip schema (for itineraries)
 */
export function generateTouristTripSchema(data: TouristTripSchemaData): SchemaMarkup {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: data.name,
    itinerary: {
      '@type': 'ItemList',
      itemListElement: data.itinerary.map((day, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'TouristTrip',
          name: day.name,
          description: day.description,
          includesAttraction: day.attractions.map(attraction => ({
            '@type': 'TouristAttraction',
            name: attraction,
          })),
        },
      })),
    },
  };

  if (data.description) schema.description = data.description;

  if (data.touristType && data.touristType.length > 0) {
    schema.touristType = data.touristType;
  }

  return {
    type: 'TouristTrip',
    schema,
    jsonLd: JSON.stringify(schema, null, 2),
  };
}

// ============================================================================
// FAQPage Schema (Mandatory for all pages)
// ============================================================================

export interface FAQSchemaItem {
  question: string;
  answer: string;
}

/**
 * Generate FAQPage schema
 */
export function generateFAQPageSchema(items: FAQSchemaItem[]): SchemaMarkup {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return {
    type: 'FAQPage',
    schema,
    jsonLd: JSON.stringify(schema, null, 2),
  };
}

// ============================================================================
// Breadcrumb Schema
// ============================================================================

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[], baseUrl: string): SchemaMarkup {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };

  return {
    type: 'BreadcrumbList',
    schema,
    jsonLd: JSON.stringify(schema, null, 2),
  };
}

/**
 * Generate breadcrumb items from URL path
 * Example: /bangkok/hotels/capella-bangkok -> [{Home}, {Bangkok}, {Hotels}, {Capella Bangkok}]
 */
export function generateBreadcrumbsFromPath(
  path: string,
  labels: Record<string, string> = {}
): BreadcrumbItem[] {
  const parts = path.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    { name: labels['home'] || 'Home', url: '/' },
  ];

  let currentPath = '';
  for (const part of parts) {
    currentPath += `/${part}`;
    breadcrumbs.push({
      name: labels[part] || formatLabel(part),
      url: currentPath,
    });
  }

  return breadcrumbs;
}

function formatLabel(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================================================
// ItemList Schema (for listicles)
// ============================================================================

export interface ListItemData {
  name: string;
  url: string;
  position: number;
  description?: string;
  image?: string;
}

/**
 * Generate ItemList schema (for "Top 10" articles)
 */
export function generateItemListSchema(
  listName: string,
  items: ListItemData[],
  baseUrl: string
): SchemaMarkup {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map(item => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      url: `${baseUrl}${item.url}`,
      ...(item.description ? { description: item.description } : {}),
      ...(item.image ? { image: item.image } : {}),
    })),
  };

  return {
    type: 'ItemList',
    schema,
    jsonLd: JSON.stringify(schema, null, 2),
  };
}

// ============================================================================
// Place Schema (for neighborhoods)
// ============================================================================

export interface PlaceSchemaData {
  name: string;
  description?: string;
  address: {
    addressLocality: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  containedInPlace?: string;
  containsPlace?: string[];
}

/**
 * Generate Place schema (for neighborhoods)
 */
export function generatePlaceSchema(data: PlaceSchemaData): SchemaMarkup {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: data.name,
    address: {
      '@type': 'PostalAddress',
      ...data.address,
    },
  };

  if (data.description) schema.description = data.description;

  if (data.geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: data.geo.latitude,
      longitude: data.geo.longitude,
    };
  }

  if (data.containedInPlace) {
    schema.containedInPlace = {
      '@type': 'City',
      name: data.containedInPlace,
    };
  }

  if (data.containsPlace && data.containsPlace.length > 0) {
    schema.containsPlace = data.containsPlace.map(place => ({
      '@type': 'Place',
      name: place,
    }));
  }

  return {
    type: 'Place',
    schema,
    jsonLd: JSON.stringify(schema, null, 2),
  };
}

// ============================================================================
// Combined Schema Generator
// ============================================================================

export interface CombinedSchemas {
  primary: SchemaMarkup;
  faq?: SchemaMarkup;
  breadcrumbs: SchemaMarkup;
  additional: SchemaMarkup[];
  combinedJsonLd: string;
}

/**
 * Generate all required schemas for a page
 */
export function generatePageSchemas(
  entityType: 'hotel' | 'restaurant' | 'attraction' | 'neighborhood' | 'itinerary' | 'guide',
  entityData: Record<string, unknown>,
  faqItems: FAQSchemaItem[],
  breadcrumbs: BreadcrumbItem[],
  baseUrl: string
): CombinedSchemas {
  const schemas: SchemaMarkup[] = [];
  let primary: SchemaMarkup;

  // Generate primary schema based on entity type
  switch (entityType) {
    case 'hotel':
      primary = generateHotelSchema(entityData as unknown as HotelSchemaData);
      break;
    case 'restaurant':
      primary = generateRestaurantSchema(entityData as unknown as RestaurantSchemaData);
      break;
    case 'attraction':
      primary = generateAttractionSchema(entityData as unknown as AttractionSchemaData);
      break;
    case 'neighborhood':
      primary = generatePlaceSchema(entityData as unknown as PlaceSchemaData);
      break;
    case 'itinerary':
      primary = generateTouristTripSchema(entityData as unknown as TouristTripSchemaData);
      break;
    case 'guide':
      primary = generateHowToSchema(entityData as unknown as HowToSchemaData);
      break;
    default:
      primary = generateAttractionSchema(entityData as unknown as AttractionSchemaData);
  }

  schemas.push(primary);

  // Generate FAQ schema (mandatory)
  let faq: SchemaMarkup | undefined;
  if (faqItems.length > 0) {
    faq = generateFAQPageSchema(faqItems);
    schemas.push(faq);
  }

  // Generate breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs, baseUrl);
  schemas.push(breadcrumbSchema);

  // Combine all schemas into one JSON-LD script
  const combinedSchema = schemas.map(s => s.schema);
  const combinedJsonLd = `<script type="application/ld+json">
${JSON.stringify(combinedSchema, null, 2)}
</script>`;

  return {
    primary,
    faq,
    breadcrumbs: breadcrumbSchema,
    additional: schemas.slice(1),
    combinedJsonLd,
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate schema for common errors
 */
export function validateSchema(schema: SchemaMarkup): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const s = schema.schema;

  // Check required fields
  if (!s['@context']) errors.push('Missing @context');
  if (!s['@type']) errors.push('Missing @type');
  if (!s['name'] && schema.type !== 'FAQPage' && schema.type !== 'BreadcrumbList') {
    errors.push('Missing name property');
  }

  // Check for empty values
  for (const [key, value] of Object.entries(s)) {
    if (value === '' || value === null) {
      warnings.push(`Empty value for ${key}`);
    }
  }

  // Type-specific validation
  if (schema.type === 'Hotel' && !s['address']) {
    errors.push('Hotel schema missing address');
  }

  if (schema.type === 'Restaurant' && !s['servesCuisine']) {
    warnings.push('Restaurant schema missing servesCuisine');
  }

  if (schema.type === 'Event' && !s['startDate']) {
    errors.push('Event schema missing startDate');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// HTML Helpers
// ============================================================================

/**
 * Generate HTML breadcrumb navigation
 */
export function generateBreadcrumbHTML(items: BreadcrumbItem[]): string {
  return `<nav aria-label="Breadcrumb" class="breadcrumb">
  <ol>
${items.map((item, index) => `    <li${index === items.length - 1 ? ' aria-current="page"' : ''}>
      ${index < items.length - 1 ? `<a href="${item.url}">${item.name}</a>` : `<span>${item.name}</span>`}
    </li>`).join('\n')}
  </ol>
</nav>`;
}

/**
 * Generate inline JSON-LD script tag
 */
export function generateJsonLdScript(schema: SchemaMarkup): string {
  return `<script type="application/ld+json">
${schema.jsonLd}
</script>`;
}
