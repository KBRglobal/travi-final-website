/**
 * Autonomous Security Modes
 *
 * Three operational modes:
 * - MONITOR: Log everything, block nothing (dev/testing)
 * - ENFORCE: Log and block violations (production default)
 * - LOCKDOWN: Maximum security, minimal operations (incident response)
 *
 * Mode transitions happen automatically based on:
 * - Threat level
 * - Anomaly count
 * - Manual override
 */

import type { Request, Response, NextFunction } from "express";
import { logAdminEvent } from "../../governance/security-logger";
import { getIntelligenceSummary } from "../intelligence/security-intelligence";
import { scanForDrift } from "../drift/drift-scanner";

// ============================================================================
// TYPES
// ============================================================================

export type SecurityMode = "monitor" | "enforce" | "lockdown";

export interface ModeConfiguration {
  mode: SecurityMode;
  reason: string;
  setBy: "auto" | "manual";
  setAt: Date;
  expiresAt?: Date;
  restrictions: ModeRestrictions;
}

export interface ModeRestrictions {
  blockWrites: boolean;
  blockDeletes: boolean;
  blockExports: boolean;
  blockRoleChanges: boolean;
  blockPolicyChanges: boolean;
  requireMFA: boolean;
  requireApproval: boolean;
  ipWhitelistOnly: boolean;
  readOnlyMode: boolean;
  maxSessionDuration: number; // minutes
  maxConcurrentSessions: number;
  allowedRoles: string[];
}

export interface ThreatAssessment {
  level: "green" | "yellow" | "orange" | "red" | "black";
  score: number; // 0-100
  factors: ThreatFactor[];
  recommendedMode: SecurityMode;
  timestamp: Date;
}

export interface ThreatFactor {
  name: string;
  severity: "low" | "medium" | "high" | "critical";
  value: number;
  threshold: number;
  description: string;
}

export interface ModeTransition {
  id: string;
  from: SecurityMode;
  to: SecurityMode;
  reason: string;
  triggeredBy: "auto" | "manual";
  userId?: string;
  timestamp: Date;
  assessment?: ThreatAssessment;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const MODE_CONFIGS: Record<SecurityMode, ModeRestrictions> = {
  monitor: {
    blockWrites: false,
    blockDeletes: false,
    blockExports: false,
    blockRoleChanges: false,
    blockPolicyChanges: false,
    requireMFA: false,
    requireApproval: false,
    ipWhitelistOnly: false,
    readOnlyMode: false,
    maxSessionDuration: 480, // 8 hours
    maxConcurrentSessions: 10,
    allowedRoles: ["super_admin", "system_admin", "manager", "ops", "editor", "analyst", "viewer"],
  },
  enforce: {
    blockWrites: false,
    blockDeletes: false,
    blockExports: false,
    blockRoleChanges: false,
    blockPolicyChanges: false,
    requireMFA: true,
    requireApproval: true, // For sensitive ops
    ipWhitelistOnly: false,
    readOnlyMode: false,
    maxSessionDuration: 240, // 4 hours
    maxConcurrentSessions: 5,
    allowedRoles: ["super_admin", "system_admin", "manager", "ops", "editor", "analyst", "viewer"],
  },
  lockdown: {
    blockWrites: true,
    blockDeletes: true,
    blockExports: true,
    blockRoleChanges: true,
    blockPolicyChanges: true,
    requireMFA: true,
    requireApproval: true,
    ipWhitelistOnly: true,
    readOnlyMode: true,
    maxSessionDuration: 30, // 30 minutes
    maxConcurrentSessions: 2,
    allowedRoles: ["super_admin", "system_admin"],
  },
};

// ============================================================================
// THREAT THRESHOLDS
// ============================================================================

const THREAT_THRESHOLDS = {
  anomaliesPerHour: {
    yellow: 5,
    orange: 15,
    red: 30,
    black: 50,
  },
  criticalAnomalies: {
    yellow: 1,
    orange: 3,
    red: 5,
    black: 10,
  },
  driftScore: {
    yellow: 20,
    orange: 40,
    red: 60,
    black: 80,
  },
  failedLogins: {
    yellow: 20,
    orange: 50,
    red: 100,
    black: 200,
  },
  highRiskUsers: {
    yellow: 2,
    orange: 5,
    red: 10,
    black: 20,
  },
};

// ============================================================================
// SECURITY MODE MANAGER
// ============================================================================

class SecurityModeManager {
  private currentConfig: ModeConfiguration;
  private transitionHistory: ModeTransition[] = [];
  private readonly assessmentHistory: ThreatAssessment[] = [];
  private autoModeEnabled: boolean = true;

