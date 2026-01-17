/**
 * PCAL Phase 5: Enforcement Feedback Loop
 *
 * Closes the loop by detecting problematic patterns and
 * recommending (not auto-applying) policy adjustments.
 *
 * Detects:
 * - Repeated overrides
 * - Post-approval incidents
 * - Chronic readiness flapping
 * - Consistently wrong human approvals
 *
 * Recommends:
 * - Lower automation confidence
 * - Increase required approval level
 * - Shorten override TTLs
 * - Policy tightening
 */

import { createLogger } from '../lib/logger';
import { PCAL_CONFIG, isPCALEnabled } from './config';
import { getRecentDecisions, getDecisionsBySource, getDecisionsByOutcome } from './decision-stream';
import { getActiveOverrides, getAuthorityStats } from './authority-chain';
import { getPatterns, getRepeatedMistakes } from './platform-memory';
import type {
  FeedbackSignal,
  FeedbackRecommendation,
  FeedbackLoopState,
  FeedbackAction,
} from './types';

// Safe import helper for optional modules
async function safeImport<T>(path: string): Promise<T | null> {
  try {
    return await import(/* @vite-ignore */ path) as T;
  } catch {
    return null;
  }
}

const logger = createLogger('pcal-feedback-loop');

// State storage
const signals: FeedbackSignal[] = [];
const recommendations: FeedbackRecommendation[] = [];
const state: FeedbackLoopState = {
  automationConfidence: {},
  approvalLevelOverrides: {},
  overrideTtlMultipliers: {},
  pendingRecommendations: [],
  appliedRecommendations: [],
};

// ============================================================================
// Signal Detection
// ============================================================================

export function detectFeedbackSignals(): FeedbackSignal[] {
  if (!isPCALEnabled()) return [];

  const newSignals: FeedbackSignal[] = [];

  // Check for repeated overrides
  const overrideSignal = detectRepeatedOverrides();
  if (overrideSignal) newSignals.push(overrideSignal);

  // Check for post-approval incidents
  const incidentSignal = detectPostApprovalIncidents();
  if (incidentSignal) newSignals.push(incidentSignal);

  // Check for readiness flapping
  const flappingSignal = detectReadinessFlapping();
  if (flappingSignal) newSignals.push(flappingSignal);

  // Check for wrong approvals
  const wrongApprovalSignal = detectWrongApprovals();
  if (wrongApprovalSignal) newSignals.push(wrongApprovalSignal);

  // Store signals
  for (const signal of newSignals) {
    signals.push(signal);
  }

  // Limit signal history
  while (signals.length > 500) {
    signals.shift();
  }

  if (newSignals.length > 0) {
    logger.info({ count: newSignals.length }, 'Feedback signals detected');
  }

  return newSignals;
}

function detectRepeatedOverrides(): FeedbackSignal | null {
  const overrides = getActiveOverrides();
  const overrideDecisions = getDecisionsBySource('override', 100);

  // Check for same area being overridden repeatedly
  const areaCounts = new Map<string, number>();
  for (const d of overrideDecisions) {
    const area = d.scopeId || d.scope;
    areaCounts.set(area, (areaCounts.get(area) || 0) + 1);
  }

  for (const [area, count] of areaCounts) {
    if (count >= PCAL_CONFIG.overrideThreshold) {
      return {
        id: `sig_override_${Date.now()}`,
        type: 'repeated_override',
        severity: count > 10 ? 'high' : 'medium',
        detectedAt: new Date(),
        context: { area, count, threshold: PCAL_CONFIG.overrideThreshold },
        affectedArea: area,
      };
    }
  }

  // Check overall override rate
  if (overrides.length >= PCAL_CONFIG.overrideThreshold) {
    return {
      id: `sig_override_global_${Date.now()}`,
      type: 'repeated_override',
      severity: 'medium',
      detectedAt: new Date(),
      context: { activeCount: overrides.length, threshold: PCAL_CONFIG.overrideThreshold },
      affectedArea: 'global',
    };
  }

  return null;
}

