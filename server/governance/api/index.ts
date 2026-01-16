/**
 * Executive Governance API Module
 * Answers key executive questions about platform governance
 */

export * from './types';
export {
  getAutonomyImpact,
  getHumanBottleneck,
  getAutomationDependency,
  getDangerousPattern,
  getGovernanceStatus,
  clearApiCache,
} from './routes';
