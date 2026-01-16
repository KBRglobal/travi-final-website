/**
 * PCAL Phase 2: Authority & Accountability Chain
 *
 * Resolves the complete chain of authority for any decision:
 * - Which system allowed it
 * - Which human approved it
 * - What signals were present
 * - Was it an override
 * - What policies were bypassed
 */

import { createLogger } from '../lib/logger';
import { PCAL_CONFIG, isPCALEnabled } from './config';
import { getDecision, getRecentDecisions } from './decision-stream';
import type {
  AuthorityChain,
  AuthorityNode,
  ApprovalLineage,
  ApprovalRecord,
  OverrideRecord,
  DecisionRecord,
} from './types';

const logger = createLogger('pcal-authority-chain');

// Safe import helper for optional modules
async function safeImport<T>(path: string): Promise<T | null> {
  try {
    return await import(/* @vite-ignore */ path) as T;
  } catch {
    return null;
  }
}

// Override tracking (separate from decisions for quick lookup)
const overrideLog: OverrideRecord[] = [];
const approvalLog: ApprovalRecord[] = [];

// ============================================================================
// Override Management
// ============================================================================

export function recordOverride(
  overriddenDecisionId: string,
  overriddenBy: string,
  reason: string,
  justification: string,
  ttlMs: number = PCAL_CONFIG.defaultOverrideTtlMs
): OverrideRecord {
  const override: OverrideRecord = {
    id: `ovr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    overriddenDecisionId,
    overriddenBy,
    reason,
    justification,
    ttlMs,
    expiresAt: new Date(Date.now() + ttlMs),
    createdAt: new Date(),
    stillActive: true,
  };

  overrideLog.push(override);

  // Enforce max storage
  if (overrideLog.length > 1000) {
    overrideLog.shift();
  }

  logger.info({ id: override.id, decisionId: overriddenDecisionId }, 'Override recorded');
  return override;
}

export function getActiveOverrides(): OverrideRecord[] {
  const now = new Date();
  return overrideLog.filter(o => o.stillActive && o.expiresAt > now);
}

export function getOverridesForDecision(decisionId: string): OverrideRecord[] {
  return overrideLog.filter(o => o.overriddenDecisionId === decisionId);
}

export function expireOverride(overrideId: string): boolean {
  const override = overrideLog.find(o => o.id === overrideId);
  if (override) {
    override.stillActive = false;
    return true;
  }
  return false;
}

// ============================================================================
// Approval Management
// ============================================================================

export function recordApproval(
  approvedBy: string,
  type: 'human' | 'system' | 'policy',
  scope: string,
  reason?: string
): ApprovalRecord {
  const approval: ApprovalRecord = {
    id: `apr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    approvedBy,
    type,
    timestamp: new Date(),
    scope,
    reason,
  };

  approvalLog.push(approval);

  // Enforce max storage
  if (approvalLog.length > 5000) {
    approvalLog.shift();
  }

  return approval;
}

export function getRecentApprovals(limit = 50): ApprovalRecord[] {
  return approvalLog.slice(-limit).reverse();
}

export function getApprovalsByActor(actor: string): ApprovalRecord[] {
  return approvalLog.filter(a => a.approvedBy === actor);
}

// ============================================================================
// Authority Chain Resolution
// ============================================================================

