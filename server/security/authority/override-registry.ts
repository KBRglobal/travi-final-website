/**
 * Override Registry - Centralized Override Protocol
 *
 * Controls who can override security blocks:
 * - What can be overridden
 * - For how long
 * - With mandatory justification + evidence
 *
 * All overrides:
 * - Expire automatically
 * - Are fully auditable
 * - Trigger alerts
 *
 * Feature flag: ENABLE_SECURITY_AUTHORITY
 */

import { v4 as uuidv4 } from "uuid";
import {
  SecurityOverride,
  OverrideRequest,
  OverrideType,
  OverrideTarget,
  GatedAction,
  ResourceType,
  DEFAULT_SECURITY_AUTHORITY_CONFIG,
} from "./types";
import { SecurityGate } from "./security-gate";
import { SecuritySeverity, logSecurityEvent, SecurityEventType } from "../audit-logger";

// ============================================================================
// OVERRIDE STORAGE
// ============================================================================

// In-memory storage (would be DB in production)
const overrides = new Map<string, SecurityOverride>();

// Override policies - who can create overrides
interface OverridePolicy {
  overrideType: OverrideType;
  allowedRoles: string[];
  maxDurationMinutes: number;
  requiresEvidence: boolean;
  requiresSecondApprover: boolean;
  notifyRoles: string[];
}

const OVERRIDE_POLICIES: OverridePolicy[] = [
  {
    overrideType: "action_bypass",
    allowedRoles: ["super_admin", "admin"],
    maxDurationMinutes: 60 * 24, // 24 hours
    requiresEvidence: true,
    requiresSecondApprover: false,
    notifyRoles: ["super_admin"],
  },
  {
    overrideType: "mode_bypass",
    allowedRoles: ["super_admin"],
    maxDurationMinutes: 60 * 4, // 4 hours
    requiresEvidence: true,
    requiresSecondApprover: true,
    notifyRoles: ["super_admin", "admin"],
  },
  {
    overrideType: "threat_bypass",
    allowedRoles: ["super_admin"],
    maxDurationMinutes: 60, // 1 hour
    requiresEvidence: true,
    requiresSecondApprover: true,
    notifyRoles: ["super_admin", "admin", "ops"],
  },
  {
    overrideType: "rate_limit_bypass",
    allowedRoles: ["super_admin", "admin", "ops"],
    maxDurationMinutes: 60 * 2, // 2 hours
    requiresEvidence: false,
    requiresSecondApprover: false,
    notifyRoles: ["admin"],
  },
  {
    overrideType: "approval_bypass",
    allowedRoles: ["super_admin"],
    maxDurationMinutes: 60 * 8, // 8 hours
    requiresEvidence: true,
    requiresSecondApprover: false,
    notifyRoles: ["super_admin", "admin"],
  },
];

// Override alerts queue
interface OverrideAlert {
  id: string;
  overrideId: string;
  type: "created" | "used" | "expired" | "revoked";
  message: string;
  notifyRoles: string[];
  createdAt: Date;
  acknowledged: boolean;
}

const MAX_ALERTS = 500;
const alerts: OverrideAlert[] = [];

// ============================================================================
// OVERRIDE REGISTRY
// ============================================================================

