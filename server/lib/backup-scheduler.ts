/**
 * Database Backup Scheduler
 * Runs automated backups on a configurable schedule
 */

import { createBackup, rotateBackups, BackupResult } from "../scripts/backup-db";

// Configuration
const BACKUP_ENABLED = process.env.BACKUP_ENABLED !== "false";
const BACKUP_INTERVAL_HOURS = parseInt(process.env.BACKUP_INTERVAL_HOURS || "24", 10);
const BACKUP_TIME = process.env.BACKUP_TIME || "00:00"; // HH:MM format

interface SchedulerState {
  isRunning: boolean;
  lastBackup: Date | null;
  lastResult: BackupResult | null;
  nextScheduled: Date | null;
  intervalId: NodeJS.Timeout | null;
}

const state: SchedulerState = {
  isRunning: false,
  lastBackup: null,
  lastResult: null,
  nextScheduled: null,
  intervalId: null,
};

/**
 * Calculate milliseconds until next scheduled backup time
 */
function getMillisUntilNextBackup(): number {
  const [hours, minutes] = BACKUP_TIME.split(":").map(Number);
  const now = new Date();
  const next = new Date();

  next.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * Run a backup and update state
 */
async function runScheduledBackup(): Promise<void> {
  console.log("[BackupScheduler] Starting scheduled backup...");

  try {
    const result = await createBackup();
    state.lastResult = result;
    state.lastBackup = new Date();

    if (result.success) {
      await rotateBackups();
      console.log("[BackupScheduler] Backup completed successfully");
    } else {
      console.error("[BackupScheduler] Backup failed:", result.error);
    }
  } catch (error) {
    console.error("[BackupScheduler] Backup error:", error);
    state.lastResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Schedule next backup
  scheduleNextBackup();
}

/**
 * Schedule the next backup
 */
function scheduleNextBackup(): void {
  if (state.intervalId) {
    clearTimeout(state.intervalId);
  }

  const msUntilNext = BACKUP_INTERVAL_HOURS * 60 * 60 * 1000;
  state.nextScheduled = new Date(Date.now() + msUntilNext);

  state.intervalId = setTimeout(() => {
    runScheduledBackup();
  }, msUntilNext);

  console.log(
    `[BackupScheduler] Next backup scheduled for: ${state.nextScheduled.toISOString()}`
  );
}

/**
 * Start the backup scheduler
 */
export function startBackupScheduler(): void {
  if (!BACKUP_ENABLED) {
    console.log("[BackupScheduler] Backups are disabled (BACKUP_ENABLED=false)");
    return;
  }

  if (state.isRunning) {
    console.log("[BackupScheduler] Scheduler already running");
    return;
  }

  console.log("[BackupScheduler] Starting backup scheduler");
  console.log(`[BackupScheduler] Backup interval: ${BACKUP_INTERVAL_HOURS} hours`);
  console.log(`[BackupScheduler] Backup time: ${BACKUP_TIME}`);

  state.isRunning = true;

  // Calculate time until first backup
  const msUntilFirst = getMillisUntilNextBackup();
  state.nextScheduled = new Date(Date.now() + msUntilFirst);

  console.log(
    `[BackupScheduler] First backup scheduled for: ${state.nextScheduled.toISOString()}`
  );

  state.intervalId = setTimeout(() => {
    runScheduledBackup();
  }, msUntilFirst);
}

/**
 * Stop the backup scheduler
 */
export function stopBackupScheduler(): void {
  if (!state.isRunning) {
    return;
  }

  if (state.intervalId) {
    clearTimeout(state.intervalId);
    state.intervalId = null;
  }

  state.isRunning = false;
  state.nextScheduled = null;
  console.log("[BackupScheduler] Scheduler stopped");
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  enabled: boolean;
  isRunning: boolean;
  lastBackup: string | null;
  lastSuccess: boolean | null;
  nextScheduled: string | null;
  intervalHours: number;
} {
  return {
    enabled: BACKUP_ENABLED,
    isRunning: state.isRunning,
    lastBackup: state.lastBackup?.toISOString() || null,
    lastSuccess: state.lastResult?.success ?? null,
    nextScheduled: state.nextScheduled?.toISOString() || null,
    intervalHours: BACKUP_INTERVAL_HOURS,
  };
}

/**
 * Trigger an immediate backup
 */
export async function triggerBackup(): Promise<BackupResult> {
  console.log("[BackupScheduler] Manual backup triggered");
  const result = await createBackup();
  state.lastResult = result;
  state.lastBackup = new Date();

  if (result.success) {
    await rotateBackups();
  }

  return result;
}

export { BackupResult };
