/**
 * Enterprise Intelligence Hub - Correlation Patterns
 *
 * Known patterns that we look for in the system.
 */

import type { CorrelationPattern, PatternId } from './types';

/**
 * Known correlation patterns
 */
export const KNOWN_PATTERNS: CorrelationPattern[] = [
  {
    id: 'revenue_entity_loss',
    name: 'Revenue Drop from Entity Loss',
    description: 'Revenue decreases correlate with entity removal or unavailability',
    signalSourceA: 'revenue',
    signalSourceB: 'data-integrity',
    expectedType: 'causal',
    expectedDirection: 'negative',
    minStrength: 60,
  },
  {
    id: 'search_zero_decay',
    name: 'Search Zero-Results from Content Decay',
    description: 'Search returning zero results correlates with content quality decay',
    signalSourceA: 'search-zero',
    signalSourceB: 'content-decay',
    expectedType: 'associated',
    expectedDirection: 'positive',
    minStrength: 50,
  },
  {
    id: 'cost_spike_regeneration',
    name: 'Cost Spike from Regeneration Loop',
    description: 'AI cost spikes correlate with repeated content regeneration',
    signalSourceA: 'cost-guards',
    signalSourceB: 'ai-audit',
    expectedType: 'causal',
    expectedDirection: 'positive',
    minStrength: 70,
  },
  {
    id: 'provider_cascade',
    name: 'Provider Failure Cascade',
    description: 'One AI provider failure leads to cascade of fallback failures',
    signalSourceA: 'ai-audit',
    signalSourceB: 'backpressure',
    expectedType: 'temporal',
    expectedDirection: 'positive',
    minStrength: 65,
  },
  {
    id: 'quality_drop_traffic',
    name: 'Quality Drop Affecting Traffic',
    description: 'Content quality drops correlate with traffic decreases',
    signalSourceA: 'content-confidence',
    signalSourceB: 'growth-recommendations',
    expectedType: 'associated',
    expectedDirection: 'positive',
    minStrength: 55,
  },
];

/**
 * Get pattern by ID
 */
export function getPattern(id: PatternId): CorrelationPattern | undefined {
  return KNOWN_PATTERNS.find(p => p.id === id);
}

/**
 * Get patterns involving a signal source
 */
export function getPatternsForSource(source: string): CorrelationPattern[] {
  return KNOWN_PATTERNS.filter(
    p => p.signalSourceA === source || p.signalSourceB === source
  );
}

/**
 * Check if two sources have a known pattern
 */
export function hasKnownPattern(sourceA: string, sourceB: string): CorrelationPattern | undefined {
  return KNOWN_PATTERNS.find(
    p => (p.signalSourceA === sourceA && p.signalSourceB === sourceB) ||
         (p.signalSourceA === sourceB && p.signalSourceB === sourceA)
  );
}