export async function resolveAuthorityChain(decisionId: string): Promise<AuthorityChain | null> {
  if (!isPCALEnabled()) {
    throw new Error('PCAL is not enabled');
  }

  const decision = getDecision(decisionId);
  if (!decision) {
    return null;
  }

  const nodes: AuthorityNode[] = [];
  const overrides = getOverridesForDecision(decisionId);
  const bypassedPolicies: string[] = [];

  // Build authority chain based on decision source
  nodes.push(buildSourceNode(decision));

  // Check if there was human involvement
  if (decision.actor) {
    nodes.push({
      type: 'human',
      id: decision.actor,
      name: decision.actor,
      timestamp: decision.timestamp,
      action: decision.overrideOf ? 'overridden' : 'approved',
      reason: decision.reason,
    });
  }

  // Check for policy involvement
  const policyNode = await resolvePolicyInvolvement(decision);
  if (policyNode) {
    nodes.push(policyNode);
  }

  // Check for automation involvement
  if (decision.authority === 'automation') {
    nodes.push({
      type: 'automation',
      id: `auto_${decision.source}`,
      name: `${decision.source} automation`,
      timestamp: decision.timestamp,
      action: 'allowed',
    });
  }

  // Identify bypassed policies
  if (decision.overrideOf) {
    const original = getDecision(decision.overrideOf);
    if (original && original.outcome === 'blocked') {
      bypassedPolicies.push(`${original.source}_blocking_policy`);
    }
  }

  // Determine final authority
  const finalAuthority = nodes[nodes.length - 1];
  const humanApproval = nodes.find(n => n.type === 'human');

  const chain: AuthorityChain = {
    decisionId,
    nodes,
    finalAuthority,
    humanApproval,
    overrides,
    bypassedPolicies,
    signalsAtDecisionTime: decision.signals,
  };

  logger.debug({ decisionId, nodes: nodes.length }, 'Authority chain resolved');
  return chain;
}

function buildSourceNode(decision: DecisionRecord): AuthorityNode {
  const sourceNames: Record<string, string> = {
    glcp: 'Go-Live Control Plane',
    cutover: 'Production Cutover Engine',
    autonomy: 'Autonomy Policy Engine',
    'publish-gate': 'Publish Gate',
    governor: 'Platform Governor',
    incident: 'Incident Management',
    rollout: 'Rollout Controller',
    override: 'Emergency Override',
    manual: 'Manual Decision',
  };

  return {
    type: 'system',
    id: decision.source,
    name: sourceNames[decision.source] || decision.source,
    timestamp: decision.timestamp,
    action: decision.outcome === 'approved' ? 'allowed'
      : decision.outcome === 'overridden' ? 'overridden'
      : 'allowed',
    reason: decision.reason,
  };
}

async function resolvePolicyInvolvement(decision: DecisionRecord): Promise<AuthorityNode | null> {
  // Check if governor was involved
  if (decision.source === 'governor' || decision.authority === 'policy') {
    return {
      type: 'policy',
      id: 'platform_policy',
      name: 'Platform Policy',
      timestamp: decision.timestamp,
      action: decision.outcome === 'blocked' ? 'allowed' : 'delegated',
    };
  }

  // Check if autonomy was involved
  try {
    const autonomy = await safeImport<{ isAutonomyEnabled?: () => boolean }>('../autonomy');
    if (autonomy?.isAutonomyEnabled?.()) {
      return {
        type: 'policy',
        id: 'autonomy_policy',
        name: 'Autonomy Policy',
        timestamp: decision.timestamp,
        action: 'delegated',
      };
    }
  } catch {
    // Autonomy not available
  }

  return null;
}

// ============================================================================
// Approval Lineage
// ============================================================================

export function getApprovalLineage(decisionId: string): ApprovalLineage | null {
  const decision = getDecision(decisionId);
  if (!decision) return null;

  // Find related approvals (within 1 hour of decision)
  const windowStart = new Date(decision.timestamp.getTime() - 3600000);
  const windowEnd = decision.timestamp;

  const relatedApprovals = approvalLog.filter(
    a => a.timestamp >= windowStart && a.timestamp <= windowEnd
  );

  const systemApprovals = relatedApprovals.filter(a => a.type === 'system').map(a => a.approvedBy);
  const humanApprovals = relatedApprovals.filter(a => a.type === 'human').map(a => a.approvedBy);

  // Build escalation path
  const escalationPath: string[] = [];
  if (decision.authority === 'automation') escalationPath.push('automation');
  if (decision.authority === 'policy') escalationPath.push('policy');
  if (humanApprovals.length > 0) escalationPath.push('human');
  if (decision.overrideOf) escalationPath.push('override');

  return {
    decisionId,
    approvals: relatedApprovals,
    systemApprovals,
    humanApprovals,
    escalationPath,
  };
}

