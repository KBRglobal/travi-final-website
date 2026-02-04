// Stub - approvals disabled
export const approvalsRepository = {
  getPendingApprovals: async () => [],
  approve: async () => true,
  reject: async () => true,
};
export async function getApprovalStats(): Promise<any> {
  return { pending: 0, approved: 0, rejected: 0 };
}
export async function getRecentActivity(limit?: number): Promise<any[]> {
  return [];
}
