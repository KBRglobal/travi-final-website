/**
 * Safe Action Executor
 *
 * Executes SEO actions with:
 * - Dry-run support
 * - Rollback tokens
 * - Approval integration
 * - Audit logging
 */

import { db } from '../../db';
import { contents } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { checkApprovalRequired, canProceed, requestApproval, type SEOActionType } from './approval-gate';
import { getAutopilotConfig } from '../config';

// ============================================================================
// Types
// ============================================================================

export interface ActionRequest {
  actionType: SEOActionType;
  contentId: string;
  data?: Record<string, unknown>;
  reason: string;
  requestedBy: string;
  dryRun?: boolean;
}

export interface ActionResult {
  success: boolean;
  executed: boolean;
  dryRun: boolean;
  rollbackToken?: string;
  approvalRequired?: boolean;
  approvalId?: string;
  message: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  error?: string;
}

export interface RollbackData {
  action: string;
  contentId: string;
  previousState: Record<string, unknown>;
  executedAt: number;
  executedBy: string;
}

// ============================================================================
// Rollback Token Management
// ============================================================================

const rollbackTokens = new Map<string, RollbackData>();

function generateRollbackToken(data: RollbackData): string {
  const token = Buffer.from(JSON.stringify(data)).toString('base64');
  rollbackTokens.set(token, data);

  // Cleanup old tokens (keep for 24 hours)
  setTimeout(() => rollbackTokens.delete(token), 24 * 60 * 60 * 1000);

  return token;
}

// ============================================================================
// Action Executor
// ============================================================================

/**
 * Execute an SEO action with safety checks
 */
