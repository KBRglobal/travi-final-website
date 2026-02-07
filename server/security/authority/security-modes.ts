/**
 * Security Modes Manager
 *
 * Controls system-wide security states:
 * - lockdown: All autopilots OFF, destructive actions blocked
 * - enforce: Destructive actions require approval
 * - monitor: Advisory only, all actions logged
 *
 * Feature flag: ENABLE_SECURITY_AUTHORITY
 */

import {
  SecurityMode,
  SecurityModeConfig,
  SecurityRestrictions,
  DEFAULT_SECURITY_AUTHORITY_CONFIG,
} from "./types";
import { SecurityGate } from "./security-gate";
import { SecuritySeverity, logSecurityEvent, SecurityEventType } from "../audit-logger";

// ============================================================================
// MODE HISTORY TRACKING
// ============================================================================

interface ModeHistoryEntry {
  mode: SecurityMode;
  reason: string;
  activatedBy: string;
  activatedAt: Date;
  deactivatedAt?: Date;
  duration?: number;
}

const MAX_MODE_HISTORY = 100;
const modeHistory: ModeHistoryEntry[] = [];

// Scheduled mode changes
interface ScheduledModeChange {
  id: string;
  targetMode: SecurityMode;
  reason: string;
  scheduledBy: string;
  scheduledFor: Date;
  executed: boolean;
}

const scheduledChanges: ScheduledModeChange[] = [];

// ============================================================================
// SECURITY MODE MANAGER
// ============================================================================

