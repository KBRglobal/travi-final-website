/**
 * Centralized Override Registry
 *
 * Controls who can override security blocks and under what conditions.
 * All overrides are:
 * - Time-limited (auto-expire)
 * - Fully auditable
 * - Require justification
 * - Trigger alerts
 *
 * NO SILENT OVERRIDE EXISTS ANYWHERE.
 */

import * as crypto from "node:crypto";
import { Router } from "express";
import { ROLE_HIERARCHY } from "../../governance/types";
import { logAdminEvent } from "../../governance/security-logger";
import { processSecurityEvent } from "../intelligence/security-intelligence";
import { generateEvidence } from "../compliance/evidence-generator";
import { getSecurityMode } from "../modes/security-modes";
import { getThreatLevel } from "../core/security-kernel";

// ============================================================================
// TYPES
// ============================================================================

export interface Override {
  id: string;
  type: OverrideType;
  scope: OverrideScope;
  grantedTo: {
    userId: string;
    role: string;
  };
  grantedBy: {
    userId: string;
    role: string;
  };
  justification: string;
  ticketReference: string;
  evidence?: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date;
  usedCount: number;
  maxUses: number;
  status: "active" | "used" | "expired" | "revoked";
  metadata?: Record<string, unknown>;
}

export type OverrideType =
  | "security_gate"
  | "mode_restriction"
  | "rbac_permission"
  | "exfiltration_limit"
  | "approval_bypass"
  | "lockdown_access";

export interface OverrideScope {
  actions?: string[];
  resources?: string[];
  resourceIds?: string[];
  conditions?: Record<string, unknown>;
}

export interface OverrideRequest {
  type: OverrideType;
  scope: OverrideScope;
  granteeUserId: string;
  granteeRole: string;
  justification: string;
  ticketReference: string; // Required: JIRA, ServiceNow, etc.
  evidence?: string;
  durationMinutes: number;
  maxUses?: number;
}

export interface OverrideResponse {
  success: boolean;
  override?: Override;
  error?: OverrideError;
}

export interface OverrideError {
  code: OverrideErrorCode;
  message: string;
  details: string;
  suggestion?: string;
}

export type OverrideErrorCode =
  | "SELF_APPROVAL"
  | "INSUFFICIENT_ROLE"
  | "MODE_RESTRICTED"
  | "THREAT_LEVEL_BLOCKED"
  | "DURATION_EXCEEDED"
  | "MISSING_JUSTIFICATION"
  | "MISSING_TICKET"
  | "INVALID_TICKET_FORMAT"
  | "ROLE_ESCALATION"
  | "ALREADY_EXISTS";

export interface OverrideValidation {
  valid: boolean;
  override?: Override;
  reason?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Who can grant overrides
const OVERRIDE_GRANTERS: Record<OverrideType, string[]> = {
  security_gate: ["super_admin"],
  mode_restriction: ["super_admin", "system_admin"],
  rbac_permission: ["super_admin", "system_admin"],
  exfiltration_limit: ["super_admin"],
  approval_bypass: ["super_admin", "system_admin", "manager"],
  lockdown_access: ["super_admin"],
};

// What can be overridden in each mode
const OVERRIDABLE_IN_MODE: Record<string, OverrideType[]> = {
  monitor: [
    "security_gate",
    "mode_restriction",
    "rbac_permission",
    "exfiltration_limit",
    "approval_bypass",
  ],
  enforce: ["mode_restriction", "approval_bypass", "exfiltration_limit"],
  lockdown: ["lockdown_access"], // Very limited
};

// Maximum override durations (minutes)
const MAX_DURATIONS: Record<OverrideType, number> = {
  security_gate: 60,
  mode_restriction: 240,
  rbac_permission: 480,
  exfiltration_limit: 60,
  approval_bypass: 30,
  lockdown_access: 15,
};

// ============================================================================
// OVERRIDE REGISTRY
// ============================================================================

class OverrideRegistry {
  private readonly overrides: Map<string, Override> = new Map();
  private readonly alertCallbacks: Set<(override: Override, event: string) => void> = new Set();

