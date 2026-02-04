/**
 * Tiqets Background Content Generator v2
 * Production-ready, fault-tolerant background process
 *
 * Features:
 * - Fast watchdog interval (30 seconds)
 * - Automatic stale lock cleanup (5 minute timeout)
 * - Self-healing queue that skips stuck items
 * - Continuous monitoring and health reporting
 */

import { pool } from "../db";
import { log } from "../index";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;
let watchdogId: NodeJS.Timeout | null = null;

// Faster intervals for production reliability
const SCHEDULER_INTERVAL_MS = 5 * 1000; // 5 seconds - rapid batch processing
const WATCHDOG_INTERVAL_MS = 60 * 1000; // 60 seconds - cleanup stale locks
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes - max time for a job

// Health metrics
interface HealthMetrics {
  lastRun: Date | null;
  lastWatchdog: Date | null;
  staleLocksReleased: number;
  failedItemsReset: number;
  triggeredGenerations: number;
  consecutiveErrors: number;
  lastError: string | null;
}

const health: HealthMetrics = {
  lastRun: null,
  lastWatchdog: null,
  staleLocksReleased: 0,
  failedItemsReset: 0,
  triggeredGenerations: 0,
  consecutiveErrors: 0,
  lastError: null,
};

/**
 * Get health metrics for monitoring
 */
export function getHealthMetrics(): HealthMetrics & { isRunning: boolean; uptime: number } {
  return {
    ...health,
    isRunning: intervalId !== null,
    uptime: intervalId ? Date.now() - (health.lastRun?.getTime() || Date.now()) : 0,
  };
}

/**
 * Release stale locks - jobs stuck for more than LOCK_TIMEOUT_MS
 * This is CRITICAL for self-healing when providers crash mid-job
 */
async function releaseStaleLocksWithCount(): Promise<number> {
  try {
    const lockExpiry = new Date(Date.now() - LOCK_TIMEOUT_MS);

    // First count how many we'll release
    const countResult = await pool.query(
      `
      SELECT COUNT(*) as count 
      FROM tiqets_attractions 
      WHERE content_generation_status IN ('in_progress', 'generating')
      AND content_generation_locked_at < $1
    `,
      [lockExpiry]
    );

    const staleCount = parseInt(countResult.rows[0].count) || 0;

    if (staleCount > 0) {
      // Release the stale locks
      await pool.query(
        `
        UPDATE tiqets_attractions 
        SET 
          content_generation_status = 'pending',
          content_generation_locked_by = NULL,
          content_generation_locked_at = NULL
        WHERE content_generation_status IN ('in_progress', 'generating')
        AND content_generation_locked_at < $1
      `,
        [lockExpiry]
      );

      health.staleLocksReleased += staleCount;
    }

    return staleCount;
  } catch (error) {
    return 0;
  }
}

/**
 * Approve all ready attractions to completed status
 */
