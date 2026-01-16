/**
 * Policy Types
 * Feature flag: ENABLE_POLICY_ENFORCEMENT
 */

export type PolicyEffect = "allow" | "warn" | "block";

export type PolicyType =
  | "publish_gate"
  | "edit_restriction"
  | "delete_protection"
  | "access_control"
  | "ops_restriction"
  | "locale_access"
  | "revenue_protection"
  | "rate_limit";

export interface PolicyCondition {
  field: string;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "notIn" | "contains" | "exists";
  value: unknown;
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  policyType: PolicyType;
  effect: PolicyEffect;
  priority: number;
  conditions: PolicyCondition[];
  actions: string[];
  resources: string[];
  roles: string[];
  message?: string;
  isActive: boolean;
}

export interface PolicyContext {
  userId?: string;
  userRole?: string;
  userRoles?: string[];
  action: string;
  resource: string;
  resourceId?: string;
  locale?: string;
  contentStatus?: string;
  contentType?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface PolicyEvaluation {
  policyId?: string;
  policyName: string;
  result: PolicyEffect;
  reason: string;
  matchedConditions?: string[];
}

export interface PolicyDecision {
  effect: PolicyEffect;
  reason: string;
  evaluations: PolicyEvaluation[];
  blockedBy?: string[];
  warnings?: string[];
}

export const POLICY_EFFECTS: PolicyEffect[] = ["allow", "warn", "block"];
export const POLICY_TYPES: PolicyType[] = [
  "publish_gate",
  "edit_restriction",
  "delete_protection",
  "access_control",
  "ops_restriction",
  "locale_access",
  "revenue_protection",
  "rate_limit",
];

console.log("[Policies] Types loaded");
