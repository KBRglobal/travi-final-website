/**
 * Approval Workflow Rules
 * Feature flag: ENABLE_APPROVAL_WORKFLOWS
 */

import { WorkflowRule, WorkflowCondition, WorkflowStepConfig, RequestType } from "./types";

// Built-in workflow rules
export const BUILT_IN_RULES: WorkflowRule[] = [
  {
    id: "publish-standard",
    name: "Standard Publish Workflow",
    description: "Default approval for publishing content",
    condition: {
      requestType: "publish",
    },
    steps: [
      {
        stepNumber: 1,
        name: "Editor Review",
        approverType: "role",
        approverRole: "editor",
        notifyOnPending: true,
      },
    ],
    priority: 100,
    isActive: true,
  },
  {
    id: "publish-low-score",
    name: "Low Score Publish Workflow",
    description: "Additional approval for content with low ICE score",
    condition: {
      requestType: "publish",
      maxScore: 50,
    },
    steps: [
      {
        stepNumber: 1,
        name: "Editor Review",
        approverType: "role",
        approverRole: "editor",
        notifyOnPending: true,
      },
      {
        stepNumber: 2,
        name: "Admin Approval",
        approverType: "role",
        approverRole: "admin",
        notifyOnPending: true,
      },
    ],
    priority: 200,
    isActive: true,
  },
  {
    id: "delete-content",
    name: "Delete Content Workflow",
    description: "Approval required for content deletion",
    condition: {
      requestType: "delete",
    },
    steps: [
      {
        stepNumber: 1,
        name: "Admin Approval",
        approverType: "role",
        approverRole: "admin",
        notifyOnPending: true,
      },
    ],
    priority: 100,
    isActive: true,
  },
  {
    id: "regenerate-content",
    name: "Regenerate Content Workflow",
    description: "Approval for AI regeneration",
    condition: {
      requestType: "regenerate",
    },
    steps: [
      {
        stepNumber: 1,
        name: "Editor Review",
        approverType: "role",
        approverRole: "editor",
        autoApproveHours: 24,
        notifyOnPending: true,
      },
    ],
    priority: 100,
    isActive: true,
  },
  {
    id: "bulk-update",
    name: "Bulk Update Workflow",
    description: "Multi-step approval for bulk operations",
    condition: {
      requestType: "bulk_update",
    },
    steps: [
      {
        stepNumber: 1,
        name: "Editor Review",
        approverType: "role",
        approverRole: "editor",
        notifyOnPending: true,
      },
      {
        stepNumber: 2,
        name: "Admin Approval",
        approverType: "role",
        approverRole: "admin",
        notifyOnPending: true,
      },
      {
        stepNumber: 3,
        name: "Super Admin Sign-off",
        approverType: "role",
        approverRole: "super_admin",
        notifyOnPending: true,
      },
    ],
    priority: 300,
    isActive: true,
  },
];

export interface RuleMatchContext {
  requestType: RequestType;
  resourceType: string;
  contentType?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Find matching workflow rule for a context
 */
export function findMatchingRule(context: RuleMatchContext): WorkflowRule | null {
  const matchingRules = BUILT_IN_RULES.filter((rule) => {
    if (!rule.isActive) return false;
    return matchesCondition(rule.condition, context);
  });

  if (matchingRules.length === 0) return null;

  // Return highest priority rule
  matchingRules.sort((a, b) => b.priority - a.priority);
  return matchingRules[0];
}

/**
 * Check if context matches condition
 */
export function matchesCondition(
  condition: WorkflowCondition,
  context: RuleMatchContext
): boolean {
  // Request type match
  if (condition.requestType && condition.requestType !== context.requestType) {
    return false;
  }

  // Resource type match
  if (condition.resourceType && condition.resourceType !== context.resourceType) {
    return false;
  }

  // Content type match
  if (condition.contentType && condition.contentType !== context.contentType) {
    return false;
  }

  // Score range
  if (condition.minScore !== undefined && context.score !== undefined) {
    if (context.score < condition.minScore) return false;
  }
  if (condition.maxScore !== undefined && context.score !== undefined) {
    if (context.score > condition.maxScore) return false;
  }

  // Custom field match
  if (condition.customField && context.metadata) {
    const actualValue = context.metadata[condition.customField];
    if (actualValue !== condition.customValue) return false;
  }

  return true;
}

/**
 * Get steps for a rule
 */
export function getRuleSteps(ruleId: string): WorkflowStepConfig[] {
  const rule = BUILT_IN_RULES.find((r) => r.id === ruleId);
  return rule?.steps || [];
}

/**
 * Check if a request type requires approval
 */
export function requiresApproval(requestType: RequestType): boolean {
  return BUILT_IN_RULES.some(
    (rule) =>
      rule.isActive &&
      (!rule.condition.requestType || rule.condition.requestType === requestType)
  );
}

console.log("[Approvals] Rules loaded");
