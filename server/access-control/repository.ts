/**
 * Access Control Repository
 * Feature flag: ENABLE_RBAC
 */

import { db } from "../db";
import {
  governanceRoles,
  governancePermissions,
  userRoleAssignments,
  GovernanceRole,
  GovernancePermission,
  UserRoleAssignment,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { Permission, GovernanceRoleName } from "./types";
import { SYSTEM_ROLES } from "./roles";
import { clearUserContextCache } from "./policy-engine";

function isEnabled(): boolean {
  return process.env.ENABLE_RBAC === "true";
}

/**
 * Initialize system roles if they don't exist
 */
export async function initializeSystemRoles(): Promise<void> {
  if (!isEnabled()) return;

  for (const role of SYSTEM_ROLES) {
    const [existing] = await db
      .select()
      .from(governanceRoles)
      .where(eq(governanceRoles.name, role.name))
      .limit(1);

    if (!existing) {
      const [created] = await db
        .insert(governanceRoles)
        .values({
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          priority: role.priority,
          isSystem: role.isSystem,
          isActive: true,
        })
        .returning();

      // Add permissions for the role
      for (const perm of role.permissions) {
        await db.insert(governancePermissions).values({
          roleId: created.id,
          action: perm.action,
          resource: perm.resource,
          scope: perm.scope,
          scopeValue: perm.scopeValue,
          isAllowed: perm.isAllowed,
        });
      }
    }
  }

  console.log("[AccessControl] System roles initialized");
}

/**
 * Get all roles
 */
export async function getAllRoles(): Promise<GovernanceRole[]> {
  return db
    .select()
    .from(governanceRoles)
    .orderBy(desc(governanceRoles.priority));
}

/**
 * Get role by name
 */
export async function getRoleByName(name: GovernanceRoleName): Promise<GovernanceRole | null> {
  const [role] = await db
    .select()
    .from(governanceRoles)
    .where(eq(governanceRoles.name, name))
    .limit(1);

  return role || null;
}

/**
 * Get permissions for a role
 */
export async function getRolePermissionsFromDb(roleId: string): Promise<GovernancePermission[]> {
  return db
    .select()
    .from(governancePermissions)
    .where(eq(governancePermissions.roleId, roleId));
}

/**
 * Add permission to a role
 */
export async function addPermission(
  roleId: string,
  permission: Omit<Permission, "isAllowed"> & { isAllowed?: boolean }
): Promise<GovernancePermission> {
  const [created] = await db
    .insert(governancePermissions)
    .values({
      roleId,
      action: permission.action,
      resource: permission.resource,
      scope: permission.scope,
      scopeValue: permission.scopeValue,
      isAllowed: permission.isAllowed ?? true,
      conditions: permission.conditions,
    })
    .returning();

  clearUserContextCache();
  return created;
}

/**
 * Remove permission from a role
 */
export async function removePermission(permissionId: string): Promise<void> {
  await db
    .delete(governancePermissions)
    .where(eq(governancePermissions.id, permissionId));

  clearUserContextCache();
}

/**
 * Assign role to user
 */
export async function assignRole(
  userId: string,
  roleId: string,
  grantedBy: string,
  scope: string = "global",
  scopeValue?: string,
  expiresAt?: Date
): Promise<UserRoleAssignment> {
  const [assignment] = await db
    .insert(userRoleAssignments)
    .values({
      userId,
      roleId,
      grantedBy,
      scope,
      scopeValue,
      expiresAt,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [
        userRoleAssignments.userId,
        userRoleAssignments.roleId,
        userRoleAssignments.scope,
        userRoleAssignments.scopeValue,
      ],
      set: {
        grantedBy,
        grantedAt: new Date(),
        expiresAt,
        isActive: true,
      },
    })
    .returning();

  clearUserContextCache(userId);
  return assignment;
}

/**
 * Revoke role from user
 */
export async function revokeRole(
  userId: string,
  roleId: string,
  scope: string = "global",
  scopeValue?: string
): Promise<void> {
  await db
    .update(userRoleAssignments)
    .set({ isActive: false })
    .where(
      and(
        eq(userRoleAssignments.userId, userId),
        eq(userRoleAssignments.roleId, roleId),
        eq(userRoleAssignments.scope, scope),
        scopeValue
          ? eq(userRoleAssignments.scopeValue, scopeValue)
          : eq(userRoleAssignments.scopeValue, "")
      )
    );

  clearUserContextCache(userId);
}

/**
 * Get user's role assignments
 */
export async function getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]> {
  return db
    .select()
    .from(userRoleAssignments)
    .where(
      and(
        eq(userRoleAssignments.userId, userId),
        eq(userRoleAssignments.isActive, true)
      )
    );
}

/**
 * Get all users with a specific role
 */
export async function getUsersWithRole(roleId: string): Promise<string[]> {
  const assignments = await db
    .select({ userId: userRoleAssignments.userId })
    .from(userRoleAssignments)
    .where(
      and(
        eq(userRoleAssignments.roleId, roleId),
        eq(userRoleAssignments.isActive, true)
      )
    );

  return assignments.map((a) => a.userId);
}

console.log("[AccessControl] Repository loaded");
