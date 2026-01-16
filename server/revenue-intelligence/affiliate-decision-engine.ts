/**
 * Affiliate Decision Engine
 * Feature Flag: ENABLE_AFFILIATE_ENGINE=true
 *
 * Given content + entities + intent, decides:
 * - Which affiliate partner to use
 * - Which link to generate
 * - Priority order of affiliates
 *
 * Deterministic output with fallback handling.
 */

import { createLogger } from '../lib/logger';
import {
  isAffiliateEngineEnabled,
  AFFILIATE_PARTNERS,
  CACHE_CONFIG,
  TIMEOUTS,
} from './config';
import type {
  AffiliateDecisionContext,
  AffiliateDecision,
  AffiliateDecisionResult,
  AffiliateFallback,
  AffiliatePartner,
  AffiliatePartnerType,
  EntityReference,
  CacheEntry,
  CacheStats,
} from './types';

const logger = createLogger('affiliate-decision-engine');

// ============================================================================
// Bounded LRU Cache for Affiliate Decisions
// ============================================================================

class AffiliateDecisionCache {
  private cache = new Map<string, CacheEntry<AffiliateDecisionResult>>();
  private stats = { hits: 0, misses: 0 };
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize: number, ttlMs: number) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): AffiliateDecisionResult | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    // Move to end for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: AffiliateDecisionResult): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
      createdAt: Date.now(),
    });
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }
}

const decisionCache = new AffiliateDecisionCache(
  CACHE_CONFIG.affiliateDecision.maxSize,
  CACHE_CONFIG.affiliateDecision.ttlMs
);

// ============================================================================
// Deterministic Hashing
// ============================================================================

/**
 * Generate a deterministic hash for context
 * Used for both caching and reproducible decisions
 */
function hashContext(context: AffiliateDecisionContext): string {
  const parts = [
    context.contentId,
    context.contentType,
    context.userIntent || 'none',
    context.requestedProductType || 'any',
    context.entities.map(e => `${e.id}:${e.type}`).sort().join(','),
    (context.excludePartners || []).sort().join(','),
  ];

  // Simple deterministic hash
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `aff:${Math.abs(hash).toString(36)}`;
}

/**
 * Generate a deterministic tracking ID
 */
function generateTrackingId(contextHash: string, partnerId: string, entityId?: string): string {
  const parts = [contextHash, partnerId, entityId || 'na', Date.now().toString(36)];
  return `trk_${parts.join('_').substring(0, 32)}`;
}

// ============================================================================
// Partner Selection Logic
// ============================================================================

/**
 * Get active partners that support a given entity type
 */
