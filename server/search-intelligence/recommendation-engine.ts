/**
 * Search Intelligence - Recommendation Engine
 *
 * Generates content and entity recommendations based on gap analysis.
 */

import { ContentGap, detectGaps, GapAnalysis } from './gap-detector';
import { normalizeQuery } from './normalizer';

export type RecommendationType =
  | 'create_content'
  | 'add_entity'
  | 'improve_content'
  | 'add_keywords'
  | 'link_content';

export interface ContentRecommendation {
  id: string;
  type: RecommendationType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedKeywords: string[];
  relatedQueries: string[];
  estimatedImpact: number; // 0-100
  gap: ContentGap;
  createdAt: Date;
}

export interface RecommendationSummary {
  recommendations: ContentRecommendation[];
  byType: Record<RecommendationType, number>;
  byPriority: { high: number; medium: number; low: number };
  totalEstimatedImpact: number;
  gapAnalysis: GapAnalysis;
  generatedAt: Date;
}

/**
 * Generate recommendations from gap analysis.
 */
export async function generateRecommendations(
  sinceDays: number = 7,
  limit: number = 50
): Promise<RecommendationSummary> {
  const gapAnalysis = await detectGaps(sinceDays);
  const recommendations: ContentRecommendation[] = [];
  let recIdCounter = 0;

  for (const gap of gapAnalysis.gaps) {
    if (recommendations.length >= limit) break;

    const rec = createRecommendation(gap, () => `rec-${++recIdCounter}`);
    if (rec) {
      recommendations.push(rec);
    }
  }

  // Calculate summary stats
  const byType = countByType(recommendations);
  const byPriority = countByPriority(recommendations);
  const totalEstimatedImpact = recommendations.reduce((sum, r) => sum + r.estimatedImpact, 0);

  return {
    recommendations,
    byType,
    byPriority,
    totalEstimatedImpact,
    gapAnalysis,
    generatedAt: new Date(),
  };
}

/**
 * Create a recommendation from a content gap.
 */
function createRecommendation(
  gap: ContentGap,
  generateId: () => string
): ContentRecommendation | null {
  const normalized = normalizeQuery(gap.queries[0]);
  const keywords = extractKeywords(gap);

  switch (gap.type) {
    case 'zero_results':
      return createZeroResultsRecommendation(gap, normalized, keywords, generateId());

    case 'low_engagement':
      return createLowEngagementRecommendation(gap, normalized, keywords, generateId());

    case 'missing_entity':
      return createMissingEntityRecommendation(gap, normalized, keywords, generateId());

    case 'underserved_topic':
      return createUnderservedTopicRecommendation(gap, normalized, keywords, generateId());

    default:
      return null;
  }
}

function createZeroResultsRecommendation(
  gap: ContentGap,
  normalized: ReturnType<typeof normalizeQuery>,
  keywords: string[],
  id: string
): ContentRecommendation {
  // Determine if this needs new content or new entity
  const type: RecommendationType =
    normalized.intent === 'specific' ? 'add_entity' : 'create_content';

  const title =
    type === 'add_entity'
      ? `Add entity: ${normalized.entities[0] || keywords[0] || gap.normalizedQuery}`
      : `Create content for: ${gap.normalizedQuery}`;

  return {
    id,
    type,
    priority: gap.priority,
    title,
    description: `${gap.totalSearches} searches with no results. Users are looking for "${gap.queries[0]}" but nothing matches.`,
    suggestedKeywords: keywords,
    relatedQueries: gap.queries.slice(0, 5),
    estimatedImpact: calculateImpact(gap, type),
    gap,
    createdAt: new Date(),
  };
}

function createLowEngagementRecommendation(
  gap: ContentGap,
  normalized: ReturnType<typeof normalizeQuery>,
  keywords: string[],
  id: string
): ContentRecommendation {
  return {
    id,
    type: 'improve_content',
    priority: gap.priority,
    title: `Improve content for: ${gap.normalizedQuery}`,
    description: `${gap.totalSearches} searches with ${(gap.avgClickRate * 100).toFixed(1)}% click rate. Content exists but doesn't meet user needs.`,
    suggestedKeywords: keywords,
    relatedQueries: gap.queries.slice(0, 5),
    estimatedImpact: calculateImpact(gap, 'improve_content'),
    gap,
    createdAt: new Date(),
  };
}

