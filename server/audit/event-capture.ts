/**
 * Audit Event Capture
 * Feature flag: ENABLE_AUDIT_LOGS
 */

import { db } from "../db";
import { governanceAuditLogs } from "@shared/schema";
import { AuditEvent, AuditLogEntry } from "./types";
import { normalizeEvent, hashSnapshot } from "./normalizer";

function isEnabled(): boolean {
  return process.env.ENABLE_AUDIT_LOGS === "true";
}

// In-memory buffer for batched writes
const eventBuffer: AuditEvent[] = [];
const BUFFER_SIZE = 50;
const FLUSH_INTERVAL = 5000; // 5 seconds

let flushTimer: NodeJS.Timeout | null = null;

/**
 * Capture an audit event (buffered for performance)
 */
export async function captureEvent(event: AuditEvent): Promise<void> {
  if (!isEnabled()) return;

  const normalized = normalizeEvent(event);
  eventBuffer.push(normalized);

  // Flush if buffer is full
  if (eventBuffer.length >= BUFFER_SIZE) {
    await flushBuffer();
  } else if (!flushTimer) {
    // Start timer for periodic flush
    flushTimer = setTimeout(flushBuffer, FLUSH_INTERVAL);
  }
}

/**
 * Capture an audit event immediately (for critical events)
 */
export async function captureEventImmediate(event: AuditEvent): Promise<AuditLogEntry> {
  if (!isEnabled()) {
    return {
      id: "disabled",
      ...event,
      createdAt: new Date(),
    } as AuditLogEntry;
  }

  const normalized = normalizeEvent(event);

  const [entry] = await db
    .insert(governanceAuditLogs)
    .values({
      userId: normalized.userId,
      userRole: normalized.userRole,
      action: normalized.action,
      resource: normalized.resource,
      resourceId: normalized.resourceId,
      beforeSnapshot: normalized.beforeSnapshot,
      afterSnapshot: normalized.afterSnapshot,
      snapshotHash: normalized.afterSnapshot
        ? hashSnapshot(normalized.afterSnapshot)
        : undefined,
      source: normalized.source,
      ipAddress: normalized.ipAddress,
      userAgent: normalized.userAgent,
      sessionId: normalized.sessionId,
      metadata: normalized.metadata,
    } as any)
    .returning();

  return entry as unknown as AuditLogEntry;
}

/**
 * Flush the event buffer to database
 */
async function flushBuffer(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventBuffer.length === 0) return;

  const events = eventBuffer.splice(0, eventBuffer.length);

  try {
    const values = events.map((event) => ({
      userId: event.userId,
      userRole: event.userRole,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      beforeSnapshot: event.beforeSnapshot,
      afterSnapshot: event.afterSnapshot,
      snapshotHash: event.afterSnapshot
        ? hashSnapshot(event.afterSnapshot)
        : undefined,
      source: event.source,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      sessionId: event.sessionId,
      metadata: event.metadata,
    }));

    await db.insert(governanceAuditLogs).values(values);
  } catch (error) {
    console.error("[Audit] Error flushing buffer:", error);
    // Put events back in buffer for retry
    eventBuffer.unshift(...events);
  }
}

/**
 * Force flush all buffered events
 */
export async function forceFlush(): Promise<void> {
  await flushBuffer();
}

/**
 * Helper to capture content changes
 */
export async function captureContentChange(
  userId: string,
  userRole: string,
  action: string,
  contentId: string,
  before: unknown,
  after: unknown,
  source: AuditEvent["source"] = "api"
): Promise<void> {
  await captureEvent({
    userId,
    userRole,
    action: action as AuditEvent["action"],
    resource: "content",
    resourceId: contentId,
    beforeSnapshot: before ? JSON.stringify(before) : undefined,
    afterSnapshot: after ? JSON.stringify(after) : undefined,
    source,
  });
}

/**
 * Helper to capture user actions
 */
export async function captureUserAction(
  userId: string,
  userRole: string,
  action: AuditEvent["action"],
  metadata?: Record<string, unknown>,
  source: AuditEvent["source"] = "ui"
): Promise<void> {
  await captureEventImmediate({
    userId,
    userRole,
    action,
    resource: "user",
    resourceId: userId,
    source,
    metadata,
  });
}

/**
 * Helper to capture permission changes
 */
export async function capturePermissionChange(
  actorId: string,
  actorRole: string,
  targetUserId: string,
  before: unknown,
  after: unknown
): Promise<void> {
  await captureEventImmediate({
    userId: actorId,
    userRole: actorRole,
    action: "permission_change",
    resource: "user_permissions",
    resourceId: targetUserId,
    beforeSnapshot: JSON.stringify(before),
    afterSnapshot: JSON.stringify(after),
    source: "api",
  });
}

console.log("[Audit] EventCapture loaded");
