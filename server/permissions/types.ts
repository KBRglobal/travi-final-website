/**
 * User Permissions & Roles Engine - Type Definitions
 *
 * Feature flag: ENABLE_PERMISSIONS_ENGINE=true
 */

export function isPermissionsEngineEnabled(): boolean {
  return process.env.ENABLE_PERMISSIONS_ENGINE === 'true';
}

/**
 * Built-in roles.
 */
export type BuiltInRole = 'admin' | 'editor' | 'author' | 'reviewer' | 'viewer';

/**
 * Permission actions.
 */
export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'publish'
  | 'unpublish'
  | 'approve'
  | 'reject'
  | 'manage';

/**
 * Resource types.
 */
export type ResourceType =
  | 'content'
  | 'entity'
  | 'media'
  | 'user'
  | 'role'
  | 'settings'
  | 'analytics'
  | 'jobs'
  | 'redirects'
  | 'locales';

/**
 * Permission definition.
 */
export interface Permission {
  id: string;
  action: PermissionAction;
  resource: ResourceType;
  conditions?: PermissionCondition[];
}

/**
 * Conditional permission (e.g., "own content only").
 */
export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'exists';
  value: unknown;
}

/**
 * Role definition.
 */
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User role assignment.
 */
export interface UserRole {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
}

/**
 * Permission check result.
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  matchedPermission?: Permission;
  conditions?: PermissionCondition[];
}

/**
 * Audit log entry.
 */
export interface PermissionAuditLog {
  id: string;
  userId: string;
  action: PermissionAction;
  resource: ResourceType;
  resourceId?: string;
  allowed: boolean;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
