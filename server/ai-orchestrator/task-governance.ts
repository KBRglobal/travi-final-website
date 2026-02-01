/**
 * Task Governance (Stub)
 */

export interface TaskGovernance {
  canExecute: () => boolean;
  getPriority: () => number;
}

export function getTaskGovernance(): TaskGovernance {
  return {
    canExecute: () => true,
    getPriority: () => 1,
  };
}
