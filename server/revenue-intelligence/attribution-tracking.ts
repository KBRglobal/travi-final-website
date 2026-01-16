/**
 * Revenue Attribution Tracking
 * Feature Flag: ENABLE_REVENUE_TRACKING=true
 *
 * Tracks impressions, clicks, and conversions.
 * Links events to contentId, entityId, affiliateId.
 * Uses database for persistent storage (reuses analytics/events infrastructure).
 */

import { createLogger } from '../lib/logger';
import { db } from '../db';
import { analyticsEvents } from '@shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import {
  isRevenueTrackingEnabled,
  TIMEOUTS,
} from './config';
import type {
  RevenueEvent,
  RevenueEventType,
  AttributionSummary,
  AffiliatePartnerType,
} from './types';

const logger = createLogger('attribution-tracking');

// ============================================================================
// Ring Buffer for Recent Events (Bounded Memory)
// ============================================================================

class EventRingBuffer {
  private buffer: RevenueEvent[] = [];
  private readonly maxSize: number;
  private writeIndex = 0;
  private filled = false;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  push(event: RevenueEvent): void {
    if (this.writeIndex >= this.maxSize) {
      this.writeIndex = 0;
      this.filled = true;
    }
    this.buffer[this.writeIndex] = event;
    this.writeIndex++;
  }

  getRecent(count: number): RevenueEvent[] {
    const available = this.filled ? this.maxSize : this.writeIndex;
    const toReturn = Math.min(count, available);
    const result: RevenueEvent[] = [];

    for (let i = 0; i < toReturn; i++) {
      const idx = (this.writeIndex - 1 - i + this.maxSize) % this.maxSize;
      if (this.buffer[idx]) {
        result.push(this.buffer[idx]);
      }
    }

    return result;
  }

  getStats(): { size: number; maxSize: number; filled: boolean } {
    return {
      size: this.filled ? this.maxSize : this.writeIndex,
      maxSize: this.maxSize,
      filled: this.filled,
    };
  }

  clear(): void {
    this.buffer = [];
    this.writeIndex = 0;
    this.filled = false;
  }
}

// Keep last 10,000 events in memory for fast access
const recentEvents = new EventRingBuffer(10_000);

// ============================================================================
// Event ID Generation
// ============================================================================

function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `rev_${timestamp}_${random}`;
}

// ============================================================================
// Event Tracking
// ============================================================================

/**
 * Track a revenue-related event
 */
export async function trackRevenueEvent(
  eventType: RevenueEventType,
  data: {
    contentId: string;
    entityId?: string;
    affiliateId: AffiliatePartnerType;
    zoneId: string;
    trackingId: string;
    sessionId?: string;
    userId?: string;
    value?: number;
    currency?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<RevenueEvent | null> {
  if (!isRevenueTrackingEnabled()) {
    logger.debug({ eventType, contentId: data.contentId }, 'Revenue tracking disabled');
    return null;
  }

  const event: RevenueEvent = {
    id: generateEventId(),
    eventType,
    contentId: data.contentId,
    entityId: data.entityId,
    affiliateId: data.affiliateId,
    zoneId: data.zoneId,
    trackingId: data.trackingId,
    sessionId: data.sessionId,
    userId: data.userId,
    value: data.value,
    currency: data.currency || 'USD',
    timestamp: new Date(),
    metadata: data.metadata,
  };

  // Add to ring buffer immediately (no blocking)
  recentEvents.push(event);

  // Persist to database with timeout
  const persistWithTimeout = new Promise<void>((resolve) => {
    const timeoutId = setTimeout(() => {
      logger.warn({ eventId: event.id }, 'Revenue event persist timeout');
      resolve();
    }, TIMEOUTS.attributionWrite);

    persistEvent(event)
      .then(() => {
        clearTimeout(timeoutId);
        resolve();
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        logger.error({ eventId: event.id, error }, 'Failed to persist revenue event');
        resolve();
      });
  });

  // Don't await - fire and forget for non-blocking tracking
  persistWithTimeout.catch(() => {});

  logger.info({
    eventType,
    eventId: event.id,
    contentId: data.contentId,
    affiliateId: data.affiliateId,
    trackingId: data.trackingId,
  }, 'Revenue event tracked');

  return event;
}

/**
 * Persist event to database
 */
async function persistEvent(event: RevenueEvent): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({
      eventType: `revenue.${event.eventType}`,
      contentId: event.contentId,
      userId: event.userId,
      sessionId: event.sessionId,
      properties: {
        entityId: event.entityId,
        affiliateId: event.affiliateId,
        zoneId: event.zoneId,
        trackingId: event.trackingId,
        value: event.value,
        currency: event.currency,
        ...event.metadata,
      },
      timestamp: event.timestamp,
    });
  } catch (error) {
    // Re-throw to be caught by caller
    throw error;
  }
}

