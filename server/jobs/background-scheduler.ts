/**
 * Background Scheduler - Low-Priority Job Processing
 *
 * TASK 8: Background Optimizers
 *
 * Processes background optimization jobs when users are idle:
 * - SEO improvement: Enhance meta descriptions
 * - Internal linking: Add related content links
 * - Content enrichment: Add missing fields
 *
 * HARD CONSTRAINTS:
 * - Must pause automatically under load (yellow/red tiers)
 * - No blocking of user-facing requests
 * - Low priority only
 * - Resume when tier returns to green
 */

import { log } from "../lib/logger";
import { getLoadTierManager, type LoadTier } from "../system/load-tiers";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[BackgroundScheduler] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[BackgroundScheduler] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[BackgroundScheduler] ${msg}`, undefined, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[BackgroundScheduler][AUDIT] ${msg}`, data),
};

export type BackgroundJobType =
  | "seo-improvement"
  | "internal-linking"
  | "content-enrichment"
  | "content-value-improvement";

export type BackgroundJobPriority = "low" | "medium";

export type BackgroundJobStatus = "pending" | "processing" | "completed" | "failed" | "paused";

export interface BackgroundJob {
  id: string;
  type: BackgroundJobType;
  entityId: string;
  priority: BackgroundJobPriority;
  status: BackgroundJobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface SchedulerConfig {
  maxConcurrentJobs: number;
  jobTimeoutMs: number;
  maxRetries: number;
  processingIntervalMs: number;
  pauseCheckIntervalMs: number;
}

export interface SchedulerMetrics {
  totalScheduled: number;
  totalCompleted: number;
  totalFailed: number;
  totalPaused: number;
  currentQueueSize: number;
  processingCount: number;
  isPaused: boolean;
  pauseReason?: string;
  lastProcessedAt?: Date;
  averageProcessingTimeMs: number;
}

export interface JobResult {
  jobId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  maxConcurrentJobs: 2,
  jobTimeoutMs: 30000,
  maxRetries: 3,
  processingIntervalMs: 5000,
  pauseCheckIntervalMs: 1000,
};

export class BackgroundScheduler {
  private config: SchedulerConfig;
  private jobQueue: Map<string, BackgroundJob>;
  private processingJobs: Set<string>;
  private metrics: SchedulerMetrics;
  private isPaused: boolean;
  private pauseReason?: string;
  private processingTimer?: ReturnType<typeof setInterval>;
  private pauseCheckTimer?: ReturnType<typeof setInterval>;
  private isRunning: boolean;
  private totalProcessingTimeMs: number;
  private processedCount: number;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.jobQueue = new Map();
    this.processingJobs = new Set();
    this.isPaused = false;
    this.isRunning = false;
    this.totalProcessingTimeMs = 0;
    this.processedCount = 0;

    this.metrics = {
      totalScheduled: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalPaused: 0,
      currentQueueSize: 0,
      processingCount: 0,
      isPaused: false,
      averageProcessingTimeMs: 0,
    };

    logger.info("Background Scheduler initialized", {
      maxConcurrentJobs: this.config.maxConcurrentJobs,
      processingIntervalMs: this.config.processingIntervalMs,
    });
  }

  /**
   * Schedule a background job for processing
   *
   * Jobs are queued and processed when:
   * 1. System load is in GREEN tier
   * 2. Processing capacity is available
   */
  scheduleBackgroundJob(
    type: BackgroundJobType,
    entityId: string,
    priority: BackgroundJobPriority = "low"
  ): string {
    const jobId = this.generateJobId();

    const job: BackgroundJob = {
      id: jobId,
      type,
      entityId,
      priority,
      status: "pending",
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    };

    this.jobQueue.set(jobId, job);
    this.metrics.totalScheduled++;
    this.updateQueueMetrics();

    logger.info("Background job scheduled", {
      jobId,
      type,
      entityId,
      priority,
      queueSize: this.jobQueue.size,
    });

    logger.audit("JOB_SCHEDULED", {
      jobId,
      type,
      entityId,
      priority,
      timestamp: job.createdAt.toISOString(),
    });

    return jobId;
  }

