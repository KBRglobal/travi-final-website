/**
 * Enterprise Policy Compliance Engine - Compliance Scanner
 *
 * Scans config, state, flags, and runtime signals for compliance.
 * READ-ONLY — no auto-fixes.
 */

import { log } from '../lib/logger';
import { getPolicyManager } from './policies';
import type {
  Policy,
  PolicyCheck,
  ComplianceResult,
  ComplianceStatus,
  ScanRequest,
  ScanResult,
  SeverityLevel,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ComplianceScanner] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[ComplianceScanner] ${msg}`, data),
};

/**
 * Generate unique scan ID
 */
function generateScanId(): string {
  return `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Simulated config values (in production, read from actual config)
 */
function getConfigValue(target: string): unknown {
  const configMap: Record<string, unknown> = {
    'log.retentionDays': 180,
    'audit.retentionDays': 730,
    'ai.fallbackProviders': ['anthropic', 'openai'],
    'i18n.defaultLocale': 'en-US',
    'i18n.fallbackChain': ['en-US', 'en'],
    'auth.enabled': true,
    'rateLimit.enabled': true,
    'encryption.atRest': true,
  };
  return configMap[target];
}

/**
 * Simulated runtime values (in production, read from actual state)
 */
function getRuntimeValue(target: string): unknown {
  const runtimeMap: Record<string, unknown> = {
    'ai.currentUsagePercent': 45,
    'ai.dailyCostPercent': 62,
    'killSwitch.activeCount': 1,
  };
  return runtimeMap[target];
}

/**
 * Simulated state values (in production, read from actual state)
 */
function getStateValue(target: string, entityId?: string): unknown {
  const stateMap: Record<string, unknown> = {
    'content.hasOwnership': true,
    'content.hasLicense': true,
    'content.qualityScore': 75,
  };
  return stateMap[target];
}

/**
 * Simulated flag values (in production, read from actual flags)
 */
function getFlagValue(target: string): unknown {
  const flagMap: Record<string, unknown> = {
    'ENABLE_PUBLISH_REVIEW': true,
    'ENABLE_KILL_SWITCHES': true,
  };
  return process.env[target] ?? flagMap[target];
}

/**
 * Get actual value based on check type
 */
function getActualValue(check: PolicyCheck, entityId?: string): unknown {
  switch (check.type) {
    case 'config':
      return getConfigValue(check.target);
    case 'runtime':
      return getRuntimeValue(check.target);
    case 'state':
      return getStateValue(check.target, entityId);
    case 'flag':
      return getFlagValue(check.target);
    case 'composite':
      return undefined; // Composite checks handled differently
    default:
      return undefined;
  }
}

/**
 * Evaluate check operator
 */
function evaluateCheck(
  actual: unknown,
  expected: unknown,
  operator: PolicyCheck['operator']
): boolean {
  switch (operator) {
    case 'equals':
      return actual === expected;
    case 'not_equals':
      return actual !== expected;
    case 'greater_than':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'less_than':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case 'contains':
      if (Array.isArray(actual)) return actual.includes(expected);
      if (typeof actual === 'string') return actual.includes(String(expected));
      return false;
    case 'not_contains':
      if (Array.isArray(actual)) return !actual.includes(expected);
      if (typeof actual === 'string') return !actual.includes(String(expected));
      return true;
    case 'exists':
      return actual !== undefined && actual !== null;
    case 'not_exists':
      return actual === undefined || actual === null;
    case 'matches':
      if (typeof actual !== 'string' || typeof expected !== 'string') return false;
      return new RegExp(expected).test(actual);
    case 'in_range':
      if (typeof actual !== 'number' || !Array.isArray(expected)) return false;
      return actual >= expected[0] && actual <= expected[1];
    default:
      return false;
  }
}

/**
 * Determine compliance status
 */
function determineStatus(
  check: PolicyCheck,
  actual: unknown,
  compliant: boolean
): ComplianceStatus {
  if (compliant) return 'compliant';

  // Check for warning threshold
  if (check.warningValue !== undefined) {
    const warningPassed = evaluateCheck(actual, check.warningValue, check.operator);
    if (warningPassed) return 'warning';
  }

  return 'violation';
}

