/**
 * Audit Log v2 - Emitter
 * Core function for logging audit events with redaction
 */

import { createLogger } from '../lib/logger';
import { isAuditV2Enabled, AUDIT_V2_CONFIG, REDACTED_FIELDS } from './config';
import type { AuditEvent, AuditEventInput, AuditEventType, ResourceType } from './types';

const logger = createLogger('audit-v2-emitter');

// In-memory storage (bounded)
const auditEvents: AuditEvent[] = [];
const maxSize = AUDIT_V2_CONFIG.maxEventsStored;

// ============================================================================
// Redaction Helpers
// ============================================================================

function shouldRedact(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return REDACTED_FIELDS.some(field => lowerKey.includes(field.toLowerCase()));
}

export function redactPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (shouldRedact(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      redacted[key] = redactPayload(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

// ============================================================================
// Event Generation
// ============================================================================

function generateId(): string {
  return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function enforceMaxSize(): void {
  while (auditEvents.length > maxSize) {
    auditEvents.shift();
  }
}

// ============================================================================
// Main Audit Function
// ============================================================================

export function auditLog(
  eventType: AuditEventType,
  actorId: string,
  resourceType: ResourceType,
  resourceId: string,
  payload?: Record<string, unknown>,
  options?: {
    actorName?: string;
    action?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
): AuditEvent | null {
  if (!isAuditV2Enabled()) {
    return null;
  }

  const redactedPayload = payload ? redactPayload(payload) : {};

  const event: AuditEvent = {
    id: generateId(),
    type: eventType,
    actorId,
    actorName: options?.actorName,
    resourceType,
    resourceId,
    action: options?.action || eventType,
    payload: redactedPayload,
    metadata: options?.metadata,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
    timestamp: new Date(),
  };

  auditEvents.push(event);
  enforceMaxSize();

  logger.debug(
    { eventType, resourceType, resourceId, actorId },
    'Audit event recorded'
  );

  return event;
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function auditContentAction(
  action: 'publish' | 'unpublish' | 'schedule' | 'delete',
  actorId: string,
  contentId: string,
  payload?: Record<string, unknown>
): AuditEvent | null {
  return auditLog(
    `content.${action}` as AuditEventType,
    actorId,
    'content',
    contentId,
    payload
  );
}

export function auditEntityAction(
  action: 'create' | 'update' | 'delete' | 'merge',
  actorId: string,
  entityId: string,
  payload?: Record<string, unknown>
): AuditEvent | null {
  return auditLog(
    `entity.${action}` as AuditEventType,
    actorId,
    'entity',
    entityId,
    payload
  );
}

export function auditIncidentAction(
  action: 'ack' | 'resolve',
  actorId: string,
  incidentId: string,
  payload?: Record<string, unknown>
): AuditEvent | null {
  return auditLog(
    `incident.${action}` as AuditEventType,
    actorId,
    'incident',
    incidentId,
    payload
  );
}

// ============================================================================
// Query Access (for repository)
// ============================================================================

export function getAuditEvents(): AuditEvent[] {
  return auditEvents;
}

export function clearAuditEvents(): void {
  auditEvents.length = 0;
}