function createMissingEntityRecommendation(
  gap: ContentGap,
  normalized: ReturnType<typeof normalizeQuery>,
  keywords: string[],
  id: string
): ContentRecommendation {
  const entityName = normalized.entities[0] || keywords[0] || gap.normalizedQuery;

  return {
    id,
    type: 'add_entity',
    priority: gap.priority,
    title: `Add entity: ${entityName}`,
    description: `Users are searching for "${entityName}" but no matching entity exists.`,
    suggestedKeywords: keywords,
    relatedQueries: gap.queries.slice(0, 5),
    estimatedImpact: calculateImpact(gap, 'add_entity'),
    gap,
    createdAt: new Date(),
  };
}

function createUnderservedTopicRecommendation(
  gap: ContentGap,
  _normalized: ReturnType<typeof normalizeQuery>,
  keywords: string[],
  id: string
): ContentRecommendation {
  return {
    id,
    type: 'create_content',
    priority: gap.priority,
    title: `Create content about: ${keywords.slice(0, 3).join(', ')}`,
    description: `Topic is underserved with ${gap.totalSearches} searches but limited content.`,
    suggestedKeywords: keywords,
    relatedQueries: gap.queries.slice(0, 5),
    estimatedImpact: calculateImpact(gap, 'create_content'),
    gap,
    createdAt: new Date(),
  };
}

/**
 * Extract keywords from a gap.
 */
function extractKeywords(gap: ContentGap): string[] {
  const keywords = new Set<string>();

  for (const query of gap.queries) {
    const normalized = normalizeQuery(query);
    for (const token of normalized.tokens) {
      keywords.add(token);
    }
    for (const entity of normalized.entities) {
      keywords.add(entity.toLowerCase());
    }
  }

  return Array.from(keywords).slice(0, 10);
}

/**
 * Calculate estimated impact (0-100).
 */
function calculateImpact(gap: ContentGap, type: RecommendationType): number {
  let base = 0;

  // Base impact from search volume
  if (gap.totalSearches >= 50) base = 40;
  else if (gap.totalSearches >= 20) base = 30;
  else if (gap.totalSearches >= 10) base = 20;
  else base = 10;

  // Priority multiplier
  const priorityMultiplier =
    gap.priority === 'high' ? 1.5 : gap.priority === 'medium' ? 1.2 : 1.0;

  // Type multiplier (creating new content has higher potential)
  const typeMultiplier =
    type === 'create_content'
      ? 1.3
      : type === 'add_entity'
      ? 1.2
      : type === 'improve_content'
      ? 1.1
      : 1.0;

  // Zero results have higher impact potential
  const zeroResultsBonus = gap.type === 'zero_results' ? 1.2 : 1.0;

  return Math.min(100, Math.round(base * priorityMultiplier * typeMultiplier * zeroResultsBonus));
}

/**
 * Count recommendations by type.
 */
function countByType(
  recommendations: ContentRecommendation[]
): Record<RecommendationType, number> {
  const counts: Record<RecommendationType, number> = {
    create_content: 0,
    add_entity: 0,
    improve_content: 0,
    add_keywords: 0,
    link_content: 0,
  };

  for (const rec of recommendations) {
    counts[rec.type]++;
  }

  return counts;
}

/**
 * Count recommendations by priority.
 */
function countByPriority(
  recommendations: ContentRecommendation[]
): { high: number; medium: number; low: number } {
  const counts = { high: 0, medium: 0, low: 0 };

  for (const rec of recommendations) {
    counts[rec.priority]++;
  }

  return counts;
}

/**
 * Get top recommendations by estimated impact.
 */
export async function getTopRecommendations(
  limit: number = 10,
  sinceDays: number = 7
): Promise<ContentRecommendation[]> {
  const summary = await generateRecommendations(sinceDays, 100);
  return summary.recommendations
    .sort((a, b) => b.estimatedImpact - a.estimatedImpact)
    .slice(0, limit);
}

/**
 * Get recommendations by type.
 */
export async function getRecommendationsByType(
  type: RecommendationType,
  sinceDays: number = 7
): Promise<ContentRecommendation[]> {
  const summary = await generateRecommendations(sinceDays);
  return summary.recommendations.filter(r => r.type === type);
}
