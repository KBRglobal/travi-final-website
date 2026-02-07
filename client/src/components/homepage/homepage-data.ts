/**
 * Homepage shared constants, data, and types.
 * Extracted from homepage.tsx to allow reuse across extracted components.
 */

import {
  Hotel,
  Landmark,
  UtensilsCrossed,
  Ticket,
  Rss,
  Map,
  Sparkles,
  Tent,
  Baby,
  Wallet,
  Heart,
  Backpack,
  Bed,
  Camera,
  Newspaper,
  BookOpen,
} from "lucide-react";

// ============================================
// SEO CONSTANTS
// ============================================
export const SITE_URL = "https://travi.world";
export const SITE_NAME = "TRAVI World";
export const CURRENT_YEAR = new Date().getFullYear();

// ============================================
// ANIMATION STYLES
// ============================================
export const heroAnimationStyles = `
  @keyframes blob-pulse-1 {
    0%, 100% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.1); opacity: 0.4; }
  }

  @keyframes blob-pulse-2 {
    0%, 100% { transform: scale(1); opacity: 0.25; }
    50% { transform: scale(1.15); opacity: 0.35; }
  }

  @keyframes float-badge {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  @keyframes loading-pulse {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.1) rotate(5deg); }
  }

  @keyframes fade-in-up {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes bounce-in {
    0% { opacity: 0; transform: scale(0.8) translateY(50px); }
    50% { transform: scale(1.05) translateY(-5px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }

  .blob-animate-1 {
    animation: blob-pulse-1 8s ease-in-out infinite;
  }

  .blob-animate-2 {
    animation: blob-pulse-2 10s ease-in-out 1s infinite;
  }

  .float-badge {
    animation: float-badge 2s ease-in-out infinite;
  }

  .loading-pulse {
    animation: loading-pulse 2s ease-in-out infinite;
  }

  .animate-fade-in-up {
    animation: fade-in-up 0.5s ease-out both;
  }

  .animate-bounce-in {
    animation: bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  .animated-gradient-text {
    background: linear-gradient(
      135deg,
      hsl(15 72% 55%) 0%,
      hsl(36 90% 55%) 30%,
      hsl(15 72% 45%) 70%,
      hsl(36 90% 55%) 100%
    );
    background-size: 300% 300%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-flow 6s ease infinite;
  }
`;

// ============================================
// HERO DESTINATIONS
// ============================================
export const HERO_DESTINATIONS = [
  {
    name: "Dubai",
    country: "United Arab Emirates",
    slug: "dubai",
    image: "/hero/dubai-hero.webp",
    tagline: "City of Dreams",
    alt: "TRAVI travel mascot character exploring Dubai's iconic Burj Khalifa tower and spectacular Downtown Dubai skyline in the United Arab Emirates",
    title: "Dubai Travel Guide - Attractions, Hotels & Things to Do",
  },
  {
    name: "Paris",
    country: "France",
    slug: "paris",
    image: "/hero/paris-hero.webp",
    tagline: "City of Light",
    alt: "TRAVI travel mascot character standing at the magnificent Eiffel Tower in Paris France with panoramic city views",
    title: "Paris Travel Guide - Museums, Landmarks & Cuisine",
  },
  {
    name: "Tokyo",
    country: "Japan",
    slug: "tokyo",
    image: "/hero/tokyo-hero.webp",
    tagline: "Tradition Meets Future",
    alt: "TRAVI travel mascot character amid Tokyo's vibrant neon-lit Shibuya streets and traditional temples",
    title: "Tokyo Travel Guide - Culture, Food & Technology",
  },
  {
    name: "New York",
    country: "United States",
    slug: "new-york",
    image: "/hero/new-york-hero.webp",
    tagline: "City That Never Sleeps",
    alt: "TRAVI travel mascot character in New York City with iconic Manhattan skyline and Statue of Liberty",
    title: "New York Travel Guide - Broadway, Museums & Landmarks",
  },
  {
    name: "Barcelona",
    country: "Spain",
    slug: "barcelona",
    image: "/hero/barcelona-hero.webp",
    tagline: "Art & Architecture",
    alt: "TRAVI travel mascot character exploring Barcelona's stunning Gaudi architecture and Mediterranean beaches",
    title: "Barcelona Travel Guide - Gaudi, Beaches & Tapas",
  },
  {
    name: "Singapore",
    country: "Singapore",
    slug: "singapore",
    image: "/hero/singapore-hero.webp",
    tagline: "Garden City",
    alt: "TRAVI travel mascot character at Singapore's futuristic Marina Bay Sands and Gardens by the Bay",
    title: "Singapore Travel Guide - Gardens, Food & Shopping",
  },
  {
    name: "London",
    country: "United Kingdom",
    slug: "london",
    image: "/hero/london-hero.webp",
    tagline: "Royal Heritage",
    alt: "TRAVI travel mascot character visiting London's historic Big Ben, Tower Bridge and Buckingham Palace",
    title: "London Travel Guide - Royal Palaces, Museums & Theater",
  },
  {
    name: "Bangkok",
    country: "Thailand",
    slug: "bangkok",
    image: "/hero/bangkok-hero.webp",
    tagline: "Land of Smiles",
    alt: "TRAVI travel mascot character exploring Bangkok's ornate Buddhist temples and vibrant street markets",
    title: "Bangkok Travel Guide - Temples, Markets & Street Food",
  },
];