function detectPostApprovalIncidents(): FeedbackSignal | null {
  const approvedDecisions = getDecisionsByOutcome('approved', 200);
  const escalatedDecisions = getDecisionsByOutcome('escalated', 100);

  // Find approvals followed by escalations within correlation window
  let postApprovalIncidents = 0;
  const affectedAreas = new Set<string>();

  for (const approved of approvedDecisions) {
    const followingEscalations = escalatedDecisions.filter(e => {
      const timeDiff = e.timestamp.getTime() - approved.timestamp.getTime();
      return timeDiff > 0 && timeDiff < PCAL_CONFIG.incidentCorrelationWindowMs;
    });

    if (followingEscalations.length > 0) {
      postApprovalIncidents++;
      affectedAreas.add(approved.scope);
    }
  }

  if (postApprovalIncidents >= 3) {
    return {
      id: `sig_post_approval_${Date.now()}`,
      type: 'post_approval_incident',
      severity: postApprovalIncidents > 5 ? 'high' : 'medium',
      detectedAt: new Date(),
      context: { count: postApprovalIncidents, areas: Array.from(affectedAreas) },
      affectedArea: Array.from(affectedAreas)[0] || 'unknown',
    };
  }

  return null;
}

function detectReadinessFlapping(): FeedbackSignal | null {
  const recentDecisions = getRecentDecisions(200);

  // Look for rapid state changes in readiness-related decisions
  const readinessDecisions = recentDecisions.filter(
    d => d.source === 'cutover' || d.source === 'glcp'
  );

  if (readinessDecisions.length < 5) return null;

  // Count state changes within flapping window
  let stateChanges = 0;
  let lastOutcome = readinessDecisions[0]?.outcome;

  for (const d of readinessDecisions) {
    const inWindow = Date.now() - d.timestamp.getTime() < PCAL_CONFIG.flappingWindowMs;
    if (inWindow && d.outcome !== lastOutcome) {
      stateChanges++;
      lastOutcome = d.outcome;
    }
  }

  if (stateChanges >= PCAL_CONFIG.flappingThreshold) {
    return {
      id: `sig_flapping_${Date.now()}`,
      type: 'readiness_flapping',
      severity: stateChanges > 10 ? 'high' : 'medium',
      detectedAt: new Date(),
      context: { stateChanges, threshold: PCAL_CONFIG.flappingThreshold, windowMs: PCAL_CONFIG.flappingWindowMs },
      affectedArea: 'readiness',
    };
  }

  return null;
}

function detectWrongApprovals(): FeedbackSignal | null {
  const approvedDecisions = getDecisionsByOutcome('approved', 200)
    .filter(d => d.authority === 'human');

  const escalatedDecisions = getDecisionsByOutcome('escalated', 100);
  const blockedDecisions = getDecisionsByOutcome('blocked', 100);

  // Find human approvals that were later blocked or escalated
  let wrongApprovals = 0;
  const wrongApprovers = new Map<string, number>();

  for (const approved of approvedDecisions) {
    if (!approved.actor) continue;

    const laterReversed = [...escalatedDecisions, ...blockedDecisions].some(d => {
      const timeDiff = d.timestamp.getTime() - approved.timestamp.getTime();
      return timeDiff > 0 && timeDiff < 86400000 && d.scopeId === approved.scopeId;
    });

    if (laterReversed) {
      wrongApprovals++;
      wrongApprovers.set(approved.actor, (wrongApprovers.get(approved.actor) || 0) + 1);
    }
  }

  if (wrongApprovals >= 3) {
    return {
      id: `sig_wrong_approval_${Date.now()}`,
      type: 'wrong_approval',
      severity: wrongApprovals > 5 ? 'high' : 'medium',
      detectedAt: new Date(),
      context: {
        count: wrongApprovals,
        approvers: Object.fromEntries(wrongApprovers),
      },
      affectedArea: 'human_approval',
    };
  }

  return null;
}

// ============================================================================
// Recommendation Generation
// ============================================================================

export function generateRecommendations(): FeedbackRecommendation[] {
  if (!isPCALEnabled()) return [];

  const newRecommendations: FeedbackRecommendation[] = [];
  const recentSignals = signals.filter(
    s => Date.now() - s.detectedAt.getTime() < 86400000 // Last 24 hours
  );

  for (const signal of recentSignals) {
    // Skip if we already have a recommendation for this signal type
    const existing = recommendations.find(
      r => r.signal.type === signal.type && !r.acknowledged
    );
    if (existing) continue;

    const recs = createRecommendationsForSignal(signal);
    newRecommendations.push(...recs);
  }

  // Store recommendations
  for (const rec of newRecommendations) {
    recommendations.push(rec);
    state.pendingRecommendations.push(rec);
  }

  // Limit stored recommendations
  while (recommendations.length > 200) {
    recommendations.shift();
  }

  while (state.pendingRecommendations.length > 50) {
    state.pendingRecommendations.shift();
  }

  return newRecommendations;
}

