/**
 * Go-Live Timeline & Forensics - Core Timeline Logic
 */

import { createLogger } from "../lib/logger";
import { FORENSICS_CONFIG, isGoLiveForensicsEnabled } from "./config";
import type {
  ForensicsEvent,
  ForensicsEventType,
  EventSeverity,
  TimelineQuery,
  TimelineResult,
  ForensicsSummary,
  ForensicsStatus,
} from "./types";

const logger = createLogger("go-live-forensics");

// Immutable event storage
const eventLog: ForensicsEvent[] = [];
const eventIndex = new Map<string, ForensicsEvent>();

// ============================================================================
// Event Signature
// ============================================================================

function generateSignature(event: Omit<ForensicsEvent, "immutable" | "signature">): string {
  const data = JSON.stringify({
    id: event.id,
    timestamp: event.timestamp.toISOString(),
    type: event.type,
    source: event.source,
    title: event.title,
    data: event.data,
  });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data.codePointAt(i)!;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// ============================================================================
// Event Recording
// ============================================================================

export function recordEvent(
  type: ForensicsEventType,
  severity: EventSeverity,
  source: string,
  title: string,
  description: string,
  data: Record<string, unknown> = {},
  options: { actor?: string; correlationId?: string } = {}
): ForensicsEvent {
  if (!isGoLiveForensicsEnabled()) {
    throw new Error("Go-live forensics is not enabled");
  }

  const baseEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
    type,
    severity,
    source,
    actor: options.actor,
    title,
    description,
    data,
    correlationId: options.correlationId,
  };

  const event: ForensicsEvent = {
    ...baseEvent,
    immutable: true,
    signature: generateSignature(baseEvent),
  };

  // Enforce max storage
  if (eventLog.length >= FORENSICS_CONFIG.maxEvents) {
    const removed = eventLog.shift();
    if (removed) eventIndex.delete(removed.id);
  }

  eventLog.push(event);
  eventIndex.set(event.id, event);

  logger.debug({ eventId: event.id, type, severity }, "Forensics event recorded");
  return event;
}

// Convenience methods for common event types
export function recordDecision(
  decision: string,
  source: string,
  data: Record<string, unknown>,
  actor?: string
): ForensicsEvent {
  return recordEvent(
    "decision",
    "info",
    source,
    `Decision: ${decision}`,
    `System decision: ${decision}`,
    data,
    { actor }
  );
}

export function recordApproval(
  approvedBy: string,
  reason: string,
  data: Record<string, unknown>
): ForensicsEvent {
  return recordEvent("approval", "info", "cutover", `Approval by ${approvedBy}`, reason, data, {
    actor: approvedBy,
  });
}

export function recordOverride(
  overriddenBy: string,
  previousDecision: string,
  newDecision: string,
  reason: string
): ForensicsEvent {
  return recordEvent(
    "override",
    "warning",
    "cutover",
    `Override by ${overriddenBy}`,
    reason,
    { previousDecision, newDecision },
    { actor: overriddenBy }
  );
}

export function recordIncident(
  incidentId: string,
  severity: EventSeverity,
  title: string,
  description: string
): ForensicsEvent {
  return recordEvent(
    "incident",
    severity,
    "incidents",
    title,
    description,
    { incidentId },
    { correlationId: incidentId }
  );
}

export function recordDeployment(
  version: string,
  environment: string,
  deployedBy?: string
): ForensicsEvent {
  return recordEvent(
    "deployment",
    "info",
    "deploy",
    `Deployment: ${version} to ${environment}`,
    `Version ${version} deployed to ${environment}`,
    { version, environment },
    { actor: deployedBy }
  );
}

export function recordRollback(
  fromVersion: string,
  toVersion: string,
  reason: string,
  rolledBackBy?: string
): ForensicsEvent {
  return recordEvent(
    "rollback",
    "error",
    "deploy",
    `Rollback: ${fromVersion} → ${toVersion}`,
    reason,
    { fromVersion, toVersion },
    { actor: rolledBackBy }
  );
}

// ============================================================================
// Timeline Query
// ============================================================================

