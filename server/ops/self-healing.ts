/**
 * Operations & Reliability - Self-Healing Jobs
 *
 * FEATURE 4: Automatic job recovery system
 * - Detect stuck/failed jobs
 * - Retry with exponential backoff
 * - Mark poison jobs
 * - Admin API for inspection
 *
 * Feature flag: ENABLE_SELF_HEALING=true
 */

import { log } from '../lib/logger';
import { getOpsConfig } from './config';
import type { JobHealthState } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[SelfHealing] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[SelfHealing] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[SelfHealing] ${msg}`, undefined, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[SelfHealing][AUDIT] ${msg}`, data),
};

interface TrackedJob {
  jobId: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'stuck' | 'poison';
  retries: number;
  lastAttemptAt?: Date;
  stuckSince?: Date;
  errorHistory: string[];
  processingStartedAt?: Date;
  consecutiveFailures: number;
}

interface HealingAction {
  jobId: string;
  action: 'retry' | 'mark_stuck' | 'mark_poison' | 'recovered';
  reason: string;
  timestamp: Date;
  nextRetryAt?: Date;
}

// Bounded tracking (prevents unbounded memory)
const MAX_TRACKED_JOBS = 500;
const MAX_ACTION_HISTORY = 1000;
const MAX_ERROR_HISTORY_PER_JOB = 10;

class SelfHealingJobManager {
  private trackedJobs: Map<string, TrackedJob> = new Map();
  private actionHistory: HealingAction[] = [];
  private poisonJobs: Set<string> = new Set();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  /**
   * Track a new job
   */
  trackJob(jobId: string, type: string): void {
    const config = getOpsConfig();
    if (!config.selfHealingEnabled) return;

    // Enforce bounded tracking
    if (this.trackedJobs.size >= MAX_TRACKED_JOBS) {
      this.pruneOldJobs();
    }

    this.trackedJobs.set(jobId, {
      jobId,
      type,
      status: 'pending',
      retries: 0,
      errorHistory: [],
      consecutiveFailures: 0,
    });

    logger.info('Job tracked', { jobId, type });
  }

  /**
   * Mark job as processing
   */
  markProcessing(jobId: string): void {
    const job = this.trackedJobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.processingStartedAt = new Date();
    job.lastAttemptAt = new Date();
  }

  /**
   * Mark job as completed
   */
  markCompleted(jobId: string): void {
    const job = this.trackedJobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    job.consecutiveFailures = 0;

    // Clear from stuck tracking if it was
    if (job.stuckSince) {
      this.recordAction({
        jobId,
        action: 'recovered',
        reason: 'Job completed successfully after being stuck',
        timestamp: new Date(),
      });
      job.stuckSince = undefined;
    }

    logger.info('Job completed', { jobId, retries: job.retries });
  }

  /**
   * Record job failure
   */
  recordFailure(jobId: string, error: string): void {
    const job = this.trackedJobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.consecutiveFailures++;
    job.lastAttemptAt = new Date();
    job.processingStartedAt = undefined;

    // Add to bounded error history
    job.errorHistory.push(error);
    if (job.errorHistory.length > MAX_ERROR_HISTORY_PER_JOB) {
      job.errorHistory.shift();
    }

    const config = getOpsConfig();

    // Check if should be marked as poison
    if (job.consecutiveFailures >= config.selfHealing.poisonThreshold) {
      this.markAsPoison(jobId, 'Exceeded consecutive failure threshold');
      return;
    }

    // Schedule retry with backoff
    if (job.retries < config.selfHealing.maxRetries) {
      this.scheduleRetry(job);
    } else {
      this.markAsPoison(jobId, 'Exceeded max retry attempts');
    }
  }

  /**
   * Schedule a job retry with exponential backoff
   */
  private scheduleRetry(job: TrackedJob): void {
    const config = getOpsConfig();

    const backoffMs = Math.min(
      config.selfHealing.baseBackoffMs * Math.pow(2, job.retries),
      config.selfHealing.maxBackoffMs
    );

    const nextRetryAt = new Date(Date.now() + backoffMs);

    this.recordAction({
      jobId: job.jobId,
      action: 'retry',
      reason: `Scheduling retry ${job.retries + 1}/${config.selfHealing.maxRetries}`,
      timestamp: new Date(),
      nextRetryAt,
    });

    job.retries++;
    job.status = 'pending';

    logger.info('Retry scheduled', {
      jobId: job.jobId,
      retryNumber: job.retries,
      backoffMs,
      nextRetryAt: nextRetryAt.toISOString(),
    });
  }

