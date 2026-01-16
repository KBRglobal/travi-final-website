/**
 * Technical SEO Audit Engine - Type Definitions
 *
 * Feature flag: ENABLE_SEO_AUDIT=true
 */

export function isSeoAuditEnabled(): boolean {
  return process.env.ENABLE_SEO_AUDIT === 'true';
}

/**
 * SEO check type.
 */
export type SeoCheckType =
  | 'missing_meta'
  | 'duplicate_titles'
  | 'thin_content'
  | 'broken_internal_links'
  | 'orphan_pages'
  | 'no_schema'
  | 'no_aeo_capsule'
  | 'missing_h1'
  | 'multiple_h1'
  | 'missing_alt_text'
  | 'long_title'
  | 'short_meta';

/**
 * Issue severity.
 */
export type SeoIssueSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * SEO issue.
 */
export interface SeoIssue {
  id: string;
  type: SeoCheckType;
  severity: SeoIssueSeverity;
  title: string;
  description: string;
  affectedItems: string[]; // Content IDs or URLs
  count: number;
  recommendation: string;
  detectedAt: Date;
}

/**
 * Check result.
 */
export interface CheckResult {
  check: SeoCheckType;
  passed: boolean;
  issues: SeoIssue[];
  itemsChecked: number;
  itemsFailed: number;
  executionTime: number; // ms
}

/**
 * Full audit result.
 */
export interface AuditResult {
  id: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  results: CheckResult[];
  summary: AuditSummary;
}

/**
 * Audit summary.
 */
export interface AuditSummary {
  totalChecks: number;
  checksPassed: number;
  checksFailed: number;
  totalIssues: number;
  bySeverity: Record<SeoIssueSeverity, number>;
  score: number; // 0-100
}

/**
 * Check configuration.
 */
export interface CheckConfig {
  type: SeoCheckType;
  name: string;
  description: string;
  severity: SeoIssueSeverity;
  enabled: boolean;
}

/**
 * Default check configurations.
 */
export const DEFAULT_CHECKS: CheckConfig[] = [
  {
    type: 'missing_meta',
    name: 'Missing Meta Descriptions',
    description: 'Pages without meta descriptions',
    severity: 'high',
    enabled: true,
  },
  {
    type: 'duplicate_titles',
    name: 'Duplicate Titles',
    description: 'Pages with identical titles',
    severity: 'high',
    enabled: true,
  },
  {
    type: 'thin_content',
    name: 'Thin Content',
    description: 'Pages with less than 300 words',
    severity: 'medium',
    enabled: true,
  },
  {
    type: 'broken_internal_links',
    name: 'Broken Internal Links',
    description: 'Links pointing to non-existent pages',
    severity: 'critical',
    enabled: true,
  },
  {
    type: 'orphan_pages',
    name: 'Orphan Pages',
    description: 'Pages with no internal links pointing to them',
    severity: 'medium',
    enabled: true,
  },
  {
    type: 'no_schema',
    name: 'Missing Schema',
    description: 'Pages without structured data',
    severity: 'medium',
    enabled: true,
  },
  {
    type: 'no_aeo_capsule',
    name: 'Missing AEO Capsule',
    description: 'Pages without answer engine optimization',
    severity: 'low',
    enabled: true,
  },
  {
    type: 'missing_h1',
    name: 'Missing H1',
    description: 'Pages without H1 heading',
    severity: 'high',
    enabled: true,
  },
  {
    type: 'multiple_h1',
    name: 'Multiple H1 Tags',
    description: 'Pages with more than one H1',
    severity: 'low',
    enabled: true,
  },
  {
    type: 'missing_alt_text',
    name: 'Missing Alt Text',
    description: 'Images without alt attributes',
    severity: 'medium',
    enabled: true,
  },
  {
    type: 'long_title',
    name: 'Long Titles',
    description: 'Titles exceeding 60 characters',
    severity: 'low',
    enabled: true,
  },
  {
    type: 'short_meta',
    name: 'Short Meta Descriptions',
    description: 'Meta descriptions under 120 characters',
    severity: 'low',
    enabled: true,
  },
];
