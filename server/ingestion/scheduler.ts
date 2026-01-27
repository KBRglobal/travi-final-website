/**
 * Ingestion Scheduler
 * Cron-based scheduling for data source ingestion with concurrent run prevention
 */

import cron, { type ScheduledTask } from "node-cron";
import type {
  DataSource,
  IngestionResult,
  IngestionRunRecord,
  IngestionSourceStatus,
} from "./types";
import type { BaseIngester } from "./base-ingester";

interface ScheduledIngester {
  ingester: BaseIngester;
  task: ScheduledTask | null;
  isRunning: boolean;
  runHistory: IngestionRunRecord[];
}

class IngestionScheduler {
  private scheduledIngesters: Map<string, ScheduledIngester> = new Map();
  private maxHistorySize = 100;

  /**
   * Register an ingester with the scheduler
   */
  register(ingester: BaseIngester): void {
    const sourceId = ingester.source.id;

    if (this.scheduledIngesters.has(sourceId)) {
      this.log(`Ingester ${sourceId} already registered, skipping`);
      return;
    }

    const scheduled: ScheduledIngester = {
      ingester,
      task: null,
      isRunning: false,
      runHistory: [],
    };

    this.scheduledIngesters.set(sourceId, scheduled);
    this.log(`Registered ingester: ${sourceId}`);

    // Schedule if enabled and has cron schedule
    if (ingester.source.config.enabled && ingester.source.config.cronSchedule) {
      this.scheduleIngester(sourceId);
    }
  }

  /**
   * Unregister an ingester and stop its scheduled task
   */
  unregister(sourceId: string): void {
    const scheduled = this.scheduledIngesters.get(sourceId);
    if (scheduled?.task) {
      scheduled.task.stop();
    }
    this.scheduledIngesters.delete(sourceId);
    this.log(`Unregistered ingester: ${sourceId}`);
  }

  /**
   * Schedule an ingester's cron task
   */
  private scheduleIngester(sourceId: string): void {
    const scheduled = this.scheduledIngesters.get(sourceId);
    if (!scheduled) return;

    const cronSchedule = scheduled.ingester.source.config.cronSchedule;
    if (!cronSchedule) return;

    // Validate cron expression
    if (!cron.validate(cronSchedule)) {
      this.logError(`Invalid cron expression for ${sourceId}: ${cronSchedule}`);
      return;
    }

    // Stop existing task if any
    if (scheduled.task) {
      scheduled.task.stop();
    }

    // Create new scheduled task
    scheduled.task = cron.schedule(cronSchedule, async () => {
      await this.runIngestion(sourceId);
    });

    this.log(`Scheduled ingester ${sourceId} with cron: ${cronSchedule}`);
  }

  /**
   * Run ingestion for a specific source (with concurrent run prevention)
   */
  async runIngestion(sourceId: string): Promise<IngestionResult | null> {
    const scheduled = this.scheduledIngesters.get(sourceId);
    if (!scheduled) {
      this.logError(`Ingester not found: ${sourceId}`);
      return null;
    }

    // Prevent concurrent runs
    if (scheduled.isRunning) {
      this.log(`Ingestion already running for ${sourceId}, skipping`);
      return null;
    }

    scheduled.isRunning = true;
    const runId = this.generateRunId();
    const startedAt = new Date();

    // Create run record
    const runRecord: IngestionRunRecord = {
      id: runId,
      sourceId,
      startedAt,
      status: "running",
    };

    // Add to history (at the beginning)
    scheduled.runHistory.unshift(runRecord);

    // Trim history if too large
    if (scheduled.runHistory.length > this.maxHistorySize) {
      scheduled.runHistory = scheduled.runHistory.slice(0, this.maxHistorySize);
    }

    this.log(`Starting ingestion run ${runId} for ${sourceId}`);

    try {
      const result = await scheduled.ingester.ingest();

      // Update run record
      runRecord.completedAt = new Date();
      runRecord.status = "completed";
      runRecord.result = result;

      this.log(`Ingestion run ${runId} completed for ${sourceId}`, {
        processed: result.recordsProcessed,
        created: result.recordsCreated,
        updated: result.recordsUpdated,
        errors: result.errors.length,
        durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      // Update run record with error
      runRecord.completedAt = new Date();
      runRecord.status = "failed";
      runRecord.error = error instanceof Error ? error.message : String(error);

      this.logError(`Ingestion run ${runId} failed for ${sourceId}`, error);

      return null;
    } finally {
      scheduled.isRunning = false;
    }
  }

  /**
   * Get status for all registered sources
   */
  getAllStatus(): IngestionSourceStatus[] {
    const statuses: IngestionSourceStatus[] = [];

    for (const [sourceId, scheduled] of this.scheduledIngesters) {
      statuses.push({
        source: scheduled.ingester.source,
        lastRun: scheduled.runHistory[0],
        nextScheduledRun: this.getNextRunTime(scheduled),
        isRunning: scheduled.isRunning,
      });
    }

    return statuses;
  }

  /**
   * Get status for a specific source
   */
  getSourceStatus(sourceId: string): IngestionSourceStatus | null {
    const scheduled = this.scheduledIngesters.get(sourceId);
    if (!scheduled) return null;

    return {
      source: scheduled.ingester.source,
      lastRun: scheduled.runHistory[0],
      nextScheduledRun: this.getNextRunTime(scheduled),
      isRunning: scheduled.isRunning,
    };
  }

  /**
   * Get run history for a specific source
   */
  getRunHistory(sourceId: string, limit = 20): IngestionRunRecord[] {
    const scheduled = this.scheduledIngesters.get(sourceId);
    if (!scheduled) return [];

    return scheduled.runHistory.slice(0, limit);
  }

  /**
   * Check if a source is currently running
   */
  isRunning(sourceId: string): boolean {
    return this.scheduledIngesters.get(sourceId)?.isRunning ?? false;
  }

  /**
   * Start all scheduled ingesters
   */
  startAll(): void {
    for (const [sourceId, scheduled] of this.scheduledIngesters) {
      if (scheduled.ingester.source.config.enabled && scheduled.task) {
        scheduled.task.start();
        this.log(`Started scheduler for ${sourceId}`);
      }
    }
  }

  /**
   * Stop all scheduled ingesters
   */
  stopAll(): void {
    for (const [sourceId, scheduled] of this.scheduledIngesters) {
      if (scheduled.task) {
        scheduled.task.stop();
        this.log(`Stopped scheduler for ${sourceId}`);
      }
    }
  }

  /**
   * Calculate next run time for a scheduled ingester
   */
  private getNextRunTime(scheduled: ScheduledIngester): Date | undefined {
    const cronSchedule = scheduled.ingester.source.config.cronSchedule;
    if (!cronSchedule || !scheduled.ingester.source.config.enabled) {
      return undefined;
    }

    // Simple approximation - for more accurate timing, use a cron parser library
    // This returns a placeholder that indicates scheduling is active
    return new Date(Date.now() + 60000); // Placeholder: 1 minute from now
  }

  /**
   * Generate unique run ID
   */
  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Log message with scheduler prefix
   */
  private log(message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    if (data) {
    } else {
    }
  }

  /**
   * Log error with scheduler prefix
   */
  private logError(message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();
  }
}

// Export singleton instance
export const ingestionScheduler = new IngestionScheduler();
