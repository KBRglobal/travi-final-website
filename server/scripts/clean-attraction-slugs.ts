/**
 * Clean Attraction Slugs Script
 * Generates SEO-friendly slugs for all Tiqets attractions
 *
 * Run with: npx tsx server/scripts/clean-attraction-slugs.ts
 */

import { db } from "../db";
import { tiqetsAttractions } from "@shared/schema";
import { isNull, or, eq, sql } from "drizzle-orm";

// Words to remove from slugs (marketing fluff, tickets, etc.)
const WORDS_TO_REMOVE = [
  "skip-the-line",
  "skip-line",
  "fast-track",
  "priority-access",
  "priority-entry",
  "vip-access",
  "vip-entry",
  "admission",
  "ticket",
  "tickets",
  "entry",
  "access",
  "tour",
  "guided-tour",
  "self-guided",
  "audio-guide",
  "audioguide",
  "combo",
  "bundle",
  "package",
  "experience",
  "official",
  "exclusive",
  "premium",
  "deluxe",
  "standard",
  "basic",
  "with-",
  "-with",
  "and-",
  "-and",
  "including",
  "includes",
  "plus",
  "optional",
  "upgrade",
  "pass",
  "city-pass",
  "museum-pass",
  "attraction-pass",
];

// Random ID pattern at the end of slugs (like mk2xcpet, abc123xy)
const RANDOM_ID_PATTERN = /-[a-z0-9]{6,10}$/i;

function cleanSlug(originalSlug: string, title: string, cityName: string): string {
  // Start with the original slug
  let slug = originalSlug.toLowerCase();

  // Remove random ID at the end
  slug = slug.replace(RANDOM_ID_PATTERN, "");

  // Remove the city name from slug (it's already in the URL path)
  // Handle both hyphenated (new-york) and space versions
  const citySlug = cityName.toLowerCase().replace(/\s+/g, "-");

  // Remove city name from end of slug (most common case)
  slug = slug.replace(new RegExp(`-${citySlug}$`, "gi"), "");
  // Remove city name from beginning of slug
  slug = slug.replace(new RegExp(`^${citySlug}-`, "gi"), "");
  // Remove city name from middle of slug
  slug = slug.replace(new RegExp(`-${citySlug}-`, "gi"), "-");

  // Remove marketing words (only complete words between dashes)
  for (const word of WORDS_TO_REMOVE) {
    // Match word at start, end, or between dashes (whole word only)
    slug = slug.replace(new RegExp(`^${word}-`, "gi"), ""); // start of slug
    slug = slug.replace(new RegExp(`-${word}$`, "gi"), ""); // end of slug
    slug = slug.replace(new RegExp(`-${word}-`, "gi"), "-"); // middle of slug
  }

  // Clean up multiple dashes
  slug = slug.replace(/-+/g, "-");

  // Remove leading/trailing dashes
  slug = slug.replace(/^-|-$/g, "");

  // If slug is too long (>40 chars), try to shorten it
  if (slug.length > 40) {
    // Try to extract the main attraction name from the title
    const titleSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Remove city from title too
    const cleanTitle = titleSlug.replace(new RegExp(`-?${citySlug}-?`, "gi"), "-");

    // Take first 3-4 meaningful words
    const words = cleanTitle.split("-").filter(w => w.length > 2 && !WORDS_TO_REMOVE.includes(w));
    if (words.length > 0) {
      slug = words.slice(0, 4).join("-");
    }
  }

  // Final cleanup
  slug = slug.replace(/-+/g, "-").replace(/^-|-$/g, "");

  return slug;
}

async function main() {
  console.log("🧹 Starting attraction slug cleanup...\n");

  // Get all attractions
  const attractions = await db
    .select({
      id: tiqetsAttractions.id,
      slug: tiqetsAttractions.slug,
      seoSlug: tiqetsAttractions.seoSlug,
      title: tiqetsAttractions.title,
      cityName: tiqetsAttractions.cityName,
    })
    .from(tiqetsAttractions);

  console.log(`Found ${attractions.length} attractions\n`);

  let updated = 0;
  let skipped = 0;
  const changes: Array<{ title: string; old: string; new: string }> = [];

  for (const attraction of attractions) {
    const currentSlug = attraction.seoSlug || attraction.slug;
    // Clean from original slug if no seoSlug, otherwise clean from current seoSlug
    const newSlug = cleanSlug(currentSlug, attraction.title, attraction.cityName);

    // Check if current seoSlug still contains city name (needs fixing)
    const citySlug = attraction.cityName.toLowerCase().replace(/\s+/g, "-");
    const containsCityName =
      currentSlug.endsWith(`-${citySlug}`) ||
      currentSlug.startsWith(`${citySlug}-`) ||
      currentSlug.includes(`-${citySlug}-`);

    // Skip if slug is already clean (no random ID and no city name)
    if (attraction.seoSlug && !RANDOM_ID_PATTERN.test(attraction.seoSlug) && !containsCityName) {
      skipped++;
      continue;
    }

    // Skip if no change needed
    if (currentSlug === newSlug) {
      skipped++;
      continue;
    }

    // Update the attraction
    await db
      .update(tiqetsAttractions)
      .set({ seoSlug: newSlug })
      .where(eq(tiqetsAttractions.id, attraction.id));

    changes.push({
      title: attraction.title.slice(0, 50),
      old: currentSlug,
      new: newSlug,
    });

    updated++;
  }

  // Print summary
  console.log("━".repeat(80));
  console.log(`\n✅ Cleanup complete!\n`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total:   ${attractions.length}\n`);

  // Show sample changes
  if (changes.length > 0) {
    console.log("Sample changes:\n");
    for (const change of changes.slice(0, 10)) {
      console.log(`  📝 ${change.title}...`);
      console.log(`     Old: ${change.old}`);
      console.log(`     New: ${change.new}\n`);
    }

    if (changes.length > 10) {
      console.log(`  ... and ${changes.length - 10} more changes\n`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  });
