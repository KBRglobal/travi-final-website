/**
 * Content Health Issue Repository
 *
 * Stores and manages health issues in memory.
 * Issues are refreshed on each scan cycle.
 */

import {
  type ContentHealthIssue,
  type HealthIssueType,
  type HealthIssueStatus,
  type HealthIssueSeverity,
  type ContentHealthStats,
  ISSUE_SEVERITY_MAP,
  ISSUE_MESSAGES,
} from "./types";

// In-memory storage for health issues
const healthIssues: Map<string, ContentHealthIssue> = new Map();
let lastScanAt: Date | null = null;

/**
 * Generate a unique issue ID
 */
function generateIssueId(contentId: string, issueType: HealthIssueType): string {
  return `${contentId}:${issueType}`;
}

/**
 * Create or update a health issue
 */
export function upsertHealthIssue(
  contentId: string,
  contentTitle: string,
  contentType: string,
  issueType: HealthIssueType,
  details?: Record<string, unknown>
): ContentHealthIssue {
  const issueId = generateIssueId(contentId, issueType);
  const existing = healthIssues.get(issueId);

  if (existing && existing.status !== 'resolved') {
    // Update existing issue
    existing.details = details;
    return existing;
  }

  // Create new issue
  const issue: ContentHealthIssue = {
    id: issueId,
    contentId,
    contentTitle,
    contentType,
    issueType,
    severity: ISSUE_SEVERITY_MAP[issueType],
    status: 'open',
    message: ISSUE_MESSAGES[issueType],
    details,
    detectedAt: new Date(),
    jobEnqueued: false,
  };

  healthIssues.set(issueId, issue);
  return issue;
}

/**
 * Mark an issue as resolved
 */
export function resolveHealthIssue(
  contentId: string,
  issueType: HealthIssueType
): boolean {
  const issueId = generateIssueId(contentId, issueType);
  const issue = healthIssues.get(issueId);

  if (!issue) return false;

  issue.status = 'resolved';
  issue.resolvedAt = new Date();
  return true;
}

/**
 * Mark an issue as ignored
 */
export function ignoreHealthIssue(issueId: string): boolean {
  const issue = healthIssues.get(issueId);
  if (!issue) return false;

  issue.status = 'ignored';
  return true;
}

/**
 * Mark that a job was enqueued for this issue
 */
export function markJobEnqueued(issueId: string): boolean {
  const issue = healthIssues.get(issueId);
  if (!issue) return false;

  issue.jobEnqueued = true;
  issue.jobEnqueuedAt = new Date();
  issue.status = 'in_progress';
  return true;
}

/**
 * Get all open issues
 */
export function getOpenIssues(limit?: number): ContentHealthIssue[] {
  const open = Array.from(healthIssues.values())
    .filter(issue => issue.status === 'open')
    .sort((a, b) => {
      // Sort by severity (critical first), then by date
      const severityOrder: Record<HealthIssueSeverity, number> = {
        critical: 0,
        warning: 1,
        info: 2,
      };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.detectedAt.getTime() - a.detectedAt.getTime();
    });

  return limit ? open.slice(0, limit) : open;
}

/**
 * Get issues for a specific content item
 */
export function getIssuesForContent(contentId: string): ContentHealthIssue[] {
  return Array.from(healthIssues.values())
    .filter(issue => issue.contentId === contentId);
}

/**
 * Get issues by type
 */
export function getIssuesByType(issueType: HealthIssueType): ContentHealthIssue[] {
  return Array.from(healthIssues.values())
    .filter(issue => issue.issueType === issueType && issue.status === 'open');
}

/**
 * Get issues by severity
 */
export function getIssuesBySeverity(severity: HealthIssueSeverity): ContentHealthIssue[] {
  return Array.from(healthIssues.values())
    .filter(issue => issue.severity === severity && issue.status === 'open');
}

/**
 * Get aggregated statistics
 */
export function getHealthStats(): ContentHealthStats {
  const allIssues = Array.from(healthIssues.values());
  const openIssues = allIssues.filter(i => i.status === 'open');

  const byIssueType: Record<HealthIssueType, number> = {
    no_entities: 0,
    no_aeo_capsule: 0,
    not_indexed: 0,
    low_intelligence_coverage: 0,
    no_blocks: 0,
    low_seo_score: 0,
    low_aeo_score: 0,
    stale_content: 0,
  };

  const bySeverity: Record<HealthIssueSeverity, number> = {
    critical: 0,
    warning: 0,
    info: 0,
  };

  for (const issue of openIssues) {
    byIssueType[issue.issueType]++;
    bySeverity[issue.severity]++;
  }

  // Count unique content IDs
  const contentIds = new Set(allIssues.map(i => i.contentId));
  const healthyContentIds = new Set(
    allIssues
      .filter(i => i.status === 'resolved')
      .map(i => i.contentId)
  );
  const unhealthyContentIds = new Set(
    openIssues
      .filter(i => i.severity === 'critical')
      .map(i => i.contentId)
  );
  const degradedContentIds = new Set(
    openIssues
      .filter(i => i.severity === 'warning' && !unhealthyContentIds.has(i.contentId))
      .map(i => i.contentId)
  );

  // Count resolved in last 24h
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const resolvedLast24h = allIssues.filter(
    i => i.status === 'resolved' && i.resolvedAt && i.resolvedAt > oneDayAgo
  ).length;

  return {
    totalContent: contentIds.size,
    healthyCount: healthyContentIds.size,
    degradedCount: degradedContentIds.size,
    unhealthyCount: unhealthyContentIds.size,
    byIssueType,
    bySeverity,
    lastScanAt,
    openIssues: openIssues.length,
    resolvedLast24h,
  };
}

/**
 * Update last scan timestamp
 */
export function setLastScanAt(date: Date): void {
  lastScanAt = date;
}

/**
 * Get last scan timestamp
 */
export function getLastScanAt(): Date | null {
  return lastScanAt;
}

/**
 * Clear all issues (for testing)
 */
export function clearAllIssues(): void {
  healthIssues.clear();
  lastScanAt = null;
}

/**
 * Get total issue count
 */
export function getTotalIssueCount(): number {
  return healthIssues.size;
}

/**
 * Get open issue count
 */
export function getOpenIssueCount(): number {
  return Array.from(healthIssues.values())
    .filter(i => i.status === 'open').length;
}
