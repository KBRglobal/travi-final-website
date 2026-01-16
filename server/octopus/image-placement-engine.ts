/**
 * Octopus v2 - Image Placement Decision Engine
 * 
 * Pure rule-based, deterministic placement decisions for images.
 * NO AI decisions, NO randomness, fully testable.
 * 
 * HARD CONSTRAINTS:
 * - Rules > AI (this engine overrides any AI suggestions)
 * - Deterministic (same input → same output)
 * - Fully testable without mocking
 */

import { type ImageUsage, type IntelligenceSnapshot } from '@shared/schema';
import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[ImagePlacementEngine] ${msg}`, data),
  debug: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[ImagePlacementEngine] ${msg}`, data),
};

// Decision output from the engine
export interface PlacementDecisionResult {
  finalRole: string;
  decision: "approved" | "rejected" | "pending" | "reuse" | "generate";
  decisionReason: string;
  decisionRuleId?: string;
  confidence: number;  // 0-100 confidence in the decision
}

// Input for decision evaluation
export interface ImageUsageDraft {
  assetId: string;
  entityId?: string;
  entityType?: string;
  pageId?: string;
  pageType?: string;
  requestedRole: string;
  existingUsages?: number;  // How many times this asset is already used
}

// Placement rule definition
export interface ImagePlacementRule {
  id: string;
  name: string;
  priority: number;  // Lower = evaluated first
  conditions: ImagePlacementConditions;
  action: PlacementAction;
}

export interface ImagePlacementConditions {
  roles?: string[];           // Apply to these roles
  pageTypes?: string[];       // Apply to these page types
  entityTypes?: string[];     // Apply to these entity types
  minRelevanceScore?: number; // Minimum relevance score required
  minQualityScore?: number;   // Minimum quality score required
  maxExistingUsages?: number; // Reject if used more than N times
  requireIntelligence?: boolean; // Intelligence must be present
}

export interface PlacementAction {
  decision: "approved" | "rejected" | "pending" | "reuse" | "generate";
  finalRole?: string;  // Override role if specified
  reasonTemplate: string;
}

// Default placement rules (can be extended via database)
const DEFAULT_RULES: ImagePlacementRule[] = [
  {
    id: "hero-quality-gate",
    name: "Hero Quality Gate",
    priority: 1,
    conditions: {
      roles: ["hero"],
      minQualityScore: 80,
      minRelevanceScore: 70,
    },
    action: {
      decision: "approved",
      reasonTemplate: "High quality image suitable for hero placement",
    },
  },
  {
    id: "hero-low-quality-reject",
    name: "Hero Low Quality Rejection",
    priority: 2,
    conditions: {
      roles: ["hero"],
      minQualityScore: 0,  // Will catch images that failed the first rule
    },
    action: {
      decision: "rejected",
      reasonTemplate: "Image quality ({qualityScore}) below threshold for hero role",
    },
  },
  {
    id: "og-image-gate",
    name: "OG Image Quality Gate",
    priority: 3,
    conditions: {
      roles: ["og_image"],
      minQualityScore: 60,
      minRelevanceScore: 50,
    },
    action: {
      decision: "approved",
      reasonTemplate: "Suitable for Open Graph image",
    },
  },
  {
    id: "card-thumbnail-gate",
    name: "Card/Thumbnail Gate",
    priority: 4,
    conditions: {
      roles: ["card", "thumbnail"],
      minQualityScore: 50,
    },
    action: {
      decision: "approved",
      reasonTemplate: "Suitable for card/thumbnail display",
    },
  },
  {
    id: "reuse-limit",
    name: "Reuse Limit",
    priority: 5,
    conditions: {
      maxExistingUsages: 5,
    },
    action: {
      decision: "reuse",
      reasonTemplate: "Image can be reused (current uses: {existingUsages})",
    },
  },
  {
    id: "overuse-prevention",
    name: "Overuse Prevention",
    priority: 6,
    conditions: {
      maxExistingUsages: 100,  // Very high - will catch anything over 5 from previous rule
    },
    action: {
      decision: "generate",
      reasonTemplate: "Image overused ({existingUsages} times), recommend generating new",
    },
  },
  {
    id: "gallery-permissive",
    name: "Gallery Permissive",
    priority: 7,
    conditions: {
      roles: ["gallery", "inline", "background"],
      minQualityScore: 30,
    },
    action: {
      decision: "approved",
      reasonTemplate: "Approved for gallery/inline/background use",
    },
  },
  {
    id: "default-pending",
    name: "Default Pending",
    priority: 100,
    conditions: {},  // Matches everything
    action: {
      decision: "pending",
      reasonTemplate: "No matching rule, pending manual review",
    },
  },
];

/**
 * Evaluate a single rule against the draft and intelligence
 */
