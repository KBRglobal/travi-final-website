/**
 * Autopilot Mode Controller
 * Manages the global autopilot mode for the data decision system
 */

import type { AutopilotMode, OverrideLog } from '../types';
import { decisionEngine } from '../engine';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface AutopilotConfig {
  defaultMode: AutopilotMode;
  modeTransitionRules: {
    [from: string]: {
      [to: string]: {
        requiresApproval: string;
        stabilityDays?: number;
      };
    };
  };
  modeLimits: {
    [mode: string]: {
      autoDecisionsPerHour: number;
      approvalSlaHours: number;
      confidenceMinimum: number;
      dataFreshnessMaxHours: number;
    };
  };
}

const DEFAULT_AUTOPILOT_CONFIG: AutopilotConfig = {
  defaultMode: 'supervised',
  modeTransitionRules: {
    off: {
      supervised: { requiresApproval: 'ops_lead' },
      full: { requiresApproval: 'cto', stabilityDays: 7 },
    },
    supervised: {
      off: { requiresApproval: 'any' },
      full: { requiresApproval: 'cto', stabilityDays: 7 },
    },
    full: {
      supervised: { requiresApproval: 'automatic' }, // Auto on safety trigger
      off: { requiresApproval: 'automatic' }, // Auto on circuit breaker
    },
  },
  modeLimits: {
    off: {
      autoDecisionsPerHour: 0,
      approvalSlaHours: 0,
      confidenceMinimum: 0,
      dataFreshnessMaxHours: 0,
    },
    supervised: {
      autoDecisionsPerHour: 50,
      approvalSlaHours: 24,
      confidenceMinimum: 70,
      dataFreshnessMaxHours: 24,
    },
    full: {
      autoDecisionsPerHour: 200,
      approvalSlaHours: 4,
      confidenceMinimum: 60,
      dataFreshnessMaxHours: 48,
    },
  },
};

// =============================================================================
// AUTOPILOT CONTROLLER
// =============================================================================

export interface ModeTransitionRequest {
  fromMode: AutopilotMode;
  toMode: AutopilotMode;
  requestedBy: string;
  reason: string;
  duration?: number; // Optional duration in hours
}

export interface ModeTransitionResult {
  success: boolean;
  previousMode: AutopilotMode;
  newMode: AutopilotMode;
  message: string;
  requiresApproval?: boolean;
  approvalRequired?: string;
}

export class AutopilotController {
  private config: AutopilotConfig;
  private currentMode: AutopilotMode;
  private modeHistory: Array<{
    mode: AutopilotMode;
    timestamp: Date;
    changedBy: string;
    reason: string;
  }> = [];
  private overrides: OverrideLog[] = [];
  private safetyTriggers: string[] = [];
  private modeChangeCallbacks: Array<(mode: AutopilotMode) => void> = [];

  constructor(config: Partial<AutopilotConfig> = {}) {
    this.config = { ...DEFAULT_AUTOPILOT_CONFIG, ...config };
    this.currentMode = this.config.defaultMode;
    this.recordModeChange('system', 'Initial mode');
  }

  // =========================================================================
  // MODE MANAGEMENT
  // =========================================================================

  getMode(): AutopilotMode {
    return this.currentMode;
  }

  getModeLimits(): typeof DEFAULT_AUTOPILOT_CONFIG.modeLimits[string] {
    return this.config.modeLimits[this.currentMode];
  }

  requestModeTransition(request: ModeTransitionRequest): ModeTransitionResult {
    const { fromMode, toMode, requestedBy, reason } = request;

    // Verify current mode
    if (this.currentMode !== fromMode) {
      return {
        success: false,
        previousMode: this.currentMode,
        newMode: this.currentMode,
        message: `Current mode is ${this.currentMode}, not ${fromMode}`,
      };
    }

    // Check transition rules
    const transitionRules = this.config.modeTransitionRules[fromMode]?.[toMode];

    if (!transitionRules) {
      return {
        success: false,
        previousMode: this.currentMode,
        newMode: this.currentMode,
        message: `Transition from ${fromMode} to ${toMode} is not allowed`,
      };
    }

    // Check if transition requires approval
    if (transitionRules.requiresApproval !== 'automatic') {
      // In a real system, this would check user roles
      console.log(
        `[Autopilot] Mode transition ${fromMode} → ${toMode} requires ${transitionRules.requiresApproval} approval`
      );
    }

    // Check stability requirement
    if (transitionRules.stabilityDays) {
      const daysSinceLastChange = this.getDaysSinceLastModeChange();
      if (daysSinceLastChange < transitionRules.stabilityDays) {
        return {
          success: false,
          previousMode: this.currentMode,
          newMode: this.currentMode,
          message: `Transition requires ${transitionRules.stabilityDays} days of stability. Current: ${daysSinceLastChange.toFixed(1)} days`,
        };
      }
    }

    // Apply the transition
    this.setMode(toMode, requestedBy, reason);

    return {
      success: true,
      previousMode: fromMode,
      newMode: toMode,
      message: `Successfully transitioned from ${fromMode} to ${toMode}`,
    };
  }

