/**
 * Feature Activation Contract
 * Defines dependencies, risks, and requirements for each feature
 * All evaluators MUST use this contract for feature-related decisions
 */

export type ReadinessLevel = 'BLOCKED' | 'STAGING' | 'CUTOVER' | 'GO_LIVE';

export type DegradedMode = 'none' | 'read_only' | 'limited' | 'fallback';

export interface FeatureRisk {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  mitigation: string;
}

export interface FeatureContract {
  name: string;
  displayName: string;
  description: string;

  // Dependencies
  dependencies: string[];

  // Risks
  risks: FeatureRisk[];

  // Readiness requirements
  requiredReadinessLevel: ReadinessLevel;

  // Approval requirements (roles that must approve)
  approvalRequirements: string[];

  // Degraded mode options
  allowedDegradedModes: DegradedMode[];

  // Feature flag name
  featureFlag: string;

  // Version
  version: string;
}

// Feature contracts registry
const featureContracts: Map<string, FeatureContract> = new Map();

/**
 * Register a feature contract
 */
export function registerFeatureContract(contract: FeatureContract): void {
  featureContracts.set(contract.name, contract);
}

/**
 * Get a feature contract by name
 */
export function getFeatureContract(name: string): FeatureContract | undefined {
  return featureContracts.get(name);
}

/**
 * Get all feature contracts
 */
export function getAllFeatureContracts(): FeatureContract[] {
  return Array.from(featureContracts.values());
}

/**
 * Validate a feature can be enabled based on its contract
 */
export interface ContractValidationResult {
  valid: boolean;
  missingDependencies: string[];
  unmitigatedRisks: FeatureRisk[];
  readinessGap: {
    required: ReadinessLevel;
    current: ReadinessLevel;
    met: boolean;
  };
  pendingApprovals: string[];
}

export function validateFeatureContract(
  featureName: string,
  currentReadiness: ReadinessLevel,
  enabledFeatures: string[],
  approvedBy: string[] = []
): ContractValidationResult {
  const contract = getFeatureContract(featureName);

  if (!contract) {
    return {
      valid: false,
      missingDependencies: [],
      unmitigatedRisks: [],
      readinessGap: {
        required: 'GO_LIVE',
        current: currentReadiness,
        met: false,
      },
      pendingApprovals: ['contract_definition'],
    };
  }

  // Check dependencies
  const missingDependencies = contract.dependencies.filter(
    dep => !enabledFeatures.includes(dep)
  );

  // Check risks (high and critical must be acknowledged)
  const unmitigatedRisks = contract.risks.filter(
    r => r.severity === 'critical' || r.severity === 'high'
  );

  // Check readiness level
  const readinessOrder: ReadinessLevel[] = ['BLOCKED', 'STAGING', 'CUTOVER', 'GO_LIVE'];
  const currentLevel = readinessOrder.indexOf(currentReadiness);
  const requiredLevel = readinessOrder.indexOf(contract.requiredReadinessLevel);
  const readinessMet = currentLevel >= requiredLevel;

  // Check approvals
  const pendingApprovals = contract.approvalRequirements.filter(
    req => !approvedBy.includes(req)
  );

  const valid =
    missingDependencies.length === 0 &&
    readinessMet &&
    pendingApprovals.length === 0;

  return {
    valid,
    missingDependencies,
    unmitigatedRisks,
    readinessGap: {
      required: contract.requiredReadinessLevel,
      current: currentReadiness,
      met: readinessMet,
    },
    pendingApprovals,
  };
}

// ============================================
// Default Feature Contracts
// ============================================

// Core Governance
registerFeatureContract({
  name: 'governance',
  displayName: 'Enterprise Governance',
  description: 'Core governance platform including RBAC, approvals, and audit',
  dependencies: [],
  risks: [
    {
      id: 'GOV-R001',
      severity: 'high',
      description: 'Enabling governance may lock out users without proper role assignment',
      mitigation: 'Ensure admin users are assigned before enabling',
    },
  ],
  requiredReadinessLevel: 'STAGING',
  approvalRequirements: ['admin'],
  allowedDegradedModes: ['read_only'],
  featureFlag: 'ENABLE_ENTERPRISE_GOVERNANCE',
  version: '1.0.0',
});

// RBAC
registerFeatureContract({
  name: 'rbac',
  displayName: 'Role-Based Access Control',
  description: 'Fine-grained role and permission management',
  dependencies: [],
  risks: [
    {
      id: 'RBAC-R001',
      severity: 'medium',
      description: 'Misconfigured roles may grant excessive permissions',
      mitigation: 'Use principle of least privilege',
    },
  ],
  requiredReadinessLevel: 'STAGING',
  approvalRequirements: [],
  allowedDegradedModes: ['read_only'],
  featureFlag: 'ENABLE_RBAC',
  version: '1.0.0',
});

