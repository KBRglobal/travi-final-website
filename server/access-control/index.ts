/**
 * Access Control Module (RBAC++)
 *
 * Enterprise role-based access control with:
 * - Hierarchical roles (SuperAdmin, Admin, Editor, Analyst, Ops, Viewer)
 * - Fine-grained permissions (action + resource + scope)
 * - Context-aware authorization
 * - Feature-flag gated
 *
 * Feature flags:
 * - ENABLE_ENTERPRISE_GOVERNANCE
 * - ENABLE_RBAC
 */

import { Express } from "express";
import { accessControlRoutes } from "./admin-routes";

export * from "./types";
export * from "./roles";
export * from "./permissions";
export * from "./policy-engine";
export * from "./context-resolver";
export * from "./middleware";
export * from "./repository";

export function registerAccessControlRoutes(app: Express): void {
  const isGovernanceEnabled = process.env.ENABLE_ENTERPRISE_GOVERNANCE === "true";
  const isRbacEnabled = process.env.ENABLE_RBAC === "true";

  if (!isGovernanceEnabled && !isRbacEnabled) {
    console.log("[AccessControl] Module disabled (ENABLE_ENTERPRISE_GOVERNANCE or ENABLE_RBAC not set)");
    return;
  }

  app.use("/api/admin/access-control", accessControlRoutes);
  console.log("[AccessControl] Routes registered at /api/admin/access-control");
}

console.log("[AccessControl] Module loaded");
