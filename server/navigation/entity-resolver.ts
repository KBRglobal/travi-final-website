/**
 * Entity Resolver - Validates entities exist in database before returning URLs
 * Prevents hallucinated links by ensuring the entity actually exists
 */

import { db } from "../db";
import { destinations, contents, categoryPages } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { type EntityType, buildUrl, isValidEntityType } from "./url-mapper";

export { EntityType };

/**
 * Check if a destination exists by slug
 */
async function destinationExists(slug: string): Promise<boolean> {
  const result = await db
    .select({ id: destinations.id })
    .from(destinations)
    .where(eq(destinations.slug, slug))
    .limit(1);
  return result.length > 0;
}

/**
 * Check if content of a specific type exists by slug
 */
async function contentExists(type: 'hotel' | 'attraction' | 'article', slug: string): Promise<boolean> {
  const result = await db
    .select({ id: contents.id })
    .from(contents)
    .where(
      and(
        eq(contents.slug, slug),
        eq(contents.type, type)
      )
    )
    .limit(1);
  return result.length > 0;
}

/**
 * Check if a category page exists by slug
 */
async function categoryExists(slug: string): Promise<boolean> {
  const result = await db
    .select({ id: categoryPages.id })
    .from(categoryPages)
    .where(eq(categoryPages.slug, slug))
    .limit(1);
  return result.length > 0;
}

/**
 * Resolve an entity link - validates the entity exists in the database
 * Returns the URL path if the entity exists, null otherwise
 * 
 * @param type - The entity type (destination, hotel, attraction, article, category)
 * @param slug - The entity slug
 * @returns The URL path if entity exists, null if it doesn't
 */
export async function resolveEntityLink(type: EntityType, slug: string): Promise<string | null> {
  if (!isValidEntityType(type)) {
    return null;
  }

  if (!slug || typeof slug !== 'string' || slug.trim() === '') {
    return null;
  }

  const normalizedSlug = slug.trim().toLowerCase();

  let exists = false;

  switch (type) {
    case 'destination':
      exists = await destinationExists(normalizedSlug);
      break;
    case 'hotel':
      exists = await contentExists('hotel', normalizedSlug);
      break;
    case 'attraction':
      exists = await contentExists('attraction', normalizedSlug);
      break;
    case 'article':
      exists = await contentExists('article', normalizedSlug);
      break;
    case 'category':
      exists = await categoryExists(normalizedSlug);
      break;
  }

  if (!exists) {
    return null;
  }

  return buildUrl(type, normalizedSlug);
}

/**
 * Batch resolve multiple entity links
 * Returns a map of slug -> URL for entities that exist
 * 
 * @param entities - Array of { type, slug } objects to resolve
 * @returns Map of "type:slug" -> URL for existing entities
 */
export async function resolveEntityLinks(
  entities: Array<{ type: EntityType; slug: string }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  const resolvePromises = entities.map(async ({ type, slug }) => {
    const url = await resolveEntityLink(type, slug);
    if (url) {
      results.set(`${type}:${slug}`, url);
    }
  });

  await Promise.all(resolvePromises);

  return results;
}

/**
 * Validate a list of potential links and return only valid ones
 * Useful for sanitizing AI-generated content with links
 * 
 * @param links - Array of { type, slug, ...rest } objects
 * @returns Array of objects with valid links (includes original properties + resolved url)
 */
export async function validateLinks<T extends { type: EntityType; slug: string }>(
  links: T[]
): Promise<Array<T & { url: string }>> {
  const validLinks: Array<T & { url: string }> = [];

  await Promise.all(
    links.map(async (link) => {
      const url = await resolveEntityLink(link.type, link.slug);
      if (url) {
        validLinks.push({ ...link, url });
      }
    })
  );

  return validLinks;
}
