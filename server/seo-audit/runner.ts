/**
 * Technical SEO Audit - Audit Runner
 */

import { db } from '../db';
import { contents as content } from '@shared/schema';
import { eq } from 'drizzle-orm';
import {
  AuditResult,
  AuditSummary,
  CheckResult,
  SeoCheckType,
  SeoIssueSeverity,
  DEFAULT_CHECKS,
} from './types';
import * as checks from './checks';

// In-memory audit store
const auditStore = new Map<string, AuditResult>();

/**
 * Run a full SEO audit.
 */
export async function runFullAudit(
  enabledChecks?: SeoCheckType[]
): Promise<AuditResult> {
  const auditId = `audit-${Date.now()}`;

  // Create audit entry
  const audit: AuditResult = {
    id: auditId,
    status: 'running',
    startedAt: new Date(),
    results: [],
    summary: {
      totalChecks: 0,
      checksPassed: 0,
      checksFailed: 0,
      totalIssues: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      score: 0,
    },
  };

  auditStore.set(auditId, audit);

  try {
    // Get all published content
    const allContent = await (db.query as any).contents.findMany({
      where: eq(content.status, 'published'),
    });

    const ctx = { allContent };

    // Determine which checks to run
    const checksToRun = enabledChecks
      ? DEFAULT_CHECKS.filter(c => enabledChecks.includes(c.type))
      : DEFAULT_CHECKS.filter(c => c.enabled);

    const results: CheckResult[] = [];

    // Run each check
    for (const checkConfig of checksToRun) {
      const result = await runCheck(checkConfig.type, ctx);
      if (result) {
        results.push(result);
      }
    }

    // Calculate summary
    const summary = calculateSummary(results);

    // Update audit
    audit.status = 'completed';
    audit.completedAt = new Date();
    audit.results = results;
    audit.summary = summary;

    auditStore.set(auditId, audit);

    return audit;
  } catch (error) {
    audit.status = 'failed';
    audit.completedAt = new Date();
    auditStore.set(auditId, audit);
    throw error;
  }
}

/**
 * Run a single check.
 */
async function runCheck(
  type: SeoCheckType,
  ctx: { allContent: Array<typeof content.$inferSelect> }
): Promise<CheckResult | null> {
  switch (type) {
    case 'missing_meta':
      return checks.checkMissingMeta(ctx);
    case 'duplicate_titles':
      return checks.checkDuplicateTitles(ctx);
    case 'thin_content':
      return checks.checkThinContent(ctx);
    case 'broken_internal_links':
      return checks.checkBrokenInternalLinks(ctx);
    case 'orphan_pages':
      return checks.checkOrphanPages(ctx);
    case 'no_schema':
      return checks.checkNoSchema(ctx);
    case 'no_aeo_capsule':
      return checks.checkNoAeoCapsule(ctx);
    case 'missing_h1':
      return checks.checkMissingH1(ctx);
    case 'multiple_h1':
      return checks.checkMultipleH1(ctx);
    case 'missing_alt_text':
      return checks.checkMissingAltText(ctx);
    case 'long_title':
      return checks.checkLongTitle(ctx);
    case 'short_meta':
      return checks.checkShortMeta(ctx);
    default:
      return null;
  }
}

/**
 * Calculate audit summary.
 */
function calculateSummary(results: CheckResult[]): AuditSummary {
  const summary: AuditSummary = {
    totalChecks: results.length,
    checksPassed: 0,
    checksFailed: 0,
    totalIssues: 0,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    score: 0,
  };

  for (const result of results) {
    if (result.passed) {
      summary.checksPassed++;
    } else {
      summary.checksFailed++;
    }

    for (const issue of result.issues) {
      summary.totalIssues++;
      summary.bySeverity[issue.severity]++;
    }
  }

  // Calculate score (100 - penalty)
  const penalty =
    summary.bySeverity.critical * 15 +
    summary.bySeverity.high * 8 +
    summary.bySeverity.medium * 4 +
    summary.bySeverity.low * 1;

  summary.score = Math.max(0, 100 - penalty);

  return summary;
}

/**
 * Get audit by ID.
 */
export function getAudit(auditId: string): AuditResult | null {
  return auditStore.get(auditId) || null;
}

/**
 * Get latest audit.
 */
export function getLatestAudit(): AuditResult | null {
  const audits = Array.from(auditStore.values())
    .filter(a => a.status === 'completed')
    .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));

  return audits[0] || null;
}

/**
 * Get all audits.
 */
export function getAllAudits(limit: number = 10): AuditResult[] {
  return Array.from(auditStore.values())
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, limit);
}

/**
 * Run a single check only.
 */
export async function runSingleCheck(type: SeoCheckType): Promise<CheckResult | null> {
  const allContent = await (db.query as any).contents.findMany({
    where: eq(content.status, 'published'),
  });

  return runCheck(type, { allContent });
}