export const SecurityModeManager = {
  /**
   * Get current security mode
   */
  getMode(): SecurityModeConfig {
    return SecurityGate.getMode();
  },

  /**
   * Get current restrictions
   */
  getRestrictions(): SecurityRestrictions {
    return SecurityGate.getMode().restrictions;
  },

  /**
   * Check if a specific restriction is active
   */
  isRestricted(restriction: keyof SecurityRestrictions): boolean {
    const restrictions = this.getRestrictions();
    return !restrictions[restriction];
  },

  /**
   * Set security mode with validation
   */
  async setMode(params: {
    mode: SecurityMode;
    reason: string;
    activatedBy: string;
    autoExpireMinutes?: number;
    requireConfirmation?: boolean;
  }): Promise<{
    success: boolean;
    previousMode: SecurityMode;
    newMode: SecurityMode;
    message: string;
  }> {
    const currentMode = this.getMode();

    // Validate mode transition
    if (currentMode.mode === params.mode) {
      return {
        success: false,
        previousMode: currentMode.mode,
        newMode: params.mode,
        message: "Already in requested mode",
      };
    }

    // Log history before change
    if (modeHistory.length >= MAX_MODE_HISTORY) {
      modeHistory.shift();
    }

    modeHistory.push({
      mode: currentMode.mode,
      reason: currentMode.reason,
      activatedBy: currentMode.activatedBy,
      activatedAt: currentMode.activatedAt,
      deactivatedAt: new Date(),
      duration: Date.now() - currentMode.activatedAt.getTime(),
    });

    // Apply the new mode
    await SecurityGate.setMode(
      params.mode,
      params.reason,
      params.activatedBy,
      params.autoExpireMinutes
    );

    return {
      success: true,
      previousMode: currentMode.mode,
      newMode: params.mode,
      message: `Security mode changed to ${params.mode}`,
    };
  },

  /**
   * Activate lockdown mode
   */
  async activateLockdown(
    reason: string,
    activatedBy: string,
    durationMinutes: number = 60
  ): Promise<void> {
    await this.setMode({
      mode: "lockdown",
      reason,
      activatedBy,
      autoExpireMinutes: durationMinutes,
    });

    // Log critical event
    await logSecurityEvent({
      type: SecurityEventType.SETTINGS_CHANGED,
      severity: SecuritySeverity.CRITICAL,
      userId: activatedBy,
      ipAddress: "system",
      resource: "security_mode",
      action: "lockdown_activated",
      details: { reason, durationMinutes },
      success: true,
    });
  },

  /**
   * Deactivate lockdown mode
   */
  async deactivateLockdown(
    deactivatedBy: string,
    targetMode: SecurityMode = "enforce"
  ): Promise<void> {
    const currentMode = this.getMode();

    if (currentMode.mode !== "lockdown") {
      return; // Not in lockdown
    }

    await this.setMode({
      mode: targetMode,
      reason: "Lockdown deactivated",
      activatedBy: deactivatedBy,
    });

    // Log event
    await logSecurityEvent({
      type: SecurityEventType.SETTINGS_CHANGED,
      severity: SecuritySeverity.HIGH,
      userId: deactivatedBy,
      ipAddress: "system",
      resource: "security_mode",
      action: "lockdown_deactivated",
      details: { previousMode: "lockdown", newMode: targetMode },
      success: true,
    });
  },

  /**
   * Schedule a mode change
   */
  scheduleChange(params: {
    targetMode: SecurityMode;
    reason: string;
    scheduledBy: string;
    scheduledFor: Date;
  }): string {
    const id = `sched_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    scheduledChanges.push({
      id,
      ...params,
      executed: false,
    });

    // Set timeout to execute
    const delay = params.scheduledFor.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        const change = scheduledChanges.find(c => c.id === id);
        if (change && !change.executed) {
          await this.setMode({
            mode: change.targetMode,
            reason: change.reason,
            activatedBy: `scheduled:${change.scheduledBy}`,
          });
          change.executed = true;
        }
      }, delay);
    }

    return id;
  },

  /**
   * Cancel a scheduled change
   */
  cancelScheduledChange(id: string): boolean {
    const index = scheduledChanges.findIndex(c => c.id === id && !c.executed);
    if (index >= 0) {
      scheduledChanges.splice(index, 1);
      return true;
    }
    return false;
  },

  /**
   * Get scheduled changes
   */
  getScheduledChanges(): ScheduledModeChange[] {
    return scheduledChanges.filter(c => !c.executed && c.scheduledFor > new Date());
  },

  /**
   * Get mode history
   */
  getModeHistory(limit: number = 20): ModeHistoryEntry[] {
    return modeHistory.slice(-limit);
  },

  /**
   * Get mode statistics
   */
  getModeStats(): {
    currentMode: SecurityMode;
    activeSince: Date;
    activeFor: number;
    totalChanges: number;
    timeInEachMode: Record<SecurityMode, number>;
  } {
    const current = this.getMode();
    const activeFor = Date.now() - current.activatedAt.getTime();

    const timeInEachMode: Record<SecurityMode, number> = {
      lockdown: 0,
      enforce: 0,
      monitor: 0,
    };

    modeHistory.forEach(entry => {
      if (entry.duration) {
        timeInEachMode[entry.mode] += entry.duration;
      }
    });

    // Add current mode time
    timeInEachMode[current.mode] += activeFor;

    return {
      currentMode: current.mode,
      activeSince: current.activatedAt,
      activeFor,
      totalChanges: modeHistory.length,
      timeInEachMode,
    };
  },

  /**
   * Check auto-expiration
   */
  checkAutoExpiration(): void {
    const current = this.getMode();

    if (current.autoExpireAt && current.autoExpireAt <= new Date()) {
      // Auto-expire to enforce mode
      this.setMode({
        mode: "enforce",
        reason: "Auto-expired from " + current.mode,
        activatedBy: "system:auto-expire",
      });
    }
  },
};

// ============================================================================
// AUTONOMY IMPACT API
// ============================================================================

export interface AutonomyImpact {
  mode: SecurityMode;
  restrictions: SecurityRestrictions;
  impacts: {
    dataAutopilot: "running" | "paused" | "blocked";
    seoAutopilot: "running" | "paused" | "blocked";
    opsAutopilot: "running" | "paused" | "blocked";
    bulkOperations: "allowed" | "approval_required" | "blocked";
    deployments: "allowed" | "approval_required" | "blocked";
    contentPublishing: "allowed" | "approval_required" | "blocked";
    externalApis: "allowed" | "rate_limited" | "blocked";
  };
  recommendations: string[];
}

export function getAutonomyImpact(): AutonomyImpact {
  const mode = SecurityModeManager.getMode();
  const restrictions = mode.restrictions;

  const impacts: AutonomyImpact["impacts"] = {
    dataAutopilot: restrictions.autopilotAllowed ? "running" : "blocked",
    seoAutopilot: restrictions.autopilotAllowed ? "running" : "blocked",
    opsAutopilot: restrictions.autopilotAllowed ? "running" : "blocked",
    bulkOperations: restrictions.bulkOperationsAllowed
      ? "allowed"
      : restrictions.requireApprovalForAll
        ? "approval_required"
        : "blocked",
    deployments: restrictions.deploymentAllowed
      ? "allowed"
      : restrictions.requireApprovalForAll
        ? "approval_required"
        : "blocked",
    contentPublishing: restrictions.destructiveActionsAllowed
      ? "allowed"
      : restrictions.requireApprovalForAll
        ? "approval_required"
        : "allowed",
    externalApis: restrictions.externalApiCallsAllowed ? "allowed" : "blocked",
  };

  const recommendations: string[] = [];

  if (mode.mode === "lockdown") {
    recommendations.push("Review threat status before deactivating lockdown");
    recommendations.push("Ensure all critical issues are resolved");
    recommendations.push("Consider scheduling return to enforce mode");
  } else if (mode.mode === "enforce") {
    recommendations.push("Monitor audit logs for approval requests");
    recommendations.push("Review override usage periodically");
  } else {
    recommendations.push("Consider switching to enforce mode for production");
    recommendations.push("Review security events for potential issues");
  }

  return {
    mode: mode.mode,
    restrictions,
    impacts,
    recommendations,
  };
}

// ============================================================================
// PERIODIC TASKS
// ============================================================================

// Check auto-expiration every minute - only when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== "true" && process.env.REPLIT_DEPLOYMENT !== "1") {
  setInterval(() => {
    if (DEFAULT_SECURITY_AUTHORITY_CONFIG.enabled) {
      SecurityModeManager.checkAutoExpiration();
    }
  }, 60 * 1000);
}
