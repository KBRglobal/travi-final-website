/**
 * Platform Self-Governance System (PSGS)
 *
 * The meta-layer that answers: "Is the platform governing itself better over time?"
 *
 * This system does NOT decide. It OBSERVES, SCORES, and INTERVENES indirectly.
 *
 * Components:
 * - metrics/   - 15 Governance Quality Signals
 * - risk/      - Systemic Risk Accumulation Model
 * - intervention/ - Governance Intervention Engine (no hard blocks)
 * - learning/  - Longitudinal Learning System
 * - api/       - Executive Governance API
 */

// Governance Quality Metrics
export * from './metrics';

// Systemic Risk Ledger
export * from './risk';

// Intervention Engine
export * from './intervention';

// Longitudinal Learning
export * from './learning';

// Executive API
export * from './api';

/**
 * Check if PSGS is enabled
 */
export function isPSGSEnabled(): boolean {
  return process.env.ENABLE_PLATFORM_SELF_GOVERNANCE === 'true';
}

/**
 * Get PSGS version
 */
export function getPSGSVersion(): string {
  return '1.0.0';
}

/**
 * Register governance routes (stub for compatibility)
 */
export function registerGovernanceRoutes(_app: any): void {
  // Governance API endpoints are registered via the api module
}
