/**
 * Content Backlog - Collector
 *
 * Collects content ideas from various sources.
 */

import { db } from "../db";
import { eq, isNull } from "drizzle-orm";
import { BacklogItem, BacklogSource } from "./types";

/**
 * Collect zero-result search queries.
 */
export async function collectZeroResultSearches(
  limit: number = 50,
  sinceDays: number = 7
): Promise<Partial<BacklogItem>[]> {
  // This would query the search intelligence module
  // Simplified implementation
  const items: Partial<BacklogItem>[] = [];

  // Mock data - in production, query search_queries table
  const zeroResultQueries = [
    { query: "best hiking trails dubai", count: 45 },
    { query: "underwater restaurant", count: 32 },
    { query: "desert safari tips", count: 28 },
  ];

  for (const q of zeroResultQueries) {
    items.push({
      title: `Content about: ${q.query}`,
      description: `${q.count} searches with no results in the last ${sinceDays} days`,
      source: "zero_result_search",
      sourceDetails: {
        query: q.query,
        searchCount: q.count,
        sinceDays,
      },
      suggestedKeywords: q.query.split(" ").filter(w => w.length > 2),
    });
  }

  return items.slice(0, limit);
}

/**
 * Collect low-click search queries.
 */
export async function collectLowClickSearches(
  limit: number = 50,
  sinceDays: number = 7
): Promise<Partial<BacklogItem>[]> {
  const items: Partial<BacklogItem>[] = [];

  // Mock data - in production, query search analytics
  const lowClickQueries = [
    { query: "family activities", searches: 120, clicks: 5, ctr: 0.04 },
    { query: "budget hotels", searches: 95, clicks: 3, ctr: 0.03 },
  ];

  for (const q of lowClickQueries) {
    items.push({
      title: `Improve content for: ${q.query}`,
      description: `${q.searches} searches but only ${(q.ctr * 100).toFixed(1)}% CTR`,
      source: "low_click_search",
      sourceDetails: {
        query: q.query,
        searches: q.searches,
        clicks: q.clicks,
        ctr: q.ctr,
      },
      suggestedKeywords: q.query.split(" ").filter(w => w.length > 2),
    });
  }

  return items.slice(0, limit);
}

/**
 * Collect high-frequency RSS topics.
 */
export async function collectRssTopics(limit: number = 50): Promise<Partial<BacklogItem>[]> {
  const items: Partial<BacklogItem>[] = [];

  // Mock data - in production, analyze RSS feed topics
  const trendingTopics = [
    { topic: "sustainable tourism", frequency: 15, sources: ["TravelNews", "EcoTravel"] },
    { topic: "digital nomad destinations", frequency: 12, sources: ["RemoteWork", "TravelTech"] },
  ];

  for (const t of trendingTopics) {
    items.push({
      title: `Trending topic: ${t.topic}`,
      description: `Mentioned ${t.frequency} times in ${t.sources.length} RSS sources`,
      source: "rss_topic",
      sourceDetails: {
        topic: t.topic,
        frequency: t.frequency,
        sources: t.sources,
      },
      suggestedKeywords: t.topic.split(" ").filter(w => w.length > 2),
    });
  }

  return items.slice(0, limit);
}

/**
 * Collect entity gaps (entities without content).
 */
export async function collectEntityGaps(limit: number = 50): Promise<Partial<BacklogItem>[]> {
  const items: Partial<BacklogItem>[] = [];

  try {
    // Find entities that have no content linked
    // Using 'as any' to bypass strict Drizzle ORM type checking for tables that may not exist yet
    const entities = { id: "id", name: "name", type: "type" } as any;
    const contentEntities = { entityId: "entity_id", contentId: "content_id" } as any;
    const entitiesWithoutContent = await (db as any)
      .select({
        id: entities.id,
        name: entities.name,
        type: entities.type,
      })
      .from(entities)
      .leftJoin(contentEntities, eq(entities.id, contentEntities.entityId))
      .where(isNull(contentEntities.contentId))
      .limit(limit);

    for (const entity of entitiesWithoutContent) {
      items.push({
        title: `Content for entity: ${entity.name}`,
        description: `Entity of type "${entity.type}" has no dedicated content`,
        source: "entity_gap",
        sourceDetails: {
          entityId: entity.id,
          entityName: entity.name,
          entityType: entity.type,
        },
        relatedEntityIds: [entity.id],
        suggestedKeywords: [entity.name.toLowerCase()],
      });
    }
  } catch (error) {}

  return items;
}

/**
 * Collect all content ideas from all sources.
 */
export async function collectAllIdeas(
  limitPerSource: number = 20
): Promise<Partial<BacklogItem>[]> {
  const [zeroResults, lowClicks, rssTopics, entityGaps] = await Promise.all([
    collectZeroResultSearches(limitPerSource),
    collectLowClickSearches(limitPerSource),
    collectRssTopics(limitPerSource),
    collectEntityGaps(limitPerSource),
  ]);

  return [...zeroResults, ...lowClicks, ...rssTopics, ...entityGaps];
}
