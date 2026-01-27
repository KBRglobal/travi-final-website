/**
 * Security Gate - Global Enforcement Hook
 *
 * THE HIGHEST AUTHORITY IN THE SYSTEM
 * All critical actions MUST pass through this gate.
 * If denied, execution MUST stop immediately.
 *
 * Feature flag: ENABLE_SECURITY_AUTHORITY
 */

import { v4 as uuidv4 } from "uuid";
import {
  GateRequest,
  GateDecision,
  GateReason,
  GatedAction,
  SecurityMode,
  ThreatLevel,
  SecurityModeConfig,
  ThreatState,
  MODE_RESTRICTIONS,
  DEFAULT_SECURITY_AUTHORITY_CONFIG,
  ActorIdentity,
  GateContext,
  ResourceType,
} from "./types";
import { SecuritySeverity, logSecurityEvent, SecurityEventType } from "../audit-logger";

// ============================================================================
// SECURITY STATE MANAGEMENT
// ============================================================================

let currentSecurityMode: SecurityModeConfig = {
  mode: DEFAULT_SECURITY_AUTHORITY_CONFIG.defaultMode,
  reason: "System default",
  activatedAt: new Date(),
  activatedBy: "system",
  restrictions: MODE_RESTRICTIONS[DEFAULT_SECURITY_AUTHORITY_CONFIG.defaultMode],
};

let currentThreatState: ThreatState = {
  level: "normal",
  sources: [],
  activeSince: new Date(),
};

// Override cache (bounded to prevent memory issues)
const MAX_OVERRIDE_CACHE = 500;
const overrideCache = new Map<string, { expires: Date; overrideId: string }>();

// Decision audit log (in-memory buffer, flushed to DB periodically)
const MAX_AUDIT_BUFFER = 1000;
const auditBuffer: Array<{
  auditId: string;
  request: GateRequest;
  decision: GateDecision;
  timestamp: Date;
}> = [];

// Rate limiting tracking
const rateLimitWindows = new Map<string, { count: number; windowStart: Date }>();

// ============================================================================
// SECURITY GATE - MAIN ENFORCEMENT HOOK
// ============================================================================

/**
 * SecurityGate - The supreme authority enforcement layer
 *
 * All critical actions MUST call this before execution.
 * Returns immediately with a decision.
 *
 * Usage:
 * ```
 * const decision = await SecurityGate.assertAllowed({
 *   actor: { userId: '123', roles: ['editor'] },
 *   action: 'content_publish',
 *   resource: 'content',
 *   context: { contentId: 'abc' }
 * });
 *
 * if (!decision.allowed) {
 *   throw new SecurityGateError(decision);
 * }
 * ```
 */