export function queryTimeline(query: TimelineQuery = {}): TimelineResult {
  const limit = Math.min(
    query.limit || FORENSICS_CONFIG.queryDefaultLimit,
    FORENSICS_CONFIG.queryMaxLimit
  );
  const offset = query.offset || 0;

  let filtered = [...eventLog];

  // Apply filters
  if (query.startTime) {
    filtered = filtered.filter(e => e.timestamp >= query.startTime!);
  }
  if (query.endTime) {
    filtered = filtered.filter(e => e.timestamp <= query.endTime!);
  }
  if (query.types && query.types.length > 0) {
    filtered = filtered.filter(e => query.types!.includes(e.type));
  }
  if (query.sources && query.sources.length > 0) {
    filtered = filtered.filter(e => query.sources!.includes(e.source));
  }
  if (query.severities && query.severities.length > 0) {
    filtered = filtered.filter(e => query.severities!.includes(e.severity));
  }
  if (query.correlationId) {
    filtered = filtered.filter(e => e.correlationId === query.correlationId);
  }
  if (query.actor) {
    filtered = filtered.filter(e => e.actor === query.actor);
  }

  // Sort by timestamp descending (newest first)
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const total = filtered.length;
  const events = filtered.slice(offset, offset + limit);

  return {
    events,
    total,
    query,
    executedAt: new Date(),
  };
}

export function getEventById(id: string): ForensicsEvent | null {
  return eventIndex.get(id) || null;
}

export function getEventsByCorrelation(correlationId: string): ForensicsEvent[] {
  return eventLog.filter(e => e.correlationId === correlationId);
}

export function getRecentEvents(limit = 50): ForensicsEvent[] {
  return [...eventLog]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

// ============================================================================
// Summary & Statistics
// ============================================================================

export function getSummary(): ForensicsSummary {
  const byType: Record<ForensicsEventType, number> = {
    decision: 0,
    approval: 0,
    override: 0,
    state_change: 0,
    degradation: 0,
    recovery: 0,
    deployment: 0,
    rollback: 0,
    incident: 0,
    manual: 0,
  };

  const bySeverity: Record<EventSeverity, number> = {
    info: 0,
    warning: 0,
    error: 0,
    critical: 0,
  };

  const bySource: Record<string, number> = {};
  const actors = new Set<string>();

  for (const event of eventLog) {
    byType[event.type]++;
    bySeverity[event.severity]++;
    bySource[event.source] = (bySource[event.source] || 0) + 1;
    if (event.actor) actors.add(event.actor);
  }

  const sorted = [...eventLog].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return {
    totalEvents: eventLog.length,
    byType,
    bySeverity,
    bySource,
    firstEvent: sorted[0]?.timestamp,
    lastEvent: sorted[sorted.length - 1]?.timestamp,
    uniqueActors: actors.size,
  };
}

export function getStatus(): ForensicsStatus {
  const sorted = [...eventLog].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Estimate storage (rough approximation)
  const avgEventSize = 500; // bytes
  const storageUsed = eventLog.length * avgEventSize;

  return {
    enabled: isGoLiveForensicsEnabled(),
    totalEvents: eventLog.length,
    oldestEvent: sorted[0]?.timestamp,
    newestEvent: sorted[sorted.length - 1]?.timestamp,
    storageUsed,
  };
}

// ============================================================================
// Maintenance
// ============================================================================

export function pruneOldEvents(): number {
  const cutoff = new Date(Date.now() - FORENSICS_CONFIG.retentionDays * 24 * 60 * 60 * 1000);
  const before = eventLog.length;

  while (eventLog.length > 0 && eventLog[0].timestamp < cutoff) {
    const removed = eventLog.shift();
    if (removed) eventIndex.delete(removed.id);
  }

  const pruned = before - eventLog.length;
  if (pruned > 0) {
    logger.info({ pruned }, "Old events pruned");
  }
  return pruned;
}

export function clearAll(): void {
  eventLog.length = 0;
  eventIndex.clear();
}

export function exportEvents(): ForensicsEvent[] {
  return [...eventLog];
}
