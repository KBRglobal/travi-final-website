/**
 * Database-backed job queue for background processing
 * Handles tasks like translation, AI generation, email sending
 * Persists jobs to PostgreSQL for reliability
 */

import { db } from "./db";
import { backgroundJobs } from "@shared/schema";
import { eq, desc, and, lt, inArray, count } from "drizzle-orm";

export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type JobType = "translate" | "ai_generate" | "email" | "image_process" | "cleanup";

export interface Job<T = unknown> {
  id: string;
  type: JobType;
  status: JobStatus;
  data: T;
  result?: unknown;
  error?: string;
  retries: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  priority: number;
}

type JobHandler<T = unknown> = (data: T) => Promise<unknown>;

// Helper to convert DB row to Job type
function dbToJob(row: typeof backgroundJobs.$inferSelect): Job {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    data: row.data,
    result: row.result || undefined,
    error: row.error || undefined,
    retries: row.retries,
    maxRetries: row.maxRetries,
    createdAt: row.createdAt,
    startedAt: row.startedAt || undefined,
    completedAt: row.completedAt || undefined,
    priority: row.priority,
  };
}

class JobQueue {
  private handlers: Map<JobType, JobHandler> = new Map();
  private processing: Set<string> = new Set();
  private maxConcurrent: number = 3;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastProcessedAt: Date | null = null;
  private lastTickAt: Date | null = null;

  /**
   * Register a handler for a job type
   */
  registerHandler<T>(type: JobType, handler: JobHandler<T>) {
    this.handlers.set(type, handler as JobHandler);
  }

  /**
   * Add a job to the queue
   */
  async addJob<T extends Record<string, unknown>>(
    type: JobType,
    data: T,
    options?: { priority?: number; maxRetries?: number }
  ): Promise<string> {
    const [job] = await db
      .insert(backgroundJobs)
      .values({
        type,
        status: "pending",
        data,
        retries: 0,
        maxRetries: options?.maxRetries ?? 3,
        priority: options?.priority ?? 0,
      } as any)
      .returning();

    return job.id;
  }

  /**
   * Synchronous add (for backward compatibility) - queues async insert
   */
  addJobSync<T extends Record<string, unknown>>(
    type: JobType,
    data: T,
    options?: { priority?: number; maxRetries?: number }
  ): string {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    // Insert async
    db.insert(backgroundJobs)
      .values({
        id,
        type,
        status: "pending",
        data,
        retries: 0,
        maxRetries: options?.maxRetries ?? 3,
        priority: options?.priority ?? 0,
      } as any)
      .then(() => {})
      .catch(err => {
        console.error(`[JobQueue] Failed to insert job ${id}:`, err);
      });

    return id;
  }

  /**
   * Get job status
   */
  async getJob(id: string): Promise<Job | undefined> {
    const [row] = await db.select().from(backgroundJobs).where(eq(backgroundJobs.id, id)).limit(1);

    return row ? dbToJob(row) : undefined;
  }

