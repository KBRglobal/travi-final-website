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
import { 
  homepageCards, 
  experienceCategories, 
  regionLinks, 
  heroSlides 
} from "@shared/schema";
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
  { icon: "Building2", title: "Hotels", titleHe: "מלונות", subtitle: "Find your perfect stay", subtitleHe: "מצאו את המקום המושלם לשהות", linkUrl: "/hotels", sortOrder: 1, isActive: true },
  { icon: "Compass", title: "Attractions", titleHe: "אטרקציות", subtitle: "Discover must-see places", subtitleHe: "גלו מקומות חובה", linkUrl: "/attractions", sortOrder: 2, isActive: true },
  { icon: "Utensils", title: "Restaurants", titleHe: "מסעדות", subtitle: "Explore dining options", subtitleHe: "חקרו אפשרויות אוכל", linkUrl: "/restaurants", sortOrder: 3, isActive: true },
  { icon: "Star", title: "Things to Do", titleHe: "דברים לעשות", subtitle: "Activities and experiences", subtitleHe: "פעילויות וחוויות", linkUrl: "/things-to-do", sortOrder: 4, isActive: true },
  { icon: "Newspaper", title: "Travel News", titleHe: "חדשות נסיעות", subtitle: "Latest travel updates", subtitleHe: "עדכוני נסיעות אחרונים", linkUrl: "/news", sortOrder: 5, isActive: true },
  { icon: "BookOpen", title: "Travel Guides", titleHe: "מדריכי טיול", subtitle: "Complete destination guides", subtitleHe: "מדריכי יעד מלאים", linkUrl: "/travel-guides", sortOrder: 6, isActive: true },
];

// Using slug as unique identifier for experience_categories
const EXPERIENCE_CATEGORIES_SEED = [
  { name: "Luxury Travel", nameHe: "טיולי יוקרה", description: "Premium travel experiences and exclusive destinations", descriptionHe: "חוויות נסיעה פרימיום ויעדים בלעדיים", slug: "luxury", image: "/experiences/experiences-luxury-resort-infinity-pool.webp", imageAlt: "Luxury resort with infinity pool", icon: "Sparkles", href: "/experiences/luxury", sortOrder: 1, isActive: true },
  { name: "Adventure & Outdoors", nameHe: "הרפתקאות ושטח", description: "Thrilling outdoor experiences and adventures", descriptionHe: "חוויות שטח מרתקות", slug: "adventure", image: "/experiences/experiences-adventure-hiker-mountain-trail-snowy-peaks.webp", imageAlt: "Hiker on mountain trail", icon: "Tent", href: "/experiences/adventure", sortOrder: 2, isActive: true },
  { name: "Family Travel", nameHe: "טיולים משפחתיים", description: "Family-friendly destinations and activities", descriptionHe: "יעדים ופעילויות ידידותיות למשפחה", slug: "family", image: "/experiences/picnic-modern-architecture-outdoor-activity.webp", imageAlt: "Family enjoying picnic", icon: "Baby", href: "/experiences/family", sortOrder: 3, isActive: true },
  { name: "Budget Travel", nameHe: "טיולים חסכוניים", description: "Affordable travel options and destinations", descriptionHe: "אפשרויות נסיעה ויעדים במחירים נוחים", slug: "budget", image: "/experiences/solo-travel-backpack-map-camera-desert-architecture.webp", imageAlt: "Travel backpack with camera", icon: "Wallet", href: "/experiences/budget", sortOrder: 4, isActive: true },
  { name: "Honeymoon & Romance", nameHe: "ירח דבש ורומנטיקה", description: "Romantic getaways and honeymoon destinations", descriptionHe: "בריחות רומנטיות ויעדי ירח דבש", slug: "romance", image: "/experiences/romantic-couple-beach-sunset-modern-architecture.webp", imageAlt: "Couple at sunset on beach", icon: "Heart", href: "/experiences/romance", sortOrder: 5, isActive: true },
  { name: "Solo Travel", nameHe: "טיולים עצמאיים", description: "Perfect destinations for solo travelers", descriptionHe: "יעדים מושלמים למטיילים עצמאיים", slug: "solo", image: "/experiences/solo-traveler-canoe-mountain-lake-archway-reflection.webp", imageAlt: "Solo traveler in canoe", icon: "Backpack", href: "/experiences/solo", sortOrder: 6, isActive: true },
];

