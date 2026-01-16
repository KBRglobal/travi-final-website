/**
 * Destination Events API Routes
 * Public endpoint for querying events by destination
 */

import { Router } from 'express';
import { db } from '../db';
import { destinationEvents, destinations, type DestinationEvent } from '@shared/schema';
import { eq, and, desc, gte, lte, or, sql } from 'drizzle-orm';

export const eventsRoutes = Router();

eventsRoutes.get('/destination-events', async (req, res) => {
  try {
    const destinationId = req.query.destinationId as string;
    const eventType = req.query.eventType as string;
    const status = (req.query.status as string) || 'upcoming';
    const featured = req.query.featured === 'true';
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const conditions: any[] = [];

    if (destinationId) {
      const dest = await db
        .select({ id: destinations.id })
        .from(destinations)
        .where(or(
          eq(destinations.id, destinationId.toLowerCase()),
          eq(destinations.slug, `/destinations/${destinationId.toLowerCase()}`)
        ))
        .limit(1);

      if (dest.length === 0) {
        return res.json({
          success: true,
          data: [],
          total: 0,
          message: 'No destination found',
        });
      }
      conditions.push(eq(destinationEvents.destinationId, dest[0].id));
    }

    if (eventType) {
      conditions.push(eq(destinationEvents.eventType, eventType as any));
    }

    if (status !== 'all') {
      conditions.push(eq(destinationEvents.status, status as any));
    }

    if (featured) {
      conditions.push(eq(destinationEvents.featured, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const events = await db
      .select()
      .from(destinationEvents)
      .where(whereClause)
      .orderBy(destinationEvents.startDate, desc(destinationEvents.featured))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(destinationEvents)
      .where(whereClause);

    return res.json({
      success: true,
      data: events.map(formatEvent),
      total: Number(countResult[0]?.count || 0),
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Events Routes] Error fetching events:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
    });
  }
});

eventsRoutes.get('/destination-events/upcoming', async (req, res) => {
  try {
    const destinationId = req.query.destinationId as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const conditions: any[] = [
      gte(destinationEvents.startDate, now),
      lte(destinationEvents.startDate, threeMonthsFromNow),
    ];

    if (destinationId) {
      const dest = await db
        .select({ id: destinations.id })
        .from(destinations)
        .where(or(
          eq(destinations.id, destinationId.toLowerCase()),
          eq(destinations.slug, `/destinations/${destinationId.toLowerCase()}`)
        ))
        .limit(1);

      if (dest.length > 0) {
        conditions.push(eq(destinationEvents.destinationId, dest[0].id));
      }
    }

    const events = await db
      .select()
      .from(destinationEvents)
      .where(and(...conditions))
      .orderBy(destinationEvents.startDate)
      .limit(limit);

    return res.json({
      success: true,
      data: events.map(formatEvent),
      total: events.length,
    });
  } catch (error) {
    console.error('[Events Routes] Error fetching upcoming events:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming events',
    });
  }
});

eventsRoutes.get('/destination-events/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const event = await db
      .select()
      .from(destinationEvents)
      .where(eq(destinationEvents.id, id))
      .limit(1);

    if (event.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    return res.json({
      success: true,
      data: formatEvent(event[0]),
    });
  } catch (error) {
    console.error('[Events Routes] Error fetching event:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
    });
  }
});

function formatEvent(event: DestinationEvent) {
  const eventTypeLabels: Record<string, string> = {
    'festival': 'Festival',
    'sports': 'Sports',
    'conference': 'Conference',
    'concert': 'Concert',
    'exhibition': 'Exhibition',
    'cultural': 'Cultural',
    'holiday': 'Holiday',
  };

  const eventTypeIcons: Record<string, string> = {
    'festival': 'PartyPopper',
    'sports': 'Trophy',
    'conference': 'Users',
    'concert': 'Music',
    'exhibition': 'Palette',
    'cultural': 'Globe',
    'holiday': 'Calendar',
  };

  return {
    id: event.id,
    name: event.name,
    description: event.description,
    eventType: event.eventType,
    eventTypeLabel: eventTypeLabels[event.eventType] || event.eventType,
    eventTypeIcon: eventTypeIcons[event.eventType] || 'Calendar',
    venue: event.venue,
    venueAddress: event.venueAddress,
    startDate: event.startDate?.toISOString() || null,
    endDate: event.endDate?.toISOString() || null,
    ticketUrl: event.ticketUrl,
    imageUrl: event.imageUrl,
    priceRange: event.priceRange,
    tags: event.tags,
    status: event.status,
    featured: event.featured,
    translations: event.translations,
    destinationId: event.destinationId,
  };
}
