/**
 * Security ↔ Autonomy Integration Controller
 *
 * Wires Security Modes to all autonomous systems:
 * - Data Autopilot
 * - SEO Autopilot
 * - Ops / Cutover systems
 *
 * Rules:
 * - LOCKDOWN → all autopilots forced OFF
 * - ENFORCE → destructive actions require approval
 * - MONITOR → advisory only
 */

import { Router } from "express";
import { getSecurityMode, getModeConfiguration, SecurityMode } from "../modes/security-modes";
import { getThreatLevel, ThreatLevel } from "../core/security-kernel";
import { assertAllowed, SecurityGateResult } from "../gate/security-gate";
import { logAdminEvent } from "../../governance/security-logger";
import { AdminRole } from "../../governance/types";

// ============================================================================
// TYPES
// ============================================================================

export type AutonomySystem =
  | "data_autopilot"
  | "seo_autopilot"
  | "ops_cutover"
  | "content_scheduler"
  | "bulk_processor"
  | "ai_generator";

export interface AutonomyState {
  system: AutonomySystem;
  enabled: boolean;
  forcedOff: boolean;
  forcedOffReason?: string;
  mode: "full" | "limited" | "approval_required" | "disabled";
  restrictions: AutonomyRestrictions;
  lastStateChange: Date;
}

export interface AutonomyRestrictions {
  allowDestructive: boolean;
  allowPublish: boolean;
  allowExport: boolean;
  allowBulk: boolean;
  requireApproval: boolean;
  maxBatchSize: number;
  cooldownMs: number;
}

export interface AutonomyImpact {
  securityMode: SecurityMode;
  threatLevel: ThreatLevel;
  systems: Record<AutonomySystem, AutonomyState>;
  warnings: string[];
  recommendations: string[];
}

// ============================================================================
// DEFAULT STATES BY SECURITY MODE
// ============================================================================

const AUTONOMY_BY_MODE: Record<SecurityMode, Partial<AutonomyRestrictions>> = {
  monitor: {
    allowDestructive: true,
    allowPublish: true,
    allowExport: true,
    allowBulk: true,
    requireApproval: false,
    maxBatchSize: 1000,
    cooldownMs: 0,
  },
  enforce: {
    allowDestructive: false, // Requires approval
    allowPublish: true,
    allowExport: false, // Requires approval
    allowBulk: true,
    requireApproval: true,
    maxBatchSize: 500,
    cooldownMs: 5000,
  },
  lockdown: {
    allowDestructive: false,
    allowPublish: false,
    allowExport: false,
    allowBulk: false,
    requireApproval: true,
    maxBatchSize: 0,
    cooldownMs: 60000,
  },
};

const AUTONOMY_BY_THREAT: Record<ThreatLevel, Partial<AutonomyRestrictions>> = {
  green: {},
  yellow: {
    maxBatchSize: 500,
    cooldownMs: 2000,
  },
  orange: {
    allowDestructive: false,
    allowBulk: false,
    maxBatchSize: 100,
    cooldownMs: 10000,
  },
  red: {
    allowDestructive: false,
    allowPublish: false,
    allowBulk: false,
    maxBatchSize: 10,
    cooldownMs: 30000,
  },
  black: {
    allowDestructive: false,
    allowPublish: false,
    allowExport: false,
    allowBulk: false,
    requireApproval: true,
    maxBatchSize: 0,
    cooldownMs: 60000,
  },
};

// ============================================================================
// AUTONOMY STATE MANAGER
// ============================================================================

class AutonomyController {
  private states: Map<AutonomySystem, AutonomyState> = new Map();
  private manualOverrides: Map<AutonomySystem, boolean> = new Map();
  private listeners: Set<(system: AutonomySystem, state: AutonomyState) => void> = new Set();

  constructor() {
    this.initializeStates();
  }

  private initializeStates(): void {
    const systems: AutonomySystem[] = [
      "data_autopilot",
      "seo_autopilot",
      "ops_cutover",
      "content_scheduler",
      "bulk_processor",
      "ai_generator",
    ];

    for (const system of systems) {
      this.states.set(system, this.computeState(system));
    }
  }

