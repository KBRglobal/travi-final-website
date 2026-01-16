/**
 * User Feedback Loop - Feedback Manager
 */

import {
  FeedbackEntry,
  FeedbackType,
  FeedbackStatus,
  FeedbackPriority,
  ContentFeedbackSummary,
  FeedbackTrend,
  FeedbackStats,
  FeedbackFilter,
  FeedbackActionLog,
  BulkFeedbackResult,
} from './types';

// In-memory stores
const feedbackEntries = new Map<string, FeedbackEntry>();
const actionLogs: FeedbackActionLog[] = [];

/**
 * Generate unique ID.
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Determine priority based on feedback type.
 */
function determinePriority(type: FeedbackType): FeedbackPriority {
  switch (type) {
    case 'bug':
    case 'inaccurate':
      return 'high';
    case 'outdated':
    case 'incomplete':
      return 'medium';
    case 'suggestion':
    case 'not_helpful':
      return 'low';
    default:
      return 'low';
  }
}

/**
 * Log a feedback action.
 */
function logAction(
  feedbackId: string,
  action: FeedbackActionLog['action'],
  performedBy: string,
  previousValue?: string,
  newValue?: string,
  comment?: string
): void {
  const log: FeedbackActionLog = {
    id: generateId('log'),
    feedbackId,
    action,
    previousValue,
    newValue,
    performedBy,
    comment,
    timestamp: new Date(),
  };

  actionLogs.push(log);

  // Keep last 10000 logs
  if (actionLogs.length > 10000) {
    actionLogs.shift();
  }
}

/**
 * Submit new feedback.
 */
export function submitFeedback(
  contentId: string,
  contentUrl: string,
  type: FeedbackType,
  options: {
    message?: string;
    rating?: number;
    userId?: string;
    userEmail?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  } = {}
): FeedbackEntry {
  const id = generateId('fb');

  const entry: FeedbackEntry = {
    id,
    contentId,
    contentUrl,
    type,
    message: options.message,
    rating: options.rating,
    userId: options.userId,
    userEmail: options.userEmail,
    status: 'new',
    priority: determinePriority(type),
    tags: options.tags || [],
    metadata: options.metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  feedbackEntries.set(id, entry);
  logAction(id, 'created', options.userId || 'anonymous');

  return entry;
}

/**
 * Get feedback by ID.
 */
export function getFeedback(id: string): FeedbackEntry | null {
  return feedbackEntries.get(id) || null;
}

/**
 * Update feedback status.
 */
export function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
  performedBy: string,
  resolution?: string
): FeedbackEntry | null {
  const entry = feedbackEntries.get(id);
  if (!entry) return null;

  const previousStatus = entry.status;
  entry.status = status;
  entry.updatedAt = new Date();

  if (status === 'resolved') {
    entry.resolvedAt = new Date();
    entry.resolution = resolution;
  }

  feedbackEntries.set(id, entry);
  logAction(id, 'status_change', performedBy, previousStatus, status, resolution);

  return entry;
}

/**
 * Update feedback priority.
 */
export function updateFeedbackPriority(
  id: string,
  priority: FeedbackPriority,
  performedBy: string
): FeedbackEntry | null {
  const entry = feedbackEntries.get(id);
  if (!entry) return null;

  const previousPriority = entry.priority;
  entry.priority = priority;
  entry.updatedAt = new Date();

  feedbackEntries.set(id, entry);
  logAction(id, 'priority_change', performedBy, previousPriority, priority);

  return entry;
}

/**
 * Assign feedback to a user.
 */
export function assignFeedback(
  id: string,
  assignedTo: string,
  performedBy: string
): FeedbackEntry | null {
  const entry = feedbackEntries.get(id);
  if (!entry) return null;

  const previousAssignee = entry.assignedTo;
  entry.assignedTo = assignedTo;
  entry.updatedAt = new Date();

  if (entry.status === 'new') {
    entry.status = 'acknowledged';
  }

  feedbackEntries.set(id, entry);
  logAction(id, 'assigned', performedBy, previousAssignee, assignedTo);

  return entry;
}

/**
 * Add tags to feedback.
 */
export function addFeedbackTags(id: string, tags: string[]): FeedbackEntry | null {
  const entry = feedbackEntries.get(id);
  if (!entry) return null;

  for (const tag of tags) {
    if (!entry.tags.includes(tag)) {
      entry.tags.push(tag);
    }
  }
  entry.updatedAt = new Date();

  feedbackEntries.set(id, entry);
  return entry;
}

/**
 * Remove tag from feedback.
 */
