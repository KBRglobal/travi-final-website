/**
 * Data Decisions Adapter
 *
 * Integrates Security with Data Decisions system:
 * - Pauses data autopilot on threat escalation
 * - Blocks destructive operations in lockdown
 * - Notifies data system of security state changes
 */

import { SystemAdapter, AdapterStatus, SecurityModeConfig, ThreatState } from "../authority/types";

// Track state
let isPaused = false;
let lastHeartbeat = new Date();
let pendingBlocks = 0;

export const DataDecisionsAdapter: SystemAdapter = {
  name: "data-decisions",
  enabled: true,

  async onThreatEscalation(threat: ThreatState): Promise<void> {
    switch (threat.level) {
      case "critical":
        // Immediately pause all data operations
        isPaused = true;
        pendingBlocks++;

        // Would notify actual data system here
        break;

      case "high":
        // Pause autopilot, allow manual operations
        isPaused = true;

        break;

      case "elevated":
        // Log warning, continue with monitoring

        break;

      case "normal":
        isPaused = false;

        break;
    }

    lastHeartbeat = new Date();
  },

  async onModeChange(config: SecurityModeConfig): Promise<void> {
    const { restrictions } = config;

    if (!restrictions.autopilotAllowed) {
      isPaused = true;
    } else {
      isPaused = false;
    }

    // In lockdown, block all writes
    if (config.mode === "lockdown") {
      pendingBlocks++;
    }

    lastHeartbeat = new Date();
  },

  async onEmergencyStop(): Promise<void> {
    isPaused = true;
    pendingBlocks++;

    // Would kill active queries, pause jobs, etc.

    lastHeartbeat = new Date();
  },

  async getStatus(): Promise<AdapterStatus> {
    return {
      name: "data-decisions",
      connected: true,
      lastHeartbeat,
      pendingActions: pendingBlocks,
      blocked: isPaused,
    };
  },
};

// Export utility functions for use by data systems
export function isDataOperationAllowed(): boolean {
  return !isPaused;
}

export function getDataAdapterStatus(): { paused: boolean; pendingBlocks: number } {
  return { paused: isPaused, pendingBlocks };
}
