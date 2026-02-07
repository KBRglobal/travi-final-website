/**
 * Entity Extractor
 * AI-powered entity extraction from content for explosion
 */

import { db } from "../../db";
import { contents, contentEntities } from "@shared/schema";
import { eq } from "drizzle-orm";
import { EngineRegistry, generateWithEngine } from "../../services/engine-registry";
import { ExtractedEntity, EntityExtractionResult, EntityType } from "./types";

const ENTITY_EXTRACTION_PROMPT = `You are an expert travel content analyst. Extract all named entities from the following travel content.

For each entity, identify:
1. Name (exact name as mentioned)
2. Type (one of: hotel, restaurant, attraction, district, landmark, beach, museum, park, mall, market, cafe, bar, club, spa, activity)
3. Description (brief, based on context)
4. Location (if mentioned)
5. Attributes (any mentioned features, prices, ratings)
6. Confidence (0.0-1.0 based on how clearly it's described)

Focus on extracting:
- Hotels and accommodations
- Restaurants, cafes, bars
- Tourist attractions and landmarks
- Districts and neighborhoods
- Beaches and natural features
- Museums and cultural sites
- Shopping centers and markets
- Activities and experiences

Return a JSON array of entities:
[
  {
    "name": "Burj Khalifa",
    "type": "landmark",
    "description": "World's tallest building",
    "location": "Downtown Dubai",
    "attributes": {"height": "828m", "floors": 163},
    "confidence": 0.95
  }
]

IMPORTANT:
- Only extract clearly named entities, not generic references
- Exclude common words that aren't specific places
- Include only entities with confidence >= 0.5
- Return valid JSON only, no explanation`;

