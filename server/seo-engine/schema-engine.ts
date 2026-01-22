/**
 * Schema Engine - Complete Schema.org Structured Data Generation
 *
 * Generates rich structured data for all content types:
 * - TouristDestination / TouristAttraction
 * - Article / NewsArticle / BlogPosting
 * - FAQPage
 * - Event
 * - Place / LocalBusiness
 * - Hotel / LodgingBusiness
 * - Restaurant / FoodEstablishment
 * - HowTo
 * - BreadcrumbList
 * - Organization / WebSite / WebPage
 */

import { db } from '../db';
import {
  contents,
  attractions,
  hotels,
  dining,
  districts,
  articles,
  events,
  itineraries,
  transports,
  aeoAnswerCapsules,
} from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import {
  SEOEngineConfig,
  SchemaGraph,
  SchemaNode,
  SchemaType,
  SchemaGenerationResult,
  SchemaValidation,
  ContentType,
} from './types';

export class SchemaEngine {
  private config: SEOEngineConfig;

  constructor(config: SEOEngineConfig) {
    this.config = config;
  }

  /**
   * Generate complete schema for content
   */
  async generateForContent(contentId: string): Promise<SchemaGenerationResult> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const graph = await this.buildSchemaGraph(content);
    const types = this.extractTypes(graph);
    const validation = this.validateSchema(graph);

