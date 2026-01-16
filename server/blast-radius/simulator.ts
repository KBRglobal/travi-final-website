/**
 * Blast Radius & Impact Simulator - Core Simulation Logic
 */

import { createLogger } from '../lib/logger';
import { BLAST_RADIUS_CONFIG, isBlastRadiusEnabled } from './config';
import type {
  ImpactTarget, ImpactScope, ImpactSeverity, ImpactMetrics,
  ImpactBreakdown, BlastRadiusResult, DependencyNode, SimulationHistory,
  BlastRadiusStatus,
} from './types';

const logger = createLogger('blast-radius');

// Storage
const simulationHistory: SimulationHistory[] = [];
const resultCache = new Map<string, { result: BlastRadiusResult; expiresAt: number }>();

// ============================================================================
// Impact Calculation
// ============================================================================

function calculateBaseImpact(target: ImpactTarget): number {
  // Base impact percentage based on scope
  const scopeImpact: Record<ImpactScope, number> = {
    'feature': 0.20,    // Features affect ~20% of users
    'entity': 0.05,     // Single entity affects ~5%
    'locale': 0.15,     // Locale affects portion based on distribution
    'segment': 0.25,    // Segment affects portion based on distribution
    'all': 1.0,         // All affects everyone
  };

  let impact = scopeImpact[target.type] || 0.10;

  // Adjust based on specific target
  if (target.type === 'locale') {
    const dist = BLAST_RADIUS_CONFIG.localeDistribution as Record<string, number>;
    impact = dist[target.id] || dist['other'] || 0.08;
  } else if (target.type === 'segment') {
    const dist = BLAST_RADIUS_CONFIG.segmentDistribution as Record<string, number>;
    impact = dist[target.id] || 0.10;
  }

  return impact;
}

function calculateMetrics(impactPercent: number): ImpactMetrics {
  const cfg = BLAST_RADIUS_CONFIG;
  const usersAffected = Math.round(cfg.totalUsers * impactPercent);
  const contentAffected = Math.round(cfg.totalContent * impactPercent);
  const revenueAtRisk = Math.round(cfg.totalRevenue * impactPercent * 100) / 100;
  const transactionsAtRisk = Math.round(usersAffected * 0.1); // 10% conversion assumption

  return {
    usersAffected,
    usersAffectedPercent: Math.round(impactPercent * 10000) / 100,
    contentAffected,
    contentAffectedPercent: Math.round(impactPercent * 10000) / 100,
    revenueAtRisk,
    revenueAtRiskPercent: Math.round(impactPercent * 10000) / 100,
    transactionsAtRisk,
  };
}

function calculateSeverity(metrics: ImpactMetrics): ImpactSeverity {
  const percent = metrics.usersAffectedPercent;
  const thresholds = BLAST_RADIUS_CONFIG.severityThresholds;

  if (percent >= thresholds.critical) return 'critical';
  if (percent >= thresholds.high) return 'high';
  if (percent >= thresholds.medium) return 'medium';
  if (percent >= thresholds.low) return 'low';
  return 'none';
}

function calculateBreakdown(impactPercent: number): ImpactBreakdown {
  const byLocale: Record<string, ImpactMetrics> = {};
  const bySegment: Record<string, ImpactMetrics> = {};
  const byFeature: Record<string, ImpactMetrics> = {};

  // Distribute impact across locales
  for (const [locale, dist] of Object.entries(BLAST_RADIUS_CONFIG.localeDistribution)) {
    const localeImpact = impactPercent * (dist as number);
    byLocale[locale] = calculateMetrics(localeImpact);
  }

  // Distribute impact across segments
  for (const [segment, dist] of Object.entries(BLAST_RADIUS_CONFIG.segmentDistribution)) {
    const segmentImpact = impactPercent * (dist as number);
    bySegment[segment] = calculateMetrics(segmentImpact);
  }

  // Simulate feature breakdown
  const features = ['search', 'checkout', 'browse', 'account', 'api'];
  const featureWeights = [0.30, 0.25, 0.20, 0.15, 0.10];
  features.forEach((feature, i) => {
    byFeature[feature] = calculateMetrics(impactPercent * featureWeights[i]);
  });

  return { byLocale, bySegment, byFeature };
}

