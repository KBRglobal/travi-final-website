/**
 * Execution Gate Module
 * Final authority for any platform action
 * Makes decisions but NEVER executes
 * Feature flag: ENABLE_EXECUTION_GATE (default: false)
 */

import { Router, RequestHandler } from 'express';
import { generatePlatformSnapshot, PlatformSnapshot } from '../platform-status';
import { getFeatureContract, FeatureContract } from '../feature-contract';

// Types
export type ActionType = 'publish' | 'deploy' | 'regenerate' | 'migrate' | 'enable_feature' | 'disable_feature' | 'export' | 'approve' | 'reject';

export interface Actor {
  userId: string;
  role: string;
  permissions?: string[];
}

export interface ActionScope {
  feature?: string;
  contentId?: string;
  locale?: string;
  resourceType?: string;
}

export interface ExecutionCheckRequest {
  action: ActionType;
  actor: Actor;
  scope: ActionScope;
}

export type Decision = 'ALLOW' | 'WARN' | 'BLOCK';

export interface RequiredApproval {
  type: 'role' | 'user' | 'workflow';
  identifier: string;
  reason: string;
}

export interface ExecutionCheckResponse {
  decision: Decision;
  reason: string;
  requiredApprovals: RequiredApproval[];
  confidence: number; // 0-100
  sources: Array<'governance' | 'autonomy' | 'readiness' | 'policy' | 'contract'>;
  timestamp: string;
  requestId: string;
}

// Decision weights
const DECISION_WEIGHTS: Record<Decision, number> = {
  ALLOW: 0,
  WARN: 1,
  BLOCK: 2,
};

interface EvaluationResult {
  decision: Decision;
  reason: string;
  confidence: number;
  requiredApprovals: RequiredApproval[];
}

// Evaluators
async function evaluateGovernance(
  request: ExecutionCheckRequest,
  snapshot: PlatformSnapshot
): Promise<EvaluationResult> {
  const { actor, action } = request;

  // Check if governance is enabled
  if (snapshot.features['governance']?.state !== 'ON') {
    return {
      decision: 'WARN',
      reason: 'Governance not enabled - action not gated',
      confidence: 50,
      requiredApprovals: [],
    };
  }

  // Check pending approvals that might block
  if (snapshot.governance.pendingApprovals > 10) {
    return {
      decision: 'WARN',
      reason: `High pending approvals count: ${snapshot.governance.pendingApprovals}`,
      confidence: 70,
      requiredApprovals: [],
    };
  }

  // Check role-based restrictions
  const restrictedActions: ActionType[] = ['deploy', 'migrate', 'enable_feature'];
  const adminRoles = ['super_admin', 'admin', 'platform_admin'];

  if (restrictedActions.includes(action) && !adminRoles.includes(actor.role)) {
    return {
      decision: 'BLOCK',
      reason: `Action "${action}" requires admin role`,
      confidence: 95,
      requiredApprovals: [{
        type: 'role',
        identifier: 'admin',
        reason: `${action} requires admin approval`,
      }],
    };
  }

  return {
    decision: 'ALLOW',
    reason: 'Governance checks passed',
    confidence: 90,
    requiredApprovals: [],
  };
}

async function evaluateAutonomy(
  request: ExecutionCheckRequest,
  snapshot: PlatformSnapshot
): Promise<EvaluationResult> {
  const { action } = request;

  // Check autonomy mode
  if (snapshot.autonomy.mode === 'BLOCKED') {
    return {
      decision: 'BLOCK',
      reason: 'Autonomy blocked: ' + snapshot.autonomy.restrictions.join(', '),
      confidence: 100,
      requiredApprovals: [{
        type: 'workflow',
        identifier: 'autonomy_override',
        reason: 'Autonomy must be unblocked first',
      }],
    };
  }

  if (snapshot.autonomy.mode === 'DEGRADED') {
    const riskyActions: ActionType[] = ['deploy', 'migrate', 'regenerate'];
    if (riskyActions.includes(action)) {
      return {
        decision: 'WARN',
        reason: `Autonomy degraded - ${action} may have unexpected results`,
        confidence: 60,
        requiredApprovals: [],
      };
    }
  }

  return {
    decision: 'ALLOW',
    reason: 'Autonomy allows action',
    confidence: snapshot.autonomy.confidenceLevel,
    requiredApprovals: [],
  };
}