    return {
      schema: graph,
      types,
      validation,
      generatedAt: new Date(),
    };
  }

  /**
   * Build complete schema graph for content
   */
  private async buildSchemaGraph(content: any): Promise<SchemaGraph> {
    const nodes: SchemaNode[] = [];
    const baseUrl = this.config.baseUrl;

    // 1. Always add WebPage
    nodes.push(this.buildWebPageSchema(content, baseUrl));

    // 2. Add Breadcrumbs
    nodes.push(this.buildBreadcrumbSchema(content, baseUrl));

    // 3. Add type-specific schema
    const typeSchema = await this.buildTypeSpecificSchema(content, baseUrl);
    if (typeSchema) {
      if (Array.isArray(typeSchema)) {
        nodes.push(...typeSchema);
      } else {
        nodes.push(typeSchema);
      }
    }

    // 4. Add FAQ schema if present
    const faqSchema = await this.buildFAQSchema(content);
    if (faqSchema) {
      nodes.push(faqSchema);
    }

    // 5. Add HowTo schema if applicable
    const howToSchema = this.buildHowToSchema(content);
    if (howToSchema) {
      nodes.push(howToSchema);
    }

    // 6. Add Speakable (Answer Capsule) schema
    const speakableSchema = await this.buildSpeakableSchema(content, baseUrl);
    if (speakableSchema) {
      nodes.push(speakableSchema);
    }

    // 7. Add Organization schema
    nodes.push(this.buildOrganizationSchema(baseUrl));

    // 8. Add WebSite schema
    nodes.push(this.buildWebSiteSchema(baseUrl));

    return {
      '@context': 'https://schema.org',
      '@graph': nodes,
    };
  }

  /**
   * Build WebPage schema
   */
  private buildWebPageSchema(content: any, baseUrl: string): SchemaNode {
    const url = `${baseUrl}/${content.type}/${content.slug}`;

    return {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: content.metaTitle || content.title,
      description: content.metaDescription,
      inLanguage: this.config.defaultLocale,
      isPartOf: {
        '@id': `${baseUrl}/#website`,
      },
      primaryImageOfPage: content.heroImage ? {
        '@id': `${url}#primaryimage`,
      } : undefined,
      datePublished: content.publishedAt?.toISOString(),
      dateModified: content.updatedAt?.toISOString(),
      potentialAction: [{
        '@type': 'ReadAction',
        target: [url],
      }],
    };
  }

  /**
   * Build Breadcrumb schema
   */
  private buildBreadcrumbSchema(content: any, baseUrl: string): SchemaNode {
    const items = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: this.getTypeDisplayName(content.type),
        item: `${baseUrl}/${content.type}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: content.title,
        item: `${baseUrl}/${content.type}/${content.slug}`,
      },
    ];

    return {
      '@type': 'BreadcrumbList',
      '@id': `${baseUrl}/${content.type}/${content.slug}#breadcrumb`,
      itemListElement: items,
    };
  }

  /**
   * Build type-specific schema
   */
  private async buildTypeSpecificSchema(
    content: any,
    baseUrl: string
  ): Promise<SchemaNode | SchemaNode[] | null> {
    switch (content.type as ContentType) {
      case 'attraction':
        return this.buildAttractionSchema(content, baseUrl);
      case 'hotel':
        return this.buildHotelSchema(content, baseUrl);
      case 'dining':
        return this.buildDiningSchema(content, baseUrl);
      case 'district':
        return this.buildDistrictSchema(content, baseUrl);
      case 'article':
        return this.buildArticleSchema(content, baseUrl);
      case 'event':
        return this.buildEventSchema(content, baseUrl);
      case 'itinerary':
        return this.buildItinerarySchema(content, baseUrl);
      case 'transport':
        return this.buildTransportSchema(content, baseUrl);
      default:
        return this.buildGenericPlaceSchema(content, baseUrl);
    }
  }

  /**
   * Build TouristAttraction schema
   */
  private async buildAttractionSchema(content: any, baseUrl: string): Promise<SchemaNode[]> {
    const attraction = await db.query.attractions.findFirst({
      where: eq(attractions.contentId, content.id),
    });

    const url = `${baseUrl}/attraction/${content.slug}`;
    const schemas: SchemaNode[] = [];

    // Main TouristAttraction schema
    const attractionSchema: SchemaNode = {
      '@type': 'TouristAttraction',
      '@id': `${url}#attraction`,
      name: content.title,
      description: content.metaDescription,
      url,
      image: content.heroImage ? {
        '@type': 'ImageObject',
        '@id': `${url}#primaryimage`,
        url: content.heroImage,
        caption: content.heroImageAlt || content.title,
      } : undefined,
      address: attraction?.location ? {
        '@type': 'PostalAddress',
        addressLocality: attraction.location,
        addressCountry: 'AE',
      } : undefined,
      publicAccess: true,
      isAccessibleForFree: false,
    };

    // Add price if available
    if (attraction?.priceFrom) {
      attractionSchema.offers = {
        '@type': 'Offer',
        price: this.extractPrice(attraction.priceFrom),
        priceCurrency: 'AED',
        availability: 'https://schema.org/InStock',
      };
    }

    // Add duration if available
    if (attraction?.duration) {
      attractionSchema.timeRequired = this.formatDuration(attraction.duration);
    }

    // Add target audience
    if (attraction?.targetAudience && attraction.targetAudience.length > 0) {
      attractionSchema.touristType = attraction.targetAudience;
    }

    // Add highlights as amenityFeature
    if (attraction?.highlights && attraction.highlights.length > 0) {
      attractionSchema.amenityFeature = attraction.highlights.map((h: any) => ({
        '@type': 'LocationFeatureSpecification',
        name: h.title || h.label,
        value: true,
      }));
    }

    schemas.push(attractionSchema);

    // Add Place schema for geo-location - only if location data is available
    // FAIL-FAST: Do not use implicit Dubai coordinates - require explicit location data
    if (attraction?.location) {
      schemas.push({
        '@type': 'Place',
        '@id': `${url}#place`,
        name: content.title,
        address: {
          '@type': 'PostalAddress',
          addressLocality: attraction.location,
          // FAIL-FAST: Do not use implicit Dubai region - use location data only
          addressCountry: 'AE',
        },
        // Only include geo if coordinates are explicitly provided
        ...((attraction as any)?.coordinates ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: (attraction as any).coordinates.lat,
            longitude: (attraction as any).coordinates.lng,
          }
        } : {})
      });
    }

    return schemas;
  }

  /**
   * Build Hotel schema
   */
  private async buildHotelSchema(content: any, baseUrl: string): Promise<SchemaNode[]> {
    const hotel = await db.query.hotels.findFirst({
      where: eq(hotels.contentId, content.id),
    });

    const url = `${baseUrl}/hotel/${content.slug}`;
    const schemas: SchemaNode[] = [];

    const hotelSchema: SchemaNode = {
      '@type': ['Hotel', 'LodgingBusiness'],
      '@id': `${url}#hotel`,
      name: content.title,
      description: content.metaDescription,
      url,
      image: content.heroImage,
      address: hotel?.location ? {
        '@type': 'PostalAddress',
        addressLocality: hotel.location,
        addressRegion: 'Dubai',
        addressCountry: 'AE',
      } : undefined,
      priceRange: '$$$$',
    };

    // Add star rating
    if (hotel?.starRating) {
      hotelSchema.starRating = {
        '@type': 'Rating',
        ratingValue: hotel.starRating,
        bestRating: 5,
        worstRating: 1,
      };
    }

    // Add number of rooms
    if (hotel?.numberOfRooms) {
      hotelSchema.numberOfRooms = hotel.numberOfRooms;
    }

    // Add amenities
    if (hotel?.amenities && hotel.amenities.length > 0) {
      hotelSchema.amenityFeature = hotel.amenities.map((amenity: string) => ({
        '@type': 'LocationFeatureSpecification',
        name: amenity,
        value: true,
      }));
    }

    schemas.push(hotelSchema);
    return schemas;
  }

  /**
   * Build Restaurant schema
   */
  private async buildDiningSchema(content: any, baseUrl: string): Promise<SchemaNode[]> {
    const restaurant = await db.query.dining.findFirst({
      where: eq(dining.contentId, content.id),
    });

    const url = `${baseUrl}/dining/${content.slug}`;

    const restaurantSchema: SchemaNode = {
      '@type': ['Restaurant', 'FoodEstablishment'],
      '@id': `${url}#restaurant`,
      name: content.title,
      description: content.metaDescription,
      url,
      image: content.heroImage,
      address: restaurant?.location ? {
        '@type': 'PostalAddress',
        addressLocality: restaurant.location,
        addressRegion: 'Dubai',
        addressCountry: 'AE',
      } : undefined,
      servesCuisine: restaurant?.cuisineType || undefined,
      priceRange: restaurant?.priceRange || undefined,
    };

    // Add menu if available
    if (restaurant?.menuHighlights && restaurant.menuHighlights.length > 0) {
      restaurantSchema.hasMenu = {
        '@type': 'Menu',
        hasMenuSection: restaurant.menuHighlights.map((item: any) => ({
          '@type': 'MenuSection',
          name: item.name || item.title,
          description: item.description,
        })),
      };
    }

    return [restaurantSchema];
  }

  /**
   * Build TouristDestination schema for districts
   */
  private async buildDistrictSchema(content: any, baseUrl: string): Promise<SchemaNode[]> {
    const district = await db.query.districts.findFirst({
      where: eq(districts.contentId, content.id),
    });

    const url = `${baseUrl}/district/${content.slug}`;

    const destinationSchema: SchemaNode = {
      '@type': ['TouristDestination', 'Place'],
      '@id': `${url}#destination`,
      name: content.title,
      description: content.metaDescription,
      url,
      image: content.heroImage,
      address: {
        '@type': 'PostalAddress',
        addressLocality: district?.neighborhood || district?.location || content.title,
        addressRegion: 'Dubai',
        addressCountry: 'AE',
      },
      touristType: district?.targetAudience || [],
    };

    // Add things to do as itemListElement
    if (district?.thingsToDo && district.thingsToDo.length > 0) {
      destinationSchema.includesAttraction = district.thingsToDo.map((item: any) => ({
        '@type': 'TouristAttraction',
        name: item.title || item.name,
        description: item.description,
      }));
    }

    return [destinationSchema];
  }

  /**
   * Build Article schema
   */
  private async buildArticleSchema(content: any, baseUrl: string): Promise<SchemaNode[]> {
    const article = await db.query.articles.findFirst({
      where: eq(articles.contentId, content.id),
    });

    const url = `${baseUrl}/article/${content.slug}`;

    // Determine article type based on category
    const articleType = this.getArticleType(article?.category);

    const articleSchema: SchemaNode = {
      '@type': articleType,
      '@id': `${url}#article`,
      headline: content.metaTitle || content.title,
      description: content.metaDescription,
      url,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
      },
      image: content.heroImage ? {
        '@type': 'ImageObject',
        url: content.heroImage,
        caption: content.heroImageAlt,
      } : undefined,
      datePublished: content.publishedAt?.toISOString() || content.createdAt?.toISOString(),
      dateModified: content.updatedAt?.toISOString(),
      author: {
        '@type': 'Organization',
        name: this.config.siteName,
        url: this.config.baseUrl,
      },
      publisher: {
        '@type': 'Organization',
        name: this.config.siteName,
        url: this.config.baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${this.config.baseUrl}/logo.png`,
        },
      },
      articleSection: article?.category || 'Travel',
      wordCount: content.wordCount || undefined,
      keywords: content.primaryKeyword || undefined,
    };

    return [articleSchema];
  }

  /**
   * Build Event schema
   */
  private async buildEventSchema(content: any, baseUrl: string): Promise<SchemaNode[]> {
    const event = await db.query.events.findFirst({
      where: eq(events.contentId, content.id),
    });

    if (!event) {
      return [];
    }

    const url = `${baseUrl}/event/${content.slug}`;

    const eventSchema: SchemaNode = {
      '@type': 'Event',
      '@id': `${url}#event`,
      name: content.title,
      description: content.metaDescription,
      url,
      image: content.heroImage,
      startDate: event.eventDate?.toISOString(),
      endDate: event.endDate?.toISOString() || event.eventDate?.toISOString(),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: event.venue ? {
        '@type': 'Place',
        name: event.venue,
        address: {
          '@type': 'PostalAddress',
          streetAddress: event.venueAddress,
          addressLocality: 'Dubai',
          addressCountry: 'AE',
        },
      } : undefined,
      organizer: event.organizer ? {
        '@type': 'Organization',
        name: event.organizer,
        email: event.contactEmail,
      } : undefined,
    };

    // Add ticket offers
    if (event.ticketUrl) {
      eventSchema.offers = {
        '@type': 'Offer',
        url: event.ticketUrl,
        price: this.extractPrice(event.ticketPrice || '0'),
        priceCurrency: 'AED',
        availability: 'https://schema.org/InStock',
        validFrom: new Date().toISOString(),
      };
    }

    // Add recurring event info
    if (event.isRecurring && event.recurrencePattern) {
      eventSchema.eventSchedule = {
        '@type': 'Schedule',
        repeatFrequency: event.recurrencePattern,
      };
    }

    return [eventSchema];
  }

  /**
   * Build Itinerary as ItemList schema
   */
  private async buildItinerarySchema(content: any, baseUrl: string): Promise<SchemaNode[]> {
    const itinerary = await db.query.itineraries.findFirst({
      where: eq(itineraries.contentId, content.id),
    });

    const url = `${baseUrl}/itinerary/${content.slug}`;

    const itinerarySchema: SchemaNode = {
      '@type': 'ItemList',
      '@id': `${url}#itinerary`,
      name: content.title,
      description: content.metaDescription,
      url,
      numberOfItems: itinerary?.dayPlan?.length || 0,
      itemListElement: (itinerary?.dayPlan || []).map((day: any, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: day.title || `Day ${index + 1}`,
        description: day.description,
      })),
    };

    // Also add as TravelAction
    const travelSchema: SchemaNode = {
      '@type': 'TravelAction' as any,
      '@id': `${url}#travel`,
      name: content.title,
      description: content.metaDescription,
      duration: itinerary?.duration ? this.formatDuration(itinerary.duration) : undefined,
    };

    return [itinerarySchema, travelSchema];
  }

  /**
   * Build Transport as Service schema
   */
  private async buildTransportSchema(content: any, baseUrl: string): Promise<SchemaNode[]> {
    const transport = await db.query.transports.findFirst({
      where: eq(transports.contentId, content.id),
    });

    const url = `${baseUrl}/transport/${content.slug}`;

    const transportSchema: SchemaNode = {
      '@type': 'Service' as any,
      '@id': `${url}#transport`,
      name: content.title,
      description: content.metaDescription,
      url,
      serviceType: transport?.transitMode || 'Transportation',
      areaServed: {
        '@type': 'City',
        name: 'Dubai',
        addressCountry: 'AE',
      },
      provider: {
        '@type': 'Organization',
        name: 'Dubai RTA',
      },
    };

    return [transportSchema];
  }

  /**
   * Build generic Place schema
   */
  private buildGenericPlaceSchema(content: any, baseUrl: string): SchemaNode {
    const url = `${baseUrl}/${content.type}/${content.slug}`;

    return {
      '@type': 'Place',
      '@id': `${url}#place`,
      name: content.title,
      description: content.metaDescription,
      url,
      image: content.heroImage,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Dubai',
        addressCountry: 'AE',
      },
    };
  }

  /**
   * Build FAQ schema
   */
  private async buildFAQSchema(content: any): Promise<SchemaNode | null> {
    let faqData: any[] = [];

    // Fetch FAQ from type-specific table
    switch (content.type) {
      case 'attraction': {
        const attraction = await db.query.attractions.findFirst({
          where: eq(attractions.contentId, content.id),
        });
        faqData = attraction?.faq || [];
        break;
      }
      case 'hotel': {
        const hotel = await db.query.hotels.findFirst({
          where: eq(hotels.contentId, content.id),
        });
        faqData = hotel?.faq || [];
        break;
      }
      case 'dining': {
        const restaurant = await db.query.dining.findFirst({
          where: eq(dining.contentId, content.id),
        });
        faqData = restaurant?.faq || [];
        break;
      }
      case 'district': {
        const district = await db.query.districts.findFirst({
          where: eq(districts.contentId, content.id),
        });
        faqData = district?.faq || [];
        break;
      }
      case 'article': {
        const article = await db.query.articles.findFirst({
          where: eq(articles.contentId, content.id),
        });
        faqData = article?.faq || [];
        break;
      }
    }

    if (!faqData || faqData.length === 0) {
      return null;
    }

    const url = `${this.config.baseUrl}/${content.type}/${content.slug}`;

    return {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: faqData.map((item: any) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };
  }

  /**
   * Build HowTo schema from content blocks
   */
  private buildHowToSchema(content: any): SchemaNode | null {
    if (!['article', 'transport', 'itinerary'].includes(content.type)) {
      return null;
    }

    const blocks = content.blocks || [];
    const steps: any[] = [];
    let currentStep = 0;

    for (const block of blocks) {
      if (block.type === 'heading' && (block.level === 2 || block.data?.level === 2)) {
        currentStep++;
        steps.push({
          '@type': 'HowToStep',
          position: currentStep,
          name: block.content || block.data?.text || block.text,
          text: '',
        });
      } else if (block.type === 'paragraph' && steps.length > 0) {
        const lastStep = steps[steps.length - 1];
        const text = block.content || block.data?.text || block.text || '';
        lastStep.text += (lastStep.text ? ' ' : '') + text;
      }
    }

    if (steps.length < 2) {
      return null;
    }

    const url = `${this.config.baseUrl}/${content.type}/${content.slug}`;

    return {
      '@type': 'HowTo',
      '@id': `${url}#howto`,
      name: content.title,
      description: content.metaDescription,
      step: steps,
      totalTime: steps.length > 5 ? 'PT30M' : 'PT15M',
    };
  }

  /**
   * Build Speakable schema for answer capsule
   */
  private async buildSpeakableSchema(content: any, baseUrl: string): Promise<SchemaNode | null> {
    const capsule = await db.query.aeoAnswerCapsules.findFirst({
      where: and(
        eq(aeoAnswerCapsules.contentId, content.id),
        eq(aeoAnswerCapsules.locale, this.config.defaultLocale as any)
      ),
    });

    if (!capsule) {
      return null;
    }

    const url = `${baseUrl}/${content.type}/${content.slug}`;

    return {
      '@type': 'WebPage',
      '@id': `${url}#speakable`,
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['.answer-capsule', '.quick-answer', '.key-facts'],
      },
      mainContentOfPage: {
        '@type': 'WebPageElement',
        cssSelector: '.answer-capsule',
        text: capsule.capsuleText,
      },
    };
  }

  /**
   * Build Organization schema
   */
  private buildOrganizationSchema(baseUrl: string): SchemaNode {
    return {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: this.config.siteName,
      alternateName: `${this.config.siteName} Travel`,
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
        width: 512,
        height: 512,
      },
      sameAs: [
        'https://twitter.com/traviworld',
        'https://www.facebook.com/traviworld',
        'https://www.instagram.com/traviworld',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'info@travi.world',
        availableLanguage: this.config.supportedLocales,
      },
    };
  }

  /**
   * Build WebSite schema
   */
  private buildWebSiteSchema(baseUrl: string): SchemaNode {
    return {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      name: this.config.siteName,
      url: baseUrl,
      description: 'Expert travel guides, reviews, and insights for destinations worldwide.',
      publisher: {
        '@id': `${baseUrl}/#organization`,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${baseUrl}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
      inLanguage: this.config.supportedLocales,
    };
  }

  /**
   * Validate schema
   */
  private validateSchema(schema: SchemaGraph): SchemaValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!schema['@context']) {
      errors.push('Missing @context');
    }

    if (!schema['@graph'] || schema['@graph'].length === 0) {
      errors.push('Empty @graph');
    }

    for (const node of schema['@graph']) {
      if (!node['@type']) {
        errors.push('Node missing @type');
      }

      if (!node['@id'] && !['BreadcrumbList', 'ListItem'].includes(node['@type'] as string)) {
        warnings.push(`${node['@type']} missing @id`);
      }
    }

    // Check for required schemas
    const types = this.extractTypes(schema);
    if (!types.includes('WebPage')) {
      warnings.push('Missing WebPage schema');
    }
    if (!types.includes('BreadcrumbList')) {
      warnings.push('Missing BreadcrumbList schema');
    }
    if (!types.includes('FAQPage')) {
      recommendations.push('Consider adding FAQPage schema for better AI extraction');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }

  /**
   * Extract schema types from graph
   */
  private extractTypes(schema: SchemaGraph): SchemaType[] {
    const types: SchemaType[] = [];

    for (const node of schema['@graph']) {
      if (Array.isArray(node['@type'])) {
        types.push(...(node['@type'] as SchemaType[]));
      } else if (node['@type']) {
        types.push(node['@type'] as SchemaType);
      }
    }

    return [...new Set(types)];
  }

  /**
   * Get display name for content type
   */
  private getTypeDisplayName(type: string): string {
    const names: Record<string, string> = {
      attraction: 'Attractions',
      hotel: 'Hotels',
      dining: 'Restaurants',
      district: 'Districts',
      article: 'Articles',
      event: 'Events',
      transport: 'Transport',
      itinerary: 'Itineraries',
      landing_page: 'Guides',
      case_study: 'Case Studies',
      off_plan: 'Real Estate',
    };
    return names[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Get article schema type based on category
   */
  private getArticleType(category?: string): SchemaType {
    if (category === 'news') {
      return 'NewsArticle';
    }
    if (['tips', 'transport', 'events'].includes(category || '')) {
      return 'BlogPosting';
    }
    return 'Article';
  }

  /**
   * Extract numeric price from string
   */
  private extractPrice(priceStr: string): string {
    const match = priceStr.match(/[\d,]+/);
    return match ? match[0].replace(/,/g, '') : '0';
  }

  /**
   * Format duration to ISO 8601 format
   */
  private formatDuration(duration: string): string {
    // Try to parse common formats
    const hourMatch = duration.match(/(\d+)\s*(?:hour|hr|h)/i);
    const minMatch = duration.match(/(\d+)\s*(?:minute|min|m)/i);

    let iso = 'PT';
    if (hourMatch) {
      iso += `${hourMatch[1]}H`;
    }
    if (minMatch) {
      iso += `${minMatch[1]}M`;
    }

    return iso === 'PT' ? 'PT2H' : iso; // Default 2 hours if parsing fails
  }
}
