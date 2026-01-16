/**
 * Octopus Job Persistence Layer
 * Database-backed job storage with full CRUD operations
 * Replaces in-memory Map for production reliability
 */

import { db } from '../db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { 
  octopusJobs, 
  octopusJobRuns, 
  octopusJobArtifacts,
  type OctopusJobRecord,
  type InsertOctopusJob,
  type OctopusJobRun,
  type InsertOctopusJobRun,
  type OctopusJobArtifact,
  type InsertOctopusJobArtifact
} from '@shared/schema';
import { log } from '../lib/logger';
import crypto from 'crypto';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[JobPersistence] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[JobPersistence] ${msg}`, undefined, data),
};

export type OctopusJobStatus = 
  | 'pending' | 'parsing' | 'extracting' | 'enriching' | 'graph_resolution'
  | 'entity_upsert' | 'generating' | 'quality_check' | 'fact_check' 
  | 'publish_queue' | 'completed' | 'failed' | 'paused';

export interface CreateJobParams {
  filename: string;
  fileSize?: number;
  mimeType?: string;
  destinationHint?: string;
  destinationId?: string;
  locale?: string;
  options?: Record<string, unknown>;
  createdBy?: string;
  inputContent?: Buffer | string;
}

export interface UpdateJobParams {
  status?: OctopusJobStatus;
  progressPct?: number;
  currentStage?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  destinationId?: string;
  pausedAt?: Date | null;
  pauseReason?: string | null;
}

export function computeInputHash(content: Buffer | string): string {
  const data = typeof content === 'string' ? content : content.toString('utf-8');
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

export async function createJob(params: CreateJobParams): Promise<OctopusJobRecord> {
  const inputHash = params.inputContent 
    ? computeInputHash(params.inputContent) 
    : crypto.randomUUID().substring(0, 32);

  const [job] = await db.insert(octopusJobs).values({
    inputHash,
    filename: params.filename,
    fileSize: params.fileSize,
    mimeType: params.mimeType,
    destinationHint: params.destinationHint,
    destinationId: params.destinationId,
    locale: params.locale || 'en',
    status: 'pending',
    progressPct: 0,
    options: params.options || {},
    createdBy: params.createdBy,
  }).returning();

  logger.info('Job created', { jobId: job.id, filename: params.filename });
  return job;
}

export async function getJob(jobId: string): Promise<OctopusJobRecord | null> {
  const [job] = await db.select().from(octopusJobs).where(eq(octopusJobs.id, jobId));
  return job || null;
}

export async function getAllJobs(limit = 50, offset = 0): Promise<OctopusJobRecord[]> {
  return db.select()
    .from(octopusJobs)
    .orderBy(desc(octopusJobs.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getJobsByStatus(status: OctopusJobStatus): Promise<OctopusJobRecord[]> {
  return db.select()
    .from(octopusJobs)
    .where(eq(octopusJobs.status, status))
    .orderBy(desc(octopusJobs.createdAt));
}

export async function getJobsByDestination(destinationId: string): Promise<OctopusJobRecord[]> {
  return db.select()
    .from(octopusJobs)
    .where(eq(octopusJobs.destinationId, destinationId))
    .orderBy(desc(octopusJobs.createdAt));
}

export async function updateJob(jobId: string, params: UpdateJobParams): Promise<OctopusJobRecord | null> {
  const [job] = await db.update(octopusJobs)
    .set({
      ...params,
    })
    .where(eq(octopusJobs.id, jobId))
    .returning();
  
  if (job) {
    logger.info('Job updated', { jobId, status: params.status, progress: params.progressPct });
  }
  return job || null;
}

export async function deleteJob(jobId: string): Promise<boolean> {
  const result = await db.delete(octopusJobs).where(eq(octopusJobs.id, jobId));
  logger.info('Job deleted', { jobId });
  return true;
}

export async function pauseJob(jobId: string, reason: string): Promise<OctopusJobRecord | null> {
  return updateJob(jobId, {
    status: 'paused',
    pausedAt: new Date(),
    pauseReason: reason,
  });
}

export async function resumeJob(jobId: string): Promise<OctopusJobRecord | null> {
  const job = await getJob(jobId);
  if (!job) return null;
  
  return updateJob(jobId, {
    status: 'pending',
    pausedAt: null,
    pauseReason: null,
  });
}

export async function findJobByHash(inputHash: string): Promise<OctopusJobRecord | null> {
  const [job] = await db.select()
    .from(octopusJobs)
    .where(eq(octopusJobs.inputHash, inputHash))
    .orderBy(desc(octopusJobs.createdAt))
    .limit(1);
  return job || null;
}

export async function createJobRun(params: InsertOctopusJobRun): Promise<OctopusJobRun> {
  const [run] = await db.insert(octopusJobRuns).values({
    ...params,
    startedAt: new Date(),
    status: 'running',
  }).returning();
  return run;
}

export async function updateJobRun(
  runId: string, 
  params: Partial<Pick<OctopusJobRun, 'status' | 'finishedAt' | 'durationMs' | 'stats' | 'error' | 'retryCount'>>
): Promise<OctopusJobRun | null> {
  const [run] = await db.update(octopusJobRuns)
    .set(params)
    .where(eq(octopusJobRuns.id, runId))
    .returning();
  return run || null;
}

export async function completeJobRun(runId: string, stats?: Record<string, unknown>): Promise<OctopusJobRun | null> {
  const run = await db.select().from(octopusJobRuns).where(eq(octopusJobRuns.id, runId)).then(r => r[0]);
  if (!run) return null;
  
  const finishedAt = new Date();
  const durationMs = run.startedAt ? finishedAt.getTime() - new Date(run.startedAt).getTime() : 0;
  
  return updateJobRun(runId, {
    status: 'completed',
    finishedAt,
    durationMs,
    stats: stats || {},
  });
}

export async function failJobRun(runId: string, error: string): Promise<OctopusJobRun | null> {
  const run = await db.select().from(octopusJobRuns).where(eq(octopusJobRuns.id, runId)).then(r => r[0]);
  if (!run) return null;
  
  const finishedAt = new Date();
  const durationMs = run.startedAt ? finishedAt.getTime() - new Date(run.startedAt).getTime() : 0;
  
  return updateJobRun(runId, {
    status: 'failed',
    finishedAt,
    durationMs,
    error,
    retryCount: (run.retryCount || 0) + 1,
  });
}

export async function getJobRuns(jobId: string): Promise<OctopusJobRun[]> {
  return db.select()
    .from(octopusJobRuns)
    .where(eq(octopusJobRuns.jobId, jobId))
    .orderBy(desc(octopusJobRuns.startedAt));
}

export async function createArtifact(params: InsertOctopusJobArtifact): Promise<OctopusJobArtifact> {
  const [artifact] = await db.insert(octopusJobArtifacts).values(params).returning();
  logger.info('Artifact created', { 
    jobId: params.jobId, 
    entityType: params.entityType, 
    normalizedName: params.normalizedName,
    action: params.action 
  });
  return artifact;
}

export async function getJobArtifacts(jobId: string): Promise<OctopusJobArtifact[]> {
  return db.select()
    .from(octopusJobArtifacts)
    .where(eq(octopusJobArtifacts.jobId, jobId))
    .orderBy(desc(octopusJobArtifacts.createdAt));
}

export async function getArtifactsByType(jobId: string, entityType: string): Promise<OctopusJobArtifact[]> {
  return db.select()
    .from(octopusJobArtifacts)
    .where(and(
      eq(octopusJobArtifacts.jobId, jobId),
      eq(octopusJobArtifacts.entityType, entityType)
    ))
    .orderBy(desc(octopusJobArtifacts.createdAt));
}

export async function findArtifactByNormalizedName(
  entityType: string, 
  normalizedName: string
): Promise<OctopusJobArtifact | null> {
  const [artifact] = await db.select()
    .from(octopusJobArtifacts)
    .where(and(
      eq(octopusJobArtifacts.entityType, entityType),
      eq(octopusJobArtifacts.normalizedName, normalizedName)
    ))
    .orderBy(desc(octopusJobArtifacts.createdAt))
    .limit(1);
  return artifact || null;
}

export async function getJobStats(): Promise<{
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  paused: number;
}> {
  const stats = await db.select({
    status: octopusJobs.status,
    count: sql<number>`count(*)::int`
  })
    .from(octopusJobs)
    .groupBy(octopusJobs.status);
  
  const result = {
    total: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    paused: 0,
  };
  
  for (const row of stats) {
    const count = row.count;
    result.total += count;
    
    switch (row.status) {
      case 'pending':
        result.pending += count;
        break;
      case 'parsing':
      case 'extracting':
      case 'enriching':
      case 'graph_resolution':
      case 'entity_upsert':
      case 'generating':
      case 'quality_check':
      case 'fact_check':
      case 'publish_queue':
        result.running += count;
        break;
      case 'completed':
        result.completed += count;
        break;
      case 'failed':
        result.failed += count;
        break;
      case 'paused':
        result.paused += count;
        break;
    }
  }
  
  return result;
}

export async function getRecentArtifacts(limit = 10): Promise<OctopusJobArtifact[]> {
  return db.select()
    .from(octopusJobArtifacts)
    .orderBy(desc(octopusJobArtifacts.createdAt))
    .limit(limit);
}

export async function failJob(
  jobId: string, 
  error: string, 
  failedStage?: string
): Promise<OctopusJobRecord | null> {
  const now = new Date();
  logger.info('Job failed', { jobId, error, failedStage });
  
  return updateJob(jobId, {
    status: 'failed',
    error,
    currentStage: failedStage,
    completedAt: now,
  });
}

export async function getStuckJobs(
  stuckThresholdMs: number = 5 * 60 * 1000
): Promise<OctopusJobRecord[]> {
  const threshold = new Date(Date.now() - stuckThresholdMs);
  
  const runningStatuses = [
    'parsing', 'extracting', 'enriching', 'graph_resolution',
    'entity_upsert', 'generating', 'quality_check', 'fact_check', 'publish_queue'
  ];
  
  const stuckJobs: OctopusJobRecord[] = [];
  
  for (const status of runningStatuses) {
    const jobs = await db.select()
      .from(octopusJobs)
      .where(and(
        eq(octopusJobs.status, status),
        sql`${octopusJobs.startedAt} < ${threshold}`
      ));
    stuckJobs.push(...jobs);
  }
  
  return stuckJobs;
}

export async function failStuckJobs(
  stuckThresholdMs: number = 5 * 60 * 1000
): Promise<number> {
  const stuckJobs = await getStuckJobs(stuckThresholdMs);
  let failedCount = 0;
  
  for (const job of stuckJobs) {
    const elapsedMs = job.startedAt ? Date.now() - new Date(job.startedAt).getTime() : 0;
    const errorMsg = `Job stuck at ${job.status} stage for ${Math.round(elapsedMs / 1000)}s (watchdog timeout)`;
    
    await failJob(job.id, errorMsg, job.currentStage || job.status);
    logger.info('Watchdog failed stuck job', { jobId: job.id, stage: job.status, elapsedMs });
    failedCount++;
  }
  
  return failedCount;
}
