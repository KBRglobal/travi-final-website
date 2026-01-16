/**
 * Content Backlog Generator - Type Definitions
 *
 * Feature flag: ENABLE_CONTENT_BACKLOG=true
 */

export function isContentBacklogEnabled(): boolean {
  return process.env.ENABLE_CONTENT_BACKLOG === 'true';
}

/**
 * Source of backlog item.
 */
export type BacklogSource =
  | 'zero_result_search'
  | 'low_click_search'
  | 'rss_topic'
  | 'entity_gap';

/**
 * Backlog item status.
 */
export type BacklogItemStatus = 'new' | 'in_review' | 'approved' | 'rejected' | 'converted';

/**
 * Backlog item.
 */
export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  source: BacklogSource;
  sourceDetails: Record<string, unknown>;
  priorityScore: number; // 0-100
  status: BacklogItemStatus;
  suggestedKeywords: string[];
  relatedEntityIds: string[];
  createdAt: Date;
  updatedAt: Date;
  convertedContentId?: string;
}

/**
 * Scoring factors.
 */
export interface ScoringFactors {
  searchDemand: number;      // 0-100
  rssFrequency: number;      // 0-100
  entityImportance: number;  // 0-100
  competitionScore: number;  // 0-100 (lower = less competition = better)
}

/**
 * Backlog summary.
 */
export interface BacklogSummary {
  total: number;
  byStatus: Record<BacklogItemStatus, number>;
  bySource: Record<BacklogSource, number>;
  averageScore: number;
  topItems: BacklogItem[];
}

/**
 * Scoring weights.
 */
export const SCORING_WEIGHTS = {
  searchDemand: 0.35,
  rssFrequency: 0.20,
  entityImportance: 0.25,
  competitionScore: 0.20,
} as const;
