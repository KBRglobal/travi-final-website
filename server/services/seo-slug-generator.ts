import { db } from "../db";
import { tiqetsAttractions } from "@shared/schema";
import { eq, isNull, sql } from "drizzle-orm";

/**
 * Generate clean SEO-friendly slug from attraction title and city
 *
 * Input: "Museum of Illusions Dubai Entry Ticket", "Dubai"
 * Output: "museum-of-illusions-dubai"
 *
 * Rules:
 * 1. Take the main attraction name (remove "entry ticket", "tour", etc. suffixes)
 * 2. Add city name if not already in title
 * 3. Lowercase, remove special chars, replace spaces with hyphens
 * 4. Keep it short (max 60 chars for SEO)
 */
export function generateSeoSlug(title: string, cityName: string): string {
  // Words to remove from title (noise words for tickets/tours)
  const noiseWords = [
    "entry ticket",
    "entry tickets",
    "admission ticket",
    "admission tickets",
    "skip the line",
    "skip-the-line",
    "fast track",
    "fast-track",
    "guided tour",
    "walking tour",
    "bus tour",
    "boat tour",
    "hop on hop off",
    "hop-on hop-off",
    "hop-on-hop-off",
    "tickets",
    "ticket",
    "admission",
    "entrance",
    "with transfer",
    "with transfers",
    "with transport",
    "from",
    "to",
    "and",
    "the",
    "a",
    "an",
    "private",
    "shared",
    "group",
    "vip",
    "full day",
    "half day",
    "full-day",
    "half-day",
    "day trip",
    "day tour",
  ];

  let slug = title.toLowerCase().trim();

  // Remove noise words
  for (const word of noiseWords) {
    slug = slug.replace(new RegExp(`\\b${word}\\b`, "gi"), " ");
  }

  // Remove city name if it appears more than once or at the end
  const cityLower = cityName.toLowerCase();
  const cityCount = (slug.match(new RegExp(`\\b${cityLower}\\b`, "g")) || []).length;
  if (cityCount > 1) {
    // Remove all but first occurrence
    let found = false;
    slug = slug.replace(new RegExp(`\\b${cityLower}\\b`, "g"), match => {
      if (!found) {
        found = true;
        return match;
      }
      return "";
    });
  }

  // Clean up: remove special characters, multiple spaces
  slug = slug
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, " ") // Multiple spaces to single
    .trim()
    .replace(/\s/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Multiple hyphens to single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

  // City name as slug (with hyphens instead of spaces)
  const citySlug = cityName.toLowerCase().replace(/\s+/g, "-");

  // Add city if not present
  if (!slug.includes(citySlug)) {
    slug = `${slug}-${citySlug}`;
  }

  // Truncate to reasonable length (60 chars max for SEO)
  if (slug.length > 60) {
    slug = slug.substring(0, 60).replace(/-$/, "");
  }

  return slug;
}

/**
 * Check if slug already exists and add suffix if needed
 */
async function getUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let suffix = 0;

  while (true) {
    const candidateSlug = suffix === 0 ? slug : `${slug}-${suffix}`;

    const existing = await db
      .select({ id: tiqetsAttractions.id })
      .from(tiqetsAttractions)
      .where(eq(tiqetsAttractions.seoSlug, candidateSlug))
      .limit(1);

    if (existing.length === 0 || (excludeId && existing[0].id === excludeId)) {
      return candidateSlug;
    }

    suffix++;
    if (suffix > 100) {
      // Failsafe: use random suffix
      return `${slug}-${Date.now().toString(36)}`;
    }
  }
}

/**
 * Generate and save SEO slug for a single attraction
 */
export async function generateAndSaveSeoSlug(attractionId: string): Promise<string> {
  const attraction = await db
    .select({
      id: tiqetsAttractions.id,
      title: tiqetsAttractions.title,
      cityName: tiqetsAttractions.cityName,
      seoSlug: tiqetsAttractions.seoSlug,
    })
    .from(tiqetsAttractions)
    .where(eq(tiqetsAttractions.id, attractionId))
    .limit(1);

  if (!attraction.length) {
    throw new Error(`Attraction ${attractionId} not found`);
  }

  const { title, cityName } = attraction[0];
  const baseSlug = generateSeoSlug(title, cityName);
  const uniqueSlug = await getUniqueSlug(baseSlug, attractionId);

  await db
    .update(tiqetsAttractions)
    .set({ seoSlug: uniqueSlug, updatedAt: new Date() } as any)
    .where(eq(tiqetsAttractions.id, attractionId));

  return uniqueSlug;
}

/**
 * Backfill all attractions without SEO slugs
 */
export async function backfillSeoSlugs(options?: {
  batchSize?: number;
  onProgress?: (completed: number, total: number) => void;
}): Promise<{ updated: number; errors: number }> {
  const batchSize = options?.batchSize || 100;
  let updated = 0;
  let errors = 0;

  // Get count of attractions without SEO slug
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(tiqetsAttractions)
    .where(isNull(tiqetsAttractions.seoSlug));

  const total = Number(countResult[0]?.count || 0);

  if (total === 0) {
    return { updated: 0, errors: 0 };
  }

  // Process in batches
  while (true) {
    const batch = await db
      .select({
        id: tiqetsAttractions.id,
        title: tiqetsAttractions.title,
        cityName: tiqetsAttractions.cityName,
      })
      .from(tiqetsAttractions)
      .where(isNull(tiqetsAttractions.seoSlug))
      .limit(batchSize);

    if (batch.length === 0) break;

    for (const attraction of batch) {
      try {
        const baseSlug = generateSeoSlug(attraction.title, attraction.cityName);
        const uniqueSlug = await getUniqueSlug(baseSlug, attraction.id);

        await db
          .update(tiqetsAttractions)
          .set({ seoSlug: uniqueSlug } as any)
          .where(eq(tiqetsAttractions.id, attraction.id));

        updated++;
      } catch (error) {
        errors++;
      }
    }

    if (options?.onProgress) {
      options.onProgress(updated + errors, total);
    }
  }

  return { updated, errors };
}

/**
 * Get sample of generated slugs for preview
 */
export async function previewSeoSlugs(limit: number = 10): Promise<
  Array<{
    id: string;
    title: string;
    cityName: string;
    currentSlug: string;
    proposedSeoSlug: string;
  }>
> {
  const attractions = await db
    .select({
      id: tiqetsAttractions.id,
      title: tiqetsAttractions.title,
      cityName: tiqetsAttractions.cityName,
      slug: tiqetsAttractions.slug,
      seoSlug: tiqetsAttractions.seoSlug,
    })
    .from(tiqetsAttractions)
    .where(isNull(tiqetsAttractions.seoSlug))
    .limit(limit);

  return attractions.map(a => ({
    id: a.id,
    title: a.title,
    cityName: a.cityName,
    currentSlug: a.slug,
    proposedSeoSlug: generateSeoSlug(a.title, a.cityName),
  }));
}
