/**
 * Article Ideation
 * Generate article ideas from extracted entities
 */

import { db } from "../../db";
import { contentEntities, contents } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { EngineRegistry, generateWithEngine } from "../../services/engine-registry";
import {
  ArticleIdea,
  IdeationResult,
  ExplodedArticleType,
  ARTICLE_TYPE_METADATA,
  ExtractedEntity,
  EntityType,
} from "./types";

const IDEATION_PROMPT = `You are an expert SEO content strategist for a travel website. Generate article ideas based on the provided entities.

For each idea, provide:
1. title - SEO-optimized title with keywords
2. description - Brief description of article content
3. articleType - One of: guide, best-of, comparison, seasonal, budget, luxury, family, romantic, first-time, insider, nearby, history, food-scene, nightlife, day-trip
4. targetKeywords - 3-5 SEO keywords to target
5. targetEntities - Entity names to feature
6. estimatedWordCount - Based on article type
7. searchIntent - informational, commercial, transactional, or navigational
8. seasonality - evergreen, seasonal, or trending
9. audienceSegment - Target audience
10. priorityScore - 1-100 based on SEO potential and traffic potential

IMPORTANT:
- Generate diverse article types
- Focus on high-traffic potential keywords
- Avoid duplicate content angles
- Consider seasonal and evergreen mix
- Target different audience segments

Return JSON array only:
[
  {
    "title": "10 Best Restaurants Near Burj Khalifa in 2024",
    "description": "Curated list of top dining spots...",
    "articleType": "best-of",
    "targetKeywords": ["restaurants near burj khalifa", "downtown dubai dining", "burj khalifa restaurants"],
    "targetEntities": ["Burj Khalifa"],
    "estimatedWordCount": 1500,
    "searchIntent": "commercial",
    "seasonality": "evergreen",
    "audienceSegment": "tourists and diners",
    "priorityScore": 85
  }
]`;