function getPartnersForEntityType(entityType: string): AffiliatePartner[] {
  return Object.values(AFFILIATE_PARTNERS)
    .filter(partner =>
      partner.active &&
      partner.supportedEntityTypes.includes(entityType)
    )
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Score a partner for a given entity considering preferences
 */
function scorePartner(
  partner: AffiliatePartner,
  entity: EntityReference,
  _context: AffiliateDecisionContext
): number {
  let score = 100 - partner.priority; // Lower priority number = higher score

  // Boost if entity prefers this partner
  if (entity.preferredPartners?.includes(partner.id)) {
    score += 50;
  }

  // Boost by commission rate
  score += partner.commissionRate * 100;

  return score;
}

/**
 * Select the best partner for an entity
 */
function selectPartnerForEntity(
  entity: EntityReference,
  context: AffiliateDecisionContext
): AffiliatePartner | null {
  const eligiblePartners = getPartnersForEntityType(entity.type)
    .filter(p => !context.excludePartners?.includes(p.id));

  if (eligiblePartners.length === 0) {
    return null;
  }

  // Score and sort partners
  const scored = eligiblePartners.map(partner => ({
    partner,
    score: scorePartner(partner, entity, context),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored[0].partner;
}

/**
 * Generate affiliate link for a partner and entity
 */
function generateAffiliateLink(
  partner: AffiliatePartner,
  entity: EntityReference,
  trackingId: string
): string {
  // Build tracking params
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(partner.trackingParams)) {
    params.set(key, value);
  }
  params.set('tid', trackingId);

  // For internal redirect handling
  return `/go/${partner.id}/${entity.id}?${params.toString()}`;
}

// ============================================================================
// Main Decision Engine
// ============================================================================

/**
 * Make affiliate decisions for a given context
 * Returns deterministic results based on context hash
 */
export async function makeAffiliateDecisions(
  context: AffiliateDecisionContext
): Promise<AffiliateDecisionResult> {
  const contextHash = hashContext(context);

  // Check if feature is enabled
  if (!isAffiliateEngineEnabled()) {
    logger.debug({ contextHash }, 'Affiliate engine disabled');
    return {
      decisions: [],
      fallback: {
        type: 'no-affiliate',
        reason: 'Affiliate engine is disabled',
      },
      decisionTimestamp: Date.now(),
      contextHash,
    };
  }

  // Check cache
  const cached = decisionCache.get(contextHash);
  if (cached) {
    logger.debug({ contextHash, cached: true }, 'Affiliate decision cache hit');
    return cached;
  }

  // Make decisions with timeout
  const decideWithTimeout = new Promise<AffiliateDecisionResult>((resolve) => {
    const timeoutId = setTimeout(() => {
      logger.warn({ contextHash }, 'Affiliate decision timeout');
      resolve({
        decisions: [],
        fallback: {
          type: 'no-affiliate',
          reason: 'Decision timeout',
        },
        decisionTimestamp: Date.now(),
        contextHash,
      });
    }, TIMEOUTS.affiliateDecision);

    try {
      const decisions: AffiliateDecision[] = [];
      const eligibleEntities = context.entities.filter(e =>
        e.affiliateEligible && e.monetizable
      );

      if (eligibleEntities.length === 0) {
        clearTimeout(timeoutId);
        resolve({
          decisions: [],
          fallback: {
            type: 'internal-search',
            reason: 'No affiliate-eligible entities found',
            alternativeLink: `/search?q=${encodeURIComponent(context.contentType)}`,
          },
          decisionTimestamp: Date.now(),
          contextHash,
        });
        return;
      }

      // Process each eligible entity
      for (const entity of eligibleEntities) {
        const partner = selectPartnerForEntity(entity, context);

        if (partner) {
          const trackingId = generateTrackingId(contextHash, partner.id, entity.id);
          const link = generateAffiliateLink(partner, entity, trackingId);

          decisions.push({
            partnerId: partner.id,
            partnerName: partner.name,
            link,
            trackingId,
            priority: partner.priority,
            disclosure: `This link is an affiliate link to ${partner.name}. We may earn a commission on qualifying purchases.`,
            rel: 'nofollow sponsored',
            entityId: entity.id,
            productType: entity.type,
            confidence: 1.0, // Deterministic, so always confident
          });
        }
      }

      // Sort by priority
      decisions.sort((a, b) => a.priority - b.priority);

      let fallback: AffiliateFallback | undefined;
      if (decisions.length === 0) {
        fallback = {
          type: 'generic-link',
          reason: 'No matching affiliate partners found for entities',
          alternativeLink: `/explore/${context.contentType}`,
        };
      }

      clearTimeout(timeoutId);
      resolve({
        decisions,
        fallback,
        decisionTimestamp: Date.now(),
        contextHash,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      logger.error({ contextHash, error }, 'Affiliate decision error');
      resolve({
        decisions: [],
        fallback: {
          type: 'no-affiliate',
          reason: 'Decision error',
        },
        decisionTimestamp: Date.now(),
        contextHash,
      });
    }
  });

  const result = await decideWithTimeout;

  // Cache the result
  decisionCache.set(contextHash, result);

  logger.info({
    contextHash,
    decisionsCount: result.decisions.length,
    hasFallback: !!result.fallback,
    partnerIds: result.decisions.map(d => d.partnerId),
  }, 'Affiliate decisions made');

  return result;
}

/**
 * Get a single affiliate decision for a specific entity
 */
export async function getDecisionForEntity(
  entity: EntityReference,
  contentId: string,
  contentType: string
): Promise<AffiliateDecision | AffiliateFallback> {
  if (!isAffiliateEngineEnabled()) {
    return {
      type: 'no-affiliate',
      reason: 'Affiliate engine is disabled',
    };
  }

  if (!entity.affiliateEligible || !entity.monetizable) {
    return {
      type: 'no-affiliate',
      reason: 'Entity is not affiliate eligible',
    };
  }

  const context: AffiliateDecisionContext = {
    contentId,
    contentType,
    entities: [entity],
  };

  const result = await makeAffiliateDecisions(context);

  if (result.decisions.length > 0) {
    return result.decisions[0];
  }

  return result.fallback || {
    type: 'no-affiliate',
    reason: 'No decision could be made',
  };
}

/**
 * Get available partners for an entity type
 */
export function getAvailablePartners(entityType: string): AffiliatePartner[] {
  if (!isAffiliateEngineEnabled()) {
    return [];
  }

  return getPartnersForEntityType(entityType);
}

/**
 * Get all active affiliate partners
 */
export function getAllActivePartners(): AffiliatePartner[] {
  if (!isAffiliateEngineEnabled()) {
    return [];
  }

  return Object.values(AFFILIATE_PARTNERS).filter(p => p.active);
}

/**
 * Get partner by ID
 */
export function getPartnerById(partnerId: AffiliatePartnerType): AffiliatePartner | null {
  if (!isAffiliateEngineEnabled()) {
    return null;
  }

  return AFFILIATE_PARTNERS[partnerId] || null;
}

// ============================================================================
// Cache Management
// ============================================================================

export function getDecisionCacheStats(): CacheStats {
  return decisionCache.getStats();
}

export function clearDecisionCache(): void {
  decisionCache.clear();
  logger.info({}, 'Affiliate decision cache cleared');
}

// ============================================================================
// Engine Status
// ============================================================================

export interface AffiliateEngineStatus {
  enabled: boolean;
  activePartners: number;
  totalPartners: number;
  cacheStats: CacheStats;
}

export function getAffiliateEngineStatus(): AffiliateEngineStatus {
  const allPartners = Object.values(AFFILIATE_PARTNERS);
  return {
    enabled: isAffiliateEngineEnabled(),
    activePartners: allPartners.filter(p => p.active).length,
    totalPartners: allPartners.length,
    cacheStats: getDecisionCacheStats(),
  };
}

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Test affiliate decision for given parameters
 * Useful for admin testing without side effects
 */
export async function testDecision(
  entityType: string,
  entityId: string,
  entityName: string
): Promise<AffiliateDecisionResult> {
  const testEntity: EntityReference = {
    id: entityId,
    type: entityType,
    name: entityName,
    monetizable: true,
    affiliateEligible: true,
  };

  const context: AffiliateDecisionContext = {
    contentId: 'test-content',
    contentType: 'test',
    entities: [testEntity],
  };

  return makeAffiliateDecisions(context);
}
