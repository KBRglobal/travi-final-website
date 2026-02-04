/**
 * Entity Matcher
 * Deduplication and matching of extracted entities
 */

import { db } from "../../db";
import { contentEntities } from "@shared/schema";
import { eq, and, ilike, sql } from "drizzle-orm";
import { ExtractedEntity, EntityType } from "./types";

interface MatchResult {
  entityId: string;
  name: string;
  normalizedName: string;
  matchScore: number;
  matchType: "exact" | "fuzzy" | "partial";
}

export class EntityMatcher {
  private readonly FUZZY_THRESHOLD = 0.8;
  private readonly PARTIAL_THRESHOLD = 0.6;

  /**
   * Find matching entities in database
   */
  async findMatches(entity: ExtractedEntity): Promise<MatchResult[]> {
    const results: MatchResult[] = [];
    const normalizedName = this.normalize(entity.name);

    // 1. Exact match
    const exactMatches = await db
      .select()
      .from(contentEntities)
      .where(eq(contentEntities.normalizedName, normalizedName))
      .limit(5);

    for (const match of exactMatches) {
      results.push({
        entityId: match.id,
        name: match.name,
        normalizedName: match.normalizedName,
        matchScore: 1.0,
        matchType: "exact",
      });
    }

    if (results.length > 0) {
      return results; // Return early if exact match found
    }

    // 2. Partial match (contains)
    const partialMatches = await db
      .select()
      .from(contentEntities)
      .where(
        and(
          eq(contentEntities.entityType, entity.type),
          ilike(contentEntities.normalizedName, `%${normalizedName}%`)
        )
      )
      .limit(10);

    for (const match of partialMatches) {
      const score = this.calculateSimilarity(normalizedName, match.normalizedName);
      if (score >= this.PARTIAL_THRESHOLD) {
        results.push({
          entityId: match.id,
          name: match.name,
          normalizedName: match.normalizedName,
          matchScore: score,
          matchType: score >= this.FUZZY_THRESHOLD ? "fuzzy" : "partial",
        });
      }
    }

    // 3. Fuzzy match using trigram similarity (if available)
    if (results.length === 0) {
      try {
        const fuzzyMatches = await db.execute(
          sql`SELECT id, name, normalized_name,
              similarity(normalized_name, ${normalizedName}) as score
              FROM content_entities
              WHERE entity_type = ${entity.type}
              AND similarity(normalized_name, ${normalizedName}) > ${this.PARTIAL_THRESHOLD}
              ORDER BY score DESC
              LIMIT 5`
        );

        if (Array.isArray(fuzzyMatches.rows)) {
          for (const row of fuzzyMatches.rows) {
            const typedRow = row as {
              id: string;
              name: string;
              normalized_name: string;
              score: number;
            };
            results.push({
              entityId: typedRow.id,
              name: typedRow.name,
              normalizedName: typedRow.normalized_name,
              matchScore: typedRow.score,
              matchType: typedRow.score >= this.FUZZY_THRESHOLD ? "fuzzy" : "partial",
            });
          }
        }
      } catch {
        // Trigram extension might not be available
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Merge duplicate entities
   */
  async mergeEntities(primaryId: string, duplicateIds: string[]): Promise<void> {
    if (duplicateIds.length === 0) return;

    // Update all duplicates to point to primary
    for (const dupId of duplicateIds) {
      await db
        .update(contentEntities)
        .set({ mergedIntoId: primaryId } as any)
        .where(eq(contentEntities.id, dupId));
    }

    // Update article count on primary
    const primary = await db
      .select()
      .from(contentEntities)
      .where(eq(contentEntities.id, primaryId))
      .limit(1);

    if (primary.length > 0) {
      const totalArticles = ((primary[0] as any).articleCount || 0) + duplicateIds.length;
      await db
        .update(contentEntities)
        .set({ articleCount: totalArticles } as any)
        .where(eq(contentEntities.id, primaryId));
    }
  }

  /**
   * Deduplicate entities for a content source
   */
  async deduplicateForContent(contentId: string): Promise<{
    merged: number;
    unique: number;
  }> {
    const entities = await db
      .select()
      .from(contentEntities)
      .where(and(eq(contentEntities.sourceContentId, contentId), sql`merged_into_id IS NULL`));

    let merged = 0;
    const processed = new Set<string>();

    for (const entity of entities) {
      if (processed.has(entity.id)) continue;

      // Find potential duplicates
      const matches = await this.findMatches({
        name: entity.name,
        type: entity.entityType as EntityType,
        confidence: entity.confidence || 0.7,
        mentionCount: 1,
        context: [],
      });

      // Filter to only include other entities from same content
      const sameContentMatches = matches.filter(
        m =>
          m.entityId !== entity.id &&
          entities.some(e => e.id === m.entityId) &&
          !processed.has(m.entityId)
      );

      if (sameContentMatches.length > 0) {
        // Merge duplicates into this entity
        const duplicateIds = sameContentMatches
          .filter(m => m.matchScore >= this.FUZZY_THRESHOLD)
          .map(m => m.entityId);

        if (duplicateIds.length > 0) {
          await this.mergeEntities(entity.id, duplicateIds);
          merged += duplicateIds.length;
          duplicateIds.forEach(id => processed.add(id));
        }
      }

      processed.add(entity.id);
    }

    return {
      merged,
      unique: entities.length - merged,
    };
  }

  /**
   * Normalize entity name for comparison
   */
  private normalize(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[''`]/g, "'")
      .replace(/[""]/g, '"')
      .replace(/\s+/g, " ")
      .replace(/[^\w\s'-]/g, "");
  }

  /**
   * Calculate string similarity (Levenshtein-based)
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;

    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    // Quick check for containment
    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }

    // Levenshtein distance
    const distance = this.levenshteinDistance(a, b);
    return 1 - distance / Math.max(a.length, b.length);
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

// Singleton instance
let matcherInstance: EntityMatcher | null = null;

export function getEntityMatcher(): EntityMatcher {
  if (!matcherInstance) {
    matcherInstance = new EntityMatcher();
  }
  return matcherInstance;
}