export const SecurityGate = {
  /**
   * Assert that an action is allowed
   * This is the primary enforcement method
   */
  async assertAllowed(request: GateRequest): Promise<GateDecision> {
    const startTime = Date.now();
    const auditId = uuidv4();

    // Feature flag check - if disabled, allow everything (with warning)
    if (!DEFAULT_SECURITY_AUTHORITY_CONFIG.enabled) {
      return createAllowDecision(auditId, "Security authority disabled");
    }

    try {
      // Evaluate the request against all security layers
      const decision = await evaluateRequest(request, auditId);

      // Audit the decision
      await auditDecision(request, decision);

      // Log performance
      const duration = Date.now() - startTime;
      if (duration > 100) {
      }

      return decision;
    } catch (error) {
      // FAIL CLOSED - if evaluation fails, deny the action

      if (DEFAULT_SECURITY_AUTHORITY_CONFIG.failClosed) {
        return createDenyDecision(auditId, "Security evaluation failed - fail closed", "policy");
      }

      // Only allow if explicitly configured to fail open (not recommended)

      return createAllowDecision(auditId, "Evaluation failed - fail open mode");
    }
  },

  /**
   * Check if action would be allowed (dry run, no audit)
   */
  async wouldBeAllowed(request: GateRequest): Promise<boolean> {
    if (!DEFAULT_SECURITY_AUTHORITY_CONFIG.enabled) {
      return true;
    }

    try {
      const decision = await evaluateRequest(request, "dry-run");
      return decision.allowed;
    } catch {
      return !DEFAULT_SECURITY_AUTHORITY_CONFIG.failClosed;
    }
  },

  /**
   * Get current security mode
   */
  getMode(): SecurityModeConfig {
    return { ...currentSecurityMode };
  },

  /**
   * Set security mode
   */
  async setMode(
    mode: SecurityMode,
    reason: string,
    activatedBy: string,
    autoExpireMinutes?: number
  ): Promise<void> {
    const previousMode = currentSecurityMode.mode;

    currentSecurityMode = {
      mode,
      reason,
      activatedAt: new Date(),
      activatedBy,
      autoExpireAt: autoExpireMinutes
        ? new Date(Date.now() + autoExpireMinutes * 60 * 1000)
        : undefined,
      restrictions: MODE_RESTRICTIONS[mode],
    };

    // Audit mode change
    await logSecurityEvent({
      type: SecurityEventType.SETTINGS_CHANGED,
      severity: mode === "lockdown" ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH,
      userId: activatedBy,
      ipAddress: "system",
      resource: "security_mode",
      action: "mode_change",
      details: { previousMode, newMode: mode, reason },
      success: true,
    });

    // Notify adapters of mode change
    await notifyAdaptersOfModeChange(currentSecurityMode);
  },

  /**
   * Get current threat state
   */
  getThreatState(): ThreatState {
    return { ...currentThreatState };
  },

  /**
   * Escalate threat level
   */
  async escalateThreat(
    level: ThreatLevel,
    sources: ThreatState["sources"],
    reason: string
  ): Promise<void> {
    const previousLevel = currentThreatState.level;

    currentThreatState = {
      level,
      sources,
      activeSince: new Date(),
      autoDeescalateAt: new Date(Date.now() + 60 * 60 * 1000), // Auto-deescalate after 1 hour
    };

    // Auto-lockdown on critical threat
    if (level === "critical" && DEFAULT_SECURITY_AUTHORITY_CONFIG.autoLockdownOnCriticalThreat) {
      await this.setMode("lockdown", `Critical threat: ${reason}`, "system", 60);
    }

    // Notify adapters
    await notifyAdaptersOfThreatEscalation(currentThreatState);
  },

  /**
   * Deescalate threat level
   */
  async deescalateThreat(level: ThreatLevel, reason: string): Promise<void> {
    const previousLevel = currentThreatState.level;

    currentThreatState = {
      level,
      sources: currentThreatState.sources.filter(
        s => s.severity === SecuritySeverity.CRITICAL || s.severity === SecuritySeverity.HIGH
      ),
      activeSince: new Date(),
    };
  },

  /**
   * Register an override
   */
  registerOverride(targetKey: string, overrideId: string, expiresAt: Date): void {
    // Enforce cache bounds
    if (overrideCache.size >= MAX_OVERRIDE_CACHE) {
      const oldestKey = overrideCache.keys().next().value;
      if (oldestKey) overrideCache.delete(oldestKey);
    }

    overrideCache.set(targetKey, { expires: expiresAt, overrideId });
  },

  /**
   * Check if override exists
   */
  hasOverride(targetKey: string): { valid: boolean; overrideId?: string } {
    const override = overrideCache.get(targetKey);
    if (!override) return { valid: false };

    if (override.expires < new Date()) {
      overrideCache.delete(targetKey);
      return { valid: false };
    }

    return { valid: true, overrideId: override.overrideId };
  },

  /**
   * Revoke an override
   */
  revokeOverride(targetKey: string): boolean {
    return overrideCache.delete(targetKey);
  },

  /**
   * Get audit buffer (for flushing to DB)
   */
  getAuditBuffer(): typeof auditBuffer {
    return [...auditBuffer];
  },

  /**
   * Clear audit buffer (after successful flush)
   */
  clearAuditBuffer(): void {
    auditBuffer.length = 0;
  },

  /**
   * Get statistics
   */
  getStats(): {
    mode: SecurityMode;
    threatLevel: ThreatLevel;
    activeOverrides: number;
    pendingAudits: number;
    rateLimitedActors: number;
  } {
    return {
      mode: currentSecurityMode.mode,
      threatLevel: currentThreatState.level,
      activeOverrides: overrideCache.size,
      pendingAudits: auditBuffer.length,
      rateLimitedActors: rateLimitWindows.size,
    };
  },
};

// ============================================================================
// EVALUATION LOGIC
// ============================================================================

