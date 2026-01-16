/**
 * Content Regeneration - Admin Routes
 */

import { Router, Request, Response } from 'express';
import { isContentRegenerationEnabled } from './types';
import { checkEligibility, getEligibleContent } from './eligibility';
import { generateImprovedBlocks, getRateLimitStatus } from './generator';
import {
  createProposal,
  getProposal,
  getAllProposals,
  getProposalStats,
  cleanupExpiredProposals,
} from './repository';
import {
  applyProposal,
  previewProposal,
  rejectProposal,
  approveProposal,
  autoApplyProposals,
} from './applier';
import { db } from '@db';
import { content } from '@db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isContentRegenerationEnabled()) {
    res.status(503).json({
      error: 'Content Regeneration is disabled',
      hint: 'Set ENABLE_CONTENT_REGENERATION=true to enable',
    });
    return;
  }
  next();
}

/**
 * GET /api/admin/regeneration/eligible
 * Get content eligible for regeneration.
 */
router.get('/eligible', requireEnabled, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const minScore = parseInt(req.query.minScore as string) || 30;

    const eligible = await getEligibleContent(limit, minScore);

    res.json({
      eligible,
      count: eligible.length,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/regeneration/content/:contentId
 * Check eligibility for specific content.
 */
router.get('/content/:contentId', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;

    const eligibility = await checkEligibility(contentId);

    if (!eligibility) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    res.json({ eligibility });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/regeneration/:contentId/generate
 * Generate a regeneration proposal.
 */
router.post('/:contentId/generate', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const options = req.body.options || {};

    // Check eligibility
    const eligibility = await checkEligibility(contentId);

    if (!eligibility) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    if (!eligibility.eligible) {
      res.status(400).json({
        error: 'Content is not eligible for regeneration',
        eligibility,
      });
      return;
    }

    // Get current blocks
    const contentRecord = await db.query.content.findFirst({
      where: eq(content.id, contentId),
    });

    const originalBlocks = (contentRecord?.blocks as Array<{ type: string; data: Record<string, unknown> }>) || [];

    // Generate improved blocks
    const generatedBlocks = await generateImprovedBlocks(contentId, eligibility, options);

    // Create proposal
    const proposal = await createProposal(
      contentId,
      eligibility,
      generatedBlocks,
      originalBlocks,
      'default'
    );

    res.json({
      proposal,
      message: 'Regeneration proposal created',
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/regeneration/proposals
 * Get all proposals.
 */
router.get('/proposals', requireEnabled, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const proposals = await getAllProposals({
      status: status as 'pending' | 'approved' | 'rejected' | 'applied' | 'expired' | undefined,
      limit,
    });

    const stats = await getProposalStats();

    res.json({
      proposals,
      count: proposals.length,
      stats,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/regeneration/proposals/:proposalId
 * Get specific proposal.
 */
router.get('/proposals/:proposalId', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;

    const proposal = await getProposal(proposalId);

    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found' });
      return;
    }

    res.json({ proposal });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/regeneration/proposals/:proposalId/preview
 * Preview proposal changes.
 */
router.get('/proposals/:proposalId/preview', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;

    const preview = await previewProposal(proposalId);

    if (!preview) {
      res.status(404).json({ error: 'Proposal or content not found' });
      return;
    }

    res.json(preview);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/regeneration/:proposalId/apply
 * Apply a proposal.
 */
router.post('/:proposalId/apply', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const appliedBy = req.body.appliedBy || 'admin';

    const result = await applyProposal(proposalId, appliedBy);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ message: 'Proposal applied successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/regeneration/:proposalId/approve
 * Approve a proposal.
 */
router.post('/:proposalId/approve', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const approvedBy = req.body.approvedBy || 'admin';

    const result = await approveProposal(proposalId, approvedBy);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ message: 'Proposal approved' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/regeneration/:proposalId/reject
 * Reject a proposal.
 */
router.post('/:proposalId/reject', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const rejectedBy = req.body.rejectedBy || 'admin';

    const result = await rejectProposal(proposalId, rejectedBy);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ message: 'Proposal rejected' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/regeneration/auto-apply
 * Auto-apply eligible proposals.
 */
router.post('/auto-apply', requireEnabled, async (req: Request, res: Response) => {
  try {
    const minScore = parseInt(req.query.minScore as string) || 70;

    const result = await autoApplyProposals(minScore);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/regeneration/cleanup
 * Clean up expired proposals.
 */
router.post('/cleanup', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const cleaned = await cleanupExpiredProposals();
    res.json({ cleaned });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/regeneration/rate-limits
 * Get rate limit status.
 */
router.get('/rate-limits', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const status = getRateLimitStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as regenerationRoutes };
