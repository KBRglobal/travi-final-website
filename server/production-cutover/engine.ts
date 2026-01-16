/**
 * Production Cutover Engine - Core Decision Logic
 */

import { createLogger } from '../lib/logger';
import { CUTOVER_CONFIG, isProductionCutoverEnabled } from './config';
import type {
  CutoverResult, CutoverDecision, CutoverMode, CutoverBlocker,
  CutoverSignature, SystemSnapshot, TimeBoxedApproval, EmergencyOverride,
} from './types';

const logger = createLogger('production-cutover');

// Storage
let cachedResult: CutoverResult | null = null;
let cacheTime = 0;
let activeApproval: TimeBoxedApproval | null = null;
let activeOverride: EmergencyOverride | null = null;
const decisionHistory: CutoverResult[] = [];
const maxHistory = 100;

// ============================================================================
// Snapshot Collection
// ============================================================================

async function captureSnapshot(): Promise<SystemSnapshot> {
  let readiness = { score: 100, status: 'UNKNOWN', blockers: 0 };
  let governor = { restrictions: 0, activeRules: [] as string[] };
  let incidents = { open: 0, critical: 0 };

  try {
    const rm = await import('../platform-readiness');
    if (rm.isPlatformReadinessEnabled()) {
      const r = await rm.evaluateReadiness();
      readiness = { score: r.score, status: r.status, blockers: r.blockers.length };
    }
  } catch { /* not available */ }

  try {
    const gm = await import('../platform-governor');
    if (gm.isPlatformGovernorEnabled()) {
      const restrictions = gm.getActiveRestrictions();
      governor = { restrictions: restrictions.length, activeRules: [...new Set(restrictions.map(r => r.ruleId))] };
    }
  } catch { /* not available */ }

  try {
    const im = await import('../incidents');
    if (im.isIncidentsEnabled()) {
      const summary = im.getSummary();
      incidents = { open: summary.open, critical: summary.bySeverity.critical };
    }
  } catch { /* not available */ }

  const memUsage = process.memoryUsage();
  return {
    id: `snap_${Date.now()}`,
    timestamp: new Date(),
    readiness,
    governor,
    incidents,
    costs: { utilized: 0, budget: 100 },
    backpressure: {
      queueDepth: 0,
      memoryPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    },
  };
}

// ============================================================================
// Blocker Extraction
// ============================================================================

function extractBlockers(snapshot: SystemSnapshot): { hard: CutoverBlocker[]; soft: CutoverBlocker[] } {
  const hard: CutoverBlocker[] = [];
  const soft: CutoverBlocker[] = [];
  const now = new Date();

  if (snapshot.readiness.status === 'BLOCKED') {
    hard.push({ id: 'readiness_blocked', source: 'platform-readiness', severity: 'hard',
      title: 'Platform Readiness Blocked', description: `Readiness score: ${snapshot.readiness.score}`,
      category: 'readiness', detectedAt: now });
  } else if (snapshot.readiness.score < CUTOVER_CONFIG.minReadinessScore) {
    soft.push({ id: 'readiness_low', source: 'platform-readiness', severity: 'soft',
      title: 'Low Readiness Score', description: `Score ${snapshot.readiness.score} below threshold ${CUTOVER_CONFIG.minReadinessScore}`,
      category: 'readiness', detectedAt: now });
  }

  if (snapshot.incidents.critical > 0) {
    hard.push({ id: 'critical_incidents', source: 'incidents', severity: 'hard',
      title: 'Critical Incidents Open', description: `${snapshot.incidents.critical} critical incident(s)`,
      category: 'ops', detectedAt: now });
  } else if (snapshot.incidents.open > 0) {
    soft.push({ id: 'open_incidents', source: 'incidents', severity: 'soft',
      title: 'Open Incidents', description: `${snapshot.incidents.open} open incident(s)`,
      category: 'ops', detectedAt: now });
  }

  if (snapshot.governor.restrictions > 0) {
    soft.push({ id: 'governor_restrictions', source: 'platform-governor', severity: 'soft',
      title: 'Governor Restrictions Active', description: `${snapshot.governor.restrictions} restriction(s)`,
      category: 'governor', detectedAt: now });
  }

  if (snapshot.backpressure.memoryPercent > CUTOVER_CONFIG.backpressureMemoryMax) {
    soft.push({ id: 'memory_pressure', source: 'backpressure', severity: 'soft',
      title: 'Memory Pressure', description: `Memory at ${snapshot.backpressure.memoryPercent}%`,
      category: 'infra', detectedAt: now });
  }

  return { hard, soft };
}

// ============================================================================
// Decision Logic
// ============================================================================

