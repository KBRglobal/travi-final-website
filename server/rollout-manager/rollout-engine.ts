/**
 * Release & Rollout Manager - Rollout Engine
 */

import {
  Release,
  ReleaseStatus,
  RolloutStrategy,
  ReleaseItem,
  RolloutStage,
  RolloutMetrics,
  HealthCheckResult,
  RollbackInfo,
  ReleaseEvent,
  RolloutFeatureFlag,
  ReleaseStats,
} from './types';

// In-memory stores
const releases = new Map<string, Release>();
const releaseEvents: ReleaseEvent[] = [];
const featureFlags = new Map<string, RolloutFeatureFlag>();
const rollbackHistory: RollbackInfo[] = [];

/**
 * Generate unique ID.
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log a release event.
 */
function logEvent(
  releaseId: string,
  type: ReleaseEvent['type'],
  stageId?: string,
  details?: Record<string, unknown>
): void {
  const event: ReleaseEvent = {
    id: generateId('evt'),
    releaseId,
    type,
    stageId,
    details,
    timestamp: new Date(),
  };

  releaseEvents.push(event);

  // Keep last 10000 events
  if (releaseEvents.length > 10000) {
    releaseEvents.shift();
  }
}

/**
 * Create default stages based on strategy.
 */
function createDefaultStages(strategy: RolloutStrategy): RolloutStage[] {
  switch (strategy) {
    case 'immediate':
      return [
        {
          id: generateId('stage'),
          name: 'Full Rollout',
          percentage: 100,
          duration: 0,
          status: 'pending',
        },
      ];
    case 'percentage':
      return [
        {
          id: generateId('stage'),
          name: '10% Rollout',
          percentage: 10,
          duration: 30,
          status: 'pending',
        },
        {
          id: generateId('stage'),
          name: '50% Rollout',
          percentage: 50,
          duration: 60,
          status: 'pending',
        },
        {
          id: generateId('stage'),
          name: '100% Rollout',
          percentage: 100,
          duration: 0,
          status: 'pending',
        },
      ];
    case 'canary':
      return [
        {
          id: generateId('stage'),
          name: 'Canary (1%)',
          percentage: 1,
          duration: 60,
          successCriteria: { minSuccessRate: 99, maxErrorRate: 1 },
          status: 'pending',
        },
        {
          id: generateId('stage'),
          name: 'Early Adopters (10%)',
          percentage: 10,
          duration: 120,
          successCriteria: { minSuccessRate: 98, maxErrorRate: 2 },
          status: 'pending',
        },
        {
          id: generateId('stage'),
          name: 'Full Rollout',
          percentage: 100,
          duration: 0,
          status: 'pending',
        },
      ];
    case 'blue_green':
      return [
        {
          id: generateId('stage'),
          name: 'Blue (Production)',
          percentage: 0,
          duration: 0,
          status: 'completed',
        },
        {
          id: generateId('stage'),
          name: 'Green (New)',
          percentage: 100,
          duration: 60,
          successCriteria: { minSuccessRate: 99 },
          status: 'pending',
        },
      ];
    case 'ring':
      return [
        {
          id: generateId('stage'),
          name: 'Ring 0 (Internal)',
          percentage: 1,
          targetAudience: ['internal'],
          duration: 60,
          status: 'pending',
        },
        {
          id: generateId('stage'),
          name: 'Ring 1 (Beta)',
          percentage: 5,
          targetAudience: ['beta'],
          duration: 120,
          status: 'pending',
        },
        {
          id: generateId('stage'),
          name: 'Ring 2 (Preview)',
          percentage: 25,
          duration: 240,
          status: 'pending',
        },
        {
          id: generateId('stage'),
          name: 'Ring 3 (General)',
          percentage: 100,
          duration: 0,
          status: 'pending',
        },
      ];
    default:
      return [];
  }
}

/**
 * Create a new release.
 */
