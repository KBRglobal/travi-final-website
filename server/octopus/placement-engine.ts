/**
 * Octopus v2 - Placement Rules Engine (Phase 5.3)
 * 
 * Deterministic, DB-driven content placement system.
 * Transforms tagging intelligence into final placement decisions.
 * 
 * HARD CONSTRAINTS:
 * - Rules > AI (AI suggests, rules decide)
 * - Deterministic (same input → same output)
 * - Data-driven only (no if/else in frontend)
 * - No localization in this phase
 */

import { db } from '../db';
import { 
  placementRules, 
  entityPlacements,
  entityTags,
  tagDefinitions,
  hotels,
  attractions,
  districts,
  contents,
  hotelDistricts,
  attractionDistricts,
  type PlacementRule,
  type PlacementRuleConditions,
  type EntityPlacement,
} from '@shared/schema';
import { eq, and, inArray, sql, asc, desc, isNull, gte, lte, gt, lt } from 'drizzle-orm';
import { log } from '../lib/logger';

const engineLogger = {
  info: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[PlacementEngine] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => 
    log.error(`[PlacementEngine] ${msg}`, undefined, data),
  debug: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[PlacementEngine] ${msg}`, data),
};

// Entity with metadata for rule evaluation
export interface EntityForPlacement {
  id: string;
  type: "hotel" | "attraction" | "district" | "article";
  name: string;
  destinationId: string | null;
  districtId?: string | null;
  isPublished: boolean;
  starRating?: number;
  priceLevel?: number;
  reviewCount?: number;
  tags: Array<{
    tagId: string;
    category: string;
    confidence: number;
  }>;
}

// Placement decision output
export interface PlacementDecision {
  entityType: string;
  entityId: string;
  surface: string;
  destinationId: string | null;
  districtId: string | null;
  priority: number;
  reason: string;
}

// ============================================================================
// Rule Loading
// ============================================================================

/**
 * Load all active placement rules for a surface, sorted by priority (lower first)
 */
export async function loadRulesForSurface(surface: string): Promise<PlacementRule[]> {
  const rules = await db
    .select()
    .from(placementRules)
    .where(and(
      eq(placementRules.surface, surface as any),
      eq(placementRules.isActive, true)
    ))
    .orderBy(asc(placementRules.priority));
  
  return rules;
}

/**
 * Load all active placement rules
 */
export async function loadAllActiveRules(): Promise<PlacementRule[]> {
  const rules = await db
    .select()
    .from(placementRules)
    .where(eq(placementRules.isActive, true))
    .orderBy(asc(placementRules.priority));
  
  return rules;
}

// ============================================================================
// Entity Loading with Tags
// ============================================================================

/**
 * Load entities of a specific type with their tags for rule evaluation
 * Joins with contents table to get name, status (published), etc.
 */
export async function loadEntitiesWithTags(
  entityType: "hotel" | "attraction" | "district",
  destinationId?: string
): Promise<EntityForPlacement[]> {
  let entities: EntityForPlacement[] = [];

  if (entityType === "hotel") {
    const hotelRows = await db
      .select({
        id: hotels.id,
        contentId: hotels.contentId,
        destinationId: hotels.destinationId,
        starRating: hotels.starRating,
        title: contents.title,
        status: contents.status,
      })
      .from(hotels)
      .innerJoin(contents, eq(hotels.contentId, contents.id))
      .where(destinationId ? eq(hotels.destinationId, destinationId) : undefined);

    // Fetch district mappings for all hotels in one query
    // ORDER BY confidence DESC, districtId ASC ensures deterministic selection (highest confidence, stable tie-breaker)
    const hotelIds = hotelRows.map(h => h.id);
    const districtMappings = hotelIds.length > 0 ? await db
      .select({
        hotelId: hotelDistricts.hotelId,
        districtId: hotelDistricts.districtId,
        confidence: hotelDistricts.confidence,
      })
      .from(hotelDistricts)
      .where(inArray(hotelDistricts.hotelId, hotelIds))
      .orderBy(desc(hotelDistricts.confidence), asc(hotelDistricts.districtId)) : [];

    // Build hotel → district map (take highest confidence if multiple districts)
    const hotelDistrictMap = new Map<string, string>();
    for (const mapping of districtMappings) {
      if (!hotelDistrictMap.has(mapping.hotelId)) {
        hotelDistrictMap.set(mapping.hotelId, mapping.districtId);
      }
    }

    entities = hotelRows.map(h => ({
      id: h.id,
      type: "hotel" as const,
      name: h.title || "Unknown",
      destinationId: h.destinationId,
      districtId: hotelDistrictMap.get(h.id) || null,
      isPublished: h.status === "published",
      starRating: h.starRating ?? undefined,
      tags: [],
    }));
  } else if (entityType === "attraction") {
    const attractionRows = await db
      .select({
        id: attractions.id,
        contentId: attractions.contentId,
        destinationId: attractions.destinationId,
        title: contents.title,
        status: contents.status,
      })
      .from(attractions)
      .innerJoin(contents, eq(attractions.contentId, contents.id))
      .where(destinationId ? eq(attractions.destinationId, destinationId) : undefined);

    // Fetch district mappings for all attractions in one query
    // ORDER BY confidence DESC, districtId ASC ensures deterministic selection (highest confidence, stable tie-breaker)
    const attractionIds = attractionRows.map(a => a.id);
    const districtMappings = attractionIds.length > 0 ? await db
      .select({
        attractionId: attractionDistricts.attractionId,
        districtId: attractionDistricts.districtId,
        confidence: attractionDistricts.confidence,
      })
      .from(attractionDistricts)
      .where(inArray(attractionDistricts.attractionId, attractionIds))
      .orderBy(desc(attractionDistricts.confidence), asc(attractionDistricts.districtId)) : [];

    // Build attraction → district map (take highest confidence if multiple districts)
    const attractionDistrictMap = new Map<string, string>();
    for (const mapping of districtMappings) {
      if (!attractionDistrictMap.has(mapping.attractionId)) {
        attractionDistrictMap.set(mapping.attractionId, mapping.districtId);
      }
    }

    entities = attractionRows.map(a => ({
      id: a.id,
      type: "attraction" as const,
      name: a.title || "Unknown",
      destinationId: a.destinationId,
      districtId: attractionDistrictMap.get(a.id) || null,
      isPublished: a.status === "published",
      tags: [],
    }));
  } else if (entityType === "district") {
    const districtRows = await db
      .select({
        id: districts.id,
        contentId: districts.contentId,
        destinationId: districts.destinationId,
        title: contents.title,
        status: contents.status,
      })
      .from(districts)
      .innerJoin(contents, eq(districts.contentId, contents.id))
      .where(destinationId ? eq(districts.destinationId, destinationId) : undefined);

    entities = districtRows.map(d => ({
      id: d.id,
      type: "district" as const,
      name: d.title || "Unknown",
      destinationId: d.destinationId,
      isPublished: d.status === "published",
      tags: [],
    }));
  }

  // Load tags for all entities
  if (entities.length > 0) {
    const entityIds = entities.map(e => e.id);
    const tagRows = await db
      .select({
        entityId: entityTags.entityId,
        tagId: entityTags.tagId,
        confidence: entityTags.confidence,
        category: tagDefinitions.category,
      })
      .from(entityTags)
      .innerJoin(tagDefinitions, eq(entityTags.tagId, tagDefinitions.id))
      .where(and(
        eq(entityTags.entityType, entityType),
        inArray(entityTags.entityId, entityIds)
      ));

    // Map tags to entities
    const tagsByEntity = new Map<string, EntityForPlacement["tags"]>();
    for (const row of tagRows) {
      if (!tagsByEntity.has(row.entityId)) {
        tagsByEntity.set(row.entityId, []);
      }
      tagsByEntity.get(row.entityId)!.push({
        tagId: row.tagId,
        category: row.category,
        confidence: row.confidence ?? 0,
      });
    }

    for (const entity of entities) {
      entity.tags = tagsByEntity.get(entity.id) || [];
    }
  }

  return entities;
}

// ============================================================================
// Rule Evaluation (Deterministic)
// ============================================================================

/**
 * Check if an entity passes a single rule's conditions
 * Returns true if entity is eligible, false if excluded
 */
export function evaluateEntityAgainstRule(
  entity: EntityForPlacement,
  conditions: PlacementRuleConditions,
  context: { destinationId?: string; districtId?: string }
): { eligible: boolean; reason: string } {
  // 1. Exclusion conditions (checked first - these are hard blockers)
  if (conditions.exclusions) {
    const exclusions = conditions.exclusions;
    
    // Unpublished exclusion
    if (exclusions.unpublished && !entity.isPublished) {
      return { eligible: false, reason: "Entity is unpublished" };
    }
    
    // Minimum confidence check
    if (exclusions.minConfidence !== undefined) {
      const avgConfidence = entity.tags.length > 0
        ? entity.tags.reduce((sum, t) => sum + t.confidence, 0) / entity.tags.length
        : 0;
      if (avgConfidence < exclusions.minConfidence) {
        return { 
          eligible: false, 
          reason: `Average confidence ${avgConfidence.toFixed(2)} below minimum ${exclusions.minConfidence}` 
        };
      }
    }
  }

  // 2. Scope conditions
  if (conditions.scopeToDestination && context.destinationId) {
    if (entity.destinationId !== context.destinationId) {
      return { eligible: false, reason: "Entity not in destination scope" };
    }
  }
  
  if (conditions.scopeToDistrict && context.districtId) {
    if (entity.districtId !== context.districtId) {
      return { eligible: false, reason: "Entity not in district scope" };
    }
  }

  // 3. Threshold conditions
  if (conditions.thresholds && conditions.thresholds.length > 0) {
    for (const threshold of conditions.thresholds) {
      let fieldValue: number | undefined;
      
      switch (threshold.field) {
        case "starRating":
          fieldValue = entity.starRating;
          break;
        case "priceLevel":
          fieldValue = entity.priceLevel;
          break;
        case "reviewCount":
          fieldValue = entity.reviewCount;
          break;
        case "confidence":
          fieldValue = entity.tags.length > 0
            ? entity.tags.reduce((sum, t) => sum + t.confidence, 0) / entity.tags.length
            : 0;
          break;
      }

      if (fieldValue === undefined) {
        return { 
          eligible: false, 
          reason: `Missing required field: ${threshold.field}` 
        };
      }

      let passes = false;
      switch (threshold.operator) {
        case ">=": passes = fieldValue >= threshold.value; break;
        case "<=": passes = fieldValue <= threshold.value; break;
        case ">": passes = fieldValue > threshold.value; break;
        case "<": passes = fieldValue < threshold.value; break;
        case "=": passes = fieldValue === threshold.value; break;
      }

      if (!passes) {
        return { 
          eligible: false, 
          reason: `Threshold failed: ${threshold.field} ${threshold.operator} ${threshold.value} (actual: ${fieldValue})` 
        };
      }
    }
  }

  // 4. Required tags (AND logic)
  if (conditions.requiredTags && conditions.requiredTags.length > 0) {
    const entityTagIds = new Set(entity.tags.map(t => t.tagId));
    for (const requiredTag of conditions.requiredTags) {
      if (!entityTagIds.has(requiredTag)) {
        return { 
          eligible: false, 
          reason: `Missing required tag: ${requiredTag}` 
        };
      }
    }
  }

  // 5. Any-of tags (OR logic)
  if (conditions.anyOfTags && conditions.anyOfTags.length > 0) {
    const entityTagIds = new Set(entity.tags.map(t => t.tagId));
    const hasAny = conditions.anyOfTags.some(tag => entityTagIds.has(tag));
    if (!hasAny) {
      return { 
        eligible: false, 
        reason: `None of optional tags present: ${conditions.anyOfTags.join(", ")}` 
      };
    }
  }

  // 6. Excluded tags
  if (conditions.excludedTags && conditions.excludedTags.length > 0) {
    const entityTagIds = new Set(entity.tags.map(t => t.tagId));
    for (const excludedTag of conditions.excludedTags) {
      if (entityTagIds.has(excludedTag)) {
        return { 
          eligible: false, 
          reason: `Has excluded tag: ${excludedTag}` 
        };
      }
    }
  }

  // All conditions passed
  return { 
    eligible: true, 
    reason: "Passed all rule conditions" 
  };
}

/**
 * Apply diversity constraints to a list of eligible entities
 * Returns entities that satisfy diversity requirements
 */
export function applyDiversityConstraints(
  entities: EntityForPlacement[],
  diversity: PlacementRuleConditions["diversity"]
): EntityForPlacement[] {
  if (!diversity) return entities;

  const { tagCategory, minPerTag, maxPerTag } = diversity;
  const result: EntityForPlacement[] = [];
  const countByTag = new Map<string, number>();

  // Group entities by their tags in the specified category
  const entitiesByTag = new Map<string, EntityForPlacement[]>();
  for (const entity of entities) {
    const categoryTags = entity.tags.filter(t => t.category === tagCategory);
    if (categoryTags.length === 0) {
      // Entities without tags in this category go to a "none" bucket
      if (!entitiesByTag.has("__none__")) {
        entitiesByTag.set("__none__", []);
      }
      entitiesByTag.get("__none__")!.push(entity);
    } else {
      for (const tag of categoryTags) {
        if (!entitiesByTag.has(tag.tagId)) {
          entitiesByTag.set(tag.tagId, []);
        }
        entitiesByTag.get(tag.tagId)!.push(entity);
      }
    }
  }

  // First, ensure minimum per tag if specified
  if (minPerTag) {
    for (const [tagId, tagEntities] of entitiesByTag) {
      const toAdd = Math.min(minPerTag, tagEntities.length);
      for (let i = 0; i < toAdd; i++) {
        const entity = tagEntities[i];
        if (!result.some(e => e.id === entity.id)) {
          result.push(entity);
          countByTag.set(tagId, (countByTag.get(tagId) || 0) + 1);
        }
      }
    }
  }

  // Then, add remaining entities respecting maxPerTag
  for (const entity of entities) {
    if (result.some(e => e.id === entity.id)) continue;

    const categoryTags = entity.tags.filter(t => t.category === tagCategory);
    let canAdd = true;

    if (maxPerTag && categoryTags.length > 0) {
      for (const tag of categoryTags) {
        const currentCount = countByTag.get(tag.tagId) || 0;
        if (currentCount >= maxPerTag) {
          canAdd = false;
          break;
        }
      }
    }

    if (canAdd) {
      result.push(entity);
      for (const tag of categoryTags) {
        countByTag.set(tag.tagId, (countByTag.get(tag.tagId) || 0) + 1);
      }
    }
  }

  return result;
}

// ============================================================================
// Placement Resolution
// ============================================================================

export interface PlacementContext {
  surface: string;
  destinationId?: string;
  districtId?: string;
}

/**
 * Resolve placements for a specific surface and context
 * This is the main entry point for deterministic placement resolution
 */
export async function resolvePlacements(
  context: PlacementContext
): Promise<PlacementDecision[]> {
  const { surface, destinationId, districtId } = context;
  
  engineLogger.info("Resolving placements", { surface, destinationId, districtId });

  // 1. Load all active rules for this surface
  const rules = await loadRulesForSurface(surface);
  if (rules.length === 0) {
    engineLogger.info("No active rules for surface", { surface });
    return [];
  }

  const decisions: PlacementDecision[] = [];
  const usedEntityIds = new Set<string>();

  // 2. Process rules in priority order (lower priority number = processed first)
  for (const rule of rules) {
    const conditions = rule.conditions as PlacementRuleConditions;
    
    // 3. Load entities of the rule's entity type
    const entities = await loadEntitiesWithTags(
      rule.entityType as "hotel" | "attraction" | "district",
      destinationId
    );

    // 4. Evaluate each entity against the rule
    const eligible: EntityForPlacement[] = [];
    for (const entity of entities) {
      // Skip already placed entities
      if (usedEntityIds.has(entity.id)) continue;

      const evaluation = evaluateEntityAgainstRule(entity, conditions, {
        destinationId,
        districtId,
      });

      if (evaluation.eligible) {
        eligible.push(entity);
      }
    }

    // 5. Apply diversity constraints
    let finalEntities = conditions.diversity
      ? applyDiversityConstraints(eligible, conditions.diversity)
      : eligible;

    // 6. Apply count limit
    if (conditions.maxItems && finalEntities.length > conditions.maxItems) {
      finalEntities = finalEntities.slice(0, conditions.maxItems);
    }

    // 7. Create placement decisions
    for (let i = 0; i < finalEntities.length; i++) {
      const entity = finalEntities[i];
      decisions.push({
        entityType: rule.entityType,
        entityId: entity.id,
        surface,
        destinationId: destinationId || null,
        districtId: districtId || null,
        priority: i + 1, // Position in list
        reason: `Rule: ${rule.name}`,
      });
      usedEntityIds.add(entity.id);
    }

    engineLogger.debug(`Rule "${rule.name}" placed ${finalEntities.length} entities`, {
      ruleId: rule.id,
      entityType: rule.entityType,
      eligible: eligible.length,
      placed: finalEntities.length,
    });
  }

  engineLogger.info("Placement resolution complete", {
    surface,
    totalDecisions: decisions.length,
  });

  return decisions;
}

// ============================================================================
// Placement Persistence
// ============================================================================

/**
 * Write placement decisions to the database
 * Replaces existing placements for the given surface/context
 */
export async function persistPlacements(
  decisions: PlacementDecision[],
  context: PlacementContext
): Promise<{ inserted: number; deleted: number }> {
  const { surface, destinationId, districtId } = context;

  // Delete existing placements for this surface/context
  let deleteConditions = [eq(entityPlacements.surface, surface as any)];
  
  if (destinationId) {
    deleteConditions.push(eq(entityPlacements.destinationId, destinationId));
  } else {
    deleteConditions.push(isNull(entityPlacements.destinationId));
  }
  
  if (districtId) {
    deleteConditions.push(eq(entityPlacements.districtId, districtId));
  } else {
    deleteConditions.push(isNull(entityPlacements.districtId));
  }

  const deleteResult = await db
    .delete(entityPlacements)
    .where(and(...deleteConditions));

  // Insert new placements
  if (decisions.length > 0) {
    await db.insert(entityPlacements).values(
      decisions.map(d => ({
        entityType: d.entityType,
        entityId: d.entityId,
        surface: d.surface as any,
        destinationId: d.destinationId,
        districtId: d.districtId,
        priority: d.priority,
        reason: d.reason,
        isActive: true,
      }))
    );
  }

  return {
    inserted: decisions.length,
    deleted: 0, // Drizzle doesn't return count for delete
  };
}

/**
 * Refresh all placements for a surface across all destinations
 */
export async function refreshSurfacePlacements(
  surface: string
): Promise<{ destinations: number; totalPlacements: number }> {
  engineLogger.info("Refreshing placements for surface", { surface });

  // Get all unique destinations
  const destinationRows = await db
    .selectDistinct({ destinationId: hotels.destinationId })
    .from(hotels)
    .where(sql`${hotels.destinationId} IS NOT NULL`);

  let totalPlacements = 0;

  // Global placements (no destination scope)
  const globalDecisions = await resolvePlacements({ surface });
  await persistPlacements(globalDecisions, { surface });
  totalPlacements += globalDecisions.length;

  // Per-destination placements
  for (const row of destinationRows) {
    if (!row.destinationId) continue;
    
    const decisions = await resolvePlacements({
      surface,
      destinationId: row.destinationId,
    });
    await persistPlacements(decisions, {
      surface,
      destinationId: row.destinationId,
    });
    totalPlacements += decisions.length;
  }

  engineLogger.info("Surface placement refresh complete", {
    surface,
    destinations: destinationRows.length,
    totalPlacements,
  });

  return {
    destinations: destinationRows.length,
    totalPlacements,
  };
}

/**
 * Refresh all placements across all surfaces
 */
export async function refreshAllPlacements(): Promise<{
  surfaces: string[];
  totalPlacements: number;
}> {
  const surfaces = [
    "destination_homepage",
    "district_page",
    "category_seo",
    "featured",
    "comparison",
  ];

  let totalPlacements = 0;

  for (const surface of surfaces) {
    const result = await refreshSurfacePlacements(surface);
    totalPlacements += result.totalPlacements;
  }

  engineLogger.info("Full placement refresh complete", {
    surfaces,
    totalPlacements,
  });

  return { surfaces, totalPlacements };
}

// ============================================================================
// Placement Queries (for frontend consumption)
// ============================================================================

/**
 * Get placements for a specific surface and context
 * Frontend and SEO layers consume this, not infer placements
 */
export async function getPlacementsForSurface(
  surface: string,
  destinationId?: string,
  districtId?: string
): Promise<EntityPlacement[]> {
  let conditions = [
    eq(entityPlacements.surface, surface as any),
    eq(entityPlacements.isActive, true),
  ];

  if (destinationId) {
    conditions.push(eq(entityPlacements.destinationId, destinationId));
  }
  
  if (districtId) {
    conditions.push(eq(entityPlacements.districtId, districtId));
  }

  const placements = await db
    .select()
    .from(entityPlacements)
    .where(and(...conditions))
    .orderBy(asc(entityPlacements.priority));

  return placements;
}
