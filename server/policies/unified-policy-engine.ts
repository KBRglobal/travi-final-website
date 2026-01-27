/**
 * Unified Policy Engine
 *
 * CONSOLIDATION DECISION (2026-01-01):
 * This file unifies three previously separate policy engines into a single, cohesive system:
 *
 * 1. Governance Policy Engine (/server/policies/policy-engine.ts)
 *    - Purpose: Action/resource/role-based policies with condition evaluation
 *    - Strengths: Flexible conditions, built-in policies, governance controls
 *    - Feature Flag: ENABLE_POLICY_ENFORCEMENT
 *
 * 2. Access Control Policy Engine (/server/access-control/policy-engine.ts)
 *    - Purpose: Role-Based Access Control (RBAC) with permission scoping
 *    - Strengths: User context management, role hierarchies, scoped permissions
 *    - Feature Flag: ENABLE_RBAC
 *    - Most widely used (20+ files across codebase)
 *
 * 3. Autonomy Policy Engine (/server/autonomy/policy/policy-engine.ts)
 *    - Purpose: Autonomous action control with budget enforcement
 *    - Strengths: Budget tracking (tokens, AI spend, writes), time windows, fail-closed design
 *    - Feature Flag: ENABLE_AUTONOMY_POLICY
 *
 * DESIGN RATIONALE:
 * Rather than force-merge these distinct systems, this unified engine provides:
 * - Single interface for all policy evaluations across the platform
 * - Intelligent delegation to specialized engines based on policy type
 * - Cross-cutting concerns: caching, logging, metrics, feature flags
 * - Ability to evaluate multiple policy types together for comprehensive checks
 * - Backward compatibility with existing code
 * - Progressive migration path
 *
 * USAGE:
 * ```typescript
 * import { evaluateUnifiedPolicy, PolicyRequest } from './unified-policy-engine';
 *
 * // Simple access check
 * const result = await evaluateUnifiedPolicy({
 *   type: 'access',
 *   userId: 'user-123',
 *   action: 'edit',
 *   resource: 'content',
 *   resourceId: 'content-456'
 * });
 *
 * // Governance policy check
 * const result = await evaluateUnifiedPolicy({
 *   type: 'governance',
 *   userId: 'user-123',
 *   action: 'publish',
 *   resource: 'content',
 *   context: { contentStatus: 'draft', score: 85 }
 * });
 *
 * // Autonomy policy check with budget
 * const result = await evaluateUnifiedPolicy({
 *   type: 'autonomy',
 *   target: { type: 'feature', feature: 'aeo' },
 *   action: 'ai_generate',
 *   estimatedTokens: 1000,
 *   estimatedAiSpend: 50
 * });
 *
 * // Combined check (evaluates all applicable policies)
 * const result = await evaluateUnifiedPolicy({
 *   type: 'combined',
 *   userId: 'user-123',
 *   action: 'ai_generate',
 *   resource: 'content',
 *   target: { type: 'feature', feature: 'aeo' },
 *   estimatedTokens: 1000
 * });
 * ```
 */

import { db } from "../db";
import { governancePolicies, policyEvaluations } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// Import from specialized engines
import * as GovernanceEngine from "./policy-engine";
import * as AccessControlEngine from "../access-control/policy-engine";
import * as AutonomyEngine from "../autonomy/policy/policy-engine";

// Import types
import type {
  PolicyContext as GovernancePolicyContext,
  PolicyDecision as GovernancePolicyDecision,
} from "./types";
import type {
  AccessContext,
  PermissionCheckResult,
  Action,
  Resource,
} from "../access-control/types";
import type {
  PolicyTarget,
  ActionType as AutonomyActionType,
  PolicyEvaluationResult,
} from "../autonomy/policy/types";

// =====================================================
// UNIFIED TYPES
// =====================================================

export type PolicyEngineType = "governance" | "access" | "autonomy" | "combined";

export type UnifiedPolicyEffect = "allow" | "warn" | "block";

export interface BaseRequest {
  /** Which policy engine(s) to use */
  type: PolicyEngineType;

  /** User making the request */
  userId?: string;

  /** Optional request metadata */
  metadata?: Record<string, unknown>;
}

export interface GovernancePolicyRequest extends BaseRequest {
  type: "governance";
  action: string;
  resource: string;
  resourceId?: string;
  userRole?: string;
  userRoles?: string[];
  context?: Record<string, unknown>;
}

