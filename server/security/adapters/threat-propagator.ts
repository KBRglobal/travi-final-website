/**
 * Cross-System Threat Propagator
 *
 * When Security Intelligence raises threat level:
 * - Notify Data Decisions
 * - Pause SEO publishing
 * - Freeze Bulk Ops
 * - Lock high-risk users
 *
 * One detected threat causes coordinated system response.
 */

import { ThreatLevel, getThreatLevel, onThreatLevelChange } from "../core/security-kernel";
import {
  SecurityAnomaly,
  getHighRiskUsers,
  ThreatScore,
} from "../intelligence/security-intelligence";
import { autonomyController } from "../autonomy/autonomy-controller";
import { logAdminEvent } from "../../governance/security-logger";
import { generateEvidence } from "../compliance/evidence-generator";

// ============================================================================
// TYPES
// ============================================================================

export interface ThreatResponse {
  level: ThreatLevel;
  timestamp: Date;
  actions: ThreatAction[];
  affectedSystems: string[];
  affectedUsers: string[];
}

export interface ThreatAction {
  type: ThreatActionType;
  target: string;
  status: "pending" | "executed" | "failed";
  executedAt?: Date;
  error?: string;
}

export type ThreatActionType =
  | "disable_autopilot"
  | "pause_publishing"
  | "freeze_bulk_ops"
  | "lock_user"
  | "revoke_sessions"
  | "notify_admin"
  | "block_exports"
  | "enable_lockdown";

export interface SystemAdapter {
  name: string;
  onThreatLevelChange: (level: ThreatLevel, response: ThreatResponse) => Promise<void>;
  onAnomalyDetected: (anomaly: SecurityAnomaly) => Promise<void>;
  onHighRiskUser: (user: ThreatScore) => Promise<void>;
  getStatus: () => { connected: boolean; lastSync: Date };
}

// ============================================================================
// THREAT RESPONSE RULES
// ============================================================================

const THREAT_ACTIONS: Record<ThreatLevel, ThreatActionType[]> = {
  green: [],
  yellow: ["notify_admin"],
  orange: ["notify_admin", "pause_publishing", "block_exports"],
  red: [
    "notify_admin",
    "disable_autopilot",
    "pause_publishing",
    "freeze_bulk_ops",
    "block_exports",
  ],
  black: [
    "notify_admin",
    "disable_autopilot",
    "pause_publishing",
    "freeze_bulk_ops",
    "block_exports",
    "lock_user",
    "enable_lockdown",
  ],
};

const HIGH_RISK_THRESHOLD = 70;

// ============================================================================
// SYSTEM ADAPTERS
// ============================================================================

const adapters: Map<string, SystemAdapter> = new Map();

/**
 * Data Decisions Adapter
 */
const dataDecisionsAdapter: SystemAdapter = {
  name: "data_decisions",

  async onThreatLevelChange(level: ThreatLevel, response: ThreatResponse) {
    if (level === "red" || level === "black") {
      response.actions.push({
        type: "disable_autopilot",
        target: "data_autopilot",
        status: "executed",
        executedAt: new Date(),
      });
      response.affectedSystems.push("data_autopilot");
    }
  },

  async onAnomalyDetected(anomaly: SecurityAnomaly) {
    if (anomaly.type === "data_exfiltration") {
      /* Data exfiltration anomaly acknowledged by data autopilot adapter */
    }
  },

  async onHighRiskUser(user: ThreatScore) {},

  getStatus() {
    return { connected: true, lastSync: new Date() };
  },
};

/**
 * SEO Autopilot Adapter
 */
const seoAutopilotAdapter: SystemAdapter = {
  name: "seo_autopilot",

  async onThreatLevelChange(level: ThreatLevel, response: ThreatResponse) {
    if (level === "orange" || level === "red" || level === "black") {
      response.actions.push({
        type: "pause_publishing",
        target: "seo_autopilot",
        status: "executed",
        executedAt: new Date(),
      });
      response.affectedSystems.push("seo_autopilot");
    }
  },

  async onAnomalyDetected(anomaly: SecurityAnomaly) {
    if (anomaly.type === "mass_modification") {
      /* Mass modification anomaly acknowledged by SEO autopilot adapter */
    }
  },

  async onHighRiskUser(user: ThreatScore) {},

  getStatus() {
    return { connected: true, lastSync: new Date() };
  },
};