function evaluateRule(
  rule: ImagePlacementRule,
  draft: ImageUsageDraft,
  intelligence: IntelligenceSnapshot | null
): boolean {
  const conditions = rule.conditions;

  // Check role match
  if (conditions.roles && conditions.roles.length > 0) {
    if (!conditions.roles.includes(draft.requestedRole)) {
      return false;
    }
  }

  // Check page type match
  if (conditions.pageTypes && conditions.pageTypes.length > 0) {
    if (!draft.pageType || !conditions.pageTypes.includes(draft.pageType)) {
      return false;
    }
  }

  // Check entity type match
  if (conditions.entityTypes && conditions.entityTypes.length > 0) {
    if (!draft.entityType || !conditions.entityTypes.includes(draft.entityType)) {
      return false;
    }
  }

  // Check intelligence requirements
  if (conditions.requireIntelligence && !intelligence) {
    return false;
  }

  // Check relevance score
  if (conditions.minRelevanceScore !== undefined) {
    const score = intelligence?.relevanceScore ?? 0;
    if (score < conditions.minRelevanceScore) {
      return false;
    }
  }

  // Check quality score
  if (conditions.minQualityScore !== undefined) {
    const score = intelligence?.qualityScore ?? 0;
    if (score < conditions.minQualityScore) {
      return false;
    }
  }

  // Check existing usages (for reuse decisions)
  if (conditions.maxExistingUsages !== undefined) {
    const usages = draft.existingUsages ?? 0;
    if (usages > conditions.maxExistingUsages) {
      return false;
    }
  }

  return true;
}

/**
 * Format reason template with actual values
 */
function formatReason(
  template: string,
  draft: ImageUsageDraft,
  intelligence: IntelligenceSnapshot | null
): string {
  return template
    .replace('{qualityScore}', String(intelligence?.qualityScore ?? 'N/A'))
    .replace('{relevanceScore}', String(intelligence?.relevanceScore ?? 'N/A'))
    .replace('{usageScore}', String(intelligence?.usageScore ?? 'N/A'))
    .replace('{existingUsages}', String(draft.existingUsages ?? 0))
    .replace('{requestedRole}', draft.requestedRole)
    .replace('{entityType}', draft.entityType ?? 'unknown')
    .replace('{pageType}', draft.pageType ?? 'unknown');
}

/**
 * Main decision function - evaluates rules deterministically
 * 
 * @param draft - The image usage draft to evaluate
 * @param intelligence - Intelligence snapshot (may be null)
 * @param customRules - Optional custom rules (defaults to DEFAULT_RULES)
 * @returns Deterministic placement decision
 */
export function evaluatePlacementDecision(
  draft: ImageUsageDraft,
  intelligence: IntelligenceSnapshot | null,
  customRules?: ImagePlacementRule[]
): PlacementDecisionResult {
  const rules = customRules || DEFAULT_RULES;
  
  // Sort rules by priority (lower = first)
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  logger.debug('Evaluating placement decision', {
    assetId: draft.assetId,
    requestedRole: draft.requestedRole,
    rulesCount: sortedRules.length,
  });

  // Evaluate rules in priority order
  for (const rule of sortedRules) {
    if (evaluateRule(rule, draft, intelligence)) {
      const reason = formatReason(rule.action.reasonTemplate, draft, intelligence);
      
      // Calculate confidence based on intelligence availability
      let confidence = 50; // Base confidence without intelligence
      if (intelligence) {
        confidence = Math.round(
          ((intelligence.qualityScore ?? 50) + (intelligence.relevanceScore ?? 50)) / 2
        );
      }

      logger.info('Rule matched', {
        ruleId: rule.id,
        ruleName: rule.name,
        decision: rule.action.decision,
      });

      return {
        finalRole: rule.action.finalRole || draft.requestedRole,
        decision: rule.action.decision,
        decisionReason: reason,
        decisionRuleId: rule.id,
        confidence,
      };
    }
  }

  // Should never reach here if default-pending rule exists
  return {
    finalRole: draft.requestedRole,
    decision: "pending",
    decisionReason: "No matching rules found",
    confidence: 0,
  };
}

/**
 * Batch evaluate multiple drafts
 */
export function batchEvaluatePlacements(
  drafts: Array<{ draft: ImageUsageDraft; intelligence: IntelligenceSnapshot | null }>
): PlacementDecisionResult[] {
  return drafts.map(({ draft, intelligence }) => 
    evaluatePlacementDecision(draft, intelligence)
  );
}

/**
 * Get hero rejection rate from a set of decisions
 */
export function calculateHeroRejectionRate(
  decisions: PlacementDecisionResult[]
): number {
  const heroDecisions = decisions.filter(d => 
    d.finalRole === 'hero' || d.decisionRuleId?.includes('hero')
  );
  
  if (heroDecisions.length === 0) return 0;
  
  const rejected = heroDecisions.filter(d => d.decision === 'rejected').length;
  return Math.round((rejected / heroDecisions.length) * 100);
}

/**
 * Get reuse count from a set of decisions
 */
export function calculateReuseCount(
  decisions: PlacementDecisionResult[]
): number {
  return decisions.filter(d => d.decision === 'reuse').length;
}

/**
 * Calculate average relevance from intelligence snapshots
 */
export function calculateAverageRelevance(
  intelligenceSnapshots: IntelligenceSnapshot[]
): number {
  const scores = intelligenceSnapshots
    .map(i => i.relevanceScore)
    .filter((s): s is number => s !== undefined);
  
  if (scores.length === 0) return 0;
  
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// Export default rules for testing
export const defaultRules = DEFAULT_RULES;
