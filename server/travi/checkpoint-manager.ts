/**
 * TRAVI Content Generation - Checkpoint Manager
 *
 * Handles saving progress, graceful shutdown, and resume logic
 * for long-running content generation jobs.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

// Checkpoint intervals
const CHECKPOINT_LOCATION_INTERVAL = 10; // Save every 10 locations
const CHECKPOINT_TIME_INTERVAL = 5 * 60 * 1000; // Save every 5 minutes

export interface CheckpointData {
  lastProcessedId: string | null;
  processedCount: number;
  successCount: number;
  failedCount: number;
  currentBatchIndex: number;
  destinationIndex?: number;
  categoryIndex?: number;
  errorLog: { id: string; error: string; timestamp: string }[];
  startedAt: string;
  lastCheckpointAt: string;
}

export interface JobState {
  jobId: string;
  jobType: string;
  status: "pending" | "running" | "paused" | "completed" | "failed" | "budget_exceeded";
  totalItems: number;
  processedItems: number;
  successCount: number;
  failedCount: number;
  checkpoint: CheckpointData | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

// Create a new job
export async function createJob(
  jobType: string,
  destinationId?: string,
  category?: string,
  totalItems: number = 0
): Promise<string | null> {
  try {
    const result = await db.execute(sql`
      INSERT INTO travi_processing_jobs (
        id, job_type, status, destination_id, category, total_items,
        processed_items, success_count, failed_count, started_at
      )
      VALUES (
        gen_random_uuid(),
        ${jobType}::travi_job_type,
        'pending'::travi_job_status,
        ${destinationId || null},
        ${category ? sql`${category}::travi_location_category` : sql`NULL`},
        ${totalItems},
        0, 0, 0,
        now()
      )
      RETURNING id
    `);

    return result.rows[0]?.id as string;
  } catch (error) {
    return null;
  }
}

// Update job status
export async function updateJobStatus(
  jobId: string,
  status: "pending" | "running" | "paused" | "completed" | "failed" | "budget_exceeded",
  errorMessage?: string
): Promise<boolean> {
  try {
    await db.execute(sql`
      UPDATE travi_processing_jobs
      SET 
        status = ${status}::travi_job_status,
        error_message = ${errorMessage || null},
        completed_at = ${status === "completed" || status === "failed" || status === "budget_exceeded" ? sql`now()` : sql`NULL`},
        updated_at = now()
      WHERE id = ${jobId}
    `);
    return true;
  } catch (error) {
    return false;
  }
}

// Save checkpoint
export async function saveCheckpoint(jobId: string, checkpoint: CheckpointData): Promise<boolean> {
  try {
    await db.execute(sql`
      UPDATE travi_processing_jobs
      SET 
        last_processed_id = ${checkpoint.lastProcessedId},
        processed_items = ${checkpoint.processedCount},
        success_count = ${checkpoint.successCount},
        failed_count = ${checkpoint.failedCount},
        checkpoint_data = ${JSON.stringify(checkpoint)}::jsonb,
        last_checkpoint_at = now(),
        updated_at = now()
      WHERE id = ${jobId}
    `);

    return true;
  } catch (error) {
    return false;
  }
}

// Load checkpoint for a job
export async function loadCheckpoint(jobId: string): Promise<CheckpointData | null> {
  try {
    const result = await db.execute(sql`
      SELECT checkpoint_data FROM travi_processing_jobs WHERE id = ${jobId}
    `);

    if (result.rows.length === 0) return null;

    const checkpointData = result.rows[0]?.checkpoint_data;
    if (!checkpointData) return null;

    return checkpointData as CheckpointData;
  } catch (error) {
    return null;
  }
}

// Get job state
export async function getJobState(jobId: string): Promise<JobState | null> {
  try {
    const result = await db.execute(sql`
      SELECT * FROM travi_processing_jobs WHERE id = ${jobId}
    `);

    if (result.rows.length === 0) return null;

    const row = result.rows[0] as any;
    return {
      jobId: row.id,
      jobType: row.job_type,
      status: row.status,
      totalItems: row.total_items || 0,
      processedItems: row.processed_items || 0,
      successCount: row.success_count || 0,
      failedCount: row.failed_count || 0,
      checkpoint: row.checkpoint_data,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  } catch (error) {
    return null;
  }
}

// Get running jobs
export async function getRunningJobs(): Promise<JobState[]> {
  try {
    const result = await db.execute(sql`
      SELECT * FROM travi_processing_jobs 
      WHERE status = 'running'::travi_job_status
      ORDER BY started_at DESC
    `);

    return result.rows.map((row: any) => ({
      jobId: row.id,
      jobType: row.job_type,
      status: row.status,
      totalItems: row.total_items || 0,
      processedItems: row.processed_items || 0,
      successCount: row.success_count || 0,
      failedCount: row.failed_count || 0,
      checkpoint: row.checkpoint_data,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }));
  } catch (error) {
    return [];
  }
}

// Get pending or paused jobs
export async function getResumableJobs(): Promise<JobState[]> {
  try {
    const result = await db.execute(sql`
      SELECT * FROM travi_processing_jobs 
      WHERE status IN ('pending'::travi_job_status, 'paused'::travi_job_status)
      ORDER BY created_at DESC
    `);

    return result.rows.map((row: any) => ({
      jobId: row.id,
      jobType: row.job_type,
      status: row.status,
      totalItems: row.total_items || 0,
      processedItems: row.processed_items || 0,
      successCount: row.success_count || 0,
      failedCount: row.failed_count || 0,
      checkpoint: row.checkpoint_data,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }));
  } catch (error) {
    return [];
  }
}

// Get recent completed jobs
export async function getRecentJobs(limit: number = 10, offset: number = 0): Promise<JobState[]> {
  try {
    const result = await db.execute(sql`
      SELECT * FROM travi_processing_jobs 
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return result.rows.map((row: any) => ({
      jobId: row.id,
      jobType: row.job_type,
      status: row.status,
      totalItems: row.total_items || 0,
      processedItems: row.processed_items || 0,
      successCount: row.success_count || 0,
      failedCount: row.failed_count || 0,
      checkpoint: row.checkpoint_data,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }));
  } catch (error) {
    return [];
  }
}

// Checkpoint tracker class for easy use in processing loops
export class CheckpointTracker {
  private jobId: string;
  private checkpoint: CheckpointData;
  private lastCheckpointTime: number;
  private locationsSinceCheckpoint: number = 0;
  private isShuttingDown: boolean = false;

  constructor(jobId: string, initialCheckpoint?: CheckpointData) {
    this.jobId = jobId;
    this.checkpoint = initialCheckpoint || {
      lastProcessedId: null,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      currentBatchIndex: 0,
      errorLog: [],
      startedAt: new Date().toISOString(),
      lastCheckpointAt: new Date().toISOString(),
    };
    this.lastCheckpointTime = Date.now();

    // Set up graceful shutdown handler
    this.setupShutdownHandler();
  }

  private setupShutdownHandler(): void {
    const handler = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      await this.save();
      await updateJobStatus(this.jobId, "paused");
    };

    process.on("SIGTERM", handler);
    process.on("SIGINT", handler);
  }

  // Check if shutdown was requested
  shouldStop(): boolean {
    return this.isShuttingDown;
  }

  // Record processed location
  async recordProcessed(locationId: string, success: boolean, error?: string): Promise<void> {
    this.checkpoint.lastProcessedId = locationId;
    this.checkpoint.processedCount++;
    this.locationsSinceCheckpoint++;

    if (success) {
      this.checkpoint.successCount++;
    } else {
      this.checkpoint.failedCount++;
      if (error) {
        this.checkpoint.errorLog.push({
          id: locationId,
          error,
          timestamp: new Date().toISOString(),
        });
        // Keep only last 100 errors
        if (this.checkpoint.errorLog.length > 100) {
          this.checkpoint.errorLog = this.checkpoint.errorLog.slice(-100);
        }
      }
    }

    // Check if we should save checkpoint
    const timeSinceCheckpoint = Date.now() - this.lastCheckpointTime;
    if (
      this.locationsSinceCheckpoint >= CHECKPOINT_LOCATION_INTERVAL ||
      timeSinceCheckpoint >= CHECKPOINT_TIME_INTERVAL
    ) {
      await this.save();
    }
  }

  // Update batch index
  updateBatchIndex(index: number): void {
    this.checkpoint.currentBatchIndex = index;
  }

  // Update destination/category index
  updateIndices(destinationIndex?: number, categoryIndex?: number): void {
    if (destinationIndex !== undefined) {
      this.checkpoint.destinationIndex = destinationIndex;
    }
    if (categoryIndex !== undefined) {
      this.checkpoint.categoryIndex = categoryIndex;
    }
  }

  // Force save checkpoint
  async save(): Promise<void> {
    this.checkpoint.lastCheckpointAt = new Date().toISOString();
    await saveCheckpoint(this.jobId, this.checkpoint);
    this.lastCheckpointTime = Date.now();
    this.locationsSinceCheckpoint = 0;
  }

  // Get current checkpoint data
  getCheckpoint(): CheckpointData {
    return { ...this.checkpoint };
  }

  // Get stats
  getStats(): { processed: number; success: number; failed: number } {
    return {
      processed: this.checkpoint.processedCount,
      success: this.checkpoint.successCount,
      failed: this.checkpoint.failedCount,
    };
  }
}

// Resume from checkpoint
export async function resumeFromCheckpoint(jobId: string): Promise<{
  tracker: CheckpointTracker;
  startFromId: string | null;
  startFromBatch: number;
}> {
  const checkpoint = await loadCheckpoint(jobId);

  // Update job status to running
  await updateJobStatus(jobId, "running");

  const tracker = new CheckpointTracker(jobId, checkpoint || undefined);

  return {
    tracker,
    startFromId: checkpoint?.lastProcessedId || null,
    startFromBatch: checkpoint?.currentBatchIndex || 0,
  };
}
