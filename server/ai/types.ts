/**
 * AI Module Type Definitions
 * All interfaces and types for AI-generated content
 */

import type {
  ContentBlock,
  QuickInfoItem,
  HighlightItem,
  TicketInfoItem,
  EssentialInfoItem,
  FaqItem,
  RoomTypeItem,
  DiningItem,
  NearbyItem,
} from "@shared/schema";

// ============================================================================
// AI Provider Types
// ============================================================================

export type ContentTier = 'premium' | 'standard';

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

export type ImageProvider = 'dalle3' | 'flux' | 'auto';

export interface ImageGenerationConfig {
  provider: ImageProvider;
  size: '1024x1024' | '1792x1024' | '1024x1792';
  quality: 'standard' | 'hd';
  style: 'vivid' | 'natural';
}

// ============================================================================
// Image Generation Types
// ============================================================================

export interface GeneratedImage {
  url: string;
  filename: string;
  alt: string;
  caption: string;
  type: 'hero' | 'content' | 'gallery';
}

export interface ImageGenerationOptions {
  contentType: 'hotel' | 'attraction' | 'article' | 'dining' | 'district' | 'transport' | 'event' | 'itinerary';
  title: string;
  description?: string;
  location?: string;
  style?: 'photorealistic' | 'artistic' | 'editorial';
  generateHero?: boolean;
  generateContentImages?: boolean;
  contentImageCount?: number;
}

export interface ContentImage {
  filename: string;
  alt: string;
  caption: string;
}

// ============================================================================
// Content Generation Types
// ============================================================================

export interface GeneratedHotelContent {
  content: {
    title: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    lsiKeywords: string[];
    heroImageAlt: string;
    heroImageCaption?: string;
    blocks: ContentBlock[];
    seoSchema: Record<string, unknown>;
    images?: ContentImage[];
  };
  hotel: {
    location: string;
    fullAddress?: string;
    starRating: number;
    numberOfRooms: number;
    amenities: string[];
    targetAudience: string[];
    primaryCta: string;
    quickInfoBar: QuickInfoItem[];
    highlights: HighlightItem[];
    roomTypes: RoomTypeItem[];
    essentialInfo: EssentialInfoItem[];
    diningPreview: DiningItem[];
    activities: string[];
    travelerTips: string[];
    faq: FaqItem[];
    locationNearby: NearbyItem[];
    trustSignals: string[];
  };
}

export interface GeneratedAttractionContent {
  content: {
    title: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    lsiKeywords: string[];
    heroImageAlt: string;
    heroImageCaption?: string;
    blocks: ContentBlock[];
    seoSchema: Record<string, unknown>;
    images?: ContentImage[];
  };
  attraction: {
    location: string;
    fullAddress?: string;
    duration: string;
    bestTimeToVisit?: string;
    targetAudience: string[];
    primaryCta: string;
    quickInfoBar: QuickInfoItem[];
    highlights: HighlightItem[];
    ticketInfo: TicketInfoItem[];
    essentialInfo: EssentialInfoItem[];
    visitorTips: string[];
    faq: FaqItem[];
    nearbyAttractions?: NearbyItem[];
    trustSignals: string[];
    relatedKeywords?: string[];
  };
}

export interface GeneratedArticleContent {
  content: {
    title: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    lsiKeywords: string[];
    heroImageAlt: string;
    heroImageCaption?: string;
    blocks: ContentBlock[];
    seoSchema: Record<string, unknown>;
    images?: ContentImage[];
    wordCount?: number;
  };
  article: {
    category: string;
    urgencyLevel: string;
    targetAudience: string[];
    personality: string;
    tone: string;
    structure: string;
    quickFacts: string[];
    proTips: string[];
    warnings: string[];
    faq: FaqItem[];
    relatedTopics?: string[];
  };
}

