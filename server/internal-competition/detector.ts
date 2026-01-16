/**
 * Internal Competition Detector Service
 *
 * Detects content cannibalization where multiple pieces of content
 * compete for the same keywords, topics, or audience.
 */

import { db } from "../db";
import { contents as content } from "@shared/schema";
import { eq, ne, and } from "drizzle-orm";
import type {
  CompetitionPair,
  CompetitionAnalysis,
  CompetitionCluster,
  CompetitionStats,
  CompetitionType,
  CompetitionSeverity,
  ResolutionStrategy,
} from "./types";
import { OVERLAP_WEIGHTS, SEVERITY_THRESHOLDS } from "./types";

// Storage for detected pairs and clusters
const competitionPairs = new Map<string, CompetitionPair>();
const competitionClusters = new Map<string, CompetitionCluster>();
const analysisCache = new Map<string, CompetitionAnalysis>();

/**
 * Analyze content for internal competition
 */
export async function analyzeCompetition(contentId: string): Promise<CompetitionAnalysis> {
  const [targetContent] = await db.select().from(content).where(eq(content.id, parseInt(contentId))).limit(1);

  if (!targetContent) {
    throw new Error(`Content ${contentId} not found`);
  }

  // Get all other published content
  const allContent = await db.select().from(content).where(
    and(
      ne(content.id, parseInt(contentId)),
      eq(content.status, 'published')
    )
  );

  const targetKeywords = extractKeywords(targetContent.title || '', targetContent.body || '');
  const targetTopics = extractTopics(targetContent.title || '', targetContent.body || '');

  const competingContent: CompetitionPair[] = [];

  for (const other of allContent) {
    const otherKeywords = extractKeywords(other.title || '', other.body || '');
    const otherTopics = extractTopics(other.title || '', other.body || '');

    const keywordOverlap = calculateOverlap(targetKeywords, otherKeywords);
    const topicOverlap = calculateOverlap(targetTopics, otherTopics);
    const titleSimilarity = calculateTitleSimilarity(targetContent.title || '', other.title || '');

    // Calculate overall overlap score
    const overlapScore = Math.round(
      keywordOverlap * OVERLAP_WEIGHTS.keyword * 100 +
      topicOverlap * OVERLAP_WEIGHTS.topic * 100 +
      titleSimilarity * (OVERLAP_WEIGHTS.entity + OVERLAP_WEIGHTS.audience + OVERLAP_WEIGHTS.intent) * 100
    );

    // Only flag if overlap is significant
    if (overlapScore >= SEVERITY_THRESHOLDS.low) {
      const sharedKeywords = targetKeywords.filter(k => otherKeywords.includes(k));
      const sharedTopics = targetTopics.filter(t => otherTopics.includes(t));

      const pair: CompetitionPair = {
        id: `${contentId}-${other.id}`,
        contentIdA: contentId,
        contentIdB: String(other.id),
        titleA: targetContent.title || 'Untitled',
        titleB: other.title || 'Untitled',
        type: determineCompetitionType(keywordOverlap, topicOverlap, titleSimilarity),
        severity: getSeverity(overlapScore),
        overlapScore,
        sharedElements: [...sharedKeywords.slice(0, 5), ...sharedTopics.slice(0, 3)],
        impactEstimate: getImpactEstimate(overlapScore),
        suggestedStrategy: suggestStrategy(overlapScore, keywordOverlap, topicOverlap),
        detectedAt: new Date(),
      };

      // Store the pair
      competitionPairs.set(pair.id, pair);
      competingContent.push(pair);
    }
  }

  // Sort by overlap score
  competingContent.sort((a, b) => b.overlapScore - a.overlapScore);

  const analysis: CompetitionAnalysis = {
    contentId,
    contentTitle: targetContent.title || 'Untitled',
    competingContent,
    totalCompetitors: competingContent.length,
    highestOverlap: competingContent[0]?.overlapScore || 0,
    primaryRisk: competingContent[0]?.type || null,
    analyzedAt: new Date(),
  };

  analysisCache.set(contentId, analysis);
  return analysis;
}

/**
 * Extract keywords from content
 */
