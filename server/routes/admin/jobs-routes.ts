/**
 * Admin Jobs Routes
 * 
 * PHASE 14 TASK 6: Unified Operational Metrics
 * Provides job queue metrics for the operations dashboard
 */

import { Router, type Request, type Response } from 'express';
import { db } from '../../db';
import { octopusJobs } from '@shared/schema';
import { desc, sql, and, gte, or, eq } from 'drizzle-orm';
import { log } from '../../lib/logger';

const router = Router();

interface JobMetricsResponse {
  timestamp: string;
  queueDepth: number;
  failedLast24h: number;
  avgDurationMs: number;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  jobs: Array<{
    id: string;
    type: string;
    status: string;
    currentStage: string | null;
    error: string | null;
    createdAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    processingTimeMs: number | null;
  }>;
}

/**
 * GET /api/admin/jobs/recent
 * 
 * Returns recent jobs with metrics for operations dashboard
 * Query params:
 * - limit: Number of jobs to return (default 50, max 100)
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [recentJobs, failedCount, pendingCount, processingCount, completedStats] = await Promise.all([
      db.select()
        .from(octopusJobs)
        .orderBy(desc(octopusJobs.createdAt))
        .limit(limit),

      db.select({ count: sql<number>`count(*)::int` })
        .from(octopusJobs)
        .where(and(
          eq(octopusJobs.status, 'failed'),
          gte(octopusJobs.createdAt, twentyFourHoursAgo)
        ))
        .then(r => r[0]?.count ?? 0),

      db.select({ count: sql<number>`count(*)::int` })
        .from(octopusJobs)
        .where(eq(octopusJobs.status, 'pending'))
        .then(r => r[0]?.count ?? 0),

      db.select({ count: sql<number>`count(*)::int` })
        .from(octopusJobs)
        .where(or(
          eq(octopusJobs.status, 'parsing'),
          eq(octopusJobs.status, 'extracting'),
          eq(octopusJobs.status, 'enriching'),
          eq(octopusJobs.status, 'generating'),
          eq(octopusJobs.status, 'quality_check'),
          eq(octopusJobs.status, 'fact_check'),
          eq(octopusJobs.status, 'entity_upsert'),
          eq(octopusJobs.status, 'graph_resolution'),
          eq(octopusJobs.status, 'publish_queue')
        ))
        .then(r => r[0]?.count ?? 0),

      db.select({
        count: sql<number>`count(*)::int`,
        avgDuration: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::int, 0)`
      })
        .from(octopusJobs)
        .where(and(
          eq(octopusJobs.status, 'completed'),
          sql`completed_at IS NOT NULL`,
          sql`started_at IS NOT NULL`
        ))
        .then(r => ({
          count: r[0]?.count ?? 0,
          avgDuration: r[0]?.avgDuration ?? 0
        })),
    ]);

    const jobs = recentJobs.map(job => {
      let processingTimeMs: number | null = null;
      if (job.completedAt && job.startedAt) {
        processingTimeMs = new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime();
      }

      return {
        id: job.id,
        type: job.mimeType || 'document',
        status: job.status,
        currentStage: job.currentStage,
        error: job.error,
        createdAt: job.createdAt?.toISOString() ?? null,
        startedAt: job.startedAt?.toISOString() ?? null,
        completedAt: job.completedAt?.toISOString() ?? null,
        processingTimeMs,
      };
    });

    const response: JobMetricsResponse = {
      timestamp: new Date().toISOString(),
      queueDepth: pendingCount + processingCount,
      failedLast24h: failedCount,
      avgDurationMs: completedStats.avgDuration,
      pendingCount,
      processingCount,
      completedCount: completedStats.count,
      jobs,
    };

    res.json(response);
  } catch (error) {
    log.error('[Admin Jobs] Failed to get recent jobs', error);
    res.status(500).json({ error: 'Failed to retrieve job metrics' });
  }
});

export default router;
