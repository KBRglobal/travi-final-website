/**
 * Octopus Queue Manager
 * PostgreSQL-backed queue with per-stage concurrency limits,
 * exponential backoff retry (1s→60s max), and pause/resume on rate limits
 */

import { db } from '../db';
import { octopusJobs, octopusJobRuns } from '@shared/schema';
import { eq, and, inArray, sql, lt, isNull, desc, asc } from 'drizzle-orm';
import { log } from '../lib/logger';

const queueLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Queue] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[Queue] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[Queue] ${msg}`, data),
};

// ============================================================================
// Types
// ============================================================================

export type QueueStage = 
  | 'parse'
  | 'extract' 
  | 'enrich_maps'
  | 'enrich_web'
  | 'generate'
  | 'validate'
  | 'translate';

export interface QueueTask {
  id: string;
  jobId: string;
  stage: QueueStage;
  priority: number;
  retryCount: number;
  nextRetryAt: Date | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  payload: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ConcurrencyConfig {
  parse: number;
  extract: number;
  enrich_maps: number;
  enrich_web: number;
  generate: number;
  validate: number;
  translate: number;
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  paused: number;
  byStage: Record<QueueStage, { pending: number; running: number }>;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONCURRENCY: ConcurrencyConfig = {
  parse: 3,
  extract: 2,
  enrich_maps: 1,     // Rate-limited API
  enrich_web: 2,
  generate: 3,        // AI calls
  validate: 5,
  translate: 2,       // Translation API
};

const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};

// ============================================================================
// State
// ============================================================================

let concurrencyLimits = { ...DEFAULT_CONCURRENCY };
let isPaused = false;
let pauseReason: string | null = null;
let pausedUntil: Date | null = null;
let isRunning = false;
let pollIntervalMs = 1000;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

// In-memory tracking of running tasks per stage
const runningTasks: Map<QueueStage, Set<string>> = new Map();
const STAGES: QueueStage[] = ['parse', 'extract', 'enrich_maps', 'enrich_web', 'generate', 'validate', 'translate'];

for (const stage of STAGES) {
  runningTasks.set(stage, new Set());
}

// Task handlers
const stageHandlers: Map<QueueStage, (task: QueueTask) => Promise<void>> = new Map();

// ============================================================================
// Queue Operations
// ============================================================================

/**
 * Enqueue a new task
 */
export async function enqueue(
  jobId: string,
  stage: QueueStage,
  payload: Record<string, unknown>,
  priority: number = 0
): Promise<string> {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  await db.insert(octopusJobRuns).values({
    id: taskId,
    jobId,
    stage,
    status: 'pending',
    priority,
    retryCount: 0,
    nextRetryAt: null,
    inputData: payload,
    createdAt: new Date(),
  } as any);
  
  queueLogger.info('Task enqueued', { taskId, jobId, stage, priority });
  return taskId;
}

/**
 * Enqueue multiple tasks atomically
 */
export async function enqueueBatch(
  tasks: Array<{
    jobId: string;
    stage: QueueStage;
    payload: Record<string, unknown>;
    priority?: number;
  }>
): Promise<string[]> {
  const taskIds: string[] = [];
  
  const values = tasks.map(task => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    taskIds.push(taskId);
    return {
      id: taskId,
      jobId: task.jobId,
      stage: task.stage,
      status: 'pending' as const,
      priority: task.priority ?? 0,
      retryCount: 0,
      nextRetryAt: null,
      inputData: task.payload,
      createdAt: new Date(),
    };
  });
  
  if (values.length > 0) {
    await db.insert(octopusJobRuns).values(values);
  }
  
  queueLogger.info('Batch enqueued', { count: taskIds.length });
  return taskIds;
}

/**
 * Get next available tasks respecting concurrency limits
 */
export async function getNextTasks(): Promise<QueueTask[]> {
  if (isPaused) {
    if (pausedUntil && new Date() > pausedUntil) {
      resume();
    } else {
      return [];
    }
  }
  
  const tasks: QueueTask[] = [];
  
  for (const stage of STAGES) {
    const runningCount = runningTasks.get(stage)?.size ?? 0;
    const limit = concurrencyLimits[stage];
    const available = limit - runningCount;
    
    if (available <= 0) continue;
    
    const pendingTasks = await db
      .select()
      .from(octopusJobRuns)
      .where(and(
        eq(octopusJobRuns.stage, stage),
        eq(octopusJobRuns.status, 'pending'),
        sql`(${octopusJobRuns.nextRetryAt} IS NULL OR ${octopusJobRuns.nextRetryAt} <= NOW())`
      ))
      .orderBy(desc(octopusJobRuns.priority), asc(octopusJobRuns.createdAt))
      .limit(available);
    
    for (const row of pendingTasks) {
      tasks.push({
        id: row.id,
        jobId: row.jobId,
        stage: row.stage as QueueStage,
        priority: row.priority ?? 0,
        retryCount: row.retryCount ?? 0,
        nextRetryAt: row.nextRetryAt,
        status: row.status as QueueTask['status'],
        payload: (row.inputData ?? {}) as Record<string, unknown>,
        error: row.error ?? undefined,
        createdAt: row.createdAt ?? new Date(),
        startedAt: row.startedAt ?? undefined,
        completedAt: row.completedAt ?? undefined,
      });
    }
  }
  
  return tasks;
}

/**
 * Mark task as running
 */
export async function markRunning(taskId: string, stage: QueueStage): Promise<void> {
  await db
    .update(octopusJobRuns)
    .set({
      status: 'running',
      startedAt: new Date(),
    } as any)
    .where(eq(octopusJobRuns.id, taskId));
  
  runningTasks.get(stage)?.add(taskId);
}

/**
 * Mark task as completed
 */
export async function markCompleted(
  taskId: string,
  stage: QueueStage,
  result?: Record<string, unknown>
): Promise<void> {
  const task = await db
    .select({ startedAt: octopusJobRuns.startedAt })
    .from(octopusJobRuns)
    .where(eq(octopusJobRuns.id, taskId))
    .limit(1);
  
  const now = new Date();
  const startedAt = task[0]?.startedAt;
  const durationMs = startedAt ? now.getTime() - new Date(startedAt).getTime() : null;
  
  await db
    .update(octopusJobRuns)
    .set({
      status: 'completed',
      completedAt: now,
      finishedAt: now,
      durationMs,
      outputData: result ?? null,
    } as any)
    .where(eq(octopusJobRuns.id, taskId));
  
  runningTasks.get(stage)?.delete(taskId);
  queueLogger.info('Task completed', { taskId, stage, durationMs });
}

/**
 * Mark task as failed with retry logic
 */
export async function markFailed(
  taskId: string,
  stage: QueueStage,
  error: string,
  isRateLimited: boolean = false
): Promise<void> {
  runningTasks.get(stage)?.delete(taskId);
  
  const task = await db
    .select()
    .from(octopusJobRuns)
    .where(eq(octopusJobRuns.id, taskId))
    .limit(1);
  
  if (!task.length) return;
  
  const currentRetries = task[0].retryCount ?? 0;
  const newRetryCount = currentRetries + 1;
  
  if (isRateLimited) {
    pause('Rate limit detected', 30000);
  }
  
  if (newRetryCount > RETRY_CONFIG.maxRetries) {
    const now = new Date();
    const startedAt = task[0]?.startedAt;
    const durationMs = startedAt ? now.getTime() - new Date(startedAt).getTime() : null;
    
    await db
      .update(octopusJobRuns)
      .set({
        status: 'failed',
        error,
        completedAt: now,
        finishedAt: now,
        durationMs,
        retryCount: newRetryCount,
      } as any)
      .where(eq(octopusJobRuns.id, taskId));
    
    queueLogger.error('Task failed permanently', { taskId, stage, error, retries: newRetryCount });
  } else {
    const delayMs = calculateBackoff(newRetryCount);
    const nextRetryAt = new Date(Date.now() + delayMs);
    
    await db
      .update(octopusJobRuns)
      .set({
        status: 'pending',
        error,
        retryCount: newRetryCount,
        nextRetryAt,
      } as any)
      .where(eq(octopusJobRuns.id, taskId));
    
    queueLogger.warn('Task scheduled for retry', { 
      taskId, 
      stage, 
      error, 
      retryCount: newRetryCount,
      nextRetryAt: nextRetryAt.toISOString(),
      delayMs 
    });
  }
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(retryCount: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

// ============================================================================
// Pause/Resume Controls
// ============================================================================

/**
 * Pause queue processing
 */
export function pause(reason: string, durationMs?: number): void {
  isPaused = true;
  pauseReason = reason;
  pausedUntil = durationMs ? new Date(Date.now() + durationMs) : null;
  
  queueLogger.warn('Queue paused', { 
    reason, 
    duration: durationMs,
    resumeAt: pausedUntil?.toISOString() 
  });
}

/**
 * Resume queue processing
 */
export function resume(): void {
  isPaused = false;
  pauseReason = null;
  pausedUntil = null;
  
  queueLogger.info('Queue resumed');
}

/**
 * Get pause status
 */
export function getPauseStatus(): { isPaused: boolean; reason: string | null; resumeAt: Date | null } {
  return {
    isPaused,
    reason: pauseReason,
    resumeAt: pausedUntil,
  };
}

// ============================================================================
// Concurrency Management
// ============================================================================

/**
 * Update concurrency limits
 */
export function setConcurrencyLimits(limits: Partial<ConcurrencyConfig>): void {
  concurrencyLimits = { ...concurrencyLimits, ...limits };
  queueLogger.info('Concurrency limits updated', { limits: concurrencyLimits });
}

/**
 * Get current concurrency limits
 */
export function getConcurrencyLimits(): ConcurrencyConfig {
  return { ...concurrencyLimits };
}

/**
 * Get current running counts per stage
 */
export function getRunningCounts(): Record<QueueStage, number> {
  const counts: Record<string, number> = {};
  for (const stage of STAGES) {
    counts[stage] = runningTasks.get(stage)?.size ?? 0;
  }
  return counts as Record<QueueStage, number>;
}

// ============================================================================
// Stage Handlers
// ============================================================================

/**
 * Register a handler for a stage
 */
export function registerHandler(
  stage: QueueStage,
  handler: (task: QueueTask) => Promise<void>
): void {
  stageHandlers.set(stage, handler);
  queueLogger.info('Handler registered', { stage });
}

/**
 * Process a single task
 */
async function processTask(task: QueueTask): Promise<void> {
  const handler = stageHandlers.get(task.stage);
  
  if (!handler) {
    await markFailed(task.id, task.stage, `No handler registered for stage: ${task.stage}`);
    return;
  }
  
  try {
    await markRunning(task.id, task.stage);
    await handler(task);
    await markCompleted(task.id, task.stage);
  } catch (error: any) {
    const isRateLimited = error.message?.includes('rate limit') || 
                          error.status === 429 ||
                          error.code === 'RATE_LIMITED';
    
    await markFailed(task.id, task.stage, error.message || 'Unknown error', isRateLimited);
  }
}

// ============================================================================
// Worker Loop
// ============================================================================

/**
 * Start the background worker loop
 */
export function startWorker(): void {
  if (isRunning) {
    queueLogger.warn('Worker already running');
    return;
  }
  
  isRunning = true;
  queueLogger.info('Queue worker started');
  
  poll();
}

/**
 * Stop the background worker loop
 */
export function stopWorker(): void {
  isRunning = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  queueLogger.info('Queue worker stopped');
}

/**
 * Check if worker is running
 */
export function isWorkerRunning(): boolean {
  return isRunning;
}

/**
 * Set poll interval
 */
export function setPollInterval(ms: number): void {
  pollIntervalMs = Math.max(100, ms);
}

let pollCount = 0;
let lastProcessedAt: Date | null = null;
const HEARTBEAT_INTERVAL_POLLS = 60; // Log heartbeat every 60 polls (~1 minute)

/**
 * Get worker heartbeat info
 */
export function getWorkerHeartbeat(): { lastProcessedAt: Date | null; pollCount: number; isRunning: boolean } {
  return { lastProcessedAt, pollCount, isRunning };
}

/**
 * Poll for and process tasks
 */
async function poll(): Promise<void> {
  if (!isRunning) return;
  
  pollCount++;
  
  try {
    const tasks = await getNextTasks();
    
    if (tasks.length > 0) {
      lastProcessedAt = new Date();
      await Promise.all(tasks.map(task => processTask(task)));
    }
    
    // Periodic heartbeat logging (every ~1 minute)
    if (pollCount % HEARTBEAT_INTERVAL_POLLS === 0) {
      const lastProcessedStr = lastProcessedAt ? lastProcessedAt.toISOString() : 'never';
      queueLogger.info(`[Worker] Heartbeat - last job processed: ${lastProcessedStr}`, {
        pollCount,
        isRunning,
        lastProcessedAt: lastProcessedStr,
      });
    }
    
  } catch (error: any) {
    queueLogger.error('Poll error', { error: error.message });
  }
  
  pollTimer = setTimeout(poll, pollIntervalMs);
}

// ============================================================================
// Stats & Monitoring
// ============================================================================

/**
 * Get queue statistics
 */
export async function getStats(): Promise<QueueStats> {
  const statusCounts = await db
    .select({
      status: octopusJobRuns.status,
      count: sql<number>`count(*)::int`,
    })
    .from(octopusJobRuns)
    .groupBy(octopusJobRuns.status);
  
  const stageCounts = await db
    .select({
      stage: octopusJobRuns.stage,
      status: octopusJobRuns.status,
      count: sql<number>`count(*)::int`,
    })
    .from(octopusJobRuns)
    .where(inArray(octopusJobRuns.status, ['pending', 'running']))
    .groupBy(octopusJobRuns.stage, octopusJobRuns.status);
  
  const stats: QueueStats = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    paused: 0,
    byStage: {} as Record<QueueStage, { pending: number; running: number }>,
  };
  
  for (const row of statusCounts) {
    const status = row.status as keyof typeof stats;
    if (status in stats && typeof stats[status] === 'number') {
      (stats[status] as number) = row.count;
    }
  }
  
  for (const stage of STAGES) {
    stats.byStage[stage] = { pending: 0, running: 0 };
  }
  
  for (const row of stageCounts) {
    const stage = row.stage as QueueStage;
    const status = row.status as 'pending' | 'running';
    if (stats.byStage[stage]) {
      stats.byStage[stage][status] = row.count;
    }
  }
  
  return stats;
}

/**
 * Get tasks for a specific job
 */
export async function getJobTasks(jobId: string): Promise<QueueTask[]> {
  const rows = await db
    .select()
    .from(octopusJobRuns)
    .where(eq(octopusJobRuns.jobId, jobId))
    .orderBy(asc(octopusJobRuns.createdAt));
  
  return rows.map(row => ({
    id: row.id,
    jobId: row.jobId,
    stage: row.stage as QueueStage,
    priority: row.priority ?? 0,
    retryCount: row.retryCount ?? 0,
    nextRetryAt: row.nextRetryAt,
    status: row.status as QueueTask['status'],
    payload: (row.inputData ?? {}) as Record<string, unknown>,
    error: row.error ?? undefined,
    createdAt: row.createdAt ?? new Date(),
    startedAt: row.startedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
  }));
}

/**
 * Cancel all pending tasks for a job
 */
export async function cancelJobTasks(jobId: string): Promise<number> {
  const result = await db
    .update(octopusJobRuns)
    .set({
      status: 'failed',
      error: 'Job cancelled',
      completedAt: new Date(),
    } as any)
    .where(and(
      eq(octopusJobRuns.jobId, jobId),
      inArray(octopusJobRuns.status, ['pending', 'paused'])
    ));
  
  queueLogger.info('Job tasks cancelled', { jobId });
  return 0;
}

/**
 * Retry all failed tasks for a job
 */
export async function retryJobTasks(jobId: string): Promise<number> {
  await db
    .update(octopusJobRuns)
    .set({
      status: 'pending',
      retryCount: 0,
      nextRetryAt: null,
      error: null,
    } as any)
    .where(and(
      eq(octopusJobRuns.jobId, jobId),
      eq(octopusJobRuns.status, 'failed')
    ));
  
  queueLogger.info('Job tasks reset for retry', { jobId });
  return 0;
}

/**
 * Clean up old completed/failed tasks
 */
export async function cleanup(olderThanDays: number = 7): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  
  await db
    .delete(octopusJobRuns)
    .where(and(
      inArray(octopusJobRuns.status, ['completed', 'failed']),
      lt(octopusJobRuns.completedAt!, cutoff)
    ));
  
  queueLogger.info('Cleaned up old tasks', { olderThanDays });
  return 0;
}

// ============================================================================
// Export Queue Manager API
// ============================================================================

export const QueueManager = {
  enqueue,
  enqueueBatch,
  getNextTasks,
  markRunning,
  markCompleted,
  markFailed,
  
  pause,
  resume,
  getPauseStatus,
  
  setConcurrencyLimits,
  getConcurrencyLimits,
  getRunningCounts,
  
  registerHandler,
  startWorker,
  stopWorker,
  isWorkerRunning,
  setPollInterval,
  getWorkerHeartbeat,
  
  getStats,
  getJobTasks,
  cancelJobTasks,
  retryJobTasks,
  cleanup,
};