export interface AccessPolicyRequest extends BaseRequest {
  type: "access";
  userId: string;
  action: Action;
  resource: Resource;
  resourceId?: string;
  locale?: string;
  entityId?: string;
  contentId?: string;
  teamId?: string;
}

export interface AutonomyPolicyRequest extends BaseRequest {
  type: "autonomy";
  target: PolicyTarget;
  action: AutonomyActionType;
  estimatedTokens?: number;
  estimatedWrites?: number;
  estimatedMutations?: number;
  estimatedAiSpend?: number;
  requesterId?: string;
}

export interface CombinedPolicyRequest extends BaseRequest {
  type: "combined";

  // Access control fields
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  userRole?: string;
  userRoles?: string[];

  // Autonomy fields (optional)
  target?: PolicyTarget;
  estimatedTokens?: number;
  estimatedWrites?: number;
  estimatedMutations?: number;
  estimatedAiSpend?: number;

  // Governance context
  context?: Record<string, unknown>;
}

export type PolicyRequest =
  | GovernancePolicyRequest
  | AccessPolicyRequest
  | AutonomyPolicyRequest
  | CombinedPolicyRequest;

export interface UnifiedPolicyResult {
  /** Final decision */
  effect: UnifiedPolicyEffect;

  /** Overall allowed/denied */
  allowed: boolean;

  /** Human-readable reason */
  reason: string;

  /** Detailed results from each engine */
  details: {
    governance?: GovernancePolicyDecision;
    access?: PermissionCheckResult;
    autonomy?: PolicyEvaluationResult;
  };

  /** All warnings from all engines */
  warnings: string[];

  /** Policies that blocked the request */
  blockedBy: string[];

  /** Evaluation metadata */
  meta: {
    evaluatedAt: Date;
    enginesUsed: PolicyEngineType[];
    cacheable: boolean;
    executionTimeMs: number;
  };
}

// =====================================================
// CACHE MANAGEMENT
// =====================================================

interface CacheEntry {
  result: UnifiedPolicyResult;
  timestamp: number;
}

const resultCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30000; // 30 seconds
const MAX_CACHE_SIZE = 500;

function getCacheKey(request: PolicyRequest): string {
  const keyParts = [
    request.type,
    request.userId || "anon",
    "action" in request ? request.action : "",
    "resource" in request ? request.resource : "",
    "resourceId" in request ? request.resourceId : "",
  ];
  return keyParts.join(":");
}

function getCachedResult(request: PolicyRequest): UnifiedPolicyResult | null {
  if (process.env.UNIFIED_POLICY_CACHE !== "true") return null;

  const key = getCacheKey(request);
  const cached = resultCache.get(key);

  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    resultCache.delete(key);
    return null;
  }

  return cached.result;
}

