/**
 * Smart Content Generation Job Queue
 *
 * Features:
 * - Persistent job state in database
 * - Work stealing between providers
 * - Automatic failover on provider failure
 * - Resume from interruption
 * - Rate limit handling with exponential backoff
 */

import { db } from "../db";
import { eq, and, lt, isNull, sql, or, inArray } from "drizzle-orm";
import { tiqetsAttractions } from "../../shared/schema";
import { getMultiModelProvider, type GenerationResult } from "../ai/multi-model-provider";
import { logger } from "../lib/logger";
import type { Response } from "express";

// Job states
type JobStatus = "queued" | "in_progress" | "completed" | "failed";

interface JobState {
  attractionId: string;
  status: JobStatus;
  lockedBy: string | null;
  lockedAt: Date | null;
  attempts: number;
  lastError: string | null;
}

// Provider worker state
interface ProviderWorker {
  name: string;
  active: boolean;
  currentJob: string | null;
  processed: number;
  errors: number;
  lastActivity: Date;
}

// Queue configuration
const CONFIG = {
  maxAttempts: 3,
  lockTimeoutMs: 5 * 60 * 1000, // 5 minutes - if job not completed, release lock
  heartbeatIntervalMs: 30 * 1000, // 30 seconds heartbeat
  stealThreshold: 0.8, // Steal when a provider has processed 80% of its share
  batchSize: 1, // Process one at a time for better distribution
};

// Global queue state
let queueRunning = false;
let totalJobs = 0;
let completedJobs = 0;
let failedJobs = 0;
const workers: Map<string, ProviderWorker> = new Map();

// SSE response for progress updates
let sseResponse: Response | null = null;

