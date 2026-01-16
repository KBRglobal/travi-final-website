/**
 * Runtime Migration & Backfill Framework - Type Definitions
 *
 * Feature flag: ENABLE_MIGRATION_FRAMEWORK=true
 */

export function isMigrationFrameworkEnabled(): boolean {
  return process.env.ENABLE_MIGRATION_FRAMEWORK === 'true';
}

/**
 * Migration status.
 */
export type MigrationStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'rolled_back';

/**
 * Migration type.
 */
export type MigrationType =
  | 'schema'
  | 'data'
  | 'backfill'
  | 'cleanup'
  | 'transform';

/**
 * Migration priority.
 */
export type MigrationPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Migration definition.
 */
export interface Migration {
  id: string;
  name: string;
  description?: string;
  type: MigrationType;
  version: string;
  status: MigrationStatus;
  priority: MigrationPriority;
  dependencies: string[];
  batchSize: number;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Migration batch.
 */
export interface MigrationBatch {
  id: string;
  migrationId: string;
  batchNumber: number;
  itemCount: number;
  processedCount: number;
  failedCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  errors: Array<{ itemId: string; error: string }>;
}

/**
 * Migration checkpoint.
 */
export interface MigrationCheckpoint {
  id: string;
  migrationId: string;
  lastProcessedId?: string;
  lastProcessedOffset: number;
  processedCount: number;
  failedCount: number;
  createdAt: Date;
}

/**
 * Backfill job.
 */
export interface BackfillJob {
  id: string;
  name: string;
  targetCollection: string;
  query?: Record<string, unknown>;
  transformFn?: string; // Serialized function name
  status: MigrationStatus;
  batchSize: number;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  concurrency: number;
  retryCount: number;
  maxRetries: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Migration event.
 */
export interface MigrationEvent {
  id: string;
  migrationId: string;
  type:
    | 'created'
    | 'started'
    | 'paused'
    | 'resumed'
    | 'completed'
    | 'failed'
    | 'rolled_back'
    | 'batch_completed'
    | 'checkpoint_saved';
  batchId?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Migration stats.
 */
export interface MigrationStats {
  totalMigrations: number;
  pendingMigrations: number;
  runningMigrations: number;
  completedMigrations: number;
  failedMigrations: number;
  totalItemsProcessed: number;
  totalItemsFailed: number;
  avgProcessingRate: number; // items per second
  recentEvents: MigrationEvent[];
}

/**
 * Dry run result.
 */
export interface DryRunResult {
  migrationId: string;
  wouldProcess: number;
  sampleItems: Array<{
    id: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  }>;
  estimatedDuration: number; // in seconds
  warnings: string[];
}

/**
 * Rollback info.
 */
export interface MigrationRollbackInfo {
  migrationId: string;
  rolledBackItems: number;
  rolledBackAt: Date;
  reason: string;
  triggeredBy: string;
}
