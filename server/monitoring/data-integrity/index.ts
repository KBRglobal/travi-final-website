/**
 * Data Integrity Watchdog
 *
 * FEATURE 4: Detect silent data corruption and partial writes
 *
 * Periodic scans for:
 * - Published content without entities
 * - Published content not indexed
 * - Orphaned entity links
 * - Failed lifecycle transitions
 *
 * Feature flag: ENABLE_DATA_INTEGRITY_WATCHDOG
 */

export * from './types';
export * from './data-integrity-watchdog';
