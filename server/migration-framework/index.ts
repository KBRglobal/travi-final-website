/**
 * Runtime Migration & Backfill Framework
 *
 * Feature flag: ENABLE_MIGRATION_FRAMEWORK=true
 */

export { isMigrationFrameworkEnabled } from './types';
export type {
  MigrationStatus,
  MigrationType,
  MigrationPriority,
  Migration,
  MigrationBatch,
  MigrationCheckpoint,
  BackfillJob,
  MigrationEvent,
  MigrationStats,
  DryRunResult,
  MigrationRollbackInfo,
} from './types';

export {
  registerMigration,
  getMigration,
  updateMigration,
  canRunMigration,
  startMigration,
  pauseMigration,
  resumeMigration,
  completeMigration,
  failMigration,
  rollbackMigration,
  getAllMigrations,
  getMigrationBatches,
  processBatch,
  saveCheckpoint,
  getLatestCheckpoint,
  createBackfillJob,
  getBackfillJob,
  updateBackfillProgress,
  startBackfillJob,
  completeBackfillJob,
  failBackfillJob,
  getAllBackfillJobs,
  dryRunMigration,
  getMigrationEvents,
  getMigrationStats,
  getMigrationRollbackHistory,
  retryFailedBatch,
  getPendingMigrationsInOrder,
  clearAllData,
} from './migration-engine';

export { migrationFrameworkRoutes } from './routes';
