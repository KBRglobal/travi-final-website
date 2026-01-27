/**
 * Policy Enforcement Engine
 *
 * Declarative policy system with:
 * - Built-in and custom policies
 * - Condition evaluation
 * - ALLOW | WARN | BLOCK effects
 * - Composable with approval workflows
 *
 * Feature flags:
 * - ENABLE_ENTERPRISE_GOVERNANCE
 * - ENABLE_POLICY_ENFORCEMENT
 */

import { Express } from "express";
import { policiesRoutes } from "./admin-routes";

// Explicitly export from types first (canonical source for type definitions)
export * from "./types";
export * from "./built-in-policies";
export * from "./evaluator";
// Re-export policy-engine (canonical source for evaluatePolicies/clearPolicyCache)
export {
  evaluatePolicies,
  clearPolicyCache,
  isAllowed,
  checkPolicy,
  getEnforcementSummary,
} from "./policy-engine";
export * from "./repository";
// Re-export middleware (exclude duplicates already exported from types and policy-engine)
export {
  enforcePolicy,
  enforceContentPolicy,
  enforceUserPolicy,
  enforceExportPolicy,
  enforceAdminPolicy,
  auditPolicyViolation,
} from "./middleware";

export function registerPoliciesRoutes(app: Express): void {
  const isGovernanceEnabled = process.env.ENABLE_ENTERPRISE_GOVERNANCE === "true";
  const isPoliciesEnabled = process.env.ENABLE_POLICY_ENFORCEMENT === "true";

  if (!isGovernanceEnabled && !isPoliciesEnabled) {
    return;
  }

  app.use("/api/admin/policies", policiesRoutes);
}