  /**
   * Mark a job as poison (will not be retried)
   */
  private markAsPoison(jobId: string, reason: string): void {
    const job = this.trackedJobs.get(jobId);
    if (!job) return;

    job.status = 'poison';
    this.poisonJobs.add(jobId);

    this.recordAction({
      jobId,
      action: 'mark_poison',
      reason,
      timestamp: new Date(),
    });

    logger.warn('Job marked as poison', {
      jobId,
      reason,
      retries: job.retries,
      consecutiveFailures: job.consecutiveFailures,
      errorHistory: job.errorHistory,
    });

    logger.audit('POISON_JOB', {
      jobId,
      type: job.type,
      reason,
      errorHistory: job.errorHistory,
    });
  }

  /**
   * Check for stuck jobs
   */
  async checkForStuckJobs(): Promise<void> {
    const config = getOpsConfig();
    if (!config.selfHealingEnabled) return;

    const now = Date.now();
    const stuckThreshold = config.selfHealing.stuckJobThresholdMs;

    for (const job of this.trackedJobs.values()) {
      if (job.status !== 'processing') continue;
      if (!job.processingStartedAt) continue;

      const elapsed = now - job.processingStartedAt.getTime();

      if (elapsed > stuckThreshold) {
        if (!job.stuckSince) {
          job.stuckSince = new Date();
          job.status = 'stuck';

          this.recordAction({
            jobId: job.jobId,
            action: 'mark_stuck',
            reason: `Processing for ${Math.round(elapsed / 1000)}s without completion`,
            timestamp: new Date(),
          });

          logger.warn('Stuck job detected', {
            jobId: job.jobId,
            type: job.type,
            elapsedMs: elapsed,
            processingStartedAt: job.processingStartedAt.toISOString(),
          });

          // Record failure to trigger retry
          this.recordFailure(job.jobId, 'Job stuck in processing state');
        }
      }
    }
  }

  /**
   * Record a healing action
   */
  private recordAction(action: HealingAction): void {
    this.actionHistory.push(action);
    if (this.actionHistory.length > MAX_ACTION_HISTORY) {
      this.actionHistory.shift();
    }
  }

  /**
   * Prune old completed/failed jobs to maintain bounded memory
   */
  private pruneOldJobs(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [jobId, job] of this.trackedJobs.entries()) {
      if (job.status === 'completed' || job.status === 'poison') {
        const lastActivity = job.lastAttemptAt?.getTime() || 0;
        if (now - lastActivity > maxAge) {
          this.trackedJobs.delete(jobId);
        }
      }
    }

