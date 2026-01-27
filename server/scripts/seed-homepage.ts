/**
 * Homepage CMS Seed Script
 *
 * Idempotent script to seed homepage data into production/development DB.
 * Uses the SAME data as server-side fallbacks to ensure consistency.
 *
 * Run via: npx tsx server/scripts/seed-homepage.ts
 *
 * Rules:
 * - Safe to run multiple times (idempotent)
 * - Only inserts if tables are empty or below minimum threshold
 * - Uses existing fallback assets (no new images)
 * - Uses stable IDs for true idempotency (hero_slides)
 * - Uses unique field checks for other tables
 */

import { db } from "../db";
import { homepageCards, experienceCategories, regionLinks, heroSlides } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

// Minimum counts before seeding is triggered
const MINIMUM_THRESHOLDS = {
  quickCategories: 6,
  experienceCategories: 6,
  regionLinks: 3,
  heroSlides: 3,
};

// Seed data - matches server/lib/homepage-fallbacks.ts exactly
// Using linkUrl as unique identifier for homepage_cards
const QUICK_CATEGORIES_SEED = [
  {
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

// Using slug as unique identifier for experience_categories
const EXPERIENCE_CATEGORIES_SEED = [
  {
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

// Using regionName as unique identifier for region_links
const REGION_LINKS_SEED = [
  {
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
      { name: "Bali", slug: "/destinations/bali" },
      { name: "Hong Kong", slug: "/destinations/hong-kong" },
    ],
    sortOrder: 2,
    isActive: true,
  },
  {
    regionName: "Middle East",
    name: "Middle East",
    nameHe: "",
    icon: "Globe",
    linkUrl: "/destinations/middle-east",
    links: [],
    destinations: [
      { name: "Dubai", slug: "/destinations/dubai" },
      { name: "Abu Dhabi", slug: "/destinations/abu-dhabi" },
      { name: "Istanbul", slug: "/destinations/istanbul" },
      { name: "Doha", slug: "/destinations/doha" },
    ],
    sortOrder: 3,
    isActive: true,
  },
];

// Using stable IDs for hero_slides (varchar primary key)
const HERO_SLIDES_SEED = [
  {
    id: "seed-hero-slide-1",
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
    id: "seed-hero-slide-2",
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
    id: "seed-hero-slide-3",
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

interface SeedResult {
  table: string;
  existingCount: number;
  inserted: number;
  skipped: number;
  reason: string;
}

async function getTableCount(
  table: typeof homepageCards | typeof experienceCategories | typeof regionLinks | typeof heroSlides
): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)::int` }).from(table);
  return result[0]?.count || 0;
}

export async function seedHomepage(): Promise<SeedResult[]> {
  const results: SeedResult[] = [];

  // Seed Quick Categories (homepage_cards) - check by linkUrl
  const quickCategoriesCount = await getTableCount(homepageCards);
  if (quickCategoriesCount < MINIMUM_THRESHOLDS.quickCategories) {
    let insertedCount = 0;
    let skippedCount = 0;

    for (const card of QUICK_CATEGORIES_SEED) {
      // Check if already exists by linkUrl
      const existing = await db
        .select({ id: homepageCards.id })
        .from(homepageCards)
        .where(eq(homepageCards.linkUrl, card.linkUrl))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(homepageCards).values(card);
        insertedCount++;
      } else {
        skippedCount++;
      }
    }

    results.push({
      table: "homepage_cards (quickCategories)",
      existingCount: quickCategoriesCount,
      inserted: insertedCount,
      skipped: skippedCount,
      reason: `Below minimum threshold (${MINIMUM_THRESHOLDS.quickCategories})`,
    });
  } else {
    results.push({
      table: "homepage_cards (quickCategories)",
      existingCount: quickCategoriesCount,
      inserted: 0,
      skipped: QUICK_CATEGORIES_SEED.length,
      reason: `Already has ${quickCategoriesCount} records`,
    });
  }

  // Seed Experience Categories - check by slug
  const experienceCategoriesCount = await getTableCount(experienceCategories);
  if (experienceCategoriesCount < MINIMUM_THRESHOLDS.experienceCategories) {
    let insertedCount = 0;
    let skippedCount = 0;

    for (const exp of EXPERIENCE_CATEGORIES_SEED) {
      const existing = await db
        .select({ id: experienceCategories.id })
        .from(experienceCategories)
        .where(eq(experienceCategories.slug, exp.slug))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(experienceCategories).values(exp);
        insertedCount++;
      } else {
        skippedCount++;
      }
    }

    results.push({
      table: "experience_categories",
      existingCount: experienceCategoriesCount,
      inserted: insertedCount,
      skipped: skippedCount,
      reason: `Below minimum threshold (${MINIMUM_THRESHOLDS.experienceCategories})`,
    });
  } else {
    results.push({
      table: "experience_categories",
      existingCount: experienceCategoriesCount,
      inserted: 0,
      skipped: EXPERIENCE_CATEGORIES_SEED.length,
      reason: `Already has ${experienceCategoriesCount} records`,
    });
  }

  // Seed Region Links - check by regionName
  const regionLinksCount = await getTableCount(regionLinks);
  if (regionLinksCount < MINIMUM_THRESHOLDS.regionLinks) {
    let insertedCount = 0;
    let skippedCount = 0;

    for (const region of REGION_LINKS_SEED) {
      const existing = await db
        .select({ id: regionLinks.id })
        .from(regionLinks)
        .where(eq(regionLinks.regionName, region.regionName))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(regionLinks).values(region);
        insertedCount++;
      } else {
        skippedCount++;
      }
    }

    results.push({
      table: "region_links",
      existingCount: regionLinksCount,
      inserted: insertedCount,
      skipped: skippedCount,
      reason: `Below minimum threshold (${MINIMUM_THRESHOLDS.regionLinks})`,
    });
  } else {
    results.push({
      table: "region_links",
      existingCount: regionLinksCount,
      inserted: 0,
      skipped: REGION_LINKS_SEED.length,
      reason: `Already has ${regionLinksCount} records`,
    });
  }

  // Seed Hero Slides - check by stable ID (varchar primary key)
  const heroSlidesCount = await getTableCount(heroSlides);
  if (heroSlidesCount < MINIMUM_THRESHOLDS.heroSlides) {
    let insertedCount = 0;
    let skippedCount = 0;

    for (const slide of HERO_SLIDES_SEED) {
      const existing = await db
        .select({ id: heroSlides.id })
        .from(heroSlides)
        .where(eq(heroSlides.id, slide.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(heroSlides).values(slide);
        insertedCount++;
      } else {
        skippedCount++;
      }
    }

    results.push({
      table: "hero_slides",
      existingCount: heroSlidesCount,
      inserted: insertedCount,
      skipped: skippedCount,
      reason: `Below minimum threshold (${MINIMUM_THRESHOLDS.heroSlides})`,
    });
  } else {
    results.push({
      table: "hero_slides",
      existingCount: heroSlidesCount,
      inserted: 0,
      skipped: HERO_SLIDES_SEED.length,
      reason: `Already has ${heroSlidesCount} records`,
    });
  }

  return results;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  seedHomepage()
    .then(results => {
      for (const result of results) {
        const status = result.inserted > 0 ? "SEEDED" : "SKIPPED";
      }

      const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
      const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

      process.exit(0);
    })
    .catch(error => {
      process.exit(1);
    });
}