/**
 * Determine severity based on status and category
 */
function determineSeverity(
  status: ComplianceStatus,
  policy: Policy
): SeverityLevel {
  if (status === 'compliant') return 'info';

  // Critical categories
  if (policy.category === 'security' || policy.category === 'privacy') {
    return status === 'violation' ? 'critical' : 'high';
  }

  // High importance categories
  if (policy.category === 'data-retention' || policy.category === 'audit-retention') {
    return status === 'violation' ? 'high' : 'medium';
  }

  // Standard categories
  return status === 'violation' ? 'medium' : 'low';
}

/**
 * Generate result message
 */
function generateMessage(
  policy: Policy,
  status: ComplianceStatus,
  actual: unknown,
  expected: unknown
): string {
  if (status === 'compliant') {
    return `${policy.name}: Compliant`;
  }

  const statusLabel = status === 'warning' ? 'Warning' : 'Violation';
  return `${statusLabel}: ${policy.name} - Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
}

/**
 * Evaluate a single policy
 */
function evaluatePolicy(
  policy: Policy,
  entityId?: string
): ComplianceResult {
  const actual = getActualValue(policy.check, entityId);
  const compliant = evaluateCheck(actual, policy.check.expectedValue, policy.check.operator);
  const status = determineStatus(policy.check, actual, compliant);
  const severity = determineSeverity(status, policy);

  return {
    policyId: policy.id,
    policyName: policy.name,
    category: policy.category,
    scope: policy.scope,
    status,
    severity,
    actualValue: actual,
    expectedValue: policy.check.expectedValue,
    message: generateMessage(policy, status, actual, policy.check.expectedValue),
    checkedAt: new Date(),
    entityId,
  };
}

/**
 * Run compliance scan
 */
export function runScan(request: ScanRequest = {}): ScanResult {
  const startTime = Date.now();
  const policyManager = getPolicyManager();

  let policies = policyManager.getEnabled();

  // Filter by request parameters
  if (request.categories?.length) {
    policies = policies.filter(p => request.categories!.includes(p.category));
  }

  if (request.scopes?.length) {
    policies = policies.filter(p => request.scopes!.includes(p.scope));
  }

  if (request.policiesOnly?.length) {
    policies = policies.filter(p => request.policiesOnly!.includes(p.id));
  }

  // Evaluate all matching policies
  const results: ComplianceResult[] = [];

  for (const policy of policies) {
    const result = evaluatePolicy(policy, request.entityId);
    results.push(result);
  }

  // Calculate summary
  const summary = {
    compliant: results.filter(r => r.status === 'compliant').length,
    warning: results.filter(r => r.status === 'warning').length,
    violation: results.filter(r => r.status === 'violation').length,
  };

  // Determine overall status
  let overallStatus: ComplianceStatus = 'compliant';
  if (summary.violation > 0) overallStatus = 'violation';
  else if (summary.warning > 0) overallStatus = 'warning';

  const durationMs = Date.now() - startTime;

  logger.info('Compliance scan completed', {
    totalPolicies: policyManager.getEnabled().length,
    checkedPolicies: policies.length,
    summary,
    durationMs,
  });

  return {
    id: generateScanId(),
    timestamp: new Date(),
    durationMs,
    request,
    totalPolicies: policyManager.getEnabled().length,
    checkedPolicies: policies.length,
    results,
    summary,
    overallStatus,
  };
}

/**
 * Quick compliance check for a specific policy
 */
export function checkPolicy(policyId: string, entityId?: string): ComplianceResult | null {
  const policyManager = getPolicyManager();
  const policy = policyManager.get(policyId);

  if (!policy || !policy.enabled) {
    return null;
  }

  return evaluatePolicy(policy, entityId);
}

/**
 * Check if system is compliant (no violations)
 */
export function isCompliant(): boolean {
  const result = runScan();
  return result.overallStatus !== 'violation';
}

/**
 * Get violations only
 */
export function getViolations(): ComplianceResult[] {
  const result = runScan();
  return result.results.filter(r => r.status === 'violation');
}

/**
 * Get warnings and violations
 */
export function getIssues(): ComplianceResult[] {
  const result = runScan();
  return result.results.filter(r => r.status !== 'compliant');
}
