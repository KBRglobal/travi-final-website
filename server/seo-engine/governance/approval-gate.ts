/**
 * SEO Action Approval Gate
 *
 * Manages approval requirements for destructive SEO actions.
 * Integrates with existing approval workflow system if available.
 */

import { db } from '../../db';
import { actionRequiresApproval, getAutopilotConfig } from '../config';

// ============================================================================
// Types
// ============================================================================

export type SEOActionType =
  | 'SET_NOINDEX'
  | 'REMOVE_NOINDEX'
  | 'SET_CANONICAL'
  | 'REMOVE_CANONICAL'
  | 'BLOCK_PUBLISH'
  | 'UNBLOCK_PUBLISH'
  | 'MOVE_TO_DRAFT'
  | 'QUEUE_DELETE'
  | 'QUEUE_MERGE'
  | 'BULK_NOINDEX'
  | 'BULK_REINDEX'
  | 'INJECT_LINKS'
  | 'REMOVE_LINKS'
  | 'CHANGE_CLASSIFICATION';

export interface ApprovalRequest {
  id: string;
  actionType: SEOActionType;
  contentId: string;
  contentTitle: string;
  requestedBy: string;
  requestedAt: Date;
  reason: string;
  metadata: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNote?: string;
  expiresAt: Date;
}

export interface ApprovalResult {
  approved: boolean;
  requiresApproval: boolean;
  approvalId?: string;
  reason: string;
}

// Destructive actions that ALWAYS require approval
const ALWAYS_REQUIRE_APPROVAL: SEOActionType[] = [
  'QUEUE_DELETE',
  'BULK_NOINDEX',
  'BULK_REINDEX',
];

// Actions that require approval in supervised mode
const SUPERVISED_REQUIRE_APPROVAL: SEOActionType[] = [
  'SET_NOINDEX',
  'BLOCK_PUBLISH',
  'MOVE_TO_DRAFT',
  'QUEUE_MERGE',
  'INJECT_LINKS',
  'CHANGE_CLASSIFICATION',
];

// ============================================================================
// In-Memory Approval Queue (would use DB in production)
// ============================================================================

const pendingApprovals = new Map<string, ApprovalRequest>();

/**
 * Generate unique approval ID
 */
function generateApprovalId(): string {
  return `seo_approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Approval Functions
// ============================================================================

/**
 * Check if an action requires approval
 */
export function checkApprovalRequired(actionType: SEOActionType): boolean {
  // Always require approval for destructive actions
  if (ALWAYS_REQUIRE_APPROVAL.includes(actionType)) {
    return true;
  }

  const config = getAutopilotConfig();

  // In 'off' mode, everything requires approval
  if (config.mode === 'off') {
    return true;
  }

  // In 'supervised' mode, check the action type
  if (config.mode === 'supervised') {
    return SUPERVISED_REQUIRE_APPROVAL.includes(actionType);
  }

  // In 'full' mode, only always-require actions need approval
  return ALWAYS_REQUIRE_APPROVAL.includes(actionType);
}

/**
 * Request approval for an action
 */
export async function requestApproval(
  actionType: SEOActionType,
  contentId: string,
  contentTitle: string,
  requestedBy: string,
  reason: string,
  metadata: Record<string, unknown> = {}
): Promise<ApprovalRequest> {
  const id = generateApprovalId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const request: ApprovalRequest = {
    id,
    actionType,
    contentId,
    contentTitle,
    requestedBy,
    requestedAt: now,
    reason,
    metadata,
    status: 'pending',
    expiresAt,
  };

  pendingApprovals.set(id, request);

  console.log(`[SEO Governance] Approval requested: ${id} for ${actionType} on ${contentId}`);

  // In a real implementation, this would:
  // 1. Insert into approvals table
  // 2. Send notifications to approvers
  // 3. Create audit log entry

  return request;
}

/**
 * Approve an action request
 */
export async function approveRequest(
  approvalId: string,
  reviewedBy: string,
  note?: string
): Promise<{ success: boolean; message: string }> {
  const request = pendingApprovals.get(approvalId);

  if (!request) {
    return { success: false, message: 'Approval request not found' };
  }

  if (request.status !== 'pending') {
    return { success: false, message: `Request already ${request.status}` };
  }

  if (new Date() > request.expiresAt) {
    request.status = 'expired';
    return { success: false, message: 'Request has expired' };
  }

  request.status = 'approved';
  request.reviewedBy = reviewedBy;
  request.reviewedAt = new Date();
  request.reviewNote = note;

  console.log(`[SEO Governance] Approval ${approvalId} approved by ${reviewedBy}`);

  return { success: true, message: 'Request approved' };
}

/**
 * Reject an action request
 */
export async function rejectRequest(
  approvalId: string,
  reviewedBy: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const request = pendingApprovals.get(approvalId);

  if (!request) {
    return { success: false, message: 'Approval request not found' };
  }

  if (request.status !== 'pending') {
    return { success: false, message: `Request already ${request.status}` };
  }

  request.status = 'rejected';
  request.reviewedBy = reviewedBy;
  request.reviewedAt = new Date();
  request.reviewNote = reason;

  console.log(`[SEO Governance] Approval ${approvalId} rejected by ${reviewedBy}: ${reason}`);

  return { success: true, message: 'Request rejected' };
}

/**
 * Get pending approvals
 */
export function getPendingApprovals(): ApprovalRequest[] {
  const now = new Date();
  const pending: ApprovalRequest[] = [];

  for (const request of pendingApprovals.values()) {
    if (request.status === 'pending') {
      // Check expiration
      if (now > request.expiresAt) {
        request.status = 'expired';
      } else {
        pending.push(request);
      }
    }
  }

  return pending.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
}

/**
 * Get approval by ID
 */
export function getApproval(approvalId: string): ApprovalRequest | null {
  return pendingApprovals.get(approvalId) || null;
}

/**
 * Check if an action can proceed (has approval if needed)
 */
export async function canProceed(
  actionType: SEOActionType,
  contentId: string,
  requestedBy: string
): Promise<ApprovalResult> {
  const requiresApproval = checkApprovalRequired(actionType);

  if (!requiresApproval) {
    return {
      approved: true,
      requiresApproval: false,
      reason: 'Action does not require approval',
    };
  }

  // Check for existing approved request
  for (const request of pendingApprovals.values()) {
    if (
      request.actionType === actionType &&
      request.contentId === contentId &&
      request.status === 'approved' &&
      new Date() < request.expiresAt
    ) {
      return {
        approved: true,
        requiresApproval: true,
        approvalId: request.id,
        reason: 'Action has been approved',
      };
    }
  }

  return {
    approved: false,
    requiresApproval: true,
    reason: 'Action requires approval',
  };
}

/**
 * Clear expired approvals
 */
export function cleanupExpiredApprovals(): number {
  const now = new Date();
  let cleaned = 0;

  for (const [id, request] of pendingApprovals.entries()) {
    if (now > request.expiresAt && request.status === 'pending') {
      request.status = 'expired';
      cleaned++;
    }
  }

  return cleaned;
}

console.log('[SEO Governance] Approval gate loaded');
