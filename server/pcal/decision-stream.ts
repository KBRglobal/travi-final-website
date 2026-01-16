/**
 * PCAL Phase 1: Decision Stream - Unified Decision Tracking
 *
 * Normalizes ALL platform decisions into a canonical format.
 * Append-only, immutable, bounded storage.
 */

import { createLogger } from '../lib/logger';
import { PCAL_CONFIG, isPCALEnabled } from './config';
import type {
  DecisionRecord,
  DecisionScope,
  DecisionAuthority,
  DecisionOutcome,
  DecisionSource,
  DecisionSignal,
} from './types';

const logger = createLogger('pcal-decision-stream');

// Append-only decision log
const decisionLog: DecisionRecord[] = [];
const decisionIndex = new Map<string, DecisionRecord>();
const sourceIndex = new Map<DecisionSource, DecisionRecord[]>();

// ============================================================================
// Signature Generation
// ============================================================================

function generateSignature(record: Omit<DecisionRecord, 'signature'>): string {
  const data = JSON.stringify({
    id: record.id,
    timestamp: record.timestamp.toISOString(),
    source: record.source,
    scope: record.scope,
    outcome: record.outcome,
    reason: record.reason,
  });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ============================================================================
// Decision Ingestion
// ============================================================================

export function ingestDecision(
  source: DecisionSource,
  scope: DecisionScope,
  outcome: DecisionOutcome,
  reason: string,
  options: {
    sourceId?: string;
    scopeId?: string;
    authority?: DecisionAuthority;
    confidence?: number;
    reversible?: boolean;
    ttlMs?: number;
    signals?: DecisionSignal[];
    actor?: string;
    overrideOf?: string;
  } = {}
): DecisionRecord {
  if (!isPCALEnabled()) {
    throw new Error('PCAL is not enabled');
  }

  const baseRecord = {
    id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
    source,
    sourceId: options.sourceId,
    scope,
    scopeId: options.scopeId,
    authority: options.authority || 'system',
    outcome,
    confidence: options.confidence ?? 100,
    reversible: options.reversible ?? true,
    ttlMs: options.ttlMs,
    reason,
    signals: options.signals || [],
    actor: options.actor,
    overrideOf: options.overrideOf,
  };

  const record: DecisionRecord = {
    ...baseRecord,
    signature: generateSignature(baseRecord),
  };

  // Enforce max storage
  if (decisionLog.length >= PCAL_CONFIG.maxDecisions) {
    const removed = decisionLog.shift();
    if (removed) {
      decisionIndex.delete(removed.id);
      const sourceList = sourceIndex.get(removed.source);
      if (sourceList) {
        const idx = sourceList.indexOf(removed);
        if (idx >= 0) sourceList.splice(idx, 1);
      }
    }
  }

  // Store
  decisionLog.push(record);
  decisionIndex.set(record.id, record);

  if (!sourceIndex.has(source)) {
    sourceIndex.set(source, []);
  }
  sourceIndex.get(source)!.push(record);

  logger.debug({ id: record.id, source, outcome }, 'Decision ingested');
  return record;
}

// ============================================================================
// Source-Specific Ingestors (Normalize from existing systems)
// These are optional integrations - modules may not exist
// ============================================================================

async function safeImport<T>(path: string): Promise<T | null> {
  try {
    return await import(/* @vite-ignore */ path) as T;
  } catch {
    return null;
  }
}

export async function ingestFromGLCP(): Promise<DecisionRecord | null> {
  try {
    const glcp = await safeImport<{ isGLCPEnabled?: () => boolean; getGLCPStatus?: () => { lastDecision?: string; aggregateScore?: number } }>('../glcp');
    if (!glcp?.isGLCPEnabled?.()) return null;

    const status = glcp.getGLCPStatus?.();
    if (!status?.lastDecision) return null;

    return ingestDecision('glcp', 'platform', status.lastDecision as DecisionOutcome, 'GLCP evaluation', {
      confidence: 85,
      signals: [{ name: 'glcp_score', value: status.aggregateScore, weight: 1, source: 'glcp' }],
    });
  } catch {
    return null;
  }
}

export async function ingestFromCutover(): Promise<DecisionRecord | null> {
  try {
    const cutover = await safeImport<{
      isProductionCutoverEnabled?: () => boolean;
      dryRun?: () => Promise<{ decision: string; score: number; signature: { hash: string }; hardBlockers: unknown[] }>;
    }>('../production-cutover');
    if (!cutover?.isProductionCutoverEnabled?.()) return null;

    const result = await cutover.dryRun?.();
    if (!result) return null;

    const outcome: DecisionOutcome = result.decision === 'CAN_GO_LIVE' ? 'approved'
      : result.decision === 'WARN' ? 'warning'
      : 'blocked';

    return ingestDecision('cutover', 'platform', outcome, `Cutover: ${result.decision}`, {
      sourceId: result.signature.hash,
      confidence: result.score,
      reversible: false,
      signals: [
        { name: 'readiness_score', value: result.score, weight: 1, source: 'cutover' },
        { name: 'hard_blockers', value: result.hardBlockers.length, weight: 0.5, source: 'cutover' },
      ],
    });
  } catch {
    return null;
  }
}

export async function ingestFromGovernor(): Promise<DecisionRecord[]> {
  const decisions: DecisionRecord[] = [];
  try {
    const governor = await safeImport<{
      isPlatformGovernorEnabled?: () => boolean;
      getActiveRestrictions?: () => Array<{ id: string; decision: string; reason: string; target: string }>;
    }>('../platform-governor');
    if (!governor?.isPlatformGovernorEnabled?.()) return decisions;

    const restrictions = governor.getActiveRestrictions?.() || [];
    for (const restriction of restrictions) {
      const outcome: DecisionOutcome = restriction.decision === 'BLOCK' ? 'blocked'
        : restriction.decision === 'THROTTLE' ? 'warning'
        : 'approved';

      decisions.push(ingestDecision('governor', 'feature', outcome, restriction.reason, {
        sourceId: restriction.id,
        scopeId: restriction.target,
        authority: 'policy',
        confidence: 90,
      }));
    }
  } catch {
    // Governor not available
  }
  return decisions;
}

export async function ingestFromIncidents(): Promise<DecisionRecord[]> {
  const decisions: DecisionRecord[] = [];
  try {
    const incidents = await safeImport<{
      isIncidentsEnabled?: () => boolean;
      getSummary?: () => { open: number; bySeverity: { critical: number } };
    }>('../incidents');
    if (!incidents?.isIncidentsEnabled?.()) return decisions;

    const summary = incidents.getSummary?.();
    if (summary && summary.bySeverity.critical > 0) {
      decisions.push(ingestDecision('incident', 'platform', 'escalated', `${summary.bySeverity.critical} critical incidents active`, {
        authority: 'system',
        confidence: 100,
        reversible: false,
        signals: [
          { name: 'critical_count', value: summary.bySeverity.critical, weight: 1, source: 'incidents' },
          { name: 'total_open', value: summary.open, weight: 0.5, source: 'incidents' },
        ],
      }));
    }
  } catch {
    // Incidents not available
  }
  return decisions;
}

export function ingestOverride(
  originalDecisionId: string,
  overriddenBy: string,
  newOutcome: DecisionOutcome,
  reason: string,
  justification: string,
  ttlMs: number
): DecisionRecord {
  const original = decisionIndex.get(originalDecisionId);
  return ingestDecision('override', original?.scope || 'platform', newOutcome, reason, {
    sourceId: originalDecisionId,
    authority: 'human',
    confidence: 50, // Overrides have lower confidence
    reversible: true,
    ttlMs,
    actor: overriddenBy,
    overrideOf: originalDecisionId,
    signals: [
      { name: 'justification', value: justification, weight: 1, source: 'human' },
    ],
  });
}

export function ingestManualDecision(
  scope: DecisionScope,
  outcome: DecisionOutcome,
  reason: string,
  actor: string,
  scopeId?: string
): DecisionRecord {
  return ingestDecision('manual', scope, outcome, reason, {
    scopeId,
    authority: 'human',
    confidence: 75,
    reversible: true,
    actor,
  });
}

// ============================================================================
// Query API
// ============================================================================

export function getDecision(id: string): DecisionRecord | null {
  return decisionIndex.get(id) || null;
}

export function getDecisionsBySource(source: DecisionSource, limit = 100): DecisionRecord[] {
  const list = sourceIndex.get(source) || [];
  return list.slice(-limit).reverse();
}

export function getDecisionsByScope(scope: DecisionScope, limit = 100): DecisionRecord[] {
  return decisionLog
    .filter(d => d.scope === scope)
    .slice(-limit)
    .reverse();
}

export function getDecisionsByOutcome(outcome: DecisionOutcome, limit = 100): DecisionRecord[] {
  return decisionLog
    .filter(d => d.outcome === outcome)
    .slice(-limit)
    .reverse();
}

export function getDecisionsInTimeRange(start: Date, end: Date, limit = 500): DecisionRecord[] {
  return decisionLog
    .filter(d => d.timestamp >= start && d.timestamp <= end)
    .slice(-limit)
    .reverse();
}

export function getRecentDecisions(limit = 50): DecisionRecord[] {
  return decisionLog.slice(-limit).reverse();
}

export function getOverrides(limit = 50): DecisionRecord[] {
  return decisionLog
    .filter(d => d.source === 'override' || d.overrideOf)
    .slice(-limit)
    .reverse();
}

export function getIrreversibleDecisions(limit = 50): DecisionRecord[] {
  return decisionLog
    .filter(d => !d.reversible)
    .slice(-limit)
    .reverse();
}

export function getHighRiskDecisions(limit = 50): DecisionRecord[] {
  return decisionLog
    .filter(d => !d.reversible || d.confidence < 70 || d.outcome === 'overridden')
    .slice(-limit)
    .reverse();
}

// ============================================================================
// Statistics
// ============================================================================

export function getDecisionStats(): {
  total: number;
  bySource: Record<DecisionSource, number>;
  byOutcome: Record<DecisionOutcome, number>;
  byScope: Record<DecisionScope, number>;
  byAuthority: Record<DecisionAuthority, number>;
  avgConfidence: number;
  reversiblePercent: number;
} {
  const bySource: Record<string, number> = {};
  const byOutcome: Record<string, number> = {};
  const byScope: Record<string, number> = {};
  const byAuthority: Record<string, number> = {};
  let totalConfidence = 0;
  let reversibleCount = 0;

  for (const d of decisionLog) {
    bySource[d.source] = (bySource[d.source] || 0) + 1;
    byOutcome[d.outcome] = (byOutcome[d.outcome] || 0) + 1;
    byScope[d.scope] = (byScope[d.scope] || 0) + 1;
    byAuthority[d.authority] = (byAuthority[d.authority] || 0) + 1;
    totalConfidence += d.confidence;
    if (d.reversible) reversibleCount++;
  }

  return {
    total: decisionLog.length,
    bySource: bySource as Record<DecisionSource, number>,
    byOutcome: byOutcome as Record<DecisionOutcome, number>,
    byScope: byScope as Record<DecisionScope, number>,
    byAuthority: byAuthority as Record<DecisionAuthority, number>,
    avgConfidence: decisionLog.length > 0 ? Math.round(totalConfidence / decisionLog.length) : 0,
    reversiblePercent: decisionLog.length > 0 ? Math.round((reversibleCount / decisionLog.length) * 100) : 0,
  };
}

// ============================================================================
// Maintenance
// ============================================================================

export function pruneOldDecisions(): number {
  const cutoff = new Date(Date.now() - PCAL_CONFIG.decisionRetentionDays * 24 * 60 * 60 * 1000);
  const before = decisionLog.length;

  while (decisionLog.length > 0 && decisionLog[0].timestamp < cutoff) {
    const removed = decisionLog.shift();
    if (removed) {
      decisionIndex.delete(removed.id);
      const sourceList = sourceIndex.get(removed.source);
      if (sourceList) {
        const idx = sourceList.indexOf(removed);
        if (idx >= 0) sourceList.splice(idx, 1);
      }
    }
  }

  const pruned = before - decisionLog.length;
  if (pruned > 0) {
    logger.info({ pruned }, 'Old decisions pruned');
  }
  return pruned;
}

export function clearAll(): void {
  decisionLog.length = 0;
  decisionIndex.clear();
  sourceIndex.clear();
}

export function exportDecisions(): DecisionRecord[] {
  return [...decisionLog];
}
