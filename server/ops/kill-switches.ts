/**
 * Operations & Reliability - Kill Switch Framework
 *
 * FEATURE 5: Centralized kill switches per subsystem
 * - search, AEO, Octopus, monetization
 * - Runtime-toggable via env or DB
 * - Immediate effect on feature availability
 *
 * Feature flag: ENABLE_KILL_SWITCHES=true
 */

import { log } from '../lib/logger';
import { getOpsConfig } from './config';
import type { Subsystem, KillSwitchState } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[KillSwitch] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[KillSwitch] ${msg}`, data),
  alert: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[KillSwitch][ALERT] ${msg}`, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[KillSwitch][AUDIT] ${msg}`, data),
};

// Environment variable names for kill switches
const ENV_KILL_SWITCHES: Record<Subsystem, string> = {
  search: 'KILL_SEARCH',
  aeo: 'KILL_AEO',
  octopus: 'KILL_OCTOPUS',
  monetization: 'KILL_MONETIZATION',
  chat: 'KILL_CHAT',
};

interface KillSwitchEntry {
  subsystem: Subsystem;
  enabled: boolean;
  reason?: string;
  enabledAt?: Date;
  enabledBy?: string;
  source: 'env' | 'db' | 'api';
  overrideExpiry?: Date;
}

interface KillSwitchEvent {
  subsystem: Subsystem;
  action: 'enabled' | 'disabled';
  source: 'env' | 'db' | 'api';
  reason?: string;
  timestamp: Date;
  enabledBy?: string;
}

// Bounded event history
const MAX_EVENT_HISTORY = 200;

class KillSwitchManager {
  private switches: Map<Subsystem, KillSwitchEntry> = new Map();
  private eventHistory: KillSwitchEvent[] = [];
  private dbCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastDbCheck?: Date;
  private isRunning = false;

  constructor() {
    this.initializeSwitches();
  }

  /**
   * Initialize all kill switches from environment
   */
  private initializeSwitches(): void {
    const subsystems: Subsystem[] = ['search', 'aeo', 'octopus', 'monetization', 'chat'];

    for (const subsystem of subsystems) {
      const envKey = ENV_KILL_SWITCHES[subsystem];
      const envValue = process.env[envKey];
      const enabled = envValue === 'true' || envValue === '1';

      this.switches.set(subsystem, {
        subsystem,
        enabled,
        source: 'env',
        reason: enabled ? `Enabled via ${envKey} environment variable` : undefined,
        enabledAt: enabled ? new Date() : undefined,
      });

      if (enabled) {
        logger.warn('Kill switch enabled from environment', {
          subsystem,
          envKey,
        });
      }
    }

    logger.info('Kill switches initialized', {
      subsystems: Array.from(this.switches.entries()).map(([s, e]) => ({
        subsystem: s,
        enabled: e.enabled,
      })),
    });
  }

  /**
   * Check if a subsystem is killed (disabled)
   */
  isKilled(subsystem: Subsystem): boolean {
    const config = getOpsConfig();

    // If kill switches feature is disabled, nothing is killed
    if (!config.killSwitchesEnabled) {
      return false;
    }

    const entry = this.switches.get(subsystem);
    if (!entry) return false;

    // Check if override has expired
    if (entry.overrideExpiry && entry.overrideExpiry < new Date()) {
      this.disable(subsystem, 'api', 'Override expired');
      return false;
    }

    return entry.enabled;
  }

  /**
   * Get the state of a kill switch
   */
  getState(subsystem: Subsystem): KillSwitchState | undefined {
    const entry = this.switches.get(subsystem);
    if (!entry) return undefined;

    return {
      subsystem: entry.subsystem,
      enabled: entry.enabled,
      reason: entry.reason,
      enabledAt: entry.enabledAt,
      source: entry.source,
    };
  }

  /**
   * Get all kill switch states
   */
  getAllStates(): KillSwitchState[] {
    return Array.from(this.switches.values()).map(entry => ({
      subsystem: entry.subsystem,
      enabled: entry.enabled,
      reason: entry.reason,
      enabledAt: entry.enabledAt,
      source: entry.source,
    }));
  }

  /**
   * Get list of killed subsystems
   */
  getKilledSubsystems(): Subsystem[] {
    const config = getOpsConfig();
    if (!config.killSwitchesEnabled) return [];

    return Array.from(this.switches.values())
      .filter(e => e.enabled)
      .map(e => e.subsystem);
  }

  /**
   * Enable a kill switch (disable subsystem)
   */
  enable(
    subsystem: Subsystem,
    source: 'env' | 'db' | 'api',
    reason: string,
    enabledBy?: string,
    durationMs?: number
  ): boolean {
    const entry = this.switches.get(subsystem);
    if (!entry) return false;

    if (entry.enabled && entry.source === 'env' && source !== 'env') {
      logger.warn('Cannot override env-based kill switch', { subsystem, source });
      return false;
    }

    entry.enabled = true;
    entry.source = source;
    entry.reason = reason;
    entry.enabledAt = new Date();
    entry.enabledBy = enabledBy;
    entry.overrideExpiry = durationMs ? new Date(Date.now() + durationMs) : undefined;

    this.recordEvent({
      subsystem,
      action: 'enabled',
      source,
      reason,
      timestamp: new Date(),
      enabledBy,
    });

    logger.alert('Kill switch ENABLED', {
      subsystem,
      source,
      reason,
      enabledBy,
      expiresAt: entry.overrideExpiry?.toISOString(),
    });

    logger.audit('KILL_SWITCH_ENABLED', {
      subsystem,
      source,
      reason,
      enabledBy,
    });

    return true;
  }

  /**
   * Disable a kill switch (enable subsystem)
   */
  disable(subsystem: Subsystem, source: 'env' | 'db' | 'api', reason?: string): boolean {
    const entry = this.switches.get(subsystem);
    if (!entry) return false;

    if (!entry.enabled) return true; // Already disabled

    if (entry.source === 'env' && source !== 'env') {
      logger.warn('Cannot disable env-based kill switch via API', { subsystem, source });
      return false;
    }

    entry.enabled = false;
    entry.source = source;
    entry.reason = undefined;
    entry.enabledAt = undefined;
    entry.enabledBy = undefined;
    entry.overrideExpiry = undefined;

    this.recordEvent({
      subsystem,
      action: 'disabled',
      source,
      reason,
      timestamp: new Date(),
    });

    logger.info('Kill switch DISABLED', {
      subsystem,
      source,
      reason,
    });

    logger.audit('KILL_SWITCH_DISABLED', {
      subsystem,
      source,
      reason,
    });

    return true;
  }

  /**
   * Toggle a kill switch
   */
  toggle(subsystem: Subsystem, source: 'api', reason: string, enabledBy?: string): boolean {
    const entry = this.switches.get(subsystem);
    if (!entry) return false;

    if (entry.enabled) {
      return this.disable(subsystem, source, reason);
    } else {
      return this.enable(subsystem, source, reason, enabledBy);
    }
  }

  /**
   * Record kill switch event
   */
  private recordEvent(event: KillSwitchEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > MAX_EVENT_HISTORY) {
      this.eventHistory.shift();
    }
  }

  /**
   * Check for kill switch updates in database
   */
  async checkDatabaseSwitches(): Promise<void> {
    try {
      const { db } = await import('../db');
      const { sql } = await import('drizzle-orm');

      // Query kill switches table (if exists)
      const result = await db.execute(sql`
        SELECT subsystem, enabled, reason, enabled_by, expires_at
        FROM kill_switches
        WHERE enabled = true
      `).catch(() => ({ rows: [] }));

      for (const row of result.rows as Array<{
        subsystem: string;
        enabled: boolean;
        reason: string;
        enabled_by: string;
        expires_at: Date | null;
      }>) {
        const subsystem = row.subsystem as Subsystem;
        const entry = this.switches.get(subsystem);

        if (entry && !entry.enabled && entry.source !== 'env') {
          // Check expiry
          if (row.expires_at && new Date(row.expires_at) < new Date()) {
            continue;
          }

          this.enable(subsystem, 'db', row.reason, row.enabled_by);
        }
      }

      this.lastDbCheck = new Date();
    } catch (error) {
      // Table might not exist - that's OK
      logger.info('Database kill switch check skipped', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Refresh switches from environment
   */
  refreshFromEnvironment(): void {
    for (const [subsystem, envKey] of Object.entries(ENV_KILL_SWITCHES)) {
      const envValue = process.env[envKey];
      const shouldBeEnabled = envValue === 'true' || envValue === '1';

      const entry = this.switches.get(subsystem as Subsystem);
      if (!entry) continue;

      if (shouldBeEnabled && !entry.enabled) {
        this.enable(subsystem as Subsystem, 'env', `Enabled via ${envKey}`);
      } else if (!shouldBeEnabled && entry.enabled && entry.source === 'env') {
        this.disable(subsystem as Subsystem, 'env', `Disabled via ${envKey}`);
      }
    }
  }

  /**
   * Get event history
   */
  getEventHistory(limit: number = 50): KillSwitchEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get summary statistics
   */
  getStats(): {
    totalSubsystems: number;
    killedCount: number;
    activeCount: number;
    eventCount: number;
    lastDbCheck?: Date;
  } {
    const killed = Array.from(this.switches.values()).filter(e => e.enabled).length;

    return {
      totalSubsystems: this.switches.size,
      killedCount: killed,
      activeCount: this.switches.size - killed,
      eventCount: this.eventHistory.length,
      lastDbCheck: this.lastDbCheck,
    };
  }

  /**
   * Start automatic database polling
   */
  start(): void {
    if (this.isRunning) return;

    const config = getOpsConfig();
    if (!config.killSwitchesEnabled) {
      logger.info('Kill switches disabled by feature flag');
      return;
    }

    this.isRunning = true;

    // Check database every 30 seconds
    this.dbCheckInterval = setInterval(() => {
      this.checkDatabaseSwitches().catch(err => {
        logger.warn('Database kill switch check failed', { error: String(err) });
      });
    }, 30000);

    // Initial check
    this.checkDatabaseSwitches().catch(() => {
      // Silent fail on initial - table might not exist
    });

    logger.info('Kill switch manager started');
  }

  /**
   * Stop automatic polling
   */
  stop(): void {
    if (this.dbCheckInterval) {
      clearInterval(this.dbCheckInterval);
      this.dbCheckInterval = null;
    }
    this.isRunning = false;
    logger.info('Kill switch manager stopped');
  }

  /**
   * Check if manager is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
let instance: KillSwitchManager | null = null;

export function getKillSwitchManager(): KillSwitchManager {
  if (!instance) {
    instance = new KillSwitchManager();
  }
  return instance;
}

export function resetKillSwitchManager(): void {
  if (instance) {
    instance.stop();
  }
  instance = null;
}

// Convenience functions
export function isSubsystemKilled(subsystem: Subsystem): boolean {
  return getKillSwitchManager().isKilled(subsystem);
}

export function enableKillSwitch(
  subsystem: Subsystem,
  reason: string,
  enabledBy?: string,
  durationMs?: number
): boolean {
  return getKillSwitchManager().enable(subsystem, 'api', reason, enabledBy, durationMs);
}

export function disableKillSwitch(subsystem: Subsystem, reason?: string): boolean {
  return getKillSwitchManager().disable(subsystem, 'api', reason);
}

export { KillSwitchManager, KillSwitchEvent };
