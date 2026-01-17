/**
 * Octopus v2 Phase 5.2 - AI Tagging & Placement Agent
 * 
 * Classifies entities using a fixed taxonomy and determines placement eligibility.
 * Uses strict JSON output with validation - no prose, no invented tags.
 */

import { z } from "zod";
import { db } from "../db";
import { tagDefinitions, entityTags, entityPlacements } from "@shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { getAllUnifiedProviders, markProviderFailed, markProviderSuccess } from "../ai/providers";
import { randomUUID } from "crypto";

// ============================================================================
// SYSTEM PROMPT - LOCKED (DO NOT MODIFY)
// ============================================================================

const SYSTEM_PROMPT = `You are an AI Tagging & Placement Agent inside a production content engine.

Your job is NOT to write content.
Your job is to classify, tag, and decide placement eligibility for an entity using a fixed taxonomy.

You must:
• Output STRICT VALID JSON ONLY
• Use ONLY provided tag IDs
• Never invent tags
• Never invent surfaces
• Never explain outside JSON
• Never return prose

If information is insufficient, omit the tag or placement — do not guess.

Invalid JSON = hard failure.

TAGGING RULES (NON-NEGOTIABLE)
• Confidence must be between 0.60 – 1.00
• Only include tags you are confident about
• Tags must match the entity's actual role, not marketing hype
• District tags ONLY if the entity is physically located there
• Commercial tags ONLY if clearly justified (iconic, flagship, award-level)

PLACEMENT RULES

destination_homepage
Set eligible: true ONLY IF:
• Entity is top-tier in destination
• AND has high confidence luxury / flagship / iconic signals
Limit yourself mentally to max 6 entities per destination.

district_page
Set eligible: true if:
• Entity belongs to that district
• AND is relevant to a traveler browsing that area

category_seo
Return ONLY valid SEO category slugs, e.g.:
• luxury-hotels-abu-dhabi
• beach-resorts-saadiyat

featured
Only for:
• Editor-level recommendations
• Not more than 1–2 per district

ABSOLUTE CONSTRAINTS
• ❌ Do NOT invent new tags
• ❌ Do NOT invent new surfaces
• ❌ Do NOT output explanations outside JSON
• ❌ Do NOT guess missing data
• ❌ Do NOT repeat tags across categories

Return JSON only.
No markdown.
No commentary.`;

// ============================================================================
// Input/Output Schemas
// ============================================================================

export const TaggingInputEntitySchema = z.object({
  id: z.string(),
  type: z.enum(["hotel", "attraction", "district", "article"]),
  name: z.string(),
  description: z.string().optional(),
  highlights: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
  })).optional(),
  amenities: z.array(z.string()).optional(),
  attributes: z.object({
    starRating: z.number().min(1).max(5).optional(),
    priceRange: z.enum(["budget", "midrange", "luxury"]).optional(),
    brand: z.string().nullable().optional(),
  }).optional(),
});

export const TaggingInputGraphContextSchema = z.object({
  destination: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  districts: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),
  nearbyEntities: z.array(z.string()).optional(),
});

export const TaggingInputSchema = z.object({
  entity: TaggingInputEntitySchema,
  graphContext: TaggingInputGraphContextSchema,
  availableTags: z.record(z.string(), z.array(z.string())),
  allowedPlacements: z.array(z.string()),
});

export const TaggingOutputTagSchema = z.object({
  tagId: z.string(),
  confidence: z.number().min(0.60).max(1.00),
});

export const TaggingOutputPlacementSchema = z.object({
  surface: z.string(),
  eligible: z.boolean(),
  priority: z.number().optional(),
  reason: z.string().optional(),
});

export const TaggingOutputSchema = z.object({
  tags: z.array(TaggingOutputTagSchema),
  placements: z.array(TaggingOutputPlacementSchema),
});

export type TaggingInput = z.infer<typeof TaggingInputSchema>;
export type TaggingOutput = z.infer<typeof TaggingOutputSchema>;

// ============================================================================
// Taxonomy Loader
// ============================================================================

interface TaxonomyCache {
  tags: Map<string, { category: string; id: string }>;
  byCategory: Map<string, string[]>;
  lastLoaded: number;
}

let taxonomyCache: TaxonomyCache | null = null;
const TAXONOMY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadTaxonomy(): Promise<TaxonomyCache> {
  if (taxonomyCache && Date.now() - taxonomyCache.lastLoaded < TAXONOMY_CACHE_TTL) {
    return taxonomyCache;
  }

  const allTags = await db.select({
    id: tagDefinitions.id,
    category: tagDefinitions.category,
  }).from(tagDefinitions).where(eq(tagDefinitions.isActive, true));

  const tags = new Map<string, { category: string; id: string }>();
  const byCategory = new Map<string, string[]>();

  for (const tag of allTags) {
    tags.set(tag.id, { category: tag.category, id: tag.id });
    
    const categoryTags = byCategory.get(tag.category) || [];
    categoryTags.push(tag.id);
    byCategory.set(tag.category, categoryTags);
  }

  taxonomyCache = { tags, byCategory, lastLoaded: Date.now() };
  return taxonomyCache;
}