function computeDecision(hardBlockers: CutoverBlocker[], softBlockers: CutoverBlocker[]): CutoverDecision {
  if (hardBlockers.length > 0) return 'BLOCK';
  if (softBlockers.length > CUTOVER_CONFIG.maxSoftBlockers) return 'BLOCK';
  if (softBlockers.length > 0) return 'WARN';
  return 'CAN_GO_LIVE';
}

function generateSignature(snapshot: SystemSnapshot): CutoverSignature {
  const data = JSON.stringify(snapshot);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }
  return {
    hash: Math.abs(hash).toString(16).padStart(8, '0'),
    timestamp: new Date(),
    version: CUTOVER_CONFIG.version,
    inputsHash: snapshot.id,
  };
}

// ============================================================================
// Main Evaluation
// ============================================================================

export async function evaluateCutover(mode: CutoverMode = 'live'): Promise<CutoverResult> {
  if (!isProductionCutoverEnabled() && mode === 'live') {
    throw new Error('Production cutover is not enabled');
  }

  // Check cache
  if (mode === 'live' && cachedResult && Date.now() - cacheTime < CUTOVER_CONFIG.cacheDurationMs) {
    return cachedResult;
  }

  const start = Date.now();
  const snapshot = await captureSnapshot();
  const { hard, soft } = extractBlockers(snapshot);
  let decision = computeDecision(hard, soft);

  // Check for active override
  if (activeOverride && activeOverride.expiresAt > new Date()) {
    decision = activeOverride.newDecision;
  }

  const reasons: string[] = [];
  const recommendations: string[] = [];

  if (decision === 'BLOCK') {
    reasons.push(...hard.map(b => b.description));
    recommendations.push('Resolve all hard blockers before proceeding');
  } else if (decision === 'WARN') {
    reasons.push(...soft.map(b => b.description));
    recommendations.push('Review soft blockers; proceed with caution');
  } else {
    reasons.push('All systems nominal');
    recommendations.push('Safe to proceed with go-live');
  }

  const result: CutoverResult = {
    decision,
    signature: generateSignature(snapshot),
    mode,
    score: snapshot.readiness.score,
    hardBlockers: hard,
    softBlockers: soft,
    reasons,
    recommendations,
    snapshot,
    evaluatedAt: new Date(),
    expiresAt: new Date(Date.now() + CUTOVER_CONFIG.cacheDurationMs),
    durationMs: Date.now() - start,
  };

  if (mode === 'live') {
    cachedResult = result;
    cacheTime = Date.now();
    decisionHistory.unshift(result);
    if (decisionHistory.length > maxHistory) decisionHistory.pop();
  }

  logger.info({ decision, mode, score: result.score }, 'Cutover evaluation completed');
  return result;
}

export function dryRun(): Promise<CutoverResult> {
  return evaluateCutover('dry-run');
}

// ============================================================================
// Approvals & Overrides
// ============================================================================

export function createApproval(approvedBy: string, reason: string): TimeBoxedApproval {
  const approval: TimeBoxedApproval = {
    id: `apr_${Date.now()}`,
    decision: 'CAN_GO_LIVE',
    approvedBy,
    approvedAt: new Date(),
    expiresAt: new Date(Date.now() + CUTOVER_CONFIG.approvalDurationMs),
    reason,
  };
  activeApproval = approval;
  logger.info({ approvalId: approval.id, approvedBy }, 'Time-boxed approval created');
  return approval;
}

export function createOverride(overriddenBy: string, newDecision: CutoverDecision, reason: string): EmergencyOverride {
  const override: EmergencyOverride = {
    id: `ovr_${Date.now()}`,
    overriddenBy,
    overriddenAt: new Date(),
    previousDecision: cachedResult?.decision || 'BLOCK',
    newDecision,
    reason,
    expiresAt: new Date(Date.now() + CUTOVER_CONFIG.overrideExpiryMs),
    logged: true,
  };
  activeOverride = override;
  logger.warn({ overrideId: override.id, overriddenBy, newDecision }, 'Emergency override created');
  return override;
}

export function clearOverride(): void {
  activeOverride = null;
  cachedResult = null;
}

export function getActiveApproval(): TimeBoxedApproval | null {
  if (activeApproval && activeApproval.expiresAt < new Date()) {
    activeApproval = null;
  }
  return activeApproval;
}

export function getActiveOverride(): EmergencyOverride | null {
  if (activeOverride && activeOverride.expiresAt < new Date()) {
    activeOverride = null;
  }
  return activeOverride;
}

export function getDecisionHistory(limit = 20): CutoverResult[] {
  return decisionHistory.slice(0, limit);
}

export function clearCache(): void {
  cachedResult = null;
  cacheTime = 0;
}
