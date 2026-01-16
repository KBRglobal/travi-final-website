/**
 * Enterprise Intelligence Hub - Executive Summary
 *
 * Deterministic executive-level intelligence summaries.
 */

export * from './types';
export * from './summarizer';
export * from './risk-scoring';
export * from './opportunities';
export * from './repository';

import { generateSummary, getQuickHealth } from './summarizer';
import { getTopRisks } from './risk-scoring';
import { getTopOpportunities, getQuickWins } from './opportunities';
import { getSummaryRepository } from './repository';

/**
 * Generate and store a new summary
 */
export async function createSummary(lookbackDays = 7) {
  const repo = getSummaryRepository();
  const previousHealth = repo.getLatestHealth();
  const lookbackMs = lookbackDays * 24 * 3600000;

  const summary = await generateSummary({ lookbackMs }, previousHealth || undefined);
  repo.store(summary);

  return summary;
}

/**
 * Get current system status
 */
export function getSystemStatus() {
  const health = getQuickHealth();
  const risks = getTopRisks(3);
  const opportunities = getTopOpportunities(3);

  return {
    health,
    topRisks: risks,
    topOpportunities: opportunities,
    lastUpdated: new Date(),
  };
}

/**
 * Get weekly action items
 */
export async function getWeeklyActions() {
  const summary = await generateSummary();
  return summary.weeklyActions;
}
