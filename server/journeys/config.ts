/**
 * User Journey & Funnel Engine - Configuration
 * Feature Flag: ENABLE_USER_JOURNEYS=true
 */

import type { FunnelDefinition } from './types';

// ============================================================================
// Feature Flag
// ============================================================================

export function isUserJourneysEnabled(): boolean {
  return process.env.ENABLE_USER_JOURNEYS === 'true';
}

// ============================================================================
// Configuration
// ============================================================================

export const JOURNEY_CONFIG = {
  // Session timeout (30 minutes of inactivity)
  sessionTimeoutMs: 30 * 60 * 1000,

  // Max steps per journey
  maxStepsPerJourney: 100,

  // Cache TTLs
  cacheTtl: {
    summary: 300,      // 5 minutes
    funnel: 300,       // 5 minutes
    journey: 60,       // 1 minute
  },

  // Buffer size for event batching
  eventBufferSize: 100,
  eventFlushIntervalMs: 5000,
} as const;

// ============================================================================
// Default Funnel Definitions
// ============================================================================

export const DEFAULT_FUNNELS: Record<string, FunnelDefinition> = {
  'content-to-affiliate': {
    name: 'content-to-affiliate',
    description: 'Track users from content view to affiliate click',
    steps: [
      { name: 'Page View', eventType: 'page_view' },
      { name: 'Content Open', eventType: 'content_open' },
      { name: 'Affiliate Click', eventType: 'affiliate_click' },
    ],
    enabled: true,
  },
  'search-to-conversion': {
    name: 'search-to-conversion',
    description: 'Track users from search to conversion',
    steps: [
      { name: 'Search', eventType: 'search' },
      { name: 'Content Open', eventType: 'content_open' },
      { name: 'Conversion', eventType: 'conversion' },
    ],
    enabled: true,
  },
  'full-journey': {
    name: 'full-journey',
    description: 'Complete user journey from entry to conversion',
    steps: [
      { name: 'Entry', eventType: 'page_view' },
      { name: 'Search', eventType: 'search' },
      { name: 'Content View', eventType: 'content_open' },
      { name: 'Affiliate Click', eventType: 'affiliate_click' },
      { name: 'Conversion', eventType: 'conversion' },
    ],
    enabled: true,
  },
};

// ============================================================================
// Get funnel by name
// ============================================================================

export function getFunnelDefinition(name: string): FunnelDefinition | null {
  // Check custom funnels from env (JSON string)
  const customFunnels = process.env.CUSTOM_FUNNELS;
  if (customFunnels) {
    try {
      const parsed = JSON.parse(customFunnels) as Record<string, FunnelDefinition>;
      if (parsed[name]) return parsed[name];
    } catch {
      // Ignore parse errors
    }
  }

  return DEFAULT_FUNNELS[name] || null;
}

export function getAllFunnels(): FunnelDefinition[] {
  const funnels = { ...DEFAULT_FUNNELS };

  // Merge custom funnels
  const customFunnels = process.env.CUSTOM_FUNNELS;
  if (customFunnels) {
    try {
      const parsed = JSON.parse(customFunnels) as Record<string, FunnelDefinition>;
      Object.assign(funnels, parsed);
    } catch {
      // Ignore parse errors
    }
  }

  return Object.values(funnels).filter(f => f.enabled);
}
