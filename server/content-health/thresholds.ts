/**
 * Content Health - Threshold Configuration
 */

import type { HealthSignal } from './signals';

export interface ThresholdConfig {
  signal: HealthSignal;
  severity: 'low' | 'medium' | 'high' | 'critical';
  weight: number; // Impact on health score (0-100)
  suggestedJob: string;
}

export const HEALTH_THRESHOLDS: ThresholdConfig[] = [
  {
    signal: 'no_entities',
    severity: 'critical',
    weight: 25,
    suggestedJob: 'entity-rebuild',
  },
  {
    signal: 'not_indexed',
    severity: 'high',
    weight: 20,
    suggestedJob: 'search-reindex',
  },
  {
    signal: 'low_ice_score',
    severity: 'medium',
    weight: 15,
    suggestedJob: 'content-enrichment',
  },
  {
    signal: 'stale_content',
    severity: 'medium',
    weight: 15,
    suggestedJob: 'content-refresh',
  },
  {
    signal: 'missing_internal_links',
    severity: 'low',
    weight: 10,
    suggestedJob: 'internal-linking',
  },
  {
    signal: 'no_aeo_capsule',
    severity: 'high',
    weight: 20,
    suggestedJob: 'aeo-regeneration',
  },
  {
    signal: 'low_word_count',
    severity: 'low',
    weight: 10,
    suggestedJob: 'content-enrichment',
  },
];

export const STALE_CONTENT_DAYS = 180; // 6 months
export const MIN_ICE_SCORE = 40;
export const MIN_WORD_COUNT = 300;
export const MIN_INTERNAL_LINKS = 2;

export function getThresholdForSignal(signal: HealthSignal): ThresholdConfig | undefined {
  return HEALTH_THRESHOLDS.find(t => t.signal === signal);
}