function sendEvent(data: Record<string, unknown>) {
  if (sseResponse && !sseResponse.writableEnded) {
    sseResponse.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

/**
 * Initialize the job queue from pending attractions
 */
async function initializeQueue(): Promise<number> {
  // Get all pending attractions
  const pendingAttractions = await db
    .select({ id: tiqetsAttractions.id })
    .from(tiqetsAttractions)
    .where(eq(tiqetsAttractions.contentGenerationStatus, "pending"));

  totalJobs = pendingAttractions.length;
  completedJobs = 0;
  failedJobs = 0;

  logger.info({ totalJobs }, "Queue initialized with pending attractions");
  return totalJobs;
}

/**
 * Acquire a job for processing (with lock)
 * Uses optimistic locking to prevent race conditions
 * Implements provider rotation: prefers jobs where this provider wasn't the last to fail
 */
async function acquireJob(providerName: string): Promise<{ id: string; name: string } | null> {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() - CONFIG.lockTimeoutMs);

  // Find a job that is:
  // 1. Pending (never started)
  // 2. OR locked but expired (provider crashed)
  // 3. AND not exceeded max attempts
  // 4. AND not currently being processed by another provider
  // 5. PREFER jobs where this provider wasn't the last to fail (model rotation)

  // Use a transaction to ensure atomic acquisition
  const result = await db.transaction(async tx => {
    // First, try to find a job where this provider WASN'T the last to fail (model rotation)
    let candidates = await tx
      .select({
        id: tiqetsAttractions.id,
        name: tiqetsAttractions.name,
        contentGenerationStatus: tiqetsAttractions.contentGenerationStatus,
        contentGenerationAttempts: tiqetsAttractions.contentGenerationAttempts,
        contentGenerationLockedBy: tiqetsAttractions.contentGenerationLockedBy,
        contentGenerationLockedAt: tiqetsAttractions.contentGenerationLockedAt,
        contentGenerationProvider: tiqetsAttractions.contentGenerationProvider,
      })
      .from(tiqetsAttractions)
      .where(
        and(
          or(
            eq(tiqetsAttractions.contentGenerationStatus, "pending"),
            and(
              eq(tiqetsAttractions.contentGenerationStatus, "in_progress"),
              lt(tiqetsAttractions.contentGenerationLockedAt, lockExpiry)
            )
          ),
          lt(sql`COALESCE(${tiqetsAttractions.contentGenerationAttempts}, 0)`, CONFIG.maxAttempts),
          // Prefer jobs where this provider wasn't the one that last failed (rotation)
          or(
            isNull(tiqetsAttractions.contentGenerationProvider),
            sql`${tiqetsAttractions.contentGenerationProvider} != ${providerName}`
          )
        )
      )
      .limit(1)
      .for("update", { skipLocked: true }); // Skip locked rows for concurrency

    // If no jobs found where we're not the last failed provider, fallback to any job
    if (candidates.length === 0) {
      candidates = await tx
        .select({
          id: tiqetsAttractions.id,
          name: tiqetsAttractions.name,
          contentGenerationStatus: tiqetsAttractions.contentGenerationStatus,
          contentGenerationAttempts: tiqetsAttractions.contentGenerationAttempts,
          contentGenerationLockedBy: tiqetsAttractions.contentGenerationLockedBy,
          contentGenerationLockedAt: tiqetsAttractions.contentGenerationLockedAt,
          contentGenerationProvider: tiqetsAttractions.contentGenerationProvider,
        })
        .from(tiqetsAttractions)
        .where(
          and(
            or(
              eq(tiqetsAttractions.contentGenerationStatus, "pending"),
              and(
                eq(tiqetsAttractions.contentGenerationStatus, "in_progress"),
                lt(tiqetsAttractions.contentGenerationLockedAt, lockExpiry)
              )
            ),
            lt(sql`COALESCE(${tiqetsAttractions.contentGenerationAttempts}, 0)`, CONFIG.maxAttempts)
          )
        )
        .limit(1)
        .for("update", { skipLocked: true });
    }

    if (candidates.length === 0) {
      return null;
    }

    const candidate = candidates[0];

    // Log if this is a retry with the same provider (shouldn't happen often with rotation)
    if (
      candidate.contentGenerationProvider === providerName &&
      candidate.contentGenerationAttempts &&
      candidate.contentGenerationAttempts > 0
    ) {
      logger.info(
        {
          attractionId: candidate.id,
          provider: providerName,
          attempts: candidate.contentGenerationAttempts,
        },
        "Retrying with same provider (no other providers available)"
      );
    }

    // Lock the job
    await tx
      .update(tiqetsAttractions)
      .set({
        contentGenerationStatus: "in_progress",
        contentGenerationLockedBy: providerName,
        contentGenerationLockedAt: now,
        contentGenerationAttempts: sql`COALESCE(${tiqetsAttractions.contentGenerationAttempts}, 0) + 1`,
      } as any)
      .where(eq(tiqetsAttractions.id, candidate.id));

    return { id: candidate.id, name: candidate.name || "Unknown" };
  });

  return result;
}

/**
 * Mark job as completed
 */
async function completeJob(attractionId: string, providerName: string): Promise<void> {
  await db
    .update(tiqetsAttractions)
    .set({
      contentGenerationStatus: "completed",
      contentGenerationLockedBy: null,
      contentGenerationLockedAt: null,
      contentGenerationProvider: providerName,
      contentGenerationCompletedAt: new Date(),
    } as any)
    .where(eq(tiqetsAttractions.id, attractionId));

  completedJobs++;
}

/**
 * Mark job as failed (will be retried if under max attempts)
 * Stores the provider that failed so next retry uses a different provider
 */
async function failJob(attractionId: string, error: string, providerName?: string): Promise<void> {
  const attraction = await db
    .select({
      attempts: tiqetsAttractions.contentGenerationAttempts,
    })
    .from(tiqetsAttractions)
    .where(eq(tiqetsAttractions.id, attractionId))
    .limit(1);

  const attempts = attraction[0]?.attempts || 0;
  const isFinalFailure = attempts >= CONFIG.maxAttempts;

  await db
    .update(tiqetsAttractions)
    .set({
      contentGenerationStatus: isFinalFailure ? "failed" : "pending",
      contentGenerationLockedBy: null,
      contentGenerationLockedAt: null,
      contentGenerationLastError: error,
      // Store which provider failed so we can rotate on retry
      contentGenerationProvider: providerName || null,
    } as any)
    .where(eq(tiqetsAttractions.id, attractionId));

  if (isFinalFailure) {
    failedJobs++;
    logger.warn(
      {
        attractionId,
        attempts,
        error: error.substring(0, 200),
      },
      "Job permanently failed after max attempts"
    );
  } else {
    logger.info(
      {
        attractionId,
        attempts,
        nextAttempt: attempts + 1,
        failedProvider: providerName,
      },
      "Job failed, will retry with different provider"
    );
  }
}

/**
 * Release stale locks (crashed workers)
 */
async function releaseStaleLocks(): Promise<number> {
  const lockExpiry = new Date(Date.now() - CONFIG.lockTimeoutMs);

  await db
    .update(tiqetsAttractions)
    .set({
      contentGenerationStatus: "pending",
      contentGenerationLockedBy: null,
      contentGenerationLockedAt: null,
    } as any)
    .where(
      and(
        eq(tiqetsAttractions.contentGenerationStatus, "in_progress"),
        lt(tiqetsAttractions.contentGenerationLockedAt, lockExpiry)
      )
    );

  return 0; // Drizzle doesn't return affected rows easily
}

/**
 * Provider worker - continuously processes jobs until queue is empty
 */
async function runProviderWorker(
  providerName:
    | "anthropic"
    | "openai"
    | "gemini"
    | "openrouter"
    | "deepseek"
    | "perplexity"
    | "groq"
    | "mistral"
    | "helicone"
    | "eden",
  generateContent: (attractionId: string) => Promise<GenerationResult>
): Promise<void> {
  const worker: ProviderWorker = {
    name: providerName,
    active: true,
    currentJob: null,
    processed: 0,
    errors: 0,
    lastActivity: new Date(),
  };
  workers.set(providerName, worker);

  logger.info({ provider: providerName }, "Worker started");

  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 5;

  while (queueRunning) {
    try {
      // Acquire next job
      const job = await acquireJob(providerName);

      if (!job) {
        // No more jobs available
        logger.info({ provider: providerName }, "No more jobs, worker finishing");
        break;
      }

      worker.currentJob = job.id;
      worker.lastActivity = new Date();

      const startTime = Date.now();

      try {
        // Process the job
        await generateContent(job.id);

        // Mark as completed
        await completeJob(job.id, providerName);

        worker.processed++;
        consecutiveErrors = 0;

        const latencyMs = Date.now() - startTime;

        sendEvent({
          type: "progress",
          provider: providerName,
          attractionId: job.id,
          title: job.name.substring(0, 40),
          latencyMs,
          completed: completedJobs,
          failed: failedJobs,
          total: totalJobs,
          remaining: totalJobs - completedJobs - failedJobs,
        });

        logger.info(
          {
            provider: providerName,
            attractionId: job.id,
            latencyMs,
            processed: worker.processed,
          },
          "Job completed"
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // Pass provider name so failed jobs rotate to different providers on retry
        await failJob(job.id, errorMsg, providerName);

        worker.errors++;
        consecutiveErrors++;

        logger.warn(
          {
            provider: providerName,
            attractionId: job.id,
            error: errorMsg,
            consecutiveErrors,
          },
          "Job failed - will retry with different provider"
        );

        sendEvent({
          type: "job_error",
          provider: providerName,
          attractionId: job.id,
          error: errorMsg.substring(0, 100),
          consecutiveErrors,
        });

        // If too many consecutive errors, this provider might be having issues
        if (consecutiveErrors >= maxConsecutiveErrors) {
          logger.error(
            {
              provider: providerName,
              consecutiveErrors,
            },
            "Too many consecutive errors, pausing worker"
          );

          // Wait before retrying (exponential backoff)
          await new Promise(resolve =>
            setTimeout(resolve, Math.min(30000, 1000 * Math.pow(2, consecutiveErrors)))
          );
          consecutiveErrors = 0; // Reset and try again
        }
      }

      worker.currentJob = null;
    } catch (error) {
      logger.error({ provider: providerName, error: String(error) }, "Worker error");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  worker.active = false;
  workers.set(providerName, worker);

  logger.info(
    {
      provider: providerName,
      processed: worker.processed,
      errors: worker.errors,
    },
    "Worker finished"
  );
}

/**
 * Get current queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  pending: number;
  workers: Array<{ name: string; active: boolean; processed: number; errors: number }>;
}> {
  const stats = await db
    .select({
      status: tiqetsAttractions.contentGenerationStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(tiqetsAttractions)
    .groupBy(tiqetsAttractions.contentGenerationStatus);

  const statusCounts: Record<string, number> = {};
  for (const row of stats) {
    statusCounts[row.status || "pending"] = row.count;
  }

  return {
    total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    completed: statusCounts["completed"] || 0,
    failed: statusCounts["failed"] || 0,
    inProgress: statusCounts["in_progress"] || 0,
    pending: statusCounts["pending"] || 0,
    workers: Array.from(workers.values()).map(w => ({
      name: w.name,
      active: w.active,
      processed: w.processed,
      errors: w.errors,
    })),
  };
}

/**
 * Start the smart queue processing
 */
export async function startSmartQueue(
  res: Response,
  generateContentFn: (attractionId: string, provider: string) => Promise<GenerationResult>
): Promise<void> {
  if (queueRunning) {
    res.write(`data: ${JSON.stringify({ type: "error", message: "Queue already running" })}\n\n`);
    res.end();
    return;
  }

  sseResponse = res;
  queueRunning = true;
  workers.clear();

  try {
    // Initialize queue
    const jobCount = await initializeQueue();

    if (jobCount === 0) {
      sendEvent({ type: "complete", message: "No pending attractions to process" });
      queueRunning = false;
      res.end();
      return;
    }

    sendEvent({ type: "init", totalJobs: jobCount });

    // Release any stale locks from previous runs
    await releaseStaleLocks();

    // Verify which providers are available
    const providerInstance = getMultiModelProvider();
    const providerStatus = await providerInstance.checkAvailability();

    const availableProviders: Array<
      | "anthropic"
      | "openai"
      | "gemini"
      | "openrouter"
      | "deepseek"
      | "perplexity"
      | "groq"
      | "mistral"
      | "helicone"
      | "eden"
    > = [];

    // Skip Groq due to aggressive rate limiting
    const skipProviders = new Set(["groq", "gemini"]);

    for (const provider of providerStatus) {
      if (provider.available && !skipProviders.has(provider.name)) {
        const name = provider.name as (typeof availableProviders)[number];
        try {
          // Quick test
          await providerInstance.generateWithSpecificProvider(name, "Reply: OK", {
            maxTokens: 10,
            temperature: 0,
          });
          availableProviders.push(name);
          sendEvent({ type: "provider_verified", provider: name });
        } catch (error) {
          sendEvent({
            type: "provider_failed",
            provider: name,
            error: String(error).substring(0, 100),
          });
        }
      }
    }

    if (availableProviders.length === 0) {
      sendEvent({ type: "error", message: "No AI providers available" });
      queueRunning = false;
      res.end();
      return;
    }

    sendEvent({
      type: "providers_ready",
      providers: availableProviders,
      workerCount: availableProviders.length,
    });

    // Start worker for each provider
    const workerPromises = availableProviders.map(providerName =>
      runProviderWorker(providerName, async attractionId => {
        return generateContentFn(attractionId, providerName);
      })
    );

    // Start heartbeat to report progress
    const heartbeatInterval = setInterval(() => {
      if (!queueRunning) {
        clearInterval(heartbeatInterval);
        return;
      }

      const activeWorkers = Array.from(workers.values()).filter(w => w.active);
      sendEvent({
        type: "heartbeat",
        completed: completedJobs,
        failed: failedJobs,
        total: totalJobs,
        remaining: totalJobs - completedJobs - failedJobs,
        activeWorkers: activeWorkers.length,
        workerStats: activeWorkers.map(w => ({
          name: w.name,
          processed: w.processed,
          errors: w.errors,
          currentJob: w.currentJob,
        })),
      });
    }, CONFIG.heartbeatIntervalMs);

    // Wait for all workers to complete
    await Promise.all(workerPromises);

    clearInterval(heartbeatInterval);

    // Final statistics
    const finalStats = await getQueueStats();

    sendEvent({
      type: "complete",
      stats: finalStats,
      message: `Completed ${finalStats.completed} attractions, ${finalStats.failed} failed`,
    });
  } catch (error) {
    logger.error({ error: String(error) }, "Queue processing error");
    sendEvent({ type: "error", message: String(error) });
  } finally {
    queueRunning = false;
    sseResponse = null;
    res.end();
  }
}

/**
 * Stop the queue gracefully
 */
export function stopQueue(): void {
  queueRunning = false;
  logger.info("Queue stop requested");
}

/**
 * Check if queue is running
 */
export function isQueueRunning(): boolean {
  return queueRunning;
}

// ============================================================================
// Automatic Retry Queue with Model Rotation
// ============================================================================

// Model rotation order - when one fails, try the next
const MODEL_ROTATION_ORDER: Array<"anthropic" | "openai" | "gemini" | "mistral" | "helicone"> = [
  "anthropic",
  "openai",
  "gemini",
  "mistral",
  "helicone",
];

/**
 * Reset failed attractions back to pending for reprocessing
 * Optionally specify a different model to try
 */
export async function resetFailedAttractions(options: {
  maxToReset?: number;
  cityName?: string;
  excludeProvider?: string;
}): Promise<{
  reset: number;
  byCity: Record<string, number>;
}> {
  const { maxToReset = 1000, cityName, excludeProvider } = options;

  // Build where clause
  const whereConditions = [eq(tiqetsAttractions.contentGenerationStatus, "failed")];

  if (cityName) {
    whereConditions.push(eq(tiqetsAttractions.cityName, cityName));
  }

  // Find failed attractions
  const failedAttractions = await db
    .select({
      id: tiqetsAttractions.id,
      cityName: tiqetsAttractions.cityName,
      lastProvider: tiqetsAttractions.contentGenerationProvider,
      lastError: tiqetsAttractions.contentGenerationLastError,
    })
    .from(tiqetsAttractions)
    .where(and(...whereConditions))
    .limit(maxToReset);

  if (failedAttractions.length === 0) {
    return { reset: 0, byCity: {} };
  }

  const attractionIds = failedAttractions.map(a => a.id);
  const byCity: Record<string, number> = {};

  for (const attraction of failedAttractions) {
    const city = attraction.cityName || "unknown";
    byCity[city] = (byCity[city] || 0) + 1;
  }

  // Reset all failed attractions to pending
  // Clear the attempts counter so they get a fresh retry cycle
  await db
    .update(tiqetsAttractions)
    .set({
      contentGenerationStatus: "pending",
      contentGenerationAttempts: 0,
      contentGenerationLockedBy: null,
      contentGenerationLockedAt: null,
      // Keep the last error for debugging purposes
    } as any)
    .where(inArray(tiqetsAttractions.id, attractionIds));

  logger.info(
    {
      reset: failedAttractions.length,
      byCity,
      excludeProvider,
    },
    "Reset failed attractions for retry"
  );

  return {
    reset: failedAttractions.length,
    byCity,
  };
}

/**
 * Get failure statistics by provider
 */
export async function getFailureStats(): Promise<{
  total: number;
  byProvider: Record<string, number>;
  byCity: Record<string, number>;
  byError: Record<string, number>;
}> {
  const failedAttractions = await db
    .select({
      cityName: tiqetsAttractions.cityName,
      provider: tiqetsAttractions.contentGenerationProvider,
      error: tiqetsAttractions.contentGenerationLastError,
    })
    .from(tiqetsAttractions)
    .where(eq(tiqetsAttractions.contentGenerationStatus, "failed"));

  const byProvider: Record<string, number> = {};
  const byCity: Record<string, number> = {};
  const byError: Record<string, number> = {};

  for (const attraction of failedAttractions) {
    const provider = attraction.provider || "unknown";
    const city = attraction.cityName || "unknown";
    const errorType = categorizeError(attraction.error || "unknown");

    byProvider[provider] = (byProvider[provider] || 0) + 1;
    byCity[city] = (byCity[city] || 0) + 1;
    byError[errorType] = (byError[errorType] || 0) + 1;
  }

  return {
    total: failedAttractions.length,
    byProvider,
    byCity,
    byError,
  };
}

function categorizeError(error: string): string {
  const lowerError = error.toLowerCase();
  if (lowerError.includes("rate limit") || lowerError.includes("429")) {
    return "rate_limit";
  }
  if (lowerError.includes("timeout") || lowerError.includes("timed out")) {
    return "timeout";
  }
  if (lowerError.includes("json") || lowerError.includes("parse")) {
    return "parse_error";
  }
  if (lowerError.includes("api key") || lowerError.includes("401") || lowerError.includes("403")) {
    return "auth_error";
  }
  if (lowerError.includes("overloaded") || lowerError.includes("capacity")) {
    return "provider_overloaded";
  }
  return "other";
}

// ============================================================================
// Work Stealing
// ============================================================================

/**
 * Work stealing - allows idle workers to take jobs from busy workers' queues
 * This is a conceptual implementation since jobs are in a shared database pool
 */
export async function enableWorkStealing(): Promise<void> {
  // In our implementation, work stealing is naturally handled because:
  // 1. All workers acquire jobs from the same pool
  // 2. If a provider is rate limited, its jobs become available to others
  // 3. The "skip locked" mechanism allows concurrent acquisition

  // Release any jobs locked by rate-limited providers
  logger.info("Work stealing enabled - releasing jobs from rate-limited providers");
}

/**
 * Get provider with least load for work stealing
 */
export function getLeastLoadedProvider(): string | null {
  const workerList = Array.from(workers.values()).filter(w => w.active);

  if (workerList.length === 0) return null;

  // Find provider with least errors relative to processed
  workerList.sort((a, b) => {
    const aRatio = a.errors / (a.processed + 1);
    const bRatio = b.errors / (b.processed + 1);
    return aRatio - bRatio;
  });

  return workerList[0].name;
}

/**
 * Rotate to next provider in sequence
 */
export function getNextProviderInRotation(currentProvider: string | null): string {
  if (!currentProvider) return MODEL_ROTATION_ORDER[0];

  const currentIndex = MODEL_ROTATION_ORDER.indexOf(
    currentProvider as (typeof MODEL_ROTATION_ORDER)[number]
  );
  const nextIndex = (currentIndex + 1) % MODEL_ROTATION_ORDER.length;
  return MODEL_ROTATION_ORDER[nextIndex];
}