async function evaluateRequest(request: GateRequest, auditId: string): Promise<GateDecision> {
  const reasons: GateReason[] = [];

  // 1. Check security mode restrictions
  const modeResult = evaluateSecurityMode(request);
  if (!modeResult.allowed) {
    return createDenyDecision(auditId, modeResult.reason, "mode", modeResult.severity);
  }
  if (modeResult.warning) {
    reasons.push({
      code: "MODE_WARNING",
      message: modeResult.warning,
      source: "mode",
      severity: SecuritySeverity.MEDIUM,
    });
  }

  // 2. Check threat level restrictions
  const threatResult = evaluateThreatLevel(request);
  if (!threatResult.allowed) {
    return createDenyDecision(auditId, threatResult.reason, "threat", threatResult.severity);
  }

  // 3. Check for active override
  const overrideKey = buildOverrideKey(request);
  const override = SecurityGate.hasOverride(overrideKey);
  if (override.valid) {
    reasons.push({
      code: "OVERRIDE_ACTIVE",
      message: `Override ${override.overrideId} in effect`,
      source: "override",
      severity: SecuritySeverity.MEDIUM,
    });
    return createAllowDecision(auditId, "Override active", reasons);
  }

  // 4. Check action-specific policies
  const policyResult = evaluateActionPolicies(request);
  if (!policyResult.allowed) {
    if (policyResult.requireApproval) {
      return createApprovalRequiredDecision(
        auditId,
        policyResult.reason,
        policyResult.approverRole
      );
    }
    return createDenyDecision(auditId, policyResult.reason, "policy", policyResult.severity);
  }

  // 5. Check rate limits
  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    return createRateLimitedDecision(auditId, rateLimitResult.retryAfterMs);
  }

  // 6. All checks passed
  return createAllowDecision(auditId, "All security checks passed", reasons);
}

function evaluateSecurityMode(request: GateRequest): {
  allowed: boolean;
  reason: string;
  warning?: string;
  severity?: SecuritySeverity;
} {
  const { restrictions } = currentSecurityMode;

  // Check autopilot actions
  if (request.actor.isAutopilot && !restrictions.autopilotAllowed) {
    return {
      allowed: false,
      reason: `Autopilot actions blocked in ${currentSecurityMode.mode} mode`,
      severity: SecuritySeverity.HIGH,
    };
  }

  // Check destructive actions
  const destructiveActions: GatedAction[] = ["data_delete", "content_delete", "user_management"];
  if (destructiveActions.includes(request.action) && !restrictions.destructiveActionsAllowed) {
    return {
      allowed: false,
      reason: `Destructive actions require approval in ${currentSecurityMode.mode} mode`,
      severity: SecuritySeverity.HIGH,
    };
  }

  // Check bulk operations
  if (request.action === "bulk_operation" && !restrictions.bulkOperationsAllowed) {
    return {
      allowed: false,
      reason: `Bulk operations blocked in ${currentSecurityMode.mode} mode`,
      severity: SecuritySeverity.HIGH,
    };
  }

  // Check deployments
  if (
    (request.action === "deployment" || request.action === "cutover") &&
    !restrictions.deploymentAllowed
  ) {
    return {
      allowed: false,
      reason: `Deployments blocked in ${currentSecurityMode.mode} mode`,
      severity: SecuritySeverity.CRITICAL,
    };
  }

  // Check external API calls
  if (request.action === "external_api_call" && !restrictions.externalApiCallsAllowed) {
    return {
      allowed: false,
      reason: `External API calls blocked in ${currentSecurityMode.mode} mode`,
      severity: SecuritySeverity.MEDIUM,
    };
  }

  // Warning for enforce mode
  if (currentSecurityMode.mode === "enforce" && isHighImpactAction(request)) {
    return {
      allowed: true,
      reason: "Allowed with enhanced monitoring",
      warning: `High-impact action ${request.action} logged for review`,
    };
  }

  return { allowed: true, reason: "Mode check passed" };
}

function evaluateThreatLevel(request: GateRequest): {
  allowed: boolean;
  reason: string;
  severity?: SecuritySeverity;
} {
  const { level } = currentThreatState;

  // Critical threat - block all non-essential actions
  if (level === "critical") {
    const essentialActions: GatedAction[] = ["data_read"];
    if (!essentialActions.includes(request.action)) {
      return {
        allowed: false,
        reason: "System under critical threat - only essential read operations allowed",
        severity: SecuritySeverity.CRITICAL,
      };
    }
  }

  // High threat - block high-impact actions
  if (level === "high") {
    if (isHighImpactAction(request) || request.actor.isAutopilot) {
      return {
        allowed: false,
        reason: "System under high threat - high-impact and autopilot actions blocked",
        severity: SecuritySeverity.HIGH,
      };
    }
  }

  // Elevated threat - block autopilot only
  if (level === "elevated") {
    if (request.actor.isAutopilot) {
      return {
        allowed: false,
        reason: "System under elevated threat - autopilot actions suspended",
        severity: SecuritySeverity.MEDIUM,
      };
    }
  }

  return { allowed: true, reason: "Threat check passed" };
}

