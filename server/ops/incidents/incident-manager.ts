/**
 * Incident Management System - Core Manager
 *
 * FEATURE 1: Centralized incident lifecycle management
 *
 * Feature flag: ENABLE_INCIDENT_MANAGEMENT
 */

import { log } from '../../lib/logger';
import type {
  Incident,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  IncidentSource,
  IncidentMetadata,
  IncidentFilter,
  IncidentStats,
  IncidentEvent,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[IncidentManager] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[IncidentManager] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[IncidentManager] ${msg}`, undefined, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[IncidentManager][AUDIT] ${msg}`, data),
};

// Bounded storage
const MAX_INCIDENTS = 1000;
const MAX_EVENTS = 5000;
const DEDUP_WINDOW_MS = 300000; // 5 minutes

class IncidentManager {
  private incidents: Map<string, Incident> = new Map();
  private events: IncidentEvent[] = [];
  private enabled = false;
  private listeners: Array<(incident: Incident, event: IncidentEvent) => void> = [];

  constructor() {
    this.enabled = process.env.ENABLE_INCIDENT_MANAGEMENT === 'true';
    if (this.enabled) {
      logger.info('Incident management system enabled');
    }
  }

  /**
   * Create a new incident
   */
  createIncident(
    type: IncidentType,
    severity: IncidentSeverity,
    source: IncidentSource,
    title: string,
    description: string,
    metadata: IncidentMetadata = {}
  ): Incident | null {
    if (!this.enabled) return null;

    // Deduplication: check for similar open incidents
    const existingIncident = this.findDuplicateIncident(type, source, metadata);
    if (existingIncident) {
      logger.info('Duplicate incident suppressed', {
        existingId: existingIncident.id,
        type,
        source,
      });
      return existingIncident;
    }

    // Enforce bounded storage
    this.pruneOldIncidents();

    const id = this.generateId();
    const incident: Incident = {
      id,
      type,
      severity,
      status: 'open',
      source,
      title,
      description,
      metadata,
      detectedAt: new Date(),
      autoResolved: false,
    };

    this.incidents.set(id, incident);

    const event: IncidentEvent = {
      incidentId: id,
      action: 'created',
      timestamp: new Date(),
    };
    this.recordEvent(event);

    logger.warn('Incident created', {
      id,
      type,
      severity,
      source,
      title,
    });

    logger.audit('INCIDENT_CREATED', {
      id,
      type,
      severity,
      source,
      title,
      metadata,
    });

    this.notifyListeners(incident, event);

    return incident;
  }

  /**
   * Acknowledge an incident
   */
  acknowledge(id: string, acknowledgedBy?: string): boolean {
    const incident = this.incidents.get(id);
    if (!incident) return false;
    if (incident.status !== 'open') return false;

    incident.status = 'acknowledged';
    incident.acknowledgedAt = new Date();
    incident.acknowledgedBy = acknowledgedBy;

    const event: IncidentEvent = {
      incidentId: id,
      action: 'acknowledged',
      timestamp: new Date(),
      actor: acknowledgedBy,
    };
    this.recordEvent(event);

    logger.info('Incident acknowledged', { id, acknowledgedBy });
    logger.audit('INCIDENT_ACKNOWLEDGED', { id, acknowledgedBy });

    this.notifyListeners(incident, event);
    return true;
  }

  /**
   * Mark incident as mitigated
   */
  mitigate(id: string, notes?: string): boolean {
    const incident = this.incidents.get(id);
    if (!incident) return false;
    if (incident.status === 'resolved') return false;

    incident.status = 'mitigated';
    incident.mitigatedAt = new Date();
    if (notes) {
      incident.resolutionNotes = notes;
    }

    const event: IncidentEvent = {
      incidentId: id,
      action: 'mitigated',
      timestamp: new Date(),
      notes,
    };
    this.recordEvent(event);

    logger.info('Incident mitigated', { id, notes });
    logger.audit('INCIDENT_MITIGATED', { id, notes });

    this.notifyListeners(incident, event);
    return true;
  }

  /**
   * Resolve an incident
   */
  resolve(id: string, resolvedBy?: string, notes?: string, autoResolved = false): boolean {
    const incident = this.incidents.get(id);
    if (!incident) return false;
    if (incident.status === 'resolved') return false;

    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    incident.resolvedBy = resolvedBy;
    incident.autoResolved = autoResolved;
    if (notes) {
      incident.resolutionNotes = notes;
    }

    const event: IncidentEvent = {
      incidentId: id,
      action: 'resolved',
      timestamp: new Date(),
      actor: resolvedBy,
      notes,
    };
    this.recordEvent(event);

    logger.info('Incident resolved', { id, resolvedBy, autoResolved });
    logger.audit('INCIDENT_RESOLVED', { id, resolvedBy, autoResolved, notes });

    this.notifyListeners(incident, event);
    return true;
  }

  /**
   * Auto-resolve incidents when condition clears
   */
  autoResolve(type: IncidentType, source: IncidentSource, notes?: string): number {
    let count = 0;
    for (const incident of this.incidents.values()) {
      if (
        incident.type === type &&
        incident.source === source &&
        incident.status !== 'resolved'
      ) {
        this.resolve(incident.id, 'system', notes || 'Condition cleared automatically', true);
        count++;
      }
    }
    return count;
  }

