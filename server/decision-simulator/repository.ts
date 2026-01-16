/**
 * Platform Decision Simulator - Result Repository
 *
 * Stores simulation results for retrieval.
 */

import { log } from '../lib/logger';
import type { SimulationResult } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[SimulatorRepository] ${msg}`, data),
};

// Bounded storage
const MAX_RESULTS = 500;

interface ResultQuery {
  scenarioId?: string;
  since?: Date;
  limit?: number;
}

class SimulatorRepository {
  private results: Map<string, SimulationResult> = new Map();
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_DECISION_SIMULATOR === 'true';
    if (this.enabled) {
      logger.info('Simulator Repository initialized');
    }
  }

  /**
   * Store a simulation result
   */
  store(result: SimulationResult): void {
    this.results.set(result.id, result);

    // Enforce bounds
    if (this.results.size > MAX_RESULTS) {
      const sorted = Array.from(this.results.entries())
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

      for (const [id] of sorted.slice(0, MAX_RESULTS / 4)) {
        this.results.delete(id);
      }

      logger.info('Repository pruned', { remaining: this.results.size });
    }
  }

  /**
   * Get a result by ID
   */
  get(id: string): SimulationResult | undefined {
    return this.results.get(id);
  }

  /**
   * Query results
   */
  query(query: ResultQuery = {}): SimulationResult[] {
    let results = Array.from(this.results.values());

    if (query.scenarioId) {
      results = results.filter(r => r.scenarioId === query.scenarioId);
    }

    if (query.since) {
      results = results.filter(r => r.timestamp >= query.since!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get latest result for a scenario
   */
  getLatestForScenario(scenarioId: string): SimulationResult | undefined {
    const results = this.query({ scenarioId, limit: 1 });
    return results[0];
  }

  /**
   * Get result count
   */
  count(): number {
    return this.results.size;
  }

  /**
   * Get stats
   */
  getStats(): {
    totalResults: number;
    byRiskLevel: Record<string, number>;
    avgConfidence: number;
  } {
    const results = Array.from(this.results.values());
    const byRiskLevel: Record<string, number> = {};

    let totalConfidence = 0;

    for (const result of results) {
      const level = result.riskAssessment.overallLevel;
      byRiskLevel[level] = (byRiskLevel[level] || 0) + 1;
      totalConfidence += result.confidence;
    }

    return {
      totalResults: results.length,
      byRiskLevel,
      avgConfidence: results.length > 0
        ? Math.round(totalConfidence / results.length)
        : 0,
    };
  }

  /**
   * Clear all results
   */
  clear(): void {
    this.results.clear();
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: SimulatorRepository | null = null;

export function getSimulatorRepository(): SimulatorRepository {
  if (!instance) {
    instance = new SimulatorRepository();
  }
  return instance;
}

export function resetSimulatorRepository(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}

export { SimulatorRepository };