  /**
   * Validate override request and return error if invalid
   */
  private validateOverrideRequest(
    request: OverrideRequest,
    granterId: string,
    granterRole: string
  ): OverrideError | null {
    if (granterId === request.granteeUserId) {
      return {
        code: "SELF_APPROVAL",
        message: "Self-approval is not permitted",
        details: `User ${granterId} cannot grant an override to themselves. This is a security control to prevent abuse.`,
        suggestion: "Request another administrator to grant this override on your behalf.",
      };
    }

    const allowedGranters = OVERRIDE_GRANTERS[request.type];
    if (!allowedGranters.includes(granterRole)) {
      return {
        code: "INSUFFICIENT_ROLE",
        message: `Your role cannot grant ${request.type} overrides`,
        details: `Role '${granterRole}' is not authorized to grant '${request.type}' overrides. Allowed roles: ${allowedGranters.join(", ")}.`,
        suggestion: `Contact a ${allowedGranters[0]} to request this override.`,
      };
    }

    const mode = getSecurityMode();
    const allowedTypes = OVERRIDABLE_IN_MODE[mode] || [];
    if (!allowedTypes.includes(request.type)) {
      return {
        code: "MODE_RESTRICTED",
        message: `Override type not allowed in ${mode.toUpperCase()} mode`,
        details: `The '${request.type}' override cannot be granted while the system is in ${mode.toUpperCase()} mode. Allowed types in this mode: ${allowedTypes.join(", ") || "none"}.`,
        suggestion:
          mode === "lockdown"
            ? "Wait for security incident to be resolved."
            : "Request a different override type or wait for mode change.",
      };
    }

    if (getThreatLevel() === "black") {
      return {
        code: "THREAT_LEVEL_BLOCKED",
        message: "Overrides blocked during critical threat level",
        details: `The system is currently at BLACK threat level. All override requests are blocked until the threat is mitigated.`,
        suggestion: "Address the security threat first. Check /api/security/dashboard for details.",
      };
    }

    return null;
  }

  /**
   * Validate override request details (duration, justification, ticket, role)
   */
  private validateOverrideDetails(
    request: OverrideRequest,
    granterRole: string
  ): OverrideError | null {
    const maxDuration = MAX_DURATIONS[request.type];
    if (request.durationMinutes > maxDuration) {
      return {
        code: "DURATION_EXCEEDED",
        message: `Override duration exceeds maximum allowed`,
        details: `Requested ${request.durationMinutes} minutes, but maximum for '${request.type}' is ${maxDuration} minutes.`,
        suggestion: `Set durationMinutes to ${maxDuration} or less.`,
      };
    }

    if (!request.justification || request.justification.length < 20) {
      return {
        code: "MISSING_JUSTIFICATION",
        message: "Justification is required and must be detailed",
        details: `Justification must be at least 20 characters. Provided: ${request.justification?.length || 0} characters.`,
        suggestion: "Provide a clear business reason explaining why this override is needed.",
      };
    }

    if (!request.ticketReference || request.ticketReference.trim().length === 0) {
      return {
        code: "MISSING_TICKET",
        message: "Ticket reference is required for all overrides",
        details: `All security overrides must be linked to an approved change ticket (JIRA, ServiceNow, etc.).`,
        suggestion:
          "Create a change ticket and provide the reference (e.g., JIRA-1234, CHG0012345).",
      };
    }

    const ticketPattern = /^[A-Z]{2,10}[-_]?\d{3,10}$/i;
    if (!ticketPattern.test(request.ticketReference.trim())) {
      return {
        code: "INVALID_TICKET_FORMAT",
        message: "Invalid ticket reference format",
        details: `Ticket reference '${request.ticketReference}' does not match expected format.`,
        suggestion: "Use format like JIRA-1234, SEC-567, CHG0012345, or INC0098765.",
      };
    }

    const granterLevel = ROLE_HIERARCHY[granterRole as keyof typeof ROLE_HIERARCHY];
    const granteeLevel = ROLE_HIERARCHY[request.granteeRole as keyof typeof ROLE_HIERARCHY];
    if (granteeLevel > granterLevel) {
      return {
        code: "ROLE_ESCALATION",
        message: "Cannot grant override to a higher-privileged role",
        details: `Your role '${granterRole}' (level ${granterLevel}) cannot grant overrides to '${request.granteeRole}' (level ${granteeLevel}).`,
        suggestion: "Only users with equal or higher privilege can grant overrides.",
      };
    }

    return null;
  }

  /**
   * Request an override
   */
  async requestOverride(
    request: OverrideRequest,
    granterId: string,
    granterRole: string
  ): Promise<OverrideResponse> {
    const policyError = this.validateOverrideRequest(request, granterId, granterRole);
    if (policyError) return { success: false, error: policyError };

    const detailError = this.validateOverrideDetails(request, granterRole);
    if (detailError) return { success: false, error: detailError };

    // Create override
    const override: Override = {
      id: this.generateId(),
      type: request.type,
      scope: request.scope,
      grantedTo: { userId: request.granteeUserId, role: request.granteeRole },
      grantedBy: { userId: granterId, role: granterRole },
      justification: request.justification,
      ticketReference: request.ticketReference.trim().toUpperCase(),
      evidence: request.evidence,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + request.durationMinutes * 60 * 1000),
      usedCount: 0,
      maxUses: request.maxUses || 1,
      status: "active",
      metadata: {},
    };

