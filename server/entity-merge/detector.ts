/**
 * Duplicate Detection Service
 *
 * Scans entities for potential duplicates using name similarity,
 * location matching, and known alias patterns.
 *
 * FEATURE 4: Entity Merge & Canonicalization
 */

import { db } from "../db";
import { contents, destinations, attractions, hotels, articles } from "@shared/schema";
import { eq, and, or, ne, sql, desc } from "drizzle-orm";
import {
  type MergeableEntityType,
  type DuplicatePair,
  type MatchType,
  type DetectionOptions,
  type DetectionResult,
  normalizeName,
  calculateSimilarity,
  KNOWN_ALIASES,
  isEntityMergeEnabled,
} from "./types";

/**
 * Default similarity threshold for fuzzy matching
 */
const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

/**
 * Detect duplicate destinations
 */
async function detectDestinationDuplicates(
  minSimilarity: number = DEFAULT_SIMILARITY_THRESHOLD
): Promise<DuplicatePair[]> {
  const duplicates: DuplicatePair[] = [];

  // Get all active destinations
  const allDestinations = await db
    .select({
      id: destinations.id,
      name: destinations.name,
      slug: destinations.slug,
      normalizedName: destinations.normalizedName,
      country: destinations.country,
      status: destinations.status,
      createdAt: destinations.createdAt,
      updatedAt: destinations.updatedAt,
    })
    .from(destinations)
    .where(eq(destinations.isActive, true))
    .orderBy(destinations.name);

  // Compare all pairs (O(n²) but destinations are typically < 1000)
  for (let i = 0; i < allDestinations.length; i++) {
    for (let j = i + 1; j < allDestinations.length; j++) {
      const destA = allDestinations[i];
      const destB = allDestinations[j];

      const result = compareEntities(
        {
          id: destA.id,
          name: destA.name,
          slug: destA.slug,
          location: destA.country,
          status: destA.status,
          createdAt: destA.createdAt,
          updatedAt: destA.updatedAt,
        },
        {
          id: destB.id,
          name: destB.name,
          slug: destB.slug,
          location: destB.country,
          status: destB.status,
          createdAt: destB.createdAt,
          updatedAt: destB.updatedAt,
        },
        'destination',
        minSimilarity
      );

      if (result) {
        duplicates.push(result);
      }
    }
  }

  return duplicates;
}

/**
 * Detect duplicate content (attractions, hotels, articles)
 */
async function detectContentDuplicates(
  contentType: 'attraction' | 'hotel' | 'article',
  minSimilarity: number = DEFAULT_SIMILARITY_THRESHOLD
): Promise<DuplicatePair[]> {
  const duplicates: DuplicatePair[] = [];

  // Get all content of the specified type with their specific data
  const contentItems = await db
    .select({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
      status: contents.status,
      createdAt: contents.createdAt,
      updatedAt: contents.updatedAt,
    })
    .from(contents)
    .where(eq(contents.type, contentType))
    .orderBy(contents.title);

  // Get location data for content types that have it
  let locationMap: Map<string, string | null> = new Map();

  if (contentType === 'attraction') {
    const attractionData = await db
      .select({ contentId: attractions.contentId, location: attractions.location })
      .from(attractions);
    attractionData.forEach(a => locationMap.set(a.contentId, a.location));
  } else if (contentType === 'hotel') {
    const hotelData = await db
      .select({ contentId: hotels.contentId, location: hotels.location })
      .from(hotels);
    hotelData.forEach(h => locationMap.set(h.contentId, h.location));
  }

  // Compare all pairs
  for (let i = 0; i < contentItems.length; i++) {
    for (let j = i + 1; j < contentItems.length; j++) {
      const itemA = contentItems[i];
      const itemB = contentItems[j];

      const result = compareEntities(
        {
          id: itemA.id,
          name: itemA.title,
          slug: itemA.slug,
          location: locationMap.get(itemA.id) || undefined,
          status: itemA.status,
          createdAt: itemA.createdAt,
          updatedAt: itemA.updatedAt,
        },
        {
          id: itemB.id,
          name: itemB.title,
          slug: itemB.slug,
          location: locationMap.get(itemB.id) || undefined,
          status: itemB.status,
          createdAt: itemB.createdAt,
          updatedAt: itemB.updatedAt,
        },
        contentType,
        minSimilarity
      );

      if (result) {
        duplicates.push(result);
      }
    }
  }

  return duplicates;
}

