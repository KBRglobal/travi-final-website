/**
 * Enterprise Intelligence Hub - Decision Repository
 *
 * Stores and retrieves decisions for audit and replay.
 */

import { log } from '../../lib/logger';
import type { Decision, DecisionTrace, DecisionQuery } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[DecisionRepository] ${msg}`, data),
};

// Bounded storage
const MAX_DECISIONS = 5000;
const MAX_TRACES = 2000;

class DecisionRepository {
  private decisions: Map<string, Decision> = new Map();
  private traces: Map<string, DecisionTrace> = new Map();

  /**
   * Store a decision
   */
  save(decision: Decision): void {
    this.decisions.set(decision.id, decision);
    this.pruneDecisions();
    logger.info('Decision saved', { id: decision.id, type: decision.type });
  }

  /**
   * Store a decision trace
   */
  saveTrace(trace: DecisionTrace): void {
    this.traces.set(trace.decision.id, trace);
    this.pruneTraces();
  }

  /**
   * Get decision by ID
   */
  get(id: string): Decision | undefined {
    return this.decisions.get(id);
  }

  /**
   * Get trace by decision ID
   */
  getTrace(decisionId: string): DecisionTrace | undefined {
    return this.traces.get(decisionId);
  }

  /**
   * Query decisions
   */
  query(query: DecisionQuery = {}): Decision[] {
    let results = Array.from(this.decisions.values());

    if (query.types?.length) {
      results = results.filter(d => query.types!.includes(d.type));
    }
    if (query.entityTypes?.length) {
      results = results.filter(d => query.entityTypes!.includes(d.entityType));
    }
    if (query.entityIds?.length) {
      results = results.filter(d => query.entityIds!.includes(d.entityId));
    }
    if (query.since) {
      results = results.filter(d => d.timestamp >= query.since!);
    }
    if (query.until) {
      results = results.filter(d => d.timestamp <= query.until!);
    }
    if (query.automated !== undefined) {
      results = results.filter(d => d.automated === query.automated);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get decisions for entity
   */
  getForEntity(entityId: string, entityType?: string): Decision[] {
    return this.query({
      entityIds: [entityId],
      entityTypes: entityType ? [entityType] : undefined,
    });
  }

  /**
   * Get recent decisions
   */
  getRecent(limit = 50): Decision[] {
    return this.query({ limit });
  }

  /**
   * Get decision count
   */
  count(): number {
    return this.decisions.size;
  }

  /**
   * Prune old decisions
   */
  private pruneDecisions(): void {
    if (this.decisions.size <= MAX_DECISIONS) return;

    const sorted = Array.from(this.decisions.entries())
      .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

    const toRemove = sorted.slice(0, this.decisions.size - MAX_DECISIONS);
    for (const [id] of toRemove) {
      this.decisions.delete(id);
    }
  }

  /**
   * Prune old traces
   */
  private pruneTraces(): void {
    if (this.traces.size <= MAX_TRACES) return;

    const sorted = Array.from(this.traces.entries())
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());

    const toRemove = sorted.slice(0, this.traces.size - MAX_TRACES);
    for (const [id] of toRemove) {
      this.traces.delete(id);
    }
  }

  /**
   * Clear all (for testing)
   */
  clear(): void {
    this.decisions.clear();
    this.traces.clear();
  }
}

// Singleton
let instance: DecisionRepository | null = null;

export function getDecisionRepository(): DecisionRepository {
  if (!instance) {
    instance = new DecisionRepository();
  }
  return instance;
}

export function resetDecisionRepository(): void {
  instance = null;
}

export { DecisionRepository };