  /**
   * Get all jobs by status
   */
  async getJobsByStatus(status: JobStatus): Promise<Job[]> {
    const rows = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.status, status))
      .orderBy(desc(backgroundJobs.priority), backgroundJobs.createdAt);

    return rows.map(dbToJob);
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const [pending] = await db
      .select({ count: count() })
      .from(backgroundJobs)
      .where(eq(backgroundJobs.status, "pending"));

    const [processing] = await db
      .select({ count: count() })
      .from(backgroundJobs)
      .where(eq(backgroundJobs.status, "processing"));

    const [completed] = await db
      .select({ count: count() })
      .from(backgroundJobs)
      .where(eq(backgroundJobs.status, "completed"));

    const [failed] = await db
      .select({ count: count() })
      .from(backgroundJobs)
      .where(eq(backgroundJobs.status, "failed"));

    const total =
      (pending?.count || 0) +
      (processing?.count || 0) +
      (completed?.count || 0) +
      (failed?.count || 0);

    return {
      pending: pending?.count || 0,
      processing: processing?.count || 0,
      completed: completed?.count || 0,
      failed: failed?.count || 0,
      total,
    };
  }

  /**
   * Get recent jobs (for admin dashboard)
   */
  async getRecentJobs(limit: number = 20): Promise<Job[]> {
    const rows = await db
      .select()
      .from(backgroundJobs)
      .orderBy(desc(backgroundJobs.createdAt))
      .limit(limit);

    return rows.map(dbToJob);
  }

  /**
   * Start processing jobs
   */
  private startProcessing() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.lastTickAt = new Date();
      this.processNext();
    }, 1000);

    // Recover any stuck "processing" jobs on startup
    this.recoverStuckJobs();
  }

  /**
   * Recover jobs stuck in processing state (from crashed instance)
   */
  private async recoverStuckJobs() {
    try {
      const result = await db
        .update(backgroundJobs)
        .set({ status: "pending" } as any)
        .where(eq(backgroundJobs.status, "processing"))
        .returning();

      if (result.length > 0) {
        /* Stale processing jobs reset to pending */
      }
    } catch (err) {
      /* ignored */
    }
  }

  /**
   * Start job processing (public method)
   */
  start() {
    this.startProcessing();
  }

  /**
   * Stop processing jobs
   */
  stopProcessing() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Process next available job
   */
  private async processNext() {
    if (this.processing.size >= this.maxConcurrent) return;

    try {
      // Get next pending job (highest priority first)
      const [jobRow] = await db
        .select()
        .from(backgroundJobs)
        .where(eq(backgroundJobs.status, "pending"))
        .orderBy(desc(backgroundJobs.priority), backgroundJobs.createdAt)
        .limit(1);

      if (!jobRow) return;

      const handler = this.handlers.get(jobRow.type);
      if (!handler) {
        return;
      }

      // Mark job as processing
      await db
        .update(backgroundJobs)
        .set({ status: "processing", startedAt: new Date() } as any)
        .where(eq(backgroundJobs.id, jobRow.id));

      this.processing.add(jobRow.id);

      try {
        const result = await handler(jobRow.data);

        await db
          .update(backgroundJobs)
          .set({
            status: "completed",
            result: result as Record<string, unknown>,
            completedAt: new Date(),
          } as any)
          .where(eq(backgroundJobs.id, jobRow.id));

        this.lastProcessedAt = new Date();
      } catch (error) {
        const newRetries = jobRow.retries + 1;

        if (newRetries < jobRow.maxRetries) {
          // Retry
          await db
            .update(backgroundJobs)
            .set({ status: "pending", retries: newRetries } as any)
            .where(eq(backgroundJobs.id, jobRow.id));
        } else {
          // Failed permanently
          await db
            .update(backgroundJobs)
            .set({
              status: "failed",
              retries: newRetries,
              error: error instanceof Error ? error.message : String(error),
              completedAt: new Date(),
            } as any)
            .where(eq(backgroundJobs.id, jobRow.id));
        }
      } finally {
        this.processing.delete(jobRow.id);
      }

      // Clean up old completed/failed jobs periodically
      if (Math.random() < 0.01) {
        // 1% chance each run
        await this.cleanup();
      }
    } catch (err) {
      /* ignored */
    }
  }

  /**
   * Clean up old jobs to prevent DB bloat
   */
  private async cleanup() {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days old

    try {
      const result = await db
        .delete(backgroundJobs)
        .where(
          and(
            inArray(backgroundJobs.status, ["completed", "failed"]),
            lt(backgroundJobs.completedAt, cutoffDate)
          )
        )
        .returning();

      if (result.length > 0) {
        /* Old completed/failed jobs cleaned up */
      }
    } catch (err) {
      /* ignored */
    }
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(id: string): Promise<boolean> {
    const result = await db
      .delete(backgroundJobs)
      .where(and(eq(backgroundJobs.id, id), eq(backgroundJobs.status, "pending")))
      .returning();

    if (result.length > 0) {
      return true;
    }
    return false;
  }

  /**
   * Retry a failed job
   */
  async retryJob(id: string): Promise<boolean> {
    const result = await db
      .update(backgroundJobs)
      .set({
        status: "pending",
        retries: 0,
        error: null,
        completedAt: null,
      } as any)
      .where(and(eq(backgroundJobs.id, id), eq(backgroundJobs.status, "failed")))
      .returning();

    if (result.length > 0) {
      return true;
    }
    return false;
  }
}

// Singleton instance
export const jobQueue = new JobQueue();

/**
 * Get queue health status for sanity checks
 */
export function getQueueHealth(): {
  isRunning: boolean;
  available: boolean;
  lastProcessedAt: string | null;
  lastTickAt: string | null;
} {
  return {
    isRunning: (jobQueue as any).isRunning || false,
    available: !!jobQueue,
    lastProcessedAt: (jobQueue as any).lastProcessedAt?.toISOString() || null,
    lastTickAt: (jobQueue as any).lastTickAt?.toISOString() || null,
  };
}

// Export types for handlers
export interface TranslateJobData {
  contentId: string;
  targetLocale: string;
  priority?: number;
}

export interface AiGenerateJobData {
  type: string;
  topic: string;
  keywords?: string[];
  priority?: number;
}

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  template?: string;
}

export interface ImageProcessJobData {
  mediaId: string;
  operations: Array<{
    type: "resize" | "crop" | "compress";
    params: Record<string, unknown>;
  }>;
}

export interface CleanupJobData {
  type: "expired_sessions" | "old_drafts" | "unused_media";
  olderThan?: number; // days
}
