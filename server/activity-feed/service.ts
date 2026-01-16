/**
 * Admin Activity Feed - Service
 */

import { log } from '../lib/logger';
import type {
  Activity,
  ActivityType,
  ActivityResult,
  CreateActivityRequest,
  ActivityQuery,
  ActivitySummary,
  EntityActivityHistory,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ActivityFeed] ${msg}`, data),
};

// Bounded storage
const MAX_ACTIVITIES = 10000;

/**
 * Generate unique activity ID
 */
function generateActivityId(): string {
  return `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

class ActivityFeedService {
  private activities: Map<string, Activity> = new Map();
  private byEntity: Map<string, Set<string>> = new Map();
  private byActor: Map<string, Set<string>> = new Map();
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_ACTIVITY_FEED === 'true';
    if (this.enabled) {
      logger.info('Activity Feed Service initialized');
    }
  }

  /**
   * Record an activity
   */
  record(request: CreateActivityRequest): Activity {
    const activity: Activity = {
      id: generateActivityId(),
      type: request.type,
      result: request.result,
      actorId: request.actorId,
      actorName: request.actorName,
      actorRole: request.actorRole,
      action: request.action,
      details: request.details,
      entityId: request.entityId,
      entityType: request.entityType,
      entityTitle: request.entityTitle,
      timestamp: new Date(),
      metadata: request.metadata,
      correlationId: request.correlationId,
    };

    this.activities.set(activity.id, activity);

    // Index by entity
    if (request.entityId) {
      if (!this.byEntity.has(request.entityId)) {
        this.byEntity.set(request.entityId, new Set());
      }
      this.byEntity.get(request.entityId)!.add(activity.id);
    }

    // Index by actor
    if (!this.byActor.has(request.actorId)) {
      this.byActor.set(request.actorId, new Set());
    }
    this.byActor.get(request.actorId)!.add(activity.id);

    // Enforce limit
    this.enforceLimit();

    logger.info('Activity recorded', {
      id: activity.id,
      type: activity.type,
      action: activity.action,
    });

    return activity;
  }

  /**
   * Get activity by ID
   */
  get(id: string): Activity | undefined {
    return this.activities.get(id);
  }

  /**
   * Query activities
   */
  query(query: ActivityQuery = {}): Activity[] {
    let results: Activity[];

    // Start from appropriate index
    if (query.entityId) {
      const entityActivities = this.byEntity.get(query.entityId);
      if (!entityActivities) return [];
      results = Array.from(entityActivities)
        .map(id => this.activities.get(id)!)
        .filter(Boolean);
    } else if (query.actorId) {
      const actorActivities = this.byActor.get(query.actorId);
      if (!actorActivities) return [];
      results = Array.from(actorActivities)
        .map(id => this.activities.get(id)!)
        .filter(Boolean);
    } else {
      results = Array.from(this.activities.values());
    }

    // Apply filters
    if (query.types?.length) {
      results = results.filter(a => query.types!.includes(a.type));
    }

    if (query.results?.length) {
      results = results.filter(a => query.results!.includes(a.result));
    }

    if (query.entityType) {
      results = results.filter(a => a.entityType === query.entityType);
    }

    if (query.since) {
      results = results.filter(a => a.timestamp >= query.since!);
    }

    if (query.until) {
      results = results.filter(a => a.timestamp <= query.until!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get activities for an entity
   */
  getEntityHistory(entityId: string, limit = 50): EntityActivityHistory {
    const activities = this.query({ entityId, limit });
    const totalSet = this.byEntity.get(entityId);

    return {
      entityId,
      entityType: activities[0]?.entityType,
      activities,
      totalCount: totalSet?.size || 0,
    };
  }

  /**
   * Get activity summary for a period
   */
  getSummary(since?: Date, until?: Date): ActivitySummary {
    const now = new Date();
    const periodStart = since || new Date(now.getTime() - 24 * 3600000);
    const periodEnd = until || now;

    const activities = this.query({ since: periodStart, until: periodEnd, limit: 1000 });

    const byType: Record<string, number> = {};
    const byResult: Record<string, number> = {};
    const actorCounts = new Map<string, { name?: string; count: number }>();

    for (const activity of activities) {
      byType[activity.type] = (byType[activity.type] || 0) + 1;
      byResult[activity.result] = (byResult[activity.result] || 0) + 1;

      const actorData = actorCounts.get(activity.actorId) || { name: activity.actorName, count: 0 };
      actorData.count++;
      actorCounts.set(activity.actorId, actorData);
    }

    const byActor = Array.from(actorCounts.entries())
      .map(([actorId, data]) => ({ actorId, actorName: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalActivities: activities.length,
      byType,
      byResult,
      byActor,
      periodStart,
      periodEnd,
    };
  }

  /**
   * Get recent activities
   */
  getRecent(limit = 50): Activity[] {
    return this.query({ limit });
  }

  /**
   * Get today's activities
   */
  getToday(): Activity[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.query({ since: today });
  }

  /**
   * Enforce storage limit
   */
  private enforceLimit(): void {
    if (this.activities.size <= MAX_ACTIVITIES) return;

    // Remove oldest activities
    const sorted = Array.from(this.activities.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const toRemove = sorted.slice(0, this.activities.size - MAX_ACTIVITIES);
    for (const activity of toRemove) {
      this.activities.delete(activity.id);

      if (activity.entityId) {
        const entitySet = this.byEntity.get(activity.entityId);
        if (entitySet) entitySet.delete(activity.id);
      }

      const actorSet = this.byActor.get(activity.actorId);
      if (actorSet) actorSet.delete(activity.id);
    }
  }

  /**
   * Clear all activities (for testing)
   */
  clear(): void {
    this.activities.clear();
    this.byEntity.clear();
    this.byActor.clear();
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get total count
   */
  count(): number {
    return this.activities.size;
  }
}

// Singleton
let instance: ActivityFeedService | null = null;

export function getActivityFeedService(): ActivityFeedService {
  if (!instance) {
    instance = new ActivityFeedService();
  }
  return instance;
}

export function resetActivityFeedService(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}

export { ActivityFeedService };

// ============================================================
// ACTIVITY RECORDING HELPERS
// ============================================================

/**
 * Record content activity
 */
export function recordContentActivity(
  type: 'content_created' | 'content_updated' | 'content_published' | 'content_unpublished' | 'content_deleted',
  actorId: string,
  actorName: string,
  contentId: string,
  contentTitle: string,
  result: ActivityResult = 'success',
  details?: string
): Activity | null {
  const service = getActivityFeedService();
  if (!service.isEnabled()) return null;

  const actions: Record<string, string> = {
    content_created: 'created content',
    content_updated: 'updated content',
    content_published: 'published content',
    content_unpublished: 'unpublished content',
    content_deleted: 'deleted content',
  };

  return service.record({
    type,
    result,
    actorId,
    actorName,
    action: `${actorName} ${actions[type]} "${contentTitle}"`,
    details,
    entityId: contentId,
    entityType: 'content',
    entityTitle: contentTitle,
  });
}

/**
 * Record approval activity
 */
export function recordApprovalActivity(
  type: 'approval_granted' | 'approval_denied' | 'approval_requested',
  actorId: string,
  actorName: string,
  contentId: string,
  contentTitle: string,
  details?: string
): Activity | null {
  const service = getActivityFeedService();
  if (!service.isEnabled()) return null;

  const actions: Record<string, string> = {
    approval_granted: 'approved',
    approval_denied: 'rejected',
    approval_requested: 'requested approval for',
  };

  return service.record({
    type,
    result: 'success',
    actorId,
    actorName,
    action: `${actorName} ${actions[type]} "${contentTitle}"`,
    details,
    entityId: contentId,
    entityType: 'content',
    entityTitle: contentTitle,
  });
}

/**
 * Record policy block
 */
export function recordPolicyBlock(
  actorId: string,
  actorName: string,
  contentId: string,
  contentTitle: string,
  policyName: string,
  reason: string
): Activity | null {
  const service = getActivityFeedService();
  if (!service.isEnabled()) return null;

  return service.record({
    type: 'policy_block',
    result: 'blocked',
    actorId,
    actorName,
    action: `"${contentTitle}" blocked by ${policyName}`,
    details: reason,
    entityId: contentId,
    entityType: 'content',
    entityTitle: contentTitle,
    metadata: { policyName },
  });
}

/**
 * Record change management activity
 */
export function recordChangeActivity(
  type: 'change_applied' | 'change_rolled_back',
  actorId: string,
  actorName: string,
  changeId: string,
  changeTitle: string,
  result: ActivityResult
): Activity | null {
  const service = getActivityFeedService();
  if (!service.isEnabled()) return null;

  const action = type === 'change_applied'
    ? `${actorName} applied change "${changeTitle}"`
    : `${actorName} rolled back change "${changeTitle}"`;

  return service.record({
    type,
    result,
    actorId,
    actorName,
    action,
    entityId: changeId,
    entityType: 'change',
    entityTitle: changeTitle,
  });
}
