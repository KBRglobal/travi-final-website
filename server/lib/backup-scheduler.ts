/**
 * Database Backup Scheduler
 * Runs automated backups on a configurable schedule
 */

import { createBackup, rotateBackups, BackupResult } from "../scripts/backup-db";

// Configuration
const BACKUP_ENABLED = process.env.BACKUP_ENABLED !== "false";
const BACKUP_INTERVAL_HOURS = Number.parseInt(process.env.BACKUP_INTERVAL_HOURS || "24", 10);
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
  try {
    const result = await createBackup();
    state.lastResult = result;
    state.lastBackup = new Date();

    if (result.success) {
      await rotateBackups();
    } else {
      // empty
    }
  } catch (error) {
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
}

/**
 * Start the backup scheduler
 */
export function startBackupScheduler(): void {
  if (!BACKUP_ENABLED) {
    return;
  }

  if (state.isRunning) {
    return;
  }

  state.isRunning = true;

  // Calculate time until first backup
  const msUntilFirst = getMillisUntilNextBackup();
  state.nextScheduled = new Date(Date.now() + msUntilFirst);

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
  const result = await createBackup();
  state.lastResult = result;
  state.lastBackup = new Date();

  if (result.success) {
    await rotateBackups();
  }

  return result;
}

export { BackupResult };
