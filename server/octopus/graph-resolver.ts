/**
 * Octopus Graph Resolver - Entity Relationship Management
 * Resolves and maintains relationships between destinations, districts, hotels, attractions
 * 
 * Phase 3: Graph Resolution
 * - Destination hierarchy traversal (country → city → area)
 * - Entity-to-destination linking with confidence scores
 * - Hotel-district many-to-many relationships
 * - Graph traversal utilities for aggregation
 */

import { db } from "../db";
import {
  destinations,
  districts,
  hotels,
  attractions,
  dining,
  hotelDistricts,
  contents,
  type Destination,
  type District,
  type Hotel,
  type Attraction,
  type Dining,
  type HotelDistrict,
} from "@shared/schema";
import { eq, and, or, like, ilike, isNull, sql, inArray } from "drizzle-orm";
import { log } from "../lib/logger";

const graphLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[GraphResolver] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[GraphResolver] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[GraphResolver] ${msg}`, data),
};

// ============================================================================
// Types
// ============================================================================

export interface ResolvedDestination {
  id: string;
  name: string;
  slug: string;
  level: "country" | "city" | "area";
  parentId?: string;
  hierarchy: string[];
  confidence: number;
}

export interface EntityLocation {
  entityType: "hotel" | "attraction" | "district" | "dining";
  entityId: string;
  destinationId?: string;
  districtIds: string[];
  locationHint?: string;
}

export interface LinkResult {
  success: boolean;
  entityId: string;
  destinationId?: string;
  districtIds: string[];
  confidence: number;
  source: "exact_match" | "fuzzy_match" | "hierarchy_inference" | "manual";
}

export type EntityType = "destination" | "district" | "hotel" | "attraction" | "dining";

export interface GraphNode {
  id: string;
  type: EntityType;
  name: string;
  edges: GraphEdge[];
}

export interface GraphEdge {
  targetId: string;
  targetType: EntityType;
  relationship: "parent_of" | "child_of" | "located_in" | "contains" | "related_to";
  confidence: number;
}

// ============================================================================
// Destination Resolution
// ============================================================================

/**
 * Get canonical name for a destination
 * Destinations store their name directly in the destinations table
 */
function getCanonicalDestinationName(dest: Destination): string {
  return dest.name;
}

/**
 * Extract keywords from a string for matching
 * Removes punctuation, splits on spaces, filters short words
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3)
    .slice(0, 5);
}

/**
 * Resolve a destination from a name hint
 * Uses indexed lookups on normalizedName column for efficient resolution
 * Handles complex hints like "Abu Dhabi, UAE" or "Dubai – United Arab Emirates"
 */
export async function resolveDestination(
  nameHint: string,
  contextHints?: { country?: string; city?: string }
): Promise<ResolvedDestination | null> {
  const normalized = normalizeEntityName(nameHint);
  const trimmedHint = nameHint.trim();
  
  // Step 1: Indexed exact match on ID or slug (confidence 100)
  // IDs are like "abu-dhabi", slugs are "/destinations/abu-dhabi"
  const exactIdMatch = await db
    .select()
    .from(destinations)
    .where(eq(destinations.id, normalized))
    .limit(1);
  
  if (exactIdMatch.length) {
    const allDests = await db.select().from(destinations);
    return buildResolvedDestination(exactIdMatch[0], allDests, 100);
  }
  
  // Also check slug variants
  const slugVariants = [
    trimmedHint,
    `/destinations/${normalized}`,
  ].filter(Boolean);
  
  const exactSlugMatch = await db
    .select()
    .from(destinations)
    .where(inArray(destinations.slug, slugVariants))
    .limit(1);
  
  if (exactSlugMatch.length) {
    const allDests = await db.select().from(destinations);
    return buildResolvedDestination(exactSlugMatch[0], allDests, 100);
  }
  
  // Step 2: Indexed exact match on normalizedName (confidence 100)
  const normalizedNameMatch = await db
    .select()
    .from(destinations)
    .where(eq(destinations.normalizedName, normalized))
    .limit(5);
  
  if (normalizedNameMatch.length === 1) {
    const allDests = await db.select().from(destinations);
    return buildResolvedDestination(normalizedNameMatch[0], allDests, 100);
  }
  
  // Step 3: Multiple normalizedName matches - try context disambiguation
  if (normalizedNameMatch.length > 1 && contextHints?.country) {
    const countryHint = contextHints.country;
    const allDests = await db.select().from(destinations);
    const withContext = normalizedNameMatch.filter(dest => {
      const parent = allDests.find(p => p.id === dest.parentDestinationId);
      if (parent && normalizeEntityName(parent.name) === normalizeEntityName(countryHint)) {
        return true;
      }
      return false;
    });
    if (withContext.length === 1) {
      return buildResolvedDestination(withContext[0], allDests, 90);
    }
  }
  
  // Step 4: Fallback to case-insensitive exact name match (confidence 95)
  const exactNameMatch = await db
    .select()
    .from(destinations)
    .where(ilike(destinations.name, trimmedHint))
    .limit(1);
  
  if (exactNameMatch.length) {
    const allDests = await db.select().from(destinations);
    return buildResolvedDestination(exactNameMatch[0], allDests, 95);
  }
  
  // Step 5: Keyword-based fallback for complex strings (confidence 80)
  const keywords = extractKeywords(nameHint);
  if (keywords.length > 0) {
    const keywordConditions = keywords.map(kw => ilike(destinations.name, `%${kw}%`));
    const keywordMatches = await db
      .select()
      .from(destinations)
      .where(or(...keywordConditions))
      .limit(20);
    
    // Check for exact normalized match in results
    for (const dest of keywordMatches) {
      if (dest.normalizedName === normalized || normalizeEntityName(dest.name) === normalized) {
        const allDests = await db.select().from(destinations);
        return buildResolvedDestination(dest, allDests, 85);
      }
    }
    
    // Check for substring containment
    const fuzzyMatches = keywordMatches.filter(dest => {
      const destNorm = dest.normalizedName || normalizeEntityName(dest.name);
      return destNorm.includes(normalized) || normalized.includes(destNorm);
    });
    
    if (fuzzyMatches.length === 1) {
      const allDests = await db.select().from(destinations);
      return buildResolvedDestination(fuzzyMatches[0], allDests, 75);
    }
    
    // Context-based disambiguation for multiple matches
    if (fuzzyMatches.length > 1 && contextHints?.country) {
      const countryHint = contextHints.country;
      const allDests = await db.select().from(destinations);
      const withContext = fuzzyMatches.filter(dest => {
        const parent = allDests.find(p => p.id === dest.parentDestinationId);
        if (parent && normalizeEntityName(parent.name) === normalizeEntityName(countryHint)) {
          return true;
        }
        return false;
      });
      if (withContext.length === 1) {
        return buildResolvedDestination(withContext[0], allDests, 70);
      }
    }
    
    // Ambiguous - return null (safe behavior)
    if (fuzzyMatches.length > 1) {
      graphLogger.warn("Ambiguous destination match", { nameHint, matchCount: fuzzyMatches.length, matches: fuzzyMatches.map(d => d.name) });
      return null;
    }
    
    if (keywordMatches.length > 1) {
      graphLogger.warn("Ambiguous keyword match", { nameHint, matchCount: keywordMatches.length, matches: keywordMatches.slice(0, 5).map(d => d.name) });
      return null;
    }
    
    if (keywordMatches.length === 1) {
      const allDests = await db.select().from(destinations);
      return buildResolvedDestination(keywordMatches[0], allDests, 60);
    }
  }
  
  graphLogger.warn("Could not resolve destination", { nameHint, keywords });
  return null;
}

/**
 * Get full destination hierarchy for a destination
 */
export async function getDestinationHierarchy(destinationId: string): Promise<ResolvedDestination[]> {
  const allDestinations = await db.select().from(destinations);
  const hierarchy: ResolvedDestination[] = [];
  
  let current = allDestinations.find(d => d.id === destinationId);
  while (current) {
    hierarchy.unshift(buildResolvedDestination(current, allDestinations, 100)!);
    current = current.parentDestinationId 
      ? allDestinations.find(d => d.id === current!.parentDestinationId) 
      : undefined;
  }
  
  return hierarchy;
}

/**
 * Get all children of a destination
 */
export async function getDestinationChildren(destinationId: string): Promise<Destination[]> {
  return await db
    .select()
    .from(destinations)
    .where(eq(destinations.parentDestinationId, destinationId));
}

// ============================================================================
// Entity Linking
// ============================================================================

/**
 * Link an entity (hotel, attraction, etc.) to a destination
 */
export async function linkEntityToDestination(
  entityType: EntityLocation["entityType"],
  entityId: string,
  destinationId: string,
  confidence: number = 100,
  source: LinkResult["source"] = "manual"
): Promise<LinkResult> {
  try {
    switch (entityType) {
      case "hotel":
        await db.update(hotels).set({ destinationId }).where(eq(hotels.id, entityId));
        break;
      case "attraction":
        await db.update(attractions).set({ destinationId }).where(eq(attractions.id, entityId));
        break;
      case "district":
        await db.update(districts).set({ destinationId }).where(eq(districts.id, entityId));
        break;
      case "dining":
        await db.update(dining).set({ destinationId }).where(eq(dining.id, entityId));
        break;
      default:
        graphLogger.warn("Unknown entity type for linking", { entityType, entityId });
        return { success: false, entityId, districtIds: [], confidence: 0, source };
    }
    
    graphLogger.info("Linked entity to destination", { entityType, entityId, destinationId, confidence, source });
    return { success: true, entityId, destinationId, districtIds: [], confidence, source };
  } catch (error: any) {
    graphLogger.error("Failed to link entity", { entityType, entityId, error: error.message });
    return { success: false, entityId, districtIds: [], confidence: 0, source };
  }
}

/**
 * Link a hotel to one or more districts
 */
export async function linkHotelToDistricts(
  hotelId: string,
  districtIds: string[],
  confidence: number = 100,
  source: string = "manual"
): Promise<{ success: boolean; linked: number }> {
  try {
    let linked = 0;
    for (const districtId of districtIds) {
      const existing = await db
        .select()
        .from(hotelDistricts)
        .where(and(
          eq(hotelDistricts.hotelId, hotelId),
          eq(hotelDistricts.districtId, districtId)
        ))
        .limit(1);
      
      if (!existing.length) {
        await db.insert(hotelDistricts).values({
          hotelId,
          districtId,
          confidence,
          source,
        });
        linked++;
      }
    }
    
    graphLogger.info("Linked hotel to districts", { hotelId, districtIds, linked });
    return { success: true, linked };
  } catch (error: any) {
    graphLogger.error("Failed to link hotel to districts", { hotelId, error: error.message });
    return { success: false, linked: 0 };
  }
}

/**
 * Auto-resolve and link entities from extraction results
 */
export async function autoResolveEntityLinks(
  entities: Array<{
    type: EntityLocation["entityType"];
    id: string;
    name: string;
    locationHint?: string;
    districtHint?: string;
  }>,
  defaultDestinationId?: string
): Promise<LinkResult[]> {
  const results: LinkResult[] = [];
  
  for (const entity of entities) {
    let destinationId = defaultDestinationId;
    let confidence = 50;
    let source: LinkResult["source"] = "hierarchy_inference";
    const districtIds: string[] = [];
    
    if (entity.locationHint) {
      const resolved = await resolveDestination(entity.locationHint);
      if (resolved) {
        destinationId = resolved.id;
        confidence = resolved.confidence;
        source = resolved.confidence >= 90 ? "exact_match" : "fuzzy_match";
      }
    }
    
    if (entity.districtHint && entity.type === "hotel") {
      const districtResult = await resolveDistrict(entity.districtHint, destinationId);
      if (districtResult) {
        districtIds.push(districtResult.id);
      }
    }
    
    if (destinationId) {
      const linkResult = await linkEntityToDestination(entity.type, entity.id, destinationId, confidence, source);
      
      if (entity.type === "hotel" && districtIds.length > 0) {
        await linkHotelToDistricts(entity.id, districtIds, confidence, source);
      }
      
      results.push({
        ...linkResult,
        districtIds,
      });
    } else {
      results.push({
        success: false,
        entityId: entity.id,
        districtIds: [],
        confidence: 0,
        source: "hierarchy_inference",
      });
    }
  }
  
  return results;
}

// ============================================================================
// District Resolution
// ============================================================================

/**
 * Resolve a district from name hint within a destination
 * Note: District name comes from the related contents table
 */
export async function resolveDistrict(
  nameHint: string,
  destinationId?: string
): Promise<District | null> {
  const normalized = normalizeEntityName(nameHint);
  
  const query = db
    .select({
      district: districts,
      contentTitle: contents.title,
    })
    .from(districts)
    .leftJoin(contents, eq(districts.contentId, contents.id));
  
  if (destinationId) {
    const allDistricts = await query.where(eq(districts.destinationId, destinationId));
    for (const row of allDistricts) {
      const name = row.contentTitle || row.district.neighborhood || "";
      if (normalizeEntityName(name) === normalized) {
        return row.district;
      }
    }
    const fuzzy = allDistricts.filter(row => {
      const name = row.contentTitle || row.district.neighborhood || "";
      const normalizedName = normalizeEntityName(name);
      return normalizedName.includes(normalized) || normalized.includes(normalizedName);
    });
    if (fuzzy.length === 1) return fuzzy[0].district;
  }
  
  const allDistricts = await query;
  for (const row of allDistricts) {
    const name = row.contentTitle || row.district.neighborhood || "";
    if (normalizeEntityName(name) === normalized) {
      return row.district;
    }
  }
  
  return null;
}

// ============================================================================
// Graph Traversal
// ============================================================================

/**
 * Get all entities within a destination (hotels, attractions, districts, dining)
 */
export async function getDestinationEntities(destinationId: string): Promise<{
  hotels: Hotel[];
  attractions: Attraction[];
  districts: District[];
  dining: Dining[];
}> {
  const [hotelResults, attractionResults, districtResults, diningResults] = await Promise.all([
    db.select().from(hotels).where(eq(hotels.destinationId, destinationId)),
    db.select().from(attractions).where(eq(attractions.destinationId, destinationId)),
    db.select().from(districts).where(eq(districts.destinationId, destinationId)),
    db.select().from(dining).where(eq(dining.destinationId, destinationId)),
  ]);
  
  return {
    hotels: hotelResults,
    attractions: attractionResults,
    districts: districtResults,
    dining: diningResults,
  };
}

/**
 * Get hotels in a specific district
 */
export async function getHotelsInDistrict(districtId: string): Promise<Hotel[]> {
  const junctions = await db
    .select({ hotelId: hotelDistricts.hotelId })
    .from(hotelDistricts)
    .where(eq(hotelDistricts.districtId, districtId));
  
  if (!junctions.length) return [];
  
  const hotelIds = junctions.map(j => j.hotelId);
  return await db
    .select()
    .from(hotels)
    .where(inArray(hotels.id, hotelIds));
}

/**
 * Get districts for a hotel
 */
export async function getDistrictsForHotel(hotelId: string): Promise<District[]> {
  const junctions = await db
    .select({ districtId: hotelDistricts.districtId })
    .from(hotelDistricts)
    .where(eq(hotelDistricts.hotelId, hotelId));
  
  if (!junctions.length) return [];
  
  const districtIds = junctions.map(j => j.districtId);
  return await db
    .select()
    .from(districts)
    .where(inArray(districts.id, districtIds));
}

/**
 * Build a graph representation of all entities for a destination
 */
export async function buildDestinationGraph(destinationId: string): Promise<GraphNode[]> {
  const nodes: GraphNode[] = [];
  
  const [dest] = await db.select().from(destinations).where(eq(destinations.id, destinationId)).limit(1);
  if (!dest) return nodes;
  
  const destNode: GraphNode = {
    id: dest.id,
    type: "destination",
    name: dest.name,
    edges: [],
  };
  
  const entities = await getDestinationEntities(destinationId);
  
  for (const district of entities.districts) {
    const districtNode: GraphNode = {
      id: district.id,
      type: "district",
      name: district.neighborhood || district.location || district.id,
      edges: [{ targetId: dest.id, targetType: "destination", relationship: "located_in", confidence: 100 }],
    };
    nodes.push(districtNode);
    destNode.edges.push({ targetId: district.id, targetType: "district", relationship: "contains", confidence: 100 });
  }
  
  for (const hotel of entities.hotels) {
    const hotelDistricts = await getDistrictsForHotel(hotel.id);
    const hotelNode: GraphNode = {
      id: hotel.id,
      type: "hotel",
      name: hotel.location || hotel.id,
      edges: [
        { targetId: dest.id, targetType: "destination", relationship: "located_in", confidence: 100 },
        ...hotelDistricts.map(d => ({
          targetId: d.id,
          targetType: "district" as const,
          relationship: "located_in" as const,
          confidence: 80,
        })),
      ],
    };
    nodes.push(hotelNode);
    destNode.edges.push({ targetId: hotel.id, targetType: "hotel", relationship: "contains", confidence: 100 });
  }
  
  for (const attraction of entities.attractions) {
    const attractionNode: GraphNode = {
      id: attraction.id,
      type: "attraction",
      name: attraction.location || attraction.id,
      edges: [{ targetId: dest.id, targetType: "destination", relationship: "located_in", confidence: 100 }],
    };
    nodes.push(attractionNode);
    destNode.edges.push({ targetId: attraction.id, targetType: "attraction", relationship: "contains", confidence: 100 });
  }
  
  for (const diningItem of entities.dining) {
    const diningNode: GraphNode = {
      id: diningItem.id,
      type: "dining",
      name: diningItem.location || diningItem.cuisineType || diningItem.id,
      edges: [{ targetId: dest.id, targetType: "destination", relationship: "located_in", confidence: 100 }],
    };
    nodes.push(diningNode);
    destNode.edges.push({ targetId: diningItem.id, targetType: "dining", relationship: "contains", confidence: 100 });
  }
  
  nodes.push(destNode);
  return nodes;
}

/**
 * Get entity counts for a destination (for display)
 */
export async function getDestinationEntityCounts(destinationId: string): Promise<{
  hotels: number;
  attractions: number;
  districts: number;
  dining: number;
  articles: number;
}> {
  const [hotelCount, attractionCount, districtCount, diningCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(hotels).where(eq(hotels.destinationId, destinationId)),
    db.select({ count: sql<number>`count(*)` }).from(attractions).where(eq(attractions.destinationId, destinationId)),
    db.select({ count: sql<number>`count(*)` }).from(districts).where(eq(districts.destinationId, destinationId)),
    db.select({ count: sql<number>`count(*)` }).from(dining).where(eq(dining.destinationId, destinationId)),
  ]);
  
  return {
    hotels: Number(hotelCount[0]?.count ?? 0),
    attractions: Number(attractionCount[0]?.count ?? 0),
    districts: Number(districtCount[0]?.count ?? 0),
    dining: Number(diningCount[0]?.count ?? 0),
    articles: 0,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Normalize entity name for comparison
 */
export function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function findParent(destId: string, allDests: Destination[]): Destination | undefined {
  const dest = allDests.find(d => d.id === destId);
  if (!dest?.parentDestinationId) return undefined;
  return allDests.find(d => d.id === dest.parentDestinationId);
}

function buildResolvedDestination(
  dest: Destination,
  allDests: Destination[],
  confidence: number
): ResolvedDestination | null {
  if (!dest) return null;
  
  const hierarchy: string[] = [dest.name];
  let current = dest;
  while (current.parentDestinationId) {
    const parent = allDests.find(d => d.id === current.parentDestinationId);
    if (parent) {
      hierarchy.unshift(parent.name);
      current = parent;
    } else {
      break;
    }
  }
  
  let level: ResolvedDestination["level"] = "area";
  if (!dest.parentDestinationId) level = "country";
  else if (hierarchy.length === 2) level = "city";
  
  return {
    id: dest.id,
    name: dest.name,
    slug: dest.slug,
    level,
    parentId: dest.parentDestinationId ?? undefined,
    hierarchy,
    confidence,
  };
}

// ============================================================================
// Exports for Queue Integration
// ============================================================================

export const GraphResolver = {
  resolveDestination,
  getDestinationHierarchy,
  getDestinationChildren,
  linkEntityToDestination,
  linkHotelToDistricts,
  autoResolveEntityLinks,
  resolveDistrict,
  getDestinationEntities,
  getHotelsInDistrict,
  getDistrictsForHotel,
  buildDestinationGraph,
  getDestinationEntityCounts,
  normalizeEntityName,
};
