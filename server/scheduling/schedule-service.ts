/**
 * Schedule Service
 *
 * High-level service for content scheduling operations.
 * Used by admin routes and other modules.
 */

import { isSchedulingEnabled, type ScheduleResult, type CalendarView } from "./types";
import {
  scheduleContent as repoScheduleContent,
  cancelSchedule as repoCancelSchedule,
  getUpcomingScheduled,
  getCalendarItems,
  getFailedSchedules,
  getContentById,
} from "./repository";

/**
 * Schedule content for future publishing
 */
export async function scheduleContent(
  contentId: string,
  scheduledAt: Date | string
): Promise<ScheduleResult> {
  if (!isSchedulingEnabled()) {
    return {
      success: false,
      contentId,
      error: 'Content scheduling is disabled',
    };
  }

  const scheduleDate = typeof scheduledAt === 'string'
    ? new Date(scheduledAt)
    : scheduledAt;

  if (isNaN(scheduleDate.getTime())) {
    return {
      success: false,
      contentId,
      error: 'Invalid scheduled date',
    };
  }

  const result = await repoScheduleContent(contentId, scheduleDate);

  if (!result.success) {
    return {
      success: false,
      contentId,
      error: result.error,
    };
  }

  console.log(`[ScheduleService] Content ${contentId} scheduled for ${scheduleDate.toISOString()}`);

  return {
    success: true,
    contentId,
    scheduledAt: scheduleDate,
  };
}

/**
 * Cancel a scheduled publish
 */
export async function cancelSchedule(contentId: string): Promise<ScheduleResult> {
  if (!isSchedulingEnabled()) {
    return {
      success: false,
      contentId,
      error: 'Content scheduling is disabled',
    };
  }

  const result = await repoCancelSchedule(contentId);

  if (!result.success) {
    return {
      success: false,
      contentId,
      error: result.error,
    };
  }

  console.log(`[ScheduleService] Schedule cancelled for content ${contentId}`);

  return {
    success: true,
    contentId,
  };
}

/**
 * Get upcoming scheduled content
 */
export async function getUpcoming(limit?: number) {
  if (!isSchedulingEnabled()) {
    return { items: [], total: 0 };
  }

  return getUpcomingScheduled(limit);
}

/**
 * Get calendar view for a month
 */
export async function getCalendar(year: number, month: number): Promise<CalendarView> {
  if (!isSchedulingEnabled()) {
    return { year, month, items: [] };
  }

  const items = await getCalendarItems(year, month);

  return {
    year,
    month,
    items,
  };
}

/**
 * Get schedule status for a specific content
 */
export async function getScheduleStatus(contentId: string) {
  if (!isSchedulingEnabled()) {
    return null;
  }

  const content = await getContentById(contentId);

  if (!content) {
    return null;
  }

  return {
    contentId: content.id,
    title: content.title,
    type: content.type,
    slug: content.slug,
    status: content.status,
    scheduledAt: content.scheduledAt?.toISOString() || null,
    publishedAt: content.publishedAt?.toISOString() || null,
    isScheduled: !!content.scheduledAt && content.status !== 'published',
    isPending: !!content.scheduledAt && content.status === 'draft' && content.scheduledAt > new Date(),
    isPastDue: !!content.scheduledAt && content.status === 'draft' && content.scheduledAt <= new Date(),
  };
}

/**
 * Get failed schedules (past due, never published)
 */
export async function getFailures(limit?: number) {
  if (!isSchedulingEnabled()) {
    return [];
  }

  return getFailedSchedules(limit);
}

/**
 * Check if scheduling is enabled
 */
export function isEnabled(): boolean {
  return isSchedulingEnabled();
}
