/**
 * TypeScript interface definitions for JSONB fields
 * Extracted from /Users/admin/travi-final-website/shared/schema.ts
 */

// Content and Block Types
export interface ContentBlock {
  id?: string;
  type: string;
  data: Record<string, unknown>;
  order?: number;
}

export interface QuickInfoItem {
  icon: string;
  label: string;
  value: string;
}

export interface HighlightItem {
  image: string;
  title: string;
  description: string;
}

export interface TicketInfoItem {
  type: string;
  description: string;
  price?: string;
  affiliateLinkId?: string;
  label?: string;
  value?: string;
}

export interface EssentialInfoItem {
  icon: string;
  label: string;
  value: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface RelatedItem {
  name: string;
  price?: string;
  link: string;
  image?: string;
}

// Hotel Types
export interface RoomTypeItem {
  image: string;
  title: string;
  features: string[];
  price: string;
  ctaText?: string;
  affiliateLinkId?: string;
}

export interface DiningItem {
  name: string;
  cuisine: string;
  description: string;
}

export interface NearbyItem {
  name: string;
  distance: string;
  type: string;
}

// Gallery Types
export interface GalleryImage {
  image: string;
  alt: string;
  // SEO enhancements
  title?: string;
  caption?: string;
  // Multilingual support
  altHe?: string;
  altAr?: string;
  captionHe?: string;
  captionAr?: string;
  // Technical specs
  width?: number;
  height?: number;
  // Schema metadata
  keywords?: string[];
  datePublished?: string;
  contentLocation?: {
    name: string;
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
    latitude?: string;
    longitude?: string;
  };
}

// Restaurant Types
export interface MenuHighlightItem {
  name: string;
  description: string;
  price?: string;
}

export interface ThingsToDoItem {
  name: string;
  description: string;
  type: string;
}

// Transport Types
export interface FareInfoItem {
  type: string;
  price: string;
  description?: string;
}

// Itinerary Types
export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
  activities: { time: string; activity: string; location?: string }[];
}

// Experience Types
export interface ExperienceItem {
  icon: string;
  title: string;
  description: string;
}

// District Types
export interface DistrictAttractionItem {
  name: string;
  description: string;
  image?: string;
  type: string;
  isNew?: boolean;
}

export interface DiningHighlightItem {
  name: string;
  cuisine: string;
  description: string;
  image?: string;
  priceRange?: string;
}

export interface RealEstateInfoItem {
  overview: string;
  priceRange?: string;
  highlights: string[];
  targetBuyers?: string[];
}

// Workflow Types
export interface WorkflowStep {
  order: number;
  name: string;
  description?: string;
  approverType: "user" | "role" | "team";
  approverId?: string; // user id, role name, or team id
  autoApproveAfter?: number; // hours
  notifyOnPending: boolean;
}

// Newsletter Types
export interface ConsentLogEntry {
  action: "subscribe" | "confirm" | "unsubscribe" | "resubscribe" | "bounce" | "complaint";
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
}

export interface SequenceEmail {
  delayDays: number;
  subject: string;
  subjectHe: string;
  contentHtml: string;
  contentHtmlHe: string;
}

// SEO Types
export interface SeoIssue {
  type: "error" | "warning" | "info";
  category: string;
  message: string;
  field?: string;
  impact: "high" | "medium" | "low";
}

export interface SeoSuggestion {
  category: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
  estimatedImpact?: string;
}

// Static Page Types
export interface StaticPageTranslation {
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  blocks?: Array<{ id: string; type: string; data: unknown }>;
  sourceHash?: string;
  translatedAt?: string;
}

// Destination Types
export interface DestinationImage {
  url: string;
  alt: string;
  caption?: string;
  section?: string;
  generatedAt?: string;
  provider?: string;
  cost?: number;
}

export interface DestinationHeroImage {
  filename: string; // Actual filename in destinations-hero/{slug}/
  order: number; // Display order in carousel
  alt?: string; // Optional override (auto-generated if empty)
  isActive: boolean; // Whether to show in carousel
}

export interface FeaturedAttraction {
  id: string;
  title: string;
  image: string; // Required - path to attraction image
  imageAlt: string; // Required - SEO alt text
  slug?: string; // Link to attraction page if exists
  shortDescription?: string; // Optional teaser (max 120 chars)
  order: number;
  isActive: boolean;
}

export interface FeaturedArea {
  id: string;
  name: string; // e.g., "Downtown Dubai", "Marina"
  image: string; // Required - vibe image of the area
  imageAlt: string; // Required - SEO alt text
  vibe: string; // e.g., "luxury", "budget-friendly", "beach"
  priceLevel?: string; // e.g., "$$$", "$$", "$"
  shortDescription?: string; // What it's like to stay there
  order: number;
  isActive: boolean;
}

export interface FeaturedHighlight {
  id: string;
  title: string;
  image: string; // Required - stunning visual
  imageAlt: string; // Required - SEO alt text
  caption?: string; // Short caption (max 80 chars)
  linkUrl?: string; // Optional CTA link
  order: number;
  isActive: boolean;
}

export interface DestinationsIndexHeroSlide {
  id: string;
  destinationId: string; // Reference to destination in destinations table
  filename: string; // Image filename in object storage
  alt: string; // Alt text for SEO (required)
  order: number; // Display order in carousel
  isActive: boolean; // Whether to show in carousel
  cityType?: string; // E.g. "Global Travel Hub"
  travelStyle?: string; // E.g. "Luxury & Modern City"
  secondaryBadge?: string; // E.g. "Nov-Mar"
}

// Survey Types
export interface SurveyQuestion {
  id: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "rating" | "dropdown";
  title: string;
  description?: string;
  required: boolean;
  order: number;
  options?: string[]; // For radio, checkbox, dropdown
  minRating?: number; // For rating (default 1)
  maxRating?: number; // For rating (default 5)
  conditionalLogic?: {
    enabled: boolean;
    questionId: string; // The question this depends on
    operator: "equals" | "not_equals" | "contains" | "not_contains";
    value: string | string[];
  };
  placeholder?: string; // For text/textarea
  maxLength?: number; // For text/textarea
}

export interface SurveyDefinition {
  questions: SurveyQuestion[];
  settings?: {
    showProgressBar?: boolean;
    allowBackNavigation?: boolean;
    randomizeQuestions?: boolean;
    thankYouMessage?: string;
    redirectUrl?: string;
  };
}
