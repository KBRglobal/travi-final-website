/**
 * API Types
 *
 * Types for the Executive Growth Feed API.
 */

import type { SignalCategory, SignalPriority } from '../signals/types';
import type { ActionType } from '../prioritization/types';
import type { PlanStatus } from '../actions/types';
import type { ReadinessStatus } from '../safety/types';

/**
 * Feed item type
 */
export type FeedItemType = 'signal' | 'action' | 'insight' | 'alert' | 'milestone';

/**
 * Feed item priority
 */
export type FeedPriority = 'urgent' | 'high' | 'normal' | 'low';

/**
 * Feed item
 */
export interface FeedItem {
  /** Item ID */
  id: string;
  /** Item type */
  type: FeedItemType;
  /** Priority */
  priority: FeedPriority;
  /** Title */
  title: string;
  /** Summary */
  summary: string;
  /** Category */
  category: SignalCategory;
  /** Related entity type */
  entityType: string | null;
  /** Related entity ID */
  entityId: string | null;
  /** Call to action */
  cta: FeedCTA | null;
  /** Metrics */
  metrics: FeedMetrics | null;
  /** Timestamp */
  timestamp: Date;
  /** Expiration */
  expiresAt: Date;
  /** Read status */
  read: boolean;
  /** Dismissed */
  dismissed: boolean;
  /** Source reference */
  sourceId: string;
  /** Source type */
  sourceType: 'signal' | 'plan' | 'evaluation' | 'system';
}

/**
 * Call to action
 */
export interface FeedCTA {
  /** Action label */
  label: string;
  /** Action type */
  action: 'approve' | 'execute' | 'view' | 'dismiss' | 'investigate';
  /** Target ID */
  targetId: string;
  /** Target type */
  targetType: string;
}

/**
 * Feed metrics
 */
export interface FeedMetrics {
  /** Impact score */
  impact: number | null;
  /** Revenue impact */
  revenueImpact: number | null;
  /** Risk score */
  risk: number | null;
  /** Confidence */
  confidence: number | null;
  /** Custom metrics */
  custom: Record<string, number>;
}

/**
 * Feed filter options
 */
export interface FeedFilter {
  /** Item types to include */
  types?: FeedItemType[];
  /** Priorities to include */
  priorities?: FeedPriority[];
  /** Categories to include */
  categories?: SignalCategory[];
  /** Include read items */
  includeRead?: boolean;
  /** Include dismissed items */
  includeDismissed?: boolean;
  /** Since timestamp */
  since?: Date;
  /** Until timestamp */
  until?: Date;
  /** Limit */
  limit?: number;
  /** Offset */
  offset?: number;
}

/**
 * Feed response
 */
export interface FeedResponse {
  /** Feed items */
  items: FeedItem[];
  /** Total count (before pagination) */
  total: number;
  /** Unread count */
  unreadCount: number;
  /** Has more items */
  hasMore: boolean;
  /** Generated at */
  generatedAt: Date;
}

/**
 * Dashboard summary
 */
export interface DashboardSummary {
  /** Overall health score (0-100) */
  healthScore: number;
  /** Signal counts by category */
  signalsByCategory: Record<SignalCategory, number>;
  /** Signal counts by priority */
  signalsByPriority: Record<SignalPriority, number>;
  /** Pending actions count */
  pendingActions: number;
  /** Ready actions count */
  readyActions: number;
  /** Blocked actions count */
  blockedActions: number;
  /** Executing actions count */
  executingActions: number;
  /** Completed today */
  completedToday: number;
  /** Revenue opportunity */
  revenueOpportunity: number;
  /** Top risks */
  topRisks: Array<{ title: string; risk: number; id: string }>;
  /** Quick wins available */
  quickWins: number;
  /** Updated at */
  updatedAt: Date;
}

/**
 * Action queue item
 */
export interface QueueItem {
  /** Plan ID */
  planId: string;
  /** Title */
  title: string;
  /** Action type */
  actionType: ActionType;
  /** Status */
  status: PlanStatus;
  /** Readiness */
  readiness: ReadinessStatus;
  /** Priority score */
  priorityScore: number;
  /** Estimated duration (seconds) */
  estimatedDuration: number;
  /** Requires approval */
  requiresApproval: boolean;
  /** Approved */
  approved: boolean;
  /** Created at */
  createdAt: Date;
}

/**
 * Queue response
 */
export interface QueueResponse {
  /** Queue items */
  items: QueueItem[];
  /** Total pending */
  totalPending: number;
  /** Total ready */
  totalReady: number;
  /** Total blocked */
  totalBlocked: number;
  /** Estimated total duration */
  estimatedTotalDuration: number;
  /** Generated at */
  generatedAt: Date;
}

/**
 * API error response
 */
export interface APIError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Additional details */
  details?: Record<string, unknown>;
}