    this.overrides.set(override.id, override);

    logAdminEvent(granterId, "OVERRIDE_GRANTED", request.type, override.id, {
      grantee: request.granteeUserId,
      scope: request.scope,
      duration: request.durationMinutes,
      justification: request.justification,
    });

    generateEvidence(
      "SOC2",
      "CC6.1",
      "access_log",
      {
        event: "override_granted",
        overrideId: override.id,
        type: request.type,
        grantedBy: granterId,
        grantedTo: request.granteeUserId,
        justification: request.justification,
        expiresAt: override.expiresAt.toISOString(),
      },
      new Date(),
      new Date()
    );

    this.triggerAlert(override, "created");
    return { success: true, override };
  }

  /**
   * Validate an override for use
   */
  validateOverride(
    overrideId: string,
    userId: string,
    action: string,
    resource: string
  ): OverrideValidation {
    const override = this.overrides.get(overrideId);

    if (!override) {
      return { valid: false, reason: "Override not found" };
    }

    // Check status
    if (override.status !== "active") {
      return { valid: false, reason: `Override is ${override.status}` };
    }

    // Check expiry
    if (new Date() > override.expiresAt) {
      override.status = "expired";
      this.triggerAlert(override, "expired");
      return { valid: false, reason: "Override has expired" };
    }

    // Check user
    if (override.grantedTo.userId !== userId) {
      return { valid: false, reason: "Override not granted to this user" };
    }

    // Check usage limit
    if (override.usedCount >= override.maxUses) {
      override.status = "used";
      return { valid: false, reason: "Override usage limit reached" };
    }

    // Check scope
    if (override.scope.actions && !override.scope.actions.includes(action)) {
      return { valid: false, reason: "Action not in override scope" };
    }

    if (override.scope.resources && !override.scope.resources.includes(resource)) {
      return { valid: false, reason: "Resource not in override scope" };
    }

    return { valid: true, override };
  }

  /**
   * Use an override (consumes a use)
   */
  useOverride(
    overrideId: string,
    userId: string,
    action: string,
    resource: string
  ): { success: boolean; error?: string } {
    const validation = this.validateOverride(overrideId, userId, action, resource);

    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    const override = validation.override!;
    override.usedCount++;
    override.usedAt = new Date();

    if (override.usedCount >= override.maxUses) {
      override.status = "used";
    }

    // Log usage
    logAdminEvent(userId, "OVERRIDE_USED", override.type, overrideId, {
      action,
      resource,
      usageCount: override.usedCount,
      maxUses: override.maxUses,
    });

    // Security event
    processSecurityEvent({
      id: `override_used_${Date.now()}`,
      type: "permission_override" as any,
      userId,
      resourceType: resource,
      metadata: {
        overrideId,
        action,
        usageCount: override.usedCount,
      },
    });

    // Trigger alert
    this.triggerAlert(override, "used");

    return { success: true };
  }

  /**
   * Revoke an override
   */
  revokeOverride(
    overrideId: string,
    revokerId: string,
    revokerRole: string,
    reason: string
  ): { success: boolean; error?: string } {
    const override = this.overrides.get(overrideId);

    if (!override) {
      return { success: false, error: "Override not found" };
    }

    if (override.status !== "active") {
      return { success: false, error: `Override is already ${override.status}` };
    }

    // Only granter or higher can revoke
    const revokerLevel = ROLE_HIERARCHY[revokerRole as keyof typeof ROLE_HIERARCHY];
    const granterLevel = ROLE_HIERARCHY[override.grantedBy.role as keyof typeof ROLE_HIERARCHY];

    if (revokerLevel < granterLevel && revokerId !== override.grantedBy.userId) {
      return { success: false, error: "Insufficient permissions to revoke" };
    }

    override.status = "revoked";

    logAdminEvent(revokerId, "OVERRIDE_REVOKED", override.type, overrideId, {
      reason,
      originalGranter: override.grantedBy.userId,
    });

    this.triggerAlert(override, "revoked");

    return { success: true };
  }

  /**
   * Get all active overrides
   */
  getActiveOverrides(): Override[] {
    this.cleanupExpired();
    return Array.from(this.overrides.values()).filter(o => o.status === "active");
  }

  /**
   * Get overrides for a user
   */
  getOverridesForUser(userId: string): Override[] {
    return Array.from(this.overrides.values()).filter(
      o => o.grantedTo.userId === userId && o.status === "active"
    );
  }

  /**
   * Get all overrides (for audit)
   */
  getAllOverrides(includeExpired: boolean = false): Override[] {
    if (!includeExpired) {
      return Array.from(this.overrides.values()).filter(o => o.status === "active");
    }
    return Array.from(this.overrides.values());
  }

