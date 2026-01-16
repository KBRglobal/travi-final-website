/**
 * Revenue Intelligence Layer - Attribution
 * Multi-touch attribution for content value
 */

import {
  RevenueEvent,
  TouchPoint,
  TouchPointType,
  AttributionModel,
  AttributionModelType,
  ATTRIBUTION_MODELS,
  DEFAULT_REVENUE_CONFIG,
} from './types';

// Revenue events store (in-memory, would be DB in production)
const revenueEvents: Map<string, RevenueEvent> = new Map();
const MAX_EVENTS = 100000;

function generateEventId(): string {
  return `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getAttributionModel(type?: AttributionModelType): AttributionModel {
  const modelType = type || DEFAULT_REVENUE_CONFIG.attributionModel;
  return ATTRIBUTION_MODELS[modelType];
}

export function assignTouchpointTypes(touchpoints: TouchPoint[]): TouchPoint[] {
  if (touchpoints.length === 0) return [];

  return touchpoints.map((tp, index) => {
    let type: TouchPointType;

    if (index === 0) {
      type = 'first';
    } else if (index === touchpoints.length - 1) {
      type = 'last';
    } else {
      type = 'assist';
    }

    return { ...tp, type, position: index };
  });
}

export function calculateAttribution(
  event: RevenueEvent,
  model?: AttributionModel
): Map<string, number> {
  const attribution = new Map<string, number>();
  const attrModel = model || getAttributionModel();

  if (event.touchpoints.length === 0) {
    if (event.contentId) {
      attribution.set(event.contentId, event.amount);
    }
    return attribution;
  }

  const typedTouchpoints = assignTouchpointTypes(event.touchpoints);

  // Apply time decay if using time_decay model
  const now = event.createdAt.getTime();
  const decayFactor = 0.9; // 10% decay per day

  for (const tp of typedTouchpoints) {
    const weight = attrModel.touchpointWeights[tp.type];

    // Apply time decay
    let finalWeight = weight;
    if (attrModel.type === 'time_decay') {
      const daysSince = (now - tp.timestamp.getTime()) / (24 * 60 * 60 * 1000);
      finalWeight = weight * Math.pow(decayFactor, daysSince);
    }

    const attributedValue = event.amount * finalWeight;
    const current = attribution.get(tp.contentId) || 0;
    attribution.set(tp.contentId, current + attributedValue);
  }

  // Normalize to ensure total equals event amount
  const total = Array.from(attribution.values()).reduce((a, b) => a + b, 0);
  if (total > 0) {
    const normalizationFactor = event.amount / total;
    for (const [contentId, value] of attribution) {
      attribution.set(contentId, value * normalizationFactor);
    }
  }

  return attribution;
}

export function recordRevenueEvent(event: Omit<RevenueEvent, 'id'>): RevenueEvent {
  // Enforce max events limit
  if (revenueEvents.size >= MAX_EVENTS) {
    // Remove oldest 10%
    const toRemove = Array.from(revenueEvents.keys()).slice(0, MAX_EVENTS / 10);
    for (const id of toRemove) {
      revenueEvents.delete(id);
    }
  }

  const fullEvent: RevenueEvent = {
    ...event,
    id: generateEventId(),
    touchpoints: assignTouchpointTypes(event.touchpoints),
  };

  revenueEvents.set(fullEvent.id, fullEvent);
  return fullEvent;
}

export function getRevenueEvents(filters?: {
  contentId?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  type?: string;
  limit?: number;
}): RevenueEvent[] {
  let events = Array.from(revenueEvents.values());

  if (filters?.contentId) {
    events = events.filter(
      e => e.contentId === filters.contentId ||
           e.touchpoints.some(tp => tp.contentId === filters.contentId)
    );
  }

  if (filters?.entityId) {
    events = events.filter(e => e.entityId === filters.entityId);
  }

  if (filters?.startDate) {
    events = events.filter(e => e.createdAt >= filters.startDate!);
  }

  if (filters?.endDate) {
    events = events.filter(e => e.createdAt <= filters.endDate!);
  }

  if (filters?.type) {
    events = events.filter(e => e.type === filters.type);
  }

  events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (filters?.limit) {
    events = events.slice(0, filters.limit);
  }

  return events;
}

export function getEventById(eventId: string): RevenueEvent | null {
  return revenueEvents.get(eventId) || null;
}

export function getAttributionForContent(
  contentId: string,
  startDate?: Date,
  endDate?: Date
): {
  directRevenue: number;
  assistedRevenue: number;
  totalRevenue: number;
  conversions: number;
  assists: number;
} {
  const events = getRevenueEvents({ startDate, endDate });

  let directRevenue = 0;
  let assistedRevenue = 0;
  let conversions = 0;
  let assists = 0;

  for (const event of events) {
    const attribution = calculateAttribution(event);
    const attributedAmount = attribution.get(contentId) || 0;

    if (attributedAmount > 0) {
      // Check if direct (last touch) or assisted
      const lastTouchpoint = event.touchpoints[event.touchpoints.length - 1];
      if (lastTouchpoint?.contentId === contentId) {
        directRevenue += attributedAmount;
        conversions++;
      } else {
        assistedRevenue += attributedAmount;
        assists++;
      }
    }
  }

  return {
    directRevenue,
    assistedRevenue,
    totalRevenue: directRevenue + assistedRevenue,
    conversions,
    assists,
  };
}

export function getTotalRevenue(startDate?: Date, endDate?: Date): number {
  const events = getRevenueEvents({ startDate, endDate });
  return events.reduce((sum, e) => sum + e.amount, 0);
}

export function getConversionPaths(limit = 20): Array<{
  path: string[];
  frequency: number;
  totalRevenue: number;
}> {
  const pathMap = new Map<string, { frequency: number; revenue: number }>();

  for (const event of revenueEvents.values()) {
    if (event.touchpoints.length === 0) continue;

    const pathKey = event.touchpoints.map(tp => tp.contentId).join(' > ');
    const existing = pathMap.get(pathKey) || { frequency: 0, revenue: 0 };
    existing.frequency++;
    existing.revenue += event.amount;
    pathMap.set(pathKey, existing);
  }

  return Array.from(pathMap.entries())
    .map(([path, data]) => ({
      path: path.split(' > '),
      frequency: data.frequency,
      totalRevenue: data.revenue,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}