async function evaluateReadiness(
  request: ExecutionCheckRequest,
  snapshot: PlatformSnapshot
): Promise<EvaluationResult> {
  const { action } = request;

  // Production-critical actions require GO_LIVE
  const prodActions: ActionType[] = ['deploy', 'migrate'];

  if (prodActions.includes(action)) {
    if (snapshot.readiness.level === 'BLOCKED') {
      return {
        decision: 'BLOCK',
        reason: 'Platform blocked: ' + snapshot.readiness.blockers.join(', '),
        confidence: 100,
        requiredApprovals: [{
          type: 'workflow',
          identifier: 'blocker_resolution',
          reason: 'All blockers must be resolved',
        }],
      };
    }

    if (snapshot.readiness.level !== 'GO_LIVE') {
      return {
        decision: 'WARN',
        reason: `Platform not at GO_LIVE status (current: ${snapshot.readiness.level})`,
        confidence: 70,
        requiredApprovals: [],
      };
    }
  }

  return {
    decision: 'ALLOW',
    reason: 'Readiness level acceptable',
    confidence: 85,
    requiredApprovals: [],
  };
}

async function evaluatePolicy(
  request: ExecutionCheckRequest,
  snapshot: PlatformSnapshot
): Promise<EvaluationResult> {
  // Check if policy enforcement is enabled
  if (snapshot.features['policy_enforcement']?.state !== 'ON') {
    return {
      decision: 'WARN',
      reason: 'Policy enforcement not enabled',
      confidence: 50,
      requiredApprovals: [],
    };
  }

  // Check for critical incidents
  if (snapshot.incidents.bySeverity.critical > 0) {
    return {
      decision: 'BLOCK',
      reason: `${snapshot.incidents.bySeverity.critical} critical incident(s) open`,
      confidence: 95,
      requiredApprovals: [{
        type: 'workflow',
        identifier: 'incident_resolution',
        reason: 'Critical incidents must be resolved',
      }],
    };
  }

  // Check risk score
  if (snapshot.risks.overallScore < 30) {
    return {
      decision: 'BLOCK',
      reason: `Risk score too low: ${snapshot.risks.overallScore}/100`,
      confidence: 90,
      requiredApprovals: [{
        type: 'role',
        identifier: 'risk_owner',
        reason: 'Risk mitigation required',
      }],
    };
  }

  if (snapshot.risks.overallScore < 60) {
    return {
      decision: 'WARN',
      reason: `Risk score below threshold: ${snapshot.risks.overallScore}/100`,
      confidence: 75,
      requiredApprovals: [],
    };
  }

  return {
    decision: 'ALLOW',
    reason: 'Policy evaluation passed',
    confidence: 85,
    requiredApprovals: [],
  };
}

async function evaluateContract(
  request: ExecutionCheckRequest,
  snapshot: PlatformSnapshot
): Promise<EvaluationResult> {
  const { action, scope } = request;

  // Only check for feature-related actions
  if (action !== 'enable_feature' && action !== 'disable_feature') {
    return {
      decision: 'ALLOW',
      reason: 'No contract evaluation needed',
      confidence: 100,
      requiredApprovals: [],
    };
  }

  const featureName = scope.feature;
  if (!featureName) {
    return {
      decision: 'BLOCK',
      reason: 'Feature name required for feature actions',
      confidence: 100,
      requiredApprovals: [],
    };
  }

  const contract = getFeatureContract(featureName);
  if (!contract) {
    return {
      decision: 'WARN',
      reason: `No contract defined for feature: ${featureName}`,
      confidence: 50,
      requiredApprovals: [],
    };
  }

  // Check dependencies
  const missingDeps = contract.dependencies.filter(dep => {
    const depFeature = snapshot.features[dep];
    return !depFeature || depFeature.state !== 'ON';
  });

  if (missingDeps.length > 0) {
    return {
      decision: 'BLOCK',
      reason: `Missing dependencies: ${missingDeps.join(', ')}`,
      confidence: 95,
      requiredApprovals: [{
        type: 'workflow',
        identifier: 'dependency_enablement',
        reason: `Enable dependencies first: ${missingDeps.join(', ')}`,
      }],
    };
  }

  // Check readiness level
  const readinessLevels = ['BLOCKED', 'STAGING', 'CUTOVER', 'GO_LIVE'];
  const currentLevel = readinessLevels.indexOf(snapshot.readiness.level);
  const requiredLevel = readinessLevels.indexOf(contract.requiredReadinessLevel);

  if (currentLevel < requiredLevel) {
    return {
      decision: 'BLOCK',
      reason: `Feature requires ${contract.requiredReadinessLevel}, current: ${snapshot.readiness.level}`,
      confidence: 90,
      requiredApprovals: [],
    };
  }

  // Check approval requirements
  const approvals: RequiredApproval[] = contract.approvalRequirements.map(req => ({
    type: 'role' as const,
    identifier: req,
    reason: `Feature contract requires ${req} approval`,
  }));

  if (approvals.length > 0) {
    return {
      decision: 'WARN',
      reason: 'Feature requires approvals per contract',
      confidence: 80,
      requiredApprovals: approvals,
    };
  }

  return {
    decision: 'ALLOW',
    reason: 'Contract requirements met',
    confidence: 90,
    requiredApprovals: [],
  };
}