function extractKeywords(title: string, body: string): string[] {
  const text = `${title} ${body}`.toLowerCase();

  // Simple keyword extraction - remove HTML, split, filter common words
  const words = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);

  // Filter common stop words
  const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'what', 'when', 'where', 'which', 'there', 'these', 'those', 'about', 'would', 'could', 'should', 'other', 'into', 'more', 'some', 'such', 'than', 'then', 'them', 'very', 'just', 'also', 'will', 'your', 'make', 'like', 'time', 'know', 'take', 'come', 'only', 'over', 'after', 'most', 'made', 'well']);

  const keywords = words.filter(w => !stopWords.has(w));

  // Get unique keywords with frequency > 1 or in title
  const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const freq = new Map<string, number>();

  for (const w of keywords) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  return Array.from(freq.entries())
    .filter(([word, count]) => count > 1 || titleWords.includes(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

/**
 * Extract topics from content
 */
function extractTopics(title: string, body: string): string[] {
  // Extract headings as topics
  const headingMatches = body.matchAll(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi);
  const topics: string[] = [];

  for (const match of headingMatches) {
    const topic = match[1].toLowerCase().trim();
    if (topic.length > 3 && topic.length < 100) {
      topics.push(topic);
    }
  }

  // Add title as primary topic
  if (title) {
    topics.unshift(title.toLowerCase().trim());
  }

  return topics.slice(0, 10);
}

/**
 * Calculate overlap between two arrays
 */
function calculateOverlap(arr1: string[], arr2: string[]): number {
  if (arr1.length === 0 || arr2.length === 0) return 0;

  const set1 = new Set(arr1);
  const set2 = new Set(arr2);

  let overlap = 0;
  for (const item of set1) {
    if (set2.has(item)) overlap++;
  }

  // Jaccard similarity
  const union = new Set([...arr1, ...arr2]).size;
  return union > 0 ? overlap / union : 0;
}

/**
 * Calculate title similarity using word overlap
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = title1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = title2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  return calculateOverlap(words1, words2);
}

/**
 * Determine primary competition type
 */
function determineCompetitionType(
  keywordOverlap: number,
  topicOverlap: number,
  titleSimilarity: number
): CompetitionType {
  if (keywordOverlap >= topicOverlap && keywordOverlap >= titleSimilarity) return 'keyword';
  if (topicOverlap >= keywordOverlap && topicOverlap >= titleSimilarity) return 'topic';
  return 'intent';
}

/**
 * Get severity level from overlap score
 */
function getSeverity(score: number): CompetitionSeverity {
  if (score >= SEVERITY_THRESHOLDS.critical) return 'critical';
  if (score >= SEVERITY_THRESHOLDS.high) return 'high';
  if (score >= SEVERITY_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/**
 * Get impact estimate description
 */
function getImpactEstimate(score: number): string {
  if (score >= 80) return 'Severe cannibalization likely splitting rankings';
  if (score >= 60) return 'Significant overlap may confuse search engines';
  if (score >= 40) return 'Moderate overlap could affect keyword rankings';
  return 'Minor overlap with limited impact';
}

/**
 * Suggest resolution strategy
 */
function suggestStrategy(
  overlapScore: number,
  keywordOverlap: number,
  topicOverlap: number
): ResolutionStrategy {
  if (overlapScore >= 80) {
    return topicOverlap > keywordOverlap ? 'merge' : 'redirect';
  }
  if (overlapScore >= 60) {
    return 'differentiate';
  }
  if (overlapScore >= 40) {
    return 'differentiate';
  }
  return 'no_action';
}

/**
 * Resolve a competition pair
 */
export function resolvePair(
  pairId: string,
  resolution: ResolutionStrategy,
  resolvedBy?: string
): CompetitionPair | null {
  const pair = competitionPairs.get(pairId);
  if (!pair) return null;

  pair.resolution = resolution;
  pair.resolvedAt = new Date();
  pair.resolvedBy = resolvedBy;

  competitionPairs.set(pairId, pair);
  return pair;
}

/**
 * Create a competition cluster
 */
export function createCluster(
  name: string,
  description: string,
  contentIds: string[],
  sharedKeywords: string[],
  sharedTopics: string[]
): CompetitionCluster {
  const cluster: CompetitionCluster = {
    id: `cluster-${Date.now()}`,
    name,
    description,
    contentIds,
    sharedKeywords,
    sharedTopics,
    createdAt: new Date(),
  };

  competitionClusters.set(cluster.id, cluster);
  return cluster;
}

/**
 * Get all clusters
 */
export function getClusters(): CompetitionCluster[] {
  return Array.from(competitionClusters.values());
}

/**
 * Get cached analysis
 */
export function getCachedAnalysis(contentId: string): CompetitionAnalysis | null {
  return analysisCache.get(contentId) || null;
}

/**
 * Get competition statistics
 */
export async function getCompetitionStats(): Promise<CompetitionStats> {
  const pairs = Array.from(competitionPairs.values());

  const byType: Record<CompetitionType, number> = {
    keyword: 0,
    topic: 0,
    entity: 0,
    audience: 0,
    intent: 0,
  };

  const bySeverity: Record<CompetitionSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  let resolved = 0;
  let totalScore = 0;

  for (const pair of pairs) {
    byType[pair.type]++;
    bySeverity[pair.severity]++;
    totalScore += pair.overlapScore;
    if (pair.resolvedAt) resolved++;
  }

  return {
    totalPairsDetected: pairs.length,
    byType,
    bySeverity,
    resolved,
    unresolved: pairs.length - resolved,
    clusters: competitionClusters.size,
    avgOverlapScore: pairs.length > 0 ? totalScore / pairs.length : 0,
  };
}

/**
 * Get unresolved high-priority pairs
 */
export function getHighPriorityPairs(limit: number = 20): CompetitionPair[] {
  return Array.from(competitionPairs.values())
    .filter(p => !p.resolvedAt && (p.severity === 'critical' || p.severity === 'high'))
    .sort((a, b) => b.overlapScore - a.overlapScore)
    .slice(0, limit);
}