function setCachedResult(request: PolicyRequest, result: UnifiedPolicyResult): void {
  if (process.env.UNIFIED_POLICY_CACHE !== "true") return;
  if (!result.meta.cacheable) return;

  const key = getCacheKey(request);

  // Evict old entries if cache is full
  if (resultCache.size >= MAX_CACHE_SIZE) {
    const entries = Array.from(resultCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    entries.slice(0, 100).forEach(([k]) => resultCache.delete(k));
  }

  resultCache.set(key, { result, timestamp: Date.now() });
}

export function clearUnifiedPolicyCache(): void {
  resultCache.clear();
  GovernanceEngine.clearPolicyCache();
  AccessControlEngine.clearUserContextCache();
}

// =====================================================
// CORE EVALUATION ENGINE
// =====================================================

/**
 * Main unified policy evaluation function
 * Delegates to specialized engines based on policy type
 */
export async function evaluateUnifiedPolicy(request: PolicyRequest): Promise<UnifiedPolicyResult> {
  const startTime = Date.now();

  // Check cache first
  const cached = getCachedResult(request);
  if (cached) {
    return cached;
  }

  let result: UnifiedPolicyResult;

  switch (request.type) {
    case "governance":
      result = await evaluateGovernancePolicy(request);
      break;
    case "access":
      result = await evaluateAccessPolicy(request);
      break;
    case "autonomy":
      result = await evaluateAutonomyPolicy(request);
      break;
    case "combined":
      result = await evaluateCombinedPolicy(request);
      break;
    default:
      throw new Error(`Unknown policy type: ${(request as any).type}`);
  }

  // Add execution time
  result.meta.executionTimeMs = Date.now() - startTime;

  // Cache if appropriate
  setCachedResult(request, result);

  // Log if enabled
  await logUnifiedEvaluation(request, result);

  return result;
}

/**
 * Evaluate governance policy (action/resource/role-based with conditions)
 */
async function evaluateGovernancePolicy(
  request: GovernancePolicyRequest
): Promise<UnifiedPolicyResult> {
  const context: GovernancePolicyContext = {
    userId: request.userId,
    userRole: request.userRole,
    userRoles: request.userRoles,
    action: request.action,
    resource: request.resource,
    resourceId: request.resourceId,
    ...request.context,
  };

  const decision = await GovernanceEngine.evaluatePolicies(context);

  return {
    effect: decision.effect,
    allowed: decision.effect !== "block",
    reason: decision.reason,
    details: {
      governance: decision,
    },
    warnings: decision.warnings || [],
    blockedBy: decision.blockedBy || [],
    meta: {
      evaluatedAt: new Date(),
      enginesUsed: ["governance"],
      cacheable: true,
      executionTimeMs: 0, // Set later
    },
  };
}

/**
 * Evaluate access control policy (RBAC with permissions)
 */
async function evaluateAccessPolicy(request: AccessPolicyRequest): Promise<UnifiedPolicyResult> {
  const context: Partial<AccessContext> = {
    locale: request.locale,
    entityId: request.entityId,
    contentId: request.contentId,
    teamId: request.teamId,
  };

  const result = await AccessControlEngine.can(
    request.userId,
    request.action,
    request.resource,
    context
  );

  return {
    effect: result.allowed ? "allow" : "block",
    allowed: result.allowed,
    reason: result.reason,
    details: {
      access: result,
    },
    warnings: [],
    blockedBy: result.allowed ? [] : ["RBAC permission denied"],
    meta: {
      evaluatedAt: new Date(),
      enginesUsed: ["access"],
      cacheable: true,
      executionTimeMs: 0,
    },
  };
}

/**
 * Evaluate autonomy policy (budget-based with time windows)
 */
async function evaluateAutonomyPolicy(
  request: AutonomyPolicyRequest
): Promise<UnifiedPolicyResult> {
  const context = {
    requesterId: request.requesterId || request.userId,
    estimatedTokens: request.estimatedTokens,
    estimatedWrites: request.estimatedWrites,
    estimatedMutations: request.estimatedMutations,
    estimatedAiSpend: request.estimatedAiSpend,
    metadata: request.metadata,
  };

  const result = await AutonomyEngine.evaluatePolicy(request.target, request.action, context);

  const warnings: string[] = [];
  const blockedBy: string[] = [];

  for (const reason of result.reasons) {
    if (reason.severity === "warning") {
      warnings.push(reason.message);
    } else if (reason.severity === "error") {
      blockedBy.push(reason.message);
    }
  }

  return {
    effect: result.decision.toLowerCase() as UnifiedPolicyEffect,
    allowed: result.decision !== "BLOCK",
    reason: result.reasons[0]?.message || "Policy evaluated",
    details: {
      autonomy: result,
    },
    warnings,
    blockedBy,
    meta: {
      evaluatedAt: result.evaluatedAt,
      enginesUsed: ["autonomy"],
      cacheable: false, // Autonomy has budget state
      executionTimeMs: 0,
    },
  };
}

/**
 * Evaluate combined policy (all applicable engines)
 */
async function evaluateCombinedPolicy(
  request: CombinedPolicyRequest
): Promise<UnifiedPolicyResult> {
  const enginesUsed: PolicyEngineType[] = [];
  const details: UnifiedPolicyResult["details"] = {};
  const warnings: string[] = [];
  const blockedBy: string[] = [];

  let finalEffect: UnifiedPolicyEffect = "allow";
  let finalAllowed = true;
  const reasons: string[] = [];

  // 1. Check access control (RBAC) first - most fundamental
  try {
    const accessRequest: AccessPolicyRequest = {
      type: "access",
      userId: request.userId,
      action: request.action as Action,
      resource: request.resource as Resource,
      resourceId: request.resourceId,
      metadata: request.metadata,
    };

    const accessResult = await evaluateAccessPolicy(accessRequest);
    enginesUsed.push("access");
    details.access = accessResult.details.access;

    if (!accessResult.allowed) {
      finalEffect = "block";
      finalAllowed = false;
      blockedBy.push("Access Control: " + accessResult.reason);
      reasons.push(accessResult.reason);
    }
  } catch (error) {
    warnings.push("Access control check failed - proceeding with caution");
  }

  // 2. Check governance policies
  try {
    const govRequest: GovernancePolicyRequest = {
      type: "governance",
      userId: request.userId,
      action: request.action,
      resource: request.resource,
      resourceId: request.resourceId,
      userRole: request.userRole,
      userRoles: request.userRoles,
      context: request.context,
      metadata: request.metadata,
    };

    const govResult = await evaluateGovernancePolicy(govRequest);
    enginesUsed.push("governance");
    details.governance = govResult.details.governance;

    if (govResult.effect === "block") {
      finalEffect = "block";
      finalAllowed = false;
      blockedBy.push(...govResult.blockedBy);
      reasons.push(govResult.reason);
    } else if (govResult.effect === "warn") {
      if (finalEffect === "allow") finalEffect = "warn";
      warnings.push(...govResult.warnings);
    }
  } catch (error) {
    warnings.push("Governance check failed - proceeding with caution");
  }

  // 3. Check autonomy policies if target is specified
  if (request.target) {
    try {
      const autonomyRequest: AutonomyPolicyRequest = {
        type: "autonomy",
        userId: request.userId,
        target: request.target,
        action: request.action as AutonomyActionType,
        estimatedTokens: request.estimatedTokens,
        estimatedWrites: request.estimatedWrites,
        estimatedMutations: request.estimatedMutations,
        estimatedAiSpend: request.estimatedAiSpend,
        requesterId: request.userId,
        metadata: request.metadata,
      };

      const autonomyResult = await evaluateAutonomyPolicy(autonomyRequest);
      enginesUsed.push("autonomy");
      details.autonomy = autonomyResult.details.autonomy;

      if (autonomyResult.effect === "block") {
        finalEffect = "block";
        finalAllowed = false;
        blockedBy.push(...autonomyResult.blockedBy);
        reasons.push(autonomyResult.reason);
      } else if (autonomyResult.effect === "warn") {
        if (finalEffect === "allow") finalEffect = "warn";
        warnings.push(...autonomyResult.warnings);
      }
    } catch (error) {
      warnings.push("Autonomy check failed - proceeding with caution");
    }
  }

  return {
    effect: finalEffect,
    allowed: finalAllowed,
    reason: reasons.length > 0 ? reasons.join("; ") : "All policies passed",
    details,
    warnings,
    blockedBy,
    meta: {
      evaluatedAt: new Date(),
      enginesUsed,
      cacheable: !enginesUsed.includes("autonomy"), // Don't cache if autonomy was checked
      executionTimeMs: 0,
    },
  };
}

// =====================================================
// CONVENIENCE FUNCTIONS
// =====================================================

/**
 * Quick boolean check - is this action allowed?
 */
export async function isAllowed(request: PolicyRequest): Promise<boolean> {
  const result = await evaluateUnifiedPolicy(request);
  return result.allowed;
}

/**
 * Check with warnings - returns allowed status and any warnings
 */
export async function checkWithWarnings(request: PolicyRequest): Promise<{
  allowed: boolean;
  warnings: string[];
  reason: string;
}> {
  const result = await evaluateUnifiedPolicy(request);
  return {
    allowed: result.allowed,
    warnings: result.warnings,
    reason: result.reason,
  };
}

/**
 * Simple RBAC check wrapper
 */
export async function canUserAccess(
  userId: string,
  action: Action,
  resource: Resource,
  context?: Partial<AccessContext>
): Promise<boolean> {
  const result = await evaluateUnifiedPolicy({
    type: "access",
    userId,
    action,
    resource,
    ...context,
  });
  return result.allowed;
}

/**
 * Check if action passes all governance policies
 */
export async function checkGovernanceCompliance(
  action: string,
  resource: string,
  context: Record<string, unknown>
): Promise<UnifiedPolicyResult> {
  return evaluateUnifiedPolicy({
    type: "governance",
    action,
    resource,
    context,
  });
}

/**
 * Check autonomy budget and limits
 */
export async function checkAutonomyLimits(
  target: PolicyTarget,
  action: AutonomyActionType,
  estimations: {
    tokens?: number;
    writes?: number;
    mutations?: number;
    aiSpend?: number;
  }
): Promise<UnifiedPolicyResult> {
  return evaluateUnifiedPolicy({
    type: "autonomy",
    target,
    action,
    estimatedTokens: estimations.tokens,
    estimatedWrites: estimations.writes,
    estimatedMutations: estimations.mutations,
    estimatedAiSpend: estimations.aiSpend,
  });
}

// =====================================================
// LOGGING & METRICS
// =====================================================

async function logUnifiedEvaluation(
  request: PolicyRequest,
  result: UnifiedPolicyResult
): Promise<void> {
  if (process.env.UNIFIED_POLICY_LOGGING !== "true") return;

  try {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
    }

    // Could add database logging, metrics, etc. here
  } catch (error) {}
}

