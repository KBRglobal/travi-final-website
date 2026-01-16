/**
 * Admin Activity Feed - Types
 */

export type ActivityType =
  | 'content_created'
  | 'content_updated'
  | 'content_published'
  | 'content_unpublished'
  | 'content_deleted'
  | 'content_approved'
  | 'content_rejected'
  | 'entity_created'
  | 'entity_updated'
  | 'entity_deleted'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'policy_block'
  | 'policy_override'
  | 'change_applied'
  | 'change_rolled_back'
  | 'config_changed'
  | 'user_login'
  | 'user_logout'
  | 'system_event';

export type ActivityResult = 'success' | 'failure' | 'pending' | 'blocked';

/**
 * Activity entry
 */
export interface Activity {
  id: string;
  type: ActivityType;
  result: ActivityResult;

  // Who
  actorId: string;
  actorName?: string;
  actorRole?: string;

  // What
  action: string;       // Human-readable action description
  details?: string;     // Additional details

  // On which entity
  entityId?: string;
  entityType?: string;
  entityTitle?: string;

  // When
  timestamp: Date;

  // Context
  metadata?: Record<string, unknown>;

  // For grouping related activities
  correlationId?: string;
}

/**
 * Create activity request
 */
export interface CreateActivityRequest {
  type: ActivityType;
  result: ActivityResult;
  actorId: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  details?: string;
  entityId?: string;
  entityType?: string;
  entityTitle?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

/**
 * Activity query
 */
export interface ActivityQuery {
  types?: ActivityType[];
  results?: ActivityResult[];
  actorId?: string;
  entityId?: string;
  entityType?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Activity summary
 */
export interface ActivitySummary {
  totalActivities: number;
  byType: Record<string, number>;
  byResult: Record<string, number>;
  byActor: { actorId: string; actorName?: string; count: number }[];
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Entity activity history
 */
export interface EntityActivityHistory {
  entityId: string;
  entityType?: string;
  activities: Activity[];
  totalCount: number;
}
