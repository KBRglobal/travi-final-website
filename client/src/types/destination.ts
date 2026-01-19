/**
 * DestinationPageData TypeScript Interface
 * Complete data shape for destination pages - all sections and content.
 * Use explicit placeholders ($XX-$YY for prices) where real data is unavailable.
 */

// Individual hero image in carousel
export interface HeroImage {
  filename: string;
  url: string;
  alt: string;
  order: number;
  isActive?: boolean;
}

export interface DestinationHeroData {
  title: string; // H1: "[Destination] Travel Guide 2025"
  subtitle: string; // Value-driven subheading
  imageUrl: string; // Destination-specific hero image (fallback single image)
  imageAlt: string; // Accessible alt text
  ctaText: string; // Primary CTA button text
  ctaLink: string; // CTA destination URL
  images?: HeroImage[]; // CMS-driven carousel images
}

// Destination mood/personality for visual theming
export interface DestinationMood {
  primaryColor: string; // HSL values for destination accent
  gradientFrom: string; // Gradient overlay start
  gradientTo: string; // Gradient overlay end
  vibe: "luxury" | "adventure" | "cultural" | "modern" | "tropical" | "romantic";
  tagline: string; // Short evocative phrase
}

export interface QuickFact {
  icon: string; // Lucide icon name
  label: string; // e.g., "Currency", "Language"
  value: string; // e.g., "USD", "English" or placeholder
}

export interface Experience {
  id: string;
  title: string;
  description: string; // Short description
  duration: string; // e.g., "2-3 hours" or "X-Y hours" placeholder
  priceRange: string; // e.g., "$XX-$YY" placeholder format
  imageUrl: string | null;
  imageAlt: string | null;
}

export interface NeighborhoodQuickInfo {
  icon: string; // Lucide icon name
  label: string; // e.g., "Distance to Center"
  value: string; // e.g., "5 km"
}

export interface NeighborhoodFAQ {
  question: string;
  answer: string;
}

export interface Neighborhood {
  id: string;
  name: string;
  description: string; // Area description
  highlights: string[]; // Key features of the area
  priceLevel: string; // "$", "$$", "$$$", or "$$$$"
  imageUrl: string | null; // Large atmospheric image of the area
  imageAlt: string; // Accessible alt text
  vibe: string; // e.g., "Luxury", "Local", "Vibrant", "Quiet"
  // Extended data
  introText?: string; // Detailed intro paragraph
  quickInfo?: NeighborhoodQuickInfo[]; // Quick facts bar
  localTips?: string[]; // Insider tips
  faq?: NeighborhoodFAQ[]; // Frequently asked questions
  bestFor?: string[]; // Who this area is best for
  nearbyAttractions?: string[]; // Key attractions nearby
  transportOptions?: string[]; // How to get around
}

export interface SeasonInfo {
  name: string; // "Spring", "Summer", "Fall", "Winter"
  months: string; // "Mar-May"
  weather: string; // Description or placeholder
  crowds: "Low" | "Medium" | "High";
  recommendation: string; // Why visit during this season
  imageUrl: string; // Seasonal mood image
  colorAccent: string; // Season-specific color
}

export interface TransportOption {
  icon: string; // Lucide icon name
  name: string; // e.g., "Metro", "Taxi", "Bus"
  description: string; // Brief description
  costEstimate: string; // "$X-$Y" placeholder format
  tips: string; // Travel tip
}

export interface FAQ {
  question: string; // Destination-specific question
  answer: string; // Answer text
}

export interface DestinationCTAData {
  headline: string; // "Start planning your trip to [Destination]"
  subheadline: string;
  buttonText: string;
  buttonLink: string;
}

export interface DestinationSEO {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string | null;
  lastUpdated: string; // ISO date string
}

export interface DestinationPageData {
  id: string; // Slug identifier (e.g., "dubai", "paris")
  name: string; // Display name (e.g., "Dubai", "Paris")
  country: string; // Country name
  mood: DestinationMood; // Visual personality/theming
  hero: DestinationHeroData;
  quickFacts: QuickFact[];
  experiences: Experience[];
  neighborhoods: Neighborhood[];
  seasons: SeasonInfo[];
  transportOptions: TransportOption[];
  faqs: FAQ[];
  cta: DestinationCTAData;
  seo: DestinationSEO;
  // Optional extended properties for API responses
  featuredAttractions?: unknown[];
  featuredAreas?: unknown[];
  featuredHighlights?: unknown[];
  transport?: TransportOption[]; // Alias for transportOptions
}

// All 16 destination IDs for the factory pattern
export const DESTINATION_IDS = [
  "abu-dhabi",
  "amsterdam", 
  "bangkok",
  "barcelona",
  "dubai",
  "hong-kong",
  "istanbul",
  "las-vegas",
  "london",
  "los-angeles",
  "miami",
  "new-york",
  "paris",
  "rome",
  "singapore",
  "tokyo",
] as const;

export type DestinationId = typeof DESTINATION_IDS[number];
