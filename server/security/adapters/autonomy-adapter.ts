/**
 * Autonomy Adapter
 *
 * Integrates Security with Autonomy Policy system:
 * - Forces all autopilots OFF in lockdown mode
 * - Coordinates with policy engine
 * - Manages AI generation permissions
 */

import { SystemAdapter, AdapterStatus, SecurityModeConfig, ThreatState, SecurityMode } from '../authority/types';

// Track state
let securityMode: SecurityMode = 'enforce';
let allAutopilotsForcedOff = false;
let aiGenerationBlocked = false;
let lastHeartbeat = new Date();

// Autopilot states
interface AutopilotStates {
  dataAutopilot: 'running' | 'paused' | 'blocked';
  seoAutopilot: 'running' | 'paused' | 'blocked';
  opsAutopilot: 'running' | 'paused' | 'blocked';
  contentAutopilot: 'running' | 'paused' | 'blocked';
}

let autopilotStates: AutopilotStates = {
  dataAutopilot: 'running',
  seoAutopilot: 'running',
  opsAutopilot: 'running',
  contentAutopilot: 'running',
};

export const AutonomyAdapter: SystemAdapter = {
  name: 'autonomy-system',
  enabled: true,

  async onThreatEscalation(threat: ThreatState): Promise<void> {
    console.log(`[AutonomyAdapter] Threat escalation: ${threat.level}`);

    switch (threat.level) {
      case 'critical':
        // Block everything
        allAutopilotsForcedOff = true;
        aiGenerationBlocked = true;
        autopilotStates = {
          dataAutopilot: 'blocked',
          seoAutopilot: 'blocked',
          opsAutopilot: 'blocked',
          contentAutopilot: 'blocked',
        };
        console.log('[AutonomyAdapter] CRITICAL: All autopilots BLOCKED, AI generation BLOCKED');
        break;

      case 'high':
        // Pause all autopilots
        allAutopilotsForcedOff = true;
        aiGenerationBlocked = true;
        autopilotStates = {
          dataAutopilot: 'paused',
          seoAutopilot: 'paused',
          opsAutopilot: 'paused',
          contentAutopilot: 'paused',
        };
        console.log('[AutonomyAdapter] HIGH: All autopilots PAUSED');
        break;

      case 'elevated':
        // Pause high-risk autopilots only
        allAutopilotsForcedOff = false;
        aiGenerationBlocked = false;
        autopilotStates = {
          dataAutopilot: 'paused',
          seoAutopilot: 'running',
          opsAutopilot: 'paused',
          contentAutopilot: 'running',
        };
        console.log('[AutonomyAdapter] ELEVATED: High-risk autopilots paused');
        break;

      case 'normal':
        allAutopilotsForcedOff = false;
        aiGenerationBlocked = false;
        autopilotStates = {
          dataAutopilot: 'running',
          seoAutopilot: 'running',
          opsAutopilot: 'running',
          contentAutopilot: 'running',
        };
        console.log('[AutonomyAdapter] NORMAL: All autopilots resumed');
        break;
    }

    lastHeartbeat = new Date();
  },

  async onModeChange(config: SecurityModeConfig): Promise<void> {
    console.log(`[AutonomyAdapter] Mode change: ${config.mode}`);
    securityMode = config.mode;

    const { restrictions } = config;

    if (!restrictions.autopilotAllowed) {
      allAutopilotsForcedOff = true;
      autopilotStates = {
        dataAutopilot: 'blocked',
        seoAutopilot: 'blocked',
        opsAutopilot: 'blocked',
        contentAutopilot: 'blocked',
      };
      console.log('[AutonomyAdapter] All autopilots BLOCKED by security mode');
    } else {
      allAutopilotsForcedOff = false;
      autopilotStates = {
        dataAutopilot: 'running',
        seoAutopilot: 'running',
        opsAutopilot: 'running',
        contentAutopilot: 'running',
      };
      console.log('[AutonomyAdapter] Autopilots ENABLED');
    }

    // In lockdown, block AI generation
    if (config.mode === 'lockdown') {
      aiGenerationBlocked = true;
      console.log('[AutonomyAdapter] LOCKDOWN: AI generation BLOCKED');
    } else {
      aiGenerationBlocked = false;
    }

    lastHeartbeat = new Date();
  },

  async onEmergencyStop(): Promise<void> {
    console.log('[AutonomyAdapter] EMERGENCY STOP');

    allAutopilotsForcedOff = true;
    aiGenerationBlocked = true;
    autopilotStates = {
      dataAutopilot: 'blocked',
      seoAutopilot: 'blocked',
      opsAutopilot: 'blocked',
      contentAutopilot: 'blocked',
    };

    // Would terminate running AI requests, cancel scheduled jobs, etc.
    console.log('[AutonomyAdapter] All autonomous operations HALTED');

    lastHeartbeat = new Date();
  },

  async getStatus(): Promise<AdapterStatus> {
    const pendingActions = Object.values(autopilotStates).filter(s => s === 'paused').length;

    return {
      name: 'autonomy-system',
      connected: true,
      lastHeartbeat,
      pendingActions,
      blocked: allAutopilotsForcedOff,
    };
  },
};

// Export utility functions for use by autonomy systems
export function isAutopilotAllowed(type: keyof AutopilotStates): boolean {
  return autopilotStates[type] === 'running';
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

export function getAutopilotState(type: keyof AutopilotStates): AutopilotStates[keyof AutopilotStates] {
  return autopilotStates[type];
}

console.log('[AutonomyAdapter] Loaded');