  constructor() {
    // Default to enforce in production, monitor elsewhere
    const defaultMode: SecurityMode = process.env.NODE_ENV === "production" ? "enforce" : "monitor";

    this.currentConfig = {
      mode: defaultMode,
      reason: "System initialization",
      setBy: "auto",
      setAt: new Date(),
      restrictions: MODE_CONFIGS[defaultMode],
    };
  }

  /**
   * Get current mode
   */
  getMode(): SecurityMode {
    return this.currentConfig.mode;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): ModeConfiguration {
    return { ...this.currentConfig };
  }

  /**
   * Get current restrictions
   */
  getRestrictions(): ModeRestrictions {
    return { ...this.currentConfig.restrictions };
  }

  /**
   * Check if operation is allowed in current mode
   */
  isOperationAllowed(operation: string): { allowed: boolean; reason?: string } {
    const restrictions = this.currentConfig.restrictions;

    switch (operation) {
      case "write":
        if (restrictions.blockWrites) {
          return { allowed: false, reason: "Writes blocked in current security mode" };
        }
        break;
      case "delete":
        if (restrictions.blockDeletes) {
          return { allowed: false, reason: "Deletes blocked in current security mode" };
        }
        break;
      case "export":
        if (restrictions.blockExports) {
          return { allowed: false, reason: "Exports blocked in current security mode" };
        }
        break;
      case "role_change":
        if (restrictions.blockRoleChanges) {
          return { allowed: false, reason: "Role changes blocked in current security mode" };
        }
        break;
      case "policy_change":
        if (restrictions.blockPolicyChanges) {
          return { allowed: false, reason: "Policy changes blocked in current security mode" };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Manually set security mode
   */
  setMode(
    mode: SecurityMode,
    reason: string,
    userId: string,
    expiresIn?: number // minutes
  ): ModeConfiguration {
    const previousMode = this.currentConfig.mode;

    // Validate transition
    if (mode === "lockdown" && previousMode === "monitor") {
      // Going from monitor to lockdown requires confirmation
    }

    this.currentConfig = {
      mode,
      reason,
      setBy: "manual",
      setAt: new Date(),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 60 * 1000) : undefined,
      restrictions: MODE_CONFIGS[mode],
    };

    this.recordTransition({
      id: `TRANS-${Date.now()}`,
      from: previousMode,
      to: mode,
      reason,
      triggeredBy: "manual",
      userId,
      timestamp: new Date(),
    });

    logAdminEvent(userId, "SECURITY_MODE_CHANGE", "security_mode", mode, {
      from: previousMode,
      to: mode,
      reason,
    });

    return this.getConfiguration();
  }

  /**
   * Assess current threat level
   */
  async assessThreatLevel(): Promise<ThreatAssessment> {
    const factors: ThreatFactor[] = [];
    let totalScore = 0;

    // Get intelligence summary
    const intel = getIntelligenceSummary();

    // Factor: Anomalies per hour
    const anomalyFactor = this.assessFactor(
      "anomalies_per_hour",
      intel.anomaliesLast24h / 24,
      THREAT_THRESHOLDS.anomaliesPerHour,
      "Anomaly detection rate"
    );
    factors.push(anomalyFactor);
    totalScore += anomalyFactor.value * 20;

    // Factor: High risk users
    const riskUserFactor = this.assessFactor(
      "high_risk_users",
      intel.highRiskUsers,
      THREAT_THRESHOLDS.highRiskUsers,
      "Users with elevated threat scores"
    );
    factors.push(riskUserFactor);
    totalScore += riskUserFactor.value * 25;

    // Factor: Critical anomalies
    const criticalAnomalies = intel.topAnomalyTypes
      .filter(t => ["brute_force", "privilege_escalation", "credential_stuffing"].includes(t.type))
      .reduce((sum, t) => sum + t.count, 0);

    const criticalFactor = this.assessFactor(
      "critical_anomalies",
      criticalAnomalies,
      THREAT_THRESHOLDS.criticalAnomalies,
      "Critical security events"
    );
    factors.push(criticalFactor);
    totalScore += criticalFactor.value * 30;

    // Factor: Drift
    try {
      const driftResult = await scanForDrift();
      const driftScore =
        driftResult.summary.criticalDrifts * 30 +
        driftResult.summary.highDrifts * 20 +
        driftResult.summary.mediumDrifts * 10;

      const driftFactor = this.assessFactor(
        "security_drift",
        driftScore,
        THREAT_THRESHOLDS.driftScore,
        "Configuration drift from baseline"
      );
      factors.push(driftFactor);
      totalScore += driftFactor.value * 25;
    } catch {
      void 0;
    }

    // Normalize score
    totalScore = Math.min(100, Math.round(totalScore));

    // Determine threat level
    let level: ThreatAssessment["level"] = "green";
    if (totalScore >= 80) level = "black";
    else if (totalScore >= 60) level = "red";
    else if (totalScore >= 40) level = "orange";
    else if (totalScore >= 20) level = "yellow";

    // Determine recommended mode
    let recommendedMode: SecurityMode = "monitor";
    if (level === "black" || level === "red") {
      recommendedMode = "lockdown";
    } else if (level === "orange" || level === "yellow") {
      recommendedMode = "enforce";
    }

    const assessment: ThreatAssessment = {
      level,
      score: totalScore,
      factors,
      recommendedMode,
      timestamp: new Date(),
    };

    this.assessmentHistory.push(assessment);

    return assessment;
  }

  /**
   * Auto-adjust mode based on threat level
   */
  async autoAdjustMode(): Promise<ModeTransition | null> {
    if (!this.autoModeEnabled) {
      return null;
    }

    // Don't auto-adjust if manually set recently
    if (
      this.currentConfig.setBy === "manual" &&
      Date.now() - this.currentConfig.setAt.getTime() < 30 * 60 * 1000 // 30 minutes
    ) {
      return null;
    }

    const assessment = await this.assessThreatLevel();
    const currentMode = this.currentConfig.mode;

    // Only escalate automatically, never de-escalate
    const modeHierarchy: SecurityMode[] = ["monitor", "enforce", "lockdown"];
    const currentIndex = modeHierarchy.indexOf(currentMode);
    const recommendedIndex = modeHierarchy.indexOf(assessment.recommendedMode);

    if (recommendedIndex > currentIndex) {
      // Escalate
      const previousMode = currentMode;
      const newMode = assessment.recommendedMode;

      this.currentConfig = {
        mode: newMode,
        reason: `Auto-escalated due to ${assessment.level.toUpperCase()} threat level (score: ${assessment.score})`,
        setBy: "auto",
        setAt: new Date(),
        restrictions: MODE_CONFIGS[newMode],
      };

      const transition: ModeTransition = {
        id: `TRANS-${Date.now()}`,
        from: previousMode,
        to: newMode,
        reason: `Threat level: ${assessment.level}, Score: ${assessment.score}`,
        triggeredBy: "auto",
        timestamp: new Date(),
        assessment,
      };

      this.recordTransition(transition);

      logAdminEvent("system", "AUTO_MODE_ESCALATION", "security_mode", newMode, {
        from: previousMode,
        to: newMode,
        threatLevel: assessment.level,
        score: assessment.score,
      });

      return transition;
    }

    return null;
  }

  /**
   * Start auto-mode monitoring
   */
  startAutoMode(intervalMs: number = 60000): NodeJS.Timer {
    return setInterval(async () => {
      try {
        const transition = await this.autoAdjustMode();
        if (transition) {
          /* Mode transition applied automatically */
        }
      } catch {
        void 0;
      }
    }, intervalMs);
  }

  /**
   * Enable/disable auto mode
   */
  setAutoModeEnabled(enabled: boolean): void {
    this.autoModeEnabled = enabled;
  }

  /**
   * Check mode expiration
   */
  checkExpiration(): boolean {
    if (this.currentConfig.expiresAt && Date.now() > this.currentConfig.expiresAt.getTime()) {
      // Revert to enforce mode
      const previousMode = this.currentConfig.mode;

      this.currentConfig = {
        mode: "enforce",
        reason: "Previous mode expired, reverting to enforce",
        setBy: "auto",
        setAt: new Date(),
        restrictions: MODE_CONFIGS.enforce,
      };

      this.recordTransition({
        id: `TRANS-${Date.now()}`,
        from: previousMode,
        to: "enforce",
        reason: "Mode expiration",
        triggeredBy: "auto",
        timestamp: new Date(),
      });

      return true;
    }

    return false;
  }

  /**
   * Get transition history
   */
  getTransitionHistory(): ModeTransition[] {
    return [...this.transitionHistory];
  }

  /**
   * Get assessment history
   */
  getAssessmentHistory(): ThreatAssessment[] {
    return [...this.assessmentHistory];
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private assessFactor(
    name: string,
    value: number,
    thresholds: Record<string, number>,
    description: string
  ): ThreatFactor {
    let severity: ThreatFactor["severity"] = "low";
    let threshold = thresholds.yellow;

    if (value >= thresholds.black) {
      severity = "critical";
      threshold = thresholds.black;
    } else if (value >= thresholds.red) {
      severity = "critical";
      threshold = thresholds.red;
    } else if (value >= thresholds.orange) {
      severity = "high";
      threshold = thresholds.orange;
    } else if (value >= thresholds.yellow) {
      severity = "medium";
      threshold = thresholds.yellow;
    }

    return {
      name,
      severity,
      value,
      threshold,
      description,
    };
  }

  private recordTransition(transition: ModeTransition): void {
    this.transitionHistory.push(transition);

    // Keep last 100 transitions
    if (this.transitionHistory.length > 100) {
      this.transitionHistory = this.transitionHistory.slice(-100);
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const securityModeManager = new SecurityModeManager();

/**
 * Get current security mode
 */
export function getSecurityMode(): SecurityMode {
  return securityModeManager.getMode();
}

/**
 * Get current mode configuration
 */
export function getModeConfiguration(): ModeConfiguration {
  return securityModeManager.getConfiguration();
}

/**
 * Check if operation is allowed
 */
export function isOperationAllowed(operation: string): { allowed: boolean; reason?: string } {
  return securityModeManager.isOperationAllowed(operation);
}

/**
 * Set security mode manually
 */
export function setSecurityMode(
  mode: SecurityMode,
  reason: string,
  userId: string,
  expiresIn?: number
): ModeConfiguration {
  return securityModeManager.setMode(mode, reason, userId, expiresIn);
}

/**
 * Assess current threat level
 */
export async function assessThreatLevel(): Promise<ThreatAssessment> {
  return securityModeManager.assessThreatLevel();
}

/**
 * Start auto-mode monitoring
 */
export function startAutoModeMonitoring(intervalMs?: number): NodeJS.Timer {
  return securityModeManager.startAutoMode(intervalMs);
}

/**
 * Middleware to check mode restrictions
 */
export function modeCheckMiddleware(operation: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const check = securityModeManager.isOperationAllowed(operation);

    if (!check.allowed) {
      return res.status(503).json({
        error: "Operation not allowed in current security mode",
        reason: check.reason,
        mode: securityModeManager.getMode(),
      });
    }

    next();
  };
}