  /**
   * Get override statistics
   */
  getStats(): {
    total: number;
    active: number;
    used: number;
    expired: number;
    revoked: number;
    byType: Record<OverrideType, number>;
  } {
    const overrides = Array.from(this.overrides.values());

    const byType: Record<OverrideType, number> = {
      security_gate: 0,
      mode_restriction: 0,
      rbac_permission: 0,
      exfiltration_limit: 0,
      approval_bypass: 0,
      lockdown_access: 0,
    };

    for (const o of overrides) {
      if (o.status === "active") {
        byType[o.type]++;
      }
    }

    return {
      total: overrides.length,
      active: overrides.filter(o => o.status === "active").length,
      used: overrides.filter(o => o.status === "used").length,
      expired: overrides.filter(o => o.status === "expired").length,
      revoked: overrides.filter(o => o.status === "revoked").length,
      byType,
    };
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (override: Override, event: string) => void): () => void {
    this.alertCallbacks.add(callback);
    return () => this.alertCallbacks.delete(callback);
  }

  /**
   * Cleanup expired overrides
   */
  private cleanupExpired(): void {
    const now = new Date();
    for (const [, override] of this.overrides) {
      if (override.status === "active" && override.expiresAt < now) {
        override.status = "expired";
        this.triggerAlert(override, "expired");
      }
    }
  }

  private triggerAlert(override: Override, event: string): void {
    for (const callback of this.alertCallbacks) {
      try {
        callback(override, event);
      } catch {
        void 0;
      }
    }

    // Always log to console
  }

  private generateId(): string {
    return `OVR-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const overrideRegistry = new OverrideRegistry();

// ============================================================================
// API ROUTES
// ============================================================================

export const overrideRouter = Router();

/**
 * Request an override
 */
overrideRouter.post("/request", async (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        details: "You must be logged in to request security overrides.",
        suggestion: "Log in and try again.",
      },
    });
  }

  const request: OverrideRequest = req.body;

  const result = await overrideRegistry.requestOverride(request, user.id, user.role);

  if (!result.success) {
    // Return human-readable error with appropriate status
    const errorCodeToStatus: Record<string, number> = {
      SELF_APPROVAL: 400,
      INSUFFICIENT_ROLE: 403,
      ROLE_ESCALATION: 403,
      MODE_RESTRICTED: 503,
      THREAT_LEVEL_BLOCKED: 503,
    };
    const statusCode = (result.error?.code && errorCodeToStatus[result.error.code]) || 400;

    return res.status(statusCode).json({
      success: false,
      error: result.error,
    });
  }

  res.json({
    success: true,
    override: result.override,
    message: `Override ${result.override?.id} granted successfully. Expires at ${result.override?.expiresAt.toISOString()}.`,
  });
});

/**
 * Validate an override
 */
overrideRouter.post("/validate", (req, res) => {
  const { overrideId, userId, action, resource } = req.body;

  const result = overrideRegistry.validateOverride(overrideId, userId, action, resource);

  res.json(result);
});

/**
 * Use an override
 */
overrideRouter.post("/use", (req, res) => {
  const { overrideId, action, resource } = req.body;
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const result = overrideRegistry.useOverride(overrideId, user.id, action, resource);

  if (!result.success) {
    return res.status(403).json({ error: result.error });
  }

  res.json({ success: true });
});

/**
 * Revoke an override
 */
overrideRouter.post("/:id/revoke", (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const result = overrideRegistry.revokeOverride(
    req.params.id,
    user.id,
    user.role,
    req.body.reason
  );

  if (!result.success) {
    return res.status(403).json({ error: result.error });
  }

  res.json({ success: true });
});

/**
 * Get active overrides
 */
overrideRouter.get("/active", (req, res) => {
  const overrides = overrideRegistry.getActiveOverrides();
  res.json(overrides);
});

/**
 * Get my overrides
 */
overrideRouter.get("/mine", (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const overrides = overrideRegistry.getOverridesForUser(user.id);
  res.json(overrides);
});

/**
 * Get statistics
 */
overrideRouter.get("/stats", (req, res) => {
  const stats = overrideRegistry.getStats();
  res.json(stats);
});

/**
 * Get all overrides (audit)
 */
overrideRouter.get("/audit", (req, res) => {
  const user = (req as any).user;
  if (!user || !["super_admin", "system_admin"].includes(user.role)) {
    return res.status(403).json({ error: "Audit access requires admin role" });
  }

  const includeExpired = req.query.includeExpired === "true";
  const overrides = overrideRegistry.getAllOverrides(includeExpired);
  res.json(overrides);
});
