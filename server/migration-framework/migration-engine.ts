/**
 * Runtime Migration & Backfill Framework - Migration Engine
 */

import {
  Migration,
  MigrationStatus,
  MigrationType,
  MigrationPriority,
  MigrationBatch,
  MigrationCheckpoint,
  BackfillJob,
  MigrationEvent,
  MigrationStats,
  DryRunResult,
  MigrationRollbackInfo,
} from './types';

// In-memory stores
const migrations = new Map<string, Migration>();
const batches = new Map<string, MigrationBatch>();
const checkpoints = new Map<string, MigrationCheckpoint>();
const backfillJobs = new Map<string, BackfillJob>();
const migrationEvents: MigrationEvent[] = [];
const rollbackHistory: MigrationRollbackInfo[] = [];

/**
 * Generate unique ID.
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log a migration event.
 */
function logEvent(
  migrationId: string,
  type: MigrationEvent['type'],
  batchId?: string,
  details?: Record<string, unknown>
): void {
  const event: MigrationEvent = {
    id: generateId('evt'),
    migrationId,
    type,
    batchId,
    details,
    timestamp: new Date(),
  };

  migrationEvents.push(event);

  // Keep last 10000 events
  if (migrationEvents.length > 10000) {
    migrationEvents.shift();
  }
}

/**
 * Register a new migration.
 */
