// Stub - Governance Types
export interface GovernancePolicy {
  id: string;
  name: string;
  enabled: boolean;
}
export interface GovernanceEvent {
  type: string;
  timestamp: Date;
  data?: unknown;
}
export interface SecurityEvent extends GovernanceEvent {
  severity: string;
}
export type PolicyDecision = "allow" | "deny" | "review";
export type SecurityEventType = string;
export type PolicyEffect = "allow" | "deny" | "require_approval";

// Policy types
export interface PolicyRule {
  id: string;
  name: string;
  effect: PolicyEffect;
  conditions: PolicyCondition[];
  actions: string[];
  resources: string[];
  roles: string[];
  priority: number;
  isActive: boolean;
}
export interface PolicyCondition {
  field: string;
  operator: string;
  value: unknown;
}

// Admin/Security types
export type AdminRole = string;
export type Resource = string;
export type Action = string;

export const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  analyst: 1,
  editor: 2,
  ops: 3,
  manager: 4,
  admin: 5,
  system_admin: 6,
  super_admin: 7,
  superadmin: 7,
};
