/**
 * Pre-Publish Checklist Types
 *
 * Type definitions for the pre-publish checklist system.
 *
 * FEATURE 5: Pre-Publish Checklist UI
 */

/**
 * Status of a single checklist item
 */
export type ChecklistItemStatus = 'pass' | 'fail' | 'warning' | 'skip';

/**
 * Priority of a checklist item
 */
export type ChecklistItemPriority = 'required' | 'recommended' | 'optional';

/**
 * Category of checklist items
 */
export type ChecklistCategory =
  | 'content'     // Body, structure
  | 'seo'         // Meta, keywords
  | 'aeo'         // Answer capsule, AI optimization
  | 'media'       // Images, videos
  | 'compliance'; // Legal, brand guidelines

/**
 * A single checklist item
 */
export interface ChecklistItem {
  id: string;
  name: string;
  description: string;
  category: ChecklistCategory;
  priority: ChecklistItemPriority;
  status: ChecklistItemStatus;
  message: string;
  helpUrl?: string;
}

/**
 * Full checklist result for a content item
 */
export interface ChecklistResult {
  contentId: string;
  contentTitle: string;
  contentType: string;
  canPublish: boolean;
  overallScore: number; // 0-100
  categories: {
    [key in ChecklistCategory]?: {
      score: number;
      passed: number;
      total: number;
      items: ChecklistItem[];
    };
  };
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
    total: number;
  };
  blockingItems: ChecklistItem[];
  warningItems: ChecklistItem[];
  evaluatedAt: Date;
}

/**
 * Checklist configuration per content type
 */
export interface ContentTypeChecklistConfig {
  contentType: string;
  checks: {
    id: string;
    name: string;
    description: string;
    category: ChecklistCategory;
    priority: ChecklistItemPriority;
    check: (content: ContentData) => CheckResult;
  }[];
}

/**
 * Content data passed to checklist evaluator
 */
export interface ContentData {
  id: string;
  title: string;
  type: string;
  status: string;
  slug: string | null;
  blocks: unknown[] | null;
  answerCapsule: string | null;
  aeoScore: number | null;
  seoScore: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  primaryKeyword: string | null;
  heroImage: string | null;
  cardImage: string | null;
  wordCount: number | null;
  isIndexed: boolean;
  hasEntities: boolean;
}

/**
 * Result of a single check
 */
export interface CheckResult {
  status: ChecklistItemStatus;
  message: string;
}

/**
 * Feature flag
 */
export function isChecklistEnabled(): boolean {
  // Always enabled - it's a visibility feature
  return true;
}
