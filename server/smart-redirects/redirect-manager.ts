/**
 * Smart Redirects - Redirect Manager
 */

import {
  RedirectRule,
  RedirectType,
  RedirectMatch,
  RedirectChain,
  RedirectStats,
  UrlChangeEvent,
  BulkImportResult,
} from './types';

// In-memory stores
const redirectRules = new Map<string, RedirectRule>();
const urlChangeHistory: UrlChangeEvent[] = [];

/**
 * Create a redirect rule.
 */
export function createRedirect(
  sourceUrl: string,
  targetUrl: string,
  type: RedirectType = '301',
  options: {
    isRegex?: boolean;
    priority?: number;
    createdBy?: string;
    expiresAt?: Date;
  } = {}
): RedirectRule {
  const id = `redir-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const rule: RedirectRule = {
    id,
    sourceUrl: normalizeUrl(sourceUrl),
    targetUrl: normalizeUrl(targetUrl),
    type,
    isRegex: options.isRegex || false,
    priority: options.priority || 0,
    enabled: true,
    hitCount: 0,
    createdBy: options.createdBy || 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: options.expiresAt,
  };

  redirectRules.set(id, rule);
  return rule;
}

/**
 * Normalize URL for matching.
 */
function normalizeUrl(url: string): string {
  // Remove trailing slash, lowercase
  return url.toLowerCase().replace(/\/+$/, '') || '/';
}

/**
 * Get redirect rule.
 */
export function getRedirect(id: string): RedirectRule | null {
  return redirectRules.get(id) || null;
}

/**
 * Update redirect rule.
 */
export function updateRedirect(
  id: string,
  updates: Partial<Pick<RedirectRule, 'sourceUrl' | 'targetUrl' | 'type' | 'priority' | 'enabled' | 'expiresAt'>>
): RedirectRule | null {
  const rule = redirectRules.get(id);
  if (!rule) return null;

  Object.assign(rule, updates, { updatedAt: new Date() });
  redirectRules.set(id, rule);
  return rule;
}

/**
 * Delete redirect rule.
 */
export function deleteRedirect(id: string): boolean {
  return redirectRules.delete(id);
}

/**
 * Match URL against redirect rules.
 */
export function matchRedirect(url: string): RedirectMatch {
  const normalizedUrl = normalizeUrl(url);

  // Get all enabled rules sorted by priority
  const rules = Array.from(redirectRules.values())
    .filter(r => r.enabled)
    .filter(r => !r.expiresAt || r.expiresAt > new Date())
    .sort((a, b) => b.priority - a.priority);

  for (const rule of rules) {
    if (rule.isRegex) {
      try {
        const regex = new RegExp(rule.sourceUrl);
        if (regex.test(normalizedUrl)) {
          rule.hitCount++;
          return {
            matched: true,
            rule,
            targetUrl: normalizedUrl.replace(regex, rule.targetUrl),
            type: rule.type,
          };
        }
      } catch {
        // Invalid regex, skip
      }
    } else {
      if (normalizedUrl === rule.sourceUrl) {
        rule.hitCount++;
        return {
          matched: true,
          rule,
          targetUrl: rule.targetUrl,
          type: rule.type,
        };
      }
    }
  }

  return { matched: false };
}

/**
 * Find redirect chain.
 */
export function findRedirectChain(url: string, maxHops: number = 10): RedirectChain {
  const hops: Array<{ from: string; to: string; type: RedirectType }> = [];
  const visited = new Set<string>();
  let current = normalizeUrl(url);
  let isLoop = false;

  while (hops.length < maxHops) {
    if (visited.has(current)) {
      isLoop = true;
      break;
    }
    visited.add(current);

    const match = matchRedirect(current);
    if (!match.matched) break;

    hops.push({
      from: current,
      to: match.targetUrl!,
      type: match.type!,
    });

    current = match.targetUrl!;
  }

  return {
    original: normalizeUrl(url),
    hops,
    final: current,
    isLoop,
    chainLength: hops.length,
  };
}

/**
 * Record URL change event.
 */
export function recordUrlChange(
  contentId: string,
  oldUrl: string,
  newUrl: string,
  changeType: UrlChangeEvent['changeType'],
  autoCreateRedirect: boolean = true
): UrlChangeEvent {
  let autoRedirectCreated = false;

  if (autoCreateRedirect && changeType !== 'delete') {
    createRedirect(oldUrl, newUrl, '301', { createdBy: 'auto' });
    autoRedirectCreated = true;
  }

  const event: UrlChangeEvent = {
    id: `evt-${Date.now()}`,
    contentId,
    oldUrl,
    newUrl,
    changeType,
    autoRedirectCreated,
    timestamp: new Date(),
  };

  urlChangeHistory.push(event);

  // Keep last 1000 events
  if (urlChangeHistory.length > 1000) {
    urlChangeHistory.shift();
  }

  return event;
}

/**
 * Get all redirects.
 */
export function getAllRedirects(
  options: {
    enabled?: boolean;
    type?: RedirectType;
    limit?: number;
  } = {}
): RedirectRule[] {
  let rules = Array.from(redirectRules.values());

  if (options.enabled !== undefined) {
    rules = rules.filter(r => r.enabled === options.enabled);
  }

  if (options.type) {
    rules = rules.filter(r => r.type === options.type);
  }

  rules.sort((a, b) => b.hitCount - a.hitCount);

  if (options.limit) {
    rules = rules.slice(0, options.limit);
  }

  return rules;
}

/**
 * Find redirect chains and loops.
 */
export function findChainsAndLoops(): {
  chains: RedirectChain[];
  loops: RedirectChain[];
} {
  const chains: RedirectChain[] = [];
  const loops: RedirectChain[] = [];

  for (const rule of redirectRules.values()) {
    if (!rule.enabled) continue;

    const chain = findRedirectChain(rule.sourceUrl);
    if (chain.chainLength > 1) {
      if (chain.isLoop) {
        loops.push(chain);
      } else {
        chains.push(chain);
      }
    }
  }

  return { chains, loops };
}

/**
 * Get redirect stats.
 */
export function getRedirectStats(): RedirectStats {
  const rules = Array.from(redirectRules.values());
  const activeRules = rules.filter(r => r.enabled);
  const totalHits = rules.reduce((sum, r) => sum + r.hitCount, 0);

  const topRedirects = [...rules]
    .sort((a, b) => b.hitCount - a.hitCount)
    .slice(0, 10)
    .map(rule => ({ rule, hits: rule.hitCount }));

  const { chains, loops } = findChainsAndLoops();

  return {
    totalRules: rules.length,
    activeRules: activeRules.length,
    totalHits,
    topRedirects,
    chainCount: chains.length,
    loopCount: loops.length,
  };
}

/**
 * Bulk import redirects.
 */
export function bulkImport(
  redirects: Array<{ source: string; target: string; type?: RedirectType }>
): BulkImportResult {
  let imported = 0;
  let skipped = 0;
  const errors: Array<{ line: number; error: string }> = [];

  for (let i = 0; i < redirects.length; i++) {
    const { source, target, type } = redirects[i];

    if (!source || !target) {
      errors.push({ line: i + 1, error: 'Missing source or target URL' });
      continue;
    }

    // Check for duplicate source
    const existing = Array.from(redirectRules.values())
      .find(r => normalizeUrl(r.sourceUrl) === normalizeUrl(source));

    if (existing) {
      skipped++;
      continue;
    }

    try {
      createRedirect(source, target, type || '301', { createdBy: 'bulk-import' });
      imported++;
    } catch (error) {
      errors.push({ line: i + 1, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return { imported, skipped, errors };
}

/**
 * Export all redirects.
 */
export function exportRedirects(): Array<{
  source: string;
  target: string;
  type: RedirectType;
  enabled: boolean;
}> {
  return Array.from(redirectRules.values()).map(r => ({
    source: r.sourceUrl,
    target: r.targetUrl,
    type: r.type,
    enabled: r.enabled,
  }));
}

/**
 * Get URL change history.
 */
export function getUrlChangeHistory(
  contentId?: string,
  limit: number = 100
): UrlChangeEvent[] {
  let history = [...urlChangeHistory];

  if (contentId) {
    history = history.filter(e => e.contentId === contentId);
  }

  return history.slice(-limit).reverse();
}

/**
 * Cleanup expired redirects.
 */
export function cleanupExpired(): number {
  const now = new Date();
  let cleaned = 0;

  for (const [id, rule] of redirectRules) {
    if (rule.expiresAt && rule.expiresAt < now) {
      redirectRules.delete(id);
      cleaned++;
    }
  }

  return cleaned;
}
