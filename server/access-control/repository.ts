// Stub - access control disabled
export const accessControlRepository = {
  getRoles: async () => [],
  getPermissions: async () => [],
  checkAccess: async () => true,
};
export async function getAllRoles(): Promise<any[]> {
  return [];
}
export async function getRoleByName(name: string): Promise<any> {
  return null;
}