/**
 * Compare two entities for duplicate detection
 */
function compareEntities(
  entityA: { id: string; name: string; slug: string; location?: string; status: string; createdAt: Date | null; updatedAt: Date | null },
  entityB: { id: string; name: string; slug: string; location?: string; status: string; createdAt: Date | null; updatedAt: Date | null },
  entityType: MergeableEntityType,
  minSimilarity: number
): DuplicatePair | null {
  const normalizedA = normalizeName(entityA.name);
  const normalizedB = normalizeName(entityB.name);

  // Check for exact match
  if (normalizedA === normalizedB) {
    return createDuplicatePair(entityA, entityB, entityType, 'exact_name', 1.0);
  }

  // Check for same slug
  if (entityA.slug === entityB.slug) {
    return createDuplicatePair(entityA, entityB, entityType, 'same_slug', 1.0);
  }

  // Check for known aliases
  const aliasMatch = checkAliasMatch(normalizedA, normalizedB);
  if (aliasMatch) {
    return createDuplicatePair(entityA, entityB, entityType, 'alias_match', 0.95);
  }

  // Check for same location + similar name
  if (
    entityA.location &&
    entityB.location &&
    normalizeName(entityA.location) === normalizeName(entityB.location)
  ) {
    const nameSimilarity = calculateSimilarity(entityA.name, entityB.name);
    if (nameSimilarity >= 0.7) {
      return createDuplicatePair(entityA, entityB, entityType, 'same_location_name', nameSimilarity);
    }
  }

  // Check for fuzzy name match
  const similarity = calculateSimilarity(entityA.name, entityB.name);
  if (similarity >= minSimilarity) {
    return createDuplicatePair(entityA, entityB, entityType, 'fuzzy_name', similarity);
  }

  return null;
}

/**
 * Check if two names are known aliases of each other
 */
function checkAliasMatch(nameA: string, nameB: string): boolean {
  for (const [canonical, aliases] of Object.entries(KNOWN_ALIASES)) {
    const allForms = [canonical, ...aliases];
    const matchA = allForms.includes(nameA);
    const matchB = allForms.includes(nameB);
    if (matchA && matchB && nameA !== nameB) {
      return true;
    }
  }
  return false;
}

/**
 * Create a duplicate pair result
 */
