/**
 * Homepage Fallback Constants
 *
 * Server-side fallback data to ensure /api/public/homepage-config
 * NEVER returns empty arrays or null images to the client.
 *
 * These fallbacks are used when the production database is empty.
 * The frontend should be "dumb" - it renders whatever the API returns.
 */

import { log } from "./logger";

// Types matching the API response structure
export interface FallbackQuickCategory {
  id: number;
  sectionId: string | null;
  icon: string;
  title: string;
  titleHe: string;
  subtitle: string;
  subtitleHe: string;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface FallbackExperienceCategory {
  id: number;
  name: string;
  nameHe: string;
  description: string;
  descriptionHe: string;
  slug: string;
  image: string;
  imageAlt: string;
  icon: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
}

export interface FallbackRegionLink {
  id: number;
  regionName: string;
  name: string;
  nameHe: string;
  icon: string;
  linkUrl: string;
  links: unknown[];
  destinations: Array<{ name: string; slug: string }>;
  sortOrder: number;
  isActive: boolean;
}

export interface FallbackDestination {
  id: string;
  name: string;
  country: string;
  slug: string;
  cardImage: string;
  cardImageAlt: string;
  summary: string;
}

export interface FallbackHeroSlide {
  id: string;
  imageUrl: string;
  imageAlt: string;
  headline: string;
  headlineHe: string;
  subheadline: string;
  subheadlineHe: string;
  ctaText: string;
  ctaTextHe: string;
  ctaLink: string;
  sortOrder: number;
  isActive: boolean;
}

// ============================================================================
// FALLBACK CONSTANTS
// ============================================================================

export const FALLBACK_QUICK_CATEGORIES: FallbackQuickCategory[] = [
  {
    id: 1,
    sectionId: null,
    icon: "Building2",
    title: "Hotels",
    titleHe: "",
    subtitle: "Find your perfect stay",
    subtitleHe: "",
    linkUrl: "/hotels",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 2,
    sectionId: null,
    icon: "Compass",
    title: "Attractions",
    titleHe: "",
    subtitle: "Discover must-see places",
    subtitleHe: "",
    linkUrl: "/attractions",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 3,
    sectionId: null,
    icon: "Utensils",
    title: "Restaurants",
    titleHe: "",
    subtitle: "Explore dining options",
    subtitleHe: "",
    linkUrl: "/restaurants",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 4,
    sectionId: null,
    icon: "Star",
    title: "Things to Do",
    titleHe: "",
    subtitle: "Activities and experiences",
    subtitleHe: "",
    linkUrl: "/things-to-do",
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 5,
    sectionId: null,
    icon: "Newspaper",
    title: "Travel News",
    titleHe: "",
    subtitle: "Latest travel updates",
    subtitleHe: "",
    linkUrl: "/news",
    sortOrder: 5,
    isActive: true,
  },
  {
    id: 6,
    sectionId: null,
    icon: "BookOpen",
    title: "Travel Guides",
    titleHe: "",
    subtitle: "Complete destination guides",
    subtitleHe: "",
    linkUrl: "/travel-guides",
    sortOrder: 6,
    isActive: true,
  },
];

export const FALLBACK_EXPERIENCE_CATEGORIES: FallbackExperienceCategory[] = [
  {
    id: 1,
    name: "Luxury Travel",
    nameHe: "",
    description: "Premium travel experiences and exclusive destinations",
    descriptionHe: "",
    slug: "luxury",
    image: "/experiences/experiences-luxury-resort-infinity-pool.webp",
    imageAlt: "Luxury resort with infinity pool",
    icon: "Sparkles",
    href: "/experiences/luxury",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 2,
    name: "Adventure & Outdoors",
    nameHe: "",
    description: "Thrilling outdoor experiences and adventures",
    descriptionHe: "",
    slug: "adventure",
    image: "/experiences/experiences-adventure-hiker-mountain-trail-snowy-peaks.webp",
    imageAlt: "Hiker on mountain trail",
    icon: "Tent",
    href: "/experiences/adventure",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 3,
    name: "Family Travel",
    nameHe: "",
    description: "Family-friendly destinations and activities",
    descriptionHe: "",
    slug: "family",
    image: "/experiences/picnic-modern-architecture-outdoor-activity.webp",
    imageAlt: "Family enjoying picnic",
    icon: "Baby",
    href: "/experiences/family",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 4,
    name: "Budget Travel",
    nameHe: "",
    description: "Affordable travel options and destinations",
    descriptionHe: "",
    slug: "budget",
    image: "/experiences/solo-travel-backpack-map-camera-desert-architecture.webp",
    imageAlt: "Travel backpack with camera",
    icon: "Wallet",
    href: "/experiences/budget",
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 5,
    name: "Honeymoon & Romance",
    nameHe: "",
    description: "Romantic getaways and honeymoon destinations",
    descriptionHe: "",
    slug: "romance",
    image: "/experiences/romantic-couple-beach-sunset-modern-architecture.webp",
    imageAlt: "Couple at sunset on beach",
    icon: "Heart",
    href: "/experiences/romance",
    sortOrder: 5,
    isActive: true,
  },
  {
    id: 6,
    name: "Solo Travel",
    nameHe: "",
    description: "Perfect destinations for solo travelers",
    descriptionHe: "",
    slug: "solo",
    image: "/experiences/solo-traveler-canoe-mountain-lake-archway-reflection.webp",
    imageAlt: "Solo traveler in canoe",
    icon: "Backpack",
    href: "/experiences/solo",
    sortOrder: 6,
    isActive: true,
  },
];

export const FALLBACK_REGION_LINKS: FallbackRegionLink[] = [
  {
    id: 1,
    regionName: "Europe",
    name: "Europe",
    nameHe: "",
    icon: "Globe",
    linkUrl: "/destinations/europe",
    links: [],
    destinations: [
      { name: "London", slug: "/destinations/london" },
      { name: "Paris", slug: "/destinations/paris" },
      { name: "Barcelona", slug: "/destinations/barcelona" },
      { name: "Rome", slug: "/destinations/rome" },
      { name: "Amsterdam", slug: "/destinations/amsterdam" },
    ],
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 2,
    regionName: "Asia",
    name: "Asia",
    nameHe: "",
    icon: "Globe",
    linkUrl: "/destinations/asia",
    links: [],
    destinations: [
      { name: "Tokyo", slug: "/destinations/tokyo" },
      { name: "Singapore", slug: "/destinations/singapore" },
      { name: "Bangkok", slug: "/destinations/bangkok" },
      { name: "Hong Kong", slug: "/destinations/hong-kong" },
    ],
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 3,
    regionName: "Middle East",
    name: "Middle East",
    nameHe: "",
    icon: "Globe",
    linkUrl: "/destinations/middle-east",
    links: [],
    destinations: [
      { name: "Dubai", slug: "/destinations/dubai" },
      { name: "Abu Dhabi", slug: "/destinations/abu-dhabi" },
      { name: "Ras Al Khaimah", slug: "/destinations/ras-al-khaimah" },
      { name: "Istanbul", slug: "/destinations/istanbul" },
    ],
    sortOrder: 3,
    isActive: true,
  },
];

export const FALLBACK_DESTINATIONS: FallbackDestination[] = [
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    slug: "/destinations/dubai",
    cardImage: "/cards/dubai.webp",
    cardImageAlt: "Dubai cityscape",
    summary: "Ultramodern architecture, luxury shopping, desert adventures",
  },
  {
    id: "london",
    name: "London",
    country: "United Kingdom",
    slug: "/destinations/london",
    cardImage: "/cards/london.webp",
    cardImageAlt: "London cityscape",
    summary: "Iconic landmarks, royal palaces, world-class theater",
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    slug: "/destinations/paris",
    cardImage: "/cards/paris.webp",
    cardImageAlt: "Paris cityscape",
    summary: "The City of Light with iconic landmarks and exquisite cuisine",
  },
  {
    id: "new-york",
    name: "New York",
    country: "USA",
    slug: "/destinations/new-york",
    cardImage: "/cards/new-york.webp",
    cardImageAlt: "New York cityscape",
    summary: "The city that never sleeps with world-famous attractions",
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    slug: "/destinations/tokyo",
    cardImage: "/cards/tokyo.webp",
    cardImageAlt: "Tokyo cityscape",
    summary: "Ancient temples, cutting-edge technology, incredible food",
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    slug: "/destinations/singapore",
    cardImage: "/cards/singapore.webp",
    cardImageAlt: "Singapore cityscape",
    summary: "Futuristic gardens, diverse cuisine, clean streets",
  },
  {
    id: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    slug: "/destinations/bangkok",
    cardImage: "/cards/bangkok.webp",
    cardImageAlt: "Bangkok cityscape",
    summary: "Ornate temples, bustling street markets, incredible food",
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    slug: "/destinations/istanbul",
    cardImage: "/cards/istanbul.webp",
    cardImageAlt: "Istanbul cityscape",
    summary: "Ancient bazaars, Byzantine treasures, Ottoman palaces",
  },
  {
    id: "barcelona",
    name: "Barcelona",
    country: "Spain",
    slug: "/destinations/barcelona",
    cardImage: "/cards/barcelona.webp",
    cardImageAlt: "Barcelona cityscape",
    summary: "Gaudi's masterpieces, Mediterranean beaches, tapas culture",
  },
  {
    id: "rome",
    name: "Rome",
    country: "Italy",
    slug: "/destinations/rome",
    cardImage: "/cards/rome.webp",
    cardImageAlt: "Rome cityscape",
    summary: "Ancient ruins, Renaissance art, authentic Italian cuisine",
  },
  {
    id: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    slug: "/destinations/amsterdam",
    cardImage: "/cards/amsterdam.webp",
    cardImageAlt: "Amsterdam cityscape",
    summary: "Charming canals, world-renowned museums, vibrant neighborhoods",
  },
  {
    id: "abu-dhabi",
    name: "Abu Dhabi",
    country: "UAE",
    slug: "/destinations/abu-dhabi",
    cardImage: "/cards/abu-dhabi.webp",
    cardImageAlt: "Abu Dhabi cityscape",
    summary: "Sheikh Zayed Mosque, world-class museums, luxurious desert experiences",
  },
  {
    id: "ras-al-khaimah",
    name: "Ras Al Khaimah",
    country: "UAE",
    slug: "/destinations/ras-al-khaimah",
    cardImage: "/cards/ras-al-khaimah.webp",
    cardImageAlt: "Ras Al Khaimah mountains and coastline",
    summary:
      "UAE's adventure capital with Jebel Jais, pristine beaches, and Wynn casino opening 2027",
  },
];

