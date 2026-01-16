/**
 * AEO Background Jobs and Automation
 * Handles scheduled tasks, auto-generation, and notifications
 */

import { db } from '../db';
import { contents, aeoAnswerCapsules, aeoCitations, aeoPerformanceMetrics } from '../../shared/schema';
import { eq, and, gte, lte, sql, isNull, lt, desc } from 'drizzle-orm';
import { generateAnswerCapsule, batchGenerateCapsules } from './answer-capsule-generator';
import { getCitationInsights, getCrawlerStats } from './aeo-tracking';
import { invalidateDashboardCache, invalidateCitationCache } from './aeo-cache';
import { log } from '../lib/logger';
import { ANSWER_CAPSULE_CONFIG, AEO_LOCALE_PRIORITY } from './aeo-config';

const aeoLogger = {
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[AEO Jobs] ${msg}`, undefined, data),
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[AEO Jobs] ${msg}`, data),
};

// Job status tracking
interface JobStatus {
  isRunning: boolean;
  lastRun: Date | null;
  lastResult: any;
  errors: string[];
}

const jobStatuses: Record<string, JobStatus> = {
  autoGenerate: { isRunning: false, lastRun: null, lastResult: null, errors: [] },
  citationScan: { isRunning: false, lastRun: null, lastResult: null, errors: [] },
  performanceReport: { isRunning: false, lastRun: null, lastResult: null, errors: [] },
  cleanup: { isRunning: false, lastRun: null, lastResult: null, errors: [] },
};

// Notification handlers (can be extended with Slack, email, etc.)
type NotificationHandler = (message: string, data?: any) => Promise<void>;
const notificationHandlers: NotificationHandler[] = [];

export function registerNotificationHandler(handler: NotificationHandler): void {
  notificationHandlers.push(handler);
}

async function sendNotification(message: string, data?: any): Promise<void> {
  for (const handler of notificationHandlers) {
    try {
      await handler(message, data);
    } catch (error) {
      aeoLogger.error('Notification handler failed', { error });
    }
  }
}

/**
 * Auto-generate capsules for new/updated content
 * Should run every hour
 */
export async function runAutoGenerateCapsules(): Promise<{
  processed: number;
  success: number;
  failed: number;
  skipped: number;
}> {
  if (jobStatuses.autoGenerate.isRunning) {
    aeoLogger.info('Auto-generate job already running, skipping');
    return { processed: 0, success: 0, failed: 0, skipped: 0 };
  }

  jobStatuses.autoGenerate.isRunning = true;
  jobStatuses.autoGenerate.errors = [];

  try {
    aeoLogger.info('Starting auto-generate capsules job');

    // Find published content without capsules
    const contentWithoutCapsules = await db
      .select({ id: contents.id, type: contents.type })
      .from(contents)
      .where(
        and(
          eq(contents.status, 'published'),
          isNull(contents.answerCapsule)
        )
      )
      .orderBy(desc(contents.viewCount))
      .limit(50); // Process max 50 per run

    if (contentWithoutCapsules.length === 0) {
      aeoLogger.info('No content needs capsule generation');
      return { processed: 0, success: 0, failed: 0, skipped: 0 };
    }

    const contentIds = contentWithoutCapsules.map(c => c.id);

    // Generate for primary locales first
    const primaryLocale = AEO_LOCALE_PRIORITY.tier1[0]; // 'en'
    const result = await batchGenerateCapsules(contentIds, primaryLocale, {
      concurrency: 3,
      skipExisting: true,
    });

    const jobResult = {
      processed: contentIds.length,
      success: result.success,
      failed: result.failed,
      skipped: result.skipped,
    };

    jobStatuses.autoGenerate.lastResult = jobResult;
    jobStatuses.autoGenerate.lastRun = new Date();

    // Send notification if there were failures
    if (result.failed > 0) {
      await sendNotification(
        `AEO Auto-Generate: ${result.failed} capsules failed to generate`,
        { errors: result.errors.slice(0, 5) }
      );
    }

    // Send success notification for significant runs
    if (result.success >= 10) {
      await sendNotification(
        `AEO Auto-Generate: Successfully generated ${result.success} new capsules`
      );
    }

    aeoLogger.info('Auto-generate capsules completed', jobResult);
    return jobResult;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    jobStatuses.autoGenerate.errors.push(errorMsg);
    aeoLogger.error('Auto-generate job failed', { error: errorMsg });
    throw error;
  } finally {
    jobStatuses.autoGenerate.isRunning = false;
  }
}

