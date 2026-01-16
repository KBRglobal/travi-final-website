/**
 * Content Dependency Graph
 *
 * Tracks dependencies between content pieces (e.g. "Top hotels in Dubai" depends on hotel pages).
 * Detects cascading impact when a node changes.
 *
 * Feature flag: ENABLE_CONTENT_DEPENDENCIES
 */

import { db } from "../db";
import { contentDependencies, contents } from "@shared/schema";
import { eq, or, sql, and, inArray } from "drizzle-orm";

// Bounded LRU cache for dependency lookups
const CACHE_MAX_SIZE = 500;
const dependencyCache = new Map<string, { deps: string[]; ts: number }>();

function isEnabled(): boolean {
  return process.env.ENABLE_CONTENT_DEPENDENCIES === "true";
}

function pruneCache(): void {
  if (dependencyCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(dependencyCache.entries());
    entries.sort((a, b) => a[1].ts - b[1].ts);
    const toDelete = entries.slice(0, entries.length - CACHE_MAX_SIZE + 100);
    toDelete.forEach(([key]) => dependencyCache.delete(key));
  }
}

export interface DependencyNode {
  contentId: string;
  title?: string;
  type?: string;
  dependencyType: string;
  weight: number;
}

export interface ImpactAnalysis {
  contentId: string;
  directDependents: DependencyNode[];
  cascadingImpact: DependencyNode[];
  totalImpacted: number;
}

/**
 * Add a dependency between two content pieces
 */
export async function addDependency(
  sourceId: string,
  targetId: string,
  dependencyType: string = "references",
  weight: number = 1
): Promise<void> {
  if (!isEnabled()) return;

  await db
    .insert(contentDependencies)
    .values({ sourceId, targetId, dependencyType, weight })
    .onConflictDoUpdate({
      target: [contentDependencies.sourceId, contentDependencies.targetId],
      set: { dependencyType, weight },
    });

  // Invalidate cache
  dependencyCache.delete(`deps:${sourceId}`);
  dependencyCache.delete(`impacted:${targetId}`);
}

/**
 * Remove a dependency
 */
export async function removeDependency(sourceId: string, targetId: string): Promise<void> {
  if (!isEnabled()) return;

  await db
    .delete(contentDependencies)
    .where(
      and(
        eq(contentDependencies.sourceId, sourceId),
        eq(contentDependencies.targetId, targetId)
      )
    );

  dependencyCache.delete(`deps:${sourceId}`);
  dependencyCache.delete(`impacted:${targetId}`);
}

/**
 * Get direct dependencies of a content piece (what it depends on)
 */
export async function getDependencies(contentId: string): Promise<DependencyNode[]> {
  if (!isEnabled()) return [];

  const cacheKey = `deps:${contentId}`;
  const cached = dependencyCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 60000) {
    // Return from cache with content info
    const deps = await db
      .select({
        contentId: contentDependencies.targetId,
        title: contents.title,
        type: contents.type,
        dependencyType: contentDependencies.dependencyType,
        weight: contentDependencies.weight,
      })
      .from(contentDependencies)
      .leftJoin(contents, eq(contentDependencies.targetId, contents.id))
      .where(eq(contentDependencies.sourceId, contentId));

    return deps.map((d) => ({
      contentId: d.contentId,
      title: d.title || undefined,
      type: d.type || undefined,
      dependencyType: d.dependencyType,
      weight: d.weight,
    }));
  }

  const deps = await db
    .select({
      contentId: contentDependencies.targetId,
      title: contents.title,
      type: contents.type,
      dependencyType: contentDependencies.dependencyType,
      weight: contentDependencies.weight,
    })
    .from(contentDependencies)
    .leftJoin(contents, eq(contentDependencies.targetId, contents.id))
    .where(eq(contentDependencies.sourceId, contentId));

  dependencyCache.set(cacheKey, { deps: deps.map((d) => d.contentId), ts: Date.now() });
  pruneCache();

  return deps.map((d) => ({
    contentId: d.contentId,
    title: d.title || undefined,
    type: d.type || undefined,
    dependencyType: d.dependencyType,
    weight: d.weight,
  }));
}

/**
 * Get content pieces that depend on this content (reverse lookup)
 */
export async function getDependents(contentId: string): Promise<DependencyNode[]> {
  if (!isEnabled()) return [];

  const deps = await db
    .select({
      contentId: contentDependencies.sourceId,
      title: contents.title,
      type: contents.type,
      dependencyType: contentDependencies.dependencyType,
      weight: contentDependencies.weight,
    })
    .from(contentDependencies)
    .leftJoin(contents, eq(contentDependencies.sourceId, contents.id))
    .where(eq(contentDependencies.targetId, contentId));

  return deps.map((d) => ({
    contentId: d.contentId,
    title: d.title || undefined,
    type: d.type || undefined,
    dependencyType: d.dependencyType,
    weight: d.weight,
  }));
}

/**
 * Analyze cascading impact when a content piece changes
 * Uses BFS to traverse the dependency graph
 */
export async function analyzeImpact(contentId: string, maxDepth: number = 3): Promise<ImpactAnalysis> {
  if (!isEnabled()) {
    return { contentId, directDependents: [], cascadingImpact: [], totalImpacted: 0 };
  }

  const directDependents = await getDependents(contentId);
  const visited = new Set<string>([contentId]);
  const cascading: DependencyNode[] = [];

  // BFS for cascading impact
  let currentLevel = directDependents.map((d) => d.contentId);
  let depth = 1;

  while (currentLevel.length > 0 && depth < maxDepth) {
    const nextLevel: string[] = [];

    for (const id of currentLevel) {
      if (visited.has(id)) continue;
      visited.add(id);

      const dependents = await getDependents(id);
      for (const dep of dependents) {
        if (!visited.has(dep.contentId)) {
          cascading.push(dep);
          nextLevel.push(dep.contentId);
        }
      }
    }

    currentLevel = nextLevel;
    depth++;
  }

  return {
    contentId,
    directDependents,
    cascadingImpact: cascading,
    totalImpacted: directDependents.length + cascading.length,
  };
}

/**
 * Auto-detect dependencies from content links
 */
export async function detectDependenciesFromLinks(
  contentId: string,
  linkedContentIds: string[]
): Promise<void> {
  if (!isEnabled()) return;

  for (const targetId of linkedContentIds) {
    await addDependency(contentId, targetId, "links", 1);
  }
}

console.log("[ContentDependencies] Module loaded");
