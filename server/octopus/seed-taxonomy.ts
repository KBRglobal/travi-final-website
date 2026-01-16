/**
 * Octopus v2 Phase 5.1 - Tag Taxonomy Seed Data
 * 
 * This file contains the canonical taxonomy definitions for Octopus.
 * IDs are STABLE FOREVER - changing an ID is forbidden.
 * 
 * Run via: npx tsx server/octopus/seed-taxonomy.ts
 */

import { db } from "../db";
import { tagDefinitions } from "@shared/schema";
import { sql } from "drizzle-orm";

// Tag taxonomy seed data - 49 tags across 6 categories
const taxonomySeeds = [
  // Destination tags (7)
  { id: "abu-dhabi", category: "destination" as const, label: "Abu Dhabi", sortOrder: 1 },
  { id: "dubai", category: "destination" as const, label: "Dubai", sortOrder: 2 },
  { id: "sharjah", category: "destination" as const, label: "Sharjah", sortOrder: 3 },
  { id: "ajman", category: "destination" as const, label: "Ajman", sortOrder: 4 },
  { id: "ras-al-khaimah", category: "destination" as const, label: "Ras Al Khaimah", sortOrder: 5 },
  { id: "fujairah", category: "destination" as const, label: "Fujairah", sortOrder: 6 },
  { id: "umm-al-quwain", category: "destination" as const, label: "Umm Al Quwain", sortOrder: 7 },

  // District tags - Abu Dhabi focused (8)
  { id: "saadiyat-island", category: "district" as const, label: "Saadiyat Island", destinationId: "abu-dhabi", sortOrder: 1 },
  { id: "yas-island", category: "district" as const, label: "Yas Island", destinationId: "abu-dhabi", sortOrder: 2 },
  { id: "downtown-abu-dhabi", category: "district" as const, label: "Downtown Abu Dhabi", destinationId: "abu-dhabi", sortOrder: 3 },
  { id: "corniche", category: "district" as const, label: "Corniche", destinationId: "abu-dhabi", sortOrder: 4 },
  { id: "al-maryah-island", category: "district" as const, label: "Al Maryah Island", destinationId: "abu-dhabi", sortOrder: 5 },
  { id: "al-reem-island", category: "district" as const, label: "Al Reem Island", destinationId: "abu-dhabi", sortOrder: 6 },
  { id: "al-bateen", category: "district" as const, label: "Al Bateen", destinationId: "abu-dhabi", sortOrder: 7 },
  { id: "al-ain", category: "district" as const, label: "Al Ain", destinationId: "abu-dhabi", sortOrder: 8 },

  // Hotel type tags (8)
  { id: "luxury", category: "hotel_type" as const, label: "Luxury", sortOrder: 1 },
  { id: "boutique", category: "hotel_type" as const, label: "Boutique", sortOrder: 2 },
  { id: "resort", category: "hotel_type" as const, label: "Resort", sortOrder: 3 },
  { id: "business", category: "hotel_type" as const, label: "Business", sortOrder: 4 },
  { id: "family", category: "hotel_type" as const, label: "Family", sortOrder: 5 },
  { id: "budget", category: "hotel_type" as const, label: "Budget", sortOrder: 6 },
  { id: "adults-only", category: "hotel_type" as const, label: "Adults Only", sortOrder: 7 },
  { id: "all-inclusive", category: "hotel_type" as const, label: "All Inclusive", sortOrder: 8 },

  // Audience tags (8)
  { id: "couples", category: "audience" as const, label: "Couples", sortOrder: 1 },
  { id: "families", category: "audience" as const, label: "Families", sortOrder: 2 },
  { id: "solo", category: "audience" as const, label: "Solo Travelers", sortOrder: 3 },
  { id: "business-travelers", category: "audience" as const, label: "Business Travelers", sortOrder: 4 },
  { id: "luxury-travelers", category: "audience" as const, label: "Luxury Travelers", sortOrder: 5 },
  { id: "backpackers", category: "audience" as const, label: "Backpackers", sortOrder: 6 },
  { id: "honeymooners", category: "audience" as const, label: "Honeymooners", sortOrder: 7 },
  { id: "groups", category: "audience" as const, label: "Groups", sortOrder: 8 },

  // Experience tags (12)
  { id: "beach", category: "experience" as const, label: "Beach", sortOrder: 1 },
  { id: "culture", category: "experience" as const, label: "Culture", sortOrder: 2 },
  { id: "nightlife", category: "experience" as const, label: "Nightlife", sortOrder: 3 },
  { id: "wellness", category: "experience" as const, label: "Wellness & Spa", sortOrder: 4 },
  { id: "desert", category: "experience" as const, label: "Desert", sortOrder: 5 },
  { id: "shopping", category: "experience" as const, label: "Shopping", sortOrder: 6 },
  { id: "nature", category: "experience" as const, label: "Nature", sortOrder: 7 },
  { id: "adventure", category: "experience" as const, label: "Adventure", sortOrder: 8 },
  { id: "dining", category: "experience" as const, label: "Fine Dining", sortOrder: 9 },
  { id: "family-fun", category: "experience" as const, label: "Family Fun", sortOrder: 10 },
  { id: "water-sports", category: "experience" as const, label: "Water Sports", sortOrder: 11 },
  { id: "golf", category: "experience" as const, label: "Golf", sortOrder: 12 },

  // Commercial tags - placement power (6)
  { id: "featured", category: "commercial" as const, label: "Featured", description: "Eligible for prominent homepage placement", sortOrder: 1 },
  { id: "flagship", category: "commercial" as const, label: "Flagship", description: "Top-tier property for the destination", sortOrder: 2 },
  { id: "high-conversion", category: "commercial" as const, label: "High Conversion", description: "Strong booking performance", sortOrder: 3 },
  { id: "editor-pick", category: "commercial" as const, label: "Editor Pick", description: "Curated by editorial team", sortOrder: 4 },
  { id: "seasonal-push", category: "commercial" as const, label: "Seasonal Push", description: "Time-limited promotional placement", sortOrder: 5 },
  { id: "new-listing", category: "commercial" as const, label: "New Listing", description: "Recently added to catalog", sortOrder: 6 },
];

export async function seedTaxonomy(): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const tag of taxonomySeeds) {
    try {
      await db.insert(tagDefinitions).values(tag).onConflictDoNothing();
      inserted++;
    } catch (error) {
      skipped++;
    }
  }

  return { inserted, skipped };
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTaxonomy()
    .then((result) => {
      console.log(`[Taxonomy Seed] Complete: ${result.inserted} inserted, ${result.skipped} skipped`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("[Taxonomy Seed] Failed:", error);
      process.exit(1);
    });
}
