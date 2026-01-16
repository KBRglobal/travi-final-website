/**
 * Technical SEO Audit - Repository
 *
 * Stores and manages audit results.
 */

import {
  AuditResult,
  SeoIssue,
  SeoCheckType,
  SeoIssueSeverity,
} from './types';
import { getAudit, getLatestAudit, getAllAudits } from './runner';

/**
 * Get issues from latest audit.
 */
export function getLatestIssues(): SeoIssue[] {
  const latest = getLatestAudit();
  if (!latest) return [];

  return latest.results.flatMap(r => r.issues);
}

/**
 * Get issues by severity.
 */
export function getIssuesBySeverity(severity: SeoIssueSeverity): SeoIssue[] {
  return getLatestIssues().filter(i => i.severity === severity);
}

/**
 * Get issues by type.
 */
export function getIssuesByType(type: SeoCheckType): SeoIssue[] {
  return getLatestIssues().filter(i => i.type === type);
}

/**
 * Get critical issues.
 */
export function getCriticalIssues(): SeoIssue[] {
  return getIssuesBySeverity('critical');
}

/**
 * Get issues for specific content.
 */
export function getIssuesForContent(contentId: string): SeoIssue[] {
  return getLatestIssues().filter(i => i.affectedItems.includes(contentId));
}

/**
 * Get grouped issues.
 */
export function getGroupedIssues(): Map<SeoCheckType, SeoIssue[]> {
  const issues = getLatestIssues();
  const grouped = new Map<SeoCheckType, SeoIssue[]>();

  for (const issue of issues) {
    const existing = grouped.get(issue.type) || [];
    existing.push(issue);
    grouped.set(issue.type, existing);
  }

  return grouped;
}

/**
 * Get issue statistics.
 */
export function getIssueStats(): {
  total: number;
  bySeverity: Record<SeoIssueSeverity, number>;
  byType: Record<SeoCheckType, number>;
  mostAffectedContent: Array<{ contentId: string; issueCount: number }>;
} {
  const issues = getLatestIssues();

  const bySeverity: Record<SeoIssueSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const byType: Partial<Record<SeoCheckType, number>> = {};
  const contentIssueCount = new Map<string, number>();

  for (const issue of issues) {
    bySeverity[issue.severity]++;
    byType[issue.type] = (byType[issue.type] || 0) + 1;

    for (const contentId of issue.affectedItems) {
      contentIssueCount.set(contentId, (contentIssueCount.get(contentId) || 0) + 1);
    }
  }

  const mostAffectedContent = Array.from(contentIssueCount.entries())
    .map(([contentId, issueCount]) => ({ contentId, issueCount }))
    .sort((a, b) => b.issueCount - a.issueCount)
    .slice(0, 10);

  return {
    total: issues.length,
    bySeverity,
    byType: byType as Record<SeoCheckType, number>,
    mostAffectedContent,
  };
}

/**
 * Compare two audits.
 */
export function compareAudits(
  auditId1: string,
  auditId2: string
): {
  audit1: AuditResult | null;
  audit2: AuditResult | null;
  scoreChange: number;
  issuesFixed: number;
  newIssues: number;
} | null {
  const audit1 = getAudit(auditId1);
  const audit2 = getAudit(auditId2);

  if (!audit1 || !audit2) {
    return null;
  }

  const issues1 = audit1.results.flatMap(r => r.issues);
  const issues2 = audit2.results.flatMap(r => r.issues);

  // Compare by issue type and affected items
  const issueSet1 = new Set(issues1.map(i => `${i.type}:${i.affectedItems.sort().join(',')}`));
  const issueSet2 = new Set(issues2.map(i => `${i.type}:${i.affectedItems.sort().join(',')}`));

  const fixed = [...issueSet1].filter(i => !issueSet2.has(i)).length;
  const newIssues = [...issueSet2].filter(i => !issueSet1.has(i)).length;

  return {
    audit1,
    audit2,
    scoreChange: audit2.summary.score - audit1.summary.score,
    issuesFixed: fixed,
    newIssues,
  };
}

/**
 * Get audit history.
 */
export function getAuditHistory(limit: number = 10): Array<{
  id: string;
  date: Date;
  score: number;
  totalIssues: number;
}> {
  return getAllAudits(limit).map(a => ({
    id: a.id,
    date: a.startedAt,
    score: a.summary.score,
    totalIssues: a.summary.totalIssues,
  }));
}

/**
 * Get score trend.
 */
export function getScoreTrend(limit: number = 10): Array<{ date: Date; score: number }> {
  return getAllAudits(limit)
    .reverse()
    .map(a => ({
      date: a.startedAt,
      score: a.summary.score,
    }));
}
