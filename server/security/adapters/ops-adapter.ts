/**
 * Ops Adapter
 *
 * Integrates Security with Operations system:
 * - Freezes bulk operations on threat escalation
 * - Blocks deployments and cutovers in lockdown
 * - Coordinates with kill switches
 */

import { SystemAdapter, AdapterStatus, SecurityModeConfig, ThreatState } from '../authority/types';

// Track state
let bulkOpsFrozen = false;
let deploymentsBlocked = false;
let cutoversBlocked = false;
let lastHeartbeat = new Date();
let pendingOps = 0;

// Kill switch integration
interface KillSwitchState {
  search: boolean;
  aeo: boolean;
  octopus: boolean;
  monetization: boolean;
  chat: boolean;
}

let killSwitches: KillSwitchState = {
  search: false,
  aeo: false,
  octopus: false,
  monetization: false,
  chat: false,
};

export const OpsAdapter: SystemAdapter = {
  name: 'ops-system',
  enabled: true,

  async onThreatEscalation(threat: ThreatState): Promise<void> {
    console.log(`[OpsAdapter] Threat escalation: ${threat.level}`);

    switch (threat.level) {
      case 'critical':
        // Full lockdown of all operations
        bulkOpsFrozen = true;
        deploymentsBlocked = true;
        cutoversBlocked = true;

        // Activate all kill switches
        killSwitches = {
          search: true,
          aeo: true,
          octopus: true,
          monetization: true,
          chat: true,
        };

        console.log('[OpsAdapter] CRITICAL: All operations FROZEN, kill switches ACTIVATED');
        break;

      case 'high':
        // Block deployments and bulk ops
        bulkOpsFrozen = true;
        deploymentsBlocked = true;
        cutoversBlocked = true;

        // Partial kill switches (high-risk only)
        killSwitches.octopus = true;
        killSwitches.monetization = true;

        console.log('[OpsAdapter] HIGH: Deployments blocked, high-risk systems killed');
        break;

      case 'elevated':
        // Block deployments only
        deploymentsBlocked = true;
        cutoversBlocked = true;

        console.log('[OpsAdapter] ELEVATED: Deployments blocked');
        break;

      case 'normal':
        bulkOpsFrozen = false;
        deploymentsBlocked = false;
        cutoversBlocked = false;

        // Reset kill switches
        killSwitches = {
          search: false,
          aeo: false,
          octopus: false,
          monetization: false,
          chat: false,
        };

        console.log('[OpsAdapter] NORMAL: Operations resumed');
        break;
    }

    lastHeartbeat = new Date();
  },

  async onModeChange(config: SecurityModeConfig): Promise<void> {
    console.log(`[OpsAdapter] Mode change: ${config.mode}`);

    const { restrictions } = config;

    if (!restrictions.bulkOperationsAllowed) {
      bulkOpsFrozen = true;
      console.log('[OpsAdapter] Bulk operations FROZEN');
    } else {
      bulkOpsFrozen = false;
    }

    if (!restrictions.deploymentAllowed) {
      deploymentsBlocked = true;
      cutoversBlocked = true;
      console.log('[OpsAdapter] Deployments and cutovers BLOCKED');
    } else {
      deploymentsBlocked = false;
      cutoversBlocked = false;
    }

    // In lockdown, activate all kill switches
    if (config.mode === 'lockdown') {
      killSwitches = {
        search: true,
        aeo: true,
        octopus: true,
        monetization: true,
        chat: true,
      };
      console.log('[OpsAdapter] LOCKDOWN: All kill switches ACTIVATED');
    }

    lastHeartbeat = new Date();
  },

  async onEmergencyStop(): Promise<void> {
    console.log('[OpsAdapter] EMERGENCY STOP');

    bulkOpsFrozen = true;
    deploymentsBlocked = true;
    cutoversBlocked = true;

    // Activate all kill switches
    killSwitches = {
      search: true,
      aeo: true,
      octopus: true,
      monetization: true,
      chat: true,
    };

    // Would cancel running jobs, rollback in-progress deployments, etc.
    console.log('[OpsAdapter] All operations HALTED, kill switches ACTIVATED');

    lastHeartbeat = new Date();
  },

  async getStatus(): Promise<AdapterStatus> {
    return {
      name: 'ops-system',
      connected: true,
      lastHeartbeat,
      pendingActions: pendingOps,
      blocked: bulkOpsFrozen || deploymentsBlocked,
    };
  },
};

// Export utility functions for use by ops systems
export function isBulkOperationAllowed(): boolean {
  return !bulkOpsFrozen;
}

export function isDeploymentAllowed(): boolean {
  return !deploymentsBlocked;
}

export function isCutoverAllowed(): boolean {
  return !cutoversBlocked;
}

export function getKillSwitchState(): KillSwitchState {
  return { ...killSwitches };
}

export function isSystemKilled(system: keyof KillSwitchState): boolean {
  return killSwitches[system];
}

export function getOpsAdapterStatus(): {
  bulkOpsFrozen: boolean;
  deploymentsBlocked: boolean;
  cutoversBlocked: boolean;
  killSwitches: KillSwitchState;
  pendingOps: number;
} {
  return {
    bulkOpsFrozen,
    deploymentsBlocked,
    cutoversBlocked,
    killSwitches: { ...killSwitches },
    pendingOps,
  };
}

export function queueOperation(): void {
  if (bulkOpsFrozen) {
    pendingOps++;
  }
}

console.log('[OpsAdapter] Loaded');
