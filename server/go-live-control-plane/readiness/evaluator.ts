/**
 * Go-Live Control Plane - Readiness Evaluator
 *
 * Orchestrates all probes and produces final readiness assessment
 */

import {
  ProbeResult,
  ReadinessResult,
  ReadinessStatus,
  ProbeCategory,
  ReadinessSummary,
  determineStatus,
  countByStatus,
  getBlockingIssues,
  getWarnings,
  createSummary,
} from './results';
import {
  runAllProbes,
  runProbesByCategory,
  runProbes,
  allProbes,
} from './probes';
import { isGLCPEnabled } from '../capabilities/types';

// Evaluation timeout (30 seconds max)
const EVALUATION_TIMEOUT = 30000;

// Cache for evaluation results (short TTL)
let cachedResult: ReadinessResult | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10000; // 10 seconds

/**
 * Full environment readiness evaluation
 */
export async function evaluateReadiness(options: {
  useCache?: boolean;
  categories?: ProbeCategory[];
  probeNames?: string[];
} = {}): Promise<ReadinessResult> {
  if (!isGLCPEnabled()) {
    return createDisabledResult();
  }

  const { useCache = true, categories, probeNames } = options;

  // Check cache
  if (useCache && cachedResult && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedResult;
  }

  const startTime = Date.now();

  try {
    // Run probes with timeout
    const probesPromise = selectProbes(categories, probeNames);
    const results = await Promise.race([
      probesPromise,
      createTimeoutPromise(),
    ]);

    const probeResults = results as ProbeResult[];
    const status = determineStatus(probeResults);
    const summary = createSummary(probeResults);

    const result: ReadinessResult = {
      status,
      probes: probeResults,
      summary,
      evaluatedAt: new Date(),
      durationMs: Date.now() - startTime,
      blockingIssues: getBlockingIssues(probeResults),
      warnings: getWarnings(probeResults),
      recommendations: generateRecommendations(status, probeResults),
    };

    // Cache result
    cachedResult = result;
    cacheTimestamp = Date.now();

    return result;
  } catch (err) {
    return createErrorResult(err, Date.now() - startTime);
  }
}

/**
 * Quick health check (subset of probes)
 */
export async function quickHealthCheck(): Promise<{
  healthy: boolean;
  status: ReadinessStatus;
  message: string;
}> {
  if (!isGLCPEnabled()) {
    return { healthy: true, status: 'READY', message: 'GLCP disabled' };
  }

  // Run only critical probes
  const criticalProbeNames = [
    'database_connection',
    'node_env',
    'emergency_stop',
  ];

  const results = await runProbes(criticalProbeNames);
  const status = determineStatus(results);

  return {
    healthy: status !== 'BLOCKED',
    status,
    message: status === 'BLOCKED'
      ? `Blocked: ${results.filter(r => r.status === 'fail').map(r => r.name).join(', ')}`
      : status === 'DEGRADED'
        ? `Degraded: ${results.filter(r => r.status === 'warn').map(r => r.name).join(', ')}`
        : 'All critical systems operational',
  };
}

/**
 * Evaluate specific category
 */
export async function evaluateCategory(category: ProbeCategory): Promise<{
  category: ProbeCategory;
  status: ReadinessStatus;
  probes: ProbeResult[];
  issues: string[];
}> {
  if (!isGLCPEnabled()) {
    return {
      category,
      status: 'READY',
      probes: [],
      issues: [],
    };
  }

  const probes = await runProbesByCategory(category);
  const status = determineStatus(probes);
  const issues = probes
    .filter(p => p.status !== 'pass')
    .map(p => `${p.name}: ${p.message}`);

  return {
    category,
    status,
    probes,
    issues,
  };
}

/**
 * Get readiness for go-live decision
 */
export async function getGoLiveReadiness(): Promise<{
  canGoLive: boolean;
  status: ReadinessStatus;
  blockers: string[];
  warnings: string[];
  score: number;
  recommendation: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'DO_NOT_PROCEED';
}> {
  const result = await evaluateReadiness({ useCache: false });

  const blockers = result.blockingIssues;
  const warnings = result.warnings;
  const score = calculateReadinessScore(result);

  let recommendation: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'DO_NOT_PROCEED';
  if (result.status === 'BLOCKED') {
    recommendation = 'DO_NOT_PROCEED';
  } else if (result.status === 'DEGRADED') {
    recommendation = 'PROCEED_WITH_CAUTION';
  } else {
    recommendation = 'PROCEED';
  }

  return {
    canGoLive: result.status !== 'BLOCKED',
    status: result.status,
    blockers,
    warnings,
    score,
    recommendation,
  };
}

