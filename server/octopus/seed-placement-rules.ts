/**
 * Octopus v2 - Seed Default Placement Rules (Phase 5.3)
 * 
 * Creates default placement rules for all 5 surfaces.
 * Rules are data-driven and editable without code changes.
 * 
 * Run: npx tsx server/octopus/seed-placement-rules.ts
 */

import { db } from '../db';
import { placementRules, type PlacementRuleConditions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  surface: "destination_homepage" | "district_page" | "category_seo" | "featured" | "comparison";
  entityType: string;
  conditions: PlacementRuleConditions;
  priority: number;
}

const DEFAULT_RULES: RuleDefinition[] = [
  // ============================================================================
  // DESTINATION HOMEPAGE RULES
  // ============================================================================
  {
    id: "dest-home-featured-hotels",
    name: "Destination Homepage - Featured Hotels",
    description: "Top-rated luxury hotels for destination homepage",
    surface: "destination_homepage",
    entityType: "hotel",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 60,
      },
      thresholds: [
        { field: "starRating", operator: ">=", value: 4 }
      ],
      anyOfTags: ["luxury", "resort", "boutique-hotel"],
      maxItems: 6,
      diversity: {
        tagCategory: "hotel_type",
        maxPerTag: 3,
      },
      scopeToDestination: true,
    },
    priority: 10,
  },
  {
    id: "dest-home-top-attractions",
    name: "Destination Homepage - Top Attractions",
    description: "Must-see attractions for destination homepage",
    surface: "destination_homepage",
    entityType: "attraction",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 60,
      },
      anyOfTags: ["iconic-landmark", "must-visit", "cultural"],
      maxItems: 8,
      diversity: {
        tagCategory: "experience",
        minPerTag: 1,
        maxPerTag: 4,
      },
      scopeToDestination: true,
    },
    priority: 20,
  },
  {
    id: "dest-home-districts",
    name: "Destination Homepage - Featured Districts",
    description: "Key neighborhoods to explore",
    surface: "destination_homepage",
    entityType: "district",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 50,
      },
      maxItems: 4,
      scopeToDestination: true,
    },
    priority: 30,
  },

  // ============================================================================
  // DISTRICT PAGE RULES
  // ============================================================================
  {
    id: "district-page-hotels",
    name: "District Page - Hotels",
    description: "Hotels within district",
    surface: "district_page",
    entityType: "hotel",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 50,
      },
      maxItems: 6,
      scopeToDistrict: true,
    },
    priority: 10,
  },
  {
    id: "district-page-attractions",
    name: "District Page - Attractions",
    description: "Attractions within district",
    surface: "district_page",
    entityType: "attraction",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 50,
      },
      maxItems: 8,
      scopeToDistrict: true,
    },
    priority: 20,
  },

  // ============================================================================
  // CATEGORY SEO RULES (e.g., /hotels/luxury-abu-dhabi)
  // ============================================================================
  {
    id: "seo-luxury-hotels",
    name: "SEO Category - Luxury Hotels",
    description: "5-star luxury hotels for SEO category pages",
    surface: "category_seo",
    entityType: "hotel",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 70,
      },
      thresholds: [
        { field: "starRating", operator: ">=", value: 5 }
      ],
      requiredTags: ["luxury"],
      maxItems: 20,
      scopeToDestination: true,
    },
    priority: 10,
  },
  {
    id: "seo-budget-hotels",
    name: "SEO Category - Budget Hotels",
    description: "Budget-friendly hotels for SEO category pages",
    surface: "category_seo",
    entityType: "hotel",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 70,
      },
      thresholds: [
        { field: "starRating", operator: "<=", value: 3 }
      ],
      requiredTags: ["budget-friendly"],
      maxItems: 20,
      scopeToDestination: true,
    },
    priority: 20,
  },
  {
    id: "seo-family-attractions",
    name: "SEO Category - Family Attractions",
    description: "Family-friendly attractions for SEO category pages",
    surface: "category_seo",
    entityType: "attraction",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 70,
      },
      requiredTags: ["family-friendly"],
      maxItems: 15,
      scopeToDestination: true,
    },
    priority: 30,
  },
  {
    id: "seo-romantic-attractions",
    name: "SEO Category - Romantic Attractions",
    description: "Couple-friendly attractions for SEO category pages",
    surface: "category_seo",
    entityType: "attraction",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 70,
      },
      requiredTags: ["couples"],
      maxItems: 15,
      scopeToDestination: true,
    },
    priority: 40,
  },

  // ============================================================================
  // FEATURED RULES (Homepage, global features)
  // ============================================================================
  {
    id: "featured-global-hotels",
    name: "Featured - Global Top Hotels",
    description: "Best hotels across all destinations for global features",
    surface: "featured",
    entityType: "hotel",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 80,
      },
      thresholds: [
        { field: "starRating", operator: ">=", value: 5 },
        { field: "confidence", operator: ">=", value: 80 },
      ],
      anyOfTags: ["luxury", "resort", "iconic-landmark"],
      maxItems: 12,
      diversity: {
        tagCategory: "destination",
        maxPerTag: 2,
      },
    },
    priority: 10,
  },
  {
    id: "featured-global-attractions",
    name: "Featured - Global Must-See Attractions",
    description: "Iconic attractions across all destinations",
    surface: "featured",
    entityType: "attraction",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 80,
      },
      thresholds: [
        { field: "confidence", operator: ">=", value: 80 },
      ],
      anyOfTags: ["iconic-landmark", "must-visit"],
      maxItems: 12,
      diversity: {
        tagCategory: "destination",
        maxPerTag: 2,
      },
    },
    priority: 20,
  },

  // ============================================================================
  // COMPARISON RULES (e.g., comparing similar hotels)
  // ============================================================================
  {
    id: "comparison-luxury-hotels",
    name: "Comparison - Luxury Hotels",
    description: "Comparable luxury hotels for comparison pages",
    surface: "comparison",
    entityType: "hotel",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 70,
      },
      thresholds: [
        { field: "starRating", operator: ">=", value: 4 }
      ],
      requiredTags: ["luxury"],
      maxItems: 4,
      scopeToDestination: true,
    },
    priority: 10,
  },
  {
    id: "comparison-family-hotels",
    name: "Comparison - Family Hotels",
    description: "Comparable family-friendly hotels",
    surface: "comparison",
    entityType: "hotel",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 70,
      },
      requiredTags: ["family-friendly"],
      maxItems: 4,
      scopeToDestination: true,
    },
    priority: 20,
  },
  {
    id: "comparison-budget-hotels",
    name: "Comparison - Budget Hotels",
    description: "Comparable budget-friendly hotels",
    surface: "comparison",
    entityType: "hotel",
    conditions: {
      exclusions: {
        unpublished: true,
        minConfidence: 70,
      },
      requiredTags: ["budget-friendly"],
      maxItems: 4,
      scopeToDestination: true,
    },
    priority: 30,
  },
];

async function seedPlacementRules(): Promise<void> {
  console.log("[PlacementRules] Starting seed...");

  let created = 0;
  let skipped = 0;

  for (const rule of DEFAULT_RULES) {
    // Check if rule already exists
    const existing = await db
      .select({ id: placementRules.id })
      .from(placementRules)
      .where(eq(placementRules.id, rule.id))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  [SKIP] Rule "${rule.name}" already exists`);
      skipped++;
      continue;
    }

    // Insert new rule
    await db.insert(placementRules).values({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      surface: rule.surface,
      entityType: rule.entityType,
      conditions: rule.conditions,
      priority: rule.priority,
      isActive: true,
    });

    console.log(`  [OK] Created rule "${rule.name}"`);
    created++;
  }

  console.log(`\n[PlacementRules] Seed complete: ${created} created, ${skipped} skipped`);
  console.log(`[PlacementRules] Total rules: ${DEFAULT_RULES.length}`);
}

// Run if executed directly
if (process.argv[1]?.endsWith("seed-placement-rules.ts")) {
  seedPlacementRules()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("[PlacementRules] Seed failed:", error);
      process.exit(1);
    });
}

export { seedPlacementRules, DEFAULT_RULES };