// ============================================================================
// Accountability Queries
// ============================================================================

export interface AccountabilityAnswer {
  question: string;
  answer: string;
  evidence: string[];
  confidence: number;
}

export function answerAccountability(decisionId: string): AccountabilityAnswer[] {
  const decision = getDecision(decisionId);
  if (!decision) return [];

  const answers: AccountabilityAnswer[] = [];
  const overrides = getOverridesForDecision(decisionId);

  // Question 1: Which system allowed this?
  answers.push({
    question: 'Which system allowed this?',
    answer: decision.source,
    evidence: [
      `Source: ${decision.source}`,
      `Source ID: ${decision.sourceId || 'N/A'}`,
      `Authority: ${decision.authority}`,
    ],
    confidence: 100,
  });

  // Question 2: Which human approved it?
  if (decision.actor) {
    answers.push({
      question: 'Which human approved it?',
      answer: decision.actor,
      evidence: [
        `Actor: ${decision.actor}`,
        `Timestamp: ${decision.timestamp.toISOString()}`,
      ],
      confidence: 100,
    });
  } else {
    answers.push({
      question: 'Which human approved it?',
      answer: 'No human approval - automated decision',
      evidence: [`Authority type: ${decision.authority}`],
      confidence: 90,
    });
  }

  // Question 3: What signals were present?
  if (decision.signals.length > 0) {
    answers.push({
      question: 'What signals were present at decision time?',
      answer: decision.signals.map(s => s.name).join(', '),
      evidence: decision.signals.map(s => `${s.name}: ${JSON.stringify(s.value)} (weight: ${s.weight})`),
      confidence: 100,
    });
  }

  // Question 4: Was this an override?
  answers.push({
    question: 'Was this an override?',
    answer: decision.overrideOf ? 'Yes' : 'No',
    evidence: decision.overrideOf
      ? [`Override of: ${decision.overrideOf}`, ...overrides.map(o => `Reason: ${o.reason}`)]
      : ['This was a primary decision'],
    confidence: 100,
  });

  // Question 5: What policies were bypassed?
  if (decision.overrideOf) {
    const original = getDecision(decision.overrideOf);
    if (original) {
      answers.push({
        question: 'What policies were bypassed?',
        answer: `${original.source} policy (${original.outcome})`,
        evidence: [
          `Original decision: ${original.reason}`,
          `Original outcome: ${original.outcome}`,
          `Override reason: ${decision.reason}`,
        ],
        confidence: 90,
      });
    }
  }

  return answers;
}

// ============================================================================
// Statistics
// ============================================================================

export function getAuthorityStats(): {
  totalOverrides: number;
  activeOverrides: number;
  totalApprovals: number;
  humanApprovals: number;
  systemApprovals: number;
  avgOverrideTtlMs: number;
} {
  const activeOverrides = getActiveOverrides();
  const humanApprovals = approvalLog.filter(a => a.type === 'human');
  const systemApprovals = approvalLog.filter(a => a.type === 'system');
  const avgTtl = overrideLog.length > 0
    ? overrideLog.reduce((sum, o) => sum + o.ttlMs, 0) / overrideLog.length
    : 0;

  return {
    totalOverrides: overrideLog.length,
    activeOverrides: activeOverrides.length,
    totalApprovals: approvalLog.length,
    humanApprovals: humanApprovals.length,
    systemApprovals: systemApprovals.length,
    avgOverrideTtlMs: Math.round(avgTtl),
  };
}

// ============================================================================
// Maintenance
// ============================================================================

export function clearAll(): void {
  overrideLog.length = 0;
  approvalLog.length = 0;
}
