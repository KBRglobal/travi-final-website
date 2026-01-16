/**
 * Reindex Engine - Automatic Re-index Trigger System
 *
 * Manages search engine re-indexing requests:
 * - Detects when content needs re-indexing
 * - Queues re-index requests
 * - Integrates with Google Indexing API
 * - Manages daily quota
 * - Tracks re-index status
 */

import { db } from '../db';
import { contents } from '../../shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import {
  SEOEngineConfig,
  ReindexTrigger,
  ReindexReason,
  ReindexStats,
} from './types';

// In-memory queue for re-index requests
const reindexQueue: ReindexTrigger[] = [];

// Daily quota tracking
let dailyQuota = 200; // Google Indexing API default quota
let quotaUsed = 0;
let quotaResetDate: Date | null = null;

export class ReindexEngine {
  private config: SEOEngineConfig;

  constructor(config: SEOEngineConfig) {
    this.config = config;
    this.resetQuotaIfNeeded();
  }

  /**
   * Evaluate if content needs re-indexing and trigger if needed
   */
  async evaluateAndTrigger(contentId: string): Promise<boolean> {
    if (!this.config.enableReindexTriggers) {
      return false;
    }

    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      return false;
    }

    // Determine if re-indexing is needed
    const reason = this.determineReindexReason(content);
    if (!reason) {
      return false;
    }

