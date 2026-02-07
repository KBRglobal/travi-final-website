// Stub - Audit V2 disabled
import { Router } from "express";
export const auditV2Routes = Router();
export default auditV2Routes;
export function logAuditEvent(_event: unknown) {
  /* no-op: audit v2 disabled */
}
export function getAuditLog() {
  return [];
}
