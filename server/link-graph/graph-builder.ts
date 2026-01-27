/**
 * Link Graph Engine - Graph Builder
 * Builds and maintains the internal link graph
 */

import { db } from "../db";
import { contents } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { LinkGraph, LinkNode, LinkEdge, LinkContext, DEFAULT_LINK_GRAPH_CONFIG } from "./types";

// In-memory graph (could be Redis in production)
let currentGraph: LinkGraph = {
  nodes: new Map(),
  edges: new Map(),
  lastBuilt: new Date(0),
  version: 0,
};

const BUILD_TIMEOUT_MS = 60000;

function generateEdgeId(sourceId: string, targetId: string): string {
  return `${sourceId}->${targetId}`;
}

function extractLinksFromBlocks(blocks: any[]): Array<{
  href: string;
  anchorText: string;
  context: LinkContext;
}> {
  if (!Array.isArray(blocks)) return [];

  const links: Array<{ href: string; anchorText: string; context: LinkContext }> = [];

  const processBlock = (block: any, ctx: LinkContext = "body"): void => {
    if (!block) return;

    const blockStr = JSON.stringify(block);

    // Match href patterns
    const hrefRegex = /href=["']([^"']+)["'][^>]*>([^<]*)</gi;
    let match;
    while ((match = hrefRegex.exec(blockStr)) !== null) {
      const href = match[1];
      const anchorText = match[2].trim();

      // Only internal links
      if (href.startsWith("/") && !href.startsWith("//")) {
        links.push({ href, anchorText, context: ctx });
      }
    }

    // Recursively process nested blocks
    if (block.children) {
      for (const child of block.children) {
        processBlock(child, ctx);
      }
    }
    if (block.content) {
      for (const child of block.content) {
        processBlock(child, ctx);
      }
    }
  };

  for (const block of blocks) {
    processBlock(block);
  }

  return links;
}

function slugToContentId(slug: string, slugMap: Map<string, string>): string | null {
  // Normalize slug
  const normalized = slug.replace(/^\//, "").replace(/\/$/, "");
  return slugMap.get(normalized) || null;
}

export async function buildGraph(): Promise<LinkGraph> {
  const startTime = Date.now();

  const nodes = new Map<string, LinkNode>();
  const edges = new Map<string, LinkEdge>();
  const slugMap = new Map<string, string>();

  // Fetch all published content
  const allContent = await db
    .select({
      id: contents.id,
      type: contents.type,
      title: contents.title,
      slug: contents.slug,
      blocks: contents.blocks,
      updatedAt: contents.updatedAt,
    })
    .from(contents)
    .where(eq(contents.status, "published"));

  // Build slug -> id map
  for (const content of allContent) {
    slugMap.set(content.slug, content.id);

    nodes.set(content.id, {
      id: content.id,
      contentId: content.id,
      slug: content.slug,
      title: content.title,
      type: content.type,
      inboundLinks: 0,
      outboundLinks: 0,
      authorityScore: 1,
      isOrphan: true,
      lastUpdated: content.updatedAt || new Date(),
    });
  }

  // Extract links and build edges
  for (const content of allContent) {
    const blocks = (content.blocks as any[]) || [];
    const links = extractLinksFromBlocks(blocks);

    const node = nodes.get(content.id);
    if (!node) continue;

    const addedTargets = new Set<string>();

    for (const link of links) {
      const targetId = slugToContentId(link.href, slugMap);
      if (!targetId || targetId === content.id) continue;
      if (addedTargets.has(targetId)) continue;

      addedTargets.add(targetId);

      const edgeId = generateEdgeId(content.id, targetId);
      edges.set(edgeId, {
        id: edgeId,
        sourceId: content.id,
        targetId,
        anchorText: link.anchorText || "",
        context: link.context,
        strength: 1,
        createdAt: new Date(),
      });

      node.outboundLinks++;

      const targetNode = nodes.get(targetId);
      if (targetNode) {
        targetNode.inboundLinks++;
        targetNode.isOrphan = false;
      }
    }

    // Mark source as not orphan if it has outbound links
    if (node.outboundLinks > 0) {
      node.isOrphan = node.inboundLinks === 0;
    }
  }

  // Update orphan status
  for (const node of nodes.values()) {
    node.isOrphan = node.inboundLinks < DEFAULT_LINK_GRAPH_CONFIG.orphanThreshold;
  }

  const newGraph: LinkGraph = {
    nodes,
    edges,
    lastBuilt: new Date(),
    version: currentGraph.version + 1,
  };

  currentGraph = newGraph;

  const elapsed = Date.now() - startTime;

  return newGraph;
}

export function getGraph(): LinkGraph {
  return currentGraph;
}

export function getNode(contentId: string): LinkNode | null {
  return currentGraph.nodes.get(contentId) || null;
}

export function getInboundLinks(contentId: string): LinkEdge[] {
  const edges: LinkEdge[] = [];
  for (const edge of currentGraph.edges.values()) {
    if (edge.targetId === contentId) {
      edges.push(edge);
    }
  }
  return edges;
}

export function getOutboundLinks(contentId: string): LinkEdge[] {
  const edges: LinkEdge[] = [];
  for (const edge of currentGraph.edges.values()) {
    if (edge.sourceId === contentId) {
      edges.push(edge);
    }
  }
  return edges;
}

export function getOrphanNodes(): LinkNode[] {
  return Array.from(currentGraph.nodes.values()).filter(n => n.isOrphan);
}

export function getTopAuthorities(limit = 20): LinkNode[] {
  return Array.from(currentGraph.nodes.values())
    .sort((a, b) => b.authorityScore - a.authorityScore)
    .slice(0, limit);
}

export function getGraphAge(): number {
  return Date.now() - currentGraph.lastBuilt.getTime();
}

export function isGraphStale(): boolean {
  const maxAgeMs = DEFAULT_LINK_GRAPH_CONFIG.buildIntervalHours * 60 * 60 * 1000;
  return getGraphAge() > maxAgeMs;
}

export function invalidateNode(contentId: string): void {
  const node = currentGraph.nodes.get(contentId);
  if (node) {
    node.lastUpdated = new Date();
  }
}