/**
 * Get comprehensive policy statistics
 */
export async function getUnifiedPolicyStats(): Promise<{
  governance: Awaited<ReturnType<typeof GovernanceEngine.getEnforcementSummary>>;
  cacheSize: number;
  cacheHitRate: number;
}> {
  const governanceStats = await GovernanceEngine.getEnforcementSummary();

  return {
    governance: governanceStats,
    cacheSize: resultCache.size,
    cacheHitRate: 0, // Would need to track hits/misses
  };
}

// =====================================================
// MIGRATION HELPERS
// =====================================================

/**
 * Migrate from old governance engine
 */
export async function migrateFromGovernanceEngine(
  context: GovernancePolicyContext
): Promise<UnifiedPolicyResult> {
  return evaluateUnifiedPolicy({
    type: "governance",
    userId: context.userId,
    action: context.action,
    resource: context.resource,
    resourceId: context.resourceId,
    userRole: context.userRole,
    userRoles: context.userRoles,
    context: context.metadata,
  });
}

/**
 * Migrate from old access control engine
 */
export async function migrateFromAccessEngine(
  userId: string,
  action: Action,
  resource: Resource,
  context?: Partial<AccessContext>
): Promise<UnifiedPolicyResult> {
  return evaluateUnifiedPolicy({
    type: "access",
    userId,
    action,
    resource,
    ...context,
  });
}