export class EntityExtractor {
  /**
   * Extract entities from a content record
   */
  async extractFromContent(contentId: string): Promise<EntityExtractionResult> {
    const startTime = Date.now();

    try {
      // Get content from database
      const [content] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);

      if (!content) {
        return {
          success: false,
          entities: [],
          sourceContentId: contentId,
          extractionTimeMs: Date.now() - startTime,
          error: "Content not found",
        };
      }

      // Build full text from content
      const fullText = this.buildFullText(content);
      if (!fullText || fullText.length < 100) {
        return {
          success: false,
          entities: [],
          sourceContentId: contentId,
          extractionTimeMs: Date.now() - startTime,
          error: "Content too short for extraction",
        };
      }

      // Call AI for entity extraction
      const entities = await this.extractEntitiesFromText(fullText);

      // Save entities to database
      if (entities.length > 0) {
        await this.saveEntities(contentId, entities);
      }

      return {
        success: true,
        entities,
        sourceContentId: contentId,
        extractionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        entities: [],
        sourceContentId: contentId,
        extractionTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extract entities from raw text
   */
  async extractEntitiesFromText(text: string): Promise<ExtractedEntity[]> {
    const engine = EngineRegistry.getNextEngine();
    if (!engine) {
      throw new Error("No AI engine available for entity extraction");
    }

    const systemPrompt = ENTITY_EXTRACTION_PROMPT;
    const userPrompt = `Extract all named entities from this travel content:\n\n${text.substring(0, 8000)}`; // Limit text length

    try {
      const response = await generateWithEngine(engine, systemPrompt, userPrompt);
      EngineRegistry.reportSuccess(engine.id);

      // Parse response
      const entities = this.parseEntityResponse(response);

      // Post-process entities
      return entities
        .filter(e => e.confidence >= 0.5)
        .map(e => ({
          ...e,
          mentionCount: this.countMentions(text, e.name),
          context: this.extractContext(text, e.name),
        }));
    } catch (error) {
      EngineRegistry.reportFailure(
        engine.id,
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }

  /**
   * Build full text from content record
   */
  private buildFullText(content: typeof contents.$inferSelect): string {
    const parts: string[] = [content.title];

    if (content.summary) parts.push(content.summary);
    if (content.metaDescription) parts.push(content.metaDescription);

    // Extract text from blocks
    if (content.blocks && Array.isArray(content.blocks)) {
      for (const block of content.blocks) {
        if (typeof block === "object" && block !== null) {
          const blockObj = block as unknown as Record<string, unknown>;
          if (blockObj.contents && typeof blockObj.contents === "object") {
            const contents = blockObj.contents as Record<string, unknown>;
            if (contents.text && typeof contents.text === "string") {
              parts.push(contents.text);
            }
          }
        }
      }
    }

    return parts.join("\n\n");
  }

  /**
   * Parse AI response to entities
   */
  private parseEntityResponse(response: string): ExtractedEntity[] {
    let jsonString = response.trim();

    // Clean up response
    if (jsonString.startsWith("```json")) jsonString = jsonString.slice(7);
    if (jsonString.startsWith("```")) jsonString = jsonString.slice(3);
    if (jsonString.endsWith("```")) jsonString = jsonString.slice(0, -3);

    // Try to extract JSON array
    const jsonMatch = /\[[\s\S]*\]/.exec(jsonString);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null && typeof item.name === "string"
        )
        .map(item => ({
          name: String(item.name),
          type: this.normalizeEntityType(String(item.type || "attraction")),
          description: item.description ? String(item.description) : undefined,
          location: item.location ? String(item.location) : undefined,
          attributes:
            typeof item.attributes === "object"
              ? (item.attributes as Record<string, unknown>)
              : undefined,
          confidence: typeof item.confidence === "number" ? item.confidence : 0.7,
          mentionCount: 1,
          context: [],
        }));
    } catch {
      console.error("[EntityExtractor] Failed to parse entity response");
      return [];
    }
  }

  /**
   * Normalize entity type to valid enum value
   */
  private normalizeEntityType(type: string): EntityType {
    const normalized = type.toLowerCase().replace(/[^a-z]/g, "");
    const validTypes: EntityType[] = [
      "hotel",
      "restaurant",
      "attraction",
      "district",
      "landmark",
      "beach",
      "museum",
      "park",
      "mall",
      "market",
      "cafe",
      "bar",
      "club",
      "spa",
      "activity",
    ];

    if (validTypes.includes(normalized as EntityType)) {
      return normalized as EntityType;
    }

    // Map common alternatives
    const typeMap: Record<string, EntityType> = {
      resort: "hotel",
      hostel: "hotel",
      bnb: "hotel",
      airbnb: "hotel",
      dining: "restaurant",
      eatery: "restaurant",
      bistro: "restaurant",
      pub: "bar",
      lounge: "bar",
      nightclub: "club",
      discotheque: "club",
      shopping: "mall",
      shop: "market",
      gallery: "museum",
      monument: "landmark",
      tower: "landmark",
      building: "landmark",
      neighborhood: "district",
      area: "district",
      garden: "park",
      nature: "park",
      tour: "activity",
      experience: "activity",
    };

    return typeMap[normalized] || "attraction";
  }

  /**
   * Count mentions of entity in text
   */
  private countMentions(text: string, entityName: string): number {
    const regex = new RegExp(entityName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Extract surrounding context for entity
   */
  private extractContext(text: string, entityName: string): string[] {
    const contexts: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(entityName.toLowerCase())) {
        contexts.push(sentence.trim());
        if (contexts.length >= 3) break; // Max 3 context snippets
      }
    }

    return contexts;
  }

  /**
   * Save extracted entities to database
   */
  private async saveEntities(contentId: string, entities: ExtractedEntity[]): Promise<void> {
    for (const entity of entities) {
      const normalizedName = entity.name.toLowerCase().trim().replace(/\s+/g, " ");

      // Check for existing entity with same normalized name
      const existing = await db
        .select()
        .from(contentEntities)
        .where(eq(contentEntities.normalizedName, normalizedName))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(contentEntities).values({
          sourceContentId: contentId,
          entityType: entity.type,
          name: entity.name,
          normalizedName,
        } as any);
      }
    }
  }
}

// Singleton instance
let extractorInstance: EntityExtractor | null = null;

export function getEntityExtractor(): EntityExtractor {
  if (!extractorInstance) {
    extractorInstance = new EntityExtractor();
  }
  return extractorInstance;
}
