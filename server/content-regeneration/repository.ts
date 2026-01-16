/**
 * Content Regeneration - Proposal Repository
 *
 * Stores and manages regeneration proposals.
 */

import {
  RegenerationProposal,
  ProposalStatus,
  EligibilityResult,
  ContentBlock,
  BlockDiff,
  RATE_LIMITS,
} from './types';

// In-memory store (would be DB in production)
const proposalStore = new Map<string, RegenerationProposal>();

/**
 * Create a new regeneration proposal.
 */
export async function createProposal(
  contentId: string,
  eligibility: EligibilityResult,
  generatedBlocks: ContentBlock[],
  originalBlocks: ContentBlock[],
  aiModel: string = 'default'
): Promise<RegenerationProposal> {
  const id = `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Calculate diffs
  const diffs = calculateDiffs(originalBlocks, generatedBlocks);

  const proposal: RegenerationProposal = {
    id,
    contentId,
    status: 'pending',
    eligibility,
    diffs,
    generatedBlocks,
    aiModel,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + RATE_LIMITS.PROPOSAL_TTL_DAYS * 24 * 60 * 60 * 1000),
  };

  proposalStore.set(id, proposal);

  // Log creation
  console.log(`[regeneration] Created proposal ${id} for content ${contentId}`);

  return proposal;
}

/**
 * Calculate diffs between original and generated blocks.
 */
function calculateDiffs(
  originalBlocks: ContentBlock[],
  generatedBlocks: ContentBlock[]
): BlockDiff[] {
  const diffs: BlockDiff[] = [];
  const maxLength = Math.max(originalBlocks.length, generatedBlocks.length);

  for (let i = 0; i < maxLength; i++) {
    const original = originalBlocks[i];
    const generated = generatedBlocks[i];

    if (!original && generated) {
      // New block inserted
      diffs.push({
        index: i,
        action: 'insert',
        newBlock: generated,
      });
    } else if (original && !generated) {
      // Block removed
      diffs.push({
        index: i,
        action: 'delete',
        originalBlock: original,
      });
    } else if (original && generated && !blocksEqual(original, generated)) {
      // Block replaced
      diffs.push({
        index: i,
        action: 'replace',
        originalBlock: original,
        newBlock: generated,
      });
    }
  }

  return diffs;
}

/**
 * Check if two blocks are equal.
 */
function blocksEqual(a: ContentBlock, b: ContentBlock): boolean {
  if (a.type !== b.type) return false;
  return JSON.stringify(a.data) === JSON.stringify(b.data);
}

/**
 * Get proposal by ID.
 */
export async function getProposal(proposalId: string): Promise<RegenerationProposal | null> {
  return proposalStore.get(proposalId) || null;
}

/**
 * Get proposals for content.
 */
export async function getProposalsForContent(
  contentId: string
): Promise<RegenerationProposal[]> {
  return Array.from(proposalStore.values())
    .filter(p => p.contentId === contentId)
    .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
}

/**
 * Get all pending proposals.
 */
export async function getPendingProposals(
  limit: number = 50
): Promise<RegenerationProposal[]> {
  const now = new Date();

  return Array.from(proposalStore.values())
    .filter(p => p.status === 'pending' && p.expiresAt > now)
    .sort((a, b) => b.eligibility.score - a.eligibility.score)
    .slice(0, limit);
}

/**
 * Get all proposals.
 */
export async function getAllProposals(
  options: {
    status?: ProposalStatus;
    limit?: number;
    includeExpired?: boolean;
  } = {}
): Promise<RegenerationProposal[]> {
  const { status, limit = 100, includeExpired = false } = options;
  const now = new Date();

  let proposals = Array.from(proposalStore.values());

  if (status) {
    proposals = proposals.filter(p => p.status === status);
  }

  if (!includeExpired) {
    proposals = proposals.filter(p => p.expiresAt > now || p.status === 'applied');
  }

  return proposals
    .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
    .slice(0, limit);
}

/**
 * Update proposal status.
 */
export async function updateProposalStatus(
  proposalId: string,
  status: ProposalStatus,
  appliedBy?: string
): Promise<RegenerationProposal | null> {
  const proposal = proposalStore.get(proposalId);

  if (!proposal) {
    return null;
  }

  proposal.status = status;

  if (status === 'applied') {
    proposal.appliedAt = new Date();
    proposal.appliedBy = appliedBy;
  }

  proposalStore.set(proposalId, proposal);

  console.log(`[regeneration] Updated proposal ${proposalId} status to ${status}`);

  return proposal;
}

/**
 * Delete proposal.
 */
export async function deleteProposal(proposalId: string): Promise<boolean> {
  return proposalStore.delete(proposalId);
}

/**
 * Clean up expired proposals.
 */
export async function cleanupExpiredProposals(): Promise<number> {
  const now = new Date();
  let cleaned = 0;

  for (const [id, proposal] of proposalStore) {
    if (proposal.status === 'pending' && proposal.expiresAt < now) {
      proposal.status = 'expired';
      proposalStore.set(id, proposal);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[regeneration] Cleaned up ${cleaned} expired proposals`);
  }

  return cleaned;
}

/**
 * Get proposal statistics.
 */
export async function getProposalStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  applied: number;
  rejected: number;
  expired: number;
}> {
  const proposals = Array.from(proposalStore.values());

  return {
    total: proposals.length,
    pending: proposals.filter(p => p.status === 'pending').length,
    approved: proposals.filter(p => p.status === 'approved').length,
    applied: proposals.filter(p => p.status === 'applied').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
    expired: proposals.filter(p => p.status === 'expired').length,
  };
}
