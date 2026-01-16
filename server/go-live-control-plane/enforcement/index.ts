/**
 * GLCP Enforcement Module
 *
 * Central enforcement point for all platform operations.
 * GLCP is the FINAL authority for:
 * - Publishing
 * - Background jobs
 * - AI operations
 * - Autonomy/regeneration
 * - Feature rollout
 * - High-risk changes
 */

import { isGLCPEnabled, RiskLevel, CapabilityDomain } from '../capabilities/types';
import { evaluateReadiness, quickHealthCheck, getGoLiveReadiness } from '../readiness/evaluator';
import { getAllCapabilities, getCapabilityByFlag } from '../capabilities/registry';
import { detectInvalidStates, getSafeToEnable } from '../capabilities/dependency-resolver';
import { ReadinessStatus } from '../readiness/results';

// ========================================
// ENFORCEMENT DECISION TYPES
// ========================================

export type EnforcementAction = 'allow' | 'block' | 'warn';

export interface EnforcementDecision {
  action: EnforcementAction;
  status: ReadinessStatus;
  reason: string;
  blockers: string[];
  warnings: string[];
  timestamp: Date;
  operationType: string;
  riskLevel: RiskLevel;
}

export interface OperationContext {
  type: 'publish' | 'schedule' | 'job' | 'ai_call' | 'regeneration' | 'rollout' | 'bulk_change' | 'destructive';
  resourceId?: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}

// ========================================
// DECISION CACHE (idempotent, short TTL)
// ========================================

const decisionCache = new Map<string, { decision: EnforcementDecision; expiresAt: number }>();
const CACHE_TTL = 5000; // 5 seconds

function getCacheKey(context: OperationContext): string {
  return `${context.type}:${context.resourceId || 'global'}`;
}

function getCachedDecision(key: string): EnforcementDecision | null {
  const cached = decisionCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.decision;
  }
  decisionCache.delete(key);
  return null;
}

function cacheDecision(key: string, decision: EnforcementDecision): void {
  // Bounded cache
  if (decisionCache.size > 1000) {
    const firstKey = decisionCache.keys().next().value;
    if (firstKey) decisionCache.delete(firstKey);
  }
  decisionCache.set(key, { decision, expiresAt: Date.now() + CACHE_TTL });
}

// ========================================
// MAIN ENFORCEMENT FUNCTION
// ========================================

/**
 * Check if an operation is allowed
 * This is THE function all choke points must call
 */
export async function checkOperation(context: OperationContext): Promise<EnforcementDecision> {
  // If GLCP disabled, always allow
  if (!isGLCPEnabled()) {
    return createDecision('allow', 'READY', 'GLCP disabled', context, 'low');
  }

  // Check cache for idempotent behavior
  const cacheKey = getCacheKey(context);
  const cached = getCachedDecision(cacheKey);
  if (cached) {
    return cached;
  }

  // Emergency stop check - highest priority
  if (process.env.EMERGENCY_STOP_ENABLED === 'true') {
    const decision = createDecision('block', 'BLOCKED', 'Emergency stop is active', context, 'critical', ['Emergency stop engaged']);
    cacheDecision(cacheKey, decision);
    return decision;
  }

  // Get risk level for operation type
  const riskLevel = getOperationRiskLevel(context);

  // Quick health check for low-risk operations
  if (riskLevel === 'low') {
    const health = await quickHealthCheck();
    if (health.healthy) {
      const decision = createDecision('allow', health.status, 'Quick health check passed', context, 'low');
      cacheDecision(cacheKey, decision);
      return decision;
    }
  }

  // Full readiness evaluation for medium+ risk
  const readiness = await getGoLiveReadiness();

  // Determine action based on risk and readiness
  let action: EnforcementAction;
  if (readiness.recommendation === 'DO_NOT_PROCEED') {
    // Block high-risk operations, warn on medium
    action = riskLevel === 'low' ? 'warn' : 'block';
  } else if (readiness.recommendation === 'PROCEED_WITH_CAUTION') {
    // Block critical operations, warn others
    action = riskLevel === 'critical' || riskLevel === 'high' ? 'warn' : 'allow';
  } else {
    action = 'allow';
  }

  const decision = createDecision(
    action,
    readiness.status,
    `${readiness.recommendation}: ${action === 'allow' ? 'Allowed' : action === 'block' ? 'Blocked' : 'Warning'}`,
    context,
    riskLevel,
    readiness.blockers,
    readiness.warnings
  );

  cacheDecision(cacheKey, decision);
  return decision;
}

// ========================================
// SPECIALIZED ENFORCEMENT CHECKS
// ========================================

/**
 * Check if publishing is allowed
 */
export async function canPublish(contentId?: string, actor?: string): Promise<EnforcementDecision> {
  return checkOperation({ type: 'publish', resourceId: contentId, actor });
}

/**
 * Check if scheduling is allowed
 */
export async function canSchedule(contentId?: string, actor?: string): Promise<EnforcementDecision> {
  return checkOperation({ type: 'schedule', resourceId: contentId, actor });
}

/**
 * Check if a background job can run
 */
export async function canRunJob(jobType: string, jobId?: string): Promise<EnforcementDecision> {
  return checkOperation({ type: 'job', resourceId: jobId, metadata: { jobType } });
}

/**
 * Check if AI call is allowed
 */
export async function canMakeAICall(provider: string, taskType?: string): Promise<EnforcementDecision> {
  return checkOperation({ type: 'ai_call', metadata: { provider, taskType } });
}

