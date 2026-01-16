/**
 * Enterprise Policy Compliance Engine (EPCE)
 *
 * Guarantees the platform is compliant with internal & external rules.
 *
 * Features:
 * - Policy definitions (built-in and custom)
 * - Compliance scanner (config, state, flags, runtime)
 * - Violation tracking and management
 * - Integration with readiness & governor
 *
 * Feature flag: ENABLE_COMPLIANCE_ENGINE=false
 *
 * READ-ONLY enforcement — flags violations only, no auto-fixes.
 */

export * from './types';
export * from './policies';
export * from './scanner';
export * from './violations';

export { default as complianceRoutes } from './routes';

import { getPolicyManager } from './policies';
import { runScan, checkPolicy, isCompliant, getViolations, getIssues } from './scanner';
import { getViolationRepository } from './violations';
import type { SystemComplianceStatus, PolicyCategory } from './types';

/**
 * Check if compliance engine is enabled
 */
export function isComplianceEnabled(): boolean {
  return process.env.ENABLE_COMPLIANCE_ENGINE === 'true';
}

/**
 * Get system-wide compliance status
 */
export function getSystemCompliance(): SystemComplianceStatus {
  const result = runScan();
  const violations = getViolationRepository();
  const stats = violations.getStats();

  // Build by-category summary
  const byCategory = {} as SystemComplianceStatus['byCategory'];
  const categories: PolicyCategory[] = [
    'data-retention', 'ai-usage', 'content-ownership', 'localization',
    'publishing-standards', 'audit-retention', 'kill-switch', 'security', 'privacy',
  ];

  for (const cat of categories) {
    const catResults = result.results.filter(r => r.category === cat);
    const catViolations = catResults.filter(r => r.status === 'violation').length;

    byCategory[cat] = {
      status: catViolations > 0 ? 'violation' :
              catResults.some(r => r.status === 'warning') ? 'warning' : 'compliant',
      count: catResults.length,
      violations: catViolations,
    };
  }

  // Build by-scope summary
  const byScope = {} as SystemComplianceStatus['byScope'];
  const scopes = ['system', 'feature', 'content', 'locale', 'user'] as const;

  for (const scope of scopes) {
    const scopeResults = result.results.filter(r => r.scope === scope);
    const scopeViolations = scopeResults.filter(r => r.status === 'violation').length;

    byScope[scope] = {
      status: scopeViolations > 0 ? 'violation' :
              scopeResults.some(r => r.status === 'warning') ? 'warning' : 'compliant',
      count: scopeResults.length,
      violations: scopeViolations,
    };
  }

  return {
    timestamp: new Date(),
    overallStatus: result.overallStatus,
    byCategory,
    byScope,
    activeViolations: stats.open,
    acknowledgedViolations: stats.acknowledged,
    waivedViolations: stats.waived,
    lastFullScan: result.timestamp,
  };
}

/**
 * Quick compliance check
 */
export function quickComplianceCheck(): {
  compliant: boolean;
  violations: number;
  warnings: number;
} {
  const result = runScan();
  return {
    compliant: result.overallStatus !== 'violation',
    violations: result.summary.violation,
    warnings: result.summary.warning,
  };
}

/**
 * Check if publishing is blocked by compliance
 */
export function isPublishingBlocked(): { blocked: boolean; reasons: string[] } {
  const violations = getViolationRepository();
  const blocking = violations.getGovernorBlocking();

  return {
    blocked: blocking.length > 0,
    reasons: blocking.map(v => v.message),
  };
}

/**
 * Record violations from scan
 */
export function recordScanViolations(): number {
  const result = runScan();
  const violations = getViolationRepository();
  let recorded = 0;

  for (const r of result.results) {
    if (r.status !== 'compliant') {
      const violation = violations.recordFromResult(r);
      if (violation) recorded++;
    }
  }

  return recorded;
}
