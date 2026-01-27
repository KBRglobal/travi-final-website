/**
 * Link Graph Engine - Persistence
 * Handles graph storage and retrieval
 */

import { db } from "../db";
import { contents } from "@shared/schema";
import { sql } from "drizzle-orm";
import { LinkGraph, LinkNode, LinkEdge, GraphMetrics, DEFAULT_LINK_GRAPH_CONFIG } from "./types";
import { buildGraph, getGraph, isGraphStale, getOrphanNodes } from "./graph-builder";
import { updateAuthorityScores, getGraphMetrics } from "./centrality";
import { generateSuggestionsForContent, getAllPendingSuggestions } from "./suggestions";

let buildIntervalId: NodeJS.Timeout | null = null;
let isBuilding = false;

function isEnabled(): boolean {
  return process.env.ENABLE_LINK_GRAPH === "true";
}

export async function initializeLinkGraph(): Promise<void> {
  if (!isEnabled()) {
    return;
  }

  // Initial build
  await rebuildGraph();

  // Schedule periodic rebuilds
  const intervalMs = DEFAULT_LINK_GRAPH_CONFIG.buildIntervalHours * 60 * 60 * 1000;
  buildIntervalId = setInterval(async () => {
    if (isGraphStale()) {
      await rebuildGraph();
    }
  }, intervalMs);
}

export async function rebuildGraph(): Promise<GraphMetrics> {
  if (isBuilding) {
    return getGraphMetrics();
  }

  isBuilding = true;

  try {
    await buildGraph();
    updateAuthorityScores();

    const metrics = getGraphMetrics();

    return metrics;
  } finally {
    isBuilding = false;
  }
}

export function shutdownLinkGraph(): void {
  if (buildIntervalId) {
    clearInterval(buildIntervalId);
    buildIntervalId = null;
  }
}

export function exportGraphData(): {
  nodes: LinkNode[];
  edges: LinkEdge[];
  metrics: GraphMetrics;
  lastBuilt: Date;
} {
  const graph = getGraph();
  return {
    nodes: Array.from(graph.nodes.values()),
    edges: Array.from(graph.edges.values()),
    metrics: getGraphMetrics(),
    lastBuilt: graph.lastBuilt,
  };
}

export async function getOrphanReport(): Promise<{
  orphans: Array<{
    id: string;
    title: string;
    type: string;
    slug: string;
    authorityScore: number;
  }>;
  totalOrphans: number;
  percentageOfTotal: number;
}> {
  const orphans = getOrphanNodes();
  const metrics = getGraphMetrics();

  return {
    orphans: orphans.map(o => ({
      id: o.id,
      title: o.title,
      type: o.type,
      slug: o.slug,
      authorityScore: o.authorityScore,
    })),
    totalOrphans: orphans.length,
    percentageOfTotal: metrics.totalNodes > 0 ? (orphans.length / metrics.totalNodes) * 100 : 0,
  };
}

export async function getContentLinkStats(contentId: string): Promise<{
  inboundLinks: number;
  outboundLinks: number;
  authorityScore: number;
  isOrphan: boolean;
  pendingSuggestions: number;
} | null> {
  const graph = getGraph();
  const node = graph.nodes.get(contentId);
  if (!node) return null;

  const suggestions = await generateSuggestionsForContent(contentId);

  return {
    inboundLinks: node.inboundLinks,
    outboundLinks: node.outboundLinks,
    authorityScore: node.authorityScore,
    isOrphan: node.isOrphan,
    pendingSuggestions: suggestions.filter(s => s.status === "pending").length,
  };
}

export function getLinkGraphStatus(): {
  enabled: boolean;
  isBuilding: boolean;
  lastBuilt: Date;
  graphAge: number;
  isStale: boolean;
  metrics: GraphMetrics;
  pendingSuggestions: number;
} {
  const graph = getGraph();
  const metrics = getGraphMetrics();
  const pendingSuggestions = getAllPendingSuggestions().length;

  return {
    enabled: isEnabled(),
    isBuilding,
    lastBuilt: graph.lastBuilt,
    graphAge: Date.now() - graph.lastBuilt.getTime(),
    isStale: isGraphStale(),
    metrics,
    pendingSuggestions,
  };
}

export async function onContentChanged(contentId: string): Promise<void> {
  if (!isEnabled()) return;

  // Mark graph as needing refresh but don't rebuild immediately
  // The periodic rebuild will pick it up
}

export async function forceRefreshContent(contentId: string): Promise<void> {
  if (!isEnabled()) return;

  // For a single content change, we can update incrementally
  // For simplicity, we'll just regenerate suggestions
  await generateSuggestionsForContent(contentId);
}