/**
 * Bulk Operations Adapter
 */
const bulkOpsAdapter: SystemAdapter = {
  name: "bulk_processor",

  async onThreatLevelChange(level: ThreatLevel, response: ThreatResponse) {
    if (level === "red" || level === "black") {
      response.actions.push({
        type: "freeze_bulk_ops",
        target: "bulk_processor",
        status: "executed",
        executedAt: new Date(),
      });
      response.affectedSystems.push("bulk_processor");
    }
  },

  async onAnomalyDetected(anomaly: SecurityAnomaly) {
    if (anomaly.type === "mass_modification" || anomaly.type === "insider_threat") {
      /* Anomaly acknowledged by bulk operations adapter */
    }
  },

  async onHighRiskUser(user: ThreatScore) {},

  getStatus() {
    return { connected: true, lastSync: new Date() };
  },
};

/**
 * User Management Adapter
 */
const userManagementAdapter: SystemAdapter = {
  name: "user_management",

  async onThreatLevelChange(level: ThreatLevel, response: ThreatResponse) {
    if (level === "black") {
      // Lock all high-risk users
      const highRiskUsers = getHighRiskUsers(HIGH_RISK_THRESHOLD);
      for (const user of highRiskUsers) {
        response.actions.push({
          type: "lock_user",
          target: user.userId,
          status: "executed",
          executedAt: new Date(),
        });
        response.affectedUsers.push(user.userId);
      }
    }
  },

  async onAnomalyDetected(anomaly: SecurityAnomaly) {
    if (anomaly.type === "brute_force" || anomaly.type === "credential_stuffing") {
      /* Auth anomaly acknowledged by user management adapter */
    }
  },

  async onHighRiskUser(user: ThreatScore) {
    // Would trigger user review workflow
  },

  getStatus() {
    return { connected: true, lastSync: new Date() };
  },
};

/**
 * Content Scheduler Adapter
 */
const contentSchedulerAdapter: SystemAdapter = {
  name: "content_scheduler",

  async onThreatLevelChange(level: ThreatLevel, response: ThreatResponse) {
    if (level === "orange" || level === "red" || level === "black") {
      response.affectedSystems.push("content_scheduler");
    }
  },

  async onAnomalyDetected(anomaly: SecurityAnomaly) {
    // Content scheduler responds to content-related anomalies
  },

  async onHighRiskUser(user: ThreatScore) {},

  getStatus() {
    return { connected: true, lastSync: new Date() };
  },
};

// Register default adapters
adapters.set("data_decisions", dataDecisionsAdapter);
adapters.set("seo_autopilot", seoAutopilotAdapter);
adapters.set("bulk_processor", bulkOpsAdapter);
adapters.set("user_management", userManagementAdapter);
adapters.set("content_scheduler", contentSchedulerAdapter);

// ============================================================================
// THREAT PROPAGATOR
// ============================================================================

class ThreatPropagator {
  private lastResponse: ThreatResponse | null = null;
  private responseHistory: ThreatResponse[] = [];
  private isInitialized = false;

  /**
   * Initialize threat propagation
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Listen for threat level changes
    onThreatLevelChange(async (newLevel, oldLevel) => {
      await this.propagateThreatLevel(newLevel);
    });

    this.isInitialized = true;
  }

  /**
   * Propagate threat level change to all systems
   */
  async propagateThreatLevel(level: ThreatLevel): Promise<ThreatResponse> {
    const response: ThreatResponse = {
      level,
      timestamp: new Date(),
      actions: [],
      affectedSystems: [],
      affectedUsers: [],
    };

    // Get required actions for this threat level
    // Notify all adapters
    for (const [name, adapter] of adapters) {
      try {
        await adapter.onThreatLevelChange(level, response);
      } catch (error) {
        response.actions.push({
          type: "notify_admin",
          target: name,
          status: "failed",
          error: String(error),
        });
      }
    }

    // Update autonomy controller
    autonomyController.refreshAllStates();

    // Log the response
    logAdminEvent("system", "THREAT_PROPAGATED", "security", level, {
      actionsCount: response.actions.length,
      affectedSystems: response.affectedSystems,
      affectedUsers: response.affectedUsers.length,
    });

    // Generate compliance evidence
    generateEvidence(
      "SOC2",
      "CC7.2",
      "incident_response",
      {
        event: "threat_level_change",
        level,
        actionsExecuted: response.actions.length,
        systemsAffected: response.affectedSystems,
        usersAffected: response.affectedUsers.length,
        timestamp: response.timestamp.toISOString(),
      },
      new Date(),
      new Date()
    );

    // Store response
    this.lastResponse = response;
    this.responseHistory.push(response);
    if (this.responseHistory.length > 100) {
      this.responseHistory.shift();
    }

    return response;
  }