export interface GeneratedDiningContent {
  content: {
    title: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    lsiKeywords: string[];
    heroImageAlt: string;
    heroImageCaption?: string;
    blocks: ContentBlock[];
    seoSchema: Record<string, unknown>;
    images?: ContentImage[];
  };
  dining: {
    restaurantName: string;
    location: string;
    fullAddress?: string;
    cuisineType: string;
    priceRange: string;
    openingHours: string;
    dressCode?: string;
    reservationRequired: boolean;
    targetAudience: string[];
    primaryCta: string;
    quickInfoBar: QuickInfoItem[];
    highlights: HighlightItem[];
    menuHighlights: { name: string; description: string; price: string }[];
    essentialInfo: EssentialInfoItem[];
    ambiance: string[];
    diningTips: string[];
    faq: FaqItem[];
    nearbyAttractions: NearbyItem[];
  };
}

export interface GeneratedDistrictContent {
  content: {
    title: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    lsiKeywords: string[];
    heroImageAlt: string;
    heroImageCaption?: string;
    blocks: ContentBlock[];
    seoSchema: Record<string, unknown>;
    images?: ContentImage[];
  };
  district: {
    districtName: string;
    location: string;
    characteristics: string[];
    targetAudience: string[];
    primaryCta: string;
    quickInfoBar: QuickInfoItem[];
    highlights: HighlightItem[];
    topAttractions: { name: string; type: string; description: string }[];
    diningOptions: { name: string; cuisine: string; priceRange: string }[];
    shoppingSpots: { name: string; type: string; description: string }[];
    essentialInfo: EssentialInfoItem[];
    explorationTips: string[];
    faq: FaqItem[];
    gettingAround: string[];
  };
}

export interface GeneratedTransportContent {
  content: {
    title: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    lsiKeywords: string[];
    heroImageAlt: string;
    heroImageCaption?: string;
    blocks: ContentBlock[];
    seoSchema: Record<string, unknown>;
    images?: ContentImage[];
  };
  transport: {
    transportType: string;
    operatingHours: string;
    coverage: string[];
    targetAudience: string[];
    primaryCta: string;
    quickInfoBar: QuickInfoItem[];
    highlights: HighlightItem[];
    fareStructure: { type: string; price: string; description: string }[];
    routes: { name: string; from: string; to: string; duration: string }[];
    essentialInfo: EssentialInfoItem[];
    usageTips: string[];
    faq: FaqItem[];
    connections: string[];
  };
}

export interface GeneratedEventContent {
  content: {
    title: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    lsiKeywords: string[];
    heroImageAlt: string;
    heroImageCaption?: string;
    blocks: ContentBlock[];
    seoSchema: Record<string, unknown>;
    images?: ContentImage[];
  };
  event: {
    eventName: string;
    eventType: string;
    dates: string;
    venue: string;
    location: string;
    targetAudience: string[];
    primaryCta: string;
    quickInfoBar: QuickInfoItem[];
    highlights: HighlightItem[];
    ticketInfo: TicketInfoItem[];
    schedule: { time: string; activity: string; description: string }[];
    essentialInfo: EssentialInfoItem[];
    attendeeTips: string[];
    faq: FaqItem[];
    relatedEvents?: string[];
  };
}

export interface GeneratedItineraryContent {
  content: {
    title: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    lsiKeywords: string[];
    heroImageAlt: string;
    heroImageCaption?: string;
    blocks: ContentBlock[];
    seoSchema: Record<string, unknown>;
    images?: ContentImage[];
  };
  itinerary: {
    duration: string;
    tripType: string;
    budget: string;
    targetAudience: string[];
    primaryCta: string;
    quickInfoBar: QuickInfoItem[];
    highlights: HighlightItem[];
    dayByDay: {
      day: number;
      title: string;
      activities: { time: string; activity: string; location: string; duration: string; tips: string }[];
    }[];
    essentialInfo: EssentialInfoItem[];
    packingList: string[];
    budgetBreakdown: { category: string; amount: string; notes: string }[];
    travelTips: string[];
    faq: FaqItem[];
  };
}

// ============================================================================
// SEO Types
// ============================================================================

export interface SeoScoreResult {
  score: number;
  breakdown: {
    titleOptimization: number;
    metaDescription: number;
    keywordUsage: number;
    contentStructure: number;
    readability: number;
    internalLinking: number;
    imageOptimization: number;
  };
  suggestions: string[];
  passesThreshold: boolean;
}

export interface SeoImprovementResult {
  metaTitle: string;
  metaDescription: string;
  improvedBlocks: ContentBlock[];
}