export async function executeAction(request: ActionRequest): Promise<ActionResult> {
  const { actionType, contentId, data, reason, requestedBy, dryRun = false } = request;

  // Get current content state for rollback
  const content = await db.query.contents.findFirst({
    where: eq(contents.id, contentId),
  });

  if (!content) {
    return {
      success: false,
      executed: false,
      dryRun,
      message: 'Content not found',
      error: 'CONTENT_NOT_FOUND',
    };
  }

  // Check approval requirements
  if (!dryRun) {
    const approvalResult = await canProceed(actionType, contentId, requestedBy);

    if (!approvalResult.approved && approvalResult.requiresApproval) {
      // Create approval request
      const approvalRequest = await requestApproval(
        actionType,
        contentId,
        content.title,
        requestedBy,
        reason,
        data || {}
      );

      return {
        success: false,
        executed: false,
        dryRun,
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message: 'Action requires approval',
      };
    }
  }

  // Execute action (or simulate if dry-run)
  try {
    const result = await performAction(actionType, content, data || {}, dryRun, requestedBy);
    return result;
  } catch (error) {
    return {
      success: false,
      executed: false,
      dryRun,
      message: 'Action failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Perform the actual action
 */
async function performAction(
  actionType: SEOActionType,
  content: any,
  data: Record<string, unknown>,
  dryRun: boolean,
  executedBy: string
): Promise<ActionResult> {
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  let rollbackToken: string | undefined;

  switch (actionType) {
    case 'SET_NOINDEX': {
      const reason = (data.reason as string) || 'SEO Engine action';
      changes.noindex = { before: content.noindex || false, after: true };
      changes.noindexReason = { before: content.noindexReason, after: reason };

      if (!dryRun) {
        await db.update(contents).set({
          noindex: true,
          noindexReason: reason,
          noindexedAt: new Date(),
        } as any).where(eq(contents.id, content.id));

        rollbackToken = generateRollbackToken({
          action: 'SET_NOINDEX',
          contentId: content.id,
          previousState: {
            noindex: content.noindex || false,
            noindexReason: content.noindexReason,
          },
          executedAt: Date.now(),
          executedBy,
        });
      }
      break;
    }

    case 'REMOVE_NOINDEX': {
      changes.noindex = { before: content.noindex || false, after: false };
      changes.noindexReason = { before: content.noindexReason, after: null };

      if (!dryRun) {
        await db.update(contents).set({
          noindex: false,
          noindexReason: null,
          noindexedAt: null,
        } as any).where(eq(contents.id, content.id));

        rollbackToken = generateRollbackToken({
          action: 'REMOVE_NOINDEX',
          contentId: content.id,
          previousState: {
            noindex: content.noindex || true,
            noindexReason: content.noindexReason,
          },
          executedAt: Date.now(),
          executedBy,
        });
      }
      break;
    }

    case 'SET_CANONICAL': {
      const canonicalUrl = data.canonicalUrl as string;
      changes.canonicalUrl = { before: content.canonicalUrl, after: canonicalUrl };

      if (!dryRun) {
        await db.update(contents).set({
          canonicalUrl,
        } as any).where(eq(contents.id, content.id));

        rollbackToken = generateRollbackToken({
          action: 'SET_CANONICAL',
          contentId: content.id,
          previousState: { canonicalUrl: content.canonicalUrl },
          executedAt: Date.now(),
          executedBy,
        });
      }
      break;
    }

    case 'BLOCK_PUBLISH': {
      const blockReason = (data.reason as string) || 'SEO requirements not met';
      changes.publishBlocked = { before: content.publishBlocked || false, after: true };
      changes.publishBlockReason = { before: content.publishBlockReason, after: blockReason };

      if (!dryRun) {
        await db.update(contents).set({
          publishBlocked: true,
          publishBlockReason: blockReason,
          publishBlockedAt: new Date(),
        } as any).where(eq(contents.id, content.id));

        rollbackToken = generateRollbackToken({
          action: 'BLOCK_PUBLISH',
          contentId: content.id,
          previousState: {
            publishBlocked: content.publishBlocked || false,
            publishBlockReason: content.publishBlockReason,
          },
          executedAt: Date.now(),
          executedBy,
        });
      }
      break;
    }

    case 'UNBLOCK_PUBLISH': {
      changes.publishBlocked = { before: content.publishBlocked || false, after: false };

      if (!dryRun) {
        await db.update(contents).set({
          publishBlocked: false,
          publishBlockReason: null,
          publishBlockedAt: null,
        } as any).where(eq(contents.id, content.id));

        rollbackToken = generateRollbackToken({
          action: 'UNBLOCK_PUBLISH',
          contentId: content.id,
          previousState: {
            publishBlocked: content.publishBlocked || true,
            publishBlockReason: content.publishBlockReason,
          },
          executedAt: Date.now(),
          executedBy,
        });
      }
      break;
    }

    case 'MOVE_TO_DRAFT': {
      changes.status = { before: content.status, after: 'draft' };

      if (!dryRun) {
        await db.update(contents).set({
          status: 'draft',
          movedToDraftAt: new Date(),
          movedToDraftBy: executedBy,
          movedToDraftReason: data.reason as string,
        } as any).where(eq(contents.id, content.id));

        rollbackToken = generateRollbackToken({
          action: 'MOVE_TO_DRAFT',
          contentId: content.id,
          previousState: { status: content.status },
          executedAt: Date.now(),
          executedBy,
        });
      }
      break;
    }

    case 'QUEUE_DELETE': {
      changes.deleteQueued = { before: false, after: true };

      if (!dryRun) {
        await db.update(contents).set({
          deleteQueued: true,
          deleteQueuedAt: new Date(),
          deleteQueuedBy: executedBy,
          deleteReason: data.reason as string,
        } as any).where(eq(contents.id, content.id));
        // No rollback for delete queue - requires manual intervention
      }
      break;
    }

    case 'QUEUE_MERGE': {
      const mergeWithId = data.mergeWithId as string;
      changes.mergeQueued = { before: false, after: true };
      changes.mergeWithId = { before: null, after: mergeWithId };

      if (!dryRun) {
        await db.update(contents).set({
          mergeQueued: true,
          mergeQueuedAt: new Date(),
          mergeWithId,
          mergeReason: data.reason as string,
        } as any).where(eq(contents.id, content.id));

        rollbackToken = generateRollbackToken({
          action: 'QUEUE_MERGE',
          contentId: content.id,
          previousState: { mergeQueued: false, mergeWithId: null },
          executedAt: Date.now(),
          executedBy,
        });
      }
      break;
    }

    case 'CHANGE_CLASSIFICATION': {
      const newClassification = data.classification as string;
      changes.pageClassification = { before: content.pageClassification, after: newClassification };

      if (!dryRun) {
        await db.update(contents).set({
          pageClassification: newClassification,
          classificationChangedAt: new Date(),
          classificationChangedBy: executedBy,
        } as any).where(eq(contents.id, content.id));

        rollbackToken = generateRollbackToken({
          action: 'CHANGE_CLASSIFICATION',
          contentId: content.id,
          previousState: { pageClassification: content.pageClassification },
          executedAt: Date.now(),
          executedBy,
        });
      }
      break;
    }

    default:
      return {
        success: false,
        executed: false,
        dryRun,
        message: `Unknown action type: ${actionType}`,
        error: 'UNKNOWN_ACTION',
      };
  }

  // Log action
  if (!dryRun) {
    await logAction(actionType, content.id, changes, executedBy);
  }

  return {
    success: true,
    executed: !dryRun,
    dryRun,
    rollbackToken,
    message: dryRun
      ? `Dry run: ${actionType} would be applied`
      : `${actionType} executed successfully`,
    changes,
  };
}

/**
 * Rollback an action using a token
 */
export async function rollbackAction(
  rollbackToken: string,
  executedBy: string
): Promise<{ success: boolean; message: string }> {
  const data = rollbackTokens.get(rollbackToken);

  if (!data) {
    // Try to decode from token itself
    try {
      const decoded = JSON.parse(Buffer.from(rollbackToken, 'base64').toString()) as RollbackData;

      // Check age (max 24 hours)
      if (Date.now() - decoded.executedAt > 24 * 60 * 60 * 1000) {
        return { success: false, message: 'Rollback token has expired' };
      }

      return await performRollback(decoded, executedBy);
    } catch {
      return { success: false, message: 'Invalid rollback token' };
    }
  }

  // Check age
  if (Date.now() - data.executedAt > 24 * 60 * 60 * 1000) {
    rollbackTokens.delete(rollbackToken);
    return { success: false, message: 'Rollback token has expired' };
  }

  const result = await performRollback(data, executedBy);

  if (result.success) {
    rollbackTokens.delete(rollbackToken);
  }

  return result;
}

/**
 * Perform the rollback
 */
async function performRollback(
  data: RollbackData,
  executedBy: string
): Promise<{ success: boolean; message: string }> {
  try {
    await db.update(contents)
      .set(data.previousState as any)
      .where(eq(contents.id, data.contentId));

    await logAction(
      `ROLLBACK_${data.action}` as SEOActionType,
      data.contentId,
      { rolledBack: data.previousState },
      executedBy
    );

    return { success: true, message: `Rolled back ${data.action}` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Rollback failed',
    };
  }
}

/**
 * Log action to audit trail
 */
async function logAction(
  action: SEOActionType,
  contentId: string,
  changes: Record<string, unknown>,
  executedBy: string
): Promise<void> {
  // In production, this would write to an audit log table
  console.log(`[SEO Audit] ${action} on ${contentId} by ${executedBy}:`, JSON.stringify(changes));
}

/**
 * Get all active rollback tokens (for admin view)
 */
export function getActiveRollbackTokens(): { token: string; data: RollbackData }[] {
  const active: { token: string; data: RollbackData }[] = [];
  const now = Date.now();

  for (const [token, data] of rollbackTokens.entries()) {
    if (now - data.executedAt < 24 * 60 * 60 * 1000) {
      active.push({ token, data });
    }
  }

  return active;
}

console.log('[SEO Governance] Action executor loaded');
