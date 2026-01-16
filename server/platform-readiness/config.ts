/**
 * Platform Readiness - Configuration
 * Feature Flag: ENABLE_PLATFORM_READINESS=false
 */

import type { SignalSource, CheckCategory } from './types';

export function isPlatformReadinessEnabled(): boolean {
  return process.env.ENABLE_PLATFORM_READINESS === 'true';
}

export const READINESS_CONFIG = {
  // Score thresholds
  blockingThreshold: parseInt(process.env.READINESS_BLOCKING_THRESHOLD || '50', 10),
  warningThreshold: parseInt(process.env.READINESS_WARNING_THRESHOLD || '80', 10),

  // Timeout for signal collection (ms)
  signalTimeoutMs: parseInt(process.env.READINESS_SIGNAL_TIMEOUT_MS || '5000', 10),

  // Cache duration (ms)
  cacheDurationMs: parseInt(process.env.READINESS_CACHE_MS || '30000', 10),

  // Weight per category for overall score
  categoryWeights: {
    content: 0.25,
    infra: 0.20,
    ai: 0.15,
    seo: 0.15,
    ops: 0.15,
    revenue: 0.10,
  } as Record<CheckCategory, number>,
} as const;

// All signal sources to collect from
export const SIGNAL_SOURCES: SignalSource[] = [
  'publishing_gates',
  'intelligence_coverage',
  'content_readiness',
  'search_indexing',
  'sitemap_health',
  'job_queue',
  'incidents',
  'kill_switches',
  'ai_providers',
  'cost_guards',
];

// Map signal sources to categories
export const SOURCE_CATEGORY_MAP: Record<SignalSource, CheckCategory> = {
  publishing_gates: 'content',
  intelligence_coverage: 'content',
  content_readiness: 'content',
  search_indexing: 'seo',
  sitemap_health: 'seo',
  job_queue: 'infra',
  incidents: 'ops',
  kill_switches: 'ops',
  ai_providers: 'ai',
  cost_guards: 'revenue',
};
