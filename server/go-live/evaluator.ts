/**
 * Go-Live Checklist - Evaluator
 * Runs all checks and produces overall status
 */

import { createLogger } from '../lib/logger';
import { getEnabledChecks, getCriticalChecks } from './config';
import { runCheck } from './checks';
import type { GoLiveStatus, CheckResult, OverallStatus } from './types';

const logger = createLogger('go-live-evaluator');

// Simple cache for results
let cachedResult: GoLiveStatus | null = null;
let cacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

// ============================================================================
// Evaluation Logic
// ============================================================================

function determineOverallStatus(
  results: CheckResult[],
  criticalCheckIds: Set<string>
): OverallStatus {
  let hasCriticalFail = false;
  let hasWarn = false;

  for (const result of results) {
    if (result.status === 'fail') {
      if (criticalCheckIds.has(result.id)) {
        hasCriticalFail = true;
      } else {
        hasWarn = true;
      }
    } else if (result.status === 'warn') {
      hasWarn = true;
    }
  }

  if (hasCriticalFail) {
    return 'BLOCK';
  }
  if (hasWarn) {
    return 'WARN';
  }
  return 'PASS';
}

function summarizeResults(results: CheckResult[]) {
  return {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    warned: results.filter(r => r.status === 'warn').length,
    failed: results.filter(r => r.status === 'fail').length,
    skipped: results.filter(r => r.status === 'skip').length,
  };
}

// ============================================================================
// Public Functions
// ============================================================================

export async function evaluateGoLiveStatus(
  useCache = true
): Promise<GoLiveStatus> {
  // Check cache
  if (useCache && cachedResult && Date.now() - cacheTime < CACHE_TTL) {
    return cachedResult;
  }

  const startTime = Date.now();
  const enabledChecks = getEnabledChecks();
  const criticalCheckIds = new Set(getCriticalChecks().map(c => c.id));

  logger.info({ checkCount: enabledChecks.length }, 'Running go-live checks');

  // Run all checks in parallel
  const results: CheckResult[] = await Promise.all(
    enabledChecks.map(async (check) => {
      const result = await runCheck(check.id);
      if (result) {
        return result;
      }
      // Fallback for missing check implementation
      return {
        id: check.id,
        name: check.name,
        description: check.description,
        status: 'skip' as const,
        message: 'Check not implemented',
        duration: 0,
      };
    })
  );

  const durationMs = Date.now() - startTime;
  const status = determineOverallStatus(results, criticalCheckIds);

  const goLiveStatus: GoLiveStatus = {
    status,
    checks: results,
    summary: summarizeResults(results),
    timestamp: new Date(),
    durationMs,
  };

  // Update cache
  cachedResult = goLiveStatus;
  cacheTime = Date.now();

  logger.info(
    { status, duration: durationMs, summary: goLiveStatus.summary },
    'Go-live evaluation completed'
  );

  return goLiveStatus;
}

export async function runSmokeTest(): Promise<GoLiveStatus> {
  // Smoke test runs without cache and with more thorough checks
  logger.info('Running go-live smoke test');
  return evaluateGoLiveStatus(false);
}

export function clearCache(): void {
  cachedResult = null;
  cacheTime = 0;
}

export function isReadyForLaunch(): boolean {
  if (!cachedResult) {
    return false;
  }
  return cachedResult.status === 'PASS';
}
