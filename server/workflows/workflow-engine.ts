// Stub - Workflows disabled
export function executeWorkflow(_name: string, _data?: unknown) {
  return Promise.resolve({ success: true });
}
export function getWorkflowStatus() {
  return { running: false };
}
export const workflowEngine = {
  execute: (_name: string, _data?: unknown) => Promise.resolve({ success: true }),
  executeWorkflow: (_name: string, _data?: unknown) => Promise.resolve({ success: true }),
};