function createRecommendationsForSignal(signal: FeedbackSignal): FeedbackRecommendation[] {
  const recs: FeedbackRecommendation[] = [];

  switch (signal.type) {
    case 'repeated_override':
      recs.push({
        id: `rec_${Date.now()}_1`,
        signal,
        action: 'shorten_override_ttl',
        target: signal.affectedArea,
        reason: `${signal.context.count || signal.context.activeCount} overrides detected in ${signal.affectedArea}`,
        suggestedValue: 0.5, // Reduce TTL by 50%
        autoApply: false,
        createdAt: new Date(),
        acknowledged: false,
      });
      recs.push({
        id: `rec_${Date.now()}_2`,
        signal,
        action: 'recommend_policy_tightening',
        target: signal.affectedArea,
        reason: 'Frequent overrides suggest policy may need adjustment',
        autoApply: false,
        createdAt: new Date(),
        acknowledged: false,
      });
      break;

    case 'post_approval_incident':
      recs.push({
        id: `rec_${Date.now()}_1`,
        signal,
        action: 'lower_automation_confidence',
        target: signal.affectedArea,
        reason: `${signal.context.count} incidents followed approvals`,
        suggestedValue: PCAL_CONFIG.confidenceDecayRate,
        autoApply: false,
        createdAt: new Date(),
        acknowledged: false,
      });
      recs.push({
        id: `rec_${Date.now()}_2`,
        signal,
        action: 'increase_approval_level',
        target: signal.affectedArea,
        reason: 'Post-approval incidents indicate insufficient review',
        suggestedValue: 1, // Increase by 1 level
        autoApply: false,
        createdAt: new Date(),
        acknowledged: false,
      });
      break;

    case 'readiness_flapping':
      recs.push({
        id: `rec_${Date.now()}_1`,
        signal,
        action: 'flag_for_review',
        target: 'readiness',
        reason: `${signal.context.stateChanges} state changes in ${(signal.context.windowMs as any) / 3600000}h`,
        autoApply: false,
        createdAt: new Date(),
        acknowledged: false,
      });
      break;

    case 'wrong_approval':
      recs.push({
        id: `rec_${Date.now()}_1`,
        signal,
        action: 'increase_approval_level',
        target: signal.affectedArea,
        reason: `${signal.context.count} human approvals were later reversed`,
        suggestedValue: 1,
        autoApply: false,
        createdAt: new Date(),
        acknowledged: false,
      });
      recs.push({
        id: `rec_${Date.now()}_2`,
        signal,
        action: 'lower_automation_confidence',
        target: 'human_approval',
        reason: 'Human approvals showing lower accuracy',
        suggestedValue: PCAL_CONFIG.confidenceDecayRate,
        autoApply: false,
        createdAt: new Date(),
        acknowledged: false,
      });
      break;
  }

  return recs;
}

// ============================================================================
// Recommendation Management
// ============================================================================

export function acknowledgeRecommendation(recId: string, acknowledgedBy: string): boolean {
  const rec = recommendations.find(r => r.id === recId);
  if (!rec) return false;

  rec.acknowledged = true;
  rec.acknowledgedBy = acknowledgedBy;

  // Move from pending to applied
  const idx = state.pendingRecommendations.findIndex(r => r.id === recId);
  if (idx >= 0) {
    state.pendingRecommendations.splice(idx, 1);
    state.appliedRecommendations.push(rec);
  }

  logger.info({ recId, acknowledgedBy }, 'Recommendation acknowledged');
  return true;
}

export function getPendingRecommendations(): FeedbackRecommendation[] {
  return [...state.pendingRecommendations];
}

export function getAppliedRecommendations(limit = 50): FeedbackRecommendation[] {
  return state.appliedRecommendations.slice(-limit);
}

// ============================================================================
// State Adjustments (Feed into other systems)
// ============================================================================

