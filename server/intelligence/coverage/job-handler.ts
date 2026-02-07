/**
 * Intelligence Coverage Engine - Job Handler
 *
 * Handles coverage evaluation jobs with retry support.
 * Can be triggered after content publish/update or on-demand.
 */

import { log } from '../../lib/logger';
import {
  evaluateContentCoverage,
  evaluateAllContentCoverage,
  isIntelligenceCoverageEnabled,
} from './evaluator';
import { cacheCoverage, clearCoverageCache } from './persistence';
import type { CoverageJobPayload }from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[ICE-Job] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[ICE-Job] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[ICE-Job] ${msg}`, data),
};

// ============================================================================
// Job Types
// ============================================================================

export const JOB_TYPE = 'intelligence-coverage-evaluation' as const;

export interface CoverageJobResult {
  success: boolean;
  type: 'single' | 'batch';
  contentId?: string;
  evaluated?: number;
  failed?: number;
  nextCursor?: string;
  error?: string;
  durationMs: number;
}

// ============================================================================
// Job State (Simple in-memory tracking)
// ============================================================================

interface JobState {
  isRunning: boolean;
  lastRunAt: Date | null;
  lastResult: CoverageJobResult | null;
  runCount: number;
}

const jobState: JobState = {
  isRunning: false,
  lastRunAt: null,
  lastResult: null,
  runCount: 0,
};

/**
 * Get current job state for monitoring.
 */
export function getJobState(): JobState {
  return { ...jobState };
}

// ============================================================================
// Job Execution
// ============================================================================

/**
 * Process a coverage evaluation job.
 * Retry-safe: can be called multiple times without side effects.
 */
export async function processCoverageJob(
  payload: CoverageJobPayload
): Promise<CoverageJobResult> {
  if (!isIntelligenceCoverageEnabled()) {
    return {
      success: false,
      type: payload.type,
      error: 'Intelligence coverage is disabled',
      durationMs: 0,
    };
  }

  if (jobState.isRunning) {
    logger.warn('Coverage job already running, skipping');
    return {
      success: false,
      type: payload.type,
      error: 'Job already running',
      durationMs: 0,
    };
  }

  jobState.isRunning = true;
  const startTime = Date.now();

  try {
    let result: CoverageJobResult;

    if (payload.type === 'single' && payload.contentId) {
      // Single content evaluation
      const evalResult = await evaluateContentCoverage(payload.contentId);

      if (evalResult.success && evalResult.coverage) {
        cacheCoverage(evalResult.coverage);
      }

      result = {
        success: evalResult.success,
        type: 'single',
        contentId: payload.contentId,
        evaluated: evalResult.success ? 1 : 0,
        failed: evalResult.success ? 0 : 1,
        error: evalResult.error,
        durationMs: Date.now() - startTime,
      };
    } else {
      // Batch evaluation
      const batchSize = payload.batchSize || 100;
      const evalResult = await evaluateAllContentCoverage(batchSize, payload.cursor);

      // Cache successful evaluations
      for (const res of evalResult.results) {
        if (res.success && res.coverage) {
          cacheCoverage(res.coverage);
        }
      }

      result = {
        success: evalResult.failed === 0,
        type: 'batch',
        evaluated: evalResult.evaluated,
        failed: evalResult.failed,
        nextCursor: evalResult.cursor,
        durationMs: Date.now() - startTime,
      };
    }

    jobState.lastRunAt = new Date();
    jobState.lastResult = result;
    jobState.runCount++;

    logger.info('Coverage job completed', {
      type: result.type,
      evaluated: result.evaluated,
      failed: result.failed,
      durationMs: result.durationMs,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Coverage job failed', { error: errorMessage });

    const result: CoverageJobResult = {
      success: false,
      type: payload.type,
      error: errorMessage,
      durationMs: Date.now() - startTime,
    };

    jobState.lastRunAt = new Date();
    jobState.lastResult = result;
    jobState.runCount++;

    return result;
  } finally {
    jobState.isRunning = false;
  }
}

// ============================================================================
// Content Event Hooks (Non-blocking)
// ============================================================================

/**
 * Trigger coverage evaluation after content publish.
 * Fire-and-forget: does not block the publish flow.
 */
export function onContentPublished(contentId: string): void {
  if (!isIntelligenceCoverageEnabled()) {
    return;
  }

  // Fire and forget
  processCoverageJob({
    type: 'single',
    contentId,
  }).catch(error => {
    logger.error('Background coverage evaluation failed', {
      contentId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
  });
}

/**
 * Trigger coverage evaluation after content update.
 * Fire-and-forget: does not block the update flow.
 */
export function onContentUpdated(contentId: string): void {
  if (!isIntelligenceCoverageEnabled()) {
    return;
  }

  // Fire and forget
  processCoverageJob({
    type: 'single',
    contentId,
  }).catch(error => {
    logger.error('Background coverage evaluation failed', {
      contentId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
  });
}

// ============================================================================
// Backfill Support
// ============================================================================

/**
 * Run a full backfill of coverage evaluations.
 * Processes all content in batches with pagination.
 * Returns total stats after completion.
 */
export async function runBackfill(
  batchSize: number = 100
): Promise<{
  success: boolean;
  totalEvaluated: number;
  totalFailed: number;
  durationMs: number;
}> {
  if (!isIntelligenceCoverageEnabled()) {
    return {
      success: false,
      totalEvaluated: 0,
      totalFailed: 0,
      durationMs: 0,
    };
  }

  logger.info('Starting coverage backfill', { batchSize });
  const startTime = Date.now();

  let totalEvaluated = 0;
  let totalFailed = 0;
  let cursor: string | undefined;
  let batchCount = 0;

  // Clear cache before backfill
  clearCoverageCache();

  try {
    do {
      const result = await processCoverageJob({
        type: 'batch',
        batchSize,
        cursor,
      });

      totalEvaluated += result.evaluated || 0;
      totalFailed += result.failed || 0;
      cursor = result.nextCursor;
      batchCount++;

      logger.info('Backfill batch complete', {
        batch: batchCount,
        evaluated: result.evaluated,
        failed: result.failed,
        hasMore: !!cursor,
      });

      // Small delay between batches to avoid overwhelming DB
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } while (cursor);

    const durationMs = Date.now() - startTime;

    logger.info('Coverage backfill complete', {
      batches: batchCount,
      totalEvaluated,
      totalFailed,
      durationMs,
    });

    return {
      success: totalFailed === 0,
      totalEvaluated,
      totalFailed,
      durationMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Coverage backfill failed', { error: errorMessage });

    return {
      success: false,
      totalEvaluated,
      totalFailed,
      durationMs: Date.now() - startTime,
    };
  }
}