function createDuplicatePair(
  entityA: { id: string; name: string; slug: string; location?: string; status: string; createdAt: Date | null; updatedAt: Date | null },
  entityB: { id: string; name: string; slug: string; location?: string; status: string; createdAt: Date | null; updatedAt: Date | null },
  entityType: MergeableEntityType,
  matchType: MatchType,
  similarity: number
): DuplicatePair {
  const reasons: string[] = [];
  let suggestedAction: 'merge' | 'review' | 'ignore' = 'review';
  let confidence: 'high' | 'medium' | 'low' = 'medium';

  // Determine confidence and suggested action
  if (matchType === 'exact_name' || matchType === 'same_slug') {
    confidence = 'high';
    suggestedAction = 'merge';
    reasons.push(`Exact ${matchType === 'exact_name' ? 'name' : 'slug'} match detected`);
  } else if (matchType === 'alias_match') {
    confidence = 'high';
    suggestedAction = 'merge';
    reasons.push('Known alias pattern detected');
  } else if (matchType === 'same_location_name') {
    confidence = similarity >= 0.9 ? 'high' : 'medium';
    suggestedAction = similarity >= 0.9 ? 'merge' : 'review';
    reasons.push(`Same location with ${(similarity * 100).toFixed(0)}% name similarity`);
  } else if (matchType === 'fuzzy_name') {
    confidence = similarity >= 0.95 ? 'high' : (similarity >= 0.9 ? 'medium' : 'low');
    suggestedAction = similarity >= 0.95 ? 'merge' : 'review';
    reasons.push(`Fuzzy name match: ${(similarity * 100).toFixed(0)}% similar`);
  }

  // Add status-based reasoning
  if (entityA.status === 'draft' && entityB.status === 'published') {
    reasons.push('Draft might be duplicate of published content');
    suggestedAction = 'merge';
  } else if (entityA.status === 'published' && entityB.status === 'draft') {
    reasons.push('Published content has potential draft duplicate');
    suggestedAction = 'merge';
  }

  return {
    entityType,
    entityA: {
      id: entityA.id,
      name: entityA.name,
      slug: entityA.slug,
      location: entityA.location,
      status: entityA.status,
      createdAt: entityA.createdAt,
      updatedAt: entityA.updatedAt,
    },
    entityB: {
      id: entityB.id,
      name: entityB.name,
      slug: entityB.slug,
      location: entityB.location,
      status: entityB.status,
      createdAt: entityB.createdAt,
      updatedAt: entityB.updatedAt,
    },
    matchType,
    similarity,
    confidence,
    suggestedAction,
    reasons,
  };
}

/**
 * Main detection function - scans for duplicates across entity types
 */
export async function detectDuplicates(
  options: DetectionOptions = {}
): Promise<DetectionResult> {
  const { entityType, minSimilarity = DEFAULT_SIMILARITY_THRESHOLD, limit = 100 } = options;

  const allDuplicates: DuplicatePair[] = [];
  let totalScanned = 0;

  if (!entityType || entityType === 'destination') {
    const destDups = await detectDestinationDuplicates(minSimilarity);
    allDuplicates.push(...destDups);
    totalScanned += destDups.length;
  }

  if (!entityType || entityType === 'attraction') {
    const attrDups = await detectContentDuplicates('attraction', minSimilarity);
    allDuplicates.push(...attrDups);
    totalScanned += attrDups.length;
  }

  if (!entityType || entityType === 'hotel') {
    const hotelDups = await detectContentDuplicates('hotel', minSimilarity);
    allDuplicates.push(...hotelDups);
    totalScanned += hotelDups.length;
  }

  if (!entityType || entityType === 'article') {
    const articleDups = await detectContentDuplicates('article', minSimilarity);
    allDuplicates.push(...articleDups);
    totalScanned += articleDups.length;
  }

  // Sort by confidence and similarity
  const sorted = allDuplicates.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (confDiff !== 0) return confDiff;
    return b.similarity - a.similarity;
  });

  return {
    duplicates: sorted.slice(0, limit),
    totalScanned,
    detectedAt: new Date(),
  };
}

/**
 * Check if a specific entity has duplicates
 */
export async function findDuplicatesFor(
  entityId: string,
  entityType: MergeableEntityType
): Promise<DuplicatePair[]> {
  const result = await detectDuplicates({ entityType });
  return result.duplicates.filter(
    dup => dup.entityA.id === entityId || dup.entityB.id === entityId
  );
}

/**
 * Get duplicate detection stats
 */
export async function getDuplicateStats(): Promise<{
  byType: Record<MergeableEntityType, number>;
  byConfidence: Record<'high' | 'medium' | 'low', number>;
  total: number;
}> {
  const result = await detectDuplicates({ limit: 1000 });

  const byType: Record<MergeableEntityType, number> = {
    destination: 0,
    attraction: 0,
    hotel: 0,
    article: 0,
  };

  const byConfidence: Record<'high' | 'medium' | 'low', number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const dup of result.duplicates) {
    byType[dup.entityType]++;
    byConfidence[dup.confidence]++;
  }

  return {
    byType,
    byConfidence,
    total: result.duplicates.length,
  };
}
