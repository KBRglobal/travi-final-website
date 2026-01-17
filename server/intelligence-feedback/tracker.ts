/**
 * System Intelligence Feedback Loop - Tracker
 * Records task executions and their outcomes
 */

import {
  FeedbackEvent,
  FeedbackEventType,
  MetricSnapshot,
  TaskOutcome,
  DEFAULT_FEEDBACK_CONFIG,
} from './types';

// Event storage
const feedbackEvents: Map<string, FeedbackEvent> = new Map();
const MAX_EVENTS = 10000;

function generateEventId(): string {
  return `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isEnabled(): boolean {
  return process.env.ENABLE_INTELLIGENCE_FEEDBACK === 'true';
}

export async function captureBeforeMetrics(
  targetId: string
): Promise<MetricSnapshot> {
  const snapshot: MetricSnapshot = {
    timestamp: new Date(),
  };

  try {
    // Capture health score
    const contentHealth = await import('../content-health') as any;
    const healthScore = await contentHealth.scoreContent(targetId);
    if (healthScore) {
      snapshot.healthScore = healthScore.overallScore;
    }
  } catch (error) {
    // Module may not be available
  }

  try {
    // Capture revenue score
    const { calculateContentValue } = await import('../revenue-intel');
    const revenueScore = await calculateContentValue(targetId);
    if (revenueScore) {
      snapshot.revenueScore = revenueScore.roiScore;
    }
  } catch (error) {
    // Module may not be available
  }

  try {
    // Capture link score
    const { getContentLinkStats } = await import('../link-graph');
    const linkStats = await getContentLinkStats(targetId);
    if (linkStats) {
      snapshot.linkScore = linkStats.authorityScore;
    }
  } catch (error) {
    // Module may not be available
  }

  try {
    // Capture priority score
    const { getPriority } = await import('../strategy');
    const priority = await getPriority(targetId);
    if (priority) {
      snapshot.priorityScore = priority.priorityScore;
    }
  } catch (error) {
    // Module may not be available
  }

  return snapshot;
}

export async function captureAfterMetrics(
  targetId: string
): Promise<MetricSnapshot> {
  // Same as before metrics but captured after task completion
  return captureBeforeMetrics(targetId);
}

export function calculateImprovement(
  before: MetricSnapshot,
  after: MetricSnapshot
): number {
  const improvements: number[] = [];

  if (before.healthScore !== undefined && after.healthScore !== undefined) {
    improvements.push(after.healthScore - before.healthScore);
  }

  if (before.revenueScore !== undefined && after.revenueScore !== undefined) {
    improvements.push(after.revenueScore - before.revenueScore);
  }

  if (before.linkScore !== undefined && after.linkScore !== undefined) {
    improvements.push(after.linkScore - before.linkScore);
  }

  if (before.priorityScore !== undefined && after.priorityScore !== undefined) {
    // Priority score is inverted (lower = better after task)
    improvements.push(before.priorityScore - after.priorityScore);
  }

  if (improvements.length === 0) return 0;

  return improvements.reduce((a, b) => a + b, 0) / improvements.length;
}

export function determineOutcome(improvement: number): TaskOutcome {
  if (improvement > 5) return 'success';
  if (improvement < -5) return 'failure';
  return 'neutral';
}

export async function recordTaskStart(
  taskId: string,
  taskType: string,
  targetId: string
): Promise<string | null> {
  if (!isEnabled()) return null;

  const beforeMetrics = await captureBeforeMetrics(targetId);

  const event: FeedbackEvent = {
    id: generateEventId(),
    type: 'task_completed',
    taskId,
    taskType,
    targetId,
    beforeMetrics,
    afterMetrics: null,
    outcome: 'pending',
    improvement: 0,
    createdAt: new Date(),
    measuredAt: null,
  };

  // Enforce event limit
  if (feedbackEvents.size >= MAX_EVENTS) {
    const oldest = Array.from(feedbackEvents.entries())
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())
      .slice(0, 1000);

    for (const [id] of oldest) {
      feedbackEvents.delete(id);
    }
  }

  feedbackEvents.set(event.id, event);
  return event.id;
}

export async function recordTaskCompletion(
  eventId: string,
  success: boolean
): Promise<boolean> {
  if (!isEnabled()) return false;

  const event = feedbackEvents.get(eventId);
  if (!event) return false;

  event.type = success ? 'task_completed' : 'task_failed';

  // Schedule measurement after delay
  const delayMs = DEFAULT_FEEDBACK_CONFIG.measurementDelayMinutes * 60 * 1000;

  setTimeout(async () => {
    try {
      event.afterMetrics = await captureAfterMetrics(event.targetId);
      event.improvement = calculateImprovement(event.beforeMetrics, event.afterMetrics);
      event.outcome = success ? determineOutcome(event.improvement) : 'failure';
      event.measuredAt = new Date();
    } catch (error) {
      console.error('[Feedback] Measurement error:', error);
      event.outcome = 'neutral';
      event.measuredAt = new Date();
    }
  }, Math.min(delayMs, 60000)); // Cap at 1 minute for immediate feedback

  return true;
}

export function recordManualAdjustment(
  targetId: string,
  reason: string,
  metrics: Partial<MetricSnapshot>
): string {
  const event: FeedbackEvent = {
    id: generateEventId(),
    type: 'manual_adjustment',
    taskId: 'manual',
    taskType: 'manual',
    targetId,
    beforeMetrics: { timestamp: new Date(), ...metrics },
    afterMetrics: null,
    outcome: 'neutral',
    improvement: 0,
    createdAt: new Date(),
    measuredAt: null,
  };

  feedbackEvents.set(event.id, event);
  return event.id;
}

export function getEvent(eventId: string): FeedbackEvent | null {
  return feedbackEvents.get(eventId) || null;
}

export function getEventsByTaskType(taskType: string): FeedbackEvent[] {
  return Array.from(feedbackEvents.values())
    .filter(e => e.taskType === taskType && e.measuredAt !== null);
}

export function getEventsByTarget(targetId: string): FeedbackEvent[] {
  return Array.from(feedbackEvents.values())
    .filter(e => e.targetId === targetId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getAllMeasuredEvents(): FeedbackEvent[] {
  return Array.from(feedbackEvents.values())
    .filter(e => e.measuredAt !== null);
}

export function getRecentEvents(limit = 50): FeedbackEvent[] {
  return Array.from(feedbackEvents.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export function cleanupOldEvents(): number {
  const cutoff = new Date(
    Date.now() - DEFAULT_FEEDBACK_CONFIG.retentionDays * 24 * 60 * 60 * 1000
  );

  let removed = 0;
  for (const [id, event] of feedbackEvents) {
    if (event.createdAt < cutoff) {
      feedbackEvents.delete(id);
      removed++;
    }
  }

  return removed;
}