export function createRelease(
  name: string,
  version: string,
  strategy: RolloutStrategy,
  createdBy: string,
  options: {
    description?: string;
    items?: ReleaseItem[];
    stages?: RolloutStage[];
    scheduledAt?: Date;
    metadata?: Record<string, unknown>;
  } = {}
): Release {
  const id = generateId('rel');

  const release: Release = {
    id,
    name,
    description: options.description,
    version,
    status: options.scheduledAt ? 'scheduled' : 'draft',
    strategy,
    items: options.items || [],
    stages: options.stages || createDefaultStages(strategy),
    currentStageIndex: -1,
    scheduledAt: options.scheduledAt,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: options.metadata,
  };

  releases.set(id, release);
  logEvent(id, 'created');

  if (options.scheduledAt) {
    logEvent(id, 'scheduled', undefined, { scheduledAt: options.scheduledAt });
  }

  return release;
}

/**
 * Get release by ID.
 */
export function getRelease(id: string): Release | null {
  return releases.get(id) || null;
}

/**
 * Update release.
 */
export function updateRelease(
  id: string,
  updates: Partial<Pick<Release, 'name' | 'description' | 'version' | 'scheduledAt' | 'metadata'>>
): Release | null {
  const release = releases.get(id);
  if (!release) return null;

  if (release.status !== 'draft' && release.status !== 'scheduled') {
    throw new Error('Cannot update release that is in progress or completed');
  }

  Object.assign(release, updates, { updatedAt: new Date() });
  releases.set(id, release);

  return release;
}

/**
 * Add item to release.
 */
export function addReleaseItem(id: string, item: Omit<ReleaseItem, 'id'>): Release | null {
  const release = releases.get(id);
  if (!release) return null;

  if (release.status !== 'draft' && release.status !== 'scheduled') {
    throw new Error('Cannot add items to release that is in progress');
  }

  const newItem: ReleaseItem = {
    id: generateId('item'),
    ...item,
  };

  release.items.push(newItem);
  release.updatedAt = new Date();
  releases.set(id, release);

  return release;
}

/**
 * Remove item from release.
 */
export function removeReleaseItem(releaseId: string, itemId: string): Release | null {
  const release = releases.get(releaseId);
  if (!release) return null;

  if (release.status !== 'draft' && release.status !== 'scheduled') {
    throw new Error('Cannot remove items from release that is in progress');
  }

  release.items = release.items.filter((item) => item.id !== itemId);
  release.updatedAt = new Date();
  releases.set(releaseId, release);

  return release;
}

/**
 * Start a release.
 */
export function startRelease(id: string): Release | null {
  const release = releases.get(id);
  if (!release) return null;

  if (release.status !== 'draft' && release.status !== 'scheduled') {
    throw new Error('Release must be in draft or scheduled status to start');
  }

  if (release.items.length === 0) {
    throw new Error('Release must have at least one item');
  }

  release.status = 'in_progress';
  release.startedAt = new Date();
  release.currentStageIndex = 0;
  release.updatedAt = new Date();

  // Start first stage
  if (release.stages.length > 0) {
    release.stages[0].status = 'in_progress';
    release.stages[0].startedAt = new Date();
  }

  releases.set(id, release);
  logEvent(id, 'started');

  if (release.stages.length > 0) {
    logEvent(id, 'stage_started', release.stages[0].id);
  }

  // Create feature flags for this release
  createReleaseFeatureFlag(release);

  return release;
}

/**
 * Create feature flag for release.
 */
