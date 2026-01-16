/**
 * User Journey Engine - Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config
vi.mock('../../../server/journeys/config', () => ({
  isUserJourneysEnabled: vi.fn(() => true),
  JOURNEY_CONFIG: {
    sessionTimeoutMs: 30 * 60 * 1000,
    maxStepsPerJourney: 100,
    cacheTtl: { summary: 300, funnel: 300, journey: 60 },
    eventBufferSize: 100,
    eventFlushIntervalMs: 5000,
  },
  getFunnelDefinition: vi.fn((name: string) => {
    if (name === 'test-funnel') {
      return {
        name: 'test-funnel',
        description: 'Test funnel',
        steps: [
          { name: 'Page View', eventType: 'page_view' },
          { name: 'Content Open', eventType: 'content_open' },
          { name: 'Conversion', eventType: 'conversion' },
        ],
        enabled: true,
      };
    }
    return null;
  }),
  getAllFunnels: vi.fn(() => []),
}));

// Mock logger
vi.mock('../../../server/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock db
vi.mock('../../../server/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
  },
}));

import { assembleJourney } from '../../../server/journeys/engine';
import type { JourneyEvent } from '../../../server/journeys/types';

describe('Journey Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assembleJourney', () => {
    it('should return null for empty events', () => {
      const result = assembleJourney([]);
      expect(result).toBeNull();
    });

    it('should assemble journey from events', () => {
      const events: JourneyEvent[] = [
        {
          id: 'e1',
          sessionId: 'session-1',
          visitorId: 'visitor-1',
          eventType: 'page_view',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          pageUrl: '/home',
        },
        {
          id: 'e2',
          sessionId: 'session-1',
          visitorId: 'visitor-1',
          eventType: 'content_open',
          timestamp: new Date('2024-01-01T10:01:00Z'),
          pageUrl: '/article/1',
          contentId: 'article-1',
        },
        {
          id: 'e3',
          sessionId: 'session-1',
          visitorId: 'visitor-1',
          eventType: 'affiliate_click',
          timestamp: new Date('2024-01-01T10:02:00Z'),
          pageUrl: '/article/1',
          affiliateId: 'booking-com',
        },
      ];

      const journey = assembleJourney(events);

      expect(journey).not.toBeNull();
      expect(journey!.sessionId).toBe('session-1');
      expect(journey!.visitorId).toBe('visitor-1');
      expect(journey!.steps).toHaveLength(3);
      expect(journey!.entryPage).toBe('/home');
      expect(journey!.exitPage).toBe('/article/1');
      expect(journey!.converted).toBe(false);
    });

    it('should detect conversion in journey', () => {
      const events: JourneyEvent[] = [
        {
          id: 'e1',
          sessionId: 'session-2',
          visitorId: 'visitor-2',
          eventType: 'page_view',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          pageUrl: '/home',
        },
        {
          id: 'e2',
          sessionId: 'session-2',
          visitorId: 'visitor-2',
          eventType: 'conversion',
          timestamp: new Date('2024-01-01T10:05:00Z'),
          pageUrl: '/thank-you',
          conversionValue: 100,
        },
      ];

      const journey = assembleJourney(events);

      expect(journey).not.toBeNull();
      expect(journey!.converted).toBe(true);
      expect(journey!.conversionValue).toBe(100);
    });

    it('should calculate duration between steps', () => {
      const events: JourneyEvent[] = [
        {
          id: 'e1',
          sessionId: 'session-3',
          visitorId: 'visitor-3',
          eventType: 'page_view',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          pageUrl: '/home',
        },
        {
          id: 'e2',
          sessionId: 'session-3',
          visitorId: 'visitor-3',
          eventType: 'search',
          timestamp: new Date('2024-01-01T10:00:30Z'),
          pageUrl: '/search',
          searchQuery: 'hotels',
        },
      ];

      const journey = assembleJourney(events);

      expect(journey).not.toBeNull();
      expect(journey!.steps[0].durationMs).toBe(0); // First step
      expect(journey!.steps[1].durationMs).toBe(30000); // 30 seconds
      expect(journey!.totalDurationMs).toBe(30000);
    });

    it('should sort events by timestamp', () => {
      const events: JourneyEvent[] = [
        {
          id: 'e2',
          sessionId: 'session-4',
          visitorId: 'visitor-4',
          eventType: 'content_open',
          timestamp: new Date('2024-01-01T10:01:00Z'),
          pageUrl: '/article',
        },
        {
          id: 'e1',
          sessionId: 'session-4',
          visitorId: 'visitor-4',
          eventType: 'page_view',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          pageUrl: '/home',
        },
      ];

      const journey = assembleJourney(events);

      expect(journey).not.toBeNull();
      expect(journey!.steps[0].eventType).toBe('page_view');
      expect(journey!.steps[1].eventType).toBe('content_open');
      expect(journey!.entryPage).toBe('/home');
    });

    it('should include userId when present', () => {
      const events: JourneyEvent[] = [
        {
          id: 'e1',
          sessionId: 'session-5',
          visitorId: 'visitor-5',
          userId: 'user-123',
          eventType: 'page_view',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          pageUrl: '/home',
        },
      ];

      const journey = assembleJourney(events);

      expect(journey).not.toBeNull();
      expect(journey!.userId).toBe('user-123');
    });
  });
});

describe('Funnel Conversion Calculation', () => {
  it('should calculate step conversion rates correctly', () => {
    // Mock funnel analysis calculation
    const steps = [
      { count: 1000, prevCount: 1000 },
      { count: 500, prevCount: 1000 },
      { count: 100, prevCount: 500 },
    ];

    const conversionRates = steps.map((step, idx) => {
      const prevCount = idx === 0 ? step.prevCount : steps[idx - 1].count;
      return prevCount > 0 ? (step.count / prevCount) * 100 : 0;
    });

    expect(conversionRates[0]).toBe(100); // 1000/1000 = 100%
    expect(conversionRates[1]).toBe(50);  // 500/1000 = 50%
    expect(conversionRates[2]).toBe(20);  // 100/500 = 20%
  });

  it('should calculate overall funnel conversion rate', () => {
    const totalEntered = 1000;
    const totalConverted = 100;

    const overallRate = totalEntered > 0 ? (totalConverted / totalEntered) * 100 : 0;

    expect(overallRate).toBe(10); // 100/1000 = 10%
  });

  it('should handle zero entries gracefully', () => {
    const totalEntered = 0;
    const totalConverted = 0;

    const overallRate = totalEntered > 0 ? (totalConverted / totalEntered) * 100 : 0;

    expect(overallRate).toBe(0);
  });

  it('should calculate dropoff rates correctly', () => {
    const steps = [
      { count: 1000 },
      { count: 700 },
      { count: 300 },
    ];

    const dropoffRates = steps.map((step, idx) => {
      if (idx === 0) return 0;
      const prevCount = steps[idx - 1].count;
      return prevCount > 0 ? ((prevCount - step.count) / prevCount) * 100 : 0;
    });

    expect(dropoffRates[0]).toBe(0);
    expect(dropoffRates[1]).toBe(30);  // (1000-700)/1000 = 30%
    expect(Math.round(dropoffRates[2] * 100) / 100).toBeCloseTo(57.14, 1); // (700-300)/700 ≈ 57.14%
  });
});
