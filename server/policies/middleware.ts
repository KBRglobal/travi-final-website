/**
 * Policy Enforcement Middleware
 *
 * Express middleware that evaluates policies before allowing requests.
 * Feature flag: ENABLE_POLICY_ENFORCEMENT
 */

import { Request, Response, NextFunction, RequestHandler } from "express";
import { db } from "../db";
import { governancePolicies, governanceAuditLogs, policyEvaluations } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

// =====================================================
// TYPES
// =====================================================

export interface PolicyContext {
  userId?: string;
  userRole?: string;
  userRoles?: string[];
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  sessionId?: string;
}

export interface PolicyCondition {
  field: string;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "nin" | "contains" | "matches";
  value: unknown;
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  policyType: string;
  effect: "allow" | "warn" | "block";
  priority: number;
  conditions: Record<string, unknown>;
  actions: string[];
  resources: string[];
  roles: string[];
  message?: string;
  isActive: boolean;
}

export interface EvaluationResult {
  allowed: boolean;
  effect: "allow" | "warn" | "block";
  matchedPolicies: string[];
  messages: string[];
  warnings: string[];
}

export interface EnforcementConfig {
  enabled: boolean;
  defaultEffect: "allow" | "block";
  logEvaluations: boolean;
  bypassRoles: string[];
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
}

// =====================================================
// CONFIGURATION
// =====================================================

function getEnforcementConfig(): EnforcementConfig {
  return {
    enabled: process.env.ENABLE_POLICY_ENFORCEMENT === "true",
    defaultEffect: (process.env.POLICY_DEFAULT_EFFECT as "allow" | "block") || "allow",
    logEvaluations: process.env.POLICY_LOG_EVALUATIONS !== "false",
    bypassRoles: (process.env.POLICY_BYPASS_ROLES || "super_admin").split(","),
    cacheEnabled: process.env.POLICY_CACHE_ENABLED === "true",
    cacheTtlSeconds: parseInt(process.env.POLICY_CACHE_TTL_SECONDS || "60"),
  };
}

// =====================================================
// POLICY CACHE
// =====================================================

interface CacheEntry {
  policies: Policy[];
  timestamp: number;
}

const policyCache: Map<string, CacheEntry> = new Map();

function getCacheKey(action: string, resource: string): string {
  return `${action}:${resource}`;
}

function getCachedPolicies(action: string, resource: string, config: EnforcementConfig): Policy[] | null {
  if (!config.cacheEnabled) return null;

  const key = getCacheKey(action, resource);
  const entry = policyCache.get(key);

  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > config.cacheTtlSeconds * 1000) {
    policyCache.delete(key);
    return null;
  }

  return entry.policies;
}

function setCachedPolicies(action: string, resource: string, policies: Policy[]): void {
  const key = getCacheKey(action, resource);
  policyCache.set(key, { policies, timestamp: Date.now() });
}

export function clearPolicyCache(): void {
  policyCache.clear();
  console.log("[PolicyEnforcement] Cache cleared");
}

// =====================================================
// POLICY LOADING
// =====================================================

async function loadApplicablePolicies(action: string, resource: string): Promise<Policy[]> {
  const config = getEnforcementConfig();

  // Check cache first
  const cached = getCachedPolicies(action, resource, config);
  if (cached) return cached;

  const policies = await db
    .select()
    .from(governancePolicies)
    .where(eq(governancePolicies.isActive, true))
    .orderBy(governancePolicies.priority);

  const applicable = policies.filter((p) => {
    const actions = p.actions as string[] || [];
    const resources = p.resources as string[] || [];

    // Match if policy has no actions/resources filter OR matches the request
    const actionMatch = actions.length === 0 || actions.includes(action) || actions.includes("*");
    const resourceMatch = resources.length === 0 || resources.includes(resource) || resources.includes("*");

    return actionMatch && resourceMatch;
  }).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || undefined,
    policyType: p.policyType,
    effect: p.effect as "allow" | "warn" | "block",
    priority: p.priority,
    conditions: p.conditions as Record<string, unknown>,
    actions: p.actions as string[] || [],
    resources: p.resources as string[] || [],
    roles: p.roles as string[] || [],
    message: p.message || undefined,
    isActive: p.isActive,
  }));

  // Cache the result
  setCachedPolicies(action, resource, applicable);

  return applicable;
}

// =====================================================
// CONDITION EVALUATION
// =====================================================