export function removeFeedbackTag(id: string, tag: string): FeedbackEntry | null {
  const entry = feedbackEntries.get(id);
  if (!entry) return null;

  entry.tags = entry.tags.filter((t) => t !== tag);
  entry.updatedAt = new Date();

  feedbackEntries.set(id, entry);
  return entry;
}

/**
 * Delete feedback.
 */
export function deleteFeedback(id: string): boolean {
  return feedbackEntries.delete(id);
}

/**
 * Get all feedback with filters.
 */
export function getAllFeedback(
  filter: FeedbackFilter = {},
  options: {
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'rating';
    order?: 'asc' | 'desc';
  } = {}
): FeedbackEntry[] {
  let entries = Array.from(feedbackEntries.values());

  // Apply filters
  if (filter.contentId) {
    entries = entries.filter((e) => e.contentId === filter.contentId);
  }

  if (filter.type) {
    entries = entries.filter((e) => e.type === filter.type);
  }

  if (filter.status) {
    entries = entries.filter((e) => e.status === filter.status);
  }

  if (filter.priority) {
    entries = entries.filter((e) => e.priority === filter.priority);
  }

  if (filter.assignedTo) {
    entries = entries.filter((e) => e.assignedTo === filter.assignedTo);
  }

  if (filter.tags && filter.tags.length > 0) {
    entries = entries.filter((e) =>
      filter.tags!.some((tag) => e.tags.includes(tag))
    );
  }

  if (filter.dateRange) {
    entries = entries.filter(
      (e) =>
        e.createdAt >= filter.dateRange!.start &&
        e.createdAt <= filter.dateRange!.end
    );
  }

  if (filter.hasRating !== undefined) {
    entries = entries.filter((e) =>
      filter.hasRating ? e.rating !== undefined : e.rating === undefined
    );
  }

  if (filter.minRating !== undefined) {
    entries = entries.filter(
      (e) => e.rating !== undefined && e.rating >= filter.minRating!
    );
  }

  if (filter.maxRating !== undefined) {
    entries = entries.filter(
      (e) => e.rating !== undefined && e.rating <= filter.maxRating!
    );
  }

  // Sort
  const sortBy = options.sortBy || 'createdAt';
  const order = options.order || 'desc';
  const multiplier = order === 'desc' ? -1 : 1;

  entries.sort((a, b) => {
    switch (sortBy) {
      case 'createdAt':
        return (a.createdAt.getTime() - b.createdAt.getTime()) * multiplier;
      case 'updatedAt':
        return (a.updatedAt.getTime() - b.updatedAt.getTime()) * multiplier;
      case 'priority': {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] - priorityOrder[b.priority]) * multiplier;
      }
      case 'rating':
        return ((a.rating || 0) - (b.rating || 0)) * multiplier;
      default:
        return 0;
    }
  });

  // Paginate
  if (options.offset) {
    entries = entries.slice(options.offset);
  }

  if (options.limit) {
    entries = entries.slice(0, options.limit);
  }

  return entries;
}

/**
 * Get feedback summary for a content piece.
 */
export function getContentFeedbackSummary(
  contentId: string
): ContentFeedbackSummary | null {
  const entries = Array.from(feedbackEntries.values()).filter(
    (e) => e.contentId === contentId
  );

  if (entries.length === 0) return null;

  const typeBreakdown: Record<FeedbackType, number> = {
    helpful: 0,
    not_helpful: 0,
    outdated: 0,
    inaccurate: 0,
    incomplete: 0,
    suggestion: 0,
    bug: 0,
    other: 0,
  };

  let totalRating = 0;
  let ratingCount = 0;

  for (const entry of entries) {
    typeBreakdown[entry.type]++;
    if (entry.rating !== undefined) {
      totalRating += entry.rating;
      ratingCount++;
    }
  }

  const unresolvedCount = entries.filter(
    (e) => e.status !== 'resolved' && e.status !== 'dismissed'
  ).length;

  const lastFeedbackAt = entries.reduce(
    (latest, e) => (e.createdAt > latest ? e.createdAt : latest),
    entries[0].createdAt
  );

  return {
    contentId,
    contentUrl: entries[0].contentUrl,
    totalFeedback: entries.length,
    avgRating: ratingCount > 0 ? totalRating / ratingCount : 0,
    helpfulCount: typeBreakdown.helpful,
    notHelpfulCount: typeBreakdown.not_helpful,
    issueCount:
      typeBreakdown.bug +
      typeBreakdown.inaccurate +
      typeBreakdown.outdated +
      typeBreakdown.incomplete,
    unresolvedCount,
    lastFeedbackAt,
    typeBreakdown,
  };
}