function evaluateActionPolicies(request: GateRequest): {
  allowed: boolean;
  reason: string;
  requireApproval?: boolean;
  approverRole?: string;
  severity?: SecuritySeverity;
} {
  // Admin actions require super_admin or admin role
  if (request.action === "admin_action") {
    const hasAdminRole = request.actor.roles?.some(r => r === "super_admin" || r === "admin");
    if (!hasAdminRole) {
      return {
        allowed: false,
        reason: "Admin actions require admin or super_admin role",
        severity: SecuritySeverity.HIGH,
      };
    }
  }

  // User management requires approval in enforce mode
  if (request.action === "user_management" && currentSecurityMode.mode === "enforce") {
    return {
      allowed: false,
      reason: "User management requires approval",
      requireApproval: true,
      approverRole: "super_admin",
    };
  }

  // Bulk operations with high record counts require approval
  if (request.action === "bulk_operation" && (request.context.affectedRecordCount || 0) > 100) {
    return {
      allowed: false,
      reason: `Bulk operation affects ${request.context.affectedRecordCount} records - approval required`,
      requireApproval: true,
      approverRole: "admin",
    };
  }

  return { allowed: true, reason: "Policy check passed" };
}

function checkRateLimit(request: GateRequest): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  const rateLimitKey = `${request.actor.userId || request.actor.ipAddress}:${request.action}`;
  const now = new Date();
  const windowMs = 60 * 1000; // 1 minute window

  const window = rateLimitWindows.get(rateLimitKey);

  if (!window || now.getTime() - window.windowStart.getTime() > windowMs) {
    // New window
    rateLimitWindows.set(rateLimitKey, { count: 1, windowStart: now });
    return { allowed: true };
  }

  // Check limits per action type
  const limits: Record<GatedAction, number> = {
    data_read: 1000,
    data_write: 100,
    data_delete: 20,
    data_export: 5,
    content_create: 50,
    content_update: 100,
    content_delete: 20,
    content_publish: 30,
    seo_autopilot: 100,
    data_autopilot: 100,
    ops_autopilot: 50,
    bulk_operation: 5,
    deployment: 3,
    cutover: 1,
    user_management: 20,
    role_management: 10,
    settings_change: 10,
    external_api_call: 200,
    ai_generation: 50,
    translation: 100,
    media_upload: 50,
    admin_action: 30,
  };

  const limit = limits[request.action] || 100;

  if (window.count >= limit) {
    const retryAfterMs = windowMs - (now.getTime() - window.windowStart.getTime());
    return { allowed: false, retryAfterMs };
  }

  window.count++;
  return { allowed: true };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isHighImpactAction(request: GateRequest): boolean {
  const highImpactActions: GatedAction[] = [
    "data_delete",
    "content_delete",
    "bulk_operation",
    "deployment",
    "cutover",
    "user_management",
    "role_management",
    "settings_change",
  ];

  return (
    highImpactActions.includes(request.action) ||
    request.context.estimatedImpact === "high" ||
    request.context.estimatedImpact === "critical"
  );
}

function buildOverrideKey(request: GateRequest): string {
  return `${request.actor.userId || "anon"}:${request.action}:${request.resource}:${request.resourceId || "*"}`;
}

function createAllowDecision(
  auditId: string,
  reason: string,
  additionalReasons?: GateReason[]
): GateDecision {
  return {
    allowed: true,
    decision: "ALLOW",
    reasons: additionalReasons || [
      {
        code: "ALLOWED",
        message: reason,
        source: "policy",
        severity: SecuritySeverity.LOW,
      },
    ],
    auditId,
    evaluatedAt: new Date(),
    securityMode: currentSecurityMode.mode,
    threatLevel: currentThreatState.level,
  };
}

function createDenyDecision(
  auditId: string,
  reason: string,
  source: GateReason["source"],
  severity: SecuritySeverity = SecuritySeverity.MEDIUM
): GateDecision {
  return {
    allowed: false,
    decision: "DENY",
    reasons: [
      {
        code: "DENIED",
        message: reason,
        source,
        severity,
      },
    ],
    auditId,
    evaluatedAt: new Date(),
    securityMode: currentSecurityMode.mode,
    threatLevel: currentThreatState.level,
  };
}