// Using regionName as unique identifier for region_links
const REGION_LINKS_SEED = [
  { regionName: "Europe", name: "Europe", nameHe: "אירופה", icon: "Globe", linkUrl: "/destinations/europe", links: [], destinations: [{ name: "London", slug: "/destinations/london" }, { name: "Paris", slug: "/destinations/paris" }, { name: "Barcelona", slug: "/destinations/barcelona" }, { name: "Rome", slug: "/destinations/rome" }, { name: "Amsterdam", slug: "/destinations/amsterdam" }], sortOrder: 1, isActive: true },
  { regionName: "Asia", name: "Asia", nameHe: "אסיה", icon: "Globe", linkUrl: "/destinations/asia", links: [], destinations: [{ name: "Tokyo", slug: "/destinations/tokyo" }, { name: "Singapore", slug: "/destinations/singapore" }, { name: "Bangkok", slug: "/destinations/bangkok" }, { name: "Bali", slug: "/destinations/bali" }, { name: "Hong Kong", slug: "/destinations/hong-kong" }], sortOrder: 2, isActive: true },
  { regionName: "Middle East", name: "Middle East", nameHe: "המזרח התיכון", icon: "Globe", linkUrl: "/destinations/middle-east", links: [], destinations: [{ name: "Dubai", slug: "/destinations/dubai" }, { name: "Abu Dhabi", slug: "/destinations/abu-dhabi" }, { name: "Istanbul", slug: "/destinations/istanbul" }, { name: "Doha", slug: "/destinations/doha" }], sortOrder: 3, isActive: true },
];

// Using stable IDs for hero_slides (varchar primary key)
const HERO_SLIDES_SEED = [
  { id: "seed-hero-slide-1", imageUrl: "/hero/travi-world-mascot-colorful-pool-arches.webp", imageAlt: "Travi mascot at luxury pool", headline: "Complete Travel Information Database | Hotels, Attractions & Guides", headlineHe: "מאגר מידע מלא לטיולים", subheadline: "Expert hotel information, detailed attractions, dining recommendations, and insider travel tips", subheadlineHe: "מידע מקצועי על מלונות, אטרקציות ומסעדות", ctaText: "Explore", ctaTextHe: "חקרו", ctaLink: "/destinations", sortOrder: 1, isActive: true },
  { id: "seed-hero-slide-2", imageUrl: "/hero/travi-world-mascot-canyon-viewpoint.webp", imageAlt: "Travi mascot in desert canyon", headline: "Discover Authentic Experiences | Local Insights & Hidden Attractions", headlineHe: "גלו חוויות אותנטיות", subheadline: "Uncover local experiences, hidden attractions, insider tips, and authentic destinations worldwide", subheadlineHe: "גלו חוויות מקומיות ואטרקציות נסתרות", ctaText: "Discover", ctaTextHe: "גלו", ctaLink: "/attractions", sortOrder: 2, isActive: true },
  { id: "seed-hero-slide-3", imageUrl: "/hero/travi-world-mascot-rainy-city-street-shopping.webp", imageAlt: "Travi mascot in city street", headline: "Explore Hotels & Accommodations | Reviews, Prices & Information", headlineHe: "חקרו מלונות ומקומות לינה", subheadline: "Detailed hotel information, reviews, price comparisons, and booking tips for every destination", subheadlineHe: "מידע מפורט על מלונות, ביקורות והשוואות מחירים", ctaText: "Browse Hotels", ctaTextHe: "עיון במלונות", ctaLink: "/hotels", sortOrder: 3, isActive: true },
];

interface SeedResult {
  table: string;
  existingCount: number;
  inserted: number;
  skipped: number;
  reason: string;
}

async function getTableCount(table: typeof homepageCards | typeof experienceCategories | typeof regionLinks | typeof heroSlides): Promise<number> {
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
      const existing = await db.select({ id: homepageCards.id })
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
      const existing = await db.select({ id: experienceCategories.id })
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
      const existing = await db.select({ id: regionLinks.id })
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
      const existing = await db.select({ id: heroSlides.id })
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
  console.log("[Homepage Seed] Starting homepage CMS data seeding...\n");
  
  seedHomepage()
    .then((results) => {
      console.log("=== HOMEPAGE SEED RESULTS ===\n");
      
      for (const result of results) {
        const status = result.inserted > 0 ? "SEEDED" : "SKIPPED";
        console.log(`[${status}] ${result.table}`);
        console.log(`  Existing: ${result.existingCount}`);
        console.log(`  Inserted: ${result.inserted}`);
        console.log(`  Skipped (already exist): ${result.skipped}`);
        console.log(`  Reason: ${result.reason}\n`);
      }
      
      const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
      const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
      
      console.log("=== SUMMARY ===");
      console.log(`Total records inserted: ${totalInserted}`);
      console.log(`Total records skipped (already exist): ${totalSkipped}`);
      console.log(`Idempotent: ${totalInserted === 0 ? 'Yes (no changes needed)' : 'Yes (new records added)'}`);
      
      process.exit(0);
    })
    .catch((error) => {
      console.error("[Homepage Seed] Failed:", error);
      process.exit(1);
    });
}
