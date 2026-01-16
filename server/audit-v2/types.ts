/**
 * Audit Log v2 - Type Definitions
 * Feature Flag: ENABLE_AUDIT_V2=true
 */

export type AuditEventType =
  | 'content.publish'
  | 'content.unpublish'
  | 'content.schedule'
  | 'content.delete'
  | 'entity.merge'
  | 'entity.create'
  | 'entity.update'
  | 'entity.delete'
  | 'webhook.retry'
  | 'webhook.create'
  | 'webhook.delete'
  | 'incident.ack'
  | 'incident.resolve'
  | 'policy.change'
  | 'user.login'
  | 'user.logout'
  | 'user.create'
  | 'user.update'
  | 'export.generate'
  | 'system.config_change'
  | 'custom';

export type ResourceType =
  | 'content'
  | 'entity'
  | 'user'
  | 'webhook'
  | 'incident'
  | 'policy'
  | 'export'
  | 'system'
  | 'unknown';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  actorId: string;
  actorName?: string;
  resourceType: ResourceType;
  resourceId: string;
  action: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface AuditEventInput {
  type: AuditEventType;
  actorId: string;
  actorName?: string;
  resourceType: ResourceType;
  resourceId: string;
  action?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQueryOptions {
  resourceType?: ResourceType;
  resourceId?: string;
  type?: AuditEventType;
  actorId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  totalEvents: number;
  eventsByType: Partial<Record<AuditEventType, number>>;
  eventsByResourceType: Partial<Record<ResourceType, number>>;
  lastEventAt?: Date;
  uniqueActors: number;
}

export interface AuditV2Status {
  enabled: boolean;
  totalEvents: number;
  config: {
    maxEventsStored: number;
    redactionEnabled: boolean;
  };
}