// ============================================================================
// Context Builder
// ============================================================================

export async function buildTaggingContext(
  entityId: string,
  entityType: string,
  entityData: {
    name: string;
    description?: string;
    highlights?: Array<{ title: string; description?: string }>;
    amenities?: string[];
    starRating?: number;
    priceRange?: string;
    brand?: string | null;
  },
  graphContext?: {
    destinationId?: string;
    destinationName?: string;
    districts?: Array<{ id: string; name: string }>;
    nearbyEntities?: string[];
  }
): Promise<TaggingInput> {
  const taxonomy = await loadTaxonomy();

  // Build available tags object by category
  const availableTags: Record<string, string[]> = {};
  for (const [category, tagIds] of taxonomy.byCategory) {
    availableTags[category] = tagIds;
  }

  // Allowed placement surfaces
  const allowedPlacements = [
    "destination_homepage",
    "district_page",
    "category_seo",
    "featured",
    "comparison",
    "newsletter",
    "social",
  ];

  return {
    entity: {
      id: entityId,
      type: entityType as "hotel" | "attraction" | "district" | "article",
      name: entityData.name,
      description: entityData.description,
      highlights: entityData.highlights,
      amenities: entityData.amenities,
      attributes: {
        starRating: entityData.starRating,
        priceRange: entityData.priceRange as "budget" | "midrange" | "luxury" | undefined,
        brand: entityData.brand,
      },
    },
    graphContext: {
      destination: graphContext?.destinationId ? {
        id: graphContext.destinationId,
        name: graphContext.destinationName || graphContext.destinationId,
      } : undefined,
      districts: graphContext?.districts,
      nearbyEntities: graphContext?.nearbyEntities,
    },
    availableTags,
    allowedPlacements,
  };
}

// ============================================================================
// AI Call with Retry
// ============================================================================

const MAX_RETRIES = 2;

