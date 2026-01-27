/**
 * Content Lifecycle Timeline
 *
 * Unified timeline of everything that happened to a content item:
 * - Created, Edited, Published, Indexed
 * - AEO generated, Revenue event, Repair attempt
 *
 * Feature flag: ENABLE_CONTENT_TIMELINE
 */

import { db } from "../db";
import { contentTimelineEvents, contents } from "@shared/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

function isEnabled(): boolean {
  return process.env.ENABLE_CONTENT_TIMELINE === "true";
}

export type TimelineEventType =
  | "created"
  | "edited"
  | "published"
  | "unpublished"
  | "archived"
  | "indexed"
  | "aeo_generated"
  | "seo_updated"
  | "revenue_event"
  | "repair_attempted"
  | "repair_completed"
  | "decay_detected"
  | "confidence_updated"
  | "links_updated"
  | "translation_added"
  | "custom";

export interface TimelineEvent {
  id: string;
  contentId: string;
  eventType: TimelineEventType;
  eventData?: Record<string, unknown>;
  actorId?: string;
  actorType?: "user" | "system" | "ai";
  createdAt: string;
}

export interface ContentTimeline {
  contentId: string;
  contentTitle?: string;
  events: TimelineEvent[];
  total: number;
}

/**
 * Record a timeline event
 */
export async function recordTimelineEvent(
  contentId: string,
  eventType: TimelineEventType,
  options?: {
    eventData?: Record<string, unknown>;
    actorId?: string;
    actorType?: "user" | "system" | "ai";
  }
): Promise<string | null> {
  if (!isEnabled()) return null;

  const [event] = await db
    .insert(contentTimelineEvents)
    .values({
      contentId,
      eventType,
      eventData: options?.eventData,
      actorId: options?.actorId,
      actorType: options?.actorType || "system",
    } as any)
    .returning({ id: contentTimelineEvents.id });

  return event?.id || null;
}

/**
 * Get timeline for content
 */
export async function getContentTimeline(
  contentId: string,
  options?: {
    limit?: number;
    offset?: number;
    eventTypes?: TimelineEventType[];
    fromDate?: Date;
    toDate?: Date;
  }
): Promise<ContentTimeline> {
  if (!isEnabled()) {
    return { contentId, events: [], total: 0 };
  }

  const { limit = 100, offset = 0, eventTypes, fromDate, toDate } = options || {};

  // Get content title
  const [content] = await db
    .select({ title: contents.title })
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  // Build query
  const conditions = [eq(contentTimelineEvents.contentId, contentId)];

  if (eventTypes && eventTypes.length > 0) {
    // Filter by event types - use manual filtering since we don't have inArray for this
  }
  if (fromDate) {
    conditions.push(gte(contentTimelineEvents.createdAt, fromDate));
  }
  if (toDate) {
    conditions.push(lte(contentTimelineEvents.createdAt, toDate));
  }

  const events = await db
    .select()
    .from(contentTimelineEvents)
    .where(and(...conditions))
    .orderBy(desc(contentTimelineEvents.createdAt))
    .limit(limit)
    .offset(offset);

  // Filter by event types in memory if specified
  let filteredEvents = events;
  if (eventTypes && eventTypes.length > 0) {
    const typeSet = new Set(eventTypes);
    filteredEvents = events.filter(e => typeSet.has(e.eventType as TimelineEventType));
  }

  return {
    contentId,
    contentTitle: content?.title,
    events: filteredEvents.map(e => ({
      id: e.id,
      contentId: e.contentId,
      eventType: e.eventType as TimelineEventType,
      eventData: e.eventData as Record<string, unknown> | undefined,
      actorId: e.actorId || undefined,
      actorType: e.actorType as "user" | "system" | "ai" | undefined,
      createdAt: e.createdAt?.toISOString() || new Date().toISOString(),
    })),
    total: filteredEvents.length,
  };
}

/**
 * Get recent timeline events across all content
 */
export async function getRecentEvents(
  limit: number = 50,
  eventTypes?: TimelineEventType[]
): Promise<TimelineEvent[]> {
  if (!isEnabled()) return [];

  const events = await db
    .select()
    .from(contentTimelineEvents)
    .orderBy(desc(contentTimelineEvents.createdAt))
    .limit(limit);

  let filteredEvents = events;
  if (eventTypes && eventTypes.length > 0) {
    const typeSet = new Set(eventTypes);
    filteredEvents = events.filter(e => typeSet.has(e.eventType as TimelineEventType));
  }

  return filteredEvents.map(e => ({
    id: e.id,
    contentId: e.contentId,
    eventType: e.eventType as TimelineEventType,
    eventData: e.eventData as Record<string, unknown> | undefined,
    actorId: e.actorId || undefined,
    actorType: e.actorType as "user" | "system" | "ai" | undefined,
    createdAt: e.createdAt?.toISOString() || new Date().toISOString(),
  }));
}

/**
 * Helper to record common events
 */
export const timelineHelpers = {
  async contentCreated(contentId: string, actorId?: string): Promise<void> {
    await recordTimelineEvent(contentId, "created", {
      actorId,
      actorType: actorId ? "user" : "system",
    });
  },

  async contentEdited(contentId: string, changes: string[], actorId?: string): Promise<void> {
    await recordTimelineEvent(contentId, "edited", {
      eventData: { changes },
      actorId,
      actorType: actorId ? "user" : "system",
    });
  },

  async contentPublished(contentId: string, actorId?: string): Promise<void> {
    await recordTimelineEvent(contentId, "published", {
      actorId,
      actorType: actorId ? "user" : "system",
    });
  },

  async aeoGenerated(contentId: string, score: number): Promise<void> {
    await recordTimelineEvent(contentId, "aeo_generated", {
      eventData: { score },
      actorType: "ai",
    });
  },

  async revenueEvent(contentId: string, amount: number, source: string): Promise<void> {
    await recordTimelineEvent(contentId, "revenue_event", {
      eventData: { amount, source },
      actorType: "system",
    });
  },

  async repairAttempted(contentId: string, repairType: string): Promise<void> {
    await recordTimelineEvent(contentId, "repair_attempted", {
      eventData: { repairType },
      actorType: "system",
    });
  },
};
