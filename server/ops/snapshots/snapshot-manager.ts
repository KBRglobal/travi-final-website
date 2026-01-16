/**
 * System State Snapshot & Forensics - Manager
 *
 * FEATURE 5: Capture and store system state for forensics
 *
 * Feature flag: ENABLE_SYSTEM_SNAPSHOTS
 */

import { log } from '../../lib/logger';
import type {
  SnapshotTrigger,
  FeatureFlagSnapshot,
  JobQueueSnapshot,
  AIProviderSnapshot,
  IncidentSnapshot,
  MemorySnapshot,
  SystemSnapshot,
  SnapshotQuery,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[SnapshotManager] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[SnapshotManager] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[SnapshotManager] ${msg}`, undefined, data),
};

// Bounded storage
const MAX_SNAPSHOTS = 200;

// Feature flags to capture
const FEATURE_FLAGS = [
  'ENABLE_SYSTEM_HEALTH',
  'ENABLE_COST_GUARDS',
  'ENABLE_BACKPRESSURE',
  'ENABLE_SELF_HEALING',
  'ENABLE_KILL_SWITCHES',
  'ENABLE_INCIDENT_MANAGEMENT',
  'ENABLE_RELEASE_GUARDS',
  'ENABLE_AI_FAILOVER',
  'ENABLE_DATA_INTEGRITY_WATCHDOG',
  'ENABLE_SYSTEM_SNAPSHOTS',
];

class SnapshotManager {
  private snapshots: Map<string, SystemSnapshot> = new Map();
  private enabled = false;
  private startupTime = Date.now();

  constructor() {
    this.enabled = process.env.ENABLE_SYSTEM_SNAPSHOTS === 'true';

    if (this.enabled) {
      logger.info('System Snapshot manager enabled');
    }
  }

  /**
   * Capture a system snapshot
   */
  async captureSnapshot(
    trigger: SnapshotTrigger,
    triggeredBy?: string,
    metadata: Record<string, unknown> = {}
  ): Promise<SystemSnapshot> {
    const snapshot: SystemSnapshot = {
      id: this.generateId(),
      timestamp: new Date(),
      trigger,
      triggeredBy,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      uptime: Date.now() - this.startupTime,
      featureFlags: this.captureFeatureFlags(),
      jobQueue: await this.captureJobQueue(),
      aiProviders: await this.captureAIProviders(),
      activeIncidents: await this.captureIncidents(),
      memory: this.captureMemory(),
      killSwitches: await this.captureKillSwitches(),
      metadata,
    };

    this.storeSnapshot(snapshot);

    logger.info('Snapshot captured', {
      id: snapshot.id,
      trigger,
      activeIncidents: snapshot.activeIncidents.length,
    });

    return snapshot;
  }

  /**
   * Capture feature flags
   */
  private captureFeatureFlags(): FeatureFlagSnapshot[] {
    return FEATURE_FLAGS.map(name => ({
      name,
      enabled: process.env[name] === 'true',
      value: process.env[name],
    }));
  }

  /**
   * Capture job queue state
   */
  private async captureJobQueue(): Promise<JobQueueSnapshot> {
    try {
      const { getSelfHealingJobManager } = await import('../self-healing');
      const manager = getSelfHealingJobManager();
      const stats = manager.getStats();

      return {
        pending: stats.pending,
        processing: stats.processing,
        completed: stats.completed,
        failed: stats.failed,
        stuck: stats.stuck,
        poison: stats.poison,
      };
    } catch {
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        stuck: 0,
        poison: 0,
      };
    }
  }

  /**
   * Capture AI provider states
   */
  private async captureAIProviders(): Promise<AIProviderSnapshot[]> {
    try {
      const { getAIFailoverController } = await import('../ai-failover');
      const controller = getAIFailoverController();
      const statuses = controller.getProviderStatuses();

      return statuses.map(s => ({
        name: s.provider,
        state: s.state,
        errorRate: s.metrics.errorRate,
        latencyMs: s.metrics.latencyMs,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Capture active incidents
   */
  private async captureIncidents(): Promise<IncidentSnapshot[]> {
    try {
      const { getIncidentManager } = await import('../incidents');
      const manager = getIncidentManager();
      const incidents = manager.getOpenIncidents();

      return incidents.map(i => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        status: i.status,
        detectedAt: i.detectedAt,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Capture memory usage
   */
  private captureMemory(): MemorySnapshot {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);

    return {
      heapUsedMB,
      heapTotalMB,
      externalMB: Math.round(usage.external / 1024 / 1024),
      rsssMB: Math.round(usage.rss / 1024 / 1024),
      percentUsed: heapTotalMB > 0 ? Math.round((heapUsedMB / heapTotalMB) * 100) : 0,
    };
  }

  /**
   * Capture kill switch states
   */
  private async captureKillSwitches(): Promise<Array<{
    subsystem: string;
    enabled: boolean;
    reason?: string;
  }>> {
    try {
      const { getKillSwitchManager } = await import('../kill-switches');
      const manager = getKillSwitchManager();
      const states = manager.getAllStates();

      return states.map(s => ({
        subsystem: s.subsystem,
        enabled: s.enabled,
        reason: s.reason,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Store snapshot with bounded storage
   */
  private storeSnapshot(snapshot: SystemSnapshot): void {
    this.snapshots.set(snapshot.id, snapshot);

    // Prune old snapshots
    if (this.snapshots.size > MAX_SNAPSHOTS) {
      const sorted = Array.from(this.snapshots.entries())
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

      for (const [id] of sorted.slice(0, MAX_SNAPSHOTS / 4)) {
        this.snapshots.delete(id);
      }
    }
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(id: string): SystemSnapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * Query snapshots
   */
  querySnapshots(query: SnapshotQuery = {}): SystemSnapshot[] {
    let results = Array.from(this.snapshots.values());

    if (query.since) {
      results = results.filter(s => s.timestamp >= query.since!);
    }
    if (query.until) {
      results = results.filter(s => s.timestamp <= query.until!);
    }
    if (query.trigger) {
      results = results.filter(s => s.trigger === query.trigger);
    }

    // Sort by timestamp, newest first
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (query.limit && query.limit > 0) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get most recent snapshot
   */
  getLatestSnapshot(): SystemSnapshot | undefined {
    const snapshots = this.querySnapshots({ limit: 1 });
    return snapshots[0];
  }

  /**
   * Get snapshots triggered by incidents
   */
  getIncidentSnapshots(): SystemSnapshot[] {
    return this.querySnapshots({ trigger: 'incident' });
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(id1: string, id2: string): {
    changes: Array<{
      field: string;
      before: unknown;
      after: unknown;
    }>;
    timeDeltaMs: number;
  } | null {
    const s1 = this.snapshots.get(id1);
    const s2 = this.snapshots.get(id2);

    if (!s1 || !s2) return null;

    const changes: Array<{
      field: string;
      before: unknown;
      after: unknown;
    }> = [];

    // Compare feature flags
    for (const f1 of s1.featureFlags) {
      const f2 = s2.featureFlags.find(f => f.name === f1.name);
      if (f2 && f1.enabled !== f2.enabled) {
        changes.push({
          field: `featureFlag.${f1.name}`,
          before: f1.enabled,
          after: f2.enabled,
        });
      }
    }

    // Compare memory
    if (Math.abs(s1.memory.percentUsed - s2.memory.percentUsed) > 10) {
      changes.push({
        field: 'memory.percentUsed',
        before: s1.memory.percentUsed,
        after: s2.memory.percentUsed,
      });
    }

    // Compare incident count
    if (s1.activeIncidents.length !== s2.activeIncidents.length) {
      changes.push({
        field: 'activeIncidents.count',
        before: s1.activeIncidents.length,
        after: s2.activeIncidents.length,
      });
    }

    return {
      changes,
      timeDeltaMs: s2.timestamp.getTime() - s1.timestamp.getTime(),
    };
  }

  /**
   * Register incident listener to auto-capture on critical incidents
   */
  async registerIncidentListener(): Promise<void> {
    try {
      const { getIncidentManager } = await import('../incidents');
      const manager = getIncidentManager();

      manager.onIncidentEvent(async (incident, event) => {
        if (
          event.action === 'created' &&
          (incident.severity === 'critical' || incident.severity === 'high')
        ) {
          await this.captureSnapshot('incident', 'system', {
            incidentId: incident.id,
            incidentType: incident.type,
            incidentSeverity: incident.severity,
          });
        }
      });

      logger.info('Registered incident listener for auto-capture');
    } catch {
      // Incident system not available
    }
  }

  /**
   * Generate unique snapshot ID
   */
  private generateId(): string {
    return `snap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get snapshot count
   */
  getSnapshotCount(): number {
    return this.snapshots.size;
  }

  /**
   * Clear all snapshots (for testing)
   */
  clear(): void {
    this.snapshots.clear();
  }
}

// Singleton
let instance: SnapshotManager | null = null;

export function getSnapshotManager(): SnapshotManager {
  if (!instance) {
    instance = new SnapshotManager();
  }
  return instance;
}

export function resetSnapshotManager(): void {
  instance = null;
}

export { SnapshotManager };
