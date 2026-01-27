/**
 * Context Resolver - Resolves resource context for permission checks
 * Feature flag: ENABLE_RBAC
 */

import { db } from "../db";
import { contents } from "@shared/schema";
import { eq } from "drizzle-orm";
import { AccessContext, Resource } from "./types";

// Cache resolved contexts
const CONTEXT_CACHE = new Map<string, { ctx: ResolvedContext; ts: number }>();
const CACHE_TTL = 30000;
const CACHE_MAX = 500;

export interface ResolvedContext extends AccessContext {
  ownerId?: string;
  teamId?: string;
  locale?: string;
  status?: string;
  type?: string;
}

/**
 * Resolve full context for a resource
 */
export async function resolveContext(
  resource: Resource,
  resourceId?: string
): Promise<ResolvedContext> {
  if (!resourceId) {
    return { resource, action: "view" };
  }

  const cacheKey = `${resource}:${resourceId}`;
  const cached = CONTEXT_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.ctx;
  }

  let ctx: ResolvedContext = { resource, resourceId, action: "view" };

  if (resource === "content") {
    ctx = await resolveContentContext(resourceId);
  } else if (resource === "entity") {
    ctx = await resolveEntityContext(resourceId);
  }

  cacheResolvedContext(cacheKey, ctx);
  return ctx;
}

async function resolveContentContext(contentId: string): Promise<ResolvedContext> {
  const [content] = await db
    .select({
      id: contents.id,
      type: contents.type,
      status: contents.status,
      authorId: contents.authorId,
    })
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  if (!content) {
    return { resource: "content", resourceId: contentId, action: "view" };
  }

  return {
    resource: "content",
    resourceId: contentId,
    contentId: contentId,
    action: "view",
    ownerId: content.authorId || undefined,
    status: content.status,
    type: content.type,
  };
}

async function resolveEntityContext(entityId: string): Promise<ResolvedContext> {
  // For entities, we just return basic context
  // Can be extended to resolve entity-specific fields
  return {
    resource: "entity",
    resourceId: entityId,
    entityId: entityId,
    action: "view",
  };
}

function cacheResolvedContext(key: string, ctx: ResolvedContext): void {
  if (CONTEXT_CACHE.size >= CACHE_MAX) {
    const entries = Array.from(CONTEXT_CACHE.entries());
    entries.sort((a, b) => a[1].ts - b[1].ts);
    entries.slice(0, 100).forEach(([k]) => CONTEXT_CACHE.delete(k));
  }
  CONTEXT_CACHE.set(key, { ctx, ts: Date.now() });
}

export function clearContextCache(): void {
  CONTEXT_CACHE.clear();
}

/**
 * Check if user is owner of the resource
 */
export function isOwner(ctx: ResolvedContext, userId: string): boolean {
  return ctx.ownerId === userId;
}

/**
 * Check if content is in draft state
 */
export function isDraft(ctx: ResolvedContext): boolean {
  return ctx.status === "draft";
}

/**
 * Check if content is published
 */
export function isPublished(ctx: ResolvedContext): boolean {
  return ctx.status === "published";
}
