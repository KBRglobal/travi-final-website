/**
 * Entity Merger Service
 *
 * Handles merging duplicate entities and maintaining redirects.
 *
 * FEATURE 4: Entity Merge & Canonicalization
 */

import { db } from "../db";
import {
  contents,
  destinations,
  attractions,
  hotels,
  articles,
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import {
  type MergeableEntityType,
  type MergeRequest,
  type MergeResult,
  type MergeStrategy,
  type EntityRedirect,
  isEntityMergeEnabled,
} from "./types";

/**
 * In-memory redirect storage (production would use database)
 */
const entityRedirects: Map<string, EntityRedirect> = new Map();

/**
 * Get all stored redirects
 */
export function getAllRedirects(): EntityRedirect[] {
  return Array.from(entityRedirects.values());
}

/**
 * Get redirect for a specific entity
 */
export function getRedirect(fromId: string): EntityRedirect | undefined {
  return entityRedirects.get(fromId);
}

/**
 * Get redirect by slug
 */
export function getRedirectBySlug(fromSlug: string): EntityRedirect | undefined {
  return Array.from(entityRedirects.values()).find(r => r.fromSlug === fromSlug);
}

/**
 * Resolve redirect chain (follow redirects to final destination)
 */
export function resolveRedirectChain(id: string, maxDepth: number = 5): string {
  let currentId = id;
  let depth = 0;

  while (depth < maxDepth) {
    const redirect = entityRedirects.get(currentId);
    if (!redirect) break;
    currentId = redirect.toId;
    depth++;
  }

  return currentId;
}

/**
 * Merge two destinations
 */
async function mergeDestinations(
  sourceId: string,
  targetId: string,
  strategy: MergeStrategy,
  mergedBy: string
): Promise<MergeResult> {
  try {
    // Get both destinations
    const [source] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, sourceId));

    const [target] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, targetId));

    if (!source) {
      return { success: false, entityType: 'destination', sourceId, targetId, redirectCreated: false, referencesUpdated: 0, error: 'Source destination not found' };
    }
    if (!target) {
      return { success: false, entityType: 'destination', sourceId, targetId, redirectCreated: false, referencesUpdated: 0, error: 'Target destination not found' };
    }

    // Apply merge strategy
    if (strategy === 'keep_source' || strategy === 'merge_content') {
      // Update target with source data where appropriate
      await db
        .update(destinations)
        .set({
          summary: strategy === 'keep_source' ? source.summary : (target.summary || source.summary),
          heroImage: strategy === 'keep_source' ? source.heroImage : (target.heroImage || source.heroImage),
          heroImageAlt: strategy === 'keep_source' ? source.heroImageAlt : (target.heroImageAlt || source.heroImageAlt),
          cardImage: strategy === 'keep_source' ? source.cardImage : (target.cardImage || source.cardImage),
          metaTitle: strategy === 'keep_source' ? source.metaTitle : (target.metaTitle || source.metaTitle),
          metaDescription: strategy === 'keep_source' ? source.metaDescription : (target.metaDescription || source.metaDescription),
          updatedAt: new Date(),
        })
        .where(eq(destinations.id, targetId));
    }

    // Update all attractions referencing the source destination
    const attractionUpdates = await db
      .update(attractions)
      .set({ destinationId: targetId })
      .where(eq(attractions.destinationId, sourceId));

    // Update all hotels referencing the source destination
    const hotelUpdates = await db
      .update(hotels)
      .set({ destinationId: targetId })
      .where(eq(hotels.destinationId, sourceId));

    // Count total references updated
    const referencesUpdated = 0; // Drizzle doesn't return affected rows easily

    // Mark source as inactive (soft delete)
    await db
      .update(destinations)
      .set({
        isActive: false,
        status: 'merged',
        updatedAt: new Date(),
      })
      .where(eq(destinations.id, sourceId));

    // Create redirect
    const redirect: EntityRedirect = {
      id: `redirect-${Date.now()}`,
      entityType: 'destination',
      fromId: sourceId,
      fromSlug: source.slug,
      toId: targetId,
      toSlug: target.slug,
      mergedAt: new Date(),
      mergedBy,
    };
    entityRedirects.set(sourceId, redirect);

    return {
      success: true,
      entityType: 'destination',
      sourceId,
      targetId,
      redirectCreated: true,
      referencesUpdated,
    };
  } catch (error) {
    console.error('[EntityMerger] Error merging destinations:', error);
    return {
      success: false,
      entityType: 'destination',
      sourceId,
      targetId,
      redirectCreated: false,
      referencesUpdated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Merge two content items (attractions, hotels, articles)
 */
async function mergeContent(
  sourceId: string,
  targetId: string,
  contentType: 'attraction' | 'hotel' | 'article',
  strategy: MergeStrategy,
  mergedBy: string
): Promise<MergeResult> {
  try {
    // Get both content items
    const [source] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, sourceId));

    const [target] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, targetId));

    if (!source) {
      return { success: false, entityType: contentType, sourceId, targetId, redirectCreated: false, referencesUpdated: 0, error: 'Source content not found' };
    }
    if (!target) {
      return { success: false, entityType: contentType, sourceId, targetId, redirectCreated: false, referencesUpdated: 0, error: 'Target content not found' };
    }

    // Verify both are same type
    if (source.type !== contentType || target.type !== contentType) {
      return { success: false, entityType: contentType, sourceId, targetId, redirectCreated: false, referencesUpdated: 0, error: 'Content type mismatch' };
    }

    // Apply merge strategy
    if (strategy === 'keep_source' || strategy === 'merge_content') {
      const mergedBlocks = strategy === 'merge_content'
        ? [...(target.blocks || []), ...(source.blocks || [])]
        : source.blocks;

      await db
        .update(contents)
        .set({
          summary: strategy === 'keep_source' ? source.summary : (target.summary || source.summary),
          heroImage: strategy === 'keep_source' ? source.heroImage : (target.heroImage || source.heroImage),
          heroImageAlt: strategy === 'keep_source' ? source.heroImageAlt : (target.heroImageAlt || source.heroImageAlt),
          cardImage: strategy === 'keep_source' ? source.cardImage : (target.cardImage || source.cardImage),
          metaTitle: strategy === 'keep_source' ? source.metaTitle : (target.metaTitle || source.metaTitle),
          metaDescription: strategy === 'keep_source' ? source.metaDescription : (target.metaDescription || source.metaDescription),
          blocks: mergedBlocks,
          updatedAt: new Date(),
        })
        .where(eq(contents.id, targetId));
    }

    // Mark source as archived (soft delete)
    await db
      .update(contents)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(eq(contents.id, sourceId));

    // Create redirect
    const redirect: EntityRedirect = {
      id: `redirect-${Date.now()}`,
      entityType: contentType,
      fromId: sourceId,
      fromSlug: source.slug,
      toId: targetId,
      toSlug: target.slug,
      mergedAt: new Date(),
      mergedBy,
    };
    entityRedirects.set(sourceId, redirect);

    return {
      success: true,
      entityType: contentType,
      sourceId,
      targetId,
      redirectCreated: true,
      referencesUpdated: 0,
    };
  } catch (error) {
    console.error('[EntityMerger] Error merging content:', error);
    return {
      success: false,
      entityType: contentType,
      sourceId,
      targetId,
      redirectCreated: false,
      referencesUpdated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Determine entity type from ID
 */
async function determineEntityType(id: string): Promise<MergeableEntityType | null> {
  // Check destinations
  const [dest] = await db
    .select({ id: destinations.id })
    .from(destinations)
    .where(eq(destinations.id, id))
    .limit(1);
  if (dest) return 'destination';

  // Check contents for type
  const [content] = await db
    .select({ type: contents.type })
    .from(contents)
    .where(eq(contents.id, id))
    .limit(1);

  if (content) {
    return content.type as MergeableEntityType;
  }

  return null;
}

/**
 * Main merge function
 */
export async function mergeEntities(request: MergeRequest): Promise<MergeResult> {
  if (!isEntityMergeEnabled()) {
    return {
      success: false,
      entityType: 'destination',
      sourceId: request.sourceId,
      targetId: request.targetId,
      redirectCreated: false,
      referencesUpdated: 0,
      error: 'Entity merge feature is disabled. Set ENABLE_ENTITY_MERGE=true',
    };
  }

  const { sourceId, targetId, strategy, mergedBy } = request;

  // Determine entity type
  const sourceType = await determineEntityType(sourceId);
  const targetType = await determineEntityType(targetId);

  if (!sourceType || !targetType) {
    return {
      success: false,
      entityType: 'destination',
      sourceId,
      targetId,
      redirectCreated: false,
      referencesUpdated: 0,
      error: 'Source or target entity not found',
    };
  }

  if (sourceType !== targetType) {
    return {
      success: false,
      entityType: sourceType,
      sourceId,
      targetId,
      redirectCreated: false,
      referencesUpdated: 0,
      error: `Cannot merge different entity types: ${sourceType} and ${targetType}`,
    };
  }

  // Perform merge based on type
  if (sourceType === 'destination') {
    return mergeDestinations(sourceId, targetId, strategy, mergedBy);
  } else {
    return mergeContent(sourceId, targetId, sourceType, strategy, mergedBy);
  }
}

/**
 * Undo a merge (restore source entity)
 */
export async function undoMerge(redirectId: string): Promise<{ success: boolean; error?: string }> {
  const redirect = Array.from(entityRedirects.values()).find(r => r.id === redirectId);

  if (!redirect) {
    return { success: false, error: 'Redirect not found' };
  }

  try {
    if (redirect.entityType === 'destination') {
      await db
        .update(destinations)
        .set({
          isActive: true,
          status: 'partial',
          updatedAt: new Date(),
        })
        .where(eq(destinations.id, redirect.fromId));
    } else {
      await db
        .update(contents)
        .set({
          status: 'draft',
          updatedAt: new Date(),
        })
        .where(eq(contents.id, redirect.fromId));
    }

    // Remove redirect
    entityRedirects.delete(redirect.fromId);

    return { success: true };
  } catch (error) {
    console.error('[EntityMerger] Error undoing merge:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get merge history
 */
export function getMergeHistory(): EntityRedirect[] {
  return Array.from(entityRedirects.values()).sort(
    (a, b) => b.mergedAt.getTime() - a.mergedAt.getTime()
  );
}