/**
 * Watch readiness with callback
 */
export function watchReadiness(
  callback: (result: ReadinessResult) => void,
  intervalMs: number = 30000
): () => void {
  let running = true;

  const poll = async () => {
    if (!running) return;

    try {
      const result = await evaluateReadiness({ useCache: false });
      callback(result);
    } catch {
      // Silently continue polling
    }

    if (running) {
      setTimeout(poll, intervalMs);
    }
  };

  poll();

  // Return stop function
  return () => {
    running = false;
  };
}

/**
 * Get available probes
 */
export function getAvailableProbes(): {
  name: string;
  category: ProbeCategory;
}[] {
  return allProbes.map(p => ({
    name: p.name,
    category: p.category,
  }));
}

/**
 * Clear evaluation cache
 */
export function clearEvaluationCache(): void {
  cachedResult = null;
  cacheTimestamp = 0;
}

// === Helper functions ===

function selectProbes(
  categories?: ProbeCategory[],
  probeNames?: string[]
): Promise<ProbeResult[]> {
  if (probeNames && probeNames.length > 0) {
    return runProbes(probeNames);
  }

  if (categories && categories.length > 0) {
    // Run probes for all specified categories
    return Promise.all(categories.map(runProbesByCategory))
      .then(results => results.flat());
  }

  return runAllProbes();
}

function createTimeoutPromise(): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Evaluation timeout')), EVALUATION_TIMEOUT)
  );
}

function createDisabledResult(): ReadinessResult {
  return {
    status: 'READY',
    probes: [],
    summary: {
      total: 0,
      passed: 0,
      warned: 0,
      failed: 0,
      byCategory: {} as any,
    },
    evaluatedAt: new Date(),
    durationMs: 0,
    blockingIssues: [],
    warnings: [],
    recommendations: ['GLCP is disabled - enable with ENABLE_GLCP=true'],
  };
}

function createErrorResult(err: unknown, durationMs: number): ReadinessResult {
  const message = err instanceof Error ? err.message : 'Unknown error';

  return {
    status: 'BLOCKED',
    probes: [],
    summary: {
      total: 0,
      passed: 0,
      warned: 0,
      failed: 1,
      byCategory: {} as any,
    },
    evaluatedAt: new Date(),
    durationMs,
    blockingIssues: [`Evaluation failed: ${message}`],
    warnings: [],
    recommendations: ['Fix evaluation errors before proceeding'],
  };
}

function calculateReadinessScore(result: ReadinessResult): number {
  if (result.probes.length === 0) return 100;

  const { passed, total } = result.summary;
  const warned = result.summary.warned;

  // Passed = full points, warned = half points, failed = 0
  const score = ((passed + warned * 0.5) / total) * 100;
  return Math.round(score);
}

function generateRecommendations(
  status: ReadinessStatus,
  probes: ProbeResult[]
): string[] {
  const recommendations: string[] = [];

  if (status === 'BLOCKED') {
    recommendations.push('Resolve all blocking issues before proceeding');

    const failedProbes = probes.filter(p => p.status === 'fail');
    for (const probe of failedProbes) {
      recommendations.push(`Fix ${probe.name}: ${probe.message}`);
    }
  }

  if (status === 'DEGRADED') {
    recommendations.push('Consider addressing warnings for optimal performance');

    const warnProbes = probes.filter(p => p.status === 'warn');
    if (warnProbes.length > 3) {
      recommendations.push(`${warnProbes.length} warnings detected - review before go-live`);
    }
  }

  // Category-specific recommendations
  const categoryStatus: Record<string, ProbeResult[]> = {};
  for (const probe of probes) {
    if (!categoryStatus[probe.category]) {
      categoryStatus[probe.category] = [];
    }
    categoryStatus[probe.category].push(probe);
  }

  for (const [category, catProbes] of Object.entries(categoryStatus)) {
    const allPass = catProbes.every(p => p.status === 'pass');
    if (!allPass && category === 'database') {
      recommendations.push('Database issues may cause data loss - prioritize fix');
    }
    if (!allPass && category === 'kill_switches') {
      recommendations.push('Ensure emergency controls are operational before go-live');
    }
  }

  return recommendations;
}