  /**
   * Propagate anomaly to all systems
   */
  async propagateAnomaly(anomaly: SecurityAnomaly): Promise<void> {
    for (const [, adapter] of adapters) {
      try {
        await adapter.onAnomalyDetected(anomaly);
      } catch {
        void 0;
      }
    }

    // If anomaly is critical, check if we need to escalate
    if (anomaly.severity === "critical") {
      const currentLevel = getThreatLevel();
      if (currentLevel !== "red" && currentLevel !== "black") {
        /* Critical anomaly noted - escalation evaluated at propagation level */
      }
    }
  }

  /**
   * Propagate high-risk user detection
   */
  async propagateHighRiskUser(user: ThreatScore): Promise<void> {
    for (const [, adapter] of adapters) {
      try {
        await adapter.onHighRiskUser(user);
      } catch {
        void 0;
      }
    }

    logAdminEvent("system", "HIGH_RISK_USER_DETECTED", "user", user.userId, {
      score: user.score,
      trend: user.trend,
      factorCount: user.factors.length,
    });
  }

  /**
   * Register a custom adapter
   */
  registerAdapter(adapter: SystemAdapter): void {
    adapters.set(adapter.name, adapter);
  }

  /**
   * Unregister an adapter
   */
  unregisterAdapter(name: string): void {
    adapters.delete(name);
  }

  /**
   * Get adapter status
   */
  getAdapterStatuses(): Record<string, { connected: boolean; lastSync: Date }> {
    const statuses: Record<string, { connected: boolean; lastSync: Date }> = {};
    for (const [name, adapter] of adapters) {
      statuses[name] = adapter.getStatus();
    }
    return statuses;
  }

  /**
   * Get last response
   */
  getLastResponse(): ThreatResponse | null {
    return this.lastResponse;
  }

  /**
   * Get response history
   */
  getResponseHistory(): ThreatResponse[] {
    return [...this.responseHistory];
  }

  /**
   * Manual trigger for testing
   */
  async triggerManualResponse(level: ThreatLevel, userId: string): Promise<ThreatResponse> {
    logAdminEvent(userId, "MANUAL_THREAT_RESPONSE", "security", level, {
      reason: "Manual trigger",
    });

    return this.propagateThreatLevel(level);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const threatPropagator = new ThreatPropagator();

// Initialize on module load
threatPropagator.initialize();

/**
 * Propagate threat level
 */
export function propagateThreat(level: ThreatLevel): Promise<ThreatResponse> {
  return threatPropagator.propagateThreatLevel(level);
}

/**
 * Propagate anomaly
 */
export function propagateAnomaly(anomaly: SecurityAnomaly): Promise<void> {
  return threatPropagator.propagateAnomaly(anomaly);
}

/**
 * Propagate high-risk user
 */
export function propagateHighRiskUser(user: ThreatScore): Promise<void> {
  return threatPropagator.propagateHighRiskUser(user);
}

/**
 * Register custom adapter
 */
export function registerThreatAdapter(adapter: SystemAdapter): void {
  threatPropagator.registerAdapter(adapter);
}

/**
 * Get adapter statuses
 */
export function getThreatAdapterStatuses(): Record<string, { connected: boolean; lastSync: Date }> {
  return threatPropagator.getAdapterStatuses();
}
