/**
 * SEO Engine Governance Module
 *
 * Provides safety controls for SEO actions:
 * - Approval gates for destructive actions
 * - Dry-run execution
 * - Rollback tokens
 * - Audit logging
 */

export {
  checkApprovalRequired,
  requestApproval,
  approveRequest,
  rejectRequest,
  getPendingApprovals,
  getApproval,
  canProceed,
  cleanupExpiredApprovals,
  type SEOActionType,
  type ApprovalRequest,
  type ApprovalResult,
} from "./approval-gate";

export {
  executeAction,
  rollbackAction,
  getActiveRollbackTokens,
  type ActionRequest,
  type ActionResult,
  type RollbackData,
} from "./action-executor";

/**
 * Audit trail entry
 */
export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: string;
  contentId: string;
  executedBy: string;
  dryRun: boolean;
  changes: Record<string, unknown>;
  rollbackToken?: string;
  approvalId?: string;
}

// In-memory audit log (would use DB in production)
const auditLog: AuditEntry[] = [];

/**
 * Get recent audit entries
 */
export function getRecentAuditEntries(limit = 100): AuditEntry[] {
  return auditLog.slice(-limit).reverse();
}

/**
 * Get audit entries for a specific content item
 */
export function getAuditEntriesForContent(contentId: string): AuditEntry[] {
  return auditLog.filter(e => e.contentId === contentId).reverse();
}
