// Stub - Workflow Engine disabled

export const workflowEngine = {
  run: async () => ({ success: false }),
  getStatus: () => ({ running: false }),
  executeWorkflow: async (_id: string, _body?: unknown) => ({
    success: false,
    error: "Workflow engine disabled",
  }),
  getWorkflows: async () => [],
  getWorkflow: async (_id: string) => null,
  getExecutions: async (_id: string) => [],
};
