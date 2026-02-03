export const approvalsRepository = {
  getPendingApprovals: async () => [],
  getApproval: async (id: string) => null,
  createApproval: async (data: any) => ({ id: 'stub', ...data }),
  approveRequest: async (id: string) => true,
  rejectRequest: async (id: string) => true,
};
