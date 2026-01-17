/**
 * Autonomy Enforcement SDK - Decision Engine
 * Core enforcement logic with override support
 */

import {
  EnforcementContext,
  EnforcementResult,
  EnforcementOverride,
  AutonomyBlockedError,
  DEFAULT_ENFORCEMENT_CONFIG,
  GuardedFeature,
} from './types';
import { PolicyTarget, PolicyDecision, ActionType } from '../policy/types';
import { evaluatePolicy, recordActionExecution } from '../policy/policy-engine';
import { generateTargetKey } from '../policy/config';
import { db } from '../../db';
import { autonomyDecisionLogs } from '@shared/schema';
import { eq, and, gt, desc } from 'drizzle-orm';

// In-memory LRU cache for overrides
const overrideCache = new Map<string, { override: EnforcementOverride | null; expiresAt: number }>();
const MAX_OVERRIDE_CACHE = 500;
const OVERRIDE_CACHE_TTL = 60000; // 1 minute

// Decision log buffer for batch inserts
const decisionBuffer: Array<{
  targetKey: string;
  feature: string;
  action: string;
  decision: PolicyDecision;
  reasons: string;
  matchedPolicy: string | null;
  overrideUsed: boolean;
  requesterId: string | null;
  metadata: string | null;
  evaluatedAt: Date;
}> = [];
const MAX_BUFFER_SIZE = 50;
const FLUSH_INTERVAL_MS = 5000;

let flushTimer: ReturnType<typeof setInterval> | null = null;

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(flushDecisionBuffer, FLUSH_INTERVAL_MS);
}

async function flushDecisionBuffer() {
  if (decisionBuffer.length === 0) return;

  const toFlush = decisionBuffer.splice(0, decisionBuffer.length);

  try {
    await db.insert(autonomyDecisionLogs).values(toFlush as any);
  } catch (error) {
    console.error('[Enforcement] Failed to flush decision buffer:', error);
    // Re-add failed entries (up to max buffer size)
    const remaining = MAX_BUFFER_SIZE - decisionBuffer.length;
    if (remaining > 0) {
      decisionBuffer.push(...toFlush.slice(0, remaining));
    }
  }
}

function featureToTarget(feature: GuardedFeature, entityId?: string, locale?: string): PolicyTarget {
  if (entityId) {
    return { type: 'entity', entity: entityId as any };
  }
  if (locale) {
    return { type: 'locale', locale };
  }
  // Map feature to policy feature type
  const featureMap: Record<GuardedFeature, string> = {
    chat: 'chat',
    octopus: 'octopus',
    search: 'search',
    aeo: 'aeo',
    translation: 'content',
    images: 'content',
    content_enrichment: 'content',
    seo_optimization: 'content',
    internal_linking: 'content',
    background_job: 'automation',
    publishing: 'content',
  };
  return { type: 'feature', feature: featureMap[feature] as any };
}

function getOverrideCacheKey(targetKey: string, feature: GuardedFeature): string {
  return `${targetKey}:${feature}`;
}

async function checkOverride(targetKey: string, feature: GuardedFeature): Promise<EnforcementOverride | null> {
  const cacheKey = getOverrideCacheKey(targetKey, feature);
  const cached = overrideCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.override;
  }

  // Check database for active override
  try {
    const [override] = await db
      .select()
      .from(autonomyDecisionLogs)
      .where(
        and(
          eq(autonomyDecisionLogs.targetKey, targetKey),
          eq((autonomyDecisionLogs as any).feature, feature),
          eq((autonomyDecisionLogs as any).overrideUsed, true),
          gt((autonomyDecisionLogs as any).evaluatedAt, new Date())
        )
      )
      .orderBy(desc((autonomyDecisionLogs as any).evaluatedAt))
      .limit(1);

    // Note: Overrides are stored separately, this is a simplified check
    // In production, use a dedicated overrides table
    const result = override ? null : null; // Placeholder

    // Update cache
    if (overrideCache.size >= MAX_OVERRIDE_CACHE) {
      const firstKey = overrideCache.keys().next().value;
      if (firstKey) overrideCache.delete(firstKey);
    }
    overrideCache.set(cacheKey, { override: result, expiresAt: Date.now() + OVERRIDE_CACHE_TTL });

    return result;
  } catch (error) {
    console.error('[Enforcement] Override check failed:', error);
    return null;
  }
}

/**
 * Main enforcement function - evaluates policy and returns decision
 */