/**
 * Check if an action should be allowed
 * Makes decision but NEVER executes
 */
export async function checkExecution(request: ExecutionCheckRequest): Promise<ExecutionCheckResponse> {
  const requestId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Get current platform snapshot
  const snapshot = await generatePlatformSnapshot();

  // Run all evaluators in parallel
  const [governance, autonomy, readiness, policy, contract] = await Promise.all([
    evaluateGovernance(request, snapshot),
    evaluateAutonomy(request, snapshot),
    evaluateReadiness(request, snapshot),
    evaluatePolicy(request, snapshot),
    evaluateContract(request, snapshot),
  ]);

  // Collect all evaluations
  const evaluations = [
    { name: 'governance' as const, result: governance },
    { name: 'autonomy' as const, result: autonomy },
    { name: 'readiness' as const, result: readiness },
    { name: 'policy' as const, result: policy },
    { name: 'contract' as const, result: contract },
  ];

  // Find highest severity decision
  let finalDecision: Decision = 'ALLOW';
  const reasons: string[] = [];
  const allApprovals: RequiredApproval[] = [];
  const sources: ExecutionCheckResponse['sources'] = [];
  let totalConfidence = 0;
  let confidenceCount = 0;

  for (const { name, result } of evaluations) {
    if (DECISION_WEIGHTS[result.decision] > DECISION_WEIGHTS[finalDecision]) {
      finalDecision = result.decision;
    }

    if (result.decision !== 'ALLOW') {
      reasons.push(`[${name}] ${result.reason}`);
      sources.push(name);
    }

    allApprovals.push(...result.requiredApprovals);
    totalConfidence += result.confidence;
    confidenceCount++;
  }

  // Dedupe approvals
  const uniqueApprovals = allApprovals.filter((approval, index, arr) =>
    arr.findIndex(a => a.type === approval.type && a.identifier === approval.identifier) === index
  );

  const avgConfidence = Math.round(totalConfidence / confidenceCount);

  return {
    decision: finalDecision,
    reason: reasons.length > 0 ? reasons.join('; ') : 'All checks passed',
    requiredApprovals: uniqueApprovals,
    confidence: avgConfidence,
    sources: sources.length > 0 ? sources : ['governance', 'autonomy', 'readiness', 'policy', 'contract'],
    timestamp: new Date().toISOString(),
    requestId,
  };
}

// Express router
export const executionGateRoutes = Router();

const checkExecutionHandler: RequestHandler = async (req, res) => {
  if (process.env.ENABLE_EXECUTION_GATE !== 'true') {
    res.status(503).json({
      error: 'Execution gate not enabled',
      hint: 'Set ENABLE_EXECUTION_GATE=true',
    });
    return;
  }

  const { action, actor, scope } = req.body;

  if (!action || !actor) {
    res.status(400).json({
      error: 'Missing required fields',
      required: ['action', 'actor'],
    });
    return;
  }

  try {
    const result = await checkExecution({ action, actor, scope: scope || {} });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check execution',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

executionGateRoutes.post('/check', checkExecutionHandler);

export default executionGateRoutes;
