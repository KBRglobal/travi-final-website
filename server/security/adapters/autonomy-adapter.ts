/**
 * Autonomy Adapter
 *
 * Integrates Security with Autonomy Policy system:
 * - Forces all autopilots OFF in lockdown mode
 * - Coordinates with policy engine
 * - Manages AI generation permissions
 */

import {
  SystemAdapter,
  AdapterStatus,
  SecurityModeConfig,
  ThreatState,
  SecurityMode,
} from "../authority/types";

// Track state
let securityMode: SecurityMode = "enforce";
let allAutopilotsForcedOff = false;
let aiGenerationBlocked = false;
let lastHeartbeat = new Date();

// Autopilot states
type AutopilotState = "running" | "paused" | "blocked";

interface AutopilotStates {
  dataAutopilot: AutopilotState;
  seoAutopilot: AutopilotState;
  opsAutopilot: AutopilotState;
  contentAutopilot: AutopilotState;
}

let autopilotStates: AutopilotStates = {
  dataAutopilot: "running",
  seoAutopilot: "running",
  opsAutopilot: "running",
  contentAutopilot: "running",
};

export const AutonomyAdapter: SystemAdapter = {
  name: "autonomy-system",
  enabled: true,

  async onThreatEscalation(threat: ThreatState): Promise<void> {
    switch (threat.level) {
      case "critical":
        // Block everything
        allAutopilotsForcedOff = true;
        aiGenerationBlocked = true;
        autopilotStates = {
          dataAutopilot: "blocked",
          seoAutopilot: "blocked",
          opsAutopilot: "blocked",
          contentAutopilot: "blocked",
        };

        break;

      case "high":
        // Pause all autopilots
        allAutopilotsForcedOff = true;
        aiGenerationBlocked = true;
        autopilotStates = {
          dataAutopilot: "paused",
          seoAutopilot: "paused",
          opsAutopilot: "paused",
          contentAutopilot: "paused",
        };

        break;

      case "elevated":
        // Pause high-risk autopilots only
        allAutopilotsForcedOff = false;
        aiGenerationBlocked = false;
        autopilotStates = {
          dataAutopilot: "paused",
          seoAutopilot: "running",
          opsAutopilot: "paused",
          contentAutopilot: "running",
        };

        break;

      case "normal":
        allAutopilotsForcedOff = false;
        aiGenerationBlocked = false;
        autopilotStates = {
          dataAutopilot: "running",
          seoAutopilot: "running",
          opsAutopilot: "running",
          contentAutopilot: "running",
        };

        break;
    }

    lastHeartbeat = new Date();
  },

  async onModeChange(config: SecurityModeConfig): Promise<void> {
    securityMode = config.mode;

    const { restrictions } = config;

    if (restrictions.autopilotAllowed) {
      allAutopilotsForcedOff = false;
      autopilotStates = {
        dataAutopilot: "running",
        seoAutopilot: "running",
        opsAutopilot: "running",
        contentAutopilot: "running",
      };
    } else {
      allAutopilotsForcedOff = true;
      autopilotStates = {
        dataAutopilot: "blocked",
        seoAutopilot: "blocked",
        opsAutopilot: "blocked",
        contentAutopilot: "blocked",
      };
    }

    // In lockdown, block AI generation
    if (config.mode === "lockdown") {
      aiGenerationBlocked = true;
    } else {
      aiGenerationBlocked = false;
    }

    lastHeartbeat = new Date();
  },

  async onEmergencyStop(): Promise<void> {
    allAutopilotsForcedOff = true;
    aiGenerationBlocked = true;
    autopilotStates = {
      dataAutopilot: "blocked",
      seoAutopilot: "blocked",
      opsAutopilot: "blocked",
      contentAutopilot: "blocked",
    };

    // Would terminate running AI requests, cancel scheduled jobs, etc.

    lastHeartbeat = new Date();
  },

  async getStatus(): Promise<AdapterStatus> {
    const pendingActions = Object.values(autopilotStates).filter(s => s === "paused").length;

    return {
      name: "autonomy-system",
      connected: true,
      lastHeartbeat,
      pendingActions,
      blocked: allAutopilotsForcedOff,
    };
  },
};

// Export utility functions for use by autonomy systems
export function isAutopilotAllowed(type: keyof AutopilotStates): boolean {
  return autopilotStates[type] === "running";
}

export function isAnyAutopilotBlocked(): boolean {
  return allAutopilotsForcedOff;
}

export function isAIGenerationAllowed(): boolean {
  return !aiGenerationBlocked;
}

export function getAutonomyAdapterStatus(): {
  securityMode: SecurityMode;
  autopilotStates: AutopilotStates;
  allAutopilotsForcedOff: boolean;
  aiGenerationBlocked: boolean;
} {
  return {
    securityMode,
    autopilotStates: { ...autopilotStates },
    allAutopilotsForcedOff,
    aiGenerationBlocked,
  };
}

export function getAutopilotState(
  type: keyof AutopilotStates
): AutopilotStates[keyof AutopilotStates] {
  return autopilotStates[type];
}