/**
 * Get feedback trends.
 */
export function getFeedbackTrends(days: number = 30): FeedbackTrend[] {
  const trends: FeedbackTrend[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayEntries = Array.from(feedbackEntries.values()).filter(
      (e) => e.createdAt.toISOString().split('T')[0] === dateStr
    );

    const typeBreakdown: Record<FeedbackType, number> = {
      helpful: 0,
      not_helpful: 0,
      outdated: 0,
      inaccurate: 0,
      incomplete: 0,
      suggestion: 0,
      bug: 0,
      other: 0,
    };

    let totalRating = 0;
    let ratingCount = 0;

    for (const entry of dayEntries) {
      typeBreakdown[entry.type]++;
      if (entry.rating !== undefined) {
        totalRating += entry.rating;
        ratingCount++;
      }
    }

    trends.push({
      date: dateStr,
      totalFeedback: dayEntries.length,
      avgRating: ratingCount > 0 ? totalRating / ratingCount : 0,
      typeBreakdown,
    });
  }

  return trends;
}

/**
 * Get feedback stats.
 */
export function getFeedbackStats(): FeedbackStats {
  const entries = Array.from(feedbackEntries.values());

  const newCount = entries.filter((e) => e.status === 'new').length;
  const inProgressCount = entries.filter(
    (e) => e.status === 'acknowledged' || e.status === 'in_progress'
  ).length;
  const resolvedCount = entries.filter((e) => e.status === 'resolved').length;

  // Calculate average rating
  const withRating = entries.filter((e) => e.rating !== undefined);
  const avgRating =
    withRating.length > 0
      ? withRating.reduce((sum, e) => sum + (e.rating || 0), 0) / withRating.length
      : 0;

  // Calculate average resolution time
  const resolved = entries.filter((e) => e.resolvedAt);
  const avgResolutionTime =
    resolved.length > 0
      ? resolved.reduce(
          (sum, e) =>
            sum + (e.resolvedAt!.getTime() - e.createdAt.getTime()) / 3600000,
          0
        ) / resolved.length
      : 0;

  // Top issue types
  const typeCounts = new Map<FeedbackType, number>();
  for (const entry of entries) {
    typeCounts.set(entry.type, (typeCounts.get(entry.type) || 0) + 1);
  }
  const topIssueTypes = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Content with most issues
  const contentCounts = new Map<string, number>();
  for (const entry of entries) {
    if (
      entry.type === 'bug' ||
      entry.type === 'inaccurate' ||
      entry.type === 'outdated' ||
      entry.type === 'incomplete'
    ) {
      contentCounts.set(
        entry.contentId,
        (contentCounts.get(entry.contentId) || 0) + 1
      );
    }
  }
  const contentWithMostIssues = Array.from(contentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([contentId]) => getContentFeedbackSummary(contentId)!)
    .filter(Boolean);

  const trends = getFeedbackTrends(30);

  return {
    totalFeedback: entries.length,
    newCount,
    inProgressCount,
    resolvedCount,
    avgRating,
    avgResolutionTime,
    topIssueTypes,
    contentWithMostIssues,
    trends,
  };
}

/**
 * Bulk update feedback status.
 */
export function bulkUpdateStatus(
  ids: string[],
  status: FeedbackStatus,
  performedBy: string
): BulkFeedbackResult {
  let processed = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const id of ids) {
    const result = updateFeedbackStatus(id, status, performedBy);
    if (result) {
      processed++;
    } else {
      failed++;
      errors.push({ id, error: 'Feedback not found' });
    }
  }

  return { processed, failed, errors };
}

/**
 * Bulk assign feedback.
 */
export function bulkAssign(
  ids: string[],
  assignedTo: string,
  performedBy: string
): BulkFeedbackResult {
  let processed = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const id of ids) {
    const result = assignFeedback(id, assignedTo, performedBy);
    if (result) {
      processed++;
    } else {
      failed++;
      errors.push({ id, error: 'Feedback not found' });
    }
  }

  return { processed, failed, errors };
}

/**
 * Get action logs for feedback.
 */
export function getFeedbackActionLogs(
  feedbackId: string,
  limit: number = 50
): FeedbackActionLog[] {
  return actionLogs
    .filter((log) => log.feedbackId === feedbackId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Get all unique tags.
 */
export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  for (const entry of feedbackEntries.values()) {
    for (const tag of entry.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

/**
 * Clear all data (for testing).
 */
export function clearAllData(): void {
  feedbackEntries.clear();
  actionLogs.length = 0;
}