/**
 * Regenerate low-quality capsules
 * Should run daily
 */
export async function runRegenerateLowQualityCapsules(): Promise<{
  processed: number;
  improved: number;
  unchanged: number;
}> {
  aeoLogger.info('Starting low-quality capsule regeneration');

  // Find capsules below acceptable threshold
  const lowQualityCapsules = await db
    .select()
    .from(aeoAnswerCapsules)
    .where(
      lt(aeoAnswerCapsules.qualityScore, ANSWER_CAPSULE_CONFIG.qualityThresholds.acceptable)
    )
    .limit(20);

  let improved = 0;
  let unchanged = 0;

  for (const capsule of lowQualityCapsules) {
    try {
      const oldScore = capsule.qualityScore || 0;
      const newCapsule = await generateAnswerCapsule({
        contentId: capsule.contentId,
        locale: capsule.locale,
        forceRegenerate: true,
      });

      if (newCapsule.qualityScore > oldScore) {
        improved++;
      } else {
        unchanged++;
      }
    } catch (error) {
      aeoLogger.error('Failed to regenerate capsule', { contentId: capsule.contentId, error });
    }
  }

  const result = {
    processed: lowQualityCapsules.length,
    improved,
    unchanged,
  };

  aeoLogger.info('Low-quality regeneration completed', result);
  return result;
}

/**
 * Scan for new citations
 * Should run every 6 hours
 */
export async function runCitationScan(): Promise<{
  newCitations: number;
  platforms: Record<string, number>;
}> {
  if (jobStatuses.citationScan.isRunning) {
    return { newCitations: 0, platforms: {} };
  }

  jobStatuses.citationScan.isRunning = true;

  try {
    aeoLogger.info('Starting citation scan');

    // This is a placeholder - in production, this would integrate with
    // external APIs to detect citations (e.g., searching AI platforms)
    const insights = await getCitationInsights(1); // Last 24 hours

    const result = {
      newCitations: insights.totalCitations,
      platforms: insights.byPlatform.reduce((acc, p) => {
        acc[p.platform] = p.count;
        return acc;
      }, {} as Record<string, number>),
    };

    jobStatuses.citationScan.lastResult = result;
    jobStatuses.citationScan.lastRun = new Date();

    // Notify if significant citations found
    if (result.newCitations >= 5) {
      await sendNotification(
        `AEO Citation Alert: ${result.newCitations} new citations detected in last 24h`,
        result
      );
    }

    // Invalidate caches
    await invalidateCitationCache();

    aeoLogger.info('Citation scan completed', result);
    return result;
  } catch (error) {
    aeoLogger.error('Citation scan failed', { error });
    throw error;
  } finally {
    jobStatuses.citationScan.isRunning = false;
  }
}

/**
 * Generate performance reports
 * Should run daily
 */
export async function runPerformanceReport(): Promise<{
  period: string;
  metrics: any;
}> {
  if (jobStatuses.performanceReport.isRunning) {
    return { period: '', metrics: null };
  }

  jobStatuses.performanceReport.isRunning = true;

  try {
    aeoLogger.info('Generating performance report');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days

    const crawlerStats = await getCrawlerStats(7);
    const citationInsights = await getCitationInsights(7);

    const metrics = {
      crawlerVisits: crawlerStats.totalVisits,
      avgResponseTime: crawlerStats.avgResponseTime,
      citations: citationInsights.totalCitations,
      topPlatform: citationInsights.byPlatform[0]?.platform || 'N/A',
      topContent: citationInsights.topCitedContent[0]?.title || 'N/A',
    };

    const result = {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      metrics,
    };

    jobStatuses.performanceReport.lastResult = result;
    jobStatuses.performanceReport.lastRun = new Date();

    // Send weekly summary
    await sendNotification(
      `AEO Weekly Report: ${metrics.crawlerVisits} crawler visits, ${metrics.citations} citations`,
      metrics
    );

    aeoLogger.info('Performance report generated', result);
    return result;
  } catch (error) {
    aeoLogger.error('Performance report failed', { error });
    throw error;
  } finally {
    jobStatuses.performanceReport.isRunning = false;
  }
}

