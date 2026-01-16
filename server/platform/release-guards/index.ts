/**
 * Release Safety & Deploy Guards
 *
 * FEATURE 2: Prevent unsafe deploys/configurations from silently breaking production
 *
 * Validates on server startup:
 * - Required environment variables
 * - Incompatible feature flag combinations
 * - Missing database tables
 * - Kill switch configuration
 *
 * Feature flag: ENABLE_RELEASE_GUARDS
 */

export * from './types';
export * from './release-guard';
