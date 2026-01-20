/**
 * Phase 6: Translation Queue Manager
 * 
 * Persistent, resumable translation job queue with:
 * - Concurrency limits (configurable via env)
 * - Exponential backoff for rate limits
 * - Provider fallback chain
 * - Pause/resume capability
 * 
 * Following Octopus queue patterns for consistency.
 */

import { db } from '../db';
import { 
  translationJobs, 
  contents,
  translations,
  type TranslationJob,
  type InsertTranslationJob,
  type TranslationJobField,
  SUPPORTED_LOCALES,
} from '@shared/schema';
import { eq, and, sql, lt, or, isNull, asc, desc, inArray, ne } from 'drizzle-orm';
import { log } from '../lib/logger';
import crypto from 'crypto';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[TranslationQueue] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => 
    log.error(`[TranslationQueue] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[TranslationQueue] WARN: ${msg}`, data),
};

// Configuration from environment
const CONFIG = {
  TRANSLATION_CONCURRENCY: parseInt(process.env.TRANSLATION_CONCURRENCY || '3', 10),
  AEO_CONCURRENCY: parseInt(process.env.AEO_CONCURRENCY || '2', 10),
  INDEX_CONCURRENCY: parseInt(process.env.INDEX_CONCURRENCY || '3', 10),
  MAX_RETRIES: 3,
  BASE_BACKOFF_MS: 1000, // 1 second
  MAX_BACKOFF_MS: 60000, // 60 seconds
  POLL_INTERVAL_MS: 5000, // Check for new jobs every 5 seconds
};

// Queue state
let isRunning = false;
let isPaused = false;
let activeJobs = 0;

/**
 * Compute SHA-256 hash of source content for change detection
 */