/**
 * Check if regeneration/auto-healing is allowed
 */
export async function canRegenerate(contentId?: string): Promise<EnforcementDecision> {
  return checkOperation({ type: 'regeneration', resourceId: contentId });
}

/**
 * Check if feature rollout is allowed
 */
export async function canRollout(featureFlag: string): Promise<EnforcementDecision> {
  if (!isGLCPEnabled()) {
    return createDecision('allow', 'READY', 'GLCP disabled', { type: 'rollout', resourceId: featureFlag }, 'low');
  }

  // Check if flag is safe to enable
  const safeToEnable = getSafeToEnable();
  const cap = getCapabilityByFlag(featureFlag);

  if (!cap) {
    return createDecision('warn', 'DEGRADED', `Unknown feature flag: ${featureFlag}`, { type: 'rollout', resourceId: featureFlag }, 'medium', [], [`Flag ${featureFlag} not registered in GLCP`]);
  }

  const isSafe = safeToEnable.some(c => c.flagName === featureFlag);

  if (!isSafe) {
    // Check why it's not safe
    const invalidStates = detectInvalidStates();
    const issues = invalidStates.issues.filter(i => i.capabilityId === cap.id);
    const blockers = issues.map(i => i.details);

    return createDecision(
      'block',
      'BLOCKED',
      `Feature ${featureFlag} cannot be enabled`,
      { type: 'rollout', resourceId: featureFlag },
      cap.riskLevel,
      blockers.length > 0 ? blockers : [`Dependencies not met for ${cap.name}`]
    );
  }

  return checkOperation({ type: 'rollout', resourceId: featureFlag });
}

/**
 * Check if bulk/destructive change is allowed
 */
export async function canExecuteBulkChange(changeType: string, affectedCount: number): Promise<EnforcementDecision> {
  const context: OperationContext = {
    type: affectedCount > 100 ? 'destructive' : 'bulk_change',
    metadata: { changeType, affectedCount }
  };
  return checkOperation(context);
}

// ========================================
// EXPLAIN DECISION (for operators)
// ========================================

export interface DecisionExplanation {
  decision: EnforcementDecision;
  operationType: string;
  systemStatus: {
    glcpEnabled: boolean;
    emergencyStop: boolean;
    readinessScore: number;
    recommendation: string;
  };
  blockerDetails: Array<{
    issue: string;
    impact: string;
    suggestedFix: string;
  }>;
  capabilityStatus: Array<{
    name: string;
    status: string;
    domain: string;
  }>;
}

export async function explainDecision(context: OperationContext): Promise<DecisionExplanation> {
  const decision = await checkOperation(context);
  const readiness = await getGoLiveReadiness();
  const capabilities = getAllCapabilities().slice(0, 20); // Limit for response size

  const blockerDetails = decision.blockers.map(b => ({
    issue: b,
    impact: 'Operation may fail or cause issues',
    suggestedFix: 'Resolve the underlying issue before proceeding'
  }));

  return {
    decision,
    operationType: context.type,
    systemStatus: {
      glcpEnabled: isGLCPEnabled(),
      emergencyStop: process.env.EMERGENCY_STOP_ENABLED === 'true',
      readinessScore: readiness.score,
      recommendation: readiness.recommendation
    },
    blockerDetails,
    capabilityStatus: capabilities.map(c => ({
      name: c.name,
      status: c.status,
      domain: c.domain
    }))
  };
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getOperationRiskLevel(context: OperationContext): RiskLevel {
  switch (context.type) {
    case 'destructive':
      return 'critical';
    case 'regeneration':
    case 'bulk_change':
      return 'high';
    case 'publish':
    case 'rollout':
    case 'ai_call':
      return 'medium';
    case 'schedule':
    case 'job':
    default:
      return 'low';
  }
}

function createDecision(
  action: EnforcementAction,
  status: ReadinessStatus,
  reason: string,
  context: OperationContext,
  riskLevel: RiskLevel,
  blockers: string[] = [],
  warnings: string[] = []
): EnforcementDecision {
  return {
    action,
    status,
    reason,
    blockers,
    warnings,
    timestamp: new Date(),
    operationType: context.type,
    riskLevel
  };
}

// ========================================
// ENFORCEMENT LOGGING
// ========================================

const enforcementLog: Array<{
  timestamp: Date;
  decision: EnforcementDecision;
  context: OperationContext;
}> = [];
const MAX_LOG_SIZE = 1000;

export function logEnforcement(decision: EnforcementDecision, context: OperationContext): void {
  if (enforcementLog.length >= MAX_LOG_SIZE) {
    enforcementLog.shift();
  }
  enforcementLog.push({ timestamp: new Date(), decision, context });
}

export function getEnforcementLog(limit: number = 100): typeof enforcementLog {
  return enforcementLog.slice(-limit);
}

export function getEnforcementStats(): {
  total: number;
  allowed: number;
  blocked: number;
  warned: number;
  byType: Record<string, number>;
} {
  const stats = {
    total: enforcementLog.length,
    allowed: 0,
    blocked: 0,
    warned: 0,
    byType: {} as Record<string, number>
  };

  for (const entry of enforcementLog) {
    if (entry.decision.action === 'allow') stats.allowed++;
    else if (entry.decision.action === 'block') stats.blocked++;
    else stats.warned++;

    stats.byType[entry.context.type] = (stats.byType[entry.context.type] || 0) + 1;
  }

  return stats;
}
