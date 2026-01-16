/**
 * Role Definitions
 * Feature flag: ENABLE_RBAC
 */

import { GovernanceRoleName, Action, Resource, Permission } from "./types";

export interface RoleDefinition {
  name: GovernanceRoleName;
  displayName: string;
  description: string;
  priority: number;
  isSystem: boolean;
  permissions: Permission[];
}

// Default role definitions with full permissions
export const SYSTEM_ROLES: RoleDefinition[] = [
  {
    name: "super_admin",
    displayName: "Super Admin",
    description: "Full system access with no restrictions",
    priority: 100,
    isSystem: true,
    permissions: [
      { action: "view", resource: "content", scope: "global", isAllowed: true },
      { action: "create", resource: "content", scope: "global", isAllowed: true },
      { action: "edit", resource: "content", scope: "global", isAllowed: true },
      { action: "delete", resource: "content", scope: "global", isAllowed: true },
      { action: "publish", resource: "content", scope: "global", isAllowed: true },
      { action: "approve", resource: "content", scope: "global", isAllowed: true },
      { action: "view", resource: "entity", scope: "global", isAllowed: true },
      { action: "edit", resource: "entity", scope: "global", isAllowed: true },
      { action: "view", resource: "revenue", scope: "global", isAllowed: true },
      { action: "edit", resource: "revenue", scope: "global", isAllowed: true },
      { action: "ops", resource: "ops", scope: "global", isAllowed: true },
      { action: "manage_users", resource: "users", scope: "global", isAllowed: true },
      { action: "manage_roles", resource: "roles", scope: "global", isAllowed: true },
      { action: "manage_policies", resource: "policies", scope: "global", isAllowed: true },
      { action: "configure", resource: "settings", scope: "global", isAllowed: true },
      { action: "view", resource: "analytics", scope: "global", isAllowed: true },
      { action: "audit", resource: "audit", scope: "global", isAllowed: true },
    ],
  },
  {
    name: "admin",
    displayName: "Admin",
    description: "Administrative access without super admin privileges",
    priority: 80,
    isSystem: true,
    permissions: [
      { action: "view", resource: "content", scope: "global", isAllowed: true },
      { action: "create", resource: "content", scope: "global", isAllowed: true },
      { action: "edit", resource: "content", scope: "global", isAllowed: true },
      { action: "delete", resource: "content", scope: "global", isAllowed: true },
      { action: "publish", resource: "content", scope: "global", isAllowed: true },
      { action: "approve", resource: "content", scope: "global", isAllowed: true },
      { action: "view", resource: "entity", scope: "global", isAllowed: true },
      { action: "edit", resource: "entity", scope: "global", isAllowed: true },
      { action: "view", resource: "revenue", scope: "global", isAllowed: true },
      { action: "manage_users", resource: "users", scope: "global", isAllowed: true },
      { action: "configure", resource: "settings", scope: "global", isAllowed: true },
      { action: "view", resource: "analytics", scope: "global", isAllowed: true },
      { action: "audit", resource: "audit", scope: "global", isAllowed: true },
    ],
  },
  {
    name: "editor",
    displayName: "Editor",
    description: "Can create and edit content, limited publishing",
    priority: 40,
    isSystem: true,
    permissions: [
      { action: "view", resource: "content", scope: "global", isAllowed: true },
      { action: "create", resource: "content", scope: "global", isAllowed: true },
      { action: "edit", resource: "content", scope: "global", isAllowed: true },
      { action: "publish", resource: "content", scope: "global", isAllowed: true },
      { action: "view", resource: "entity", scope: "global", isAllowed: true },
      { action: "view", resource: "analytics", scope: "global", isAllowed: true },
    ],
  },
  {
    name: "analyst",
    displayName: "Analyst",
    description: "Read-only access to analytics and content",
    priority: 30,
    isSystem: true,
    permissions: [
      { action: "view", resource: "content", scope: "global", isAllowed: true },
      { action: "view", resource: "entity", scope: "global", isAllowed: true },
      { action: "view", resource: "analytics", scope: "global", isAllowed: true },
      { action: "view", resource: "revenue", scope: "global", isAllowed: true },
    ],
  },
  {
    name: "ops",
    displayName: "Operations",
    description: "Operations access for system management",
    priority: 60,
    isSystem: true,
    permissions: [
      { action: "view", resource: "content", scope: "global", isAllowed: true },
      { action: "ops", resource: "ops", scope: "global", isAllowed: true },
      { action: "view", resource: "analytics", scope: "global", isAllowed: true },
      { action: "configure", resource: "settings", scope: "global", isAllowed: true },
    ],
  },
  {
    name: "viewer",
    displayName: "Viewer",
    description: "Read-only access to content",
    priority: 10,
    isSystem: true,
    permissions: [
      { action: "view", resource: "content", scope: "global", isAllowed: true },
      { action: "view", resource: "entity", scope: "global", isAllowed: true },
    ],
  },
];

export function getRoleDefinition(name: GovernanceRoleName): RoleDefinition | undefined {
  return SYSTEM_ROLES.find((r) => r.name === name);
}

export function getRolePermissions(name: GovernanceRoleName): Permission[] {
  const role = getRoleDefinition(name);
  return role?.permissions || [];
}

export function isHigherRole(role1: GovernanceRoleName, role2: GovernanceRoleName): boolean {
  const def1 = getRoleDefinition(role1);
  const def2 = getRoleDefinition(role2);
  if (!def1 || !def2) return false;
  return def1.priority > def2.priority;
}

console.log("[AccessControl] Roles loaded");
