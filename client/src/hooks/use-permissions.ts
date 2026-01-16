import { useQuery } from "@tanstack/react-query";
import { ROLE_PERMISSIONS, type UserRole, type RolePermissions } from "@shared/schema";

interface PermissionsResponse {
  role: UserRole;
  permissions: RolePermissions;
}

export function usePermissions() {
  const { data, isLoading, error } = useQuery<PermissionsResponse>({
    queryKey: ["/api/user/permissions"],
    staleTime: 1000 * 60 * 5,
  });

  const role = data?.role || "viewer";
  const permissions = data?.permissions || ROLE_PERMISSIONS.viewer;

  return {
    role,
    permissions,
    isLoading,
    error,
    canCreate: permissions.canCreate,
    canEdit: permissions.canEdit,
    canDelete: permissions.canDelete,
    canPublish: permissions.canPublish,
    canManageUsers: permissions.canManageUsers,
    canManageSettings: permissions.canManageSettings,
    canViewAll: permissions.canViewAll,
  };
}

export function useHasPermission(permission: keyof RolePermissions): boolean {
  const { permissions } = usePermissions();
  return permissions[permission] ?? false;
}