export function registerMigration(
  name: string,
  type: MigrationType,
  version: string,
  options: {
    description?: string;
    priority?: MigrationPriority;
    dependencies?: string[];
    batchSize?: number;
    totalItems?: number;
    metadata?: Record<string, unknown>;
  } = {}
): Migration {
  const id = generateId('mig');

  const migration: Migration = {
    id,
    name,
    description: options.description,
    type,
    version,
    status: 'pending',
    priority: options.priority || 'normal',
    dependencies: options.dependencies || [],
    batchSize: options.batchSize || 1000,
    totalItems: options.totalItems || 0,
    processedItems: 0,
    failedItems: 0,
    progress: 0,
    metadata: options.metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  migrations.set(id, migration);
  logEvent(id, 'created');

  return migration;
}

/**
 * Get migration by ID.
 */
export function getMigration(id: string): Migration | null {
  return migrations.get(id) || null;
}

/**
 * Update migration.
 */
export function updateMigration(
  id: string,
  updates: Partial<Pick<Migration, 'description' | 'priority' | 'batchSize' | 'metadata'>>
): Migration | null {
  const migration = migrations.get(id);
  if (!migration) return null;

  if (migration.status !== 'pending') {
    throw new Error('Cannot update migration that has started');
  }

  Object.assign(migration, updates, { updatedAt: new Date() });
  migrations.set(id, migration);

  return migration;
}

/**
 * Check if migration can run (dependencies satisfied).
 */
export function canRunMigration(id: string): { canRun: boolean; reason?: string } {
  const migration = migrations.get(id);
  if (!migration) {
    return { canRun: false, reason: 'Migration not found' };
  }

  if (migration.status !== 'pending' && migration.status !== 'paused') {
    return { canRun: false, reason: `Migration is ${migration.status}` };
  }

  // Check dependencies
  for (const depId of migration.dependencies) {
    const dep = migrations.get(depId);
    if (!dep) {
      return { canRun: false, reason: `Dependency ${depId} not found` };
    }
    if (dep.status !== 'completed') {
      return { canRun: false, reason: `Dependency ${dep.name} is not completed` };
    }
  }

  return { canRun: true };
}

/**
 * Start a migration.
 */
export function startMigration(id: string): Migration | null {
  const migration = migrations.get(id);
  if (!migration) return null;

  const { canRun, reason } = canRunMigration(id);
  if (!canRun) {
    throw new Error(reason);
  }

  migration.status = 'running';
  migration.startedAt = migration.startedAt || new Date();
  migration.pausedAt = undefined;
  migration.updatedAt = new Date();

  migrations.set(id, migration);
  logEvent(id, migration.status === 'pending' ? 'started' : 'resumed');

  return migration;
}

/**
 * Pause a migration.
 */
export function pauseMigration(id: string): Migration | null {
  const migration = migrations.get(id);
  if (!migration) return null;

  if (migration.status !== 'running') {
    throw new Error('Can only pause running migrations');
  }

  migration.status = 'paused';
  migration.pausedAt = new Date();
  migration.updatedAt = new Date();

  migrations.set(id, migration);
  logEvent(id, 'paused');

  // Save checkpoint
  saveCheckpoint(id, migration.processedItems);

  return migration;
}

/**
 * Resume a migration.
 */
export function resumeMigration(id: string): Migration | null {
  const migration = migrations.get(id);
  if (!migration) return null;

  if (migration.status !== 'paused') {
    throw new Error('Can only resume paused migrations');
  }

  migration.status = 'running';
  migration.pausedAt = undefined;
  migration.updatedAt = new Date();

  migrations.set(id, migration);
  logEvent(id, 'resumed');

  return migration;
}

/**
 * Save a checkpoint.
 */
export function saveCheckpoint(
  migrationId: string,
  processedCount: number,
  lastProcessedId?: string
): MigrationCheckpoint {
  const id = generateId('chk');

  const checkpoint: MigrationCheckpoint = {
    id,
    migrationId,
    lastProcessedId,
    lastProcessedOffset: processedCount,
    processedCount,
    failedCount: migrations.get(migrationId)?.failedItems || 0,
    createdAt: new Date(),
  };

  checkpoints.set(id, checkpoint);
  logEvent(migrationId, 'checkpoint_saved', undefined, { checkpointId: id });

  return checkpoint;
}

/**
 * Get latest checkpoint for migration.
 */
export function getLatestCheckpoint(migrationId: string): MigrationCheckpoint | null {
  const migrationCheckpoints = Array.from(checkpoints.values())
    .filter((c) => c.migrationId === migrationId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return migrationCheckpoints[0] || null;
}

/**
 * Process a batch.
 */
export function processBatch(
  migrationId: string,
  items: Array<{ id: string; data: unknown }>,
  processItem: (item: { id: string; data: unknown }) => { success: boolean; error?: string }
): MigrationBatch {
  const migration = migrations.get(migrationId);
  if (!migration || migration.status !== 'running') {
    throw new Error('Migration not running');
  }

  const batchId = generateId('batch');
  const batchNumber = Array.from(batches.values()).filter(
    (b) => b.migrationId === migrationId
  ).length + 1;

  const batch: MigrationBatch = {
    id: batchId,
    migrationId,
    batchNumber,
    itemCount: items.length,
    processedCount: 0,
    failedCount: 0,
    status: 'processing',
    startedAt: new Date(),
    errors: [],
  };

  batches.set(batchId, batch);

  // Process each item
  for (const item of items) {
    const result = processItem(item);
    batch.processedCount++;

    if (result.success) {
      migration.processedItems++;
    } else {
      migration.failedItems++;
      batch.failedCount++;
      batch.errors.push({ itemId: item.id, error: result.error || 'Unknown error' });
    }
  }

  // Update batch status
  batch.status = batch.failedCount === batch.itemCount ? 'failed' : 'completed';
  batch.completedAt = new Date();
  batches.set(batchId, batch);

  // Update migration progress
  if (migration.totalItems > 0) {
    migration.progress = Math.round(
      (migration.processedItems / migration.totalItems) * 100
    );
  }
  migration.updatedAt = new Date();
  migrations.set(migrationId, migration);

  logEvent(migrationId, 'batch_completed', batchId, {
    processed: batch.processedCount,
    failed: batch.failedCount,
  });

  return batch;
}

/**
 * Complete a migration.
 */
export function completeMigration(id: string): Migration | null {
  const migration = migrations.get(id);
  if (!migration) return null;

  if (migration.status !== 'running') {
    throw new Error('Can only complete running migrations');
  }

  migration.status = 'completed';
  migration.completedAt = new Date();
  migration.progress = 100;
  migration.updatedAt = new Date();

  migrations.set(id, migration);
  logEvent(id, 'completed');

  return migration;
}

/**
 * Fail a migration.
 */
export function failMigration(id: string, error: string): Migration | null {
  const migration = migrations.get(id);
  if (!migration) return null;

  migration.status = 'failed';
  migration.error = error;
  migration.updatedAt = new Date();

  migrations.set(id, migration);
  logEvent(id, 'failed', undefined, { error });

  return migration;
}

/**
 * Rollback a migration.
 */
export function rollbackMigration(
  id: string,
  reason: string,
  triggeredBy: string
): Migration | null {
  const migration = migrations.get(id);
  if (!migration) return null;

  if (
    migration.status !== 'running' &&
    migration.status !== 'paused' &&
    migration.status !== 'completed'
  ) {
    throw new Error('Cannot rollback migration in current state');
  }

  migration.status = 'rolled_back';
  migration.updatedAt = new Date();
  migrations.set(id, migration);

  const rollbackInfo: MigrationRollbackInfo = {
    migrationId: id,
    rolledBackItems: migration.processedItems,
    rolledBackAt: new Date(),
    reason,
    triggeredBy,
  };
  rollbackHistory.push(rollbackInfo);

  logEvent(id, 'rolled_back', undefined, { reason });

  return migration;
}

/**
 * Get all migrations.
 */
export function getAllMigrations(options: {
  status?: MigrationStatus;
  type?: MigrationType;
  limit?: number;
  offset?: number;
} = {}): Migration[] {
  let result = Array.from(migrations.values());

  if (options.status) {
    result = result.filter((m) => m.status === options.status);
  }

  if (options.type) {
    result = result.filter((m) => m.type === options.type);
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
 * Get migration batches.
 */
export function getMigrationBatches(
  migrationId: string,
  limit: number = 100
): MigrationBatch[] {
  return Array.from(batches.values())
    .filter((b) => b.migrationId === migrationId)
    .sort((a, b) => b.batchNumber - a.batchNumber)
    .slice(0, limit);
}

/**
 * Create a backfill job.
 */
export function createBackfillJob(
  name: string,
  targetCollection: string,
  options: {
    query?: Record<string, unknown>;
    transformFn?: string;
    batchSize?: number;
    totalItems?: number;
    concurrency?: number;
    maxRetries?: number;
  } = {}
): BackfillJob {
  const id = generateId('bfj');

  const job: BackfillJob = {
    id,
    name,
    targetCollection,
    query: options.query,
    transformFn: options.transformFn,
    status: 'pending',
    batchSize: options.batchSize || 500,
    totalItems: options.totalItems || 0,
    processedItems: 0,
    failedItems: 0,
    concurrency: options.concurrency || 1,
    retryCount: 0,
    maxRetries: options.maxRetries || 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  backfillJobs.set(id, job);
  return job;
}

/**
 * Get backfill job.
 */
export function getBackfillJob(id: string): BackfillJob | null {
  return backfillJobs.get(id) || null;
}

/**
 * Update backfill job progress.
 */
export function updateBackfillProgress(
  id: string,
  processedItems: number,
  failedItems: number
): BackfillJob | null {
  const job = backfillJobs.get(id);
  if (!job) return null;

  job.processedItems = processedItems;
  job.failedItems = failedItems;
  job.updatedAt = new Date();

  backfillJobs.set(id, job);
  return job;
}

/**
 * Start backfill job.
 */
export function startBackfillJob(id: string): BackfillJob | null {
  const job = backfillJobs.get(id);
  if (!job) return null;

  if (job.status !== 'pending' && job.status !== 'paused') {
    throw new Error('Cannot start job in current state');
  }

  job.status = 'running';
  job.startedAt = job.startedAt || new Date();
  job.updatedAt = new Date();

  backfillJobs.set(id, job);
  return job;
}

/**
 * Complete backfill job.
 */
export function completeBackfillJob(id: string): BackfillJob | null {
  const job = backfillJobs.get(id);
  if (!job) return null;

  job.status = 'completed';
  job.completedAt = new Date();
  job.updatedAt = new Date();

  backfillJobs.set(id, job);
  return job;
}

/**
 * Fail backfill job.
 */
export function failBackfillJob(id: string, error: string): BackfillJob | null {
  const job = backfillJobs.get(id);
  if (!job) return null;

  job.status = 'failed';
  job.error = error;
  job.updatedAt = new Date();

  backfillJobs.set(id, job);
  return job;
}

/**
 * Get all backfill jobs.
 */
export function getAllBackfillJobs(options: {
  status?: MigrationStatus;
  limit?: number;
} = {}): BackfillJob[] {
  let result = Array.from(backfillJobs.values());

  if (options.status) {
    result = result.filter((j) => j.status === options.status);
  }

  result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options.limit) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * Dry run a migration.
 */
export function dryRunMigration(
  migrationId: string,
  sampleSize: number = 10
): DryRunResult {
  const migration = migrations.get(migrationId);
  if (!migration) {
    throw new Error('Migration not found');
  }

  // Generate sample data (in real implementation, this would query actual data)
  const sampleItems: DryRunResult['sampleItems'] = [];
  for (let i = 0; i < sampleSize; i++) {
    sampleItems.push({
      id: `sample-${i}`,
      before: { field: `value-${i}`, migrated: false },
      after: { field: `value-${i}`, migrated: true, migratedAt: new Date() },
    });
  }

  // Estimate duration based on total items and batch size
  const estimatedBatches = Math.ceil(
    migration.totalItems / migration.batchSize
  );
  const estimatedDuration = estimatedBatches * 2; // 2 seconds per batch estimate

  return {
    migrationId,
    wouldProcess: migration.totalItems,
    sampleItems,
    estimatedDuration,
    warnings: [],
  };
}

/**
 * Get migration events.
 */
export function getMigrationEvents(
  migrationId?: string,
  limit: number = 100
): MigrationEvent[] {
  let events = [...migrationEvents];

  if (migrationId) {
    events = events.filter((e) => e.migrationId === migrationId);
  }

  return events
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Get migration stats.
 */
export function getMigrationStats(): MigrationStats {
  const allMigrations = Array.from(migrations.values());

  const pendingMigrations = allMigrations.filter(
    (m) => m.status === 'pending'
  ).length;
  const runningMigrations = allMigrations.filter(
    (m) => m.status === 'running'
  ).length;
  const completedMigrations = allMigrations.filter(
    (m) => m.status === 'completed'
  ).length;
  const failedMigrations = allMigrations.filter(
    (m) => m.status === 'failed' || m.status === 'rolled_back'
  ).length;

  const totalItemsProcessed = allMigrations.reduce(
    (sum, m) => sum + m.processedItems,
    0
  );
  const totalItemsFailed = allMigrations.reduce(
    (sum, m) => sum + m.failedItems,
    0
  );

  // Calculate average processing rate
  const completedWithTime = allMigrations.filter(
    (m) => m.status === 'completed' && m.startedAt && m.completedAt
  );
  const avgProcessingRate =
    completedWithTime.length > 0
      ? completedWithTime.reduce((sum, m) => {
          const duration =
            (m.completedAt!.getTime() - m.startedAt!.getTime()) / 1000;
          return sum + (duration > 0 ? m.processedItems / duration : 0);
        }, 0) / completedWithTime.length
      : 0;

  const recentEvents = getMigrationEvents(undefined, 20);

  return {
    totalMigrations: allMigrations.length,
    pendingMigrations,
    runningMigrations,
    completedMigrations,
    failedMigrations,
    totalItemsProcessed,
    totalItemsFailed,
    avgProcessingRate,
    recentEvents,
  };
}

/**
 * Get rollback history.
 */
export function getMigrationRollbackHistory(
  limit: number = 50
): MigrationRollbackInfo[] {
  return [...rollbackHistory]
    .sort((a, b) => b.rolledBackAt.getTime() - a.rolledBackAt.getTime())
    .slice(0, limit);
}

/**
 * Retry failed items in a batch.
 */
export function retryFailedBatch(batchId: string): MigrationBatch | null {
  const batch = batches.get(batchId);
  if (!batch) return null;

  if (batch.status !== 'failed' && batch.failedCount === 0) {
    throw new Error('No failed items to retry');
  }

  // Reset for retry
  batch.status = 'pending';
  batch.failedCount = 0;
  batch.errors = [];

  batches.set(batchId, batch);
  return batch;
}

/**
 * Get pending migrations in order.
 */
export function getPendingMigrationsInOrder(): Migration[] {
  const pending = Array.from(migrations.values()).filter(
    (m) => m.status === 'pending'
  );

  // Sort by priority and dependencies
  const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };

  return pending.sort((a, b) => {
    // First by priority
    const priorityDiff =
      priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by dependencies (items with no deps first)
    return a.dependencies.length - b.dependencies.length;
  });
}

/**
 * Clear all data (for testing).
 */
export function clearAllData(): void {
  migrations.clear();
  batches.clear();
  checkpoints.clear();
  backfillJobs.clear();
  migrationEvents.length = 0;
  rollbackHistory.length = 0;
}