async function approveReadyContent(): Promise<number> {
  try {
    const result = await pool.query(`
      UPDATE tiqets_attractions 
      SET content_generation_status = 'completed' 
      WHERE content_generation_status = 'ready'
    `);
    return result.rowCount || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Reset failed attractions to pending for retry (with limit)
 */
async function resetFailedContent(limit: number = 50): Promise<number> {
  try {
    const result = await pool.query(
      `
      UPDATE tiqets_attractions 
      SET 
        content_generation_status = 'pending',
        content_generation_attempts = 0,
        content_generation_locked_by = NULL,
        content_generation_locked_at = NULL
      WHERE id IN (
        SELECT id FROM tiqets_attractions 
        WHERE content_generation_status = 'failed'
        LIMIT $1
      )
    `,
      [limit]
    );

    const count = result.rowCount || 0;
    if (count > 0) {
      health.failedItemsReset += count;
    }
    return count;
  } catch (error) {
    return 0;
  }
}

/**
 * Get counts of attractions by status
 */
async function getStatusCounts(): Promise<Record<string, number>> {
  try {
    const result = await pool.query(`
      SELECT content_generation_status, COUNT(*) as count 
      FROM tiqets_attractions 
      GROUP BY content_generation_status
    `);
    const counts: Record<string, number> = {};
    for (const row of result.rows) {
      counts[row.content_generation_status] = parseInt(row.count);
    }
    return counts;
  } catch (error) {
    return {};
  }
}

/**
 * Check if generation queue is currently active with FRESH locks only
 * Jobs with stale locks (> 5 min) don't count as active
 */
async function isQueueActiveWithFreshLocks(): Promise<{
  active: boolean;
  freshCount: number;
  staleCount: number;
}> {
  try {
    const lockExpiry = new Date(Date.now() - LOCK_TIMEOUT_MS);

    // Count fresh locks (within timeout)
    const freshResult = await pool.query(
      `
      SELECT COUNT(*) as count 
      FROM tiqets_attractions 
      WHERE content_generation_status IN ('generating', 'in_progress')
      AND content_generation_locked_at >= $1
    `,
      [lockExpiry]
    );

    // Count stale locks (expired)
    const staleResult = await pool.query(
      `
      SELECT COUNT(*) as count 
      FROM tiqets_attractions 
      WHERE content_generation_status IN ('generating', 'in_progress')
      AND content_generation_locked_at < $1
    `,
      [lockExpiry]
    );

    const freshCount = parseInt(freshResult.rows[0].count) || 0;
    const staleCount = parseInt(staleResult.rows[0].count) || 0;

    return {
      active: freshCount > 0,
      freshCount,
      staleCount,
    };
  } catch (error) {
    return { active: false, freshCount: 0, staleCount: 0 };
  }
}

/**
 * Trigger parallel generation via HTTP request (self-call)
 */
async function triggerParallelGeneration(): Promise<boolean> {
  try {
    const port = process.env.PORT || "5000";
    const response = await fetch(`http://localhost:${port}/api/admin/tiqets/generate-parallel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) {
      health.triggeredGenerations++;
    }
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Get count of attractions needing V2 (Octypo) content generation
 * BALANCED: Content with quality_score >= 78 is acceptable (Grade B)
 */
async function getOctypoPendingCount(): Promise<number> {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM tiqets_attractions 
      WHERE quality_score IS NULL OR quality_score < 78
    `);
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    return 0;
  }
}

// Import shared state for batch coordination
import { octypoState } from "../octypo/state";

let lastOctypoTrigger = 0;
const OCTYPO_COOLDOWN_MS = 30 * 1000; // 30 second cooldown between triggers

/**
 * Trigger Octypo V2 content generation via HTTP request
 */
async function triggerOctypoGeneration(): Promise<boolean> {
  // Prevent rapid re-triggering using shared state
  if (octypoState.isRunning() || Date.now() - lastOctypoTrigger < OCTYPO_COOLDOWN_MS) {
    return false;
  }

  try {
    octypoState.setRunning(true);
    lastOctypoTrigger = Date.now();

    const port = process.env.PORT || "5000";
    // Maximum parallelism - use all healthy engines simultaneously (36 writers with 72 engines)
    const response = await fetch(
      `http://localhost:${port}/api/admin/tiqets/generate-octypo?concurrency=36&batch=150`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (response.ok) {
    } else {
      // If trigger fails, immediately mark as not running
      octypoState.setRunning(false);
    }

    return response.ok;
  } catch (error) {
    octypoState.setRunning(false);

    return false;
  }
}

/**
 * Watchdog task - runs every minute to clean up stale state
 */
async function runWatchdog(): Promise<void> {
  try {
    health.lastWatchdog = new Date();

    // Release any stale locks (jobs stuck > 5 minutes)
    const released = await releaseStaleLocksWithCount();

    if (released > 0) {
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Main background task - runs every 30 seconds
 */
async function runBackgroundTask(): Promise<void> {
  if (isRunning) {
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  health.lastRun = new Date();

  try {
    // Get current status counts
    const counts = await getStatusCounts();
    const pending = counts.pending || 0;
    const completed = counts.completed || 0;
    const ready = counts.ready || 0;
    const failed = counts.failed || 0;
    const inProgress = (counts.in_progress || 0) + (counts.generating || 0);

    const total = pending + completed + ready + failed + inProgress;
    const percentComplete = total > 0 ? ((completed / total) * 100).toFixed(1) : "0";

    // Approve any ready content
    if (ready > 0) {
      const approved = await approveReadyContent();
      if (approved > 0) {
      }
    }

    // Check queue status with fresh lock detection
    const queueStatus = await isQueueActiveWithFreshLocks();

    // Log stale locks if any
    if (queueStatus.staleCount > 0) {
    }

    // If there are pending items and queue is NOT actively processing fresh jobs
    if (pending > 0 && !queueStatus.active) {
      const triggered = await triggerParallelGeneration();
      if (triggered) {
        health.consecutiveErrors = 0;
      } else {
        health.consecutiveErrors++;
        health.lastError = "Failed to trigger parallel generation";
      }
    } else if (pending > 0 && queueStatus.active) {
    } else if (pending === 0 && failed === 0 && inProgress === 0) {
    }

    // Reset failed items periodically (every 5th run or when many failed)
    if (failed > 0 && (failed > 20 || Math.random() < 0.2)) {
      const toReset = Math.min(failed, 30);
      const reset = await resetFailedContent(toReset);
      if (reset > 0) {
      }
    }

    // V2 (Octypo) High-Quality Content Generation - runs alongside V1
    // Triggers if there are attractions needing 85+ quality score content
    const octypoPending = await getOctypoPendingCount();

    // Check and reset stale running state (>10 min no activity)
    const wasStale = octypoState.checkAndResetStale();
    if (wasStale) {
    }

    if (octypoPending > 0 && !octypoState.isRunning()) {
      await triggerOctypoGeneration();
    } else if (octypoPending > 0 && octypoState.isRunning()) {
    }

    health.consecutiveErrors = 0;
  } catch (error) {
    health.consecutiveErrors++;
    health.lastError = error instanceof Error ? error.message : String(error);
  } finally {
    isRunning = false;
    const duration = Date.now() - startTime;
    if (duration > 5000) {
    }
  }
}

/**
 * Start the background generator with watchdog
 */
export function startTiqetsBackgroundGenerator(): void {
  if (intervalId) {
    return;
  }

  // Run initial tasks after a short delay
  setTimeout(() => {
    runWatchdog(); // Clean up any stale state first
    runBackgroundTask();
  }, 5000);

  // Main scheduler - every 30 seconds
  intervalId = setInterval(runBackgroundTask, SCHEDULER_INTERVAL_MS);

  // Watchdog - every 60 seconds
  watchdogId = setInterval(runWatchdog, WATCHDOG_INTERVAL_MS);
}

/**
 * Stop the background generator
 */
export function stopTiqetsBackgroundGenerator(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (watchdogId) {
    clearInterval(watchdogId);
    watchdogId = null;
  }
}

/**
 * Force release all locks (manual recovery)
 */
export async function forceReleaseAllLocks(): Promise<number> {
  try {
    const result = await pool.query(`
      UPDATE tiqets_attractions 
      SET 
        content_generation_status = 'pending',
        content_generation_locked_by = NULL,
        content_generation_locked_at = NULL
      WHERE content_generation_status IN ('in_progress', 'generating')
    `);
    const count = result.rowCount || 0;

    return count;
  } catch (error) {
    return 0;
  }
}
