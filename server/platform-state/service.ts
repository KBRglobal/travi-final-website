/**
 * Platform State — Service
 *
 * Single Source of Truth for platform state.
 * Produces atomic, deterministic, cached snapshots.
 */

import { log } from '../lib/logger';
import {
  CONTRACT,
  evaluateSystemHealth,
  evaluateIntentPermission,
  CONTRADICTION_RULES,
  INTENT_RISK,
  type SystemHealthState,
  type FeatureAvailability,
  type IntentType,
  type HealthSignals,
} from '../platform-contract';
import type {
  PlatformSnapshot,
  ReadinessState,
  AutonomyState,
  GovernanceState,
  RiskSummary,
  IncidentSummary,
  FeatureState,
  AvailabilityMatrix,
  FeatureAvailabilityEntry,
  IntentRequest,
  IntentResponse,
  ContradictionSignal,
  ContradictionReport,
  AggregationResult,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[PlatformState] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[PlatformState] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[PlatformState] ${msg}`, data),
};

// ============================================================
// CACHE
// ============================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: Date;
}

const cache: {
  snapshot?: CacheEntry<PlatformSnapshot>;
  availability?: CacheEntry<AvailabilityMatrix>;
} = {};

function isCacheValid<T>(entry?: CacheEntry<T>): entry is CacheEntry<T> {
  return !!entry && entry.expiresAt > new Date();
}

// ============================================================
// ID GENERATION
// ============================================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// FEATURE DEFINITIONS
// ============================================================

const PLATFORM_FEATURES = [
  { id: 'content_publishing', name: 'Content Publishing', envVar: 'ENABLE_CONTENT_PUBLISHING' },
  { id: 'sitemap', name: 'Sitemap Generation', envVar: 'ENABLE_SITEMAP' },
  { id: 'search', name: 'Search', envVar: 'ENABLE_SEARCH' },
  { id: 'notifications', name: 'Notifications', envVar: 'ENABLE_NOTIFICATIONS' },
  { id: 'activity_feed', name: 'Activity Feed', envVar: 'ENABLE_ACTIVITY_FEED' },
  { id: 'dashboard', name: 'Admin Dashboard', envVar: 'ENABLE_ADMIN_DASHBOARD' },
  { id: 'import_export', name: 'Import/Export', envVar: 'ENABLE_IMPORT_EXPORT' },
  { id: 'autonomy', name: 'Autonomy Governor', envVar: 'ENABLE_AUTONOMY_GOVERNOR' },
  { id: 'governance', name: 'Governance Engine', envVar: 'ENABLE_GOVERNANCE' },
  { id: 'risk_registry', name: 'Risk Registry', envVar: 'ENABLE_RISK_REGISTRY' },
  { id: 'incident_manager', name: 'Incident Manager', envVar: 'ENABLE_INCIDENT_MANAGER' },
  { id: 'intelligence_hub', name: 'Intelligence Hub', envVar: 'ENABLE_INTELLIGENCE_HUB' },
];

// ============================================================
// AGGREGATION HELPERS
// ============================================================

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<{ data: T; timedOut: boolean }> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<{ data: T; timedOut: boolean }>((resolve) => {
    timer = setTimeout(() => resolve({ data: fallback, timedOut: true }), timeoutMs);
  });

  try {
    const data = await Promise.race([
      promise.then(data => ({ data, timedOut: false })),
      timeoutPromise,
    ]);
    clearTimeout(timer!);
    return data;
  } catch {
    clearTimeout(timer!);
    return { data: fallback, timedOut: true };
  }
}

// ============================================================
// DATA AGGREGATORS
// ============================================================

async function aggregateReadiness(): Promise<AggregationResult<ReadinessState>> {
  const start = Date.now();

  // In production, would call go-live service
  const data: ReadinessState = {
    score: 85,
    status: 'ready',
    blockers: [],
    lastCheck: new Date(),
  };

  return {
    success: true,
    data,
    source: 'go-live-v2',
    latencyMs: Date.now() - start,
    stale: false,
  };
}

async function aggregateAutonomy(): Promise<AggregationResult<AutonomyState>> {
  const start = Date.now();

  // In production, would call autonomy governor
  const data: AutonomyState = {
    mode: 'normal',
    dailyActionsUsed: 150,
    dailyActionsLimit: CONTRACT.autonomy.maxDailyActions,
    hourlyActionsUsed: 12,
    hourlyActionsLimit: CONTRACT.autonomy.maxHourlyActions,
    budgetUsedPercent: 45,
    restrictions: [],
  };

  return {
    success: true,
    data,
    source: 'autonomy-governor',
    latencyMs: Date.now() - start,
    stale: false,
  };
}

async function aggregateGovernance(): Promise<AggregationResult<GovernanceState>> {
  const start = Date.now();

  // In production, would call governance systems
  const data: GovernanceState = {
    blockedApprovals: 2,
    pendingApprovals: 5,
    activeOverrides: 0,
    recentViolations: 0,
    policyStatus: 'enforcing',
  };

  return {
    success: true,
    data,
    source: 'governance-engine',
    latencyMs: Date.now() - start,
    stale: false,
  };
}

async function aggregateRisks(): Promise<AggregationResult<RiskSummary>> {
  const start = Date.now();

  // In production, would call risk registry
  const data: RiskSummary = {
    criticalCount: 0,
    highCount: 1,
    mediumCount: 3,
    lowCount: 5,
    topRisks: [
      {
        id: 'risk-001',
        title: 'Third-party API dependency',
        severity: 'high',
        domain: 'integration',
      },
    ],
    lastUpdated: new Date(),
  };

  return {
    success: true,
    data,
    source: 'risk-registry',
    latencyMs: Date.now() - start,
    stale: false,
  };
}

async function aggregateIncidents(): Promise<AggregationResult<IncidentSummary>> {
  const start = Date.now();

  // In production, would call incident manager
  const data: IncidentSummary = {
    activeCritical: 0,
    activeHigh: 0,
    activeMedium: 1,
    activeLow: 2,
    recentIncidents: [
      {
        id: 'inc-001',
        title: 'Elevated API latency',
        severity: 'medium',
        status: 'investigating',
        startedAt: new Date(Date.now() - 3600000),
      },
    ],
    lastIncidentAt: new Date(Date.now() - 3600000),
  };

  return {
    success: true,
    data,
    source: 'incident-manager',
    latencyMs: Date.now() - start,
    stale: false,
  };
}

function aggregateFeatures(): FeatureState[] {
  return PLATFORM_FEATURES.map(f => {
    const enabled = process.env[f.envVar] === 'true';
    return {
      id: f.id,
      name: f.name,
      enabled,
      availability: enabled ? 'available' : 'blocked',
    };
  });
}

// ============================================================
// HEALTH SIGNALS BUILDER
// ============================================================

function buildHealthSignals(
  readiness: ReadinessState,
  autonomy: AutonomyState,
  governance: GovernanceState,
  risks: RiskSummary,
  incidents: IncidentSummary
): HealthSignals {
  return {
    readinessScore: readiness.score,
    autonomyState: autonomy.mode,
    activeCriticalIncidents: incidents.activeCritical,
    activeHighIncidents: incidents.activeHigh,
    activeMediumIncidents: incidents.activeMedium,
    criticalRisks: risks.criticalCount,
    highRisks: risks.highCount,
    blastRadius: 0, // Would be calculated from risk data
    blockedApprovals: governance.blockedApprovals,
    pendingOverrides: governance.activeOverrides,
    budgetUsagePercent: autonomy.budgetUsedPercent,
  };
}

// ============================================================
// CONTRADICTION DETECTION
// ============================================================

function detectContradictions(
  signals: HealthSignals,
  readiness: ReadinessState,
  autonomy: AutonomyState
): ContradictionSignal[] {
  const contradictions: ContradictionSignal[] = [];

  for (const rule of CONTRADICTION_RULES) {
    if (rule.detection(signals)) {
      contradictions.push({
        id: generateId('contradiction'),
        type: rule.type,
        severity: rule.severity,
        description: rule.description,
        detectedAt: new Date(),
        signalA: {
          source: 'readiness',
          value: `${readiness.score}`,
          interpretation: readiness.status,
        },
        signalB: {
          source: 'autonomy',
          value: autonomy.mode,
          interpretation: autonomy.mode === 'normal' ? 'Operating normally' : 'Restricted',
        },
        suggestedResolution: rule.suggestedResolution,
      });
    }
  }

  return contradictions;
}

// ============================================================
// SNAPSHOT BUILDER
// ============================================================

async function buildSnapshot(): Promise<PlatformSnapshot> {
  const snapshotId = generateId('snapshot');
  const now = new Date();
  const ttl = CONTRACT.performance.snapshotTTLSeconds;
  const timeout = CONTRACT.performance.maxAggregationTimeoutMs;

  logger.info('Building platform snapshot', { snapshotId });

  // Aggregate all data in parallel with timeouts
  const [
    readinessResult,
    autonomyResult,
    governanceResult,
    risksResult,
    incidentsResult,
  ] = await Promise.all([
    withTimeout(aggregateReadiness(), timeout, null as unknown as AggregationResult<ReadinessState>),
    withTimeout(aggregateAutonomy(), timeout, null as unknown as AggregationResult<AutonomyState>),
    withTimeout(aggregateGovernance(), timeout, null as unknown as AggregationResult<GovernanceState>),
    withTimeout(aggregateRisks(), timeout, null as unknown as AggregationResult<RiskSummary>),
    withTimeout(aggregateIncidents(), timeout, null as unknown as AggregationResult<IncidentSummary>),
  ]);

  // Extract data with defaults
  const readiness: ReadinessState = readinessResult.data?.data || {
    score: 0,
    status: 'not_ready',
    blockers: ['Data unavailable'],
    lastCheck: now,
  };

  const autonomy: AutonomyState = autonomyResult.data?.data || {
    mode: 'restricted',
    dailyActionsUsed: 0,
    dailyActionsLimit: 0,
    hourlyActionsUsed: 0,
    hourlyActionsLimit: 0,
    budgetUsedPercent: 100,
    restrictions: ['Data unavailable'],
  };

  const governance: GovernanceState = governanceResult.data?.data || {
    blockedApprovals: 0,
    pendingApprovals: 0,
    activeOverrides: 0,
    recentViolations: 0,
    policyStatus: 'disabled',
  };

  const risks: RiskSummary = risksResult.data?.data || {
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    topRisks: [],
    lastUpdated: now,
  };

  const incidents: IncidentSummary = incidentsResult.data?.data || {
    activeCritical: 0,
    activeHigh: 0,
    activeMedium: 0,
    activeLow: 0,
    recentIncidents: [],
  };

  // Build health signals
  const signals = buildHealthSignals(readiness, autonomy, governance, risks, incidents);

  // Evaluate health
  const health = evaluateSystemHealth(signals);

  // Calculate composite health score
  const healthScore = Math.round(
    readiness.score * 0.3 +
    (100 - autonomy.budgetUsedPercent) * 0.2 +
    (1 - incidents.activeCritical * 25 - incidents.activeHigh * 10) * 100 * 0.3 +
    (1 - risks.criticalCount * 20 - risks.highCount * 5) * 100 * 0.2
  );

  // Aggregate features
  const features = aggregateFeatures();

  // Detect contradictions
  const contradictions = detectContradictions(signals, readiness, autonomy);

  // Build summary
  const hasContradictions = contradictions.length > 0;
  const summary = {
    headline: hasContradictions
      ? `System ${health} with ${contradictions.length} signal conflict(s)`
      : `System ${health}`,
    recommendation: health === 'healthy'
      ? 'All systems nominal. Safe to proceed with operations.'
      : health === 'degraded'
      ? 'Some issues present. Monitor closely.'
      : health === 'at_risk'
      ? 'Significant issues. Limit high-risk operations.'
      : 'Critical issues. Block autonomous operations.',
    canGoLive: health === 'healthy' || health === 'degraded',
    canOperate: health !== 'dangerous',
    requiresAttention: health !== 'healthy' || hasContradictions,
  };

  // Build sources
  const sources = [
    { system: 'readiness', status: readinessResult.timedOut ? 'timeout' : 'ok' as const, latencyMs: readinessResult.data?.latencyMs || 0 },
    { system: 'autonomy', status: autonomyResult.timedOut ? 'timeout' : 'ok' as const, latencyMs: autonomyResult.data?.latencyMs || 0 },
    { system: 'governance', status: governanceResult.timedOut ? 'timeout' : 'ok' as const, latencyMs: governanceResult.data?.latencyMs || 0 },
    { system: 'risks', status: risksResult.timedOut ? 'timeout' : 'ok' as const, latencyMs: risksResult.data?.latencyMs || 0 },
    { system: 'incidents', status: incidentsResult.timedOut ? 'timeout' : 'ok' as const, latencyMs: incidentsResult.data?.latencyMs || 0 },
  ] as any;

  return {
    id: snapshotId,
    timestamp: now,
    ttlSeconds: ttl,
    expiresAt: new Date(now.getTime() + ttl * 1000),
    health,
    healthScore: Math.max(0, Math.min(100, healthScore)),
    readiness,
    autonomy,
    governance,
    risks,
    incidents,
    features,
    contradictions,
    summary,
    sources,
  };
}

// ============================================================
// AVAILABILITY MATRIX BUILDER
// ============================================================

function buildAvailabilityMatrix(snapshot: PlatformSnapshot): AvailabilityMatrix {
  const entries: FeatureAvailabilityEntry[] = [];
  const health = snapshot.health;

  for (const feature of snapshot.features) {
    let availability: FeatureAvailability = feature.availability;
    let reason = feature.enabled ? 'Feature enabled' : 'Feature disabled';
    const constraints: string[] = [];
    const blockedBy: string[] = [];

    // If feature is enabled, check system health
    if (feature.enabled) {
      if (health === 'dangerous') {
        availability = 'blocked';
        reason = 'Blocked due to dangerous system state';
        blockedBy.push('system_health');
      } else if (health === 'at_risk') {
        availability = 'requires_approval';
        reason = 'Requires approval due to at-risk system state';
      } else if (health === 'degraded') {
        availability = 'available_with_constraints';
        reason = 'Available with constraints due to degraded state';
        constraints.push('Rate limits active', 'Enhanced monitoring');
      } else if (health === 'unpredictable') {
        availability = 'simulated_only';
        reason = 'Simulation only due to unpredictable signals';
      }
    } else {
      availability = 'blocked';
      blockedBy.push('feature_flag');
    }

    entries.push({
      featureId: feature.id,
      featureName: feature.name,
      availability,
      reason,
      blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
      constraints: constraints.length > 0 ? constraints : undefined,
    });
  }

  const summary = {
    available: entries.filter(e => e.availability === 'available').length,
    constrained: entries.filter(e => e.availability === 'available_with_constraints').length,
    blocked: entries.filter(e => e.availability === 'blocked').length,
    requiresApproval: entries.filter(e => e.availability === 'requires_approval').length,
    simulatedOnly: entries.filter(e => e.availability === 'simulated_only').length,
  };

  return {
    timestamp: new Date(),
    systemHealth: health,
    features: entries,
    summary,
  };
}

// ============================================================
// INTENT EVALUATION
// ============================================================

function evaluateIntent(
  request: IntentRequest,
  snapshot: PlatformSnapshot
): IntentResponse {
  const signals = buildHealthSignals(
    snapshot.readiness,
    snapshot.autonomy,
    snapshot.governance,
    snapshot.risks,
    snapshot.incidents
  );

  const permission = evaluateIntentPermission(request.intent, snapshot.health, signals);

  // Suggest alternatives if blocked
  const alternativeIntents: IntentType[] = [];
  if (!permission.allowed) {
    const risk = INTENT_RISK[request.intent];
    if (risk === 'critical' || risk === 'high') {
      // Suggest lower-risk alternatives
      if (request.intent === 'go_live') {
        alternativeIntents.push('export_data');
      }
      if (request.intent === 'bulk_update') {
        alternativeIntents.push('publish_content');
      }
    }
  }

  return {
    intent: request.intent,
    allowed: permission.allowed,
    confidence: permission.confidence,
    reason: permission.reason,
    requiredActions: permission.requiredActions,
    constraints: permission.constraints,
    alternativeIntents: alternativeIntents.length > 0 ? alternativeIntents : undefined,
    evaluatedAt: new Date(),
    snapshotId: snapshot.id,
  };
}

// ============================================================
// CONTRADICTION REPORT
// ============================================================

function buildContradictionReport(snapshot: PlatformSnapshot): ContradictionReport {
  const contradictions = snapshot.contradictions;
  const criticalCount = contradictions.filter(c => c.severity === 'critical').length;
  const highCount = contradictions.filter(c => c.severity === 'high').length;

  let overallCoherence: 'coherent' | 'minor_issues' | 'conflicting' | 'chaotic';
  let coherenceScore: number;

  if (contradictions.length === 0) {
    overallCoherence = 'coherent';
    coherenceScore = 100;
  } else if (criticalCount > 0 || highCount > 2) {
    overallCoherence = 'chaotic';
    coherenceScore = Math.max(0, 30 - criticalCount * 15 - highCount * 5);
  } else if (highCount > 0) {
    overallCoherence = 'conflicting';
    coherenceScore = Math.max(30, 70 - highCount * 10);
  } else {
    overallCoherence = 'minor_issues';
    coherenceScore = Math.max(70, 90 - contradictions.length * 5);
  }

  return {
    timestamp: new Date(),
    snapshotId: snapshot.id,
    contradictions,
    overallCoherence,
    coherenceScore,
  };
}

// ============================================================
// MAIN SERVICE CLASS
// ============================================================

class PlatformStateService {
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_PLATFORM_STATE === 'true';
    if (this.enabled) {
      logger.info('Platform State Service initialized');
    }
  }

  /**
   * Get current platform snapshot (cached)
   */
  async getSnapshot(forceRefresh = false): Promise<PlatformSnapshot> {
    if (!forceRefresh && isCacheValid(cache.snapshot)) {
      return cache.snapshot.data;
    }

    const snapshot = await buildSnapshot();

    cache.snapshot = {
      data: snapshot,
      expiresAt: snapshot.expiresAt,
    };

    return snapshot;
  }

  /**
   * Get feature availability matrix
   */
  async getAvailability(): Promise<AvailabilityMatrix> {
    if (isCacheValid(cache.availability)) {
      return cache.availability.data;
    }

    const snapshot = await this.getSnapshot();
    const matrix = buildAvailabilityMatrix(snapshot);

    cache.availability = {
      data: matrix,
      expiresAt: new Date(Date.now() + CONTRACT.performance.snapshotTTLSeconds * 1000),
    };

    return matrix;
  }

  /**
   * Evaluate if an intent is allowed
   */
  async canI(request: IntentRequest): Promise<IntentResponse> {
    const snapshot = await this.getSnapshot();
    return evaluateIntent(request, snapshot);
  }

  /**
   * Get contradiction report
   */
  async getContradictions(): Promise<ContradictionReport> {
    const snapshot = await this.getSnapshot();
    return buildContradictionReport(snapshot);
  }

  /**
   * Quick health check
   */
  async getHealthSummary(): Promise<{
    health: SystemHealthState;
    score: number;
    canOperate: boolean;
    headline: string;
  }> {
    const snapshot = await this.getSnapshot();
    return {
      health: snapshot.health,
      score: snapshot.healthScore,
      canOperate: snapshot.summary.canOperate,
      headline: snapshot.summary.headline,
    };
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    delete cache.snapshot;
    delete cache.availability;
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// ============================================================
// SINGLETON
// ============================================================

let instance: PlatformStateService | null = null;

export function getPlatformStateService(): PlatformStateService {
  if (!instance) {
    instance = new PlatformStateService();
  }
  return instance;
}

export function resetPlatformStateService(): void {
  if (instance) {
    instance.clearCache();
  }
  instance = null;
}

export { PlatformStateService };
