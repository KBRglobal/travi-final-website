/**
 * Content Scheduling Repository
 *
 * Database operations for content scheduling.
 * Uses existing contents table fields (scheduledAt, status).
 */

import { db } from "../db";
import { contents } from "@shared/schema";
import { eq, and, lte, isNull, isNotNull, gte, sql } from "drizzle-orm";
import type { CalendarItem, UpcomingSchedule } from "./types";

/**
 * Get content by ID with scheduling fields
 */
export async function getContentById(contentId: string) {
  const [content] = await db
    .select({
      id: contents.id,
      title: contents.title,
      type: contents.type,
      slug: contents.slug,
      status: contents.status,
      scheduledAt: contents.scheduledAt,
      publishedAt: contents.publishedAt,
      deletedAt: contents.deletedAt,
    })
    .from(contents)
    .where(eq(contents.id, contentId));

  return content || null;
}

/**
 * Schedule content for future publishing
 */
export async function scheduleContent(
  contentId: string,
  scheduledAt: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const content = await getContentById(contentId);

    if (!content) {
      return { success: false, error: 'Content not found' };
    }

    if (content.deletedAt) {
      return { success: false, error: 'Content is deleted' };
    }

    if (content.status === 'published') {
      return { success: false, error: 'Content is already published' };
    }

    if (scheduledAt <= new Date()) {
      return { success: false, error: 'Scheduled time must be in the future' };
    }

    await db
      .update(contents)
      .set({
        scheduledAt,
        updatedAt: new Date(),
      } as any)
      .where(eq(contents.id, contentId));

    return { success: true };
  } catch (error) {
    console.error('[Scheduling] Error scheduling content:', error);
    return { success: false, error: 'Database error' };
  }
}

/**
 * Cancel scheduled publishing
 */
export async function cancelSchedule(
  contentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const content = await getContentById(contentId);

    if (!content) {
      return { success: false, error: 'Content not found' };
    }

    if (content.status === 'published') {
      return { success: false, error: 'Content is already published' };
    }

    if (!content.scheduledAt) {
      return { success: false, error: 'Content is not scheduled' };
    }

    await db
      .update(contents)
      .set({
        scheduledAt: null,
        updatedAt: new Date(),
      } as any)
      .where(eq(contents.id, contentId));

    return { success: true };
  } catch (error) {
    console.error('[Scheduling] Error cancelling schedule:', error);
    return { success: false, error: 'Database error' };
  }
}

/**
 * Get content due for publishing
 * Returns draft content with scheduledAt <= now
 */
export async function getContentDueForPublishing(limit: number = 50) {
  const now = new Date();

  const items = await db
    .select({
      id: contents.id,
      title: contents.title,
      type: contents.type,
      slug: contents.slug,
      scheduledAt: contents.scheduledAt,
    })
    .from(contents)
    .where(and(
      eq(contents.status, 'draft'),
      isNotNull(contents.scheduledAt),
      lte(contents.scheduledAt, now),
      isNull(contents.deletedAt)
    ))
    .limit(limit);

  return items;
}

/**
 * Publish content by ID
 * Returns true if successful, false if already published or failed
 */
export async function publishContent(
  contentId: string
): Promise<{ success: boolean; alreadyPublished?: boolean; error?: string }> {
  try {
    // Use a transaction-like approach with optimistic check
    const content = await getContentById(contentId);

    if (!content) {
      return { success: false, error: 'Content not found' };
    }

    if (content.status === 'published') {
      return { success: false, alreadyPublished: true };
    }

    if (content.deletedAt) {
      return { success: false, error: 'Content is deleted' };
    }

    const now = new Date();

    // Update with WHERE clause to prevent race conditions
    const result = await db
      .update(contents)
      .set({
        status: 'published',
        publishedAt: now,
        updatedAt: now,
      } as any)
      .where(and(
        eq(contents.id, contentId),
        eq(contents.status, 'draft') // Only update if still draft
      ));

    return { success: true };
  } catch (error) {
    console.error('[Scheduling] Error publishing content:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get upcoming scheduled content
 */
export async function getUpcomingScheduled(limit: number = 20): Promise<UpcomingSchedule> {
  const now = new Date();

  const items = await db
    .select({
      id: contents.id,
      title: contents.title,
      type: contents.type,
      slug: contents.slug,
      status: contents.status,
      scheduledAt: contents.scheduledAt,
      publishedAt: contents.publishedAt,
    })
    .from(contents)
    .where(and(
      isNotNull(contents.scheduledAt),
      gte(contents.scheduledAt, now),
      isNull(contents.deletedAt)
    ))
    .orderBy(contents.scheduledAt)
    .limit(limit);

  const calendarItems: CalendarItem[] = items.map(item => ({
    contentId: item.id,
    title: item.title,
    type: item.type,
    slug: item.slug,
    scheduledAt: item.scheduledAt!.toISOString(),
    status: item.status === 'published' ? 'published' : 'pending',
    publishedAt: item.publishedAt?.toISOString(),
  }));

  return {
    items: calendarItems,
    total: calendarItems.length,
  };
}

/**
 * Get calendar items for a specific month
 */
export async function getCalendarItems(
  year: number,
  month: number
): Promise<CalendarItem[]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const items = await db
    .select({
      id: contents.id,
      title: contents.title,
      type: contents.type,
      slug: contents.slug,
      status: contents.status,
      scheduledAt: contents.scheduledAt,
      publishedAt: contents.publishedAt,
    })
    .from(contents)
    .where(and(
      isNotNull(contents.scheduledAt),
      gte(contents.scheduledAt, startDate),
      lte(contents.scheduledAt, endDate),
      isNull(contents.deletedAt)
    ))
    .orderBy(contents.scheduledAt);

  return items.map(item => ({
    contentId: item.id,
    title: item.title,
    type: item.type,
    slug: item.slug,
    scheduledAt: item.scheduledAt!.toISOString(),
    status: item.status === 'published' ? 'published' : 'pending',
    publishedAt: item.publishedAt?.toISOString(),
  }));
}

/**
 * Get failed schedules (content that was scheduled but never published and is past due)
 */
export async function getFailedSchedules(limit: number = 50): Promise<CalendarItem[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const items = await db
    .select({
      id: contents.id,
      title: contents.title,
      type: contents.type,
      slug: contents.slug,
      status: contents.status,
      scheduledAt: contents.scheduledAt,
    })
    .from(contents)
    .where(and(
      eq(contents.status, 'draft'),
      isNotNull(contents.scheduledAt),
      lte(contents.scheduledAt, oneDayAgo),
      isNull(contents.deletedAt)
    ))
    .orderBy(contents.scheduledAt)
    .limit(limit);

  return items.map(item => ({
    contentId: item.id,
    title: item.title,
    type: item.type,
    slug: item.slug,
    scheduledAt: item.scheduledAt!.toISOString(),
    status: 'failed' as const,
  }));
}
