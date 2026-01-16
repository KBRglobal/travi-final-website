/**
 * User Permissions & Roles Engine
 *
 * Feature flag: ENABLE_PERMISSIONS_ENGINE=true
 *
 * API:
 *   GET  /api/admin/permissions/roles
 *   GET  /api/admin/permissions/roles/builtin
 *   POST /api/admin/permissions/roles
 *   PUT  /api/admin/permissions/roles/:roleId
 *   DELETE /api/admin/permissions/roles/:roleId
 *   GET  /api/admin/permissions/users/:userId/roles
 *   POST /api/admin/permissions/users/:userId/roles
 *   DELETE /api/admin/permissions/users/:userId/roles/:roleId
 *   POST /api/admin/permissions/check
 *   POST /api/admin/permissions/check-batch
 *   GET  /api/admin/permissions/audit
 */

export { isPermissionsEngineEnabled } from './types';
export type {
  BuiltInRole,
  PermissionAction,
  ResourceType,
  Permission,
  PermissionCondition,
  Role,
  UserRole,
  PermissionCheckResult,
  PermissionAuditLog,
} from './types';

export { BUILT_IN_ROLES, getBuiltInRole, getAllBuiltInRoles, isBuiltInRole } from './roles';

export {
  checkPermission,
  checkPermissions,
  getRole,
  getUserRoles,
  assignRole,
  removeRole,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  getAllRoles,
  getAuditLog,
} from './checker';

export { permissionsRoutes } from './routes';
