/**
 * SEO Technical Health Engine - Type Definitions
 * Feature Flag: ENABLE_SEO_HEALTH=true
 */

// ============================================================================
// Issue Types
// ============================================================================

export type SeoIssueType =
  | 'missing_title'
  | 'missing_description'
  | 'duplicate_title'
  | 'duplicate_description'
  | 'missing_h1'
  | 'multiple_h1'
  | 'broken_internal_link'
  | 'orphan_page'
  | 'missing_alt_text'
  | 'title_too_long'
  | 'title_too_short'
  | 'description_too_long'
  | 'description_too_short'
  | 'missing_canonical'
  | 'thin_content';

export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface SeoIssue {
  type: SeoIssueType;
  severity: IssueSeverity;
  description: string;
  contentId?: string;
  contentTitle?: string;
  details?: Record<string, unknown>;
  recommendation: string;
}

// ============================================================================
// Health Analysis
// ============================================================================

export interface ContentSeoHealth {
  contentId: string;
  contentTitle: string;
  contentType: string;
  healthScore: number;
  issues: SeoIssue[];
  checkedAt: Date;
}

export interface SeoHealthCheck {
  type: SeoIssueType;
  name: string;
  description: string;
  severity: IssueSeverity;
  check: (content: ContentForCheck) => SeoIssue | null;
}

export interface ContentForCheck {
  id: string;
  title: string;
  type: string;
  metaTitle?: string;
  metaDescription?: string;
  slug: string;
  blocks?: unknown[];
  status: string;
  internalLinks?: string[];
  inboundLinks?: number;
}

// ============================================================================
// Summary
// ============================================================================

export interface SeoHealthSummary {
  totalContent: number;
  totalIssues: number;
  avgHealthScore: number;
  issuesBySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
  issuesByType: Array<{ type: SeoIssueType; count: number }>;
  contentWithIssues: number;
  healthyContent: number;
  analyzedAt: Date;
}

// ============================================================================
// Issue List
// ============================================================================

export interface SeoIssueListItem {
  contentId: string;
  contentTitle: string;
  issue: SeoIssue;
}

export interface SeoIssueList {
  issues: SeoIssueListItem[];
  total: number;
  bySeverity: { severity: IssueSeverity; count: number }[];
  byType: { type: SeoIssueType; count: number }[];
}
