/**
 * Enterprise Intelligence Hub - Decision Trace Engine
 *
 * Explains WHY things happened in the system.
 */

export * from './types';
export * from './causal-chain';
export * from './trace-resolver';
export * from './repository';

import { resolveExplanation } from './trace-resolver';
import { getDecisionRepository } from './repository';
import type { ExplanationRequest } from './types';

/**
 * Explain a content decision
 */
export async function explainContent(contentId: string, question?: ExplanationRequest['question']) {
  return resolveExplanation({
    entityType: 'content',
    entityId: contentId,
    question,
  });
}

/**
 * Explain an entity decision
 */
export async function explainEntity(entityId: string, question?: ExplanationRequest['question']) {
  return resolveExplanation({
    entityType: 'entity',
    entityId,
    question,
  });
}

/**
 * Get recent decisions
 */
export function getRecentDecisions(limit = 50) {
  return getDecisionRepository().getRecent(limit);
}
