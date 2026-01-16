/**
 * Canonical & Duplicate Content Manager Types
 */

export type CanonicalStatus = 'canonical' | 'duplicate' | 'variant' | 'pending_review';

export interface CanonicalGroup {
  id: string;
  canonicalContentId: string;
  canonicalUrl: string;
  duplicates: DuplicateEntry[];
  variants: VariantEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DuplicateEntry {
  contentId: string;
  url: string;
  similarity: number;
  detectedAt: Date;
  action: 'redirect' | 'noindex' | 'delete' | 'keep';
  actionTakenAt?: Date;
}

export interface VariantEntry {
  contentId: string;
  url: string;
  variantType: 'language' | 'region' | 'format' | 'ab_test';
  relationship: 'alternate' | 'hreflang';
}

export interface DuplicateDetectionResult {
  contentId: string;
  title: string;
  potentialDuplicates: Array<{
    contentId: string;
    title: string;
    similarity: number;
    matchType: 'title' | 'content' | 'url' | 'mixed';
  }>;
  analyzedAt: Date;
}

export interface CanonicalStats {
  totalGroups: number;
  totalDuplicates: number;
  pendingReview: number;
  redirectsActive: number;
}

export function isCanonicalManagerEnabled(): boolean {
  return process.env.ENABLE_CANONICAL_MANAGER === 'true';
}