  /**
   * Get incident by ID
   */
  getIncident(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  /**
   * List incidents with optional filters
   */
  listIncidents(filter: IncidentFilter = {}): Incident[] {
    let results = Array.from(this.incidents.values());

    if (filter.type) {
      results = results.filter(i => i.type === filter.type);
    }
    if (filter.severity) {
      results = results.filter(i => i.severity === filter.severity);
    }
    if (filter.status) {
      results = results.filter(i => i.status === filter.status);
    }
    if (filter.source) {
      results = results.filter(i => i.source === filter.source);
    }
    if (filter.since) {
      results = results.filter(i => i.detectedAt >= filter.since!);
    }
    if (filter.until) {
      results = results.filter(i => i.detectedAt <= filter.until!);
    }

    // Sort by detection time, newest first
    results.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());

    if (filter.limit && filter.limit > 0) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Get open incidents
   */
  getOpenIncidents(): Incident[] {
    return this.listIncidents({ status: 'open' });
  }

  /**
   * Get critical incidents
   */
  getCriticalIncidents(): Incident[] {
    return Array.from(this.incidents.values()).filter(
      i => i.severity === 'critical' && i.status !== 'resolved'
    );
  }

  /**
   * Get incident statistics
   */
  getStats(): IncidentStats {
    const incidents = Array.from(this.incidents.values());

    const byStatus: Record<IncidentStatus, number> = {
      open: 0,
      acknowledged: 0,
      mitigated: 0,
      resolved: 0,
    };

    const bySeverity: Record<IncidentSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const byType: Record<IncidentType, number> = {
      system_down: 0,
      queue_stalled: 0,
      ai_provider_failed: 0,
      budget_exceeded: 0,
      data_integrity_risk: 0,
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const incident of incidents) {
      byStatus[incident.status]++;
      bySeverity[incident.severity]++;
      byType[incident.type]++;

      if (incident.status === 'resolved' && incident.resolvedAt) {
        totalResolutionTime += incident.resolvedAt.getTime() - incident.detectedAt.getTime();
        resolvedCount++;
      }
    }

    return {
      total: incidents.length,
      byStatus,
      bySeverity,
      byType,
      openCount: byStatus.open + byStatus.acknowledged + byStatus.mitigated,
      mttrMs: resolvedCount > 0 ? totalResolutionTime / resolvedCount : undefined,
    };
  }

  /**
   * Get events for an incident
   */
  getIncidentEvents(incidentId: string): IncidentEvent[] {
    return this.events.filter(e => e.incidentId === incidentId);
  }

  /**
   * Register a listener for incident events
   */
  onIncidentEvent(listener: (incident: Incident, event: IncidentEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Check if there's an active incident of a type
   */
  hasActiveIncident(type: IncidentType): boolean {
    for (const incident of this.incidents.values()) {
      if (incident.type === type && incident.status !== 'resolved') {
        return true;
      }
    }
    return false;
  }

  /**
   * Find duplicate incident within dedup window
   */
  private findDuplicateIncident(
    type: IncidentType,
    source: IncidentSource,
    metadata: IncidentMetadata
  ): Incident | null {
    const now = Date.now();

    for (const incident of this.incidents.values()) {
      if (incident.status === 'resolved') continue;
      if (incident.type !== type || incident.source !== source) continue;

      // Within dedup window
      if (now - incident.detectedAt.getTime() < DEDUP_WINDOW_MS) {
        // Check metadata similarity (component or provider match)
        if (
          metadata.component === incident.metadata.component ||
          metadata.provider === incident.metadata.provider
        ) {
          return incident;
        }
      }
    }

    return null;
  }

  /**
   * Record an event with bounded storage
   */
  private recordEvent(event: IncidentEvent): void {
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }
  }

  /**
   * Prune old resolved incidents
   */
  private pruneOldIncidents(): void {
    if (this.incidents.size < MAX_INCIDENTS) return;

    // Remove oldest resolved incidents
    const resolved = Array.from(this.incidents.entries())
      .filter(([_, i]) => i.status === 'resolved')
      .sort((a, b) => a[1].resolvedAt!.getTime() - b[1].resolvedAt!.getTime());

    const toRemove = resolved.slice(0, Math.max(100, resolved.length - MAX_INCIDENTS / 2));
    for (const [id] of toRemove) {
      this.incidents.delete(id);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(incident: Incident, event: IncidentEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(incident, event);
      } catch (err) {
        logger.error('Incident listener error', { error: String(err) });
      }
    }
  }

  /**
   * Generate unique incident ID
   */
  private generateId(): string {
    return `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Clear all incidents (for testing)
   */
  clear(): void {
    this.incidents.clear();
    this.events = [];
  }
}

// Singleton
let instance: IncidentManager | null = null;

export function getIncidentManager(): IncidentManager {
  if (!instance) {
    instance = new IncidentManager();
  }
  return instance;
}

export function resetIncidentManager(): void {
  instance = null;
}

export { IncidentManager };