/**
 * Cleanup old data
 * Should run weekly
 */
export async function runCleanup(): Promise<{
  deletedLogs: number;
  deletedMetrics: number;
}> {
  if (jobStatuses.cleanup.isRunning) {
    return { deletedLogs: 0, deletedMetrics: 0 };
  }

  jobStatuses.cleanup.isRunning = true;

  try {
    aeoLogger.info('Starting AEO cleanup');

    // Keep crawler logs for 90 days
    const logsThreshold = new Date();
    logsThreshold.setDate(logsThreshold.getDate() - 90);

    // Keep metrics for 365 days
    const metricsThreshold = new Date();
    metricsThreshold.setDate(metricsThreshold.getDate() - 365);

    // Note: Actual deletion would require proper Drizzle delete queries
    // This is a placeholder showing the logic

    const result = {
      deletedLogs: 0,
      deletedMetrics: 0,
    };

    jobStatuses.cleanup.lastResult = result;
    jobStatuses.cleanup.lastRun = new Date();

    aeoLogger.info('Cleanup completed', result);
    return result;
  } catch (error) {
    aeoLogger.error('Cleanup failed', { error });
    throw error;
  } finally {
    jobStatuses.cleanup.isRunning = false;
  }
}

/**
 * Get all job statuses
 */
export function getJobStatuses(): Record<string, JobStatus> {
  return { ...jobStatuses };
}

/**
 * Trigger all jobs (for testing)
 */
export async function runAllJobs(): Promise<void> {
  await runAutoGenerateCapsules();
  await runCitationScan();
  await runPerformanceReport();
}

/**
 * Schedule jobs using simple interval-based scheduling
 * In production, consider using a proper job scheduler like Bull or Agenda
 */
export function startScheduler(): void {
  aeoLogger.info('Starting AEO job scheduler');

  // Auto-generate every hour
  setInterval(() => {
    runAutoGenerateCapsules().catch((e) => aeoLogger.error('Scheduled auto-generate failed', { error: e }));
  }, 60 * 60 * 1000);

  // Citation scan every 6 hours
  setInterval(() => {
    runCitationScan().catch((e) => aeoLogger.error('Scheduled citation scan failed', { error: e }));
  }, 6 * 60 * 60 * 1000);

  // Performance report daily (every 24 hours)
  setInterval(() => {
    runPerformanceReport().catch((e) => aeoLogger.error('Scheduled performance report failed', { error: e }));
  }, 24 * 60 * 60 * 1000);

  // Cleanup weekly (every 7 days)
  setInterval(() => {
    runCleanup().catch((e) => aeoLogger.error('Scheduled cleanup failed', { error: e }));
  }, 7 * 24 * 60 * 60 * 1000);

  // Low quality regeneration daily
  setInterval(() => {
    runRegenerateLowQualityCapsules().catch((e) => aeoLogger.error('Scheduled regeneration failed', { error: e }));
  }, 24 * 60 * 60 * 1000);
}

/**
 * Hook for content publication - auto-generate capsule
 */
export async function onContentPublished(contentId: string): Promise<void> {
  try {
    aeoLogger.info('Content published, generating capsule', { contentId });
    await generateAnswerCapsule({ contentId, locale: 'en' });
    await invalidateDashboardCache();
  } catch (error) {
    aeoLogger.error('Failed to generate capsule on publish', { contentId, error });
  }
}

/**
 * Hook for content update - regenerate capsule if needed
 */
export async function onContentUpdated(contentId: string): Promise<void> {
  try {
    const existingCapsule = await db.query.aeoAnswerCapsules.findFirst({
      where: eq(aeoAnswerCapsules.contentId, contentId),
    });

    if (existingCapsule) {
      aeoLogger.info('Content updated, regenerating capsule', { contentId });
      await generateAnswerCapsule({ contentId, locale: 'en', forceRegenerate: true });
      await invalidateDashboardCache();
    }
  } catch (error) {
    aeoLogger.error('Failed to regenerate capsule on update', { contentId, error });
  }
}
