/**
 * Content Lifecycle Event Bus
 * Phase 15A: Central event system for content state changes
 *
 * This is the canonical source of truth for content lifecycle events.
 * All downstream actions (search indexing, AEO generation, etc.) subscribe here.
 */

import { EventEmitter } from "node:events";
import { log } from "../lib/logger";

const eventLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[ContentEvents] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[ContentEvents] ${msg}`, undefined, data),
};

// ============================================================================
// Event Types
// ============================================================================

export interface ContentPublishedEvent {
  contentId: string;
  contentType: string;
  title: string;
  slug: string;
  previousStatus: string;
  publishedAt: Date;
  source: "manual" | "scheduled" | "auto-pilot";
}

export interface ContentUpdatedEvent {
  contentId: string;
  contentType: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: Date;
  changedFields?: string[];
}

export type ContentEventType = "content.published" | "content.updated";

// ============================================================================
// Event Bus Singleton
// ============================================================================

class ContentEventBus extends EventEmitter {
  private static instance: ContentEventBus;
  private readonly subscriberCount: Map<string, number> = new Map();
  private readonly eventStats: Map<string, { count: number; lastEmitted: Date | null }> = new Map();

  private constructor() {
    super();
    this.setMaxListeners(20); // Allow many subscribers

    // Initialize stats
    this.eventStats.set("content.published", { count: 0, lastEmitted: null });
    this.eventStats.set("content.updated", { count: 0, lastEmitted: null });
  }

  static getInstance(): ContentEventBus {
    if (!ContentEventBus.instance) {
      ContentEventBus.instance = new ContentEventBus();
    }
    return ContentEventBus.instance;
  }

  /**
   * Emit content.published event
   * Called when content status changes TO published
   */
  emitPublished(event: ContentPublishedEvent): void {
    const stats = this.eventStats.get("content.published")!;
    stats.count++;
    stats.lastEmitted = new Date();

    eventLogger.info("Emitting content.published", {
      contentId: event.contentId,
      type: event.contentType,
      source: event.source,
      subscriberCount: this.listenerCount("content.published"),
    });

    this.emit("content.published", event);
  }

  /**
   * Emit content.updated event
   * Called when published content is updated (but remains published)
   */
  emitUpdated(event: ContentUpdatedEvent): void {
    const stats = this.eventStats.get("content.updated")!;
    stats.count++;
    stats.lastEmitted = new Date();

    eventLogger.info("Emitting content.updated", {
      contentId: event.contentId,
      type: event.contentType,
      subscriberCount: this.listenerCount("content.updated"),
    });

    this.emit("content.updated", event);
  }

  /**
   * Subscribe to content.published events
   */
  onPublished(handler: (event: ContentPublishedEvent) => void | Promise<void>, name: string): void {
    this.on("content.published", async (event: ContentPublishedEvent) => {
      try {
        await handler(event);
        eventLogger.info(`Handler ${name} completed for content.published`, {
          contentId: event.contentId,
        });
      } catch (error) {
        eventLogger.error(`Handler ${name} failed for content.published`, {
          contentId: event.contentId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    const count = (this.subscriberCount.get("content.published") || 0) + 1;
    this.subscriberCount.set("content.published", count);

    eventLogger.info(`Subscribed handler: ${name}`, {
      event: "content.published",
      totalSubscribers: count,
    });
  }

  /**
   * Subscribe to content.updated events
   */
  onUpdated(handler: (event: ContentUpdatedEvent) => void | Promise<void>, name: string): void {
    this.on("content.updated", async (event: ContentUpdatedEvent) => {
      try {
        await handler(event);
        eventLogger.info(`Handler ${name} completed for content.updated`, {
          contentId: event.contentId,
        });
      } catch (error) {
        eventLogger.error(`Handler ${name} failed for content.updated`, {
          contentId: event.contentId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    const count = (this.subscriberCount.get("content.updated") || 0) + 1;
    this.subscriberCount.set("content.updated", count);

    eventLogger.info(`Subscribed handler: ${name}`, {
      event: "content.updated",
      totalSubscribers: count,
    });
  }

  /**
   * Get event bus statistics
   */
  getStats(): {
    subscribers: Record<string, number>;
    events: Record<string, { count: number; lastEmitted: string | null }>;
  } {
    const events: Record<string, { count: number; lastEmitted: string | null }> = {};
    this.eventStats.forEach((stats, key) => {
      events[key] = {
        count: stats.count,
        lastEmitted: stats.lastEmitted?.toISOString() || null,
      };
    });

    const subscribers: Record<string, number> = {};
    this.subscriberCount.forEach((count, key) => {
      subscribers[key] = count;
    });

    return { subscribers, events };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const contentEvents = ContentEventBus.getInstance();

/**
 * Helper function to emit publish event from routes
 */
export function emitContentPublished(
  contentId: string,
  contentType: string,
  title: string,
  slug: string,
  previousStatus: string,
  source: "manual" | "scheduled" | "auto-pilot" = "manual"
): void {
  contentEvents.emitPublished({
    contentId,
    contentType,
    title,
    slug,
    previousStatus,
    publishedAt: new Date(),
    source,
  });
}

/**
 * Helper function to emit update event from routes
 */
export function emitContentUpdated(
  contentId: string,
  contentType: string,
  title: string,
  slug: string,
  status: string,
  changedFields?: string[]
): void {
  contentEvents.emitUpdated({
    contentId,
    contentType,
    title,
    slug,
    status,
    updatedAt: new Date(),
    changedFields,
  });
}
