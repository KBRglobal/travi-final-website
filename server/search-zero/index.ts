/**
 * Search Zero-Result Intelligence
 *
 * Captures and clusters zero-result searches to convert them into content tasks.
 * Includes query normalization, clustering, and ranking by frequency + intent.
 *
 * Feature flag: ENABLE_ZERO_SEARCH_INTEL
 */

import { db } from "../db";
import { searchZeroResults } from "@shared/schema";
import { eq, desc, sql, gte } from "drizzle-orm";
import crypto from "crypto";

function isEnabled(): boolean {
  return process.env.ENABLE_ZERO_SEARCH_INTEL === "true";
}

// Bounded cache for recent queries
const CACHE_MAX_SIZE = 1000;
const recentQueries = new Map<string, number>();

export interface ZeroResultCluster {
  clusterId: string;
  queries: string[];
  normalizedQuery: string;
  count: number;
  intent?: string;
  lastSeenAt: string;
  suggestedContentType?: string;
}

export interface ZeroResultStats {
  totalQueries: number;
  totalClusters: number;
  topClusters: ZeroResultCluster[];
  recentQueries: Array<{ query: string; count: number; lastSeen: string }>;
}

/**
 * Normalize a search query for clustering
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .split(" ")
    .sort()
    .join(" ");
}

/**
 * Detect intent from query
 */
function detectIntent(query: string): string {
  const lowerQuery = query.toLowerCase();

  if (/\b(how|what|why|when|where|who)\b/.test(lowerQuery)) {
    return "informational";
  }
  if (/\b(buy|book|reserve|order|price|cost)\b/.test(lowerQuery)) {
    return "transactional";
  }
  if (/\b(best|top|review|compare|vs)\b/.test(lowerQuery)) {
    return "commercial";
  }
  return "navigational";
}

/**
 * Generate cluster ID from normalized query
 */
function generateClusterId(normalizedQuery: string): string {
  return crypto.createHash("md5").update(normalizedQuery).digest("hex").slice(0, 12);
}

/**
 * Record a zero-result search
 */
export async function recordZeroResult(query: string): Promise<void> {
  if (!isEnabled()) return;

  const normalized = normalizeQuery(query);
  const clusterId = generateClusterId(normalized);
  const intent = detectIntent(query);

  // Rate limiting via cache
  const cacheKey = `zero:${normalized}`;
  const lastSeen = recentQueries.get(cacheKey);
  const now = Date.now();

  if (lastSeen && now - lastSeen < 60000) {
    // Skip if seen in last minute
    return;
  }

  recentQueries.set(cacheKey, now);

  // Prune cache if too large
  if (recentQueries.size > CACHE_MAX_SIZE) {
    const entries = Array.from(recentQueries.entries());
    entries.sort((a, b) => a[1] - b[1]);
    entries.slice(0, 200).forEach(([k]) => recentQueries.delete(k));
  }

  // Upsert to database
  await db
    .insert(searchZeroResults)
    .values({
      query,
      normalizedQuery: normalized,
      clusterId,
      intent,
      count: 1,
      lastSeenAt: new Date(),
    } as any)
    .onConflictDoUpdate({
      target: searchZeroResults.normalizedQuery,
      set: {
        count: sql`${searchZeroResults.count} + 1`,
        lastSeenAt: new Date(),
      } as any,
    });
}

/**
 * Get zero-result clusters ranked by frequency
 */