// ============================================================================
// Convenience Tracking Functions
// ============================================================================

/**
 * Track an impression event
 */
export function trackImpression(data: {
  contentId: string;
  entityId?: string;
  affiliateId: AffiliatePartnerType;
  zoneId: string;
  trackingId: string;
  sessionId?: string;
  userId?: string;
}): Promise<RevenueEvent | null> {
  return trackRevenueEvent('impression', data);
}

/**
 * Track a click event
 */
export function trackClick(data: {
  contentId: string;
  entityId?: string;
  affiliateId: AffiliatePartnerType;
  zoneId: string;
  trackingId: string;
  sessionId?: string;
  userId?: string;
}): Promise<RevenueEvent | null> {
  return trackRevenueEvent('click', data);
}

/**
 * Track a conversion event
 */
export function trackConversion(data: {
  contentId: string;
  entityId?: string;
  affiliateId: AffiliatePartnerType;
  zoneId: string;
  trackingId: string;
  sessionId?: string;
  userId?: string;
  value: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}): Promise<RevenueEvent | null> {
  return trackRevenueEvent('conversion', data);
}

// ============================================================================
// Attribution Queries
// ============================================================================

/**
 * Get attribution summary for a content piece
 */
export async function getAttributionSummary(
  contentId: string,
  startDate: Date,
  endDate: Date
): Promise<AttributionSummary | null> {
  if (!isRevenueTrackingEnabled()) {
    return null;
  }

  try {
    // Query events from database
    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.contentId, contentId),
          sql`${analyticsEvents.eventType} LIKE 'revenue.%'`,
          gte(analyticsEvents.timestamp, startDate),
          lte(analyticsEvents.timestamp, endDate)
        )
      )
      .orderBy(desc(analyticsEvents.timestamp))
      .limit(10000); // Bounded query

    // Aggregate metrics
    let impressions = 0;
    let clicks = 0;
    let conversions = 0;
    let revenue = 0;

    const byAffiliate: Record<string, { clicks: number; conversions: number; revenue: number }> = {};
    const byEntity: Record<string, { impressions: number; clicks: number; conversions: number; revenue: number }> = {};

    for (const event of events) {
      const props = event.properties as Record<string, unknown> || {};
      const eventType = event.eventType?.replace('revenue.', '') as RevenueEventType;
      const affiliateId = props.affiliateId as string || 'unknown';
      const entityId = props.entityId as string || 'unknown';
      const value = (props.value as number) || 0;

      // Overall counts
      if (eventType === 'impression') impressions++;
      if (eventType === 'click') clicks++;
      if (eventType === 'conversion') {
        conversions++;
        revenue += value;
      }

      // By affiliate
      if (!byAffiliate[affiliateId]) {
        byAffiliate[affiliateId] = { clicks: 0, conversions: 0, revenue: 0 };
      }
      if (eventType === 'click') byAffiliate[affiliateId].clicks++;
      if (eventType === 'conversion') {
        byAffiliate[affiliateId].conversions++;
        byAffiliate[affiliateId].revenue += value;
      }

      // By entity
      if (!byEntity[entityId]) {
        byEntity[entityId] = { impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
      }
      if (eventType === 'impression') byEntity[entityId].impressions++;
      if (eventType === 'click') byEntity[entityId].clicks++;
      if (eventType === 'conversion') {
        byEntity[entityId].conversions++;
        byEntity[entityId].revenue += value;
      }
    }

    // Calculate rates
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const revenuePerImpression = impressions > 0 ? revenue / impressions : 0;

    // Format affiliate breakdown
    const topAffiliates = Object.entries(byAffiliate)
      .map(([affiliateId, data]) => ({
        affiliateId: affiliateId as AffiliatePartnerType,
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Format entity breakdown
    const entityBreakdown = Object.entries(byEntity)
      .map(([entityId, data]) => ({
        entityId,
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      contentId,
      impressions,
      clicks,
      conversions,
      revenue,
      ctr: Math.round(ctr * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      revenuePerImpression: Math.round(revenuePerImpression * 100) / 100,
      topAffiliates,
      byEntity: entityBreakdown,
      period: { start: startDate, end: endDate },
    };
  } catch (error) {
    logger.error({ contentId, error }, 'Failed to get attribution summary');
    return null;
  }
}

/**
 * Get recent events from ring buffer (fast, in-memory)
 */
export function getRecentEvents(count: number = 100): RevenueEvent[] {
  return recentEvents.getRecent(count);
}

/**
 * Get aggregate stats across all content for a period
 */
export async function getAggregateStats(
  startDate: Date,
  endDate: Date
): Promise<{
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  conversionRate: number;
} | null> {
  if (!isRevenueTrackingEnabled()) {
    return null;
  }

  try {
    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          sql`${analyticsEvents.eventType} LIKE 'revenue.%'`,
          gte(analyticsEvents.timestamp, startDate),
          lte(analyticsEvents.timestamp, endDate)
        )
      )
      .limit(100000); // Bounded query

    let impressions = 0;
    let clicks = 0;
    let conversions = 0;
    let revenue = 0;

    for (const event of events) {
      const props = event.properties as Record<string, unknown> || {};
      const eventType = event.eventType?.replace('revenue.', '') as RevenueEventType;
      const value = (props.value as number) || 0;

      if (eventType === 'impression') impressions++;
      if (eventType === 'click') clicks++;
      if (eventType === 'conversion') {
        conversions++;
        revenue += value;
      }
    }

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

    return {
      impressions,
      clicks,
      conversions,
      revenue,
      ctr: Math.round(ctr * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get aggregate stats');
    return null;
  }
}

/**
 * Get events by tracking ID (for debugging/support)
 */
export async function getEventsByTrackingId(
  trackingId: string,
  limit: number = 100
): Promise<RevenueEvent[]> {
  if (!isRevenueTrackingEnabled()) {
    return [];
  }

  try {
    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          sql`${analyticsEvents.eventType} LIKE 'revenue.%'`,
          sql`${analyticsEvents.properties}->>'trackingId' = ${trackingId}`
        )
      )
      .orderBy(desc(analyticsEvents.timestamp))
      .limit(limit);

    return events.map(e => ({
      id: e.id,
      eventType: (e.eventType?.replace('revenue.', '') || 'unknown') as RevenueEventType,
      contentId: e.contentId || '',
      entityId: (e.properties as Record<string, unknown>)?.entityId as string,
      affiliateId: ((e.properties as Record<string, unknown>)?.affiliateId || 'generic') as AffiliatePartnerType,
      zoneId: (e.properties as Record<string, unknown>)?.zoneId as string || '',
      trackingId: (e.properties as Record<string, unknown>)?.trackingId as string || '',
      sessionId: e.sessionId || undefined,
      userId: e.userId || undefined,
      value: (e.properties as Record<string, unknown>)?.value as number,
      currency: (e.properties as Record<string, unknown>)?.currency as string || 'USD',
      timestamp: e.timestamp,
      metadata: e.properties as Record<string, unknown>,
    }));
  } catch (error) {
    logger.error({ trackingId, error }, 'Failed to get events by tracking ID');
    return [];
  }
}

// ============================================================================
// Buffer Stats
// ============================================================================

export function getBufferStats(): { size: number; maxSize: number; filled: boolean } {
  return recentEvents.getStats();
}

export function clearEventBuffer(): void {
  recentEvents.clear();
  logger.info({}, 'Event buffer cleared');
}

// ============================================================================
// Tracking Status
// ============================================================================

export interface TrackingStatus {
  enabled: boolean;
  bufferStats: { size: number; maxSize: number; filled: boolean };
}

export function getTrackingStatus(): TrackingStatus {
  return {
    enabled: isRevenueTrackingEnabled(),
    bufferStats: getBufferStats(),
  };
}