export const OverrideRegistry = {
  /**
   * Request a new override
   */
  async requestOverride(params: {
    request: OverrideRequest;
    requestedBy: string;
    requestedByRoles: string[];
    ipAddress?: string;
  }): Promise<{
    success: boolean;
    override?: SecurityOverride;
    error?: string;
    requiresSecondApprover?: boolean;
  }> {
    const { request, requestedBy, requestedByRoles, ipAddress } = params;

    // Find applicable policy
    const policy = OVERRIDE_POLICIES.find(p => p.overrideType === request.type);
    if (!policy) {
      return { success: false, error: "Unknown override type" };
    }

    // Check if user has required role
    const hasRole = requestedByRoles.some(r => policy.allowedRoles.includes(r));
    if (!hasRole) {
      await logSecurityEvent({
        type: SecurityEventType.PERMISSION_DENIED,
        severity: SecuritySeverity.HIGH,
        userId: requestedBy,
        ipAddress: ipAddress || "unknown",
        resource: "override",
        action: "request_override",
        details: {
          overrideType: request.type,
          requiredRoles: policy.allowedRoles,
          userRoles: requestedByRoles,
        },
        success: false,
        errorMessage: "Insufficient permissions for override",
      });

      return {
        success: false,
        error: `Override type ${request.type} requires one of: ${policy.allowedRoles.join(", ")}`,
      };
    }

    // Check if evidence is required
    if (policy.requiresEvidence && (!request.evidence || request.evidence.length === 0)) {
      return { success: false, error: "Evidence is required for this override type" };
    }

    // Check duration limits
    const maxDurationHours = DEFAULT_SECURITY_AUTHORITY_CONFIG.maxOverrideDurationHours;
    const maxMinutes = Math.min(
      request.durationMinutes,
      policy.maxDurationMinutes,
      maxDurationHours * 60
    );

    // Check if second approver required
    if (policy.requiresSecondApprover) {
      return {
        success: false,
        requiresSecondApprover: true,
        error: "This override type requires a second approver",
      };
    }

    // Create the override
    const override = await this.createOverride({
      request: { ...request, durationMinutes: maxMinutes },
      grantedBy: requestedBy,
      grantedTo: requestedBy,
    });

    // Create alert
    await this.createAlert({
      overrideId: override.id,
      type: "created",
      message: `Override created: ${request.type} by ${requestedBy} - ${request.reason}`,
      notifyRoles: policy.notifyRoles,
    });

    return { success: true, override };
  },

  /**
   * Create an override (internal)
   */
  async createOverride(params: {
    request: OverrideRequest;
    grantedBy: string;
    grantedTo: string;
  }): Promise<SecurityOverride> {
    const { request, grantedBy, grantedTo } = params;

    const id = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + request.durationMinutes * 60 * 1000);

    const override: SecurityOverride = {
      id,
      type: request.type,
      target: request.target,
      grantedTo,
      grantedBy,
      reason: request.reason,
      justification: request.justification,
      evidence: request.evidence,
      createdAt: now,
      expiresAt,
      usedCount: 0,
      maxUses: request.maxUses,
      active: true,
    };

    overrides.set(id, override);

    // Register with SecurityGate
    const targetKey = this.buildTargetKey(override);
    SecurityGate.registerOverride(targetKey, id, expiresAt);

    // Audit log
    await logSecurityEvent({
      type: SecurityEventType.SETTINGS_CHANGED,
      severity: SecuritySeverity.HIGH,
      userId: grantedBy,
      ipAddress: "system",
      resource: "override",
      action: "create_override",
      details: {
        overrideId: id,
        type: request.type,
        target: request.target,
        expiresAt,
        maxUses: request.maxUses,
      },
      success: true,
    });

    return override;
  },

  /**
   * Use an override
   */
  async useOverride(
    overrideId: string,
    usedBy: string,
    context?: Record<string, unknown>
  ): Promise<{
    valid: boolean;
    error?: string;
  }> {
    const override = overrides.get(overrideId);

    if (!override) {
      return { valid: false, error: "Override not found" };
    }

    if (!override.active) {
      return { valid: false, error: "Override is not active" };
    }

    if (override.expiresAt <= new Date()) {
      override.active = false;
      return { valid: false, error: "Override has expired" };
    }

    if (override.maxUses && override.usedCount >= override.maxUses) {
      override.active = false;
      return { valid: false, error: "Override has reached max uses" };
    }

    // Increment usage
    override.usedCount++;

    // Check if max uses reached
    if (override.maxUses && override.usedCount >= override.maxUses) {
      override.active = false;
    }

    // Audit log
    await logSecurityEvent({
      type: SecurityEventType.SETTINGS_CHANGED,
      severity: SecuritySeverity.MEDIUM,
      userId: usedBy,
      ipAddress: "system",
      resource: "override",
      action: "use_override",
      details: {
        overrideId,
        usedCount: override.usedCount,
        maxUses: override.maxUses,
        context,
      },
      success: true,
    });

    return { valid: true };
  },

  /**
   * Revoke an override
   */
  async revokeOverride(params: {
    overrideId: string;
    revokedBy: string;
    reason: string;
    ipAddress?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { overrideId, revokedBy, reason, ipAddress } = params;

    const override = overrides.get(overrideId);
    if (!override) {
      return { success: false, error: "Override not found" };
    }

    if (!override.active) {
      return { success: false, error: "Override is already inactive" };
    }

    // Revoke
    override.active = false;
    override.revokedAt = new Date();
    override.revokedBy = revokedBy;
    override.revokedReason = reason;

    // Remove from SecurityGate
    const targetKey = this.buildTargetKey(override);
    SecurityGate.revokeOverride(targetKey);

    // Audit log
    await logSecurityEvent({
      type: SecurityEventType.SETTINGS_CHANGED,
      severity: SecuritySeverity.HIGH,
      userId: revokedBy,
      ipAddress: ipAddress || "system",
      resource: "override",
      action: "revoke_override",
      details: {
        overrideId,
        reason,
        usedCount: override.usedCount,
      },
      success: true,
    });

    // Create alert
    await this.createAlert({
      overrideId,
      type: "revoked",
      message: `Override revoked: ${overrideId} by ${revokedBy} - ${reason}`,
      notifyRoles: ["super_admin", "admin"],
    });

    return { success: true };
  },

  /**
   * Get an override by ID
   */
  getOverride(overrideId: string): SecurityOverride | undefined {
    return overrides.get(overrideId);
  },

  /**
   * Get all active overrides
   */
  getActiveOverrides(): SecurityOverride[] {
    const now = new Date();
    return Array.from(overrides.values()).filter(o => o.active && o.expiresAt > now);
  },

  /**
   * Get overrides by user
   */
  getOverridesByUser(userId: string): SecurityOverride[] {
    return Array.from(overrides.values()).filter(
      o => o.grantedTo === userId || o.grantedBy === userId
    );
  },

  /**
   * Get override statistics
   */
  getStats(): {
    totalOverrides: number;
    activeOverrides: number;
    expiredOverrides: number;
    revokedOverrides: number;
    totalUsage: number;
    byType: Record<OverrideType, number>;
  } {
    const all = Array.from(overrides.values());
    const now = new Date();

    const stats = {
      totalOverrides: all.length,
      activeOverrides: 0,
      expiredOverrides: 0,
      revokedOverrides: 0,
      totalUsage: 0,
      byType: {} as Record<OverrideType, number>,
    };

    all.forEach(o => {
      if (o.revokedAt) {
        stats.revokedOverrides++;
      } else if (o.expiresAt <= now) {
        stats.expiredOverrides++;
      } else if (o.active) {
        stats.activeOverrides++;
      }

      stats.totalUsage += o.usedCount;
      stats.byType[o.type] = (stats.byType[o.type] || 0) + 1;
    });

    return stats;
  },

  /**
   * Check for expired overrides and clean up
   */
  cleanupExpired(): number {
    const now = new Date();
    let cleaned = 0;

    overrides.forEach((override, id) => {
      if (override.active && override.expiresAt <= now) {
        override.active = false;

        // Remove from SecurityGate
        const targetKey = this.buildTargetKey(override);
        SecurityGate.revokeOverride(targetKey);

        // Create alert
        this.createAlert({
          overrideId: id,
          type: "expired",
          message: `Override expired: ${id} (${override.type})`,
          notifyRoles: ["admin"],
        });

        cleaned++;
      }
    });

    if (cleaned > 0) {
    }

    return cleaned;
  },

  /**
   * Build target key for SecurityGate
   */
  buildTargetKey(override: SecurityOverride): string {
    const { target } = override;
    const action = target.action || "*";
    const resource = target.resource || "*";
    const resourceId = target.resourceId || "*";

    return `${override.grantedTo}:${action}:${resource}:${resourceId}`;
  },

  /**
   * Create an alert
   */
  async createAlert(params: {
    overrideId: string;
    type: OverrideAlert["type"];
    message: string;
    notifyRoles: string[];
  }): Promise<void> {
    if (alerts.length >= MAX_ALERTS) {
      alerts.shift();
    }

    alerts.push({
      id: uuidv4(),
      overrideId: params.overrideId,
      type: params.type,
      message: params.message,
      notifyRoles: params.notifyRoles,
      createdAt: new Date(),
      acknowledged: false,
    });
  },

  /**
   * Get unacknowledged alerts
   */
  getAlerts(roleFilter?: string[]): OverrideAlert[] {
    let filtered = alerts.filter(a => !a.acknowledged);

    if (roleFilter) {
      filtered = filtered.filter(a => a.notifyRoles.some(r => roleFilter.includes(r)));
    }

    return filtered;
  },

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  },

  /**
   * Get override policies
   */
  getPolicies(): OverridePolicy[] {
    return [...OVERRIDE_POLICIES];
  },
};

// ============================================================================
// PERIODIC CLEANUP
// ============================================================================

// Clean up expired overrides every 5 minutes - only when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== "true" && process.env.REPLIT_DEPLOYMENT !== "1") {
  setInterval(
    () => {
      if (DEFAULT_SECURITY_AUTHORITY_CONFIG.enabled) {
        OverrideRegistry.cleanupExpired();
      }
    },
    5 * 60 * 1000
  );
}