function createReleaseFeatureFlag(release: Release): void {
  const flag: RolloutFeatureFlag = {
    id: generateId('flag'),
    name: `release_${release.id}`,
    releaseId: release.id,
    enabled: true,
    percentage: release.stages[0]?.percentage || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (release.stages[0]?.targetAudience) {
    flag.targetGroups = release.stages[0].targetAudience;
  }

  featureFlags.set(flag.id, flag);
}

/**
 * Advance to next stage.
 */
export function advanceStage(id: string, metrics?: RolloutMetrics): Release | null {
  const release = releases.get(id);
  if (!release) return null;

  if (release.status !== 'in_progress') {
    throw new Error('Release must be in progress to advance stages');
  }

  const currentStage = release.stages[release.currentStageIndex];
  if (!currentStage) return null;

  // Check success criteria
  if (currentStage.successCriteria && metrics) {
    if (
      currentStage.successCriteria.minSuccessRate &&
      metrics.successRate < currentStage.successCriteria.minSuccessRate
    ) {
      currentStage.status = 'failed';
      currentStage.metrics = metrics;
      logEvent(id, 'stage_failed', currentStage.id, { reason: 'Success rate too low' });
      releases.set(id, release);
      return release;
    }

    if (
      currentStage.successCriteria.maxErrorRate &&
      metrics.errorRate > currentStage.successCriteria.maxErrorRate
    ) {
      currentStage.status = 'failed';
      currentStage.metrics = metrics;
      logEvent(id, 'stage_failed', currentStage.id, { reason: 'Error rate too high' });
      releases.set(id, release);
      return release;
    }
  }

  // Complete current stage
  currentStage.status = 'completed';
  currentStage.completedAt = new Date();
  currentStage.metrics = metrics;
  logEvent(id, 'stage_completed', currentStage.id);

  // Move to next stage or complete
  if (release.currentStageIndex < release.stages.length - 1) {
    release.currentStageIndex++;
    const nextStage = release.stages[release.currentStageIndex];
    nextStage.status = 'in_progress';
    nextStage.startedAt = new Date();
    logEvent(id, 'stage_started', nextStage.id);

    // Update feature flag percentage
    updateReleaseFeatureFlag(release.id, nextStage.percentage, nextStage.targetAudience);
  } else {
    // All stages completed
    release.status = 'completed';
    release.completedAt = new Date();
    logEvent(id, 'completed');
  }

  release.updatedAt = new Date();
  releases.set(id, release);

  return release;
}

/**
 * Update feature flag for release.
 */
function updateReleaseFeatureFlag(
  releaseId: string,
  percentage: number,
  targetGroups?: string[]
): void {
  const flag = Array.from(featureFlags.values()).find(
    (f) => f.releaseId === releaseId
  );

  if (flag) {
    flag.percentage = percentage;
    flag.targetGroups = targetGroups;
    flag.updatedAt = new Date();
    featureFlags.set(flag.id, flag);
  }
}

/**
 * Rollback a release.
 */
export function rollbackRelease(
  id: string,
  reason: string,
  triggeredBy: string,
  automatic: boolean = false
): Release | null {
  const release = releases.get(id);
  if (!release) return null;

  if (release.status !== 'in_progress' && release.status !== 'completed') {
    throw new Error('Can only rollback releases that are in progress or completed');
  }

  release.status = 'rolled_back';
  release.rolledBackAt = new Date();
  release.updatedAt = new Date();

  // Mark current stage as failed
  if (release.currentStageIndex >= 0) {
    const currentStage = release.stages[release.currentStageIndex];
    if (currentStage.status === 'in_progress') {
      currentStage.status = 'failed';
    }
  }

  releases.set(id, release);

  // Disable feature flag
  const flag = Array.from(featureFlags.values()).find(
    (f) => f.releaseId === id
  );
  if (flag) {
    flag.enabled = false;
    flag.percentage = 0;
    flag.updatedAt = new Date();
    featureFlags.set(flag.id, flag);
  }

  // Record rollback
  const rollbackInfo: RollbackInfo = {
    releaseId: id,
    reason,
    triggeredBy,
    triggeredAt: new Date(),
    automatic,
    itemsRolledBack: release.items.length,
  };
  rollbackHistory.push(rollbackInfo);

  logEvent(id, 'rolled_back', undefined, { reason, automatic });

  return release;
}

/**
 * Cancel a release.
 */
export function cancelRelease(id: string): Release | null {
  const release = releases.get(id);
  if (!release) return null;

  if (release.status !== 'draft' && release.status !== 'scheduled') {
    throw new Error('Can only cancel releases that are draft or scheduled');
  }

  release.status = 'cancelled';
  release.updatedAt = new Date();
  releases.set(id, release);

  logEvent(id, 'cancelled');

  return release;
}

/**
 * Get all releases with filters.
 */
export function getAllReleases(options: {
  status?: ReleaseStatus;
  strategy?: RolloutStrategy;
  limit?: number;
  offset?: number;
} = {}): Release[] {
  let result = Array.from(releases.values());

  if (options.status) {
    result = result.filter((r) => r.status === options.status);
  }

  if (options.strategy) {
    result = result.filter((r) => r.strategy === options.strategy);
  }

  result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options.offset) {
    result = result.slice(options.offset);
  }

  if (options.limit) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * Get release events.
 */
export function getReleaseEvents(
  releaseId?: string,
  limit: number = 100
): ReleaseEvent[] {
  let events = [...releaseEvents];

  if (releaseId) {
    events = events.filter((e) => e.releaseId === releaseId);
  }

  return events
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Check if user is in rollout.
 */
export function isUserInRollout(
  releaseId: string,
  userId: string,
  userGroups: string[] = []
): boolean {
  const flag = Array.from(featureFlags.values()).find(
    (f) => f.releaseId === releaseId
  );

  if (!flag || !flag.enabled) {
    return false;
  }

  // Check if user is explicitly targeted
  if (flag.targetUsers?.includes(userId)) {
    return true;
  }

  // Check if user is in a target group
  if (flag.targetGroups && flag.targetGroups.length > 0) {
    if (!userGroups.some((g) => flag.targetGroups!.includes(g))) {
      return false;
    }
  }

  // Check percentage (use hash of user ID for consistency)
  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  const userPercentage = Math.abs(hash % 100);

  return userPercentage < flag.percentage;
}

/**
 * Get feature flags.
 */
export function getFeatureFlags(): RolloutFeatureFlag[] {
  return Array.from(featureFlags.values());
}

/**
 * Perform health check (mock implementation).
 */
export function performHealthCheck(url: string): HealthCheckResult {
  // In real implementation, this would make an HTTP request
  const success = Math.random() > 0.05; // 95% success rate
  const latency = Math.random() * 100 + 50; // 50-150ms

  return {
    healthy: success,
    timestamp: new Date(),
    statusCode: success ? 200 : 500,
    latency,
    error: success ? undefined : 'Service unavailable',
  };
}

/**
 * Record rollout metrics.
 */
export function recordRolloutMetrics(
  releaseId: string,
  metrics: RolloutMetrics
): Release | null {
  const release = releases.get(releaseId);
  if (!release || release.status !== 'in_progress') return null;

  const currentStage = release.stages[release.currentStageIndex];
  if (currentStage) {
    currentStage.metrics = metrics;
  }

  release.updatedAt = new Date();
  releases.set(releaseId, release);

  return release;
}

/**
 * Get release stats.
 */
export function getReleaseStats(): ReleaseStats {
  const allReleases = Array.from(releases.values());

  const completedReleases = allReleases.filter((r) => r.status === 'completed');
  const failedReleases = allReleases.filter(
    (r) =>
      r.status === 'rolled_back' ||
      r.stages.some((s) => s.status === 'failed')
  );
  const rolledBackReleases = allReleases.filter(
    (r) => r.status === 'rolled_back'
  );
  const activeReleases = allReleases.filter(
    (r) => r.status === 'in_progress'
  );

  // Calculate average rollout duration
  const completedWithDuration = completedReleases.filter(
    (r) => r.startedAt && r.completedAt
  );
  const avgRolloutDuration =
    completedWithDuration.length > 0
      ? completedWithDuration.reduce(
          (sum, r) =>
            sum +
            (r.completedAt!.getTime() - r.startedAt!.getTime()) / 60000,
          0
        ) / completedWithDuration.length
      : 0;

  const successRate =
    completedReleases.length + failedReleases.length > 0
      ? (completedReleases.length /
          (completedReleases.length + failedReleases.length)) *
        100
      : 0;

  const recentEvents = getReleaseEvents(undefined, 20);

  return {
    totalReleases: allReleases.length,
    completedReleases: completedReleases.length,
    failedReleases: failedReleases.length,
    rolledBackReleases: rolledBackReleases.length,
    avgRolloutDuration,
    successRate,
    activeReleases,
    recentEvents,
  };
}

/**
 * Get scheduled releases.
 */
export function getScheduledReleases(): Release[] {
  const now = new Date();
  return Array.from(releases.values())
    .filter((r) => r.status === 'scheduled' && r.scheduledAt)
    .filter((r) => r.scheduledAt! > now)
    .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime());
}

/**
 * Get rollback history.
 */
export function getRollbackHistory(limit: number = 50): RollbackInfo[] {
  return [...rollbackHistory]
    .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
    .slice(0, limit);
}

/**
 * Clear all data (for testing).
 */
export function clearAllData(): void {
  releases.clear();
  releaseEvents.length = 0;
  featureFlags.clear();
  rollbackHistory.length = 0;
}