function getContextValue(field: string, context: PolicyContext): unknown {
  // Built-in context fields
  const builtIn: Record<string, unknown> = {
    userId: context.userId,
    userRole: context.userRole,
    userRoles: context.userRoles,
    action: context.action,
    resource: context.resource,
    resourceId: context.resourceId,
    ipAddress: context.ipAddress,
    isAuthenticated: !!context.userId,
    isAdmin: context.userRoles?.includes("admin") || context.userRoles?.includes("super_admin"),
  };

  if (field in builtIn) {
    return builtIn[field];
  }

  // Check metadata
  return context.metadata?.[field];
}

function evaluateCondition(
  condition: PolicyCondition,
  context: PolicyContext
): boolean {
  const value = getContextValue(condition.field, context);

  switch (condition.operator) {
    case "eq":
      return value === condition.value;
    case "ne":
      return value !== condition.value;
    case "gt":
      return typeof value === "number" && value > (condition.value as number);
    case "lt":
      return typeof value === "number" && value < (condition.value as number);
    case "gte":
      return typeof value === "number" && value >= (condition.value as number);
    case "lte":
      return typeof value === "number" && value <= (condition.value as number);
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(value);
    case "nin":
      return Array.isArray(condition.value) && !condition.value.includes(value);
    case "contains":
      return typeof value === "string" && value.includes(condition.value as string);
    case "matches":
      try {
        return typeof value === "string" && new RegExp(condition.value as string).test(value);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function evaluateConditions(
  conditions: Record<string, unknown>,
  context: PolicyContext
): boolean {
  // Handle array of conditions (all must match)
  if (Array.isArray(conditions)) {
    return conditions.every((cond) => evaluateCondition(cond as PolicyCondition, context));
  }

  // Handle object conditions (all must match)
  for (const [key, value] of Object.entries(conditions)) {
    // Skip non-condition properties
    if (["requireApproval", "logToAudit", "retentionDays", "maxPerHour", "maxRecords", "minAffectedRecords", "preventSelfApproval"].includes(key)) {
      continue;
    }

    // Simple equality check
    const contextValue = getContextValue(key, context);
    if (contextValue !== value) {
      return false;
    }
  }

  return true;
}

// =====================================================
// POLICY EVALUATION
// =====================================================

function evaluatePolicy(policy: Policy, context: PolicyContext): boolean {
  // Check role restrictions
  if (policy.roles.length > 0) {
    const userRoles = context.userRoles || (context.userRole ? [context.userRole] : []);
    const hasRole = userRoles.some((r) => policy.roles.includes(r));
    if (!hasRole) return false;
  }

  // Evaluate conditions
  return evaluateConditions(policy.conditions, context);
}

export async function evaluatePolicies(context: PolicyContext): Promise<EvaluationResult> {
  const config = getEnforcementConfig();

  // Check if enforcement is enabled
  if (!config.enabled) {
    return {
      allowed: true,
      effect: "allow",
      matchedPolicies: [],
      messages: [],
      warnings: ["Policy enforcement disabled"],
    };
  }

  // Check bypass roles
  const userRoles = context.userRoles || (context.userRole ? [context.userRole] : []);
  const shouldBypass = userRoles.some((r) => config.bypassRoles.includes(r));
  if (shouldBypass) {
    return {
      allowed: true,
      effect: "allow",
      matchedPolicies: [],
      messages: [],
      warnings: ["Bypassed due to role"],
    };
  }

  // Load applicable policies
  const policies = await loadApplicablePolicies(context.action, context.resource);

  const matchedPolicies: string[] = [];
  const messages: string[] = [];
  const warnings: string[] = [];
  let finalEffect: "allow" | "warn" | "block" = config.defaultEffect;

  // Evaluate each policy (sorted by priority)
  for (const policy of policies) {
    if (evaluatePolicy(policy, context)) {
      matchedPolicies.push(policy.name);

      if (policy.message) {
        if (policy.effect === "warn") {
          warnings.push(policy.message);
        } else {
          messages.push(policy.message);
        }
      }

      // Block takes highest precedence
      if (policy.effect === "block") {
        finalEffect = "block";
      } else if (policy.effect === "warn" && finalEffect !== "block") {
        finalEffect = "warn";
      }
    }
  }

  const allowed = finalEffect !== "block";

  // Log evaluation
  if (config.logEvaluations && matchedPolicies.length > 0) {
    await logPolicyEvaluation(context, matchedPolicies, finalEffect, allowed);
  }

  return {
    allowed,
    effect: finalEffect,
    matchedPolicies,
    messages,
    warnings,
  };
}

async function logPolicyEvaluation(
  context: PolicyContext,
  matchedPolicies: string[],
  effect: string,
  allowed: boolean
): Promise<void> {
  try {
    for (const policyName of matchedPolicies) {
      await db.insert(policyEvaluations).values({
        policyName,
        userId: context.userId,
        action: context.action,
        resource: context.resource,
        resourceId: context.resourceId,
        result: allowed ? "allowed" : "blocked",
        reason: `Effect: ${effect}`,
      } as any);
    }
  } catch (error) {
    console.error("[PolicyEnforcement] Failed to log evaluation:", error);
  }
}

// =====================================================
// EXPRESS MIDDLEWARE
// =====================================================

export interface PolicyEnforcementOptions {
  action: string;
  resource: string;
  getResourceId?: (req: Request) => string | undefined;
  getMetadata?: (req: Request) => Record<string, unknown>;
  onWarn?: (req: Request, res: Response, result: EvaluationResult) => void;
  onBlock?: (req: Request, res: Response, result: EvaluationResult) => void;
}

export function enforcePolicy(options: PolicyEnforcementOptions): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const config = getEnforcementConfig();

    if (!config.enabled) {
      return next();
    }

    try {
      // Build context from request
      const context: PolicyContext = {
        userId: (req as any).user?.id,
        userRole: (req as any).user?.role,
        userRoles: (req as any).user?.roles || [(req as any).user?.role].filter(Boolean),
        action: options.action,
        resource: options.resource,
        resourceId: options.getResourceId?.(req),
        metadata: options.getMetadata?.(req),
        ipAddress: req.ip || req.socket?.remoteAddress,
        sessionId: req.sessionID,
      };

      const result = await evaluatePolicies(context);

      // Attach result to request for downstream use
      (req as any).policyResult = result;

      if (result.effect === "block") {
        if (options.onBlock) {
          options.onBlock(req, res, result);
        } else {
          res.status(403).json({
            error: "Policy violation",
            messages: result.messages,
            policies: result.matchedPolicies,
          });
        }
        return;
      }

      if (result.effect === "warn" && result.warnings.length > 0) {
        if (options.onWarn) {
          options.onWarn(req, res, result);
        }
        // Continue with warning attached to response
        res.setHeader("X-Policy-Warnings", result.warnings.join("; "));
      }

      next();
    } catch (error) {
      console.error("[PolicyEnforcement] Middleware error:", error);
      // Fail open by default (allow request on error)
      next();
    }
  };
}

// =====================================================
// CONVENIENCE MIDDLEWARE FACTORIES
// =====================================================

export function enforceContentPolicy(action: string): RequestHandler {
  return enforcePolicy({
    action,
    resource: "content",
    getResourceId: (req) => req.params.id,
    getMetadata: (req) => ({
      contentType: req.body?.type,
      contentStatus: req.body?.status,
    }),
  });
}

export function enforceUserPolicy(action: string): RequestHandler {
  return enforcePolicy({
    action,
    resource: "user",
    getResourceId: (req) => req.params.id,
    getMetadata: (req) => ({
      targetRole: req.body?.role,
    }),
  });
}

export function enforceExportPolicy(): RequestHandler {
  return enforcePolicy({
    action: "export",
    resource: "data",
    getMetadata: (req) => ({
      format: req.query.format,
      recordCount: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    }),
  });
}

export function enforceAdminPolicy(action: string, resource: string): RequestHandler {
  return enforcePolicy({
    action,
    resource,
    getResourceId: (req) => req.params.id,
    getMetadata: (req) => req.body,
  });
}

// =====================================================
// AUDIT INTEGRATION
// =====================================================

export async function auditPolicyViolation(
  context: PolicyContext,
  result: EvaluationResult
): Promise<void> {
  try {
    await db.insert(governanceAuditLogs).values({
      userId: context.userId,
      userRole: context.userRole,
      action: `policy.${result.effect}`,
      resource: context.resource,
      resourceId: context.resourceId,
      source: "policy_enforcement",
      ipAddress: context.ipAddress,
      metadata: {
        requestedAction: context.action,
        matchedPolicies: result.matchedPolicies,
        messages: result.messages,
        warnings: result.warnings,
      },
    } as any);
  } catch (error) {
    console.error("[PolicyEnforcement] Failed to audit violation:", error);
  }
}

console.log("[PolicyEnforcement] Module loaded");