export class ArticleIdeation {
  /**
   * Generate article ideas for entities from a content source
   */
  async generateIdeas(
    contentId: string,
    maxIdeas: number = 10,
    articleTypes?: ExplodedArticleType[]
  ): Promise<IdeationResult> {
    const startTime = Date.now();

    try {
      // Get entities for this content
      const entities = await db
        .select()
        .from(contentEntities)
        .where(and(eq(contentEntities.sourceContentId, contentId), sql`merged_into_id IS NULL`));

      if (entities.length === 0) {
        return {
          success: false,
          ideas: [],
          sourceEntities: [],
          ideationTimeMs: Date.now() - startTime,
          error: "No entities found for content",
        };
      }

      // Get source content for context
      const [sourceContent] = await db
        .select()
        .from(contents)
        .where(eq(contents.id, contentId))
        .limit(1);

      // Generate ideas using AI
      const ideas = await this.generateIdeasFromEntities(
        entities.map(e => ({
          name: e.name,
          type: e.entityType as EntityType,
          description: e.description || undefined,
          location: e.location || undefined,
          confidence: e.confidence || 0.7,
          mentionCount: 1,
          context: [],
        })),
        sourceContent?.title || "",
        maxIdeas,
        articleTypes
      );

      // Filter and deduplicate ideas
      const filteredIdeas = await this.filterIdeas(ideas);

      return {
        success: true,
        ideas: filteredIdeas.slice(0, maxIdeas),
        sourceEntities: entities.map(e => e.name),
        ideationTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        ideas: [],
        sourceEntities: [],
        ideationTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate ideas from entity list using AI
   */
  async generateIdeasFromEntities(
    entities: ExtractedEntity[],
    sourceTitle: string,
    maxIdeas: number,
    articleTypes?: ExplodedArticleType[]
  ): Promise<ArticleIdea[]> {
    const engine = EngineRegistry.getNextEngine();
    if (!engine) {
      throw new Error("No AI engine available for ideation");
    }

    // Build entity context
    const entityContext = entities
      .map(
        e =>
          `- ${e.name} (${e.type})${e.location ? ` in ${e.location}` : ""}${e.description ? `: ${e.description}` : ""}`
      )
      .join("\n");

    // Build article type constraints
    const typeConstraint = articleTypes
      ? `Focus on these article types: ${articleTypes.join(", ")}`
      : "Use diverse article types";

    const userPrompt = `Generate ${maxIdeas} unique article ideas based on these travel entities:

Source Article: "${sourceTitle}"

Entities:
${entityContext}

${typeConstraint}

Current year: ${new Date().getFullYear()}

Return ${maxIdeas} article ideas as a JSON array.`;

    try {
      const response = await generateWithEngine(engine, IDEATION_PROMPT, userPrompt);
      EngineRegistry.reportSuccess(engine.id);

      return this.parseIdeationResponse(response, articleTypes);
    } catch (error) {
      EngineRegistry.reportFailure(
        engine.id,
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }

  /**
   * Generate template-based ideas without AI (fallback)
   */
  generateTemplateIdeas(
    entities: ExtractedEntity[],
    location: string,
    articleTypes?: ExplodedArticleType[]
  ): ArticleIdea[] {
    const ideas: ArticleIdea[] = [];
    const year = new Date().getFullYear();
    const types = articleTypes || (Object.keys(ARTICLE_TYPE_METADATA) as ExplodedArticleType[]);

    for (const entity of entities.slice(0, 5)) {
      for (const articleType of types.slice(0, 3)) {
        const meta = ARTICLE_TYPE_METADATA[articleType];
        const title = meta.titlePattern
          .replace("{entity}", entity.name)
          .replace("{location}", location || entity.location || "")
          .replace("{year}", String(year))
          .replace("{category}", entity.type)
          .replace("{count}", "10")
          .replace("{season}", "Summer");

        ideas.push({
          title,
          description: `${meta.seoFocus} article about ${entity.name}`,
          articleType,
          targetKeywords: [
            entity.name.toLowerCase(),
            `${entity.name.toLowerCase()} ${articleType}`,
            `${entity.type} ${location || ""}`.trim().toLowerCase(),
          ],
          targetEntities: [entity.name],
          estimatedWordCount: (meta.minWords + meta.maxWords) / 2,
          searchIntent:
            articleType === "guide" || articleType === "first-time"
              ? "informational"
              : "commercial",
          seasonality: articleType === "seasonal" ? "seasonal" : "evergreen",
          audienceSegment: meta.audienceHint,
          priorityScore: Math.round(entity.confidence * 70 + 20),
        });
      }
    }

    return ideas;
  }

  /**
   * Parse AI ideation response
   */
  private parseIdeationResponse(
    response: string,
    allowedTypes?: ExplodedArticleType[]
  ): ArticleIdea[] {
    let jsonString = response.trim();

    // Clean up response
    if (jsonString.startsWith("```json")) jsonString = jsonString.slice(7);
    if (jsonString.startsWith("```")) jsonString = jsonString.slice(3);
    if (jsonString.endsWith("```")) jsonString = jsonString.slice(0, -3);

    // Extract JSON array
    const jsonMatch = jsonString.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const validTypes = new Set(allowedTypes || Object.keys(ARTICLE_TYPE_METADATA));

      return parsed
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null && typeof item.title === "string"
        )
        .map(item => ({
          title: String(item.title),
          description: String(item.description || ""),
          articleType: this.normalizeArticleType(String(item.articleType || "guide"), allowedTypes),
          targetKeywords: Array.isArray(item.targetKeywords) ? item.targetKeywords.map(String) : [],
          targetEntities: Array.isArray(item.targetEntities) ? item.targetEntities.map(String) : [],
          estimatedWordCount:
            typeof item.estimatedWordCount === "number" ? item.estimatedWordCount : 1500,
          searchIntent: this.normalizeSearchIntent(String(item.searchIntent || "informational")),
          seasonality: this.normalizeSeasonality(String(item.seasonality || "evergreen")),
          audienceSegment: String(item.audienceSegment || "general travelers"),
          priorityScore:
            typeof item.priorityScore === "number"
              ? Math.min(100, Math.max(1, item.priorityScore))
              : 50,
        }))
        .filter(idea => validTypes.has(idea.articleType));
    } catch {
      console.error("[ArticleIdeation] Failed to parse ideation response");
      return [];
    }
  }

  /**
   * Normalize article type
   */
  private normalizeArticleType(
    type: string,
    allowedTypes?: ExplodedArticleType[]
  ): ExplodedArticleType {
    const normalized = type.toLowerCase().replace(/[^a-z-]/g, "");
    const valid = Object.keys(ARTICLE_TYPE_METADATA) as ExplodedArticleType[];

    if (valid.includes(normalized as ExplodedArticleType)) {
      if (!allowedTypes || allowedTypes.includes(normalized as ExplodedArticleType)) {
        return normalized as ExplodedArticleType;
      }
    }

    // Return first allowed type or default
    return allowedTypes?.[0] || "guide";
  }

  /**
   * Normalize search intent
   */
  private normalizeSearchIntent(
    intent: string
  ): "informational" | "commercial" | "transactional" | "navigational" {
    const normalized = intent.toLowerCase();
    if (["informational", "commercial", "transactional", "navigational"].includes(normalized)) {
      return normalized as "informational" | "commercial" | "transactional" | "navigational";
    }
    return "informational";
  }

  /**
   * Normalize seasonality
   */
  private normalizeSeasonality(seasonality: string): "evergreen" | "seasonal" | "trending" {
    const normalized = seasonality.toLowerCase();
    if (["evergreen", "seasonal", "trending"].includes(normalized)) {
      return normalized as "evergreen" | "seasonal" | "trending";
    }
    return "evergreen";
  }

  /**
   * Filter and deduplicate ideas
   */
  private async filterIdeas(ideas: ArticleIdea[]): Promise<ArticleIdea[]> {
    const seen = new Set<string>();
    const filtered: ArticleIdea[] = [];

    for (const idea of ideas) {
      // Create signature for deduplication
      const signature = `${idea.title.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

      if (!seen.has(signature)) {
        seen.add(signature);
        filtered.push(idea);
      }
    }

    // Sort by priority
    return filtered.sort((a, b) => b.priorityScore - a.priorityScore);
  }
}

// Singleton instance
let ideationInstance: ArticleIdeation | null = null;

export function getArticleIdeation(): ArticleIdeation {
  if (!ideationInstance) {
    ideationInstance = new ArticleIdeation();
  }
  return ideationInstance;
}
