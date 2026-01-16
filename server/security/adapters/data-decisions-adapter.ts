/**
 * Data Decisions Adapter
 *
 * Integrates Security with Data Decisions system:
 * - Pauses data autopilot on threat escalation
 * - Blocks destructive operations in lockdown
 * - Notifies data system of security state changes
 */

import { SystemAdapter, AdapterStatus, SecurityModeConfig, ThreatState } from '../authority/types';

// Track state
let isPaused = false;
let lastHeartbeat = new Date();
let pendingBlocks = 0;

export const DataDecisionsAdapter: SystemAdapter = {
  name: 'data-decisions',
  enabled: true,

  async onThreatEscalation(threat: ThreatState): Promise<void> {
    console.log(`[DataDecisionsAdapter] Threat escalation: ${threat.level}`);

    switch (threat.level) {
      case 'critical':
        // Immediately pause all data operations
        isPaused = true;
        pendingBlocks++;
        console.log('[DataDecisionsAdapter] CRITICAL: All data operations PAUSED');
        // Would notify actual data system here
        break;

      case 'high':
        // Pause autopilot, allow manual operations
        isPaused = true;
        console.log('[DataDecisionsAdapter] HIGH: Data autopilot PAUSED');
        break;

      case 'elevated':
        // Log warning, continue with monitoring
        console.log('[DataDecisionsAdapter] ELEVATED: Enhanced monitoring active');
        break;

      case 'normal':
        isPaused = false;
        console.log('[DataDecisionsAdapter] NORMAL: Operations resumed');
        break;
    }

    lastHeartbeat = new Date();
  },

  async onModeChange(config: SecurityModeConfig): Promise<void> {
    console.log(`[DataDecisionsAdapter] Mode change: ${config.mode}`);

    const { restrictions } = config;

    if (!restrictions.autopilotAllowed) {
      isPaused = true;
      console.log('[DataDecisionsAdapter] Autopilot DISABLED by security mode');
    } else {
      isPaused = false;
      console.log('[DataDecisionsAdapter] Autopilot ENABLED');
    }

    // In lockdown, block all writes
    if (config.mode === 'lockdown') {
      pendingBlocks++;
      console.log('[DataDecisionsAdapter] LOCKDOWN: All write operations blocked');
    }

    lastHeartbeat = new Date();
  },

  async onEmergencyStop(): Promise<void> {
    console.log('[DataDecisionsAdapter] EMERGENCY STOP');

    isPaused = true;
    pendingBlocks++;

    // Would kill active queries, pause jobs, etc.
    console.log('[DataDecisionsAdapter] All data operations HALTED');

    lastHeartbeat = new Date();
  },

  async getStatus(): Promise<AdapterStatus> {
    return {
      name: 'data-decisions',
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

console.log('[DataDecisionsAdapter] Loaded');