export const FALLBACK_HERO_SLIDES: FallbackHeroSlide[] = [
  {
    id: "fallback-1",
    imageUrl: "/hero/travi-world-mascot-colorful-pool-arches.webp",
    imageAlt: "Travi mascot at luxury pool",
    headline: "Complete Travel Information Database | Hotels, Attractions & Guides",
    headlineHe: "",
    subheadline:
      "Expert hotel information, detailed attractions, dining recommendations, and insider travel tips",
    subheadlineHe: "",
    ctaText: "Explore",
    ctaTextHe: "",
    ctaLink: "/destinations",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "fallback-2",
    imageUrl: "/hero/travi-world-mascot-canyon-viewpoint.webp",
    imageAlt: "Travi mascot in desert canyon",
    headline: "Discover Authentic Experiences | Local Insights & Hidden Attractions",
    headlineHe: "",
    subheadline:
      "Uncover local experiences, hidden attractions, insider tips, and authentic destinations worldwide",
    subheadlineHe: "",
    ctaText: "Discover",
    ctaTextHe: "",
    ctaLink: "/attractions",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "fallback-3",
    imageUrl: "/hero/travi-world-mascot-rainy-city-street-shopping.webp",
    imageAlt: "Travi mascot in city street",
    headline: "Explore Hotels & Accommodations | Reviews, Prices & Information",
    headlineHe: "",
    subheadline:
      "Detailed hotel information, reviews, price comparisons, and booking tips for every destination",
    subheadlineHe: "",
    ctaText: "Browse Hotels",
    ctaTextHe: "",
    ctaLink: "/hotels",
    sortOrder: 3,
    isActive: true,
  },
];