export async function getZeroClusters(limit: number = 50): Promise<ZeroResultCluster[]> {
  if (!isEnabled()) return [];

  const results = await db
    .select({
      clusterId: searchZeroResults.clusterId,
      query: searchZeroResults.query,
      normalizedQuery: searchZeroResults.normalizedQuery,
      count: searchZeroResults.count,
      intent: searchZeroResults.intent,
      lastSeenAt: searchZeroResults.lastSeenAt,
    })
    .from(searchZeroResults)
    .orderBy(desc(searchZeroResults.count))
    .limit(limit);

  // Group by cluster
  const clusterMap = new Map<string, ZeroResultCluster>();

  for (const row of results) {
    const clusterId = row.clusterId || generateClusterId(row.normalizedQuery);
    const existing = clusterMap.get(clusterId);

    if (existing) {
      existing.queries.push(row.query);
      existing.count += row.count;
      if (row.lastSeenAt && new Date(row.lastSeenAt) > new Date(existing.lastSeenAt)) {
        existing.lastSeenAt = row.lastSeenAt.toISOString();
      }
    } else {
      clusterMap.set(clusterId, {
        clusterId,
        queries: [row.query],
        normalizedQuery: row.normalizedQuery,
        count: row.count,
        intent: row.intent || undefined,
        lastSeenAt: row.lastSeenAt?.toISOString() || new Date().toISOString(),
        suggestedContentType: suggestContentType(row.query, row.intent || "informational"),
      });
    }
  }

  return Array.from(clusterMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get cluster by ID
 */
export async function getCluster(clusterId: string): Promise<ZeroResultCluster | null> {
  if (!isEnabled()) return null;

  const results = await db
    .select()
    .from(searchZeroResults)
    .where(eq(searchZeroResults.clusterId, clusterId));

  if (results.length === 0) return null;

  const totalCount = results.reduce((sum, r) => sum + r.count, 0);
  const lastSeen = results
    .map(r => r.lastSeenAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

  return {
    clusterId,
    queries: results.map(r => r.query),
    normalizedQuery: results[0].normalizedQuery,
    count: totalCount,
    intent: results[0].intent || undefined,
    lastSeenAt: lastSeen?.toISOString() || new Date().toISOString(),
    suggestedContentType: suggestContentType(
      results[0].query,
      results[0].intent || "informational"
    ),
  };
}

/**
 * Create a content task from a cluster
 */
export async function createTaskFromCluster(
  clusterId: string
): Promise<{ taskCreated: boolean; suggestion: string }> {
  if (!isEnabled()) {
    return { taskCreated: false, suggestion: "Feature disabled" };
  }

  const cluster = await getCluster(clusterId);
  if (!cluster) {
    return { taskCreated: false, suggestion: "Cluster not found" };
  }

  // Generate task suggestion
  const suggestion = generateTaskSuggestion(cluster);

  // In production, this would integrate with a task/ticket system
  // For now, just return the suggestion
  return {
    taskCreated: true,
    suggestion,
  };
}

function suggestContentType(query: string, intent: string): string {
  const lowerQuery = query.toLowerCase();

  if (/hotel|stay|accommodation/.test(lowerQuery)) return "hotel";
  if (/restaurant|food|dining|eat/.test(lowerQuery)) return "dining";
  if (/attraction|visit|see|tour/.test(lowerQuery)) return "attraction";
  if (/area|district|neighborhood/.test(lowerQuery)) return "district";

  if (intent === "informational") return "article";
  if (intent === "commercial") return "article";

  return "article";
}

function generateTaskSuggestion(cluster: ZeroResultCluster): string {
  return `Create ${cluster.suggestedContentType} content for: "${cluster.queries[0]}" (${cluster.count} searches)`;
}

/**
 * Get stats overview
 */
export async function getZeroResultStats(): Promise<ZeroResultStats> {
  if (!isEnabled()) {
    return { totalQueries: 0, totalClusters: 0, topClusters: [], recentQueries: [] };
  }

  const [totalResult] = await db
    .select({ total: sql<number>`SUM(${searchZeroResults.count})` })
    .from(searchZeroResults);

  const [clusterCount] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${searchZeroResults.clusterId})` })
    .from(searchZeroResults);

  const topClusters = await getZeroClusters(10);

  const recent = await db
    .select({
      query: searchZeroResults.query,
      count: searchZeroResults.count,
      lastSeen: searchZeroResults.lastSeenAt,
    })
    .from(searchZeroResults)
    .orderBy(desc(searchZeroResults.lastSeenAt))
    .limit(20);

  return {
    totalQueries: totalResult?.total || 0,
    totalClusters: clusterCount?.count || 0,
    topClusters,
    recentQueries: recent.map(r => ({
      query: r.query,
      count: r.count,
      lastSeen: r.lastSeen?.toISOString() || new Date().toISOString(),
    })),
  };
}
