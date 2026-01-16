/**
 * Audit Log v2 (Structured, Queryable)
 * Feature Flag: ENABLE_AUDIT_V2=true
 *
 * Captures sensitive actions with redaction support and provides
 * queryable audit trail for compliance and debugging.
 */

export * from './types';
export * from './config';
export {
  auditLog,
  auditContentAction,
  auditEntityAction,
  auditIncidentAction,
  redactPayload,
  clearAuditEvents,
} from './emitter';
export {
  queryAuditEvents,
  getAuditEventById,
  getAuditSummary,
  getTotalEventCount,
} from './repository';
export { default as auditV2Routes } from './routes';