/**
 * Migrate from old autonomy engine
 */
export async function migrateFromAutonomyEngine(
  target: PolicyTarget,
  action: AutonomyActionType,
  context?: {
    requesterId?: string;
    estimatedTokens?: number;
    estimatedWrites?: number;
    estimatedMutations?: number;
    estimatedAiSpend?: number;
  }
): Promise<UnifiedPolicyResult> {
  return evaluateUnifiedPolicy({
    type: "autonomy",
    target,
    action,
    requesterId: context?.requesterId,
    estimatedTokens: context?.estimatedTokens,
    estimatedWrites: context?.estimatedWrites,
    estimatedMutations: context?.estimatedMutations,
    estimatedAiSpend: context?.estimatedAiSpend,
  });
}

// =====================================================
// FEATURE FLAGS
// =====================================================

export function isUnifiedEngineEnabled(): boolean {
  return process.env.ENABLE_UNIFIED_POLICY_ENGINE === "true";
}

export function getEnabledEngines(): PolicyEngineType[] {
  const enabled: PolicyEngineType[] = [];

  if (process.env.ENABLE_POLICY_ENFORCEMENT === "true") {
    enabled.push("governance");
  }

  if (process.env.ENABLE_RBAC === "true") {
    enabled.push("access");
  }

  if (process.env.ENABLE_AUTONOMY_POLICY === "true") {
    enabled.push("autonomy");
  }

  return enabled;
}

// =====================================================
// RE-EXPORTS FOR CONVENIENCE
// =====================================================

// Re-export specialized engine functions for backward compatibility
export { GovernanceEngine, AccessControlEngine, AutonomyEngine };

// Re-export common types
export type {
  GovernancePolicyContext,
  GovernancePolicyDecision,
  AccessContext,
  PermissionCheckResult,
  PolicyTarget,
  AutonomyActionType,
  PolicyEvaluationResult,
};
