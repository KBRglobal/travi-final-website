export const accessControlRepository = {
  getRoles: async () => [],
  getRole: async (id: string) => null,
  createRole: async (data: any) => ({ id: 'stub', ...data }),
  updateRole: async (id: string, data: any) => ({ id, ...data }),
  deleteRole: async (id: string) => true,
  getPermissions: async () => [],
};