async function callAIForTagging(input: TaggingInput): Promise<TaggingOutput> {
  const providers = getAllUnifiedProviders();
  
  if (providers.length === 0) {
    throw new Error("[TaggingAgent] No AI providers available");
  }

  const userMessage = JSON.stringify(input, null, 2);
  let lastError: Error | null = null;

  for (const provider of providers) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[TaggingAgent] Calling ${provider.name} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
        
        const result = await provider.generateCompletion({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          temperature: 0.3, // Low temperature for consistent classification
          maxTokens: 2000,
          responseFormat: { type: "json_object" },
        });

        // Parse and validate JSON
        let parsed: unknown;
        try {
          // Clean any markdown code blocks if present
          let content = result.content.trim();
          if (content.startsWith("```json")) {
            content = content.slice(7);
          }
          if (content.startsWith("```")) {
            content = content.slice(3);
          }
          if (content.endsWith("```")) {
            content = content.slice(0, -3);
          }
          parsed = JSON.parse(content.trim());
        } catch (parseError) {
          console.error(`[TaggingAgent] JSON parse error:`, parseError);
          if (attempt < MAX_RETRIES) continue;
          throw new Error(`Invalid JSON from ${provider.name}: ${result.content.slice(0, 200)}`);
        }

        // Validate against schema
        const validated = TaggingOutputSchema.safeParse(parsed);
        if (!validated.success) {
          console.error(`[TaggingAgent] Schema validation error:`, validated.error.errors);
          if (attempt < MAX_RETRIES) continue;
          throw new Error(`Schema validation failed: ${validated.error.message}`);
        }

        // Validate tag IDs exist in taxonomy
        const taxonomy = await loadTaxonomy();
        const invalidTags = validated.data.tags.filter(t => !taxonomy.tags.has(t.tagId));
        if (invalidTags.length > 0) {
          console.error(`[TaggingAgent] Invalid tag IDs:`, invalidTags.map(t => t.tagId));
          if (attempt < MAX_RETRIES) continue;
          throw new Error(`Invalid tag IDs: ${invalidTags.map(t => t.tagId).join(", ")}`);
        }

        // Validate placement surfaces
        const validSurfaces = new Set(input.allowedPlacements);
        const invalidSurfaces = validated.data.placements.filter(p => !validSurfaces.has(p.surface));
        if (invalidSurfaces.length > 0) {
          console.error(`[TaggingAgent] Invalid surfaces:`, invalidSurfaces.map(p => p.surface));
          if (attempt < MAX_RETRIES) continue;
          throw new Error(`Invalid surfaces: ${invalidSurfaces.map(p => p.surface).join(", ")}`);
        }

        markProviderSuccess(provider.name);
        console.log(`[TaggingAgent] Success: ${validated.data.tags.length} tags, ${validated.data.placements.length} placements`);
        return validated.data;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[TaggingAgent] Error with ${provider.name}:`, lastError.message);
        
        // Check for rate limiting
        if (lastError.message.includes("rate") || lastError.message.includes("429")) {
          markProviderFailed(provider.name, "rate_limited");
          break; // Try next provider
        }
        
        if (lastError.message.includes("credit") || lastError.message.includes("balance")) {
          markProviderFailed(provider.name, "no_credits");
          break; // Try next provider
        }
      }
    }
  }

  throw lastError || new Error("[TaggingAgent] All providers failed");
}

// ============================================================================
// Persistence Layer
// ============================================================================

export async function persistTaggingResults(
  entityId: string,
  entityType: string,
  output: TaggingOutput,
  destinationId?: string
): Promise<{ tagsUpserted: number; placementsUpserted: number }> {
  let tagsUpserted = 0;
  let placementsUpserted = 0;

  // Upsert tags
  for (const tag of output.tags) {
    try {
      await db.insert(entityTags).values({
        id: randomUUID(),
        entityType,
        entityId,
        tagId: tag.tagId,
        confidence: Math.round(tag.confidence * 100), // Store as 0-100 integer
        source: "ai",
      } as any).onConflictDoUpdate({
        target: [entityTags.entityType, entityTags.entityId, entityTags.tagId] as any,
        set: {
          confidence: Math.round(tag.confidence * 100),
          source: "ai",
        } as any,
      });
      tagsUpserted++;
    } catch (error) {
      console.error(`[TaggingAgent] Failed to upsert tag ${tag.tagId}:`, error);
    }
  }

  // Upsert placements (only eligible ones)
  for (const placement of output.placements) {
    if (!placement.eligible) continue;
    
    try {
      await db.insert(entityPlacements).values({
        id: randomUUID(),
        entityType,
        entityId,
        surface: placement.surface as any,
        destinationId: destinationId || null,
        priority: placement.priority || 0,
        reason: placement.reason || null,
        isActive: true,
      } as any).onConflictDoUpdate({
        target: [entityPlacements.entityType, entityPlacements.entityId, entityPlacements.surface, entityPlacements.destinationId] as any,
        set: {
          priority: placement.priority || 0,
          reason: placement.reason || null,
          isActive: true,
          updatedAt: new Date(),
        } as any,
      });
      placementsUpserted++;
    } catch (error) {
      console.error(`[TaggingAgent] Failed to upsert placement ${placement.surface}:`, error);
    }
  }

  return { tagsUpserted, placementsUpserted };
}

// ============================================================================
// Main Entry Point
// ============================================================================

export interface TagEntityResult {
  success: boolean;
  entityId: string;
  entityType: string;
  tags: Array<{ tagId: string; confidence: number }>;
  placements: Array<{ surface: string; eligible: boolean; priority?: number; reason?: string }>;
  tagsUpserted: number;
  placementsUpserted: number;
  error?: string;
}

export async function tagEntity(
  entityId: string,
  entityType: string,
  entityData: {
    name: string;
    description?: string;
    highlights?: Array<{ title: string; description?: string }>;
    amenities?: string[];
    starRating?: number;
    priceRange?: string;
    brand?: string | null;
  },
  graphContext?: {
    destinationId?: string;
    destinationName?: string;
    districts?: Array<{ id: string; name: string }>;
    nearbyEntities?: string[];
  }
): Promise<TagEntityResult> {
  try {
    console.log(`[TaggingAgent] Starting tagging for ${entityType}:${entityId} (${entityData.name})`);

    // Build context
    const input = await buildTaggingContext(entityId, entityType, entityData, graphContext);

    // Call AI
    const output = await callAIForTagging(input);

    // Persist results
    const { tagsUpserted, placementsUpserted } = await persistTaggingResults(
      entityId,
      entityType,
      output,
      graphContext?.destinationId
    );

    console.log(`[TaggingAgent] Completed: ${tagsUpserted} tags, ${placementsUpserted} placements for ${entityData.name}`);

    return {
      success: true,
      entityId,
      entityType,
      tags: output.tags as Array<{ tagId: string; confidence: number }>,
      placements: output.placements as Array<{ surface: string; eligible: boolean; priority?: number; reason?: string }>,
      tagsUpserted,
      placementsUpserted,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[TaggingAgent] Failed for ${entityType}:${entityId}:`, errorMessage);
    
    return {
      success: false,
      entityId,
      entityType,
      tags: [],
      placements: [],
      tagsUpserted: 0,
      placementsUpserted: 0,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Batch Tagging (for queue processing)
// ============================================================================

export async function tagEntitiesBatch(
  entities: Array<{
    entityId: string;
    entityType: string;
    entityData: {
      name: string;
      description?: string;
      highlights?: Array<{ title: string; description?: string }>;
      amenities?: string[];
      starRating?: number;
      priceRange?: string;
      brand?: string | null;
    };
    graphContext?: {
      destinationId?: string;
      destinationName?: string;
      districts?: Array<{ id: string; name: string }>;
      nearbyEntities?: string[];
    };
  }>,
  concurrency: number = 2
): Promise<TagEntityResult[]> {
  const results: TagEntityResult[] = [];
  
  // Process in batches to respect rate limits
  for (let i = 0; i < entities.length; i += concurrency) {
    const batch = entities.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(e => tagEntity(e.entityId, e.entityType, e.entityData, e.graphContext))
    );
    results.push(...batchResults);
    
    // Small delay between batches to avoid rate limiting
    if (i + concurrency < entities.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}