    // Queue the re-index request
    return this.queueReindex(contentId, reason);
  }

  /**
   * Determine why content needs re-indexing
   */
  private determineReindexReason(content: any): ReindexReason | null {
    // New content (published in last hour)
    if (content.publishedAt) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (content.publishedAt >= hourAgo) {
        return 'new_content';
      }
    }

    // Recent update (updated in last 24 hours but not just published)
    if (content.updatedAt) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (content.updatedAt >= dayAgo) {
        // Check if it's a significant update (schema or canonical changed)
        if (content.seoSchema) {
          return 'schema_update';
        }
        return 'content_update';
      }
    }

    // Stale content (not updated in 6 months, might need refresh signal)
    if (content.updatedAt) {
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      if (content.updatedAt < sixMonthsAgo) {
        return 'stale_content';
      }
    }

    return null;
  }

  /**
   * Queue a re-index request
   */
  queueReindex(
    contentId: string,
    reason: ReindexReason,
    priority: 'immediate' | 'high' | 'normal' | 'low' = 'normal'
  ): boolean {
    // Check if already queued
    const existing = reindexQueue.find(
      (r) => r.contentId === contentId && r.status === 'pending'
    );
    if (existing) {
      // Upgrade priority if needed
      const priorityOrder = { immediate: 0, high: 1, normal: 2, low: 3 };
      if (priorityOrder[priority] < priorityOrder[existing.priority]) {
        existing.priority = priority;
        existing.reason = reason;
      }
      return false;
    }

    const trigger: ReindexTrigger = {
      contentId,
      reason,
      priority,
      triggeredAt: new Date(),
      status: 'pending',
    };

    reindexQueue.push(trigger);
    return true;
  }

  /**
   * Process pending re-index requests
   */
  async processQueue(maxItems: number = 10): Promise<{
    processed: number;
    submitted: number;
    failed: number;
    quotaRemaining: number;
  }> {
    this.resetQuotaIfNeeded();

    // Sort by priority
    const priorityOrder = { immediate: 0, high: 1, normal: 2, low: 3 };
    const pending = reindexQueue
      .filter((r) => r.status === 'pending')
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const toProcess = pending.slice(0, maxItems);
    let submitted = 0;
    let failed = 0;

    for (const trigger of toProcess) {
      if (quotaUsed >= dailyQuota) {
        console.log('[ReindexEngine] Daily quota exhausted');
        break;
      }

      try {
        const success = await this.submitToIndexingAPI(trigger);
        if (success) {
          trigger.status = 'submitted';
          trigger.submittedAt = new Date();
          submitted++;
          quotaUsed++;
        } else {
          trigger.status = 'failed';
          trigger.error = 'API submission failed';
          failed++;
        }
      } catch (error) {
        trigger.status = 'failed';
        trigger.error = error instanceof Error ? error.message : 'Unknown error';
        failed++;
      }
    }

    return {
      processed: toProcess.length,
      submitted,
      failed,
      quotaRemaining: dailyQuota - quotaUsed,
    };
  }

  /**
   * Submit URL to Google Indexing API
   */
  private async submitToIndexingAPI(trigger: ReindexTrigger): Promise<boolean> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, trigger.contentId),
    });

    if (!content) {
      return false;
    }

    const url = `${this.config.baseUrl}/${content.type}/${content.slug}`;

    // In production, this would call the actual Google Indexing API
    // For now, we'll simulate the call
    console.log(`[ReindexEngine] Submitting URL for indexing: ${url}`);
    console.log(`[ReindexEngine] Reason: ${trigger.reason}`);

    // Simulate API call
    // In production:
    // const auth = new google.auth.GoogleAuth({
    //   keyFile: 'path/to/service-account.json',
    //   scopes: ['https://www.googleapis.com/auth/indexing'],
    // });
    // const indexing = google.indexing({ version: 'v3', auth });
    // await indexing.urlNotifications.publish({
    //   requestBody: {
    //     url,
    //     type: 'URL_UPDATED',
    //   },
    // });

    // Simulate success
    return true;
  }

  /**
   * Reset quota if it's a new day
   */
  private resetQuotaIfNeeded(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!quotaResetDate || quotaResetDate < today) {
      quotaUsed = 0;
      quotaResetDate = today;
    }
  }

  /**
   * Get re-index statistics
   */
  getStats(): ReindexStats {
    const pending = reindexQueue.filter((r) => r.status === 'pending').length;
    const submitted = reindexQueue.filter((r) => r.status === 'submitted').length;
    const completed = reindexQueue.filter((r) => r.status === 'completed').length;
    const failed = reindexQueue.filter((r) => r.status === 'failed').length;

    const lastSubmission = reindexQueue
      .filter((r) => r.submittedAt)
      .sort((a, b) => (b.submittedAt!.getTime() - a.submittedAt!.getTime()))[0];

    return {
      pending,
      submitted,
      completed,
      failed,
      lastSubmission: lastSubmission?.submittedAt || null,
      dailyQuota,
      quotaUsed,
    };
  }

  /**
   * Get pending triggers
   */
  getPendingTriggers(): ReindexTrigger[] {
    return reindexQueue.filter((r) => r.status === 'pending');
  }

  /**
   * Clear completed triggers (cleanup)
   */
  clearCompleted(): number {
    const initialLength = reindexQueue.length;
    const toKeep = reindexQueue.filter(
      (r) => r.status === 'pending' || r.status === 'submitted'
    );

    // Replace queue contents
    reindexQueue.length = 0;
    reindexQueue.push(...toKeep);

    return initialLength - toKeep.length;
  }

  /**
   * Manually trigger re-index for content
   */
  async manualReindex(
    contentId: string
  ): Promise<{ success: boolean; message: string }> {
    const queued = this.queueReindex(contentId, 'manual_request', 'high');

    if (!queued) {
      return {
        success: false,
        message: 'Content already queued for re-indexing',
      };
    }

    // Process immediately
    const result = await this.processQueue(1);

    if (result.submitted > 0) {
      return {
        success: true,
        message: 'Re-index request submitted successfully',
      };
    }

    if (result.quotaRemaining === 0) {
      return {
        success: false,
        message: 'Daily quota exhausted, will retry tomorrow',
      };
    }

    return {
      success: false,
      message: 'Failed to submit re-index request',
    };
  }

  /**
   * Bulk trigger re-index for multiple content
   */
  async bulkReindex(contentIds: string[]): Promise<{
    queued: number;
    skipped: number;
  }> {
    let queued = 0;
    let skipped = 0;

    for (const contentId of contentIds) {
      const success = this.queueReindex(contentId, 'bulk_update', 'normal');
      if (success) {
        queued++;
      } else {
        skipped++;
      }
    }

    return { queued, skipped };
  }

  /**
   * Check if content was recently indexed
   */
  wasRecentlyIndexed(contentId: string, withinHours: number = 24): boolean {
    const recent = reindexQueue.find(
      (r) =>
        r.contentId === contentId &&
        r.status === 'submitted' &&
        r.submittedAt &&
        Date.now() - r.submittedAt.getTime() < withinHours * 60 * 60 * 1000
    );

    return !!recent;
  }
}