// Default fallback image for destinations without a specific card image
export const DEFAULT_DESTINATION_CARD_IMAGE = "/cards/default-destination.webp";
export const DEFAULT_EXPERIENCE_IMAGE = "/experiences/default.webp";

// ============================================================================
// NORMALIZER FUNCTION
// ============================================================================

interface HomepageDbResult {
  quickCategories: unknown[];
  experienceCategories: unknown[];
  regionLinks: unknown[];
  featuredDestinations: Array<{
    id: number | string;
    cardImage: string | null;
    slug?: string;
    [key: string]: unknown;
  }>;
  hero: { slides: unknown[] };
  [key: string]: unknown;
}

interface FallbackMetrics {
  quickCategoriesReplaced: boolean;
  experienceCategoriesReplaced: boolean;
  regionLinksReplaced: boolean;
  destinationsReplaced: boolean;
  heroSlidesReplaced: boolean;
  destinationsPatched: number;
}

/** Log which fallback sections were applied */
function logFallbackMetrics(metrics: FallbackMetrics): void {
  const hasAny = Object.values(metrics).some(v => v === true || (typeof v === "number" && v > 0));
  if (!hasAny) return;

  const sectionMap: Record<string, boolean> = {
    quickCategories: metrics.quickCategoriesReplaced,
    experienceCategories: metrics.experienceCategoriesReplaced,
    regionLinks: metrics.regionLinksReplaced,
    featuredDestinations: metrics.destinationsReplaced,
    "hero.slides": metrics.heroSlidesReplaced,
  };
  const appliedSections = Object.entries(sectionMap)
    .filter(([, v]) => v)
    .map(([k]) => k);

  log.info("[Homepage Fallbacks] Applied server-side fallbacks", {
    sectionsReplaced: appliedSections,
    destinationsPatched: metrics.destinationsPatched,
  });
}

