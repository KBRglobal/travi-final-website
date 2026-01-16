/**
 * User Permissions - Permission Checker
 */

import {
  Permission,
  PermissionAction,
  ResourceType,
  PermissionCheckResult,
  PermissionCondition,
  Role,
  UserRole,
} from './types';
import { getBuiltInRole, isBuiltInRole } from './roles';

// In-memory stores
const customRoles = new Map<string, Role>();
const userRoles = new Map<string, UserRole[]>();
const auditLog: Array<{
  userId: string;
  action: PermissionAction;
  resource: ResourceType;
  resourceId?: string;
  allowed: boolean;
  timestamp: Date;
}> = [];

/**
 * Check if user has permission.
 */
export function checkPermission(
  userId: string,
  action: PermissionAction,
  resource: ResourceType,
  context?: Record<string, unknown>
): PermissionCheckResult {
  const roles = getUserRoles(userId);

  if (roles.length === 0) {
    return { allowed: false, reason: 'No roles assigned' };
  }

  for (const userRole of roles) {
    // Check expiration
    if (userRole.expiresAt && userRole.expiresAt < new Date()) {
      continue;
    }

    const role = getRole(userRole.roleId);
    if (!role) continue;

    const matchedPerm = findMatchingPermission(role, action, resource, context);
    if (matchedPerm) {
      logAudit(userId, action, resource, context?.resourceId as string, true);
      return {
        allowed: true,
        matchedPermission: matchedPerm,
      };
    }
  }

  logAudit(userId, action, resource, context?.resourceId as string, false);
  return { allowed: false, reason: 'No matching permission found' };
}

/**
 * Find matching permission in role.
 */
function findMatchingPermission(
  role: Role,
  action: PermissionAction,
  resource: ResourceType,
  context?: Record<string, unknown>
): Permission | null {
  for (const perm of role.permissions) {
    // Check action and resource match
    if (perm.action !== action && perm.action !== 'manage') continue;
    if (perm.resource !== resource) continue;

    // Check conditions
    if (perm.conditions && perm.conditions.length > 0) {
      if (!evaluateConditions(perm.conditions, context)) {
        continue;
      }
    }

    return perm;
  }

  return null;
}

/**
 * Evaluate permission conditions.
 */
function evaluateConditions(
  conditions: PermissionCondition[],
  context?: Record<string, unknown>
): boolean {
  if (!context) return false;

  for (const condition of conditions) {
    const value = context[condition.field];

    switch (condition.operator) {
      case 'eq':
        if (value !== condition.value) return false;
        break;
      case 'neq':
        if (value === condition.value) return false;
        break;
      case 'in':
        if (!Array.isArray(condition.value) || !condition.value.includes(value)) return false;
        break;
      case 'nin':
        if (Array.isArray(condition.value) && condition.value.includes(value)) return false;
        break;
      case 'exists':
        if ((value !== undefined) !== condition.value) return false;
        break;
    }
  }

  return true;
}

/**
 * Get role by ID.
 */
export function getRole(roleId: string): Role | null {
  if (isBuiltInRole(roleId)) {
    return getBuiltInRole(roleId as 'admin' | 'editor' | 'author' | 'reviewer' | 'viewer');
  }
  return customRoles.get(roleId) || null;
}

/**
 * Get user's roles.
 */
export function getUserRoles(userId: string): UserRole[] {
  return userRoles.get(userId) || [];
}

/**
 * Assign role to user.
 */
export function assignRole(
  userId: string,
  roleId: string,
  assignedBy: string,
  expiresAt?: Date
): UserRole {
  const assignment: UserRole = {
    userId,
    roleId,
    assignedAt: new Date(),
    assignedBy,
    expiresAt,
  };

  const existing = userRoles.get(userId) || [];

  // Remove existing assignment for same role
  const filtered = existing.filter(r => r.roleId !== roleId);
  filtered.push(assignment);

  userRoles.set(userId, filtered);
  return assignment;
}

/**
 * Remove role from user.
 */
export function removeRole(userId: string, roleId: string): boolean {
  const existing = userRoles.get(userId);
  if (!existing) return false;

  const filtered = existing.filter(r => r.roleId !== roleId);
  if (filtered.length === existing.length) return false;

  userRoles.set(userId, filtered);
  return true;
}

/**
 * Create custom role.
 */
export function createCustomRole(role: Omit<Role, 'isBuiltIn' | 'createdAt' | 'updatedAt'>): Role {
  const newRole: Role = {
    ...role,
    isBuiltIn: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  customRoles.set(role.id, newRole);
  return newRole;
}

/**
 * Update custom role.
 */
export function updateCustomRole(
  roleId: string,
  updates: Partial<Pick<Role, 'name' | 'description' | 'permissions'>>
): Role | null {
  const role = customRoles.get(roleId);
  if (!role) return null;

  const updated: Role = {
    ...role,
    ...updates,
    updatedAt: new Date(),
  };

  customRoles.set(roleId, updated);
  return updated;
}

/**
 * Delete custom role.
 */
export function deleteCustomRole(roleId: string): boolean {
  if (isBuiltInRole(roleId)) return false;
  return customRoles.delete(roleId);
}

/**
 * Get all roles.
 */
export function getAllRoles(): Role[] {
  const builtIn = Object.values(getBuiltInRole('admin') ?
    { admin: getBuiltInRole('admin'), editor: getBuiltInRole('editor'),
      author: getBuiltInRole('author'), reviewer: getBuiltInRole('reviewer'),
      viewer: getBuiltInRole('viewer') } : {});
  return [...builtIn, ...Array.from(customRoles.values())];
}

/**
 * Log audit entry.
 */
function logAudit(
  userId: string,
  action: PermissionAction,
  resource: ResourceType,
  resourceId: string | undefined,
  allowed: boolean
): void {
  auditLog.push({
    userId,
    action,
    resource,
    resourceId,
    allowed,
    timestamp: new Date(),
  });

  // Keep last 10000 entries
  if (auditLog.length > 10000) {
    auditLog.shift();
  }
}

/**
 * Get audit log.
 */
export function getAuditLog(
  filters?: { userId?: string; action?: PermissionAction; resource?: ResourceType },
  limit: number = 100
): typeof auditLog {
  let result = [...auditLog];

  if (filters?.userId) {
    result = result.filter(e => e.userId === filters.userId);
  }
  if (filters?.action) {
    result = result.filter(e => e.action === filters.action);
  }
  if (filters?.resource) {
    result = result.filter(e => e.resource === filters.resource);
  }

  return result.slice(-limit).reverse();
}

/**
 * Check multiple permissions at once.
 */
export function checkPermissions(
  userId: string,
  checks: Array<{ action: PermissionAction; resource: ResourceType }>
): Map<string, boolean> {
  const results = new Map<string, boolean>();

  for (const check of checks) {
    const key = `${check.action}:${check.resource}`;
    const result = checkPermission(userId, check.action, check.resource);
    results.set(key, result.allowed);
  }

  return results;
}
