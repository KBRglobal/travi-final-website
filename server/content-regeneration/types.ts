/**
 * Content Regeneration Engine - Type Definitions
 *
 * Feature flags:
 *   ENABLE_CONTENT_REGENERATION=true
 *   ENABLE_AUTO_REGENERATION=true
 */

export function isContentRegenerationEnabled(): boolean {
  return process.env.ENABLE_CONTENT_REGENERATION === 'true';
}

export function isAutoRegenerationEnabled(): boolean {
  return process.env.ENABLE_AUTO_REGENERATION === 'true';
}

/**
 * Eligibility reasons for regeneration.
 */
export type EligibilityReason =
  | 'stale_content'
  | 'low_ice_score'
  | 'no_entities'
  | 'poor_search_performance'
  | 'thin_content'
  | 'no_aeo_capsule';

/**
 * Content eligibility result.
 */
export interface EligibilityResult {
  contentId: string;
  eligible: boolean;
  reasons: EligibilityReason[];
  score: number; // 0-100 urgency score
  details: Record<string, unknown>;
  evaluatedAt: Date;
}

/**
 * Block diff for proposals.
 */
export interface BlockDiff {
  index: number;
  action: 'replace' | 'insert' | 'delete';
  originalBlock?: ContentBlock;
  newBlock?: ContentBlock;
}

/**
 * Content block structure.
 */
export interface ContentBlock {
  id?: string;
  type: string;
  data: Record<string, unknown>;
}

/**
 * Regeneration proposal status.
 */
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'expired';

/**
 * Regeneration proposal.
 */
export interface RegenerationProposal {
  id: string;
  contentId: string;
  status: ProposalStatus;
  eligibility: EligibilityResult;
  diffs: BlockDiff[];
  generatedBlocks: ContentBlock[];
  aiModel: string;
  generatedAt: Date;
  appliedAt?: Date;
  appliedBy?: string;
  expiresAt: Date;
}

/**
 * Generation options.
 */
export interface GenerationOptions {
  persona?: string;
  preserveStructure?: boolean;
  focusAreas?: EligibilityReason[];
  maxBlocks?: number;
  timeout?: number;
}

/**
 * Rate limit config.
 */
export const RATE_LIMITS = {
  MAX_GENERATIONS_PER_HOUR: 20,
  MAX_GENERATIONS_PER_DAY: 100,
  TIMEOUT_MS: 60000,
  PROPOSAL_TTL_DAYS: 7,
} as const;