/**
 * Ensures the homepage config is render-safe by applying fallbacks.
 *
 * Rules:
 * - If array is empty → replace with fallback array
 * - If destination.cardImage is null → set to /cards/${id}.webp
 * - Never returns empty arrays or null images
 *
 * @param dbResult - Raw database query result
 * @returns Render-safe homepage config with fallbacks applied
 */
export function makeRenderSafeHomepageConfig<T extends HomepageDbResult>(dbResult: T): T {
  const metrics: FallbackMetrics = {
    quickCategoriesReplaced: false,
    experienceCategoriesReplaced: false,
    regionLinksReplaced: false,
    destinationsReplaced: false,
    heroSlidesReplaced: false,
    destinationsPatched: 0,
  };

  // Clone to avoid mutation
  const result = { ...dbResult };

  // Apply fallbacks for empty arrays
  if (!result.quickCategories || result.quickCategories.length === 0) {
    result.quickCategories = FALLBACK_QUICK_CATEGORIES;
    metrics.quickCategoriesReplaced = true;
  }

  if (!result.experienceCategories || result.experienceCategories.length === 0) {
    result.experienceCategories = FALLBACK_EXPERIENCE_CATEGORIES;
    metrics.experienceCategoriesReplaced = true;
  }

  if (!result.regionLinks || result.regionLinks.length === 0) {
    result.regionLinks = FALLBACK_REGION_LINKS;
    metrics.regionLinksReplaced = true;
  }

  if (!result.featuredDestinations || result.featuredDestinations.length === 0) {
    result.featuredDestinations = FALLBACK_DESTINATIONS as any;
    metrics.destinationsReplaced = true;
  } else {
    // Patch null cardImages for existing destinations
    result.featuredDestinations = result.featuredDestinations.map(dest => {
      if (!dest.cardImage) {
        metrics.destinationsPatched++;
        // Try to find matching fallback, or use deterministic path
        const fallback = FALLBACK_DESTINATIONS.find(f => f.id === dest.id);
        const cardImage = fallback?.cardImage || `/cards/${dest.id}.webp`;
        const cardImageAlt = fallback?.cardImageAlt || `${dest.id} cityscape`;
        return { ...dest, cardImage, cardImageAlt };
      }
      return dest;
    });
  }

  // Patch hero slides
  if (!result.hero?.slides || result.hero.slides.length === 0) {
    result.hero = { ...result.hero, slides: FALLBACK_HERO_SLIDES };
    metrics.heroSlidesReplaced = true;
  }

  // Log fallback usage (once per request, only when fallbacks applied)
  logFallbackMetrics(metrics);

  return result as T;
}
