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

export * from "./types";
export * from "./built-in-policies";
export * from "./evaluator";
export * from "./policy-engine";
export * from "./repository";
export * from "./middleware";

export function registerPoliciesRoutes(app: Express): void {
  const isGovernanceEnabled = process.env.ENABLE_ENTERPRISE_GOVERNANCE === "true";
  const isPoliciesEnabled = process.env.ENABLE_POLICY_ENFORCEMENT === "true";

  if (!isGovernanceEnabled && !isPoliciesEnabled) {
    console.log("[Policies] Module disabled");
    return;
  }

  app.use("/api/admin/policies", policiesRoutes);
  console.log("[Policies] Routes registered at /api/admin/policies");
}

console.log("[Policies] Module loaded");
