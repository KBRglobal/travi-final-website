/**
 * Approvals & Workflow Engine
 *
 * Multi-step approval workflows with:
 * - Conditional approval chains
 * - State machine transitions
 * - Time-based escalation
 * - Role-based routing
 *
 * Feature flags:
 * - ENABLE_ENTERPRISE_GOVERNANCE
 * - ENABLE_APPROVAL_WORKFLOWS
 */

import { Express } from "express";
import { approvalsRoutes } from "./routes";

export * from "./types";
export * from "./state-machine";
export * from "./rules";
export * from "./workflow-engine";
export * from "./repository";
export * from "./notifications";
export * from "./escalation";

export function registerApprovalsRoutes(app: Express): void {
  const isGovernanceEnabled = process.env.ENABLE_ENTERPRISE_GOVERNANCE === "true";
  const isApprovalsEnabled = process.env.ENABLE_APPROVAL_WORKFLOWS === "true";

  if (!isGovernanceEnabled && !isApprovalsEnabled) {
    console.log("[Approvals] Module disabled");
    return;
  }

  app.use("/api/admin/approvals", approvalsRoutes);
  console.log("[Approvals] Routes registered at /api/admin/approvals");
}

console.log("[Approvals] Module loaded");