export const ALL_DESTINATIONS_SEO = [
  { name: "Abu Dhabi", slug: "abu-dhabi", country: "UAE" },
  { name: "Amsterdam", slug: "amsterdam", country: "Netherlands" },
  { name: "Bangkok", slug: "bangkok", country: "Thailand" },
  { name: "Barcelona", slug: "barcelona", country: "Spain" },
  { name: "Dubai", slug: "dubai", country: "UAE" },
  { name: "Hong Kong", slug: "hong-kong", country: "China" },
  { name: "Istanbul", slug: "istanbul", country: "Turkey" },
  { name: "Las Vegas", slug: "las-vegas", country: "USA" },
  { name: "London", slug: "london", country: "UK" },
  { name: "Los Angeles", slug: "los-angeles", country: "USA" },
  { name: "Miami", slug: "miami", country: "USA" },
  { name: "New York", slug: "new-york", country: "USA" },
  { name: "Paris", slug: "paris", country: "France" },
  { name: "Rome", slug: "rome", country: "Italy" },
  { name: "Singapore", slug: "singapore", country: "Singapore" },
  { name: "Tokyo", slug: "tokyo", country: "Japan" },
];

// ============================================
// NAV ITEMS
// ============================================
export const NAV_ITEMS = [
  { label: "Destinations", href: "/destinations", title: "Browse All Travel Destinations" },
  { label: "Hotels", href: "/hotels", title: "Find Hotels & Accommodation" },
  { label: "Attractions", href: "/attractions", title: "Discover Tourist Attractions" },
  { label: "Guides", href: "/guides", title: "Travel Guides & Tips" },
  { label: "News", href: "/news", title: "Latest Travel News" },
];

// ============================================
// CATEGORY CARDS
// ============================================
export const CATEGORY_CARDS = [
  {
    id: 1,
    icon: Bed,
    title: "Hotels",
    subtitle: "Find your perfect stay",
    description:
      "Compare hotels, resorts, and accommodation options across 17 destinations worldwide",
    linkUrl: "/hotels",
    gradient: "from-travi-teal to-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-950/30",
    iconBg: "bg-travi-teal",
    hoverGlow: "hover:shadow-teal-500/25",
  },
  {
    id: 2,
    icon: Camera,
    title: "Attractions",
    subtitle: "Discover must-see places",
    description: "Explore 3,000+ tourist attractions with reviews, tickets, and visitor tips",
    linkUrl: "/attractions",
    gradient: "from-travi-amber to-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    iconBg: "bg-travi-amber",
    hoverGlow: "hover:shadow-amber-500/25",
  },
  {
    id: 3,
    icon: Newspaper,
    title: "Travel News",
    subtitle: "Latest travel updates",
    description: "Stay informed with daily travel news, tips, and destination updates",
    linkUrl: "/news",
    gradient: "from-travi-terracotta to-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    iconBg: "bg-travi-terracotta",
    hoverGlow: "hover:shadow-orange-500/25",
  },
  {
    id: 4,
    icon: BookOpen,
    title: "Travel Guides",
    subtitle: "Complete destination guides",
    description: "In-depth travel guides with local tips, itineraries, and recommendations",
    linkUrl: "/guides",
    gradient: "from-travi-olive to-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    iconBg: "bg-travi-olive",
    hoverGlow: "hover:shadow-emerald-500/25",
  },
];

