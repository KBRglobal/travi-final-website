/**
 * Adapter Manager - Coordinates all system adapters
 *
 * Central hub for:
 * - Registering adapters
 * - Broadcasting security events
 * - Health monitoring
 * - Emergency stop coordination
 */

import { SystemAdapter, AdapterStatus, SecurityModeConfig, ThreatState } from "../authority/types";
import { SecuritySeverity, logSecurityEvent, SecurityEventType } from "../audit-logger";

// ============================================================================
// ADAPTER REGISTRY
// ============================================================================

const registeredAdapters = new Map<string, SystemAdapter>();
const adapterHealth = new Map<string, { healthy: boolean; lastCheck: Date; errors: string[] }>();

// Event queue for when adapters are temporarily unavailable
const MAX_EVENT_QUEUE = 100;
const pendingEvents: Array<{
  type: "threat" | "mode" | "emergency";
  payload: any;
  timestamp: Date;
  attempts: number;
}> = [];

// ============================================================================
// ADAPTER MANAGER
// ============================================================================

export const AdapterManager = {
  /**
   * Register a new adapter
   */
  register(adapter: SystemAdapter): void {
    if (registeredAdapters.has(adapter.name)) {
    }

    registeredAdapters.set(adapter.name, adapter);
    adapterHealth.set(adapter.name, {
      healthy: true,
      lastCheck: new Date(),
      errors: [],
    });
  },

  /**
   * Unregister an adapter
   */
  unregister(name: string): boolean {
    const removed = registeredAdapters.delete(name);
    adapterHealth.delete(name);

    if (removed) {
    }

    return removed;
  },

  /**
   * Get all registered adapters
   */
  getAdapters(): SystemAdapter[] {
    return Array.from(registeredAdapters.values());
  },

  /**
   * Get adapter by name
   */
  getAdapter(name: string): SystemAdapter | undefined {
    return registeredAdapters.get(name);
  },

  /**
   * Broadcast threat escalation to all adapters
   */
  async broadcastThreatEscalation(threat: ThreatState): Promise<{
    success: boolean;
    results: Record<string, { success: boolean; error?: string }>;
  }> {
    const results: Record<string, { success: boolean; error?: string }> = {};
    let allSuccess = true;

    for (const [name, adapter] of registeredAdapters) {
      if (!adapter.enabled) {
        results[name] = { success: true, error: "Adapter disabled" };
        continue;
      }

      try {
        await adapter.onThreatEscalation(threat);
        results[name] = { success: true };
        this.updateHealth(name, true);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        results[name] = { success: false, error: errorMsg };
        this.updateHealth(name, false, errorMsg);
        allSuccess = false;
      }
    }

    // Log the broadcast
    await logSecurityEvent({
      type: SecurityEventType.SETTINGS_CHANGED,
      severity: threat.level === "critical" ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH,
      ipAddress: "system",
      resource: "adapters",
      action: "threat_broadcast",
      details: { threatLevel: threat.level, results },
      success: allSuccess,
    });

    return { success: allSuccess, results };
  },

  /**
   * Broadcast mode change to all adapters
   */
  async broadcastModeChange(config: SecurityModeConfig): Promise<{
    success: boolean;
    results: Record<string, { success: boolean; error?: string }>;
  }> {
    const results: Record<string, { success: boolean; error?: string }> = {};
    let allSuccess = true;

    for (const [name, adapter] of registeredAdapters) {
      if (!adapter.enabled) {
        results[name] = { success: true, error: "Adapter disabled" };
        continue;
      }

      try {
        await adapter.onModeChange(config);
        results[name] = { success: true };
        this.updateHealth(name, true);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        results[name] = { success: false, error: errorMsg };
        this.updateHealth(name, false, errorMsg);
        allSuccess = false;
      }
    }

    return { success: allSuccess, results };
  },

  /**
   * Execute emergency stop across all adapters
   */
  async executeEmergencyStop(): Promise<{
    success: boolean;
    results: Record<string, { success: boolean; error?: string }>;
  }> {
    const results: Record<string, { success: boolean; error?: string }> = {};
    let allSuccess = true;

    // Execute in parallel for speed
    const promises = Array.from(registeredAdapters.entries()).map(async ([name, adapter]) => {
      if (!adapter.enabled) {
        return { name, success: true, error: "Adapter disabled" };
      }

      try {
        await adapter.onEmergencyStop();
        return { name, success: true };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        return { name, success: false, error: errorMsg };
      }
    });

    const outcomes = await Promise.all(promises);

    outcomes.forEach(outcome => {
      results[outcome.name] = { success: outcome.success, error: outcome.error };
      if (!outcome.success) allSuccess = false;
      this.updateHealth(outcome.name, outcome.success, outcome.error);
    });

    // Log the emergency stop
    await logSecurityEvent({
      type: SecurityEventType.SETTINGS_CHANGED,
      severity: SecuritySeverity.CRITICAL,
      ipAddress: "system",
      resource: "adapters",
      action: "emergency_stop",
      details: { results },
      success: allSuccess,
    });

    return { success: allSuccess, results };
  },

  /**
   * Get health status of all adapters
   */
  async getHealthStatus(): Promise<Record<string, AdapterStatus>> {
    const status: Record<string, AdapterStatus> = {};

    for (const [name, adapter] of registeredAdapters) {
      try {
        status[name] = await adapter.getStatus();
      } catch (error) {
        status[name] = {
          name,
          connected: false,
          lastHeartbeat: new Date(),
          pendingActions: 0,
          blocked: true,
        };
      }
    }

    return status;
  },

  /**
   * Update health status for an adapter
   */
  updateHealth(name: string, healthy: boolean, error?: string): void {
    const health = adapterHealth.get(name);
    if (health) {
      health.healthy = healthy;
      health.lastCheck = new Date();
      if (error) {
        health.errors.push(`${new Date().toISOString()}: ${error}`);
        // Keep last 10 errors
        if (health.errors.length > 10) {
          health.errors.shift();
        }
      }
    }
  },

  /**
   * Get adapter health summary
   */
  getHealthSummary(): {
    totalAdapters: number;
    healthyAdapters: number;
    unhealthyAdapters: string[];
    recentErrors: string[];
  } {
    const unhealthy: string[] = [];
    const recentErrors: string[] = [];

    adapterHealth.forEach((health, name) => {
      if (!health.healthy) {
        unhealthy.push(name);
      }
      if (health.errors.length > 0) {
        recentErrors.push(`${name}: ${health.errors[health.errors.length - 1]}`);
      }
    });

    return {
      totalAdapters: registeredAdapters.size,
      healthyAdapters: registeredAdapters.size - unhealthy.length,
      unhealthyAdapters: unhealthy,
      recentErrors: recentErrors.slice(-5),
    };
  },

  /**
   * Queue event for retry
   */
  queueEvent(type: "threat" | "mode" | "emergency", payload: any): void {
    if (pendingEvents.length >= MAX_EVENT_QUEUE) {
      pendingEvents.shift();
    }

    pendingEvents.push({
      type,
      payload,
      timestamp: new Date(),
      attempts: 0,
    });
  },

  /**
   * Process pending events
   */
  async processPendingEvents(): Promise<number> {
    let processed = 0;

    while (pendingEvents.length > 0 && processed < 10) {
      const event = pendingEvents[0];

      if (event.attempts >= 3) {
        pendingEvents.shift();

        continue;
      }

      event.attempts++;

      try {
        switch (event.type) {
          case "threat":
            await this.broadcastThreatEscalation(event.payload);
            break;
          case "mode":
            await this.broadcastModeChange(event.payload);
            break;
          case "emergency":
            await this.executeEmergencyStop();
            break;
        }

        pendingEvents.shift();
        processed++;
      } catch (error) {
        break;
      }
    }

    return processed;
  },
};

// Convenience exports
export const registerAdapter = AdapterManager.register.bind(AdapterManager);
export const unregisterAdapter = AdapterManager.unregister.bind(AdapterManager);

// Process pending events periodically - only when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== "true" && process.env.REPLIT_DEPLOYMENT !== "1") {
  setInterval(() => {
    if (pendingEvents.length > 0) {
      AdapterManager.processPendingEvents();
    }
  }, 30 * 1000);
}
