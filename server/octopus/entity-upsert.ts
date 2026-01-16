/**
 * Octopus Entity Upsert + Merge
 * Phase 4: Identity, hash, diff, and smart merge logic for extracted entities
 * 
 * Key features:
 * - Entity fingerprinting for duplicate detection
 * - Smart upsert with merge (not overwrite)
 * - Diff tracking for change detection
 * - Batch processing for efficiency
 */

import { db } from "../db";
import {
  contents,
  hotels,
  attractions,
  dining,
  districts,
  type Content,
  type Hotel,
  type Attraction,
  type Dining,
  type District,
} from "@shared/schema";
import { eq, and, or, ilike, inArray, sql } from "drizzle-orm";
import { log } from "../lib/logger";
import { resolveDestination, normalizeEntityName } from "./graph-resolver";
import type { ExtractedEntity, EntityType as ExtractorEntityType } from "./entity-extractor";
import crypto from "crypto";

const upsertLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[EntityUpsert] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[EntityUpsert] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[EntityUpsert] ${msg}`, data),
};

// ============================================================================
// Types
// ============================================================================

export type EntityTable = "hotel" | "attraction" | "dining" | "district";

export interface EntityFingerprint {
  hash: string;
  normalizedName: string;
  type: EntityTable;
  destinationId: string | null;
}

export interface UpsertResult {
  entityId: string;
  contentId: string;
  type: EntityTable;
  action: "created" | "updated" | "unchanged";
  fingerprint: string;
  changes?: string[];
}

export interface MergeResult {
  merged: boolean;
  changes: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export interface BatchUpsertResult {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
  results: UpsertResult[];
  errorDetails: Array<{ entity: string; error: string }>;
}

// ============================================================================
// Entity Fingerprinting
// ============================================================================

/**
 * Map extracted entity types to our table types
 */
function mapExtractorTypeToTableType(extractorType: ExtractorEntityType): EntityTable | null {
  switch (extractorType) {
    case "hotel":
      return "hotel";
    case "restaurant":
    case "cafe":
    case "bar":
      return "dining";
    case "attraction":
    case "beach":
    case "mall":
    case "museum":
    case "park":
    case "landmark":
    case "temple":
    case "market":
    case "rooftop":
    case "spa":
    case "club":
    case "transit_hub":
    case "hospital":
    case "festival":
    case "shopping_district":
      return "attraction";
    case "neighborhood":
      return "district";
    default:
      return null;
  }
}

/**
 * Generate a fingerprint hash for an entity
 * Used to detect duplicates across extractions
 */
export function generateFingerprint(
  name: string,
  type: EntityTable,
  destinationId: string | null
): EntityFingerprint {
  const normalized = normalizeEntityName(name);
  const input = `${normalized}:${type}:${destinationId || "global"}`;
  const hash = crypto.createHash("sha256").update(input).digest("hex").substring(0, 16);
  
  return {
    hash,
    normalizedName: normalized,
    type,
    destinationId,
  };
}

/**
 * Generate a content hash for change detection
 * Used to determine if entity data has changed
 */
export function generateContentHash(data: Record<string, unknown>): string {
  const sorted = Object.keys(data)
    .sort()
    .reduce((acc, key) => {
      const value = data[key];
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);
  
  return crypto.createHash("sha256").update(JSON.stringify(sorted)).digest("hex").substring(0, 16);
}

// ============================================================================
// Entity Lookup
// ============================================================================

/**
 * Find existing content by fingerprint hash (indexed lookup)
 * Uses sourceHash column for fast duplicate detection
 */
export async function findExistingEntity(
  fingerprint: EntityFingerprint
): Promise<{ content: Content; entityId: string } | null> {
  const { hash, type, destinationId } = fingerprint;
  
  // Step 1: Try indexed lookup by sourceHash (fastest path)
  const hashMatch = await db
    .select()
    .from(contents)
    .where(and(
      eq(contents.sourceHash, hash),
      eq(contents.type, type)
    ))
    .limit(1);
  
  if (hashMatch.length > 0) {
    const content = hashMatch[0];
    const entityId = await getEntityIdForContent(content.id, type);
    if (entityId) {
      return { content, entityId };
    }
  }
  
  // Step 2: Fallback to slug-based lookup (destination-scoped)
  const slugBase = `/${type}/${fingerprint.normalizedName}`;
  const slugWithDest = destinationId 
    ? `/${type}/${destinationId}/${fingerprint.normalizedName}`
    : slugBase;
  
  const slugMatch = await db
    .select()
    .from(contents)
    .where(and(
      eq(contents.type, type),
      or(
        eq(contents.slug, slugBase),
        eq(contents.slug, slugWithDest)
      )
    ))
    .limit(1);
  
  if (slugMatch.length > 0) {
    const content = slugMatch[0];
    const entityId = await getEntityIdForContent(content.id, type);
    if (entityId) {
      return { content, entityId };
    }
  }
  
  return null;
}

/**
 * Get the entity ID for a content record by type
 */
async function getEntityIdForContent(
  contentId: string,
  type: EntityTable
): Promise<string | null> {
  if (type === "hotel") {
    const [result] = await db.select({ id: hotels.id })
      .from(hotels)
      .where(eq(hotels.contentId, contentId))
      .limit(1);
    return result?.id || null;
  } else if (type === "attraction") {
    const [result] = await db.select({ id: attractions.id })
      .from(attractions)
      .where(eq(attractions.contentId, contentId))
      .limit(1);
    return result?.id || null;
  } else if (type === "dining") {
    const [result] = await db.select({ id: dining.id })
      .from(dining)
      .where(eq(dining.contentId, contentId))
      .limit(1);
    return result?.id || null;
  } else if (type === "district") {
    const [result] = await db.select({ id: districts.id })
      .from(districts)
      .where(eq(districts.contentId, contentId))
      .limit(1);
    return result?.id || null;
  }
  return null;
}

// ============================================================================
// Smart Merge Logic - Schema-Aware
// ============================================================================

/**
 * Check if two values are semantically different
 */
function isDifferent(oldValue: unknown, newValue: unknown): boolean {
  if (oldValue === newValue) return false;
  if (oldValue === null || oldValue === undefined || oldValue === "") {
    return newValue !== null && newValue !== undefined && newValue !== "";
  }
  if (newValue === null || newValue === undefined || newValue === "") {
    return false; // Don't overwrite with empty
  }
  return JSON.stringify(oldValue) !== JSON.stringify(newValue);
}

/**
 * Merge object arrays by a key field (e.g., label, icon)
 */
function mergeObjectArrays(
  oldArr: Record<string, unknown>[],
  newArr: Record<string, unknown>[],
  keyField: string = "label"
): { merged: Record<string, unknown>[]; added: number; updated: number } {
  const result: Record<string, unknown>[] = [...oldArr];
  const existingKeys = new Map<string, number>();
  
  oldArr.forEach((item, index) => {
    const key = String(item[keyField] || "");
    if (key) existingKeys.set(key.toLowerCase(), index);
  });
  
  let added = 0;
  let updated = 0;
  
  for (const newItem of newArr) {
    const key = String(newItem[keyField] || "").toLowerCase();
    if (!key) continue;
    
    const existingIndex = existingKeys.get(key);
    if (existingIndex !== undefined) {
      // Update existing item
      const oldItem = result[existingIndex];
      const merged = { ...oldItem, ...newItem };
      if (JSON.stringify(merged) !== JSON.stringify(oldItem)) {
        result[existingIndex] = merged;
        updated++;
      }
    } else {
      // Add new item
      result.push(newItem);
      existingKeys.set(key, result.length - 1);
      added++;
    }
  }
  
  return { merged: result, added, updated };
}

/**
 * Merge string arrays with deduplication
 */
function mergeStringArrays(oldArr: string[], newArr: string[]): { merged: string[]; added: number } {
  const existing = new Set(oldArr.map(s => s.toLowerCase()));
  const result = [...oldArr];
  let added = 0;
  
  for (const item of newArr) {
    if (!existing.has(item.toLowerCase())) {
      result.push(item);
      existing.add(item.toLowerCase());
      added++;
    }
  }
  
  return { merged: result, added };
}

/**
 * Schema-aware merge that propagates updates
 * - Primitives: Update if different and incoming is not empty
 * - String arrays: Merge unique values
 * - Object arrays: Merge by key field (label)
 */
export function smartMerge(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  options: { alwaysUpdate?: boolean } = {}
): MergeResult {
  const merged: Record<string, unknown> = { ...existing };
  const changes: string[] = [];
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  const alwaysUpdate = options.alwaysUpdate ?? true;
  
  for (const [key, newValue] of Object.entries(incoming)) {
    const oldValue = existing[key];
    
    // Skip undefined/null/empty incoming values
    if (newValue === undefined || newValue === null) continue;
    if (newValue === "" && oldValue) continue;
    
    // Handle string arrays
    if (Array.isArray(oldValue) && Array.isArray(newValue) && 
        typeof oldValue[0] === "string" && typeof newValue[0] === "string") {
      const { merged: mergedArr, added } = mergeStringArrays(
        oldValue as string[],
        newValue as string[]
      );
      if (added > 0) {
        before[key] = oldValue;
        after[key] = mergedArr;
        merged[key] = mergedArr;
        changes.push(`${key}: added ${added} items`);
      }
      continue;
    }
    
    // Handle object arrays (e.g., highlights, amenities)
    if (Array.isArray(oldValue) && Array.isArray(newValue) &&
        typeof oldValue[0] === "object" && typeof newValue[0] === "object") {
      const { merged: mergedArr, added, updated } = mergeObjectArrays(
        oldValue as Record<string, unknown>[],
        newValue as Record<string, unknown>[]
      );
      if (added > 0 || updated > 0) {
        before[key] = oldValue;
        after[key] = mergedArr;
        merged[key] = mergedArr;
        const parts: string[] = [];
        if (added > 0) parts.push(`added ${added}`);
        if (updated > 0) parts.push(`updated ${updated}`);
        changes.push(`${key}: ${parts.join(", ")}`);
      }
      continue;
    }
    
    // Handle empty arrays (new data when old was empty)
    if (Array.isArray(newValue) && newValue.length > 0 &&
        (!Array.isArray(oldValue) || oldValue.length === 0)) {
      before[key] = oldValue;
      after[key] = newValue;
      merged[key] = newValue;
      changes.push(`${key}: set ${newValue.length} items`);
      continue;
    }
    
    // Handle primitives
    if (!isDifferent(oldValue, newValue)) continue;
    
    if (oldValue === undefined || oldValue === null || oldValue === "") {
      // Fill in missing values
      merged[key] = newValue;
      before[key] = oldValue;
      after[key] = newValue;
      changes.push(`${key}: set`);
    } else if (alwaysUpdate) {
      // Update with new value
      merged[key] = newValue;
      before[key] = oldValue;
      after[key] = newValue;
      changes.push(`${key}: updated`);
    }
  }
  
  return {
    merged: changes.length > 0,
    changes,
    before,
    after: merged,
  };
}

// ============================================================================
// Upsert Operations
// ============================================================================

/**
 * Upsert a single extracted entity
 * Creates content + entity record if new, or updates if changed
 */
export async function upsertEntity(
  extracted: ExtractedEntity,
  destinationId: string | null,
  sourceJobId?: string
): Promise<UpsertResult | null> {
  const tableType = mapExtractorTypeToTableType(extracted.type);
  if (!tableType) {
    upsertLogger.warn("Unknown entity type", { type: extracted.type });
    return null;
  }
  
  const fingerprint = generateFingerprint(extracted.name, tableType, destinationId);
  const existing = await findExistingEntity(fingerprint);
  
  if (existing) {
    // Update existing entity
    return await updateExistingEntity(existing, extracted, tableType, fingerprint);
  } else {
    // Create new entity
    return await createNewEntity(extracted, tableType, destinationId, fingerprint, sourceJobId);
  }
}

/**
 * Generate unique slug with collision handling
 */
async function generateUniqueSlug(
  baseSlug: string,
  tableType: EntityTable,
  destinationId: string | null
): Promise<string> {
  // Build destination-scoped slug
  const slugBase = destinationId 
    ? `/${tableType}/${destinationId}/${baseSlug}`
    : `/${tableType}/${baseSlug}`;
  
  // Check if slug exists
  const existing = await db
    .select({ slug: contents.slug })
    .from(contents)
    .where(ilike(contents.slug, `${slugBase}%`))
    .limit(100);
  
  if (existing.length === 0) {
    return slugBase;
  }
  
  // Find next available suffix
  const existingSlugs = new Set(existing.map(e => e.slug));
  if (!existingSlugs.has(slugBase)) {
    return slugBase;
  }
  
  let counter = 2;
  while (existingSlugs.has(`${slugBase}-${counter}`) && counter < 1000) {
    counter++;
  }
  
  return `${slugBase}-${counter}`;
}

/**
 * Create a new entity (content + type-specific record)
 * Uses transaction to ensure atomicity
 */
async function createNewEntity(
  extracted: ExtractedEntity,
  tableType: EntityTable,
  destinationId: string | null,
  fingerprint: EntityFingerprint,
  sourceJobId?: string
): Promise<UpsertResult> {
  // Generate unique slug
  const baseSlug = normalizeEntityName(extracted.name);
  const uniqueSlug = await generateUniqueSlug(baseSlug, tableType, destinationId);
  
  // Use transaction to ensure atomicity
  const result = await db.transaction(async (tx) => {
    // Create content record with sourceHash for duplicate detection
    const [newContent] = await tx.insert(contents).values({
      title: extracted.name,
      slug: uniqueSlug,
      type: tableType,
      status: "draft",
      metaTitle: extracted.name,
      metaDescription: extracted.description?.substring(0, 160),
      secondaryKeywords: extracted.rawMentions?.slice(0, 5) || [],
      octopusJobId: sourceJobId,
      sourceHash: fingerprint.hash,
      generatedByAI: true,
    }).returning();
    
    // Create type-specific record
    let entityId: string;
    
    if (tableType === "hotel") {
      const hotelData = extracted as any;
      const [record] = await tx.insert(hotels).values({
        contentId: newContent.id,
        destinationId,
        location: hotelData.location?.address,
        starRating: hotelData.starRating,
        amenities: hotelData.amenities || [],
        targetAudience: hotelData.targetAudience || [],
      }).returning();
      entityId = record.id;
    } else if (tableType === "attraction") {
      const attractionData = extracted as any;
      const [record] = await tx.insert(attractions).values({
        contentId: newContent.id,
        destinationId,
        location: attractionData.location?.address,
        category: attractionData.category,
        duration: attractionData.duration,
        priceFrom: attractionData.ticketPrice,
        targetAudience: attractionData.targetAudience || [],
        highlights: attractionData.highlights?.map((h: string) => ({
          icon: "star",
          label: h,
          description: "",
        })) || [],
      }).returning();
      entityId = record.id;
    } else if (tableType === "dining") {
      const diningData = extracted as any;
      const [record] = await tx.insert(dining).values({
        contentId: newContent.id,
        destinationId,
        location: diningData.location?.address,
        cuisineType: Array.isArray(diningData.cuisineType) 
          ? diningData.cuisineType.join(", ")
          : diningData.cuisineType,
        priceRange: diningData.priceRange,
        targetAudience: diningData.targetAudience || [],
      }).returning();
      entityId = record.id;
    } else if (tableType === "district") {
      const districtData = extracted as any;
      const [record] = await tx.insert(districts).values({
        contentId: newContent.id,
        destinationId,
        location: districtData.location?.address,
        neighborhood: districtData.name,
        targetAudience: districtData.targetAudience || [],
        highlights: districtData.knownFor?.map((k: string) => ({
          icon: "star",
          label: k,
          description: "",
        })) || [],
      }).returning();
      entityId = record.id;
    } else {
      throw new Error(`Unknown table type: ${tableType}`);
    }
    
    return { contentId: newContent.id, entityId };
  });
  
  upsertLogger.info("Created new entity", {
    type: tableType,
    name: extracted.name,
    entityId: result.entityId,
    contentId: result.contentId,
    fingerprint: fingerprint.hash,
  });
  
  return {
    entityId: result.entityId,
    contentId: result.contentId,
    type: tableType,
    action: "created",
    fingerprint: fingerprint.hash,
  };
}

// Mutable column whitelists per entity type
const HOTEL_MUTABLE_COLUMNS = ["location", "starRating", "numberOfRooms", "amenities", "targetAudience", "highlights"];
const ATTRACTION_MUTABLE_COLUMNS = ["location", "category", "priceFrom", "duration", "targetAudience", "highlights"];
const DINING_MUTABLE_COLUMNS = ["location", "cuisineType", "priceRange", "targetAudience", "highlights"];
const DISTRICT_MUTABLE_COLUMNS = ["location", "neighborhood", "subcategory", "targetAudience", "highlights"];

/**
 * Extract only whitelisted columns from merged data
 */
function pickMutableColumns(
  data: Record<string, unknown>,
  whitelist: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of whitelist) {
    if (data[key] !== undefined) {
      result[key] = data[key];
    }
  }
  return result;
}

/**
 * Format change log message for string array changes
 * Shows "cleared" when array is emptied, otherwise shows added/removed counts
 */
function formatStringArrayChange(
  field: string,
  change: { result: string[]; added: number; removed: number }
): string {
  // Cleared: empty result with items removed
  if (change.result.length === 0 && change.removed > 0) {
    return `${field}: cleared (removed ${change.removed})`;
  }
  // Standard replacement
  return `${field}: replaced (added ${change.added}, removed ${change.removed})`;
}

/**
 * Format change log message for highlights array changes
 * Shows "cleared" when array is emptied, otherwise shows added/updated/removed counts
 */
function formatHighlightsChange(
  field: string,
  change: { result: HighlightItem[]; added: number; updated: number; removed: number }
): string {
  // Cleared: empty result with items removed
  if (change.result.length === 0 && change.removed > 0) {
    return `${field}: cleared (removed ${change.removed})`;
  }
  // Standard replacement
  return `${field}: replaced (added ${change.added}, updated ${change.updated}, removed ${change.removed})`;
}

/**
 * Authoritative replacement for string arrays
 * Distinguishes between undefined/null (no change) and empty array (clear instruction)
 * - undefined or null → preserve existing (return null)
 * - Empty array [] → clear the field (return empty array with removed count)
 * - Non-empty array → replace with new values
 */
function replaceStringArrayIfProvided(
  existing: unknown,
  incoming: unknown
): { result: string[]; added: number; removed: number } | null {
  // undefined or null means "no instruction" - preserve existing
  if (incoming === undefined || incoming === null) return null;
  
  const newArr = Array.isArray(incoming) ? incoming.filter((x): x is string => typeof x === "string") : [];
  const oldArr = Array.isArray(existing) ? existing.filter((x): x is string => typeof x === "string") : [];
  
  // Empty array is an explicit "clear" instruction
  if (newArr.length === 0 && oldArr.length > 0) {
    return { result: [], added: 0, removed: oldArr.length };
  }
  
  // No change if both are empty
  if (newArr.length === 0 && oldArr.length === 0) return null;
  
  // Calculate diff for change tracking
  const existingLower = new Set(oldArr.map(s => s.toLowerCase()));
  const newLower = new Set(newArr.map(s => s.toLowerCase()));
  const added = newArr.filter(s => !existingLower.has(s.toLowerCase())).length;
  const removed = oldArr.filter(s => !newLower.has(s.toLowerCase())).length;
  
  // No effective change
  if (added === 0 && removed === 0) return null;
  
  return { result: newArr, added, removed };
}

/**
 * Highlight object type for entity highlights
 */
interface HighlightItem {
  icon: string;
  label: string;
  description?: string;
}

/**
 * Authoritative replacement for highlight arrays
 * Distinguishes between undefined/null (no change) and empty array (clear instruction)
 * - undefined or null → preserve existing (return null)
 * - Empty array [] → clear the field (return empty array with removed count)
 * - Non-empty array → replace with new values
 */
function replaceHighlightsIfProvided(
  existing: unknown,
  incoming: unknown
): { result: HighlightItem[]; added: number; updated: number; removed: number } | null {
  // undefined or null means "no instruction" - preserve existing
  if (incoming === undefined || incoming === null) return null;
  
  const oldArr: HighlightItem[] = Array.isArray(existing) 
    ? existing.filter((h): h is HighlightItem => 
        typeof h === "object" && h !== null && typeof (h as any).label === "string"
      )
    : [];
  
  const newArr: HighlightItem[] = Array.isArray(incoming)
    ? incoming.filter((h): h is HighlightItem =>
        typeof h === "object" && h !== null && typeof (h as any).label === "string"
      )
    : [];
  
  // Empty array is an explicit "clear" instruction
  if (newArr.length === 0 && oldArr.length > 0) {
    return { result: [], added: 0, updated: 0, removed: oldArr.length };
  }
  
  // No change if both are empty
  if (newArr.length === 0 && oldArr.length === 0) return null;
  
  // Build lookup maps for diff calculation
  const oldByLabel = new Map<string, HighlightItem>();
  const newByLabel = new Map<string, HighlightItem>();
  
  for (const item of oldArr) {
    oldByLabel.set(item.label.toLowerCase(), item);
  }
  
  for (const item of newArr) {
    newByLabel.set(item.label.toLowerCase(), item);
  }
  
  let added = 0;
  let updated = 0;
  let removed = 0;
  
  // Count items in new that weren't in old (added) or were changed (updated)
  for (const newItem of newArr) {
    const labelKey = newItem.label.toLowerCase();
    const oldItem = oldByLabel.get(labelKey);
    
    if (!oldItem) {
      added++;
    } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
      updated++;
    }
  }
  
  // Count items in old that aren't in new (removed)
  for (const oldItem of oldArr) {
    if (!newByLabel.has(oldItem.label.toLowerCase())) {
      removed++;
    }
  }
  
  // If no actual changes, return null
  if (added === 0 && updated === 0 && removed === 0) {
    return null;
  }
  
  // Normalize incoming highlights with default icon
  const result = newArr.map(item => ({
    icon: item.icon || "star",
    label: item.label,
    description: item.description,
  }));
  
  return { result, added, updated, removed };
}

/**
 * Update an existing entity with merged data
 * Uses whitelisted columns to prevent overwriting immutable fields
 */
async function updateExistingEntity(
  existing: { content: Content; entityId: string },
  extracted: ExtractedEntity,
  tableType: EntityTable,
  fingerprint: EntityFingerprint
): Promise<UpsertResult> {
  const changes: string[] = [];
  
  // Update content metadata
  const newDesc = extracted.description?.substring(0, 160);
  const newKeywords = extracted.rawMentions?.slice(0, 5);
  
  const contentUpdates: Record<string, unknown> = {};
  
  if (newDesc && newDesc !== existing.content.metaDescription) {
    contentUpdates.metaDescription = newDesc;
    changes.push("metaDescription: updated");
  }
  
  if (newKeywords !== undefined) {
    const keywordResult = replaceStringArrayIfProvided(existing.content.secondaryKeywords, newKeywords);
    if (keywordResult) {
      contentUpdates.secondaryKeywords = keywordResult.result;
      changes.push(formatStringArrayChange("secondaryKeywords", keywordResult));
    }
  }
  
  if (Object.keys(contentUpdates).length > 0) {
    await db.update(contents)
      .set({ ...contentUpdates, updatedAt: new Date() })
      .where(eq(contents.id, existing.content.id));
  }
  
  // Update type-specific data with whitelisted columns
  if (tableType === "hotel") {
    const [existingHotel] = await db.select().from(hotels).where(eq(hotels.id, existing.entityId));
    if (existingHotel) {
      const hotelData = extracted as any;
      const updates: Record<string, unknown> = {};
      
      const newLocation = hotelData.location?.address;
      if (newLocation && newLocation !== existingHotel.location) {
        updates.location = newLocation;
        changes.push("location: updated");
      }
      
      if (hotelData.starRating && hotelData.starRating !== existingHotel.starRating) {
        updates.starRating = hotelData.starRating;
        changes.push("starRating: updated");
      }
      
      const replacedAmenities = replaceStringArrayIfProvided(existingHotel.amenities, hotelData.amenities);
      if (replacedAmenities) {
        updates.amenities = replacedAmenities.result;
        changes.push(formatStringArrayChange("amenities", replacedAmenities));
      }
      
      const replacedAudience = replaceStringArrayIfProvided(existingHotel.targetAudience, hotelData.targetAudience);
      if (replacedAudience) {
        updates.targetAudience = replacedAudience.result;
        changes.push(formatStringArrayChange("targetAudience", replacedAudience));
      }
      
      if (Object.keys(updates).length > 0) {
        await db.update(hotels).set(updates).where(eq(hotels.id, existing.entityId));
      }
    }
  } else if (tableType === "attraction") {
    const [existingAttraction] = await db.select().from(attractions).where(eq(attractions.id, existing.entityId));
    if (existingAttraction) {
      const attractionData = extracted as any;
      const updates: Record<string, unknown> = {};
      
      const newLocation = attractionData.location?.address;
      if (newLocation && newLocation !== existingAttraction.location) {
        updates.location = newLocation;
        changes.push("location: updated");
      }
      
      if (attractionData.category && attractionData.category !== existingAttraction.category) {
        updates.category = attractionData.category;
        changes.push("category: updated");
      }
      
      if (attractionData.duration && attractionData.duration !== existingAttraction.duration) {
        updates.duration = attractionData.duration;
        changes.push("duration: updated");
      }
      
      const newPriceFrom = attractionData.ticketPrice;
      if (newPriceFrom && newPriceFrom !== existingAttraction.priceFrom) {
        updates.priceFrom = newPriceFrom;
        changes.push("priceFrom: updated");
      }
      
      const replacedAudience = replaceStringArrayIfProvided(existingAttraction.targetAudience, attractionData.targetAudience);
      if (replacedAudience) {
        updates.targetAudience = replacedAudience.result;
        changes.push(formatStringArrayChange("targetAudience", replacedAudience));
      }
      
      const incomingHighlights = attractionData.highlights?.map((h: string | HighlightItem) => 
        typeof h === "string" ? { icon: "star", label: h, description: "" } : h
      );
      const replacedHighlights = replaceHighlightsIfProvided(existingAttraction.highlights, incomingHighlights);
      if (replacedHighlights) {
        updates.highlights = replacedHighlights.result;
        changes.push(formatHighlightsChange("highlights", replacedHighlights));
      }
      
      if (Object.keys(updates).length > 0) {
        await db.update(attractions).set(updates).where(eq(attractions.id, existing.entityId));
      }
    }
  } else if (tableType === "dining") {
    const [existingDining] = await db.select().from(dining).where(eq(dining.id, existing.entityId));
    if (existingDining) {
      const diningData = extracted as any;
      const updates: Record<string, unknown> = {};
      
      const newLocation = diningData.location?.address;
      if (newLocation && newLocation !== existingDining.location) {
        updates.location = newLocation;
        changes.push("location: updated");
      }
      
      const newCuisine = Array.isArray(diningData.cuisineType)
        ? diningData.cuisineType.join(", ")
        : diningData.cuisineType;
      
      if (newCuisine && newCuisine !== existingDining.cuisineType) {
        updates.cuisineType = newCuisine;
        changes.push("cuisineType: updated");
      }
      
      if (diningData.priceRange && diningData.priceRange !== existingDining.priceRange) {
        updates.priceRange = diningData.priceRange;
        changes.push("priceRange: updated");
      }
      
      const replacedAudience = replaceStringArrayIfProvided(existingDining.targetAudience, diningData.targetAudience);
      if (replacedAudience) {
        updates.targetAudience = replacedAudience.result;
        changes.push(formatStringArrayChange("targetAudience", replacedAudience));
      }
      
      const incomingHighlights = diningData.highlights?.map((h: string | HighlightItem) => 
        typeof h === "string" ? { icon: "star", label: h, description: "" } : h
      );
      const replacedHighlights = replaceHighlightsIfProvided(existingDining.highlights, incomingHighlights);
      if (replacedHighlights) {
        updates.highlights = replacedHighlights.result;
        changes.push(formatHighlightsChange("highlights", replacedHighlights));
      }
      
      if (Object.keys(updates).length > 0) {
        await db.update(dining).set(updates).where(eq(dining.id, existing.entityId));
      }
    }
  } else if (tableType === "district") {
    const [existingDistrict] = await db.select().from(districts).where(eq(districts.id, existing.entityId));
    if (existingDistrict) {
      const districtData = extracted as any;
      const updates: Record<string, unknown> = {};
      
      const newLocation = districtData.location?.address;
      if (newLocation && newLocation !== existingDistrict.location) {
        updates.location = newLocation;
        changes.push("location: updated");
      }
      
      if (districtData.name && districtData.name !== existingDistrict.neighborhood) {
        updates.neighborhood = districtData.name;
        changes.push("neighborhood: updated");
      }
      
      const replacedAudience = replaceStringArrayIfProvided(existingDistrict.targetAudience, districtData.targetAudience);
      if (replacedAudience) {
        updates.targetAudience = replacedAudience.result;
        changes.push(formatStringArrayChange("targetAudience", replacedAudience));
      }
      
      const incomingHighlights = districtData.knownFor?.map((k: string | HighlightItem) => 
        typeof k === "string" ? { icon: "star", label: k, description: "" } : k
      );
      const replacedHighlights = replaceHighlightsIfProvided(existingDistrict.highlights, incomingHighlights);
      if (replacedHighlights) {
        updates.highlights = replacedHighlights.result;
        changes.push(formatHighlightsChange("highlights", replacedHighlights));
      }
      
      if (Object.keys(updates).length > 0) {
        await db.update(districts).set(updates).where(eq(districts.id, existing.entityId));
      }
    }
  }
  
  const action = changes.length > 0 ? "updated" : "unchanged";
  
  if (action === "updated") {
    upsertLogger.info("Updated entity", {
      type: tableType,
      name: extracted.name,
      entityId: existing.entityId,
      changes,
    });
  }
  
  return {
    entityId: existing.entityId,
    contentId: existing.content.id,
    type: tableType,
    action,
    fingerprint: fingerprint.hash,
    changes,
  };
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Upsert multiple entities in batch
 * Resolves destination for each entity and processes efficiently
 */
export async function batchUpsertEntities(
  entities: ExtractedEntity[],
  destinationHint: string | null,
  sourceJobId?: string
): Promise<BatchUpsertResult> {
  const results: UpsertResult[] = [];
  const errorDetails: Array<{ entity: string; error: string }> = [];
  let created = 0, updated = 0, unchanged = 0, errors = 0;
  
  // Resolve destination once for the batch
  let resolvedDestinationId: string | null = null;
  if (destinationHint) {
    const resolved = await resolveDestination(destinationHint);
    resolvedDestinationId = resolved?.id || null;
  }
  
  upsertLogger.info("Starting batch upsert", {
    total: entities.length,
    destinationHint,
    resolvedDestinationId,
  });
  
  for (const entity of entities) {
    try {
      // Use entity-specific destination if available
      let entityDestId = resolvedDestinationId;
      if (entity.location?.city) {
        const cityResolved = await resolveDestination(entity.location.city);
        if (cityResolved) {
          entityDestId = cityResolved.id;
        }
      }
      
      const result = await upsertEntity(entity, entityDestId, sourceJobId);
      
      if (result) {
        results.push(result);
        if (result.action === "created") created++;
        else if (result.action === "updated") updated++;
        else unchanged++;
      }
    } catch (err) {
      errors++;
      errorDetails.push({
        entity: entity.name,
        error: err instanceof Error ? err.message : String(err),
      });
      upsertLogger.error("Failed to upsert entity", {
        entity: entity.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  
  upsertLogger.info("Batch upsert complete", {
    total: entities.length,
    created,
    updated,
    unchanged,
    errors,
  });
  
  return {
    total: entities.length,
    created,
    updated,
    unchanged,
    errors,
    results,
    errorDetails,
  };
}

/**
 * Get entities by destination for aggregation
 */
export async function getEntitiesByDestination(
  destinationId: string
): Promise<{
  hotels: Hotel[];
  attractions: Attraction[];
  dining: Dining[];
  districts: District[];
}> {
  const [destHotels, destAttractions, destDining, destDistricts] = await Promise.all([
    db.select().from(hotels).where(eq(hotels.destinationId, destinationId)),
    db.select().from(attractions).where(eq(attractions.destinationId, destinationId)),
    db.select().from(dining).where(eq(dining.destinationId, destinationId)),
    db.select().from(districts).where(eq(districts.destinationId, destinationId)),
  ]);
  
  return {
    hotels: destHotels,
    attractions: destAttractions,
    dining: destDining,
    districts: destDistricts,
  };
}