// Policy Enforcement
registerFeatureContract({
  name: 'policy_enforcement',
  displayName: 'Policy Enforcement Middleware',
  description: 'Automatic policy evaluation and enforcement on routes',
  dependencies: ['governance', 'rbac'],
  risks: [
    {
      id: 'POL-R001',
      severity: 'critical',
      description: 'Overly restrictive policies may block legitimate operations',
      mitigation: 'Test policies in staging before production',
    },
    {
      id: 'POL-R002',
      severity: 'high',
      description: 'Policy cache invalidation issues may cause stale decisions',
      mitigation: 'Set appropriate TTL and monitor cache hit rates',
    },
  ],
  requiredReadinessLevel: 'CUTOVER',
  approvalRequirements: ['admin', 'security_team'],
  allowedDegradedModes: ['limited', 'fallback'],
  featureFlag: 'ENABLE_POLICY_ENFORCEMENT',
  version: '1.0.0',
});

// Export Center V2
registerFeatureContract({
  name: 'export_center',
  displayName: 'Export Center V2',
  description: 'Governed data exports with approval workflows',
  dependencies: ['governance'],
  risks: [
    {
      id: 'EXP-R001',
      severity: 'high',
      description: 'Uncontrolled exports may leak sensitive data',
      mitigation: 'Enable approval workflows for sensitive exports',
    },
    {
      id: 'EXP-R002',
      severity: 'medium',
      description: 'Large exports may impact system performance',
      mitigation: 'Implement rate limiting and async processing',
    },
  ],
  requiredReadinessLevel: 'STAGING',
  approvalRequirements: ['data_owner'],
  allowedDegradedModes: ['limited'],
  featureFlag: 'ENABLE_EXPORT_CENTER_V2',
  version: '2.0.0',
});

// Approval Notifications
registerFeatureContract({
  name: 'approval_notifications',
  displayName: 'Approval Notifications',
  description: 'Multi-channel notifications for approval workflows',
  dependencies: [],
  risks: [
    {
      id: 'NOTIF-R001',
      severity: 'low',
      description: 'Notification failures may delay approvals',
      mitigation: 'Implement retry logic and fallback channels',
    },
  ],
  requiredReadinessLevel: 'STAGING',
  approvalRequirements: [],
  allowedDegradedModes: ['none'],
  featureFlag: 'ENABLE_APPROVAL_NOTIFICATIONS',
  version: '1.0.0',
});

// Approval Escalation
registerFeatureContract({
  name: 'approval_escalation',
  displayName: 'Approval Escalation',
  description: 'Automatic escalation based on SLA rules',
  dependencies: ['approval_notifications'],
  risks: [
    {
      id: 'ESC-R001',
      severity: 'medium',
      description: 'Aggressive escalation may cause notification fatigue',
      mitigation: 'Set reasonable SLA thresholds',
    },
  ],
  requiredReadinessLevel: 'STAGING',
  approvalRequirements: [],
  allowedDegradedModes: ['none'],
  featureFlag: 'ENABLE_APPROVAL_ESCALATION',
  version: '1.0.0',
});

// Autonomy Matrix
registerFeatureContract({
  name: 'autonomy_matrix',
  displayName: 'Autonomy Matrix',
  description: 'AI autonomy level configuration and enforcement',
  dependencies: ['governance', 'policy_enforcement'],
  risks: [
    {
      id: 'AUTO-R001',
      severity: 'critical',
      description: 'Excessive autonomy may lead to unintended actions',
      mitigation: 'Start with conservative autonomy levels',
    },
    {
      id: 'AUTO-R002',
      severity: 'high',
      description: 'Autonomy decisions need human oversight',
      mitigation: 'Enable audit logging for all autonomy decisions',
    },
  ],
  requiredReadinessLevel: 'GO_LIVE',
  approvalRequirements: ['admin', 'security_team', 'executive'],
  allowedDegradedModes: ['limited', 'fallback'],
  featureFlag: 'ENABLE_AUTONOMY_MATRIX',
  version: '1.0.0',
});

// Platform Status
registerFeatureContract({
  name: 'platform_status',
  displayName: 'Platform Status',
  description: 'Single atomic snapshot of platform state',
  dependencies: [],
  risks: [],
  requiredReadinessLevel: 'STAGING',
  approvalRequirements: [],
  allowedDegradedModes: ['limited'],
  featureFlag: 'ENABLE_PLATFORM_STATUS',
  version: '1.0.0',
});

// Execution Gate
registerFeatureContract({
  name: 'execution_gate',
  displayName: 'Execution Gate',
  description: 'Final authority for platform actions',
  dependencies: ['platform_status', 'governance'],
  risks: [
    {
      id: 'GATE-R001',
      severity: 'high',
      description: 'Gate failures may block all operations',
      mitigation: 'Implement graceful degradation and bypass for emergencies',
    },
  ],
  requiredReadinessLevel: 'CUTOVER',
  approvalRequirements: ['admin'],
  allowedDegradedModes: ['fallback'],
  featureFlag: 'ENABLE_EXECUTION_GATE',
  version: '1.0.0',
});

// Contradiction Detector
registerFeatureContract({
  name: 'contradiction_detector',
  displayName: 'Contradiction Detector',
  description: 'Detects conflicts between platform subsystems',
  dependencies: ['platform_status'],
  risks: [],
  requiredReadinessLevel: 'STAGING',
  approvalRequirements: [],
  allowedDegradedModes: ['none'],
  featureFlag: 'ENABLE_CONTRADICTION_DETECTOR',
  version: '1.0.0',
});

export default {
  registerFeatureContract,
  getFeatureContract,
  getAllFeatureContracts,
  validateFeatureContract,
};
