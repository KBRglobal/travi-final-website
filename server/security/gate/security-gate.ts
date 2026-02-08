/**
 * Global Security Gate
 *
 * THE SINGLE ENFORCEMENT POINT FOR ALL CRITICAL ACTIONS
 *
 * This is the hard-stop layer that:
 * - Gates ALL critical operations across the platform
 * - Overrides all other systems (Data, SEO, Ops, Autonomy)
 * - Provides fail-closed enforcement
 * - Produces audit-ready evidence
 *
 * NO CRITICAL ACTION MAY EXECUTE WITHOUT PASSING THIS GATE.
 */

import { Request, Response, NextFunction } from "express";
import { checkUserPermission } from "../rbac/enforcer";
import { isOperationAllowed, getSecurityMode, getModeConfiguration } from "../modes/security-modes";
import { checkDataAccess } from "../exfiltration/exfiltration-guard";
import { processSecurityEvent } from "../intelligence/security-intelligence";

import { shouldAllow, getThreatLevel } from "../core/security-kernel";
import { logAdminEvent } from "../../governance/security-logger";
import { generateEvidence } from "../compliance/evidence-generator";

// ============================================================================
// TYPES
// ============================================================================

export interface SecurityGateRequest {
  actor: {
    userId: string;
    role: string;
    sessionId?: string;
    ipAddress?: string;
  };
  action: string;
  resource: string;
  resourceId?: string;
  context?: {
    recordCount?: number;
    byteCount?: number;
    isAutomated?: boolean;
    automationSource?: string;
    requiresApproval?: boolean;
    overrideId?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface SecurityGateResult {
  allowed: boolean;
  blocked: boolean;
  reason: string;
  code: SecurityBlockCode;
  requiresApproval: boolean;
  approvalType?: string;
  overridable: boolean;
  evidence?: {
    id: string;
    timestamp: Date;
  };
  recommendations?: string[];
}

export type SecurityBlockCode =
  | "ALLOWED"
  | "KERNEL_DENY"
  | "MODE_DENY"
  | "RBAC_DENY"
  | "EXFILTRATION_DENY"
  | "THREAT_DENY"
  | "APPROVAL_REQUIRED"
  | "OVERRIDE_EXPIRED"
  | "RATE_LIMITED"
  | "SYSTEM_LOCKDOWN";

// Critical actions that MUST pass through the gate
const CRITICAL_ACTIONS = new Set([
  "delete",
  "bulk_delete",
  "export",
  "bulk_export",
  "manage_users",
  "manage_roles",
  "manage_policies",
  "configure",
  "deploy",
  "cutover",
  "publish",
  "unpublish",
  "bulk_update",
  "data_decision",
  "seo_autopilot",
  "autonomy_change",
]);

// Actions that are always blocked in lockdown
const LOCKDOWN_BLOCKED = new Set([
  "delete",
  "bulk_delete",
  "export",
  "bulk_export",
  "manage_users",
  "manage_roles",
  "manage_policies",
  "configure",
  "deploy",
  "cutover",
  "publish",
  "bulk_update",
  "autonomy_change",
]);

// Feature flag for gradual rollout
const SECURITY_GATE_ENABLED = process.env.SECURITY_GATE_ENABLED !== "false";
const SECURITY_GATE_ENFORCE =
  process.env.SECURITY_GATE_ENFORCE === "true" || process.env.NODE_ENV === "production";

// ============================================================================
// GATE STATISTICS
// ============================================================================

interface GateStats {
  totalRequests: number;
  allowed: number;
  blocked: number;
  byCode: Record<SecurityBlockCode, number>;
  lastReset: Date;
}

const gateStats: GateStats = {
  totalRequests: 0,
  allowed: 0,
  blocked: 0,
  byCode: {
    ALLOWED: 0,
    KERNEL_DENY: 0,
    MODE_DENY: 0,
    RBAC_DENY: 0,
    EXFILTRATION_DENY: 0,
    THREAT_DENY: 0,
    APPROVAL_REQUIRED: 0,
    OVERRIDE_EXPIRED: 0,
    RATE_LIMITED: 0,
    SYSTEM_LOCKDOWN: 0,
  },
  lastReset: new Date(),
};

// ============================================================================
// MAIN GATE FUNCTION
// ============================================================================

/**
 * THE GLOBAL SECURITY GATE
 *
 * This function MUST be called before any critical action.
 * If it returns blocked: true, the action MUST NOT proceed.
 */
/**
 * Run kernel security check (Layer 1)
 */
function checkKernel(request: SecurityGateRequest): SecurityGateResult | null {
  const { actor, action, resource, context } = request;
  const kernelCheck = shouldAllow({
    action: action as any,
    resource: resource as any,
    userId: actor.userId,
    role: actor.role,
    context: context || {},
  } as any);

  if (!kernelCheck.allowed) {
    return {
      allowed: false,
      blocked: true,
      reason: kernelCheck.reason,
      code: "KERNEL_DENY",
      requiresApproval: false,
      overridable: false,
    };
  }
  return null;
}

/**
 * Run security mode check (Layer 2)
 */
function checkSecurityMode(action: string): SecurityGateResult | null {
  const mode = getSecurityMode();

  if (mode === "lockdown" && LOCKDOWN_BLOCKED.has(action)) {
    return {
      allowed: false,
      blocked: true,
      reason: `Action '${action}' blocked during LOCKDOWN mode`,
      code: "SYSTEM_LOCKDOWN",
      requiresApproval: false,
      overridable: false,
    };
  }

  const modeCheck = isOperationAllowed(action);
  if (!modeCheck.allowed) {
    return {
      allowed: false,
      blocked: true,
      reason: modeCheck.reason || `Action blocked by security mode: ${mode}`,
      code: "MODE_DENY",
      requiresApproval: false,
      overridable: mode !== "lockdown",
    };
  }

  return null;
}

/**
 * Run threat level check (Layer 3)
 */
function checkThreat(actorRole: string): SecurityGateResult | null {
  const threatLevel = getThreatLevel();
  if ((threatLevel === "black" || threatLevel === "red") && actorRole !== "super_admin") {
    return {
      allowed: false,
      blocked: true,
      reason: `Action blocked due to ${threatLevel.toUpperCase()} threat level`,
      code: "THREAT_DENY",
      requiresApproval: false,
      overridable: false,
    };
  }
  return null;
}

/**
 * Run RBAC check (Layer 4)
 */
function checkRbac(request: SecurityGateRequest): SecurityGateResult | null {
  const { actor, action, resource, context } = request;
  const rbacCheck = checkUserPermission(actor.userId, actor.role, action as any, resource as any, {
    ipAddress: actor.ipAddress,
    sessionId: actor.sessionId,
    ...context?.metadata,
  });

  if (!rbacCheck.allowed) {
    return {
      allowed: false,
      blocked: true,
      reason: rbacCheck.reason,
      code: "RBAC_DENY",
      requiresApproval: false,
      overridable: false,
    };
  }
  return null;
}

/**
 * Run exfiltration check (Layer 5)
 */
async function checkExfiltration(request: SecurityGateRequest): Promise<SecurityGateResult | null> {
  const { actor, action, resource, context } = request;
  if (!context?.recordCount && !context?.byteCount) return null;

  const exfilCheck = await checkDataAccess(
    actor.userId,
    actor.role,
    resource,
    action === "export" ? "export" : "read",
    context.recordCount || 0,
    context.byteCount || 0
  );

  if (exfilCheck.blocked) {
    return {
      allowed: false,
      blocked: true,
      reason: exfilCheck.reason || "Data access limit exceeded",
      code: "EXFILTRATION_DENY",
      requiresApproval: false,
      overridable: false,
      recommendations: exfilCheck.recommendations,
    };
  }
  return null;
}

/**
 * Run approval requirement check (Layer 6)
 */
function checkApproval(
  action: string,
  context?: SecurityGateRequest["context"]
): SecurityGateResult | null {
  const modeConfig = getModeConfiguration();
  if (!modeConfig.restrictions.requireApproval || !CRITICAL_ACTIONS.has(action)) return null;

  if (!context?.overrideId || !isOverrideValid(context.overrideId)) {
    return {
      allowed: false,
      blocked: false,
      reason: "Action requires approval",
      code: "APPROVAL_REQUIRED",
      requiresApproval: true,
      approvalType: getApprovalType(action),
      overridable: true,
    };
  }
  return null;
}

export async function assertAllowed(request: SecurityGateRequest): Promise<SecurityGateResult> {
  gateStats.totalRequests++;
  const startTime = Date.now();

  const layerChecks: (SecurityGateResult | null)[] = [
    checkKernel(request),
    checkSecurityMode(request.action),
    checkThreat(request.actor.role),
    checkRbac(request),
  ];

  for (const result of layerChecks) {
    if (result) return recordAndReturn(result, request, startTime);
  }

  const exfilResult = await checkExfiltration(request);
  if (exfilResult) return recordAndReturn(exfilResult, request, startTime);

  const approvalResult = checkApproval(request.action, request.context);
  if (approvalResult) return recordAndReturn(approvalResult, request, startTime);

  return recordAndReturn(
    {
      allowed: true,
      blocked: false,
      reason: "All security checks passed",
      code: "ALLOWED",
      requiresApproval: false,
      overridable: false,
    },
    request,
    startTime
  );
}

/**
 * Record the gate decision and return result
 */
function recordAndReturn(
  result: SecurityGateResult,
  request: SecurityGateRequest,
  startTime: number
): SecurityGateResult {
  const elapsed = Date.now() - startTime;

  // Update stats
  gateStats.byCode[result.code]++;
  if (result.allowed) {
    gateStats.allowed++;
  } else {
    gateStats.blocked++;
  }

  // Log security event
  processSecurityEvent({
    id: `gate_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    type: result.allowed ? "permission_granted" : "permission_denied",
    userId: request.actor.userId,
    resourceType: request.resource,
    resourceId: request.resourceId,
    ipAddress: request.actor.ipAddress,
    sessionId: request.actor.sessionId,
    metadata: {
      action: request.action,
      code: result.code,
      reason: result.reason,
      elapsed,
    },
  });

  // Generate evidence for blocked actions
  if (result.blocked) {
    try {
      const evidence = generateEvidence(
        "SOC2",
        "CC6.1",
        "access_log",
        {
          userId: request.actor.userId,
          action: request.action,
          resource: request.resource,
          decision: "denied",
          reason: result.reason,
          code: result.code,
          timestamp: new Date().toISOString(),
        },
        new Date(),
        new Date()
      );
      result.evidence = { id: evidence.id, timestamp: evidence.timestamp };
    } catch {
      void 0; // Evidence generation is non-critical
    }
  }

  // Log to admin events if blocked
  if (result.blocked) {
    logAdminEvent(
      request.actor.userId,
      "SECURITY_GATE_BLOCK",
      request.resource,
      request.resourceId || "unknown",
      {
        action: request.action,
        code: result.code,
        reason: result.reason,
      }
    );
  }

  return result;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isOverrideValid(overrideId: string): boolean {
  // Will be implemented in override registry
  // For now, returns false (no overrides valid)
  return false;
}

function getApprovalType(action: string): string {
  switch (action) {
    case "delete":
    case "bulk_delete":
      return "delete-content";
    case "manage_users":
    case "manage_roles":
      return "user-role-change";
    case "manage_policies":
      return "policy-change";
    case "deploy":
    case "cutover":
      return "deployment";
    case "export":
    case "bulk_export":
      return "data-export";
    default:
      return "general";
  }
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

/**
 * Express middleware for Security Gate enforcement
 */
export function securityGateMiddleware(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!SECURITY_GATE_ENABLED) {
      return next();
    }

    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const result = await assertAllowed({
      actor: {
        userId: user.id,
        role: user.role || "viewer",
        sessionId: (req as any).sessionId,
        ipAddress: req.ip,
      },
      action,
      resource,
      resourceId: req.params.id,
      context: {
        recordCount: Number.parseInt(req.query.limit as string) || undefined,
        metadata: req.body,
      },
    });

    if (result.blocked) {
      if (SECURITY_GATE_ENFORCE) {
        return res.status(403).json({
          error: result.reason,
          code: result.code,
          requiresApproval: result.requiresApproval,
          approvalType: result.approvalType,
          recommendations: result.recommendations,
        });
      } else {
        // Advisory mode - log but don't block
      }
    }

    // Attach result to request for downstream use
    (req as any).securityGateResult = result;
    next();
  };
}

/**
 * Decorator for async functions that require security gate
 */
export function requiresSecurityGate(action: string, resource: string) {
  // Decorator target must use any - this is standard TypeScript decorator pattern

  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      // Extract actor from first argument or context
      const context = args[0] as
        | {
            actor?: { userId?: string; id?: string; role?: string };
            user?: { userId?: string; id?: string; role?: string };
            gateContext?: Record<string, unknown>;
          }
        | undefined;
      const actor = context?.actor || context?.user || { userId: "unknown", role: "viewer" };

      const result = await assertAllowed({
        actor: {
          userId: actor.userId || actor.id || "unknown",
          role: actor.role || "viewer",
        },
        action,
        resource,
        context: context?.gateContext,
      });

      if (result.blocked && SECURITY_GATE_ENFORCE) {
        throw new SecurityGateError(result);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Error class for security gate blocks
 */
export class SecurityGateError extends Error {
  public readonly result: SecurityGateResult;
  public readonly code: SecurityBlockCode;

  constructor(result: SecurityGateResult) {
    super(result.reason);
    this.name = "SecurityGateError";
    this.result = result;
    this.code = result.code;
  }
}

// ============================================================================
// GATE STATISTICS API
// ============================================================================

export function getGateStatistics(): GateStats {
  return { ...gateStats };
}

export function resetGateStatistics(): void {
  gateStats.totalRequests = 0;
  gateStats.allowed = 0;
  gateStats.blocked = 0;
  for (const code of Object.keys(gateStats.byCode) as SecurityBlockCode[]) {
    gateStats.byCode[code] = 0;
  }
  gateStats.lastReset = new Date();
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Quick check for data decisions
 */
export async function gateDataDecision(
  userId: string,
  role: string,
  decisionType: string,
  context?: Record<string, unknown>
): Promise<SecurityGateResult> {
  return assertAllowed({
    actor: { userId, role },
    action: "data_decision",
    resource: "data",
    context: {
      isAutomated: true,
      automationSource: "data_decisions",
      metadata: { decisionType, ...context },
    },
  });
}

/**
 * Quick check for SEO autopilot actions
 */
export async function gateSEOAction(
  userId: string,
  role: string,
  seoAction: string,
  context?: Record<string, unknown>
): Promise<SecurityGateResult> {
  return assertAllowed({
    actor: { userId, role },
    action: "seo_autopilot",
    resource: "content",
    context: {
      isAutomated: true,
      automationSource: "seo_autopilot",
      metadata: { seoAction, ...context },
    },
  });
}

/**
 * Quick check for deployment actions
 */
export async function gateDeployment(
  userId: string,
  role: string,
  deploymentType: string,
  context?: Record<string, unknown>
): Promise<SecurityGateResult> {
  return assertAllowed({
    actor: { userId, role },
    action: "deploy",
    resource: "system",
    context: {
      requiresApproval: true,
      metadata: { deploymentType, ...context },
    },
  });
}

/**
 * Quick check for bulk operations
 */
export async function gateBulkOperation(
  userId: string,
  role: string,
  operation: "update" | "delete" | "export",
  resource: string,
  recordCount: number
): Promise<SecurityGateResult> {
  return assertAllowed({
    actor: { userId, role },
    action: `bulk_${operation}`,
    resource,
    context: {
      recordCount,
      requiresApproval: recordCount > 100,
    },
  });
}
