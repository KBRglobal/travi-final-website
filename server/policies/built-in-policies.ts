/**
 * Built-in policy definitions for content governance
 */
export interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rules: PolicyRule[];
}

export interface PolicyRule {
  field: string;
  operator: "equals" | "contains" | "matches" | "greaterThan" | "lessThan";
  value: string | number | boolean;
  action: "block" | "warn" | "approve";
}

export const builtInPolicies: Policy[] = [];
export const BUILT_IN_POLICIES: Policy[] = [];
export function getBuiltInPolicy(name: string) {
  return null;
}
