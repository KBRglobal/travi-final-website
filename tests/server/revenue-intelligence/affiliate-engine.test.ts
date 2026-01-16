/**
 * Affiliate Decision Engine Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the config before importing the engine
vi.mock('../../../server/revenue-intelligence/config', () => ({
  isAffiliateEngineEnabled: vi.fn(() => true),
  AFFILIATE_PARTNERS: {
    'booking-com': {
      id: 'booking-com',
      name: 'Booking.com',
      baseUrl: 'https://www.booking.com',
      commissionRate: 0.04,
      priority: 1,
      supportedEntityTypes: ['hotel', 'accommodation'],
      trackingParams: { aid: 'TEST_AID' },
      active: true,
    },
    'getyourguide': {
      id: 'getyourguide',
      name: 'GetYourGuide',
      baseUrl: 'https://www.getyourguide.com',
      commissionRate: 0.08,
      priority: 1,
      supportedEntityTypes: ['experience', 'tour', 'activity'],
      trackingParams: { partner_id: 'TEST_PID' },
      active: true,
    },
    'viator': {
      id: 'viator',
      name: 'Viator',
      baseUrl: 'https://www.viator.com',
      commissionRate: 0.08,
      priority: 2,
      supportedEntityTypes: ['experience', 'tour'],
      trackingParams: { pid: 'TEST_VID' },
      active: true,
    },
    'generic': {
      id: 'generic',
      name: 'Generic',
      baseUrl: '',
      commissionRate: 0,
      priority: 100,
      supportedEntityTypes: [],
      trackingParams: {},
      active: false,
    },
  },
  CACHE_CONFIG: {
    affiliateDecision: {
      ttlMs: 300000,
      maxSize: 5000,
    },
  },
  TIMEOUTS: {
    affiliateDecision: 200,
  },
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

import {
  makeAffiliateDecisions,
  getDecisionForEntity,
  getAvailablePartners,
  getAllActivePartners,
  getPartnerById,
  clearDecisionCache,
  getAffiliateEngineStatus,
} from '../../../server/revenue-intelligence/affiliate-decision-engine';
import type {
  AffiliateDecisionContext,
  EntityReference,
} from '../../../server/revenue-intelligence/types';

describe('Affiliate Decision Engine', () => {
  beforeEach(() => {
    clearDecisionCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('makeAffiliateDecisions', () => {
    it('should return decisions for affiliate-eligible entities', async () => {
      const context: AffiliateDecisionContext = {
        contentId: 'test-content-1',
        contentType: 'article',
        entities: [
          {
            id: 'hotel-1',
            type: 'hotel',
            name: 'Test Hotel',
            monetizable: true,
            affiliateEligible: true,
          },
        ],
      };

      const result = await makeAffiliateDecisions(context);

      expect(result.decisions).toHaveLength(1);
      expect(result.decisions[0].partnerId).toBe('booking-com');
      expect(result.decisions[0].link).toContain('/go/booking-com/hotel-1');
      expect(result.decisions[0].trackingId).toBeTruthy();
      expect(result.decisions[0].disclosure).toContain('affiliate');
      expect(result.decisions[0].rel).toBe('nofollow sponsored');
    });

    it('should return fallback when no entities are eligible', async () => {
      const context: AffiliateDecisionContext = {
        contentId: 'test-content-2',
        contentType: 'article',
        entities: [
          {
            id: 'entity-1',
            type: 'city',
            name: 'Test City',
            monetizable: false,
            affiliateEligible: false,
          },
        ],
      };

      const result = await makeAffiliateDecisions(context);

      expect(result.decisions).toHaveLength(0);
      expect(result.fallback).toBeDefined();
      expect(result.fallback?.type).toBe('internal-search');
    });

    it('should select GetYourGuide for experience entities', async () => {
      const context: AffiliateDecisionContext = {
        contentId: 'test-content-3',
        contentType: 'guide',
        entities: [
          {
            id: 'exp-1',
            type: 'experience',
            name: 'City Tour',
            monetizable: true,
            affiliateEligible: true,
          },
        ],
      };

      const result = await makeAffiliateDecisions(context);

      expect(result.decisions).toHaveLength(1);
      expect(result.decisions[0].partnerId).toBe('getyourguide');
    });

    it('should produce deterministic results for same context', async () => {
      const context: AffiliateDecisionContext = {
        contentId: 'test-content-4',
        contentType: 'article',
        entities: [
          {
            id: 'hotel-2',
            type: 'hotel',
            name: 'Another Hotel',
            monetizable: true,
            affiliateEligible: true,
          },
        ],
      };

      const result1 = await makeAffiliateDecisions(context);
      const result2 = await makeAffiliateDecisions(context);

      expect(result1.contextHash).toBe(result2.contextHash);
      expect(result1.decisions.map(d => d.partnerId)).toEqual(
        result2.decisions.map(d => d.partnerId)
      );
    });

    it('should handle multiple entities with different types', async () => {
      const context: AffiliateDecisionContext = {
        contentId: 'test-content-5',
        contentType: 'destination',
        entities: [
          {
            id: 'hotel-3',
            type: 'hotel',
            name: 'Beach Hotel',
            monetizable: true,
            affiliateEligible: true,
          },
          {
            id: 'tour-1',
            type: 'tour',
            name: 'Snorkeling Tour',
            monetizable: true,
            affiliateEligible: true,
          },
        ],
      };

      const result = await makeAffiliateDecisions(context);

      expect(result.decisions.length).toBeGreaterThanOrEqual(2);

      const partnerIds = result.decisions.map(d => d.partnerId);
      expect(partnerIds).toContain('booking-com');
      expect(partnerIds.some(id => ['getyourguide', 'viator'].includes(id))).toBe(true);
    });

    it('should respect excluded partners', async () => {
      const context: AffiliateDecisionContext = {
        contentId: 'test-content-6',
        contentType: 'article',
        entities: [
          {
            id: 'tour-2',
            type: 'tour',
            name: 'Walking Tour',
            monetizable: true,
            affiliateEligible: true,
          },
        ],
        excludePartners: ['getyourguide'],
      };

      const result = await makeAffiliateDecisions(context);

      const partnerIds = result.decisions.map(d => d.partnerId);
      expect(partnerIds).not.toContain('getyourguide');
      // Should fall back to viator
      if (result.decisions.length > 0) {
        expect(result.decisions[0].partnerId).toBe('viator');
      }
    });

    it('should respect entity preferred partners', async () => {
      const context: AffiliateDecisionContext = {
        contentId: 'test-content-7',
        contentType: 'article',
        entities: [
          {
            id: 'exp-2',
            type: 'experience',
            name: 'Cooking Class',
            monetizable: true,
            affiliateEligible: true,
            preferredPartners: ['viator'],
          },
        ],
      };

      const result = await makeAffiliateDecisions(context);

      expect(result.decisions).toHaveLength(1);
      expect(result.decisions[0].partnerId).toBe('viator');
    });
  });

  describe('getDecisionForEntity', () => {
    it('should return decision for single entity', async () => {
      const entity: EntityReference = {
        id: 'hotel-single',
        type: 'hotel',
        name: 'Single Hotel',
        monetizable: true,
        affiliateEligible: true,
      };

      const result = await getDecisionForEntity(entity, 'content-1', 'article');

      expect('partnerId' in result).toBe(true);
      if ('partnerId' in result) {
        expect(result.partnerId).toBe('booking-com');
      }
    });

    it('should return fallback for non-eligible entity', async () => {
      const entity: EntityReference = {
        id: 'city-1',
        type: 'city',
        name: 'Test City',
        monetizable: false,
        affiliateEligible: false,
      };

      const result = await getDecisionForEntity(entity, 'content-2', 'article');

      expect('type' in result).toBe(true);
      if ('type' in result) {
        expect(result.type).toBe('no-affiliate');
      }
    });
  });

  describe('getAvailablePartners', () => {
    it('should return partners for hotel entity type', () => {
      const partners = getAvailablePartners('hotel');

      expect(partners.length).toBeGreaterThan(0);
      expect(partners.some(p => p.id === 'booking-com')).toBe(true);
    });

    it('should return partners for experience entity type', () => {
      const partners = getAvailablePartners('experience');

      expect(partners.length).toBeGreaterThan(0);
      expect(partners.some(p => p.id === 'getyourguide')).toBe(true);
    });

    it('should return empty array for unsupported entity type', () => {
      const partners = getAvailablePartners('unknown-type');

      expect(partners).toHaveLength(0);
    });
  });

  describe('getAllActivePartners', () => {
    it('should return only active partners', () => {
      const partners = getAllActivePartners();

      expect(partners.every(p => p.active)).toBe(true);
      expect(partners.some(p => p.id === 'booking-com')).toBe(true);
      expect(partners.some(p => p.id === 'generic')).toBe(false);
    });
  });

  describe('getPartnerById', () => {
    it('should return partner by ID', () => {
      const partner = getPartnerById('booking-com');

      expect(partner).toBeDefined();
      expect(partner?.id).toBe('booking-com');
      expect(partner?.name).toBe('Booking.com');
    });

    it('should return null for unknown partner', () => {
      const partner = getPartnerById('unknown-partner' as any);

      expect(partner).toBeNull();
    });
  });

  describe('getAffiliateEngineStatus', () => {
    it('should return engine status', () => {
      const status = getAffiliateEngineStatus();

      expect(status.enabled).toBe(true);
      expect(status.activePartners).toBeGreaterThan(0);
      expect(status.totalPartners).toBeGreaterThan(0);
      expect(status.cacheStats).toBeDefined();
    });
  });

  describe('Cache behavior', () => {
    it('should cache decisions and return from cache', async () => {
      const context: AffiliateDecisionContext = {
        contentId: 'cache-test-1',
        contentType: 'article',
        entities: [
          {
            id: 'hotel-cache',
            type: 'hotel',
            name: 'Cache Test Hotel',
            monetizable: true,
            affiliateEligible: true,
          },
        ],
      };

      // First call - should calculate
      const result1 = await makeAffiliateDecisions(context);

      // Second call - should hit cache
      const result2 = await makeAffiliateDecisions(context);

      expect(result1.contextHash).toBe(result2.contextHash);
      expect(result1.decisions.length).toBe(result2.decisions.length);
    });

    it('should clear cache correctly', async () => {
      const context: AffiliateDecisionContext = {
        contentId: 'cache-clear-test',
        contentType: 'article',
        entities: [
          {
            id: 'hotel-clear',
            type: 'hotel',
            name: 'Clear Test Hotel',
            monetizable: true,
            affiliateEligible: true,
          },
        ],
      };

      await makeAffiliateDecisions(context);

      const statsBefore = getAffiliateEngineStatus().cacheStats;

      clearDecisionCache();

      const statsAfter = getAffiliateEngineStatus().cacheStats;

      expect(statsAfter.size).toBe(0);
      expect(statsAfter.hits).toBe(0);
      expect(statsAfter.misses).toBe(0);
    });
  });
});
