/**
 * Organizational Memory & RCA Engine (OMR)
 *
 * The platform REMEMBERS what went wrong — and learns.
 *
 * Features:
 * - Incident & Decision Memory
 * - Root Cause Analysis Engine
 * - Pattern Detection (repeated failures, slow-burn, escalation)
 * - Actionable Learnings Generation
 *
 * Feature flag: ENABLE_ORG_MEMORY=false
 */

export * from './types';
export * from './repository';
export * from './rca-engine';
export * from './patterns';
export * from './learnings';

export { default as orgMemoryRoutes } from './routes';

import { getMemoryRepository } from './repository';
import { runRCA, getRCAStats } from './rca-engine';
import { detectPatterns, getActivePatterns, getPatternStats } from './patterns';
import { generateLearnings, getTopLearnings, getLearningStats } from './learnings';
import type { MemoryEvent } from './types';

/**
 * Check if org memory is enabled
 */
export function isOrgMemoryEnabled(): boolean {
  return process.env.ENABLE_ORG_MEMORY === 'true';
}

/**
 * Record an incident
 */
export function recordIncident(event: Omit<MemoryEvent, 'id'>): MemoryEvent {
  if (!isOrgMemoryEnabled()) {
    throw new Error('Org Memory is disabled');
  }

  const repo = getMemoryRepository();
  return repo.record(event);
}

/**
 * Resolve an incident and run RCA
 */
export function resolveAndAnalyze(eventId: string) {
  const repo = getMemoryRepository();
  const event = repo.resolve(eventId);

  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  // Run RCA for high/critical severity
  if (event.severity === 'high' || event.severity === 'critical') {
    return runRCA(eventId);
  }

  return event;
}

/**
 * Run full analysis cycle
 */
export function runAnalysisCycle(): {
  patternsDetected: number;
  learningsGenerated: number;
} {
  const patterns = detectPatterns();
  const learnings = generateLearnings();

  return {
    patternsDetected: patterns.length,
    learningsGenerated: learnings.length,
  };
}

/**
 * Get org memory status
 */
export function getOrgMemoryStatus() {
  const enabled = isOrgMemoryEnabled();

  if (!enabled) {
    return { enabled, stats: null };
  }

  const repo = getMemoryRepository();

  return {
    enabled,
    stats: {
      events: repo.getStats(),
      rca: getRCAStats(),
      patterns: getPatternStats(),
      learnings: getLearningStats(),
    },
  };
}

/**
 * Get insights summary
 */
export function getInsightsSummary() {
  const activePatterns = getActivePatterns();
  const topLearnings = getTopLearnings(5);
  const rcaStats = getRCAStats();

  return {
    activePatterns: activePatterns.length,
    criticalPatterns: activePatterns.filter(p => p.severity === 'critical').length,
    topLearnings: topLearnings.map(l => ({
      title: l.title,
      priority: l.priority,
      category: l.category,
    })),
    avgPreventability: rcaStats.avgPreventability,
    avgDetectability: rcaStats.avgDetectability,
  };
}
