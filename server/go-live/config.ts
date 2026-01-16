/**
 * Go-Live Checklist - Configuration
 * Feature Flag: ENABLE_GO_LIVE_CHECKLIST=true
 */

import type { CheckConfig } from './types';

export function isGoLiveChecklistEnabled(): boolean {
  return process.env.ENABLE_GO_LIVE_CHECKLIST === 'true';
}

export const GO_LIVE_CONFIG = {
  // Timeout for individual checks (ms)
  checkTimeoutMs: parseInt(process.env.GO_LIVE_CHECK_TIMEOUT_MS || '5000', 10),

  // Cache results for this duration (ms)
  cacheDurationMs: parseInt(process.env.GO_LIVE_CACHE_MS || '60000', 10),
} as const;

// All available checks
export const AVAILABLE_CHECKS: CheckConfig[] = [
  {
    id: 'db_connection',
    name: 'Database Connection',
    description: 'Verify database is reachable and responding',
    critical: true,
    enabled: true,
  },
  {
    id: 'event_bus',
    name: 'Event Bus Initialized',
    description: 'Verify event bus is initialized with subscribers',
    critical: true,
    enabled: true,
  },
  {
    id: 'search_index',
    name: 'Search Indexing',
    description: 'Verify search indexing is functional',
    critical: false,
    enabled: true,
  },
  {
    id: 'aeo_available',
    name: 'AEO Generation Available',
    description: 'Verify AEO generation feature is configured',
    critical: false,
    enabled: true,
  },
  {
    id: 'sitemap_v2',
    name: 'Sitemap v2 Enabled',
    description: 'Verify sitemap v2 is enabled and endpoints reachable',
    critical: false,
    enabled: true,
  },
  {
    id: 'job_queue',
    name: 'Job Queue Health',
    description: 'Verify job queue is processing and not stale',
    critical: true,
    enabled: true,
  },
  {
    id: 'no_critical_incidents',
    name: 'No Critical Incidents',
    description: 'Verify no open critical incidents',
    critical: true,
    enabled: true,
  },
];

export function getEnabledChecks(): CheckConfig[] {
  return AVAILABLE_CHECKS.filter(c => c.enabled);
}

export function getCriticalChecks(): CheckConfig[] {
  return AVAILABLE_CHECKS.filter(c => c.critical && c.enabled);
}
