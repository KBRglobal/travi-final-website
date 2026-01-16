/**
 * Content Regeneration - Proposal Applier
 *
 * Applies approved proposals to content.
 */

import { db } from '@db';
import { content } from '@db/schema';
import { eq } from 'drizzle-orm';
import { RegenerationProposal, ContentBlock } from './types';
import { getProposal, updateProposalStatus } from './repository';
import { isAutoRegenerationEnabled } from './types';

/**
 * Apply a proposal to content.
 */
export async function applyProposal(
  proposalId: string,
  appliedBy: string = 'system'
): Promise<{ success: boolean; error?: string }> {
  // Get proposal
  const proposal = await getProposal(proposalId);

  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }

  if (proposal.status !== 'pending' && proposal.status !== 'approved') {
    return { success: false, error: `Cannot apply proposal with status: ${proposal.status}` };
  }

  // Check if proposal is expired
  if (proposal.expiresAt < new Date()) {
    await updateProposalStatus(proposalId, 'expired');
    return { success: false, error: 'Proposal has expired' };
  }

  try {
    // Get current content
    const contentRecord = await db.query.content.findFirst({
      where: eq(content.id, proposal.contentId),
    });

    if (!contentRecord) {
      return { success: false, error: 'Content not found' };
    }

    // Apply the generated blocks
    await db
      .update(content)
      .set({
        blocks: proposal.generatedBlocks,
        updatedAt: new Date(),
      })
      .where(eq(content.id, proposal.contentId));

    // Update proposal status
    await updateProposalStatus(proposalId, 'applied', appliedBy);

    console.log(`[regeneration] Applied proposal ${proposalId} to content ${proposal.contentId}`);

    return { success: true };
  } catch (error) {
    console.error(`[regeneration] Failed to apply proposal ${proposalId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Preview what applying a proposal would look like.
 */
export async function previewProposal(
  proposalId: string
): Promise<{ original: ContentBlock[]; proposed: ContentBlock[] } | null> {
  const proposal = await getProposal(proposalId);

  if (!proposal) {
    return null;
  }

  const contentRecord = await db.query.content.findFirst({
    where: eq(content.id, proposal.contentId),
  });

  if (!contentRecord) {
    return null;
  }

  return {
    original: (contentRecord.blocks as ContentBlock[]) || [],
    proposed: proposal.generatedBlocks,
  };
}

/**
 * Auto-apply proposals that meet criteria.
 */
export async function autoApplyProposals(
  minScore: number = 70
): Promise<{ applied: string[]; skipped: string[]; errors: string[] }> {
  if (!isAutoRegenerationEnabled()) {
    return { applied: [], skipped: [], errors: ['Auto-regeneration is disabled'] };
  }

  const applied: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  // Get pending proposals with high urgency scores
  const proposals = await getPendingHighScoreProposals(minScore);

  for (const proposal of proposals) {
    // Additional safety checks for auto-apply
    if (!isProposalSafeForAutoApply(proposal)) {
      skipped.push(proposal.id);
      continue;
    }

    const result = await applyProposal(proposal.id, 'auto-system');

    if (result.success) {
      applied.push(proposal.id);
    } else {
      errors.push(`${proposal.id}: ${result.error}`);
    }
  }

  console.log(
    `[regeneration] Auto-apply complete: ${applied.length} applied, ${skipped.length} skipped, ${errors.length} errors`
  );

  return { applied, skipped, errors };
}

/**
 * Get pending proposals with high scores.
 */
async function getPendingHighScoreProposals(
  minScore: number
): Promise<RegenerationProposal[]> {
  // Import here to avoid circular dependency
  const { getPendingProposals } = await import('./repository');
  const proposals = await getPendingProposals(100);

  return proposals.filter(p => p.eligibility.score >= minScore);
}

/**
 * Check if proposal is safe for auto-apply.
 */
function isProposalSafeForAutoApply(proposal: RegenerationProposal): boolean {
  // Don't auto-apply if too many changes
  if (proposal.diffs.length > 10) {
    return false;
  }

  // Don't auto-apply if deleting blocks
  const hasDeletes = proposal.diffs.some(d => d.action === 'delete');
  if (hasDeletes) {
    return false;
  }

  // Don't auto-apply if proposal is more than 3 days old
  const daysSinceGeneration = Math.floor(
    (Date.now() - proposal.generatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceGeneration > 3) {
    return false;
  }

  return true;
}

/**
 * Reject a proposal.
 */
export async function rejectProposal(
  proposalId: string,
  rejectedBy: string = 'system'
): Promise<{ success: boolean; error?: string }> {
  const proposal = await getProposal(proposalId);

  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }

  if (proposal.status !== 'pending') {
    return { success: false, error: `Cannot reject proposal with status: ${proposal.status}` };
  }

  await updateProposalStatus(proposalId, 'rejected');

  console.log(`[regeneration] Rejected proposal ${proposalId} by ${rejectedBy}`);

  return { success: true };
}

/**
 * Approve a proposal (mark for later apply).
 */
export async function approveProposal(
  proposalId: string,
  approvedBy: string = 'system'
): Promise<{ success: boolean; error?: string }> {
  const proposal = await getProposal(proposalId);

  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }

  if (proposal.status !== 'pending') {
    return { success: false, error: `Cannot approve proposal with status: ${proposal.status}` };
  }

  await updateProposalStatus(proposalId, 'approved');

  console.log(`[regeneration] Approved proposal ${proposalId} by ${approvedBy}`);

  return { success: true };
}
