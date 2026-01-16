/**
 * Platform Readiness - Evaluator
 * Computes global readiness score and status
 */

import { createLogger } from '../lib/logger';
import { READINESS_CONFIG } from './config';
import { collectAllSignals } from './collectors';
import { buildChecklist } from './checklist';
import type {
  PlatformReadinessStatus,
  ReadinessStatus,
  ReadinessSignal,
  Blocker,
  CheckCategory,
  SimulationResult,
} from './types';

const logger = createLogger('readiness-evaluator');

// Cache
let cachedStatus: PlatformReadinessStatus | null = null;
let cacheTime = 0;

// ============================================================================
// Score Calculation
// ============================================================================

function calculateCategoryScores(signals: ReadinessSignal[]): Record<CheckCategory, number> {
  const categories: CheckCategory[] = ['content', 'infra', 'ai', 'seo', 'ops', 'revenue'];
  const scores: Record<CheckCategory, number> = {} as Record<CheckCategory, number>;

  for (const category of categories) {
    const categorySignals = signals.filter(s => s.category === category);
    if (categorySignals.length === 0) {
      scores[category] = 100; // No signals = assume OK
    } else {
      const sum = categorySignals.reduce((acc, s) => acc + s.score, 0);
      scores[category] = Math.round(sum / categorySignals.length);
    }
  }

  return scores;
}

function calculateOverallScore(categoryScores: Record<CheckCategory, number>): number {
  const weights = READINESS_CONFIG.categoryWeights;
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [category, score] of Object.entries(categoryScores)) {
    const weight = weights[category as CheckCategory] || 0;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// ============================================================================
// Blocker Extraction
// ============================================================================

function extractBlockers(signals: ReadinessSignal[]): { hard: Blocker[]; soft: Blocker[] } {
  const hard: Blocker[] = [];
  const soft: Blocker[] = [];

  for (const signal of signals) {
    if (signal.status === 'fail') {
      const blocker: Blocker = {
        id: `${signal.source}_${Date.now()}`,
        source: signal.source,
        category: signal.category,
        severity: signal.isBlocking ? 'hard' : 'soft',
        title: signal.name,
        description: signal.message,
        detectedAt: signal.collectedAt,
      };

      if (signal.isBlocking) {
        hard.push(blocker);
      } else {
        soft.push(blocker);
      }
    } else if (signal.status === 'warn') {
      soft.push({
        id: `${signal.source}_warn_${Date.now()}`,
        source: signal.source,
        category: signal.category,
        severity: 'soft',
        title: signal.name,
        description: signal.message,
        detectedAt: signal.collectedAt,
      });
    }
  }

  return { hard, soft };
}

// ============================================================================
// Status Determination
// ============================================================================

function determineStatus(
  score: number,
  hasHardBlockers: boolean
): ReadinessStatus {
  if (hasHardBlockers) {
    return 'BLOCKED';
  }

  if (score < READINESS_CONFIG.blockingThreshold) {
    return 'BLOCKED';
  }

  if (score < READINESS_CONFIG.warningThreshold) {
    return 'DEGRADED';
  }

  return 'READY';
}

// ============================================================================
// Main Evaluation
// ============================================================================

export async function evaluateReadiness(
  useCache = true
): Promise<PlatformReadinessStatus> {
  // Check cache
  if (
    useCache &&
    cachedStatus &&
    Date.now() - cacheTime < READINESS_CONFIG.cacheDurationMs
  ) {
    return cachedStatus;
  }

  const startTime = Date.now();

  logger.info('Starting platform readiness evaluation');

  // Collect all signals
  const collectorResults = await collectAllSignals();
  const allSignals = collectorResults.flatMap(r => r.signals);

  // Calculate scores
  const categoryScores = calculateCategoryScores(allSignals);
  const overallScore = calculateOverallScore(categoryScores);

  // Extract blockers
  const { hard: blockers, soft: warnings } = extractBlockers(allSignals);

  // Determine status
  const status = determineStatus(overallScore, blockers.length > 0);

  // Build checklist
  const checklist = buildChecklist(allSignals, categoryScores);

  const result: PlatformReadinessStatus = {
    status,
    score: overallScore,
    blockers,
    warnings,
    signals: allSignals,
    checklist,
    canGoLive: status === 'READY',
    evaluatedAt: new Date(),
    durationMs: Date.now() - startTime,
  };

  // Cache result
  cachedStatus = result;
  cacheTime = Date.now();

  logger.info(
    { status, score: overallScore, blockers: blockers.length, warnings: warnings.length },
    'Platform readiness evaluation completed'
  );

  return result;
}

// ============================================================================
// Simulation
// ============================================================================

export async function simulateGoLive(): Promise<SimulationResult> {
  const readiness = await evaluateReadiness(false);

  const blockingReasons = readiness.blockers.map(b => `${b.title}: ${b.description}`);
  const warningReasons = readiness.warnings.map(w => `${w.title}: ${w.description}`);

  const recommendations: string[] = [];

  if (readiness.status === 'BLOCKED') {
    recommendations.push('Resolve all blocking issues before proceeding');
    for (const blocker of readiness.blockers) {
      if (blocker.remediation) {
        recommendations.push(blocker.remediation);
      }
    }
  } else if (readiness.status === 'DEGRADED') {
    recommendations.push('Platform can launch but with reduced functionality');
    recommendations.push('Consider addressing warnings for optimal performance');
  } else {
    recommendations.push('Platform is ready for launch');
  }

  return {
    wouldSucceed: readiness.canGoLive,
    status: readiness.status,
    score: readiness.score,
    blockingReasons,
    warningReasons,
    recommendations,
    simulatedAt: new Date(),
  };
}

// ============================================================================
// Utilities
// ============================================================================

export function clearCache(): void {
  cachedStatus = null;
  cacheTime = 0;
}

export function getBlockers(): Blocker[] {
  return cachedStatus?.blockers || [];
}

export function isReady(): boolean {
  return cachedStatus?.canGoLive || false;
}
