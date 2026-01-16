/**
 * Content Scheduling Types
 *
 * Type definitions for the content calendar and scheduling system.
 */

export type ScheduleStatus = 'pending' | 'published' | 'failed' | 'cancelled';
export type PublishMode = 'immediate' | 'scheduled';

export interface ContentSchedule {
  contentId: string;
  title: string;
  type: string;
  slug: string;
  scheduledAt: Date;
  scheduleStatus: ScheduleStatus;
  publishMode: PublishMode;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleRequest {
  scheduledAt: Date | string;
}

export interface CalendarItem {
  contentId: string;
  title: string;
  type: string;
  slug: string;
  scheduledAt: string;
  status: ScheduleStatus;
  publishedAt?: string;
}

export interface CalendarView {
  year: number;
  month: number;
  items: CalendarItem[];
}

export interface UpcomingSchedule {
  items: CalendarItem[];
  total: number;
}

export interface ScheduleResult {
  success: boolean;
  contentId: string;
  scheduledAt?: Date;
  error?: string;
}

export interface PublishResult {
  success: boolean;
  contentId: string;
  publishedAt?: Date;
  error?: string;
}

/**
 * Feature flag check
 */
export function isSchedulingEnabled(): boolean {
  return process.env.ENABLE_CONTENT_SCHEDULING === 'true';
}