    // If still over limit, remove oldest completed jobs
    if (this.trackedJobs.size >= MAX_TRACKED_JOBS) {
      const completed = Array.from(this.trackedJobs.entries())
        .filter(([_, j]) => j.status === 'completed')
        .sort((a, b) => (a[1].lastAttemptAt?.getTime() || 0) - (b[1].lastAttemptAt?.getTime() || 0));

      for (const [jobId] of completed.slice(0, MAX_TRACKED_JOBS / 4)) {
        this.trackedJobs.delete(jobId);
      }
    }
  }

  /**
   * Get job health state
   */
  getJobHealth(jobId: string): JobHealthState | undefined {
    const job = this.trackedJobs.get(jobId);
    if (!job) return undefined;

    return {
      jobId: job.jobId,
      type: job.type,
      status: job.status,
      retries: job.retries,
      lastAttemptAt: job.lastAttemptAt,
      stuckSince: job.stuckSince,
      errorHistory: [...job.errorHistory],
    };
  }

  /**
   * Get all job health states
   */
  getAllJobHealth(): JobHealthState[] {
    return Array.from(this.trackedJobs.values()).map(job => ({
      jobId: job.jobId,
      type: job.type,
      status: job.status,
      retries: job.retries,
      lastAttemptAt: job.lastAttemptAt,
      stuckSince: job.stuckSince,
      errorHistory: [...job.errorHistory],
    }));
  }

  /**
   * Get poison jobs
   */
  getPoisonJobs(): JobHealthState[] {
    return Array.from(this.trackedJobs.values())
      .filter(job => job.status === 'poison')
      .map(job => ({
        jobId: job.jobId,
        type: job.type,
        status: job.status,
        retries: job.retries,
        lastAttemptAt: job.lastAttemptAt,
        stuckSince: job.stuckSince,
        errorHistory: [...job.errorHistory],
      }));
  }

  /**
   * Get stuck jobs
   */
  getStuckJobs(): JobHealthState[] {
    return Array.from(this.trackedJobs.values())
      .filter(job => job.status === 'stuck')
      .map(job => ({
        jobId: job.jobId,
        type: job.type,
        status: job.status,
        retries: job.retries,
        lastAttemptAt: job.lastAttemptAt,
        stuckSince: job.stuckSince,
        errorHistory: [...job.errorHistory],
      }));
  }

  /**
   * Get recent healing actions
   */
  getRecentActions(limit: number = 50): HealingAction[] {
    return this.actionHistory.slice(-limit);
  }

  /**
   * Get healing statistics
   */
  getStats(): {
    totalTracked: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    stuck: number;
    poison: number;
    totalRetries: number;
    totalActions: number;
  } {
    let pending = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;
    let stuck = 0;
    let poison = 0;
    let totalRetries = 0;

    for (const job of this.trackedJobs.values()) {
      switch (job.status) {
        case 'pending': pending++; break;
        case 'processing': processing++; break;
        case 'completed': completed++; break;
        case 'failed': failed++; break;
        case 'stuck': stuck++; break;
        case 'poison': poison++; break;
      }
      totalRetries += job.retries;
    }

    return {
      totalTracked: this.trackedJobs.size,
      pending,
      processing,
      completed,
      failed,
      stuck,
      poison,
      totalRetries,
      totalActions: this.actionHistory.length,
    };
  }

  /**
   * Manually reset a poison job for retry
   */
  resetPoisonJob(jobId: string): boolean {
    const job = this.trackedJobs.get(jobId);
    if (!job || job.status !== 'poison') return false;

    job.status = 'pending';
    job.retries = 0;
    job.consecutiveFailures = 0;
    job.errorHistory = [];
    job.stuckSince = undefined;
    this.poisonJobs.delete(jobId);

    this.recordAction({
      jobId,
      action: 'recovered',
      reason: 'Manually reset by admin',
      timestamp: new Date(),
    });

    logger.info('Poison job reset', { jobId });
    logger.audit('POISON_JOB_RESET', { jobId });

    return true;
  }

  /**
   * Clear a job from tracking
   */
  clearJob(jobId: string): boolean {
    const existed = this.trackedJobs.delete(jobId);
    this.poisonJobs.delete(jobId);
    return existed;
  }

  /**
   * Start automatic stuck job detection
   */
  start(): void {
    if (this.isRunning) return;

    const config = getOpsConfig();
    if (!config.selfHealingEnabled) {
      logger.info('Self-healing disabled by feature flag');
      return;
    }

    this.isRunning = true;

    // Check for stuck jobs every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkForStuckJobs().catch(err => {
        logger.error('Stuck job check failed', { error: String(err) });
      });
    }, 30000);

    logger.info('Self-healing job manager started');
  }

  /**
   * Stop automatic detection
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    logger.info('Self-healing job manager stopped');
  }

  /**
   * Check if manager is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
let instance: SelfHealingJobManager | null = null;

export function getSelfHealingJobManager(): SelfHealingJobManager {
  if (!instance) {
    instance = new SelfHealingJobManager();
  }
  return instance;
}

export function resetSelfHealingJobManager(): void {
  if (instance) {
    instance.stop();
  }
  instance = null;
}

// Convenience functions
export function trackJob(jobId: string, type: string): void {
  getSelfHealingJobManager().trackJob(jobId, type);
}

export function markJobProcessing(jobId: string): void {
  getSelfHealingJobManager().markProcessing(jobId);
}

export function markJobCompleted(jobId: string): void {
  getSelfHealingJobManager().markCompleted(jobId);
}

export function recordJobFailure(jobId: string, error: string): void {
  getSelfHealingJobManager().recordFailure(jobId, error);
}

export { SelfHealingJobManager, HealingAction };