export async function enforceAutonomy(context: EnforcementContext): Promise<EnforcementResult> {
  const config = DEFAULT_ENFORCEMENT_CONFIG;
  const evaluatedAt = new Date();

  // If enforcement disabled, allow everything with info
  if (!config.enabled) {
    return {
      allowed: true,
      decision: 'ALLOW',
      reasons: [{ code: 'ENFORCEMENT_DISABLED', message: 'Autonomy enforcement is disabled', severity: 'info' }],
      warnings: [],
      evaluatedAt,
    };
  }

  startFlushTimer();

  const target = featureToTarget(context.feature, context.entityId, context.locale);
  const targetKey = generateTargetKey(target);

  // Check for active override
  const override = await checkOverride(targetKey, context.feature);
  if (override && override.active && override.expiresAt > new Date()) {
    const result: EnforcementResult = {
      allowed: true,
      decision: 'ALLOW',
      reasons: [{ code: 'OVERRIDE_ACTIVE', message: `Override active: ${override.reason}`, severity: 'info' }],
      warnings: [`Using override by ${override.createdBy}, expires ${override.expiresAt.toISOString()}`],
      overrideActive: true,
      evaluatedAt,
    };

    // Log decision
    bufferDecision(targetKey, context, 'ALLOW', result.reasons, null, true);
    return result;
  }

  // Evaluate policy
  try {
    const policyResult = await Promise.race([
      evaluatePolicy(target, context.action, {
        requesterId: context.requesterId,
        estimatedTokens: context.estimatedTokens,
        estimatedAiSpend: context.estimatedCost,
        metadata: context.metadata,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Policy evaluation timeout')), config.evaluationTimeoutMs)
      ),
    ]);

    const warnings = policyResult.reasons
      .filter(r => r.severity === 'warning')
      .map(r => r.message);

    const result: EnforcementResult = {
      allowed: policyResult.decision !== 'BLOCK',
      decision: policyResult.decision,
      reasons: policyResult.reasons,
      warnings,
      budgetRemaining: policyResult.budgetStatus
        ? {
            actions: policyResult.budgetStatus.actionsRemaining,
            tokens: 0, // Not directly tracked
            aiSpendCents: policyResult.budgetStatus.aiSpendRemaining,
          }
        : undefined,
      matchedPolicy: policyResult.matchedPolicy,
      evaluatedAt: policyResult.evaluatedAt,
    };

    // Buffer decision log
    bufferDecision(
      targetKey,
      context,
      policyResult.decision,
      policyResult.reasons,
      policyResult.matchedPolicy,
      false
    );

    return result;
  } catch (error) {
    console.error('[Enforcement] Policy evaluation failed:', error);

    // Fail closed on errors
    const result: EnforcementResult = {
      allowed: false,
      decision: 'BLOCK',
      reasons: [{
        code: 'EVALUATION_ERROR',
        message: error instanceof Error ? error.message : 'Policy evaluation failed',
        severity: 'error',
      }],
      warnings: [],
      evaluatedAt,
    };

    bufferDecision(targetKey, context, 'BLOCK', result.reasons, null, false);
    return result;
  }
}

/**
 * Enforce with automatic error throwing on BLOCK
 */
export async function enforceOrThrow(context: EnforcementContext): Promise<EnforcementResult> {
  const result = await enforceAutonomy(context);

  if (!result.allowed) {
    throw new AutonomyBlockedError(
      result.reasons.find(r => r.severity === 'error')?.message || DEFAULT_ENFORCEMENT_CONFIG.defaultBlockMessage,
      {
        reasons: result.reasons,
        feature: context.feature,
        action: context.action,
        matchedPolicy: result.matchedPolicy,
        retryAfter: getRetryAfterSeconds(result),
      }
    );
  }

  return result;
}

/**
 * Quick check without full enforcement (for lightweight validation)
 */
export async function quickEnforcementCheck(
  feature: GuardedFeature,
  action: ActionType
): Promise<boolean> {
  if (!DEFAULT_ENFORCEMENT_CONFIG.enabled) return true;

  const result = await enforceAutonomy({ feature, action });
  return result.allowed;
}

function bufferDecision(
  targetKey: string,
  context: EnforcementContext,
  decision: PolicyDecision,
  reasons: any[],
  matchedPolicy: string | null | undefined,
  overrideUsed: boolean
) {
  decisionBuffer.push({
    targetKey,
    feature: context.feature,
    action: context.action,
    decision,
    reasons: JSON.stringify(reasons),
    matchedPolicy: matchedPolicy || null,
    overrideUsed,
    requesterId: context.requesterId || null,
    metadata: context.metadata ? JSON.stringify(context.metadata) : null,
    evaluatedAt: new Date(),
  });

  if (decisionBuffer.length >= MAX_BUFFER_SIZE) {
    flushDecisionBuffer().catch(console.error);
  }
}

function getRetryAfterSeconds(result: EnforcementResult): number | undefined {
  // If budget exhausted, suggest retry after period reset
  if (result.reasons.some(r => r.code === 'BUDGET_EXHAUSTED')) {
    return 3600; // 1 hour
  }
  if (result.reasons.some(r => r.code === 'OUTSIDE_ALLOWED_HOURS')) {
    return 1800; // 30 minutes
  }
  return undefined;
}

// Cleanup on shutdown
export function shutdownDecisionEngine() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flushDecisionBuffer().catch(console.error);
  overrideCache.clear();
}
