/**
 * Access Control Types
 * Feature flag: ENABLE_RBAC
 */

export type GovernanceRoleName =
  | "super_admin"
  | "admin"
  | "editor"
  | "analyst"
  | "ops"
  | "viewer";

export type Action =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "publish"
  | "approve"
  | "configure"
  | "ops"
  | "audit"
  | "manage_users"
  | "manage_roles"
  | "manage_policies";

export type Resource =
  | "content"
  | "entity"
  | "revenue"
  | "ops"
  | "users"
  | "settings"
  | "analytics"
  | "audit"
  | "workflows"
  | "policies"
  | "roles";

export type Scope = "global" | "locale" | "contentId" | "entityId" | "teamId";

export interface Permission {
  action: Action;
  resource: Resource;
  scope: Scope;
  scopeValue?: string;
  isAllowed: boolean;
  conditions?: Record<string, unknown>;
}

export interface UserContext {
  userId: string;
  roles: GovernanceRoleName[];
  permissions: Permission[];
  locale?: string;
  teamIds?: string[];
}

export interface AccessContext {
  resource: Resource;
  resourceId?: string;
  action: Action;
  locale?: string;
  entityId?: string;
  contentId?: string;
  teamId?: string;
}

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  warnings?: string[];
  matchedPolicies?: string[];
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
  permissions: Permission[];
  policies?: PolicyResult;
}

export const ROLE_HIERARCHY: Record<GovernanceRoleName, number> = {
  super_admin: 100,
  admin: 80,
  ops: 60,
  editor: 40,
  analyst: 30,
  viewer: 10,
};

console.log("[AccessControl] Types loaded");
