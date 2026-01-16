/**
 * Content Health - Auto Job Router
 *
 * Routes health issues to appropriate job queues.
 * Does NOT mutate content directly - only enqueues jobs.
 */

import { log } from '../lib/logger';
import type { ContentHealthReport, HealthSignal } from './signals';
import { HEALTH_THRESHOLDS } from './thresholds';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[ContentHealth] ${msg}`, data),
};

export interface JobSuggestion {
  jobType: string;
  contentId: string;
  priority: number;
  triggeredBy: HealthSignal[];
  reason: string;
}

/**
 * Generate job suggestions from a health report.
 */
export function generateJobSuggestions(report: ContentHealthReport): JobSuggestion[] {
  const suggestions: Map<string, JobSuggestion> = new Map();

  for (const signal of report.signals) {
    if (!signal.detected) continue;

    const threshold = HEALTH_THRESHOLDS.find(t => t.signal === signal.signal);
    if (!threshold) continue;

    const jobType = threshold.suggestedJob;
    const existing = suggestions.get(jobType);

    if (existing) {
      // Merge triggers
      existing.triggeredBy.push(signal.signal);
      // Increase priority if multiple signals suggest same job
      existing.priority = Math.max(existing.priority, severityToPriority(threshold.severity));
    } else {
      suggestions.set(jobType, {
        jobType,
        contentId: report.contentId,
        priority: severityToPriority(threshold.severity),
        triggeredBy: [signal.signal],
        reason: signal.message,
      });
    }
  }

  return Array.from(suggestions.values()).sort((a, b) => b.priority - a.priority);
}

function severityToPriority(severity: string): number {
  switch (severity) {
    case 'critical': return 100;
    case 'high': return 75;
    case 'medium': return 50;
    case 'low': return 25;
    default: return 0;
  }
}

/**
 * Simulate job enqueueing (placeholder for actual job queue integration).
 * Returns the jobs that would be enqueued.
 */
export async function routeToJobQueue(
  suggestions: JobSuggestion[]
): Promise<{ enqueued: string[]; skipped: string[] }> {
  const enqueued: string[] = [];
  const skipped: string[] = [];

  for (const suggestion of suggestions) {
    // In production, this would call the actual job queue
    // For now, we just log and track what would happen
    logger.info('Would enqueue job', {
      jobType: suggestion.jobType,
      contentId: suggestion.contentId,
      priority: suggestion.priority,
      triggeredBy: suggestion.triggeredBy,
    });

    // Placeholder: mark all as "would be enqueued"
    enqueued.push(`${suggestion.jobType}:${suggestion.contentId}`);
  }

  return { enqueued, skipped };
}

/**
 * Process a batch of health reports and generate job suggestions.
 */
export function batchGenerateSuggestions(
  reports: ContentHealthReport[]
): Map<string, JobSuggestion[]> {
  const allSuggestions = new Map<string, JobSuggestion[]>();

  for (const report of reports) {
    if (report.needsAttention) {
      const suggestions = generateJobSuggestions(report);
      if (suggestions.length > 0) {
        allSuggestions.set(report.contentId, suggestions);
      }
    }
  }

  return allSuggestions;
}
