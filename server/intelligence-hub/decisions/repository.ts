/**
 * Enterprise Intelligence Hub - Decision Repository
 *
 * Stores and retrieves decisions for audit and replay.
 */

import { log } from "../../lib/logger";
import type { Decision, DecisionTrace, DecisionQuery } from "./types";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[DecisionRepository] ${msg}`, data),
};

// Bounded storage
const MAX_DECISIONS = 5000;
const MAX_TRACES = 1000;

/**
 * Stored trace format (with id at top level for tests)
 */
export interface StoredTrace {
  id: string;
  decision: {
    type: string;
    outcome: string;
    entityId: string;
    entityType: string;
    timestamp: Date;
    context?: Record<string, unknown>;
  };
  causalChain: {
    causes: unknown[];
    totalConfidence: number;
  };
  relatedSignals: string[];
  summary: string;
  recommendations: string[];
  confidence: number;
}

/**
 * Extended query interface
 */
export interface TraceQuery {
  types?: string[];
  entityIds?: string[];
  minConfidence?: number;
  limit?: number;
  offset?: number;
}

class DecisionRepository {
  private decisions: Map<string, Decision> = new Map();
  private traces: Map<string, DecisionTrace> = new Map();
  private storedTraces: Map<string, StoredTrace> = new Map();

  /**
   * Store a decision
   */
  save(decision: Decision): void {
    this.decisions.set(decision.id, decision);
    this.pruneDecisions();
    logger.info("Decision saved", { id: decision.id, type: decision.type });
  }

  /**
   * Store a decision trace (legacy format)
   */
  saveTrace(trace: DecisionTrace): void {
    this.traces.set(trace.decision.id, trace);
    this.pruneTraces();
  }

  /**
   * Store a trace (simplified format with id at top level)
   */
  store(trace: StoredTrace): void {
    this.storedTraces.set(trace.id, trace);
    this.pruneStoredTraces();
    logger.info("Trace stored", { id: trace.id, type: trace.decision.type });
  }

  /**
   * Get decision by ID (checks both decisions and stored traces)
   */
  get(id: string): Decision | StoredTrace | undefined {
    // First check stored traces
    const storedTrace = this.storedTraces.get(id);
    if (storedTrace) {
      return storedTrace;
    }
    return this.decisions.get(id);
  }

  /**
   * Get trace by decision ID
   */
  getTrace(decisionId: string): DecisionTrace | undefined {
    return this.traces.get(decisionId);
  }

  /**
   * Query stored traces
   */
  query(query: TraceQuery = {}): StoredTrace[] {
    let results = Array.from(this.storedTraces.values());

    if (query.types?.length) {
      results = results.filter(t => query.types!.includes(t.decision.type));
    }
    if (query.entityIds?.length) {
      results = results.filter(t => query.entityIds!.includes(t.decision.entityId));
    }
    if (query.minConfidence !== undefined) {
      results = results.filter(t => t.confidence >= query.minConfidence!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.decision.timestamp.getTime() - a.decision.timestamp.getTime());

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
   * Query decisions (legacy format)
   */
  queryDecisions(query: DecisionQuery = {}): Decision[] {
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
   * Get traces by entity ID
   */
  getByEntity(entityId: string): StoredTrace[] {
    return this.query({ entityIds: [entityId] });
  }

  /**
   * Get decisions for entity (legacy)
   */
  getForEntity(entityId: string, entityType?: string): Decision[] {
    return this.queryDecisions({
      entityIds: [entityId],
      entityTypes: entityType ? [entityType] : undefined,
    });
  }

  /**
   * Get recent decisions
   */
  getRecent(limit = 50): Decision[] {
    return this.queryDecisions({ limit });
  }

  /**
   * Get decision count
   */
  count(): number {
    return this.decisions.size;
  }

  /**
   * Get statistics
   */
  getStats(): { totalTraces: number; totalDecisions: number } {
    return {
      totalTraces: this.storedTraces.size,
      totalDecisions: this.decisions.size,
    };
  }

  /**
   * Prune old decisions
   */
  private pruneDecisions(): void {
    if (this.decisions.size <= MAX_DECISIONS) return;

    const sorted = Array.from(this.decisions.entries()).sort(
      (a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime()
    );

    const toRemove = sorted.slice(0, this.decisions.size - MAX_DECISIONS);
    for (const [id] of toRemove) {
      this.decisions.delete(id);
    }
  }

  /**
   * Prune old traces (legacy)
   */
  private pruneTraces(): void {
    if (this.traces.size <= MAX_TRACES) return;

    const sorted = Array.from(this.traces.entries()).sort(
      (a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime()
    );

    const toRemove = sorted.slice(0, this.traces.size - MAX_TRACES);
    for (const [id] of toRemove) {
      this.traces.delete(id);
    }
  }

  /**
   * Prune old stored traces
   */
  private pruneStoredTraces(): void {
    if (this.storedTraces.size <= MAX_TRACES) return;

    const sorted = Array.from(this.storedTraces.entries()).sort(
      (a, b) => a[1].decision.timestamp.getTime() - b[1].decision.timestamp.getTime()
    );

    const toRemove = sorted.slice(0, this.storedTraces.size - MAX_TRACES);
    for (const [id] of toRemove) {
      this.storedTraces.delete(id);
    }
  }

  /**
   * Clear all (for testing)
   */
  clear(): void {
    this.decisions.clear();
    this.traces.clear();
    this.storedTraces.clear();
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