  private setMode(mode: AutopilotMode, changedBy: string, reason: string): void {
    const previousMode = this.currentMode;
    this.currentMode = mode;

    // Update decision engine
    decisionEngine.setAutopilotMode(mode);

    // Record the change
    this.recordModeChange(changedBy, reason);

    // Notify callbacks
    for (const callback of this.modeChangeCallbacks) {
      callback(mode);
    }

    console.log(`[Autopilot] Mode changed: ${previousMode} → ${mode} by ${changedBy}`);
  }

  private recordModeChange(changedBy: string, reason: string): void {
    this.modeHistory.push({
      mode: this.currentMode,
      timestamp: new Date(),
      changedBy,
      reason,
    });

    // Keep last 100 changes
    if (this.modeHistory.length > 100) {
      this.modeHistory.shift();
    }
  }

  private getDaysSinceLastModeChange(): number {
    if (this.modeHistory.length === 0) return 0;
    const lastChange = this.modeHistory[this.modeHistory.length - 1];
    return (Date.now() - lastChange.timestamp.getTime()) / (24 * 60 * 60 * 1000);
  }

  // =========================================================================
  // SAFETY TRIGGERS
  // =========================================================================

  triggerSafetyDowngrade(reason: string): ModeTransitionResult {
    this.safetyTriggers.push(reason);

    if (this.currentMode === 'full') {
      return this.requestModeTransition({
        fromMode: 'full',
        toMode: 'supervised',
        requestedBy: 'system',
        reason: `Safety trigger: ${reason}`,
      });
    }

    return {
      success: false,
      previousMode: this.currentMode,
      newMode: this.currentMode,
      message: 'Already in supervised or off mode',
    };
  }

  triggerCircuitBreakerDowngrade(reason: string): ModeTransitionResult {
    if (this.currentMode !== 'off') {
      const previousMode = this.currentMode;
      this.setMode('off', 'circuit_breaker', reason);

      return {
        success: true,
        previousMode,
        newMode: 'off',
        message: `Circuit breaker activated: ${reason}`,
      };
    }

    return {
      success: false,
      previousMode: this.currentMode,
      newMode: this.currentMode,
      message: 'Already in off mode',
    };
  }

  // =========================================================================
  // OVERRIDES
  // =========================================================================

  createOverride(
    scope: 'decision' | 'category' | 'all',
    targetId: string | undefined,
    reason: string,
    createdBy: string,
    durationHours: number
  ): OverrideLog {
    const override: OverrideLog = {
      id: `override-${Date.now()}`,
      overrideType: durationHours <= 24 ? 'temporary' : durationHours <= 168 ? 'extended' : 'permanent',
      scope,
      targetId,
      reason,
      createdBy,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000),
      expired: false,
    };

    this.overrides.push(override);

    console.log(`[Autopilot] Override created: ${scope} for ${durationHours}h by ${createdBy}`);

    return override;
  }

  getActiveOverrides(): OverrideLog[] {
    const now = new Date();
    return this.overrides.filter(o => !o.expired && (!o.expiresAt || o.expiresAt > now));
  }

  expireOverride(overrideId: string): boolean {
    const override = this.overrides.find(o => o.id === overrideId);
    if (override) {
      override.expired = true;
      return true;
    }
    return false;
  }

  checkOverrides(): number {
    const now = new Date();
    let expired = 0;

    for (const override of this.overrides) {
      if (!override.expired && override.expiresAt && override.expiresAt <= now) {
        override.expired = true;
        expired++;
      }
    }

    return expired;
  }

  // =========================================================================
  // CALLBACKS
  // =========================================================================

  onModeChange(callback: (mode: AutopilotMode) => void): void {
    this.modeChangeCallbacks.push(callback);
  }

  // =========================================================================
  // QUERIES
  // =========================================================================

  getModeHistory(limit = 10): typeof this.modeHistory {
    return this.modeHistory.slice(-limit);
  }

  getSafetyTriggers(): string[] {
    return [...this.safetyTriggers];
  }

  getStatus(): {
    currentMode: AutopilotMode;
    limits: typeof DEFAULT_AUTOPILOT_CONFIG.modeLimits[string];
    daysSinceLastChange: number;
    activeOverrides: number;
    safetyTriggersCount: number;
  } {
    return {
      currentMode: this.currentMode,
      limits: this.getModeLimits(),
      daysSinceLastChange: this.getDaysSinceLastModeChange(),
      activeOverrides: this.getActiveOverrides().length,
      safetyTriggersCount: this.safetyTriggers.length,
    };
  }
}

// Singleton instance
export const autopilotController = new AutopilotController();