// ============================================
// FAQ DATA
// ============================================
export const FAQ_ITEMS = [
  {
    q: "What is TRAVI World?",
    a: "TRAVI World is a comprehensive travel information platform covering 17 destinations worldwide with detailed guides for 3,000+ attractions, hotels, restaurants, and activities. Our multilingual platform is updated daily, with additional languages rolling out.",
  },
  {
    q: "How many destinations does TRAVI cover?",
    a: "TRAVI World covers 17 major travel destinations including Dubai, Paris, Tokyo, New York, Barcelona, Singapore, London, Bangkok, Abu Dhabi, Amsterdam, Hong Kong, Istanbul, Las Vegas, Los Angeles, Miami, and Rome.",
  },
  {
    q: "Is TRAVI World content available in multiple languages?",
    a: "Yes, TRAVI World is a multilingual platform with additional languages rolling out. We're expanding support to include Arabic, Hebrew, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Thai, Turkish, Dutch, Polish, and Vietnamese.",
  },
  {
    q: "What type of travel information does TRAVI provide?",
    a: "TRAVI provides comprehensive information about hotels and accommodation, tourist attractions and landmarks, restaurants and dining options, activities and tours, travel news and updates, and complete destination guides with tickets, opening hours, and visitor tips.",
  },
  {
    q: "Is TRAVI World free to use?",
    a: "Yes, TRAVI World is completely free to use. Browse thousands of travel guides, attraction reviews, hotel recommendations, and restaurant suggestions at no cost.",
  },
  {
    q: "How often is TRAVI World content updated?",
    a: "TRAVI World content is updated daily with the latest travel news, new attraction reviews, and updated information about hotels and restaurants across all 17 destinations.",
  },
];

// ============================================
// EXPERIENCE CATEGORIES (FALLBACK)
// ============================================
export const FALLBACK_EXPERIENCE_CATEGORIES = [
  {
    id: 1,
    name: "Luxury Travel",
    description: "Premium travel experiences and exclusive destinations",
    slug: "luxury",
    image: "/experiences/experiences-luxury-resort-infinity-pool.webp",
    imageAlt: "Luxury resort with infinity pool overlooking ocean",
    icon: "Sparkles",
    href: "/travel-styles/luxury-travel-complete-guide",
  },
  {
    id: 2,
    name: "Adventure & Outdoors",
    description: "Thrilling outdoor experiences and adventures",
    slug: "adventure",
    image: "/experiences/experiences-adventure-hiker-mountain-trail-snowy-peaks.webp",
    imageAlt: "Hiker on mountain trail with snowy peaks",
    icon: "Tent",
    href: "/travel-styles/adventure-outdoors-complete-guide",
  },
  {
    id: 3,
    name: "Family Travel",
    description: "Family-friendly destinations and activities",
    slug: "family",
    image: "/experiences/picnic-modern-architecture-outdoor-activity.webp",
    imageAlt: "Family enjoying outdoor picnic activity",
    icon: "Baby",
    href: "/travel-styles/family-travel-complete-guide",
  },
  {
    id: 4,
    name: "Budget Travel",
    description: "Affordable travel options and destinations",
    slug: "budget",
    image: "/experiences/solo-travel-backpack-map-camera-desert-architecture.webp",
    imageAlt: "Budget travel backpack with map and camera",
    icon: "Wallet",
    href: "/travel-styles/budget-travel-complete-guide",
  },
  {
    id: 5,
    name: "Honeymoon & Romance",
    description: "Romantic getaways and honeymoon destinations",
    slug: "romance",
    image: "/experiences/romantic-couple-beach-sunset-modern-architecture.webp",
    imageAlt: "Romantic couple watching sunset on beach",
    icon: "Heart",
    href: "/travel-styles/honeymoon-romance-complete-guide",
  },
  {
    id: 6,
    name: "Solo Travel",
    description: "Perfect destinations for solo travelers",
    slug: "solo",
    image: "/experiences/solo-traveler-canoe-mountain-lake-archway-reflection.webp",
    imageAlt: "Solo traveler in canoe on peaceful mountain lake",
    icon: "Backpack",
    href: "/travel-styles/solo-travel-complete-guide",
  },
];

