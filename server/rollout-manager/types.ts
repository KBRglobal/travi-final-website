/**
 * Release & Rollout Manager - Type Definitions
 *
 * Feature flag: ENABLE_ROLLOUT_MANAGER=true
 */

export function isRolloutManagerEnabled(): boolean {
  return process.env.ENABLE_ROLLOUT_MANAGER === 'true';
}

/**
 * Release status.
 */
export type ReleaseStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'rolled_back'
  | 'cancelled';

/**
 * Rollout strategy.
 */
export type RolloutStrategy =
  | 'immediate'
  | 'percentage'
  | 'canary'
  | 'blue_green'
  | 'ring';

/**
 * Release item type.
 */
export type ReleaseItemType = 'content' | 'feature' | 'config' | 'code';

/**
 * Release item.
 */
export interface ReleaseItem {
  id: string;
  type: ReleaseItemType;
  name: string;
  description?: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  rollbackData?: Record<string, unknown>;
}

/**
 * Rollout stage.
 */
export interface RolloutStage {
  id: string;
  name: string;
  percentage: number;
  targetAudience?: string[];
  duration: number; // in minutes
  healthCheckUrl?: string;
  successCriteria?: {
    minSuccessRate?: number;
    maxErrorRate?: number;
    maxLatency?: number;
  };
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  metrics?: RolloutMetrics;
}

/**
 * Release definition.
 */
export interface Release {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: ReleaseStatus;
  strategy: RolloutStrategy;
  items: ReleaseItem[];
  stages: RolloutStage[];
  currentStageIndex: number;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  rolledBackAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Rollout metrics.
 */
export interface RolloutMetrics {
  successCount: number;
  errorCount: number;
  totalRequests: number;
  avgLatency: number;
  p95Latency: number;
  errorRate: number;
  successRate: number;
}

/**
 * Health check result.
 */
export interface HealthCheckResult {
  healthy: boolean;
  timestamp: Date;
  statusCode?: number;
  latency?: number;
  error?: string;
}

/**
 * Rollback info.
 */
export interface RollbackInfo {
  releaseId: string;
  reason: string;
  triggeredBy: string;
  triggeredAt: Date;
  automatic: boolean;
  itemsRolledBack: number;
}

/**
 * Release event.
 */
export interface ReleaseEvent {
  id: string;
  releaseId: string;
  type:
    | 'created'
    | 'scheduled'
    | 'started'
    | 'stage_started'
    | 'stage_completed'
    | 'stage_failed'
    | 'completed'
    | 'rolled_back'
    | 'cancelled';
  stageId?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Feature flag for rollout.
 */
export interface RolloutFeatureFlag {
  id: string;
  name: string;
  releaseId: string;
  enabled: boolean;
  percentage: number;
  targetUsers?: string[];
  targetGroups?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Release stats.
 */
export interface ReleaseStats {
  totalReleases: number;
  completedReleases: number;
  failedReleases: number;
  rolledBackReleases: number;
  avgRolloutDuration: number; // in minutes
  successRate: number;
  activeReleases: Release[];
  recentEvents: ReleaseEvent[];
}
