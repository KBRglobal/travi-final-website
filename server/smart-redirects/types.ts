/**
 * Smart Redirects & URL Lifecycle Manager - Type Definitions
 *
 * Feature flag: ENABLE_SMART_REDIRECTS=true
 */

export function isSmartRedirectsEnabled(): boolean {
  return process.env.ENABLE_SMART_REDIRECTS === 'true';
}

/**
 * Redirect types.
 */
export type RedirectType = '301' | '302' | '307' | '308';

/**
 * Redirect rule.
 */
export interface RedirectRule {
  id: string;
  sourceUrl: string;
  targetUrl: string;
  type: RedirectType;
  isRegex: boolean;
  priority: number;
  enabled: boolean;
  hitCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * URL change event.
 */
export interface UrlChangeEvent {
  id: string;
  contentId: string;
  oldUrl: string;
  newUrl: string;
  changeType: 'slug_change' | 'path_change' | 'unpublish' | 'delete';
  autoRedirectCreated: boolean;
  timestamp: Date;
}

/**
 * Redirect match result.
 */
export interface RedirectMatch {
  matched: boolean;
  rule?: RedirectRule;
  targetUrl?: string;
  type?: RedirectType;
}

/**
 * Redirect chain.
 */
export interface RedirectChain {
  original: string;
  hops: Array<{
    from: string;
    to: string;
    type: RedirectType;
  }>;
  final: string;
  isLoop: boolean;
  chainLength: number;
}

/**
 * Redirect stats.
 */
export interface RedirectStats {
  totalRules: number;
  activeRules: number;
  totalHits: number;
  topRedirects: Array<{ rule: RedirectRule; hits: number }>;
  chainCount: number;
  loopCount: number;
}

/**
 * Bulk import result.
 */
export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ line: number; error: string }>;
}