export function computeSourceHash(content: Record<string, unknown>): string {
  const data = JSON.stringify(content);
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Calculate next run time with exponential backoff
 */
function calculateBackoff(retryCount: number): Date {
  const backoffMs = Math.min(
    CONFIG.BASE_BACKOFF_MS * Math.pow(2, retryCount),
    CONFIG.MAX_BACKOFF_MS
  );
  return new Date(Date.now() + backoffMs);
}

// ============================================================================
// TRANSLATION QUEUE - DISABLED (January 2026)
// ============================================================================
// Automatic translation queueing is permanently disabled.
// All translations must be done manually via admin UI.
const TRANSLATION_QUEUE_ENABLED = false;

/**
 * Enqueue translation jobs for all locales when content is approved/published
 * DISABLED: Returns empty array, does NOT create jobs
 */
export async function enqueueTranslationJobs(
  contentId: string,
  sourceLocale: string = 'en',
  priority: number = 0,
  fields?: TranslationJobField[]
): Promise<TranslationJob[]> {
  // GUARD: Translation queue is disabled
  if (!TRANSLATION_QUEUE_ENABLED) {
    logger.info('Translation queue DISABLED - no jobs created', { contentId });
    return [];
  }

  const targetLocales = SUPPORTED_LOCALES
    .map(l => l.code)
    .filter(code => code !== sourceLocale);

  // Fetch source content to compute hash
  const [sourceContent] = await db
    .select()
    .from(contents)
    .where(eq(contents.id, contentId));

  if (!sourceContent) {
    logger.error('Content not found for translation', { contentId });
    return [];
  }

  const sourceHash = computeSourceHash({
    title: sourceContent.title,
    metaTitle: sourceContent.metaTitle,
    metaDescription: sourceContent.metaDescription,
    blocks: sourceContent.blocks,
    answerCapsule: sourceContent.answerCapsule,
  });

  const createdJobs: TranslationJob[] = [];

  for (const targetLocale of targetLocales) {
    // Check if job already exists with same source hash (skip if unchanged)
    const [existingJob] = await db
      .select()
      .from(translationJobs)
      .where(and(
        eq(translationJobs.contentId, contentId),
        eq(translationJobs.targetLocale, targetLocale)
      ));

    if (existingJob) {
      if (existingJob.sourceHash === sourceHash && existingJob.status === 'completed') {
        logger.info('Skipping unchanged content', { contentId, targetLocale });
        continue;
      }
      
      // Update existing job if source changed
      const [updatedJob] = await db
        .update(translationJobs)
        .set({
          status: 'pending',
          sourceHash,
          priority,
          retryCount: 0,
          error: null,
          nextRunAt: null,
          updatedAt: new Date(),
          fields: fields || existingJob.fields,
        } as any)
        .where(eq(translationJobs.id, existingJob.id))
        .returning();
      
      if (updatedJob) createdJobs.push(updatedJob);
    } else {
      // Create new job
      const [newJob] = await db
        .insert(translationJobs)
        .values({
          contentId,
          sourceLocale,
          targetLocale,
          sourceHash,
          priority,
          fields: fields || ['title', 'metaTitle', 'metaDescription', 'blocks', 'answerCapsule', 'faq', 'highlights', 'tags'],
        } as any)
        .returning();
      
      if (newJob) createdJobs.push(newJob);
    }
  }

  logger.info(`Enqueued ${createdJobs.length} translation jobs`, { 
    contentId, 
    locales: createdJobs.map(j => j.targetLocale) 
  });

  return createdJobs;
}

/**
 * Get next pending job respecting concurrency limits
 */
export async function getNextPendingJob(): Promise<TranslationJob | null> {
  if (isPaused || activeJobs >= CONFIG.TRANSLATION_CONCURRENCY) {
    return null;
  }

  const now = new Date();

  const [job] = await db
    .select()
    .from(translationJobs)
    .where(and(
      eq(translationJobs.status, 'pending'),
      or(
        isNull(translationJobs.nextRunAt),
        lt(translationJobs.nextRunAt, now)
      )
    ))
    .orderBy(desc(translationJobs.priority), asc(translationJobs.createdAt))
    .limit(1);

  return job || null;
}

/**
 * Mark job as in progress
 */
export async function markJobInProgress(jobId: string): Promise<TranslationJob | null> {
  const [job] = await db
    .update(translationJobs)
    .set({
      status: 'in_progress',
      processingStartedAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(translationJobs.id, jobId))
    .returning();

  if (job) {
    activeJobs++;
    logger.info('Job started', { jobId, targetLocale: job.targetLocale });
  }

  return job || null;
}

/**
 * Mark job as completed
 */
export async function markJobCompleted(
  jobId: string, 
  provider?: string
): Promise<TranslationJob | null> {
  const [job] = await db
    .update(translationJobs)
    .set({
      status: 'completed',
      translationProvider: provider,
      completedAt: new Date(),
      updatedAt: new Date(),
      error: null,
    } as any)
    .where(eq(translationJobs.id, jobId))
    .returning();

  if (job) {
    activeJobs = Math.max(0, activeJobs - 1);
    logger.info('Job completed', { jobId, targetLocale: job.targetLocale, provider });
  }

  return job || null;
}

/**
 * Mark job as failed with retry logic
 */
export async function markJobFailed(
  jobId: string, 
  error: string,
  shouldRetry: boolean = true
): Promise<TranslationJob | null> {
  const [currentJob] = await db
    .select()
    .from(translationJobs)
    .where(eq(translationJobs.id, jobId));

  if (!currentJob) return null;

  const newRetryCount = currentJob.retryCount + 1;
  const maxRetriesReached = newRetryCount >= CONFIG.MAX_RETRIES;

  const [job] = await db
    .update(translationJobs)
    .set({
      status: shouldRetry && !maxRetriesReached ? 'pending' : 'failed',
      error,
      retryCount: newRetryCount,
      nextRunAt: shouldRetry && !maxRetriesReached ? calculateBackoff(newRetryCount) : null,
      updatedAt: new Date(),
    } as any)
    .where(eq(translationJobs.id, jobId))
    .returning();

  if (job) {
    activeJobs = Math.max(0, activeJobs - 1);
    logger.error('Job failed', { 
      jobId, 
      targetLocale: job.targetLocale, 
      error, 
      retryCount: newRetryCount,
      willRetry: shouldRetry && !maxRetriesReached 
    });
  }

  return job || null;
}

/**
 * Mark job as needs review
 */
export async function markJobNeedsReview(
  jobId: string, 
  reason: string
): Promise<TranslationJob | null> {
  const [job] = await db
    .update(translationJobs)
    .set({
      status: 'needs_review',
      error: reason,
      updatedAt: new Date(),
    } as any)
    .where(eq(translationJobs.id, jobId))
    .returning();

  if (job) {
    activeJobs = Math.max(0, activeJobs - 1);
    logger.warn('Job needs review', { jobId, targetLocale: job.targetLocale, reason });
  }

  return job || null;
}

// Track pause state
let pauseCount = 0;
let autoResumeTimer: NodeJS.Timeout | null = null;
let isManualPause = false;

/**
 * Pause the queue due to rate limiting (with automatic exponential backoff resume)
 * Only called internally when rate limits are hit
 */
export function pauseQueue(reason: string): void {
  isPaused = true;
  pauseCount++;
  isManualPause = false;
  
  // Clear any existing auto-resume timer
  if (autoResumeTimer) {
    clearTimeout(autoResumeTimer);
    autoResumeTimer = null;
  }
  
  // Calculate backoff time (1s → 2s → 4s → ... → 60s max)
  const backoffMs = Math.min(
    CONFIG.BASE_BACKOFF_MS * Math.pow(2, pauseCount - 1),
    CONFIG.MAX_BACKOFF_MS
  );
  
  logger.warn('Queue paused (rate limit)', { 
    reason, 
    pauseCount, 
    autoResumeInMs: backoffMs 
  });
  
  // Schedule automatic resume after backoff (only for rate limit pauses)
  autoResumeTimer = setTimeout(() => {
    if (!isManualPause) {
      isPaused = false;
      logger.info('Queue auto-resumed after backoff', { backoffMs });
    }
  }, backoffMs);
}

/**
 * Manually pause the queue (admin action - persists until explicitly resumed)
 */
export function manualPause(reason: string): void {
  isPaused = true;
  isManualPause = true;
  
  // Clear any auto-resume timer - manual pauses persist
  if (autoResumeTimer) {
    clearTimeout(autoResumeTimer);
    autoResumeTimer = null;
  }
  
  logger.warn('Queue manually paused', { reason });
}

/**
 * Resume the queue (reset pause count on successful resume)
 */
export function resumeQueue(): void {
  isPaused = false;
  isManualPause = false;
  
  // Clear any pending auto-resume timer
  if (autoResumeTimer) {
    clearTimeout(autoResumeTimer);
    autoResumeTimer = null;
  }
  
  // Reset pause count after 5 minutes of successful operation
  setTimeout(() => {
    if (!isPaused) {
      pauseCount = 0;
    }
  }, 5 * 60 * 1000);
  
  logger.info('Queue resumed');
}

/**
 * Get queue status
 */
export async function getQueueStatus(): Promise<{
  isRunning: boolean;
  isPaused: boolean;
  activeJobs: number;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  failedCount: number;
  needsReviewCount: number;
}> {
  const statusCounts = await db
    .select({
      status: translationJobs.status,
      count: sql<number>`count(*)::int`,
    })
    .from(translationJobs)
    .groupBy(translationJobs.status);

  const countByStatus = Object.fromEntries(
    statusCounts.map(s => [s.status, s.count])
  );

  return {
    isRunning,
    isPaused,
    activeJobs,
    pendingCount: countByStatus.pending || 0,
    inProgressCount: countByStatus.in_progress || 0,
    completedCount: countByStatus.completed || 0,
    failedCount: countByStatus.failed || 0,
    needsReviewCount: countByStatus.needs_review || 0,
  };
}

/**
 * Get jobs for a specific content
 */
export async function getJobsForContent(contentId: string): Promise<TranslationJob[]> {
  return db
    .select()
    .from(translationJobs)
    .where(eq(translationJobs.contentId, contentId))
    .orderBy(asc(translationJobs.targetLocale));
}

/**
 * Retry a failed job manually
 */
export async function retryJob(jobId: string): Promise<TranslationJob | null> {
  const [job] = await db
    .update(translationJobs)
    .set({
      status: 'pending',
      retryCount: 0,
      error: null,
      nextRunAt: null,
      updatedAt: new Date(),
    } as any)
    .where(eq(translationJobs.id, jobId))
    .returning();

  if (job) {
    logger.info('Job queued for retry', { jobId, targetLocale: job.targetLocale });
  }

  return job || null;
}

/**
 * Cancel a pending job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const result = await db
    .delete(translationJobs)
    .where(and(
      eq(translationJobs.id, jobId),
      eq(translationJobs.status, 'pending')
    ))
    .returning();

  return result.length > 0;
}

/**
 * Get jobs by status
 */
export async function getJobsByStatus(
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'needs_review',
  limit: number = 50
): Promise<TranslationJob[]> {
  return db
    .select()
    .from(translationJobs)
    .where(eq(translationJobs.status, status))
    .orderBy(desc(translationJobs.createdAt))
    .limit(limit);
}

/**
 * Start the queue worker
 */
export function startQueue(): void {
  if (isRunning) {
    logger.warn('Queue already running');
    return;
  }

  isRunning = true;
  logger.info('Translation queue started', { 
    concurrency: CONFIG.TRANSLATION_CONCURRENCY,
    pollInterval: CONFIG.POLL_INTERVAL_MS 
  });
}

/**
 * Stop the queue worker
 */
export function stopQueue(): void {
  isRunning = false;
  logger.info('Translation queue stopped');
}

export { CONFIG as QUEUE_CONFIG };
