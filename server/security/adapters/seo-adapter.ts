/**
 * SEO Adapter
 *
 * Integrates Security with SEO Autopilot system:
 * - Pauses SEO publishing on threat escalation
 * - Blocks content optimization in lockdown
 * - Coordinates with content publishing pipeline
 */

import { SystemAdapter, AdapterStatus, SecurityModeConfig, ThreatState } from '../authority/types';

// Track state
let isPaused = false;
let isPublishingBlocked = false;
let lastHeartbeat = new Date();
let queuedPublishes = 0;

export const SEOAdapter: SystemAdapter = {
  name: 'seo-autopilot',
  enabled: true,

  async onThreatEscalation(threat: ThreatState): Promise<void> {
    console.log(`[SEOAdapter] Threat escalation: ${threat.level}`);

    switch (threat.level) {
      case 'critical':
        // Immediately block all publishing
        isPaused = true;
        isPublishingBlocked = true;
        console.log('[SEOAdapter] CRITICAL: All SEO operations and publishing BLOCKED');
        break;

      case 'high':
        // Pause autopilot, block auto-publishing
        isPaused = true;
        isPublishingBlocked = true;
        console.log('[SEOAdapter] HIGH: SEO autopilot PAUSED, publishing blocked');
        break;

      case 'elevated':
        // Pause autopilot, allow manual publishing
        isPaused = true;
        isPublishingBlocked = false;
        console.log('[SEOAdapter] ELEVATED: SEO autopilot PAUSED, manual publishing allowed');
        break;

      case 'normal':
        isPaused = false;
        isPublishingBlocked = false;
        console.log('[SEOAdapter] NORMAL: SEO operations resumed');
        break;
    }

    lastHeartbeat = new Date();
  },

  async onModeChange(config: SecurityModeConfig): Promise<void> {
    console.log(`[SEOAdapter] Mode change: ${config.mode}`);

    const { restrictions } = config;

    if (!restrictions.autopilotAllowed) {
      isPaused = true;
      console.log('[SEOAdapter] SEO autopilot DISABLED by security mode');
    } else {
      isPaused = false;
      console.log('[SEOAdapter] SEO autopilot ENABLED');
    }

    // In lockdown, block all publishing
    if (config.mode === 'lockdown') {
      isPublishingBlocked = true;
      console.log('[SEOAdapter] LOCKDOWN: All publishing blocked');
    } else {
      isPublishingBlocked = false;
    }

    lastHeartbeat = new Date();
  },

  async onEmergencyStop(): Promise<void> {
    console.log('[SEOAdapter] EMERGENCY STOP');

    isPaused = true;
    isPublishingBlocked = true;

    // Would cancel pending publishes, stop crawlers, etc.
    console.log('[SEOAdapter] All SEO operations HALTED');

    lastHeartbeat = new Date();
  },

  async getStatus(): Promise<AdapterStatus> {
    return {
      name: 'seo-autopilot',
      connected: true,
      lastHeartbeat,
      pendingActions: queuedPublishes,
      blocked: isPaused || isPublishingBlocked,
    };
  },
};

// Export utility functions for use by SEO systems
export function isSEOAutopilotAllowed(): boolean {
  return !isPaused;
}

export function isPublishingAllowed(): boolean {
  return !isPublishingBlocked;
}

export function getSEOAdapterStatus(): {
  autopilotPaused: boolean;
  publishingBlocked: boolean;
  queuedPublishes: number;
} {
  return {
    autopilotPaused: isPaused,
    publishingBlocked: isPublishingBlocked,
    queuedPublishes,
  };
}

export function queuePublish(): void {
  if (isPublishingBlocked) {
    queuedPublishes++;
  }
}

export function processQueue(): number {
  const processed = queuedPublishes;
  queuedPublishes = 0;
  return processed;
}

console.log('[SEOAdapter] Loaded');
