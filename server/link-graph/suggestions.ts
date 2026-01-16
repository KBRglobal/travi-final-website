/**
 * Link Graph Engine - Suggestions
 * Generates link suggestions for content optimization
 */

import { db } from '../db';
import { contents } from '@shared/schema';
import { eq, ne, and, sql } from 'drizzle-orm';
import {
  LinkSuggestion,
  LinkOpportunity,
  SuggestionReason,
  DEFAULT_LINK_GRAPH_CONFIG,
} from './types';
import { getGraph, getNode, getOrphanNodes, getOutboundLinks } from './graph-builder';

const suggestions: Map<string, LinkSuggestion[]> = new Map();
const MAX_SUGGESTIONS_PER_CONTENT = DEFAULT_LINK_GRAPH_CONFIG.maxSuggestionsPerContent;

function generateSuggestionId(): string {
  return `sug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractKeywords(title: string, blocks: any[]): string[] {
  const text = title + ' ' + extractText(blocks);
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 3);

  // Simple frequency-based keyword extraction
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function extractText(blocks: any[]): string {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .map(block => {
      if (typeof block === 'string') return block;
      if (block.text) return block.text;
      if (block.content) return extractText(block.content);
      if (block.children) return extractText(block.children);
      return '';
    })
    .join(' ');
}

function calculateRelevance(
  sourceKeywords: string[],
  targetKeywords: string[],
  sourceType: string,
  targetType: string
): number {
  const overlap = sourceKeywords.filter(k => targetKeywords.includes(k)).length;
  const keywordScore = sourceKeywords.length > 0 ? overlap / sourceKeywords.length : 0;

  // Type affinity bonus
  const typeAffinities: Record<string, string[]> = {
    article: ['hotel', 'restaurant', 'attraction', 'itinerary'],
    hotel: ['article', 'attraction', 'restaurant'],
    restaurant: ['article', 'hotel', 'attraction'],
    attraction: ['article', 'hotel', 'itinerary'],
    itinerary: ['article', 'attraction', 'hotel'],
  };

  const affinityBonus = typeAffinities[sourceType]?.includes(targetType) ? 0.2 : 0;

  return Math.min(1, keywordScore * 0.8 + affinityBonus);
}

export async function generateSuggestionsForContent(
  contentId: string
): Promise<LinkSuggestion[]> {
  const graph = getGraph();
  const sourceNode = graph.nodes.get(contentId);
  if (!sourceNode) return [];

  // Get source content details
  const [sourceContent] = await db
    .select()
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  if (!sourceContent) return [];

  const sourceBlocks = (sourceContent.blocks as any[]) || [];
  const sourceKeywords = extractKeywords(sourceContent.title, sourceBlocks);

  // Get existing outbound links
  const existingLinks = new Set(
    getOutboundLinks(contentId).map(e => e.targetId)
  );

  const newSuggestions: LinkSuggestion[] = [];

  // Strategy 1: Find topically relevant content
  const candidates = await db
    .select()
    .from(contents)
    .where(
      and(
        eq(contents.status, 'published'),
        ne(contents.id, contentId)
      )
    )
    .limit(100);

  for (const candidate of candidates) {
    if (existingLinks.has(candidate.id)) continue;

    const candidateBlocks = (candidate.blocks as any[]) || [];
    const candidateKeywords = extractKeywords(candidate.title, candidateBlocks);

    const relevance = calculateRelevance(
      sourceKeywords,
      candidateKeywords,
      sourceContent.type,
      candidate.type
    );

    if (relevance >= DEFAULT_LINK_GRAPH_CONFIG.minConfidenceThreshold) {
      const commonKeywords = sourceKeywords.filter(k => candidateKeywords.includes(k));
      const suggestedAnchor = commonKeywords.length > 0
        ? commonKeywords.slice(0, 2).join(' ')
        : candidate.title.slice(0, 50);

      newSuggestions.push({
        id: generateSuggestionId(),
        sourceContentId: contentId,
        targetContentId: candidate.id,
        reason: 'topical_relevance',
        confidence: relevance,
        suggestedAnchorText: suggestedAnchor,
        priority: Math.round(relevance * 100),
        createdAt: new Date(),
        status: 'pending',
      });
    }
  }

  // Strategy 2: Rescue orphan content
  const orphans = getOrphanNodes().filter(n => n.id !== contentId);
  for (const orphan of orphans.slice(0, 5)) {
    if (existingLinks.has(orphan.id)) continue;

    // Check if already suggested
    if (newSuggestions.some(s => s.targetContentId === orphan.id)) continue;

    newSuggestions.push({
      id: generateSuggestionId(),
      sourceContentId: contentId,
      targetContentId: orphan.id,
      reason: 'orphan_rescue',
      confidence: 0.7,
      suggestedAnchorText: orphan.title.slice(0, 50),
      priority: 70,
      createdAt: new Date(),
      status: 'pending',
    });
  }

  // Strategy 3: Link to high-authority content
  const topAuthorities = Array.from(graph.nodes.values())
    .filter(n => n.id !== contentId && !existingLinks.has(n.id))
    .sort((a, b) => b.authorityScore - a.authorityScore)
    .slice(0, 5);

  for (const authority of topAuthorities) {
    if (newSuggestions.some(s => s.targetContentId === authority.id)) continue;

    newSuggestions.push({
      id: generateSuggestionId(),
      sourceContentId: contentId,
      targetContentId: authority.id,
      reason: 'authority_boost',
      confidence: 0.65,
      suggestedAnchorText: authority.title.slice(0, 50),
      priority: 65,
      createdAt: new Date(),
      status: 'pending',
    });
  }

  // Sort by priority and limit
  const sorted = newSuggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_SUGGESTIONS_PER_CONTENT);

  suggestions.set(contentId, sorted);
  return sorted;
}

export function getSuggestions(contentId: string): LinkSuggestion[] {
  return suggestions.get(contentId) || [];
}

export function getAllPendingSuggestions(): LinkSuggestion[] {
  const all: LinkSuggestion[] = [];
  for (const contentSuggestions of suggestions.values()) {
    all.push(...contentSuggestions.filter(s => s.status === 'pending'));
  }
  return all.sort((a, b) => b.priority - a.priority);
}

export function acceptSuggestion(suggestionId: string): boolean {
  for (const contentSuggestions of suggestions.values()) {
    const suggestion = contentSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.status = 'accepted';
      return true;
    }
  }
  return false;
}

export function rejectSuggestion(suggestionId: string): boolean {
  for (const contentSuggestions of suggestions.values()) {
    const suggestion = contentSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.status = 'rejected';
      return true;
    }
  }
  return false;
}

export function clearSuggestions(contentId?: string): void {
  if (contentId) {
    suggestions.delete(contentId);
  } else {
    suggestions.clear();
  }
}

export async function findLinkOpportunities(contentId: string): Promise<LinkOpportunity[]> {
  const graph = getGraph();
  const sourceNode = graph.nodes.get(contentId);
  if (!sourceNode) return [];

  await generateSuggestionsForContent(contentId);
  const contentSuggestions = getSuggestions(contentId);

  return contentSuggestions.map(s => {
    const targetNode = graph.nodes.get(s.targetContentId);
    return {
      sourceId: contentId,
      sourceTitle: sourceNode.title,
      targetId: s.targetContentId,
      targetTitle: targetNode?.title || 'Unknown',
      matchType: s.reason,
      matchScore: s.confidence,
      suggestedAnchor: s.suggestedAnchorText,
    };
  });
}
