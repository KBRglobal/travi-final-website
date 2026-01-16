/**
 * Enterprise Intelligence Hub - Signal Normalizer
 *
 * Normalizes raw signals from various sources into unified format.
 */

import { log } from '../../lib/logger';
import type {
  RawSignal,
  UnifiedSignal,
  SignalSeverity,
  SignalCategory,
  EntityType,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[SignalNormalizer] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[SignalNormalizer] ${msg}`, data),
};

/**
 * Score normalization ranges per source
 */
const SCORE_RANGES: Record<string, { min: number; max: number }> = {
  'content-confidence': { min: 0, max: 100 },
  'content-decay': { min: 0, max: 1 },
  'growth-recommendations': { min: 0, max: 10 },
  'search-zero': { min: 0, max: 100 },
  'ai-audit': { min: 0, max: 100 },
  'cost-guards': { min: 0, max: 100 },
  'backpressure': { min: 0, max: 100 },
  'incidents': { min: 0, max: 100 },
  'data-integrity': { min: 0, max: 100 },
  'external': { min: 0, max: 100 },
};

/**
 * Severity mappings from various formats
 */
const SEVERITY_MAP: Record<string, SignalSeverity> = {
  // Standard
  info: 'info',
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
  // Aliases
  warning: 'medium',
  warn: 'medium',
  error: 'high',
  fatal: 'critical',
  urgent: 'critical',
  minor: 'low',
  major: 'high',
  // Numeric
  '1': 'info',
  '2': 'low',
  '3': 'medium',
  '4': 'high',
  '5': 'critical',
};

/**
 * Category inference from source
 */
const SOURCE_CATEGORY_MAP: Record<string, SignalCategory> = {
  'content-confidence': 'quality',
  'content-decay': 'quality',
  'growth-recommendations': 'engagement',
  'search-zero': 'performance',
  'ai-audit': 'cost',
  'cost-guards': 'cost',
  'backpressure': 'health',
  'incidents': 'health',
  'data-integrity': 'integrity',
  'external': 'performance',
};

/**
 * Normalize a raw score to 0-100 scale
 */
export function normalizeScore(
  rawScore: number | undefined,
  source: string
): number {
  if (rawScore === undefined || rawScore === null) return 50;

  const range = SCORE_RANGES[source] || { min: 0, max: 100 };
  const normalized = ((rawScore - range.min) / (range.max - range.min)) * 100;

  return Math.max(0, Math.min(100, Math.round(normalized)));
}

/**
 * Normalize severity string to standard enum
 */
export function normalizeSeverity(rawSeverity?: string): SignalSeverity {
  if (!rawSeverity) return 'info';

  const normalized = rawSeverity.toLowerCase().trim();
  return SEVERITY_MAP[normalized] || 'info';
}

/**
 * Infer severity from normalized score
 */
export function inferSeverityFromScore(score: number): SignalSeverity {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  if (score >= 30) return 'low';
  return 'info';
}

/**
 * Infer category from source
 */
export function inferCategory(source: string): SignalCategory {
  return SOURCE_CATEGORY_MAP[source] || 'performance';
}

/**
 * Infer entity type from context
 */
export function inferEntityType(
  raw: RawSignal
): EntityType {
  if (raw.entityType) return raw.entityType;

  // Infer from source
  switch (raw.source) {
    case 'content-confidence':
    case 'content-decay':
      return 'content';
    case 'growth-recommendations':
      return 'entity';
    case 'search-zero':
      return 'content';
    case 'ai-audit':
      return 'system';
    case 'cost-guards':
      return 'system';
    case 'backpressure':
      return 'system';
    case 'incidents':
      return 'system';
    case 'data-integrity':
      return 'content';
    default:
      return 'system';
  }
}

/**
 * Generate unique signal ID
 */
export function generateSignalId(raw: RawSignal): string {
  const timestamp = raw.timestamp?.getTime() || Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `sig-${raw.source}-${timestamp}-${random}`;
}

/**
 * Normalize a raw signal to unified format
 */
export function normalizeSignal(raw: RawSignal): UnifiedSignal | null {
  try {
    const score = normalizeScore(raw.rawScore, raw.source);
    const severity = raw.rawSeverity
      ? normalizeSeverity(raw.rawSeverity)
      : inferSeverityFromScore(score);

    const signal: UnifiedSignal = {
      id: generateSignalId(raw),
      source: raw.source,
      category: inferCategory(raw.source),
      entityType: inferEntityType(raw),
      entityId: raw.entityId || 'system',
      severity,
      score,
      reason: raw.message || `Signal from ${raw.source}`,
      details: raw.data || {},
      timestamp: raw.timestamp || new Date(),
    };

    return signal;
  } catch (err) {
    logger.warn('Failed to normalize signal', {
      source: raw.source,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Batch normalize signals
 */
export function normalizeSignals(raws: RawSignal[]): UnifiedSignal[] {
  const normalized: UnifiedSignal[] = [];

  for (const raw of raws) {
    const signal = normalizeSignal(raw);
    if (signal) {
      normalized.push(signal);
    }
  }

  logger.info('Batch normalization complete', {
    input: raws.length,
    output: normalized.length,
  });

  return normalized;
}