export function getConfidenceAdjustment(target: string): number {
  return state.automationConfidence[target] ?? 1.0;
}

export function getApprovalLevelAdjustment(target: string): number {
  return state.approvalLevelOverrides[target] ?? 0;
}

export function getOverrideTtlMultiplier(target: string): number {
  return state.overrideTtlMultipliers[target] ?? 1.0;
}

export function applyConfidenceAdjustment(target: string, factor: number): void {
  const current = state.automationConfidence[target] ?? 1.0;
  const newValue = Math.max(PCAL_CONFIG.minConfidence / 100, current * (1 - factor));
  state.automationConfidence[target] = newValue;
  logger.info({ target, from: current, to: newValue }, 'Confidence adjusted');
}

export function applyApprovalLevelAdjustment(target: string, increase: number): void {
  const current = state.approvalLevelOverrides[target] ?? 0;
  state.approvalLevelOverrides[target] = current + increase;
  logger.info({ target, from: current, to: current + increase }, 'Approval level adjusted');
}

export function applyOverrideTtlMultiplier(target: string, multiplier: number): void {
  const current = state.overrideTtlMultipliers[target] ?? 1.0;
  const newValue = Math.max(0.1, current * multiplier);
  state.overrideTtlMultipliers[target] = newValue;
  logger.info({ target, from: current, to: newValue }, 'Override TTL multiplier adjusted');
}

// ============================================================================
// Feedback to Other Systems
// ============================================================================

export async function pushFeedbackToSystems(): Promise<{ pushed: string[]; failed: string[] }> {
  const pushed: string[] = [];
  const failed: string[] = [];

  // Push to autonomy
  try {
    const autonomy = await safeImport<{ isAutonomyEnabled?: () => boolean }>('../autonomy');
    if (autonomy?.isAutonomyEnabled?.()) {
      // Autonomy could read our confidence adjustments
      pushed.push('autonomy');
    }
  } catch {
    failed.push('autonomy');
  }

  // Push to GLCP
  try {
    const glcp = await safeImport<{ isGLCPEnabled?: () => boolean }>('../glcp');
    if (glcp?.isGLCPEnabled?.()) {
      // GLCP could incorporate our feedback
      pushed.push('glcp');
    }
  } catch {
    failed.push('glcp');
  }

  // Push to governor
  try {
    const governor = await safeImport<{ isPlatformGovernorEnabled?: () => boolean }>('../platform-governor');
    if (governor?.isPlatformGovernorEnabled?.()) {
      // Governor could use our recommendations
      pushed.push('governor');
    }
  } catch {
    failed.push('governor');
  }

  return { pushed, failed };
}

// ============================================================================
// Full Cycle
// ============================================================================

export function runFeedbackCycle(): {
  signalsDetected: number;
  recommendationsGenerated: number;
  state: FeedbackLoopState;
} {
  const newSignals = detectFeedbackSignals();
  const newRecommendations = generateRecommendations();

  return {
    signalsDetected: newSignals.length,
    recommendationsGenerated: newRecommendations.length,
    state: { ...state },
  };
}

// ============================================================================
// Statistics
// ============================================================================

export function getFeedbackStats(): {
  totalSignals: number;
  signalsByType: Record<string, number>;
  pendingRecommendations: number;
  appliedRecommendations: number;
  confidenceAdjustments: number;
  approvalLevelAdjustments: number;
} {
  const signalsByType: Record<string, number> = {};
  for (const s of signals) {
    signalsByType[s.type] = (signalsByType[s.type] || 0) + 1;
  }

  return {
    totalSignals: signals.length,
    signalsByType,
    pendingRecommendations: state.pendingRecommendations.length,
    appliedRecommendations: state.appliedRecommendations.length,
    confidenceAdjustments: Object.keys(state.automationConfidence).length,
    approvalLevelAdjustments: Object.keys(state.approvalLevelOverrides).length,
  };
}

export function getState(): FeedbackLoopState {
  return { ...state };
}

// ============================================================================
// Maintenance
// ============================================================================

export function clearAll(): void {
  signals.length = 0;
  recommendations.length = 0;
  state.pendingRecommendations.length = 0;
  state.appliedRecommendations.length = 0;
  state.automationConfidence = {};
  state.approvalLevelOverrides = {};
  state.overrideTtlMultipliers = {};
}
