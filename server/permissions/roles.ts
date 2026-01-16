/**
 * User Permissions - Role Definitions
 */

import { Role, Permission, BuiltInRole, PermissionAction, ResourceType } from './types';

/**
 * Create a permission.
 */
function perm(action: PermissionAction, resource: ResourceType): Permission {
  return {
    id: `${action}:${resource}`,
    action,
    resource,
  };
}

/**
 * All permissions for a resource.
 */
function allPerms(resource: ResourceType): Permission[] {
  const actions: PermissionAction[] = ['create', 'read', 'update', 'delete', 'manage'];
  return actions.map(action => perm(action, resource));
}

/**
 * Admin role - full access.
 */
const adminRole: Role = {
  id: 'admin',
  name: 'Administrator',
  description: 'Full system access',
  permissions: [
    ...allPerms('content'),
    ...allPerms('entity'),
    ...allPerms('media'),
    ...allPerms('user'),
    ...allPerms('role'),
    ...allPerms('settings'),
    ...allPerms('analytics'),
    ...allPerms('jobs'),
    ...allPerms('redirects'),
    ...allPerms('locales'),
    perm('publish', 'content'),
    perm('unpublish', 'content'),
    perm('approve', 'content'),
    perm('reject', 'content'),
  ],
  isBuiltIn: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

/**
 * Editor role - manage content.
 */
const editorRole: Role = {
  id: 'editor',
  name: 'Editor',
  description: 'Manage and publish content',
  permissions: [
    ...allPerms('content'),
    perm('read', 'entity'),
    perm('update', 'entity'),
    perm('create', 'entity'),
    perm('read', 'media'),
    perm('create', 'media'),
    perm('update', 'media'),
    perm('read', 'analytics'),
    perm('publish', 'content'),
    perm('unpublish', 'content'),
    perm('approve', 'content'),
    perm('reject', 'content'),
    perm('read', 'redirects'),
    perm('create', 'redirects'),
    perm('read', 'locales'),
  ],
  isBuiltIn: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

/**
 * Author role - create content.
 */
const authorRole: Role = {
  id: 'author',
  name: 'Author',
  description: 'Create and edit own content',
  permissions: [
    perm('create', 'content'),
    perm('read', 'content'),
    perm('update', 'content'),
    perm('read', 'entity'),
    perm('read', 'media'),
    perm('create', 'media'),
    perm('read', 'analytics'),
    perm('read', 'locales'),
  ],
  isBuiltIn: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

/**
 * Reviewer role - review content.
 */
const reviewerRole: Role = {
  id: 'reviewer',
  name: 'Reviewer',
  description: 'Review and approve content',
  permissions: [
    perm('read', 'content'),
    perm('approve', 'content'),
    perm('reject', 'content'),
    perm('read', 'entity'),
    perm('read', 'media'),
    perm('read', 'analytics'),
  ],
  isBuiltIn: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

/**
 * Viewer role - read only.
 */
const viewerRole: Role = {
  id: 'viewer',
  name: 'Viewer',
  description: 'Read-only access',
  permissions: [
    perm('read', 'content'),
    perm('read', 'entity'),
    perm('read', 'media'),
    perm('read', 'analytics'),
  ],
  isBuiltIn: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

/**
 * Built-in roles map.
 */
export const BUILT_IN_ROLES: Record<BuiltInRole, Role> = {
  admin: adminRole,
  editor: editorRole,
  author: authorRole,
  reviewer: reviewerRole,
  viewer: viewerRole,
};

/**
 * Get built-in role.
 */
export function getBuiltInRole(name: BuiltInRole): Role {
  return BUILT_IN_ROLES[name];
}

/**
 * Get all built-in roles.
 */
export function getAllBuiltInRoles(): Role[] {
  return Object.values(BUILT_IN_ROLES);
}

/**
 * Check if role is built-in.
 */
export function isBuiltInRole(roleId: string): boolean {
  return roleId in BUILT_IN_ROLES;
}
