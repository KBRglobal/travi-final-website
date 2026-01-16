/**
 * Approval State Machine
 * Feature flag: ENABLE_APPROVAL_WORKFLOWS
 */

import { ApprovalStatus } from "./types";

export interface StateTransition {
  from: ApprovalStatus;
  to: ApprovalStatus;
  action: string;
  guard?: (context: TransitionContext) => boolean;
}

export interface TransitionContext {
  currentStep: number;
  totalSteps: number;
  allStepsApproved: boolean;
  hasRejection: boolean;
  isExpired: boolean;
  requesterId?: string;
  deciderId?: string;
}

const TRANSITIONS: StateTransition[] = [
  // Pending can go to approved (all steps done), rejected, cancelled, or escalated
  {
    from: "pending",
    to: "approved",
    action: "approve",
    guard: (ctx) => ctx.allStepsApproved && ctx.currentStep >= ctx.totalSteps,
  },
  {
    from: "pending",
    to: "pending",
    action: "approve_step",
    guard: (ctx) => ctx.currentStep < ctx.totalSteps,
  },
  {
    from: "pending",
    to: "rejected",
    action: "reject",
  },
  {
    from: "pending",
    to: "cancelled",
    action: "cancel",
  },
  {
    from: "pending",
    to: "escalated",
    action: "escalate",
  },
  {
    from: "pending",
    to: "expired",
    action: "expire",
    guard: (ctx) => ctx.isExpired,
  },

  // Escalated can go to approved, rejected, or cancelled
  {
    from: "escalated",
    to: "approved",
    action: "approve",
  },
  {
    from: "escalated",
    to: "rejected",
    action: "reject",
  },
  {
    from: "escalated",
    to: "cancelled",
    action: "cancel",
  },

  // Rejected can be cancelled (cleanup)
  {
    from: "rejected",
    to: "cancelled",
    action: "cancel",
  },
];

export function canTransition(
  from: ApprovalStatus,
  to: ApprovalStatus,
  action: string,
  context: TransitionContext
): boolean {
  const transition = TRANSITIONS.find(
    (t) => t.from === from && t.to === to && t.action === action
  );

  if (!transition) return false;
  if (transition.guard && !transition.guard(context)) return false;

  return true;
}

export function getValidTransitions(
  from: ApprovalStatus,
  context: TransitionContext
): StateTransition[] {
  return TRANSITIONS.filter((t) => {
    if (t.from !== from) return false;
    if (t.guard && !t.guard(context)) return false;
    return true;
  });
}

export function validateTransition(
  from: ApprovalStatus,
  to: ApprovalStatus,
  action: string,
  context: TransitionContext
): { valid: boolean; reason?: string } {
  const transition = TRANSITIONS.find(
    (t) => t.from === from && t.to === to && t.action === action
  );

  if (!transition) {
    return {
      valid: false,
      reason: `No transition from ${from} to ${to} via ${action}`,
    };
  }

  if (transition.guard && !transition.guard(context)) {
    return {
      valid: false,
      reason: `Guard condition not met for ${action}`,
    };
  }

  return { valid: true };
}

export function isTerminalState(status: ApprovalStatus): boolean {
  return ["approved", "rejected", "cancelled", "expired"].includes(status);
}

export function canBeApproved(status: ApprovalStatus): boolean {
  return ["pending", "escalated"].includes(status);
}

export function canBeRejected(status: ApprovalStatus): boolean {
  return ["pending", "escalated"].includes(status);
}

console.log("[Approvals] StateMachine loaded");
