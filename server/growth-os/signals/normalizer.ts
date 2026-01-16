/**
 * Signal Normalizer
 *
 * Transforms raw signals from various sources into normalized format.
 */

import { randomUUID } from 'crypto';
import type {
  RawSignal,
  NormalizedSignal,
  SignalSource,
  SignalCategory,
  SignalPriority,
} from './types';
import { getGrowthOSConfig } from '../config';

/**
 * Source to category mapping
 */
const SOURCE_CATEGORY_MAP: Record<SignalSource, SignalCategory> = {
  traffic_intelligence: 'traffic',
  media_intelligence: 'media',
  tcoe: 'content',
  content_health: 'content',
  search_zero: 'seo',
  revenue_intelligence: 'revenue',
  ops_incidents: 'ops',
  governance: 'governance',
  manual: 'content',
};

/**
 * Derive category from source and type
 */
export function deriveCategory(source: SignalSource, type: string): SignalCategory {
  // Type-based overrides
  const typeLower = type.toLowerCase();
  if (typeLower.includes('seo')) return 'seo';
  if (typeLower.includes('aeo')) return 'aeo';
  if (typeLower.includes('revenue') || typeLower.includes('monetization')) return 'revenue';
  if (typeLower.includes('traffic')) return 'traffic';
  if (typeLower.includes('media') || typeLower.includes('image')) return 'media';
  if (typeLower.includes('ux') || typeLower.includes('performance')) return 'ux';
  if (typeLower.includes('risk') || typeLower.includes('security')) return 'risk';
  if (typeLower.includes('governance') || typeLower.includes('policy')) return 'governance';
  if (typeLower.includes('ops') || typeLower.includes('incident')) return 'ops';

  return SOURCE_CATEGORY_MAP[source] || 'content';
}

/**
 * Derive priority from severity score
 */
export function derivePriority(severity: number): SignalPriority {
  if (severity >= 90) return 'critical';
  if (severity >= 70) return 'high';
  if (severity >= 40) return 'medium';
  if (severity >= 20) return 'low';
  return 'info';
}

/**
 * Calculate default expiration based on signal type
 */
export function calculateExpiration(source: SignalSource, type: string): Date {
  const config = getGrowthOSConfig();
  const baseHours = config.signalDecayHalfLifeHours * 2; // Full decay = 2x half-life

  // Source-based adjustments
  const sourceMultipliers: Partial<Record<SignalSource, number>> = {
    ops_incidents: 0.25, // Incidents decay fast (6 hours default)
    traffic_intelligence: 1.0, // Standard
    revenue_intelligence: 2.0, // Revenue signals last longer
    governance: 4.0, // Governance issues persist
  };

  const multiplier = sourceMultipliers[source] || 1.0;
  const hours = baseHours * multiplier;

  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Normalize entity type string
 */
export function normalizeEntityType(
  entityType?: string
): 'content' | 'asset' | 'page' | 'segment' | 'system' | 'global' {
  if (!entityType) return 'global';

  const lower = entityType.toLowerCase();
  if (lower.includes('content') || lower.includes('article')) return 'content';
  if (lower.includes('asset') || lower.includes('media') || lower.includes('image')) return 'asset';
  if (lower.includes('page') || lower.includes('url')) return 'page';
  if (lower.includes('segment') || lower.includes('audience')) return 'segment';
  if (lower.includes('system') || lower.includes('service')) return 'system';
  return 'global';
}

/**
 * Normalize a raw signal into the unified schema
 */
export function normalizeSignal(raw: RawSignal): NormalizedSignal {
  const now = new Date();
  const severity = Math.max(0, Math.min(100, raw.severity ?? 50));
  const impact = Math.max(0, Math.min(100, raw.impact ?? severity));
  const confidence = Math.max(0, Math.min(100, raw.confidence ?? 75));

  const expiresAt = raw.expiresIn
    ? new Date(Date.now() + raw.expiresIn)
    : calculateExpiration(raw.source, raw.type);

  return {
    id: randomUUID(),
    source: raw.source,
    category: deriveCategory(raw.source, raw.type),
    type: raw.type,
    priority: derivePriority(severity),
    severity,
    impact,
    confidence,
    title: raw.title,
    description: raw.description || raw.title,
    entityType: normalizeEntityType(raw.entityType),
    entityId: raw.entityId || null,
    contentIds: raw.contentIds || [],
    trafficSegments: raw.trafficSegments || [],
    revenueImpact: raw.revenueImpact ?? null,
    createdAt: now,
    updatedAt: now,
    expiresAt,
    freshness: 100,
    acknowledged: false,
    relatedSignalIds: [],
    metadata: raw.metadata || {},
  };
}

/**
 * Normalize multiple signals
 */
export function normalizeSignals(rawSignals: RawSignal[]): NormalizedSignal[] {
  return rawSignals.map(normalizeSignal);
}

/**
 * Validate a raw signal has required fields
 */
export function validateRawSignal(raw: unknown): raw is RawSignal {
  if (!raw || typeof raw !== 'object') return false;

  const signal = raw as Record<string, unknown>;

  return (
    typeof signal.source === 'string' &&
    typeof signal.type === 'string' &&
    typeof signal.title === 'string'
  );
}

/**
 * Create signal from traffic intelligence data
 */
export function createTrafficSignal(
  type: string,
  title: string,
  options: Partial<RawSignal> = {}
): NormalizedSignal {
  return normalizeSignal({
    source: 'traffic_intelligence',
    type,
    title,
    ...options,
  });
}

/**
 * Create signal from content health data
 */
export function createContentHealthSignal(
  type: string,
  title: string,
  contentId: string,
  options: Partial<RawSignal> = {}
): NormalizedSignal {
  return normalizeSignal({
    source: 'content_health',
    type,
    title,
    entityType: 'content',
    entityId: contentId,
    contentIds: [contentId],
    ...options,
  });
}

/**
 * Create signal from revenue intelligence
 */
export function createRevenueSignal(
  type: string,
  title: string,
  revenueImpact: number,
  options: Partial<RawSignal> = {}
): NormalizedSignal {
  return normalizeSignal({
    source: 'revenue_intelligence',
    type,
    title,
    revenueImpact,
    severity: Math.min(100, Math.abs(revenueImpact) / 100), // Scale by $100 units
    ...options,
  });
}

/**
 * Create signal from ops/incident data
 */
export function createOpsSignal(
  type: string,
  title: string,
  severity: number,
  options: Partial<RawSignal> = {}
): NormalizedSignal {
  return normalizeSignal({
    source: 'ops_incidents',
    type,
    title,
    severity,
    ...options,
  });
}