// ============================================
// FALLBACK DESTINATIONS
// ============================================
export const FALLBACK_DESTINATIONS = [
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    slug: "/destinations/dubai",
    cardImage: "/cards/dubai.webp",
    cardImageAlt: "Dubai skyline with Burj Khalifa tower at sunset",
  },
  {
    id: "london",
    name: "London",
    country: "United Kingdom",
    slug: "/destinations/london",
    cardImage: "/cards/london.webp",
    cardImageAlt: "London Big Ben and Houses of Parliament",
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    slug: "/destinations/paris",
    cardImage: "/cards/paris.webp",
    cardImageAlt: "Paris Eiffel Tower illuminated at sunset",
  },
  {
    id: "new-york",
    name: "New York",
    country: "USA",
    slug: "/destinations/new-york",
    cardImage: "/cards/new-york.webp",
    cardImageAlt: "New York Manhattan skyline with Empire State Building",
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    slug: "/destinations/tokyo",
    cardImage: "/cards/tokyo.webp",
    cardImageAlt: "Tokyo Shibuya crossing neon lights at night",
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    slug: "/destinations/singapore",
    cardImage: "/cards/singapore.webp",
    cardImageAlt: "Singapore Marina Bay Sands and Gardens by the Bay",
  },
  {
    id: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    slug: "/destinations/bangkok",
    cardImage: "/cards/bangkok.webp",
    cardImageAlt: "Bangkok Grand Palace temple at sunrise",
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    slug: "/destinations/istanbul",
    cardImage: "/cards/istanbul.webp",
    cardImageAlt: "Istanbul Blue Mosque and Hagia Sophia",
  },
];

// ============================================
// REGION LINKS (FALLBACK)
// ============================================
export const FALLBACK_REGION_LINKS = [
  {
    id: 1,
    name: "Europe",
    destinations: [
      { name: "London", slug: "/destinations/london" },
      { name: "Paris", slug: "/destinations/paris" },
      { name: "Barcelona", slug: "/destinations/barcelona" },
      { name: "Rome", slug: "/destinations/rome" },
      { name: "Amsterdam", slug: "/destinations/amsterdam" },
    ],
  },
  {
    id: 2,
    name: "Asia",
    destinations: [
      { name: "Tokyo", slug: "/destinations/tokyo" },
      { name: "Singapore", slug: "/destinations/singapore" },
      { name: "Bangkok", slug: "/destinations/bangkok" },
      { name: "Hong Kong", slug: "/destinations/hong-kong" },
    ],
  },
  {
    id: 3,
    name: "Middle East",
    destinations: [
      { name: "Dubai", slug: "/destinations/dubai" },
      { name: "Abu Dhabi", slug: "/destinations/abu-dhabi" },
      { name: "Istanbul", slug: "/destinations/istanbul" },
    ],
  },
];

// ============================================
// ICON MAP
// ============================================
export const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Hotel,
  Landmark,
  UtensilsCrossed,
  Ticket,
  Rss,
  Map,
  Sparkles,
  Tent,
  Baby,
  Wallet,
  Heart,
  Backpack,
};

export function getIconComponent(iconName: string | null) {
  if (!iconName) return Map;
  return ICON_MAP[iconName] || Map;
}

// ============================================
// INTERFACES
// ============================================
export interface HomepageSectionConfig {
  title?: string;
  subtitle?: string;
  enabled?: boolean;
}

export interface QuickCategory {
  id: number | string;
  name: string;
  icon: string;
  href: string;
}

export interface ExperienceCategory {
  id: number | string;
  name: string;
  description: string;
  slug: string;
  image?: string;
  imageAlt?: string;
  icon?: string;
  href: string;
}

export interface RegionLink {
  id: number | string;
  name: string;
  destinations: Array<{ name: string; slug: string }>;
}

export interface CTAConfig {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  inputPlaceholder?: string;
  buttonText?: string;
  backgroundImage?: string;
}

export interface SEOMetaConfig {
  metaTitle?: string;
  metaDescription?: string;
}

export interface FeaturedDestination {
  id: string;
  name: string;
  country: string;
  slug?: string;
  cardImage?: string;
  cardImageAlt?: string;
}

export interface FeaturedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  image?: string;
}

export interface HomepageConfig {
  sections: Record<string, HomepageSectionConfig>;
  quickCategories: QuickCategory[];
  experienceCategories: ExperienceCategory[];
  regionLinks: RegionLink[];
  cta: CTAConfig | null;
  seoMeta: SEOMetaConfig | null;
  featuredDestinations: FeaturedDestination[];
  featuredArticles: FeaturedArticle[];
}
