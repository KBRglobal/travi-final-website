/**
 * Permission Utilities
 * Feature flag: ENABLE_RBAC
 */

import { Permission, Action, Resource, Scope } from "./types";

// Bounded cache for permission lookups
const CACHE_MAX = 500;
const permissionCache = new Map<string, boolean>();

function getCacheKey(roleId: string, action: Action, resource: Resource, scope: Scope, scopeValue?: string): string {
  return `${roleId}:${action}:${resource}:${scope}:${scopeValue || ""}`;
}

export function cachePermission(
  roleId: string,
  action: Action,
  resource: Resource,
  scope: Scope,
  scopeValue: string | undefined,
  allowed: boolean
): void {
  const key = getCacheKey(roleId, action, resource, scope, scopeValue);

  // Prune cache if too large
  if (permissionCache.size >= CACHE_MAX) {
    const entries = Array.from(permissionCache.keys());
    entries.slice(0, 100).forEach((k) => permissionCache.delete(k));
  }

  permissionCache.set(key, allowed);
}

export function getCachedPermission(
  roleId: string,
  action: Action,
  resource: Resource,
  scope: Scope,
  scopeValue?: string
): boolean | undefined {
  const key = getCacheKey(roleId, action, resource, scope, scopeValue);
  return permissionCache.get(key);
}

export function clearPermissionCache(): void {
  permissionCache.clear();
}

export function matchesScope(
  permission: Permission,
  requestScope: Scope,
  requestScopeValue?: string
): boolean {
  // Global scope matches everything
  if (permission.scope === "global") {
    return true;
  }

  // Exact scope match
  if (permission.scope === requestScope) {
    // If no scope value specified in permission, matches all values
    if (!permission.scopeValue) {
      return true;
    }
    // Otherwise must match exactly
    return permission.scopeValue === requestScopeValue;
  }

  return false;
}

export function matchesAction(permission: Permission, requestedAction: Action): boolean {
  return permission.action === requestedAction;
}

export function matchesResource(permission: Permission, requestedResource: Resource): boolean {
  return permission.resource === requestedResource;
}

export function evaluatePermission(
  permission: Permission,
  action: Action,
  resource: Resource,
  scope: Scope,
  scopeValue?: string
): boolean {
  if (!matchesAction(permission, action)) return false;
  if (!matchesResource(permission, resource)) return false;
  if (!matchesScope(permission, scope, scopeValue)) return false;

  return permission.isAllowed;
}

export function findMatchingPermissions(
  permissions: Permission[],
  action: Action,
  resource: Resource,
  scope: Scope,
  scopeValue?: string
): Permission[] {
  return permissions.filter((p) =>
    matchesAction(p, action) &&
    matchesResource(p, resource) &&
    matchesScope(p, scope, scopeValue)
  );
}

export function hasPermission(
  permissions: Permission[],
  action: Action,
  resource: Resource,
  scope: Scope = "global",
  scopeValue?: string
): boolean {
  const matching = findMatchingPermissions(permissions, action, resource, scope, scopeValue);

  // No matching permissions = denied
  if (matching.length === 0) return false;

  // Any explicit deny = denied
  const hasExplicitDeny = matching.some((p) => !p.isAllowed);
  if (hasExplicitDeny) return false;

  // Has at least one allow
  return matching.some((p) => p.isAllowed);
}

console.log("[AccessControl] Permissions loaded");
