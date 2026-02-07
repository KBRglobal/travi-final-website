/**
 * Autonomy Integration - Job Queue Guard
 * Integration with background job processing for policy enforcement
 */

import { guardJobExecution, JobBlockResult, DEFAULT_ENFORCEMENT_CONFIG } from "../enforcement";

// Blocked job tracking for retry
interface BlockedJobRecord {
  jobId: string;
  jobType: string;
  blockedAt: Date;
  reason: string;
  rescheduleAfterMs: number;
  retryCount: number;
  lastRetryAt?: Date;
}

// In-memory blocked job tracking (bounded)
const blockedJobs = new Map<string, BlockedJobRecord>();
const MAX_BLOCKED_JOBS = 500;

/**
 * Check if a job should be executed based on autonomy policy
 */
export async function shouldExecuteJob(
  jobId: string,
  jobType: string,
  context?: {
    entityId?: string;
    locale?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<JobBlockResult> {
  if (!DEFAULT_ENFORCEMENT_CONFIG.enabled) {
    return { blocked: false, shouldRetry: true };
  }

  const result = await guardJobExecution(jobType, {
    jobId,
    entityId: context?.entityId,
    locale: context?.locale,
    metadata: context?.metadata,
  });

  if (result.blocked) {
    trackBlockedJob(jobId, jobType, result);
  } else {
    // Clear if previously blocked
    blockedJobs.delete(jobId);
  }

  return result;
}

/**
 * Create job execution wrapper
 * Wraps job execution function with enforcement check
 */
export function createGuardedJobExecutor<T>(
  jobType: string,
  executor: (data: T) => Promise<unknown>,
  options?: {
    getEntityId?: (data: T) => string | undefined;
    getLocale?: (data: T) => string | undefined;
    onBlocked?: (data: T, result: JobBlockResult) => Promise<void>;
  }
): (
  jobId: string,
  data: T
) => Promise<{ executed: boolean; result?: unknown; blockReason?: string }> {
  return async (jobId: string, data: T) => {
    const checkResult = await shouldExecuteJob(jobId, jobType, {
      entityId: options?.getEntityId?.(data),
      locale: options?.getLocale?.(data),
      metadata: { jobData: data },
    });

    if (checkResult.blocked) {
      if (options?.onBlocked) {
        await options.onBlocked(data, checkResult);
      }

      return {
        executed: false,
        blockReason: checkResult.reason,
      };
    }

    const result = await executor(data);
    return { executed: true, result };
  };
}

/**
 * Get list of blocked jobs
 */
export function getBlockedJobs(): BlockedJobRecord[] {
  return Array.from(blockedJobs.values()).sort(
    (a, b) => b.blockedAt.getTime() - a.blockedAt.getTime()
  );
}

/**
 * Get specific blocked job
 */
export function getBlockedJob(jobId: string): BlockedJobRecord | undefined {
  return blockedJobs.get(jobId);
}

/**
 * Check if job is currently blocked
 */
export function isJobBlocked(jobId: string): boolean {
  return blockedJobs.has(jobId);
}

/**
 * Mark job as ready for retry (after override created)
 */
export function markJobForRetry(jobId: string): boolean {
  const job = blockedJobs.get(jobId);
  if (!job) return false;

  job.retryCount++;
  job.lastRetryAt = new Date();

  return true;
}

/**
 * Clear blocked job record
 */
export function clearBlockedJob(jobId: string): boolean {
  return blockedJobs.delete(jobId);
}

/**
 * Get statistics about blocked jobs
 */
export function getBlockedJobStats(): {
  total: number;
  byType: Record<string, number>;
  oldestBlocked?: Date;
  averageBlockDuration: number;
} {
  const jobs = Array.from(blockedJobs.values());
  const byType: Record<string, number> = {};
  let totalDuration = 0;

  for (const job of jobs) {
    byType[job.jobType] = (byType[job.jobType] || 0) + 1;
    totalDuration += Date.now() - job.blockedAt.getTime();
  }

  const oldestBlocked =
    jobs.length > 0 ? new Date(Math.min(...jobs.map(j => j.blockedAt.getTime()))) : undefined;

  return {
    total: jobs.length,
    byType,
    oldestBlocked,
    averageBlockDuration: jobs.length > 0 ? totalDuration / jobs.length : 0,
  };
}

// Helper: Track blocked job
function trackBlockedJob(jobId: string, jobType: string, result: JobBlockResult): void {
  const existing = blockedJobs.get(jobId);

  if (existing) {
    existing.retryCount++;
    existing.lastRetryAt = new Date();
    existing.reason = result.reason || existing.reason;
    existing.rescheduleAfterMs = result.rescheduleAfterMs || existing.rescheduleAfterMs;
  } else {
    // Enforce max size
    if (blockedJobs.size >= MAX_BLOCKED_JOBS) {
      const oldest = Array.from(blockedJobs.entries()).sort(
        ([, a], [, b]) => a.blockedAt.getTime() - b.blockedAt.getTime()
      )[0];
      if (oldest) blockedJobs.delete(oldest[0]);
    }

    blockedJobs.set(jobId, {
      jobId,
      jobType,
      blockedAt: new Date(),
      reason: result.reason || "Policy blocked",
      rescheduleAfterMs: result.rescheduleAfterMs || 60000,
      retryCount: 0,
    });
  }
}

/**
 * Cleanup old blocked job records
 */
export function cleanupBlockedJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const cutoff = Date.now() - maxAgeMs;
  let cleaned = 0;

  for (const [jobId, job] of blockedJobs.entries()) {
    if (job.blockedAt.getTime() < cutoff) {
      blockedJobs.delete(jobId);
      cleaned++;
    }
  }

  return cleaned;
}