  /**
   * Compute current state for an autonomy system
   */
  private computeState(system: AutonomySystem): AutonomyState {
    const securityMode = getSecurityMode();
    const threatLevel = getThreatLevel();

    // Get base restrictions from security mode
    const modeRestrictions = { ...AUTONOMY_BY_MODE[securityMode] };

    // Apply threat level overrides (more restrictive wins)
    const threatRestrictions = AUTONOMY_BY_THREAT[threatLevel];
    for (const [key, value] of Object.entries(threatRestrictions)) {
      if (value !== undefined) {
        // For booleans, false (more restrictive) wins
        if (typeof value === "boolean") {
          if (!(modeRestrictions as any)[key] || !value) {
            (modeRestrictions as any)[key] = value;
          }
        }
        // For numbers, lower (more restrictive) wins
        else if (typeof value === "number") {
          const current = (modeRestrictions as any)[key] || Infinity;
          (modeRestrictions as any)[key] = Math.min(current, value);
        }
      }
    }

    const restrictions: AutonomyRestrictions = {
      allowDestructive: modeRestrictions.allowDestructive ?? false,
      allowPublish: modeRestrictions.allowPublish ?? false,
      allowExport: modeRestrictions.allowExport ?? false,
      allowBulk: modeRestrictions.allowBulk ?? false,
      requireApproval: modeRestrictions.requireApproval ?? true,
      maxBatchSize: modeRestrictions.maxBatchSize ?? 0,
      cooldownMs: modeRestrictions.cooldownMs ?? 0,
    };

    // Determine if system is forced off
    const forcedOff = securityMode === "lockdown" ||
      threatLevel === "black" ||
      threatLevel === "red";

    // Check for manual override
    const manualOverride = this.manualOverrides.get(system);
    const enabled = manualOverride ?? !forcedOff;

    // Determine operational mode
    let mode: AutonomyState["mode"] = "full";
    if (forcedOff || !enabled) {
      mode = "disabled";
    } else if (restrictions.requireApproval) {
      mode = "approval_required";
    } else if (!restrictions.allowDestructive || !restrictions.allowBulk) {
      mode = "limited";
    }

    return {
      system,
      enabled,
      forcedOff,
      forcedOffReason: forcedOff
        ? `Security mode: ${securityMode}, Threat level: ${threatLevel}`
        : undefined,
      mode,
      restrictions,
      lastStateChange: new Date(),
    };
  }

  /**
   * Get current state for a system
   */
  getState(system: AutonomySystem): AutonomyState {
    // Always recompute to reflect current security state
    const state = this.computeState(system);
    this.states.set(system, state);
    return state;
  }

  /**
   * Get all system states
   */
  getAllStates(): Record<AutonomySystem, AutonomyState> {
    const result: Record<AutonomySystem, AutonomyState> = {} as any;
    for (const [system] of this.states) {
      result[system] = this.getState(system);
    }
    return result;
  }

  /**
   * Check if an autonomous action is allowed
   */
  async checkAction(
    system: AutonomySystem,
    action: "destructive" | "publish" | "export" | "bulk" | "read",
    userId: string,
    role: AdminRole,
    context?: Record<string, unknown>
  ): Promise<{
    allowed: boolean;
    reason: string;
    requiresApproval: boolean;
    gateResult?: SecurityGateResult;
  }> {
    const state = this.getState(system);

    // System disabled = block all
    if (!state.enabled || state.forcedOff) {
      return {
        allowed: false,
        reason: state.forcedOffReason || `${system} is disabled`,
        requiresApproval: false,
      };
    }

    // Check specific action
    switch (action) {
      case "destructive":
        if (!state.restrictions.allowDestructive) {
          return {
            allowed: false,
            reason: "Destructive actions not allowed in current security mode",
            requiresApproval: state.restrictions.requireApproval,
          };
        }
        break;

      case "publish":
        if (!state.restrictions.allowPublish) {
          return {
            allowed: false,
            reason: "Publishing not allowed in current security mode",
            requiresApproval: state.restrictions.requireApproval,
          };
        }
        break;

      case "export":
        if (!state.restrictions.allowExport) {
          return {
            allowed: false,
            reason: "Export not allowed in current security mode",
            requiresApproval: state.restrictions.requireApproval,
          };
        }
        break;

      case "bulk":
        if (!state.restrictions.allowBulk) {
          return {
            allowed: false,
            reason: "Bulk operations not allowed in current security mode",
            requiresApproval: state.restrictions.requireApproval,
          };
        }
        break;
    }

    // Pass through Security Gate
    const gateResult = await assertAllowed({
      actor: { userId, role },
      action: `autonomy_${action}`,
      resource: system,
      context: {
        isAutomated: true,
        automationSource: system,
        metadata: context,
      },
    });

    return {
      allowed: gateResult.allowed,
      reason: gateResult.reason,
      requiresApproval: gateResult.requiresApproval,
      gateResult,
    };
  }

