/**
 * Octopus Engine - Internal Types
 * These types are used internally for content generation
 * They are converted to schema types when saving to database
 */

// ============================================================================
// Content Block Types (Internal)
// ============================================================================

export interface OctopusContentBlock {
  id: string;
  type: 'text' | 'heading' | 'bullets' | 'numbered' | 'tip' | 'warning' | 'quote' | 'table' | 'image';
  content?: string;
  items?: string[];
  heading?: string;
  level?: number;
  imageUrl?: string;
  imageAlt?: string;
}

export interface OctopusQuickInfo {
  icon: string;
  label: string;
  value: string;
}

export interface OctopusHighlight {
  icon?: string;
  image?: string;
  title: string;
  text?: string;
  description?: string;
}

export interface OctopusFaq {
  question: string;
  answer: string;
}

// ============================================================================
// Entity Base Types (fixes interface extension issues)
// ============================================================================

export interface BaseEntityData {
  id: string;
  type: string;
  name: string;
  nameLocal?: string;
  description: string;
  location?: EntityLocationData;
  confidence: number;
  sourceSection: number;
  rawMentions: string[];
}

export interface EntityLocationData {
  address?: string;
  neighborhood?: string;
  city?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
}

export interface GoogleMapsEnrichmentData {
  placeId: string;
  coordinates: { lat: number; lng: number };
  rating: number;
  reviewCount: number;
  priceLevel?: number;
  photos: string[];
  topReviews: { author: string; rating: number; text: string }[];
  openingHours?: string[];
  phoneNumber?: string;
  website?: string;
  businessStatus?: string;
  enrichedAt: Date;
}

export interface WebEnrichmentData {
  additionalReviews: ReviewData[];
  priceInfo: PriceData | null;
  awards: string[];
  highlights: string[];
  warnings: string[];
  recentNews: NewsData[];
  bookingSites: BookingData[];
  socialMentions: SocialData[];
  enrichedAt: Date;
}

export interface ReviewData {
  source: string;
  rating: number;
  reviewCount: number;
  summary: string;
  url?: string;
}

export interface PriceData {
  currency: string;
  priceRange: string;
  averagePrice?: number;
  priceComparison?: { site: string; price: string }[];
}

export interface NewsData {
  title: string;
  source: string;
  date: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface BookingData {
  name: string;
  url: string;
  hasAvailability?: boolean;
}

export interface SocialData {
  platform: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  count: number;
}

// ============================================================================
// Combined Entity Type
// ============================================================================

export interface FullyEnrichedEntity extends BaseEntityData {
  // Entity-specific fields
  starRating?: number;
  priceRange?: string;
  amenities?: string[];
  roomTypes?: string[];
  targetAudience?: string[];
  cuisineType?: string[];
  diningStyle?: string;
  specialties?: string[];
  openingHours?: string;
  category?: string;
  duration?: string;
  ticketPrice?: string;
  bestTimeToVisit?: string;
  highlights?: string[];
  characteristics?: string[];
  knownFor?: string[];
  atmosphere?: string;

  // Enrichment data
  googleMapsData?: GoogleMapsEnrichmentData;
  webSearchData?: WebEnrichmentData;
}

// ============================================================================
// Converters (to schema types)
// ============================================================================

import type { ContentBlock, QuickInfoItem, HighlightItem, FaqItem } from '@shared/schema';

export function toSchemaContentBlock(block: OctopusContentBlock): ContentBlock {
  return {
    id: block.id,
    type: block.type,
    data: {
      content: block.content,
      items: block.items,
      heading: block.heading,
      level: block.level,
      imageUrl: block.imageUrl,
      imageAlt: block.imageAlt,
    },
    order: 0,
  };
}

export function toSchemaContentBlocks(blocks: OctopusContentBlock[]): ContentBlock[] {
  return blocks.map((block, index) => ({
    ...toSchemaContentBlock(block),
    order: index,
  }));
}

export function toSchemaQuickInfo(info: OctopusQuickInfo): QuickInfoItem {
  return {
    icon: info.icon,
    label: info.label,
    value: info.value,
  };
}

export function toSchemaHighlight(highlight: OctopusHighlight): HighlightItem {
  return {
    image: highlight.image || highlight.icon || '',
    title: highlight.title,
    description: highlight.text || highlight.description || '',
  };
}

export function toSchemaFaq(faq: OctopusFaq): FaqItem {
  return {
    question: faq.question,
    answer: faq.answer,
  };
}
