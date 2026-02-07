/**
 * SEO Adapter
 *
 * Integrates Security with SEO Autopilot system:
 * - Pauses SEO publishing on threat escalation
 * - Blocks content optimization in lockdown
 * - Coordinates with content publishing pipeline
 */

import { SystemAdapter, AdapterStatus, SecurityModeConfig, ThreatState } from "../authority/types";

// Track state
let isPaused = false;
let isPublishingBlocked = false;
let lastHeartbeat = new Date();
let queuedPublishes = 0;

export const SEOAdapter: SystemAdapter = {
  name: "seo-autopilot",
  enabled: true,

  async onThreatEscalation(threat: ThreatState): Promise<void> {
    switch (threat.level) {
      case "critical":
      case "high":
        // Immediately block all publishing and pause autopilot
        isPaused = true;
        isPublishingBlocked = true;

        break;

      case "elevated":
        // Pause autopilot, allow manual publishing
        isPaused = true;
        isPublishingBlocked = false;

        break;

      case "normal":
        isPaused = false;
        isPublishingBlocked = false;

        break;
    }

    lastHeartbeat = new Date();
  },

  async onModeChange(config: SecurityModeConfig): Promise<void> {
    const { restrictions } = config;

    if (restrictions.autopilotAllowed) {
      isPaused = false;
    } else {
      isPaused = true;
    }

    // In lockdown, block all publishing
    if (config.mode === "lockdown") {
      isPublishingBlocked = true;
    } else {
      isPublishingBlocked = false;
    }

    lastHeartbeat = new Date();
  },

  async onEmergencyStop(): Promise<void> {
    isPaused = true;
    isPublishingBlocked = true;

    // Would cancel pending publishes, stop crawlers, etc.

    lastHeartbeat = new Date();
  },

  async getStatus(): Promise<AdapterStatus> {
    return {
      name: "seo-autopilot",
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