  /**
   * Manually enable/disable a system (requires super_admin)
   */
  async setManualOverride(
    system: AutonomySystem,
    enabled: boolean,
    userId: string,
    role: AdminRole,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    // Security Gate check FIRST
    const gateResult = await assertAllowed({
      actor: { userId, role },
      action: "autonomy_change",
      resource: "system",
      resourceId: system,
      context: {
        requiresApproval: true,
        metadata: { system, enabled, reason },
      },
    });

    if (!gateResult.allowed) {
      return {
        success: false,
        message: gateResult.reason,
      };
    }

    // Only super_admin can override
    if (role !== "super_admin") {
      return {
        success: false,
        message: "Only super_admin can manually override autonomy systems",
      };
    }

    // Cannot enable in lockdown
    const securityMode = getSecurityMode();
    if (enabled && securityMode === "lockdown") {
      return {
        success: false,
        message: "Cannot enable autonomy systems during lockdown",
      };
    }

    this.manualOverrides.set(system, enabled);

    logAdminEvent(userId, "AUTONOMY_OVERRIDE", system, system, {
      enabled,
      reason,
      securityMode,
    });

    // Notify listeners
    const newState = this.getState(system);
    this.notifyListeners(system, newState);

    return {
      success: true,
      message: `${system} ${enabled ? "enabled" : "disabled"} by manual override`,
    };
  }

  /**
   * Clear manual override
   */
  clearOverride(system: AutonomySystem): void {
    this.manualOverrides.delete(system);
    const newState = this.getState(system);
    this.notifyListeners(system, newState);
  }

  /**
   * Get full impact assessment
   */
  getImpact(): AutonomyImpact {
    const securityMode = getSecurityMode();
    const threatLevel = getThreatLevel();
    const systems = this.getAllStates();
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Generate warnings
    if (securityMode === "lockdown") {
      warnings.push("All autonomy systems are disabled during lockdown");
    }

    if (threatLevel === "red" || threatLevel === "black") {
      warnings.push(`Critical threat level (${threatLevel}) - autonomy restricted`);
    }

    // Check for systems with manual overrides
    for (const [system, enabled] of this.manualOverrides) {
      if (enabled && securityMode !== "monitor") {
        warnings.push(`${system} has manual override enabled despite ${securityMode} mode`);
      }
    }

    // Generate recommendations
    if (securityMode === "monitor" && process.env.NODE_ENV === "production") {
      recommendations.push("Consider switching to ENFORCE mode in production");
    }

    const disabledCount = Object.values(systems).filter((s) => !s.enabled).length;
    if (disabledCount > 3) {
      recommendations.push(`${disabledCount} systems disabled - review security posture`);
    }

    return {
      securityMode,
      threatLevel,
      systems,
      warnings,
      recommendations,
    };
  }

  /**
   * Register a state change listener
   */
  onStateChange(callback: (system: AutonomySystem, state: AutonomyState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(system: AutonomySystem, state: AutonomyState): void {
    for (const listener of this.listeners) {
      try {
        listener(system, state);
      } catch (error) {
        console.error("[AutonomyController] Listener error:", error);
      }
    }
  }

  /**
   * Refresh all states (call when security mode changes)
   */
  refreshAllStates(): void {
    for (const [system] of this.states) {
      const newState = this.computeState(system);
      const oldState = this.states.get(system);

      if (JSON.stringify(oldState) !== JSON.stringify(newState)) {
        this.states.set(system, newState);
        this.notifyListeners(system, newState);
      }
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const autonomyController = new AutonomyController();

// ============================================================================
// API ROUTES
// ============================================================================

export const autonomyRouter = Router();

// Import autonomy guard for route-level protection
import { autonomyGuard } from "../middleware/security-guards";

// Apply Security Gate to mutation endpoints
autonomyRouter.use((req, res, next) => {
  if (req.method === "GET") return next();
  return autonomyGuard(req as any, res, next);
});

/**
 * Get autonomy impact assessment
 */
autonomyRouter.get("/impact", (req, res) => {
  const impact = autonomyController.getImpact();
  res.json(impact);
});

/**
 * Get specific system state
 */
autonomyRouter.get("/systems/:system", (req, res) => {
  const system = req.params.system as AutonomySystem;
  const state = autonomyController.getState(system);
  res.json(state);
});

/**
 * Get all system states
 */
autonomyRouter.get("/systems", (req, res) => {
  const states = autonomyController.getAllStates();
  res.json(states);
});

/**
 * Check if action is allowed
 */
autonomyRouter.post("/check", async (req, res) => {
  const { system, action, context } = req.body;
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const result = await autonomyController.checkAction(
    system,
    action,
    user.id,
    user.role,
    context
  );

  res.json(result);
});

/**
 * Set manual override (super_admin only)
 */
autonomyRouter.post("/override/:system", async (req, res) => {
  const system = req.params.system as AutonomySystem;
  const { enabled, reason } = req.body;
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const result = await autonomyController.setManualOverride(
    system,
    enabled,
    user.id,
    user.role,
    reason
  );

  if (!result.success) {
    return res.status(403).json({ error: result.message });
  }

  res.json(result);
});

/**
 * Clear override
 */
autonomyRouter.delete("/override/:system", (req, res) => {
  const system = req.params.system as AutonomySystem;
  const user = (req as any).user;

  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin required" });
  }

  autonomyController.clearOverride(system);
  res.json({ success: true, message: "Override cleared" });
});

console.log("[AutonomyController] Module loaded");
