/**
 * Go-Live Control Plane - Readiness Results
 */

/**
 * Readiness status
 */
export type ReadinessStatus = 'READY' | 'DEGRADED' | 'BLOCKED';

/**
 * Probe category
 */
export type ProbeCategory =
  | 'database'
  | 'services'
  | 'ai_providers'
  | 'rate_limits'
  | 'kill_switches'
  | 'autonomy'
  | 'configuration';

/**
 * Individual probe result
 */
export interface ProbeResult {
  name: string;
  category: ProbeCategory;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: Record<string, unknown>;
  durationMs: number;
  checkedAt: Date;
}

/**
 * Readiness summary
 */
export interface ReadinessSummary {
  total: number;
  passed: number;
  warned: number;
  failed: number;
  byCategory: Record<ProbeCategory, { passed: number; warned: number; failed: number }>;
}

/**
 * Readiness evaluation result
 */
export interface ReadinessResult {
  status: ReadinessStatus;
  probes: ProbeResult[];
  summary: ReadinessSummary;
  evaluatedAt: Date;
  durationMs: number;
  blockingIssues: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Capability readiness
 */
export interface CapabilityReadiness {
  capabilityId: string;
  capabilityName: string;
  status: ReadinessStatus;
  blockers: string[];
  warnings: string[];
  readyDependencies: string[];
  missingDependencies: string[];
}

/**
 * Full environment readiness report
 */
export interface EnvironmentReadinessReport {
  overallStatus: ReadinessStatus;
  environment: string;
  readiness: ReadinessResult;
  capabilities: CapabilityReadiness[];
  recommendations: string[];
  evaluatedAt: Date;
}

/**
 * Determine overall status from probe results
 */
export function determineStatus(probes: ProbeResult[]): ReadinessStatus {
  const hasFail = probes.some(p => p.status === 'fail');
  const hasWarn = probes.some(p => p.status === 'warn');

  if (hasFail) return 'BLOCKED';
  if (hasWarn) return 'DEGRADED';
  return 'READY';
}

/**
 * Generate summary from probe results
 */
export function generateSummary(status: ReadinessStatus, probes: ProbeResult[]): string {
  const passCount = probes.filter(p => p.status === 'pass').length;
  const warnCount = probes.filter(p => p.status === 'warn').length;
  const failCount = probes.filter(p => p.status === 'fail').length;

  switch (status) {
    case 'READY':
      return `All ${passCount} checks passed. System is ready for go-live.`;
    case 'DEGRADED':
      return `${passCount} passed, ${warnCount} warnings. System can operate with limitations.`;
    case 'BLOCKED':
      return `${failCount} critical issues found. System is NOT ready for go-live.`;
  }
}

/**
 * Count probes by status
 */
export function countByStatus(probes: ProbeResult[]): { passed: number; warned: number; failed: number } {
  return {
    passed: probes.filter(p => p.status === 'pass').length,
    warned: probes.filter(p => p.status === 'warn').length,
    failed: probes.filter(p => p.status === 'fail').length,
  };
}

/**
 * Get blocking issues
 */
export function getBlockingIssues(probes: ProbeResult[]): string[] {
  return probes
    .filter(p => p.status === 'fail')
    .map(p => `${p.name}: ${p.message}`);
}

/**
 * Get warnings
 */
export function getWarnings(probes: ProbeResult[]): string[] {
  return probes
    .filter(p => p.status === 'warn')
    .map(p => `${p.name}: ${p.message}`);
}

/**
 * Create summary from probe results
 */
export function createSummary(probes: ProbeResult[]): ReadinessSummary {
  const byCategory = {} as Record<ProbeCategory, { passed: number; warned: number; failed: number }>;

  const categories: ProbeCategory[] = [
    'database', 'services', 'ai_providers', 'rate_limits',
    'kill_switches', 'autonomy', 'configuration'
  ];

  for (const cat of categories) {
    byCategory[cat] = { passed: 0, warned: 0, failed: 0 };
  }

  for (const probe of probes) {
    if (!byCategory[probe.category]) {
      byCategory[probe.category] = { passed: 0, warned: 0, failed: 0 };
    }
    if (probe.status === 'pass') byCategory[probe.category].passed++;
    else if (probe.status === 'warn') byCategory[probe.category].warned++;
    else if (probe.status === 'fail') byCategory[probe.category].failed++;
  }

  const counts = countByStatus(probes);

  return {
    total: probes.length,
    passed: counts.passed,
    warned: counts.warned,
    failed: counts.failed,
    byCategory,
  };
}

/**
 * Generate recommendations based on results
 */
export function generateRecommendations(probes: ProbeResult[]): string[] {
  const recommendations: string[] = [];

  const failed = probes.filter(p => p.status === 'fail');
  const warned = probes.filter(p => p.status === 'warn');

  for (const probe of failed) {
    switch (probe.category) {
      case 'database':
        recommendations.push(`Fix database issue: ${probe.message}`);
        break;
      case 'services':
        recommendations.push(`Start required service: ${probe.name}`);
        break;
      case 'ai_providers':
        recommendations.push(`Configure AI provider or disable AI features`);
        break;
      case 'rate_limits':
        recommendations.push(`Configure rate limits for ${probe.name}`);
        break;
      case 'kill_switches':
        recommendations.push(`Ensure kill switch is accessible: ${probe.name}`);
        break;
      case 'autonomy':
        recommendations.push(`Review autonomy budget configuration`);
        break;
      case 'configuration':
        recommendations.push(`Fix configuration: ${probe.message}`);
        break;
    }
  }

  for (const probe of warned) {
    recommendations.push(`Consider addressing: ${probe.message}`);
  }

  return recommendations.slice(0, 10); // Limit recommendations
}
