/**
 * User Journey & Funnel Engine - Core Engine
 * Feature Flag: ENABLE_USER_JOURNEYS=true
 */

import { createLogger } from '../lib/logger';
import { db } from '../db';
import { analyticsEvents, userJourneys, journeyTouchpoints } from '@shared/schema';
import { eq, and, gte, lte, sql, desc, asc } from 'drizzle-orm';
import { isUserJourneysEnabled, JOURNEY_CONFIG, getFunnelDefinition, getAllFunnels } from './config';
import type {
  JourneyEvent,
  JourneyEventType,
  JourneyStep,
  UserJourney,
  FunnelAnalysis,
  FunnelStepAnalysis,
  JourneySummary,
  JourneyCacheEntry,
} from './types';

const logger = createLogger('journey-engine');

// ============================================================================
// Event Ring Buffer (Bounded Memory)
// ============================================================================

class EventBuffer {
  private buffer: JourneyEvent[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  push(event: JourneyEvent): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }
    this.buffer.push(event);
  }

  getAll(): JourneyEvent[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
  }

  size(): number {
    return this.buffer.length;
  }
}

const eventBuffer = new EventBuffer(JOURNEY_CONFIG.eventBufferSize);

// ============================================================================
// LRU Cache
// ============================================================================

class JourneyCache {
  private cache = new Map<string, JourneyCacheEntry<unknown>>();
  private readonly maxSize = 500;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const journeyCache = new JourneyCache();

// ============================================================================
// Event ID Generation
// ============================================================================

function generateEventId(): string {
  return `je_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

function generateJourneyId(): string {
  return `jrn_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

// ============================================================================
// Track Journey Event
// ============================================================================

export async function trackJourneyEvent(
  eventType: JourneyEventType,
  data: {
    sessionId: string;
    visitorId: string;
    userId?: string;
    pageUrl: string;
    referrer?: string;
    contentId?: string;
    searchQuery?: string;
    affiliateId?: string;
    conversionValue?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<JourneyEvent | null> {
  if (!isUserJourneysEnabled()) {
    return null;
  }

  const event: JourneyEvent = {
    id: generateEventId(),
    eventType,
    timestamp: new Date(),
    ...data,
  };

  // Add to buffer
  eventBuffer.push(event);

  // Persist to DB (fire and forget)
  persistEvent(event).catch(err => {
    logger.error({ error: err, eventId: event.id }, 'Failed to persist journey event');
  });

  logger.debug({
    eventType,
    sessionId: data.sessionId,
    eventId: event.id,
  }, 'Journey event tracked');

  return event;
}

async function persistEvent(event: JourneyEvent): Promise<void> {
  await db.insert(analyticsEvents).values({
    eventType: `journey.${event.eventType}`,
    sessionId: event.sessionId,
    userId: event.userId,
    contentId: event.contentId,
    properties: {
      visitorId: event.visitorId,
      pageUrl: event.pageUrl,
      referrer: event.referrer,
      searchQuery: event.searchQuery,
      affiliateId: event.affiliateId,
      conversionValue: event.conversionValue,
      ...event.metadata,
    },
    timestamp: event.timestamp,
  } as any);
}

// ============================================================================
// Assemble Journey from Events
// ============================================================================

export function assembleJourney(events: JourneyEvent[]): UserJourney | null {
  if (events.length === 0) return null;

  // Sort by timestamp
  const sorted = [...events].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const steps: JourneyStep[] = sorted.map((event, idx) => {
    const prev = idx > 0 ? sorted[idx - 1] : null;
    return {
      eventType: event.eventType,
      timestamp: event.timestamp,
      pageUrl: event.pageUrl,
      contentId: event.contentId,
      durationMs: prev
        ? event.timestamp.getTime() - prev.timestamp.getTime()
        : 0,
      metadata: event.metadata,
    };
  });

  const hasConversion = sorted.some(e => e.eventType === 'conversion');
  const conversionEvent = sorted.find(e => e.eventType === 'conversion');

  return {
    id: generateJourneyId(),
    sessionId: first.sessionId,
    userId: first.userId,
    visitorId: first.visitorId,
    steps,
    startedAt: first.timestamp,
    endedAt: last.timestamp,
    totalDurationMs: last.timestamp.getTime() - first.timestamp.getTime(),
    converted: hasConversion,
    conversionValue: conversionEvent?.conversionValue,
    entryPage: first.pageUrl,
    exitPage: last.pageUrl,
  };
}

// ============================================================================
// Funnel Analysis
// ============================================================================

export async function analyzeFunnel(
  funnelName: string,
  startDate: Date,
  endDate: Date
): Promise<FunnelAnalysis | null> {
  if (!isUserJourneysEnabled()) {
    return null;
  }

  const cacheKey = `funnel:${funnelName}:${startDate.toISOString()}:${endDate.toISOString()}`;
  const cached = journeyCache.get<FunnelAnalysis>(cacheKey);
  if (cached) return cached;

  const funnel = getFunnelDefinition(funnelName);
  if (!funnel) {
    logger.warn({ funnelName }, 'Funnel definition not found');
    return null;
  }

  try {
    // Get all journey events in period
    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          sql`${analyticsEvents.eventType} LIKE 'journey.%'`,
          gte(analyticsEvents.timestamp, startDate),
          lte(analyticsEvents.timestamp, endDate)
        )
      )
      .orderBy(asc(analyticsEvents.timestamp))
      .limit(50000);

    // Group by session
    const sessionEvents = new Map<string, typeof events>();
    for (const event of events) {
      const sessionId = event.sessionId || 'unknown';
      if (!sessionEvents.has(sessionId)) {
        sessionEvents.set(sessionId, []);
      }
      sessionEvents.get(sessionId)!.push(event);
    }

    // Analyze funnel steps
    const stepCounts: number[] = new Array(funnel.steps.length).fill(0);
    const stepTimes: number[][] = funnel.steps.map(() => []);
    let conversions = 0;
    let totalConversionTime = 0;

    for (const [, sessionEvts] of sessionEvents) {
      let currentStepIdx = 0;
      let prevStepTime: Date | null = null;

      for (const event of sessionEvts) {
        const eventType = event.eventType?.replace('journey.', '') as JourneyEventType;

        if (currentStepIdx < funnel.steps.length) {
          const expectedStep = funnel.steps[currentStepIdx];

          if (eventType === expectedStep.eventType) {
            stepCounts[currentStepIdx]++;

            if (prevStepTime) {
              const timeDiff = event.timestamp.getTime() - prevStepTime.getTime();
              stepTimes[currentStepIdx].push(timeDiff);
            }

            prevStepTime = event.timestamp;
            currentStepIdx++;
          }
        }
      }

      // Check if completed funnel
      if (currentStepIdx === funnel.steps.length) {
        conversions++;
        const firstEvent = sessionEvts[0];
        const lastStepEvent = sessionEvts.find(e =>
          e.eventType?.replace('journey.', '') === funnel.steps[funnel.steps.length - 1].eventType
        );
        if (firstEvent && lastStepEvent) {
          totalConversionTime += lastStepEvent.timestamp.getTime() - firstEvent.timestamp.getTime();
        }
      }
    }

    const totalEntered = stepCounts[0] || 0;
    const steps: FunnelStepAnalysis[] = funnel.steps.map((step, idx) => {
      const count = stepCounts[idx];
      const prevCount = idx > 0 ? stepCounts[idx - 1] : totalEntered;
      const times = stepTimes[idx];

      return {
        stepName: step.name,
        eventType: step.eventType,
        count,
        conversionRate: prevCount > 0 ? (count / prevCount) * 100 : 0,
        dropoffRate: prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0,
        avgTimeFromPrevious: times.length > 0
          ? times.reduce((a, b) => a + b, 0) / times.length
          : 0,
      };
    });

    const result: FunnelAnalysis = {
      funnelName,
      totalEntered,
      steps,
      overallConversionRate: totalEntered > 0 ? (conversions / totalEntered) * 100 : 0,
      avgTimeToConversion: conversions > 0 ? totalConversionTime / conversions : 0,
      period: { start: startDate, end: endDate },
    };

    journeyCache.set(cacheKey, result, JOURNEY_CONFIG.cacheTtl.funnel);

    return result;
  } catch (error) {
    logger.error({ error, funnelName }, 'Failed to analyze funnel');
    return null;
  }
}

// ============================================================================
// Journey Summary
// ============================================================================

export async function getJourneySummary(
  startDate: Date,
  endDate: Date
): Promise<JourneySummary | null> {
  if (!isUserJourneysEnabled()) {
    return null;
  }

  const cacheKey = `summary:${startDate.toISOString()}:${endDate.toISOString()}`;
  const cached = journeyCache.get<JourneySummary>(cacheKey);
  if (cached) return cached;

  try {
    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          sql`${analyticsEvents.eventType} LIKE 'journey.%'`,
          gte(analyticsEvents.timestamp, startDate),
          lte(analyticsEvents.timestamp, endDate)
        )
      )
      .limit(100000);

    // Group by session
    const sessions = new Map<string, typeof events>();
    for (const event of events) {
      const sid = event.sessionId || 'unknown';
      if (!sessions.has(sid)) sessions.set(sid, []);
      sessions.get(sid)!.push(event);
    }

    let totalConversions = 0;
    let totalDuration = 0;
    let totalSteps = 0;
    const entryPages = new Map<string, number>();
    const exitPages = new Map<string, number>();
    const eventBreakdown: Record<string, number> = {};

    for (const [, sessionEvts] of sessions) {
      const sorted = sessionEvts.sort((a, b) =>
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      if (sorted.length > 0) {
        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        const entryUrl = ((first as any).properties as Record<string, unknown>)?.pageUrl as string || '/';
        const exitUrl = ((last as any).properties as Record<string, unknown>)?.pageUrl as string || '/';

        entryPages.set(entryUrl, (entryPages.get(entryUrl) || 0) + 1);
        exitPages.set(exitUrl, (exitPages.get(exitUrl) || 0) + 1);

        totalDuration += last.timestamp.getTime() - first.timestamp.getTime();
        totalSteps += sorted.length;

        const hasConversion = sorted.some(e => (e.eventType as any) === 'journey.conversion');
        if (hasConversion) totalConversions++;
      }

      for (const event of sessionEvts) {
        const eventType = event.eventType?.replace('journey.', '') || 'unknown';
        eventBreakdown[eventType] = (eventBreakdown[eventType] || 0) + 1;
      }
    }

    const totalJourneys = sessions.size;

    const result: JourneySummary = {
      totalJourneys,
      totalConversions,
      conversionRate: totalJourneys > 0 ? (totalConversions / totalJourneys) * 100 : 0,
      avgJourneyDuration: totalJourneys > 0 ? totalDuration / totalJourneys : 0,
      avgStepsPerJourney: totalJourneys > 0 ? totalSteps / totalJourneys : 0,
      topEntryPages: Array.from(entryPages.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page, count]) => ({ page, count })),
      topExitPages: Array.from(exitPages.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page, count]) => ({ page, count })),
      eventBreakdown: eventBreakdown as Record<JourneyEventType, number>,
      period: { start: startDate, end: endDate },
    };

    journeyCache.set(cacheKey, result, JOURNEY_CONFIG.cacheTtl.summary);

    return result;
  } catch (error) {
    logger.error({ error }, 'Failed to get journey summary');
    return null;
  }
}

// ============================================================================
// Get Available Funnels
// ============================================================================

export function getAvailableFunnels() {
  return getAllFunnels();
}

// ============================================================================
// Clear Cache
// ============================================================================

export function clearJourneyCache(): void {
  journeyCache.clear();
}

// ============================================================================
// Engine Status
// ============================================================================

export function getJourneyEngineStatus() {
  return {
    enabled: isUserJourneysEnabled(),
    bufferSize: eventBuffer.size(),
    funnelCount: getAllFunnels().length,
  };
}
