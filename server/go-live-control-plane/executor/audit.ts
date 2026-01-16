/**
 * Go-Live Control Plane - Audit Logger
 *
 * Immutable audit trail for all execution actions
 */

import { AuditEntry } from './types';

// Bounded audit log
const MAX_AUDIT_ENTRIES = 10000;
const auditLog: AuditEntry[] = [];

// Audit event types
export type AuditEventType =
  | 'plan_created'
  | 'plan_approved'
  | 'execution_started'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'execution_completed'
  | 'execution_failed'
  | 'rollback_started'
  | 'rollback_completed'
  | 'rollback_failed'
  | 'checkpoint_created'
  | 'checkpoint_restored';

/**
 * Log an audit event
 */
export function logAuditEvent(
  action: AuditEventType,
  details: string,
  actor: string,
  success: boolean,
  metadata?: Record<string, unknown>
): AuditEntry {
  const entry: AuditEntry = {
    timestamp: new Date(),
    action,
    details,
    actor,
    success,
    metadata,
  };

  // Add to bounded log
  auditLog.push(entry);

  // Trim if over capacity
  if (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog.shift();
  }

  return entry;
}

/**
 * Get audit log entries
 */
export function getAuditLog(options: {
  limit?: number;
  offset?: number;
  actor?: string;
  action?: AuditEventType;
  since?: Date;
  until?: Date;
  successOnly?: boolean;
} = {}): AuditEntry[] {
  let entries = [...auditLog];

  // Filter by actor
  if (options.actor) {
    entries = entries.filter(e => e.actor === options.actor);
  }

  // Filter by action
  if (options.action) {
    entries = entries.filter(e => e.action === options.action);
  }

  // Filter by date range
  if (options.since) {
    entries = entries.filter(e => e.timestamp >= options.since!);
  }
  if (options.until) {
    entries = entries.filter(e => e.timestamp <= options.until!);
  }

  // Filter by success
  if (options.successOnly !== undefined) {
    entries = entries.filter(e => e.success === options.successOnly);
  }

  // Sort by most recent first
  entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Apply pagination
  const offset = options.offset || 0;
  const limit = options.limit || 100;
  entries = entries.slice(offset, offset + limit);

  return entries;
}

/**
 * Get audit entries for a specific execution
 */
export function getExecutionAudit(executionId: string): AuditEntry[] {
  return auditLog.filter(e =>
    e.metadata?.executionId === executionId
  ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Get recent activity summary
 */
export function getActivitySummary(hours: number = 24): {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  byAction: Record<string, number>;
  byActor: Record<string, number>;
} {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const recentEntries = auditLog.filter(e => e.timestamp >= since);

  const byAction: Record<string, number> = {};
  const byActor: Record<string, number> = {};

  for (const entry of recentEntries) {
    byAction[entry.action] = (byAction[entry.action] || 0) + 1;
    byActor[entry.actor] = (byActor[entry.actor] || 0) + 1;
  }

  return {
    totalEvents: recentEntries.length,
    successfulEvents: recentEntries.filter(e => e.success).length,
    failedEvents: recentEntries.filter(e => !e.success).length,
    byAction,
    byActor,
  };
}

/**
 * Export audit log (for external storage)
 */
export function exportAuditLog(): AuditEntry[] {
  return [...auditLog];
}

/**
 * Clear audit log (use with caution)
 */
export function clearAuditLog(): void {
  auditLog.length = 0;
}

/**
 * Get audit log stats
 */
export function getAuditStats(): {
  totalEntries: number;
  maxEntries: number;
  oldestEntry?: Date;
  newestEntry?: Date;
} {
  return {
    totalEntries: auditLog.length,
    maxEntries: MAX_AUDIT_ENTRIES,
    oldestEntry: auditLog[0]?.timestamp,
    newestEntry: auditLog[auditLog.length - 1]?.timestamp,
  };
}
