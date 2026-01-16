/**
 * Content Regeneration Engine - Module Exports
 *
 * Feature flags:
 *   ENABLE_CONTENT_REGENERATION=true
 *   ENABLE_AUTO_REGENERATION=true
 *
 * Admin API:
 *   GET  /api/admin/regeneration/eligible
 *   GET  /api/admin/regeneration/content/:contentId
 *   POST /api/admin/regeneration/:contentId/generate
 *   GET  /api/admin/regeneration/proposals
 *   GET  /api/admin/regeneration/proposals/:proposalId
 *   GET  /api/admin/regeneration/proposals/:proposalId/preview
 *   POST /api/admin/regeneration/:proposalId/apply
 *   POST /api/admin/regeneration/:proposalId/approve
 *   POST /api/admin/regeneration/:proposalId/reject
 *   POST /api/admin/regeneration/auto-apply
 *   POST /api/admin/regeneration/cleanup
 *   GET  /api/admin/regeneration/rate-limits
 */

export { isContentRegenerationEnabled, isAutoRegenerationEnabled } from './types';
export type {
  EligibilityReason,
  EligibilityResult,
  RegenerationProposal,
  ProposalStatus,
  ContentBlock,
  BlockDiff,
  GenerationOptions,
} from './types';

export { checkEligibility, getEligibleContent } from './eligibility';
export { generateImprovedBlocks, getRateLimitStatus } from './generator';
export {
  createProposal,
  getProposal,
  getProposalsForContent,
  getPendingProposals,
  getAllProposals,
  getProposalStats,
  cleanupExpiredProposals,
} from './repository';
export {
  applyProposal,
  previewProposal,
  rejectProposal,
  approveProposal,
  autoApplyProposals,
} from './applier';

export { regenerationRoutes } from './routes';