function createApprovalRequiredDecision(
  auditId: string,
  reason: string,
  approverRole?: string
): GateDecision {
  return {
    allowed: false,
    decision: "REQUIRE_APPROVAL",
    reasons: [
      {
        code: "APPROVAL_REQUIRED",
        message: reason,
        source: "policy",
        severity: SecuritySeverity.MEDIUM,
      },
    ],
    requiredApprovals: [
      {
        approverRole: approverRole || "admin",
        minApprovers: 1,
        expiresAfterMs: 24 * 60 * 60 * 1000, // 24 hours
        reason,
      },
    ],
    auditId,
    evaluatedAt: new Date(),
    securityMode: currentSecurityMode.mode,
    threatLevel: currentThreatState.level,
  };
}

function createRateLimitedDecision(auditId: string, retryAfterMs: number): GateDecision {
  return {
    allowed: false,
    decision: "RATE_LIMITED",
    reasons: [
      {
        code: "RATE_LIMITED",
        message: `Rate limit exceeded. Retry after ${Math.ceil(retryAfterMs / 1000)} seconds`,
        source: "rate_limit",
        severity: SecuritySeverity.LOW,
      },
    ],
    retryAfterMs,
    auditId,
    evaluatedAt: new Date(),
    securityMode: currentSecurityMode.mode,
    threatLevel: currentThreatState.level,
  };
}

async function auditDecision(request: GateRequest, decision: GateDecision): Promise<void> {
  if (!DEFAULT_SECURITY_AUTHORITY_CONFIG.auditAllDecisions && decision.allowed) {
    return; // Skip auditing allowed decisions if configured
  }

  // Add to buffer
  if (auditBuffer.length >= MAX_AUDIT_BUFFER) {
    auditBuffer.shift(); // Remove oldest
  }

  auditBuffer.push({
    auditId: decision.auditId,
    request,
    decision,
    timestamp: new Date(),
  });

  // Log denied decisions
  if (!decision.allowed) {
    await logSecurityEvent({
      type: SecurityEventType.PERMISSION_DENIED,
      severity: decision.reasons[0]?.severity || SecuritySeverity.MEDIUM,
      userId: request.actor.userId,
      userName: request.actor.userName,
      ipAddress: request.actor.ipAddress || "unknown",
      userAgent: request.actor.userAgent,
      resource: request.resource,
      action: request.action,
      details: {
        decision: decision.decision,
        reasons: decision.reasons,
        securityMode: decision.securityMode,
        threatLevel: decision.threatLevel,
      },
      success: false,
      errorMessage: decision.reasons[0]?.message,
    });
  }
}

// ============================================================================
// ADAPTER NOTIFICATIONS (stubbed - implemented in adapters/)
// ============================================================================

async function notifyAdaptersOfModeChange(_config: SecurityModeConfig): Promise<void> {
  // Will be implemented in adapters module
}

async function notifyAdaptersOfThreatEscalation(_threat: ThreatState): Promise<void> {
  // Will be implemented in adapters module
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class SecurityGateError extends Error {
  public readonly code = "SECURITY_GATE_DENIED";
  public readonly decision: GateDecision;

  constructor(decision: GateDecision) {
    super(`Security gate denied: ${decision.reasons[0]?.message || "Unknown reason"}`);
    this.name = "SecurityGateError";
    this.decision = decision;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      decision: this.decision,
    };
  }
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

import type { Request, Response, NextFunction } from "express";

/**
 * Middleware to enforce security gate on routes
 */
export function requireSecurityGate(action: GatedAction, resource: ResourceType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    const request: GateRequest = {
      actor: {
        userId: user?.claims?.sub,
        userName: user?.claims?.name,
        userEmail: user?.claims?.email,
        roles: user?.roles || ["viewer"],
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get("User-Agent"),
        sessionId: (req as any).sessionID,
        isSystem: false,
        isAutopilot: false,
      },
      action,
      resource,
      resourceId: req.params.id,
      context: {
        requestPath: req.path,
        requestMethod: req.method,
        entityId: req.params.entityId,
        contentId: req.params.contentId,
        locale: req.query.locale as string,
        metadata: req.body,
      },
    };

    const decision = await SecurityGate.assertAllowed(request);

    if (!decision.allowed) {
      return res.status(decision.decision === "RATE_LIMITED" ? 429 : 403).json({
        error: "Security gate denied",
        code: decision.decision,
        message: decision.reasons[0]?.message,
        retryAfter: decision.retryAfterMs ? Math.ceil(decision.retryAfterMs / 1000) : undefined,
        auditId: decision.auditId,
      });
    }

    // Attach decision to request for downstream use
    (req as any).securityDecision = decision;
    next();
  };
}
