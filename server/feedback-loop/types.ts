/**
 * User Feedback Loop - Type Definitions
 *
 * Feature flag: ENABLE_FEEDBACK_LOOP=true
 */

export function isFeedbackLoopEnabled(): boolean {
  return process.env.ENABLE_FEEDBACK_LOOP === 'true';
}

/**
 * Feedback types.
 */
export type FeedbackType =
  | 'helpful'
  | 'not_helpful'
  | 'outdated'
  | 'inaccurate'
  | 'incomplete'
  | 'suggestion'
  | 'bug'
  | 'other';

/**
 * Feedback status.
 */
export type FeedbackStatus =
  | 'new'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'dismissed';

/**
 * Feedback priority.
 */
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Feedback entry.
 */
export interface FeedbackEntry {
  id: string;
  contentId: string;
  contentUrl: string;
  type: FeedbackType;
  message?: string;
  rating?: number; // 1-5
  userId?: string;
  userEmail?: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  assignedTo?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

/**
 * Feedback aggregation for a content piece.
 */
export interface ContentFeedbackSummary {
  contentId: string;
  contentUrl: string;
  totalFeedback: number;
  avgRating: number;
  helpfulCount: number;
  notHelpfulCount: number;
  issueCount: number;
  unresolvedCount: number;
  lastFeedbackAt?: Date;
  typeBreakdown: Record<FeedbackType, number>;
}

/**
 * Feedback trend data.
 */
export interface FeedbackTrend {
  date: string;
  totalFeedback: number;
  avgRating: number;
  typeBreakdown: Record<FeedbackType, number>;
}

/**
 * Feedback stats.
 */
export interface FeedbackStats {
  totalFeedback: number;
  newCount: number;
  inProgressCount: number;
  resolvedCount: number;
  avgRating: number;
  avgResolutionTime: number; // in hours
  topIssueTypes: Array<{ type: FeedbackType; count: number }>;
  contentWithMostIssues: ContentFeedbackSummary[];
  trends: FeedbackTrend[];
}

/**
 * Feedback filter options.
 */
export interface FeedbackFilter {
  contentId?: string;
  type?: FeedbackType;
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  assignedTo?: string;
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  hasRating?: boolean;
  minRating?: number;
  maxRating?: number;
}

/**
 * Feedback action log.
 */
export interface FeedbackActionLog {
  id: string;
  feedbackId: string;
  action: 'created' | 'status_change' | 'priority_change' | 'assigned' | 'resolved' | 'dismissed' | 'commented';
  previousValue?: string;
  newValue?: string;
  performedBy: string;
  comment?: string;
  timestamp: Date;
}

/**
 * Bulk feedback operation result.
 */
export interface BulkFeedbackResult {
  processed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}