  /**
   * Process pending background jobs
   *
   * CRITICAL: Checks load tier before processing
   * - GREEN tier: Process jobs normally
   * - YELLOW/RED tier: Pause all processing
   */
  async processBackgroundJobs(): Promise<JobResult[]> {
    const loadTierManager = getLoadTierManager();
    const currentTier = loadTierManager.getLoadTier();

    if (this.shouldPause(currentTier)) {
      this.pauseProcessing(currentTier);
      return [];
    }

    if (this.isPaused && currentTier === "green") {
      this.resumeProcessing();
    }

    if (this.isPaused) {
      return [];
    }

    const availableSlots = this.config.maxConcurrentJobs - this.processingJobs.size;
    if (availableSlots <= 0) {
      return [];
    }

    const pendingJobs = this.getPendingJobs(availableSlots);
    if (pendingJobs.length === 0) {
      return [];
    }

    const results: JobResult[] = [];

    for (const job of pendingJobs) {
      const tierCheck = loadTierManager.getLoadTier();
      if (this.shouldPause(tierCheck)) {
        this.pauseProcessing(tierCheck);
        break;
      }

      const result = await this.processJob(job);
      results.push(result);
    }

    return results;
  }

  /**
   * Process a single job
   */
  private async processJob(job: BackgroundJob): Promise<JobResult> {
    const startTime = Date.now();

    job.status = "processing";
    job.startedAt = new Date();
    this.processingJobs.add(job.id);
    this.updateQueueMetrics();

    logger.info("Processing background job", {
      jobId: job.id,
      type: job.type,
      entityId: job.entityId,
    });

    try {
      await this.executeJob(job);

      const durationMs = Date.now() - startTime;
      job.status = "completed";
      job.completedAt = new Date();
      this.metrics.totalCompleted++;
      this.metrics.lastProcessedAt = new Date();
      this.totalProcessingTimeMs += durationMs;
      this.processedCount++;
      this.updateAverageProcessingTime();

      logger.info("Background job completed", {
        jobId: job.id,
        type: job.type,
        durationMs,
      });

      logger.audit("JOB_COMPLETED", {
        jobId: job.id,
        type: job.type,
        entityId: job.entityId,
        durationMs,
        timestamp: job.completedAt.toISOString(),
      });

      this.processingJobs.delete(job.id);
      this.jobQueue.delete(job.id);
      this.updateQueueMetrics();

      return {
        jobId: job.id,
        success: true,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      job.retryCount++;
      if (job.retryCount >= job.maxRetries) {
        job.status = "failed";
        job.error = errorMessage;
        this.metrics.totalFailed++;

        logger.error("Background job failed permanently", {
          jobId: job.id,
          type: job.type,
          error: errorMessage,
          retryCount: job.retryCount,
        });

        this.jobQueue.delete(job.id);
      } else {
        job.status = "pending";

        logger.warn("Background job failed, will retry", {
          jobId: job.id,
          type: job.type,
          error: errorMessage,
          retryCount: job.retryCount,
          maxRetries: job.maxRetries,
        });
      }

      this.processingJobs.delete(job.id);
      this.updateQueueMetrics();

      return {
        jobId: job.id,
        success: false,
        error: errorMessage,
        durationMs,
      };
    }
  }

  /**
   * Execute job based on type
   *
   * Job types:
   * - seo-improvement: Enhance meta descriptions
   * - internal-linking: Add related content links
   * - content-enrichment: Add missing fields
   * - content-value-improvement: AI-driven content improvement based on value score
   */
  private async executeJob(job: BackgroundJob): Promise<void> {
    switch (job.type) {
      case "seo-improvement":
        await this.executeSeoImprovement(job.entityId);
        break;
      case "internal-linking":
        await this.executeInternalLinking(job.entityId);
        break;
      case "content-enrichment":
        await this.executeContentEnrichment(job.entityId);
        break;
      case "content-value-improvement":
        await this.executeContentValueImprovement(job.entityId);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * SEO Improvement Job
   * Enhances meta descriptions for content
   */
  private async executeSeoImprovement(entityId: string): Promise<void> {
    logger.info("Executing SEO improvement", { entityId });

    // Stub implementation - in production would:
    // 1. Fetch content by entityId
    // 2. Analyze current meta description
    // 3. Generate improved meta description via AI
    // 4. Update content with new meta description

    await this.simulateWork(500, 1500);

    logger.info("SEO improvement completed", { entityId });
  }

  /**
   * Internal Linking Job
   * Adds related content links
   */
  private async executeInternalLinking(entityId: string): Promise<void> {
    logger.info("Executing internal linking", { entityId });

    // Stub implementation - in production would:
    // 1. Fetch content by entityId
    // 2. Find related content using semantic similarity
    // 3. Insert internal links at appropriate locations
    // 4. Update content with new links

    await this.simulateWork(800, 2000);

    logger.info("Internal linking completed", { entityId });
  }

  /**
   * Content Enrichment Job
   * Adds missing fields to content
   */
  private async executeContentEnrichment(entityId: string): Promise<void> {
    logger.info("Executing content enrichment", { entityId });

    // Stub implementation - in production would:
    // 1. Fetch content by entityId
    // 2. Identify missing fields (excerpt, schema, etc.)
    // 3. Generate missing content via AI
    // 4. Update content with enriched fields

    await this.simulateWork(600, 1800);

    logger.info("Content enrichment completed", { entityId });
  }

  /**
   * Content Value Improvement Job
   * AI-driven content improvement based on value score
   *
   * TASK 3: CONTENT VALUE AUTOMATION
   * Only processes content that is NOT protected (score <= 80)
   */
  private async executeContentValueImprovement(entityId: string): Promise<void> {
    logger.info("Executing content value improvement", { entityId });

    // Import dynamically to avoid circular dependencies
    const { canImproveContent } = await import("../content/value-scorer");

    const checkResult = canImproveContent(entityId);

    if (!checkResult.allowed) {
      logger.warn("Content value improvement blocked", {
        entityId,
        reason: checkResult.reason,
      });
      return;
    }

    // Stub implementation - in production would:
    // 1. Fetch content by entityId
    // 2. Analyze current content quality and performance
    // 3. Generate AI improvements (titles, meta, structure)
    // 4. Apply improvements and update content
    // 5. Record new AI cost

    await this.simulateWork(800, 2500);

    logger.info("Content value improvement completed", {
      entityId,
      previousValue: checkResult.value?.value,
      previousRatio: checkResult.value?.ratio,
    });

    logger.audit("CONTENT_VALUE_IMPROVEMENT_COMPLETED", {
      entityId,
      previousValue: checkResult.value?.value,
      previousRatio: checkResult.value?.ratio,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Simulate async work for stub implementations
   */
  private async simulateWork(minMs: number, maxMs: number): Promise<void> {
    const duration = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Check if processing should pause based on load tier
   */
  private shouldPause(tier: LoadTier): boolean {
    return tier === "yellow" || tier === "red";
  }

  /**
   * Pause all background job processing
   */
  private pauseProcessing(tier: LoadTier): void {
    if (this.isPaused) return;

    this.isPaused = true;
    this.pauseReason = `Load tier is ${tier.toUpperCase()} - background jobs paused`;
    this.metrics.isPaused = true;
    this.metrics.pauseReason = this.pauseReason;
    this.metrics.totalPaused++;

    for (const jobId of this.processingJobs) {
      const job = this.jobQueue.get(jobId);
      if (job) {
        job.status = "paused";
      }
    }

    logger.warn("Background processing PAUSED", {
      tier,
      reason: this.pauseReason,
      queueSize: this.jobQueue.size,
      processingCount: this.processingJobs.size,
    });

    logger.audit("PROCESSING_PAUSED", {
      tier,
      reason: this.pauseReason,
      queueSize: this.jobQueue.size,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Resume background job processing
   */
  private resumeProcessing(): void {
    if (!this.isPaused) return;

    const previousReason = this.pauseReason;
    this.isPaused = false;
    this.pauseReason = undefined;
    this.metrics.isPaused = false;
    this.metrics.pauseReason = undefined;

    for (const jobId of this.processingJobs) {
      const job = this.jobQueue.get(jobId);
      if (job?.status === "paused") {
        job.status = "pending";
      }
    }
    this.processingJobs.clear();

    logger.info("Background processing RESUMED", {
      previousReason,
      queueSize: this.jobQueue.size,
    });

    logger.audit("PROCESSING_RESUMED", {
      previousReason,
      queueSize: this.jobQueue.size,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get pending jobs sorted by priority
   */
  private getPendingJobs(limit: number): BackgroundJob[] {
    const pending: BackgroundJob[] = [];

    for (const job of this.jobQueue.values()) {
      if (job.status === "pending") {
        pending.push(job);
      }
    }

    pending.sort((a, b) => {
      const priorityOrder = { medium: 0, low: 1 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return pending.slice(0, limit);
  }

  /**
   * Start automatic processing loop
   */
  start(): void {
    if (this.isRunning) {
      logger.warn("Scheduler already running");
      return;
    }

    this.isRunning = true;

    this.processingTimer = setInterval(async () => {
      if (!this.isRunning) return;
      await this.processBackgroundJobs();
    }, this.config.processingIntervalMs);

    this.pauseCheckTimer = setInterval(() => {
      if (!this.isRunning) return;
      const loadTierManager = getLoadTierManager();
      const tier = loadTierManager.getLoadTier();

      if (this.shouldPause(tier) && !this.isPaused) {
        this.pauseProcessing(tier);
      } else if (!this.shouldPause(tier) && this.isPaused) {
        this.resumeProcessing();
      }
    }, this.config.pauseCheckIntervalMs);

    logger.info("Background Scheduler started", {
      processingIntervalMs: this.config.processingIntervalMs,
    });
  }

  /**
   * Stop automatic processing loop
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
    }

    if (this.pauseCheckTimer) {
      clearInterval(this.pauseCheckTimer);
      this.pauseCheckTimer = undefined;
    }

    logger.info("Background Scheduler stopped");
  }

  /**
   * Update queue metrics
   */
  private updateQueueMetrics(): void {
    this.metrics.currentQueueSize = this.jobQueue.size;
    this.metrics.processingCount = this.processingJobs.size;
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(): void {
    if (this.processedCount > 0) {
      this.metrics.averageProcessingTimeMs = this.totalProcessingTimeMs / this.processedCount;
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `bg-job-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get scheduler metrics
   */
  getMetrics(): SchedulerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): BackgroundJob | undefined {
    return this.jobQueue.get(jobId);
  }

  /**
   * Get all pending jobs
   */
  getPendingJobsList(): BackgroundJob[] {
    return Array.from(this.jobQueue.values()).filter(job => job.status === "pending");
  }

  /**
   * Cancel a pending job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobQueue.get(jobId);
    if (!job) return false;

    if (job.status === "processing") {
      logger.warn("Cannot cancel job in processing state", { jobId });
      return false;
    }

    this.jobQueue.delete(jobId);
    this.updateQueueMetrics();

    logger.info("Job cancelled", { jobId, type: job.type });
    return true;
  }

  /**
   * Clear all pending jobs
   */
  clearQueue(): number {
    const pendingCount = this.getPendingJobsList().length;

    for (const [jobId, job] of this.jobQueue) {
      if (job.status === "pending") {
        this.jobQueue.delete(jobId);
      }
    }

    this.updateQueueMetrics();
    logger.info("Queue cleared", { clearedCount: pendingCount });

    return pendingCount;
  }

  /**
   * Check if scheduler is paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Check if scheduler is running
   */
  isRunningState(): boolean {
    return this.isRunning;
  }
}

let schedulerInstance: BackgroundScheduler | null = null;

export function getBackgroundScheduler(): BackgroundScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new BackgroundScheduler();
  }
  return schedulerInstance;
}

export function initBackgroundScheduler(config?: Partial<SchedulerConfig>): BackgroundScheduler {
  schedulerInstance = new BackgroundScheduler(config);
  return schedulerInstance;
}

export function resetBackgroundScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
  schedulerInstance = null;
}

export function scheduleBackgroundJob(
  type: BackgroundJobType,
  entityId: string,
  priority: BackgroundJobPriority = "low"
): string {
  return getBackgroundScheduler().scheduleBackgroundJob(type, entityId, priority);
}

export async function processBackgroundJobs(): Promise<JobResult[]> {
  return getBackgroundScheduler().processBackgroundJobs();
}

export function getSchedulerMetrics(): SchedulerMetrics {
  return getBackgroundScheduler().getMetrics();
}
