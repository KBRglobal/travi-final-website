/**
 * Audit Logging & Forensics Module
 *
 * Immutable audit trail with:
 * - Event capture (buffered and immediate)
 * - Snapshot hashing for integrity
 * - Comprehensive querying
 * - Retention management
 *
 * Feature flags:
 * - ENABLE_ENTERPRISE_GOVERNANCE
 * - ENABLE_AUDIT_LOGS
 */

import { Express } from "express";
import { auditRoutes } from "./admin-routes";

export * from "./types";
export * from "./normalizer";
export * from "./event-capture";
export * from "./query-engine";
export * from "./repository";

export function registerAuditRoutes(app: Express): void {
  const isGovernanceEnabled = process.env.ENABLE_ENTERPRISE_GOVERNANCE === "true";
  const isAuditEnabled = process.env.ENABLE_AUDIT_LOGS === "true";

  if (!isGovernanceEnabled && !isAuditEnabled) {
    console.log("[Audit] Module disabled");
    return;
  }

  app.use("/api/admin/audit", auditRoutes);
  console.log("[Audit] Routes registered at /api/admin/audit");
}

console.log("[Audit] Module loaded");
