/**
 * Policy Engine - RBAC (Role-Based Access Control)
 * Feature flag: ENABLE_RBAC
 *
 * @deprecated This engine is part of the legacy policy system.
 * For new code, please use the Unified Policy Engine at:
 * /server/policies/unified-policy-engine.ts
 *
 * MIGRATION PATH:
 * ```typescript
 * // Old way:
 * import { can } from '../access-control/policy-engine';
 * const result = await can(userId, 'edit', 'content', context);
 *
 * // New way:
 * import { evaluateUnifiedPolicy } from '../policies/unified-policy-engine';
 * const result = await evaluateUnifiedPolicy({
 *   type: 'access',
 *   userId,
 *   action: 'edit',
 *   resource: 'content',
 *   ...context
 * });
 *
 * // Or use the convenience wrapper:
 * import { canUserAccess } from '../policies/unified-policy-engine';
 * const allowed = await canUserAccess(userId, 'edit', 'content', context);
 * ```
 *
 * This engine remains functional and is still the most widely used
 * (20+ files). It will continue to work, but the unified engine provides
 * better integration with governance and autonomy policies.
 *
 * Last updated: 2026-01-01 (Consolidation initiative)
 */

import { db } from "../db";
import { governanceRoles, governancePermissions, userRoleAssignments } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  UserContext,
  AccessContext,
  PermissionCheckResult,
  Permission,
  GovernanceRoleName,
  ROLE_HIERARCHY,
} from "./types";
import { getRolePermissions } from "./roles";
import { hasPermission, findMatchingPermissions } from "./permissions";

function isEnabled(): boolean {
  return process.env.ENABLE_RBAC === "true";
}

// Cache user contexts for 60 seconds
const USER_CONTEXT_CACHE = new Map<string, { ctx: UserContext; ts: number }>();
const CONTEXT_TTL = 60000;
const CACHE_MAX = 200;

/**
 * Get user context with roles and permissions
 */
export async function getUserContext(userId: string): Promise<UserContext | null> {
  if (!isEnabled()) {
    // Return super admin context when RBAC is disabled
    return {
      userId,
      roles: ["super_admin"],
      permissions: getRolePermissions("super_admin"),
    };
  }

  // Check cache
  const cached = USER_CONTEXT_CACHE.get(userId);
  if (cached && Date.now() - cached.ts < CONTEXT_TTL) {
    return cached.ctx;
  }

  // Fetch role assignments
  const assignments = await db
    .select({
      roleId: userRoleAssignments.roleId,
      scope: userRoleAssignments.scope,
      scopeValue: userRoleAssignments.scopeValue,
    })
    .from(userRoleAssignments)
    .where(and(eq(userRoleAssignments.userId, userId), eq(userRoleAssignments.isActive, true)));

  if (assignments.length === 0) {
    // Default to viewer
    const ctx: UserContext = {
      userId,
      roles: ["viewer"],
      permissions: getRolePermissions("viewer"),
    };
    cacheContext(userId, ctx);
    return ctx;
  }

  // Fetch role details
  const roleIds = assignments.map(a => a.roleId);
  const roles = await db.select().from(governanceRoles).where(inArray(governanceRoles.id, roleIds));

  const roleNames = roles.filter(r => r.isActive).map(r => r.name as GovernanceRoleName);

  // Fetch explicit permissions for these roles
  const dbPermissions = await db
    .select()
    .from(governancePermissions)
    .where(inArray(governancePermissions.roleId, roleIds));

  // Merge system permissions with DB permissions
  const allPermissions: Permission[] = [];

  for (const roleName of roleNames) {
    allPermissions.push(...getRolePermissions(roleName));
  }

  for (const dbPerm of dbPermissions) {
    allPermissions.push({
      action: dbPerm.action as Permission["action"],
      resource: dbPerm.resource as Permission["resource"],
      scope: dbPerm.scope as Permission["scope"],
      scopeValue: dbPerm.scopeValue || undefined,
      isAllowed: dbPerm.isAllowed,
      conditions: dbPerm.conditions || undefined,
    });
  }

  const ctx: UserContext = {
    userId,
    roles: roleNames,
    permissions: allPermissions,
  };

  cacheContext(userId, ctx);
  return ctx;
}

function cacheContext(userId: string, ctx: UserContext): void {
  if (USER_CONTEXT_CACHE.size >= CACHE_MAX) {
    const entries = Array.from(USER_CONTEXT_CACHE.entries());
    entries.sort((a, b) => a[1].ts - b[1].ts);
    entries.slice(0, 50).forEach(([k]) => USER_CONTEXT_CACHE.delete(k));
  }
  USER_CONTEXT_CACHE.set(userId, { ctx, ts: Date.now() });
}

export function clearUserContextCache(userId?: string): void {
  if (userId) {
    USER_CONTEXT_CACHE.delete(userId);
  } else {
    USER_CONTEXT_CACHE.clear();
  }
}

/**
 * Main permission check: can(user, action, resource)
 */
export async function can(
  userId: string,
  action: AccessContext["action"],
  resource: AccessContext["resource"],
  context?: Partial<AccessContext>
): Promise<PermissionCheckResult> {
  if (!isEnabled()) {
    return {
      allowed: true,
      reason: "RBAC disabled",
      permissions: [],
    };
  }

  const userCtx = await getUserContext(userId);
  if (!userCtx) {
    return {
      allowed: false,
      reason: "User not found",
      permissions: [],
    };
  }

  // Super admin bypasses all checks
  if (userCtx.roles.includes("super_admin")) {
    return {
      allowed: true,
      reason: "Super admin access",
      permissions: userCtx.permissions,
    };
  }

  // Determine scope
  let scope: Permission["scope"] = "global";
  let scopeValue: string | undefined;

  if (context?.contentId) {
    scope = "contentId";
    scopeValue = context.contentId;
  } else if (context?.entityId) {
    scope = "entityId";
    scopeValue = context.entityId;
  } else if (context?.locale) {
    scope = "locale";
    scopeValue = context.locale;
  } else if (context?.teamId) {
    scope = "teamId";
    scopeValue = context.teamId;
  }

  const allowed = hasPermission(userCtx.permissions, action, resource, scope, scopeValue);
  const matchingPerms = findMatchingPermissions(
    userCtx.permissions,
    action,
    resource,
    scope,
    scopeValue
  );

  return {
    allowed,
    reason: allowed ? "Permission granted" : "Permission denied",
    permissions: matchingPerms,
  };
}

/**
 * Check if user has any of the specified roles
 */
export async function hasRole(userId: string, roles: GovernanceRoleName[]): Promise<boolean> {
  const ctx = await getUserContext(userId);
  if (!ctx) return false;
  return roles.some(r => ctx.roles.includes(r));
}

/**
 * Check if user has higher role than specified
 */
export async function hasHigherRoleThan(
  userId: string,
  role: GovernanceRoleName
): Promise<boolean> {
  const ctx = await getUserContext(userId);
  if (!ctx) return false;

  const targetPriority = ROLE_HIERARCHY[role];
  return ctx.roles.some(r => ROLE_HIERARCHY[r] > targetPriority);
}