function findDependencies(target: ImpactTarget): DependencyNode[] {
  const deps: DependencyNode[] = [];

  // Simulate dependency discovery
  if (target.type === 'feature') {
    deps.push(
      { id: 'db_primary', type: 'database', name: 'Primary DB', impactLevel: 'direct', metrics: { usersAffectedPercent: 100 } },
      { id: 'cache_redis', type: 'cache', name: 'Redis Cache', impactLevel: 'indirect', metrics: { usersAffectedPercent: 80 } },
      { id: 'api_gateway', type: 'service', name: 'API Gateway', impactLevel: 'cascading', metrics: { usersAffectedPercent: 60 } },
    );
  } else if (target.type === 'entity') {
    deps.push(
      { id: 'entity_cache', type: 'cache', name: 'Entity Cache', impactLevel: 'direct', metrics: { contentAffectedPercent: 100 } },
      { id: 'search_index', type: 'index', name: 'Search Index', impactLevel: 'indirect', metrics: { contentAffectedPercent: 50 } },
    );
  } else if (target.type === 'locale') {
    deps.push(
      { id: 'cdn_edge', type: 'cdn', name: 'CDN Edge', impactLevel: 'direct', metrics: { usersAffectedPercent: 90 } },
      { id: 'translation_svc', type: 'service', name: 'Translation Service', impactLevel: 'indirect', metrics: {} },
    );
  }

  return deps;
}

function generateRecommendations(severity: ImpactSeverity, target: ImpactTarget): string[] {
  const recs: string[] = [];

  if (severity === 'critical' || severity === 'high') {
    recs.push('Consider phased rollout to reduce blast radius');
    recs.push('Prepare rollback plan before deployment');
    recs.push('Alert on-call team before proceeding');
  }

  if (severity === 'medium') {
    recs.push('Monitor error rates closely during rollout');
    recs.push('Consider canary deployment');
  }

  if (target.type === 'locale') {
    recs.push(`Test thoroughly in ${target.id} locale environment`);
  }

  if (target.type === 'feature') {
    recs.push('Enable feature flags for gradual rollout');
    recs.push('Set up A/B test to validate impact');
  }

  if (recs.length === 0) {
    recs.push('Low impact expected; proceed with standard deployment');
  }

  return recs;
}

// ============================================================================
// Public API
// ============================================================================

export async function simulateBlastRadius(target: ImpactTarget): Promise<BlastRadiusResult> {
  if (!isBlastRadiusEnabled()) {
    throw new Error('Blast radius simulator is not enabled');
  }

  const start = Date.now();
  const cacheKey = `${target.type}:${target.id}`;

  // Check cache
  const cached = resultCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const impactPercent = calculateBaseImpact(target);
  const metrics = calculateMetrics(impactPercent);
  const severity = calculateSeverity(metrics);
  const breakdown = calculateBreakdown(impactPercent);
  const dependencies = findDependencies(target);
  const recommendations = generateRecommendations(severity, target);

  const result: BlastRadiusResult = {
    id: `blast_${Date.now()}`,
    target,
    severity,
    metrics,
    breakdown,
    dependencies,
    recommendations,
    simulatedAt: new Date(),
    durationMs: Date.now() - start,
  };

  // Cache result
  resultCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + BLAST_RADIUS_CONFIG.cacheDurationMs,
  });

  // Store in history
  const historyEntry: SimulationHistory = {
    id: result.id,
    target,
    result,
    simulatedAt: new Date(),
  };
  simulationHistory.unshift(historyEntry);
  if (simulationHistory.length > BLAST_RADIUS_CONFIG.maxHistory) {
    simulationHistory.pop();
  }

  logger.info({ target, severity, usersAffected: metrics.usersAffected }, 'Blast radius simulated');
  return result;
}

export async function simulateMultiple(targets: ImpactTarget[]): Promise<BlastRadiusResult[]> {
  const results: BlastRadiusResult[] = [];
  for (const target of targets) {
    results.push(await simulateBlastRadius(target));
  }
  return results;
}

export function compareScenarios(results: BlastRadiusResult[]): {
  worstCase: BlastRadiusResult | null;
  bestCase: BlastRadiusResult | null;
  totalImpact: ImpactMetrics;
} {
  if (results.length === 0) {
    return {
      worstCase: null,
      bestCase: null,
      totalImpact: calculateMetrics(0),
    };
  }

  const sorted = [...results].sort(
    (a, b) => b.metrics.usersAffectedPercent - a.metrics.usersAffectedPercent
  );

  // Calculate combined impact (capped at 100%)
  const combinedPercent = Math.min(
    1.0,
    results.reduce((sum, r) => sum + r.metrics.usersAffectedPercent / 100, 0)
  );

  return {
    worstCase: sorted[0],
    bestCase: sorted[sorted.length - 1],
    totalImpact: calculateMetrics(combinedPercent),
  };
}

export function getSimulationHistory(limit = 50): SimulationHistory[] {
  return simulationHistory.slice(0, limit);
}

export function getStatus(): BlastRadiusStatus {
  return {
    enabled: isBlastRadiusEnabled(),
    simulationsRun: simulationHistory.length,
    lastSimulatedAt: simulationHistory[0]?.simulatedAt,
    cachedResults: resultCache.size,
  };
}

export function clearCache(): void {
  resultCache.clear();
}

export function clearHistory(): void {
  simulationHistory.length = 0;
}

export function clearAll(): void {
  clearCache();
  clearHistory();
}
