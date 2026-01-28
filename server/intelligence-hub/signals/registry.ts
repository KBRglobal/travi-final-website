/**
 * Enterprise Intelligence Hub - Signal Registry
 *
 * Central registry for all intelligence signals.
 * Manages adapters and provides unified signal access.
 */

import { log } from "../../lib/logger";
import { normalizeSignals } from "./normalizer";
import type {
  SignalSource,
  SignalAdapter,
  UnifiedSignal,
  RawSignal,
  SignalQuery,
  SignalStats,
  SignalBatch,
  SignalSeverity,
  SignalCategory,
} from "./types";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[SignalRegistry] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[SignalRegistry] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[SignalRegistry] ${msg}`, undefined, data),
};

// Bounded storage
const MAX_SIGNALS = 10000;
const MAX_BATCHES = 100;

class SignalRegistry {
  private adapters: Map<SignalSource, SignalAdapter> = new Map();
  private signals: Map<string, UnifiedSignal> = new Map();
  private batches: SignalBatch[] = [];
  private enabled = false;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.enabled = process.env.ENABLE_INTELLIGENCE_HUB === "true";
    if (this.enabled) {
      logger.info("Signal Registry initialized");
    }
  }

  /**
   * Register an adapter for a signal source
   */
  registerAdapter(adapter: SignalAdapter): void {
    this.adapters.set(adapter.source, adapter);
    logger.info("Adapter registered", { source: adapter.source });
  }

  /**
   * Unregister an adapter
   */
  unregisterAdapter(source: SignalSource): void {
    this.adapters.delete(source);
  }

  /**
   * Get registered adapter sources
   */
  getRegisteredSources(): SignalSource[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Fetch and normalize signals from all adapters
   */
  async refreshSignals(since?: Date): Promise<SignalBatch[]> {
    if (!this.enabled) return [];

    const batches: SignalBatch[] = [];

    for (const [source, adapter] of this.adapters.entries()) {
      if (!adapter.isAvailable()) {
        logger.warn("Adapter not available", { source });
        continue;
      }

      try {
        const rawSignals = await adapter.fetchSignals(since);
        const normalized = rawSignals
          .map(raw => adapter.normalize(raw))
          .filter((s): s is UnifiedSignal => s !== null);

        if (normalized.length > 0) {
          const batch: SignalBatch = {
            signals: normalized,
            source,
            batchId: `batch-${source}-${Date.now()}`,
            processedAt: new Date(),
          };

          batches.push(batch);

          // Store signals
          for (const signal of normalized) {
            this.addSignal(signal);
          }

          logger.info("Signals refreshed from source", {
            source,
            count: normalized.length,
          });
        }
      } catch (err) {
        logger.error("Failed to refresh from source", {
          source,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Store batches
    for (const batch of batches) {
      this.batches.push(batch);
    }
    this.pruneBatches();

    return batches;
  }

  /**
   * Add a signal directly (bypass adapter)
   */
  addSignal(signal: UnifiedSignal): void {
    this.signals.set(signal.id, signal);
    this.pruneSignals();
  }

  /**
   * Ingest a single signal (alias for addSignal)
   */
  ingestSignal(signal: UnifiedSignal): void {
    this.addSignal(signal);
  }

  /**
   * Add multiple signals
   */
  addSignals(signals: UnifiedSignal[]): void {
    for (const signal of signals) {
      this.signals.set(signal.id, signal);
    }
    this.pruneSignals();
  }

  /**
   * Ingest a batch of signals
   */
  ingestBatch(signals: UnifiedSignal[], source: string): void {
    this.addSignals(signals);

    const batch: SignalBatch = {
      signals,
      source: source as SignalSource,
      batchId: `batch-${source}-${Date.now()}`,
      processedAt: new Date(),
    };
    this.batches.push(batch);
    this.pruneBatches();
  }

  /**
   * Ingest raw signals (normalize and store)
   */
  ingestRaw(rawSignals: RawSignal[]): UnifiedSignal[] {
    const normalized = normalizeSignals(rawSignals);
    this.addSignals(normalized);
    return normalized;
  }

  /**
   * Get a signal by ID
   */
  getSignal(id: string): UnifiedSignal | undefined {
    return this.signals.get(id);
  }

  /**
   * Query signals with filters
   */
  querySignals(query: SignalQuery = {}): UnifiedSignal[] {
    let results = Array.from(this.signals.values());

    // Apply filters
    if (query.sources?.length) {
      results = results.filter(s => query.sources!.includes(s.source));
    }
    if (query.entityTypes?.length) {
      results = results.filter(s => query.entityTypes!.includes(s.entityType));
    }
    if (query.entityIds?.length) {
      results = results.filter(s => query.entityIds!.includes(s.entityId));
    }
    if (query.severities?.length) {
      results = results.filter(s => query.severities!.includes(s.severity));
    }
    if (query.categories?.length) {
      results = results.filter(s => query.categories!.includes(s.category));
    }
    if (query.since) {
      results = results.filter(s => s.timestamp >= query.since!);
    }
    if (query.until) {
      results = results.filter(s => s.timestamp <= query.until!);
    }
    if (query.minScore !== undefined) {
      results = results.filter(s => s.score >= query.minScore!);
    }
    if (query.maxScore !== undefined) {
      results = results.filter(s => s.score <= query.maxScore!);
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
   * Get signals for a specific entity
   */
  getSignalsForEntity(entityId: string, entityType?: string): UnifiedSignal[] {
    return this.querySignals({
      entityIds: [entityId],
      entityTypes: entityType ? [entityType as never] : undefined,
    });
  }

  /**
   * Get critical signals
   */
  getCriticalSignals(): UnifiedSignal[] {
    return this.querySignals({ severities: ["critical", "high"] });
  }

  /**
   * Get statistics
   */
  getStats(): SignalStats {
    const signals = Array.from(this.signals.values());

    const bySource: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalScore = 0;

    for (const signal of signals) {
      bySource[signal.source] = (bySource[signal.source] || 0) + 1;
      bySeverity[signal.severity] = (bySeverity[signal.severity] || 0) + 1;
      byCategory[signal.category] = (byCategory[signal.category] || 0) + 1;
      totalScore += signal.score;
    }

    return {
      totalSignals: signals.length,
      bySource: bySource as Record<SignalSource, number>,
      bySeverity: bySeverity as Record<SignalSeverity, number>,
      byCategory: byCategory as Record<SignalCategory, number>,
      avgScore: signals.length > 0 ? totalScore / signals.length : 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Prune old signals to stay within bounds
   */
  private pruneSignals(): void {
    if (this.signals.size <= MAX_SIGNALS) return;

    const sorted = Array.from(this.signals.entries()).sort(
      (a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime()
    );

    const toRemove = sorted.slice(0, this.signals.size - MAX_SIGNALS);
    for (const [id] of toRemove) {
      this.signals.delete(id);
    }
  }

  /**
   * Prune old batches
   */
  private pruneBatches(): void {
    if (this.batches.length > MAX_BATCHES) {
      this.batches = this.batches.slice(-MAX_BATCHES);
    }
  }

  /**
   * Start automatic refresh
   */
  start(intervalMs = 60000): void {
    if (!this.enabled) return;

    this.refreshInterval = setInterval(() => {
      this.refreshSignals().catch(err => {
        logger.error("Auto-refresh failed", {
          error: err instanceof Error ? err.message : "Unknown error",
        });
      });
    }, intervalMs);

    logger.info("Signal Registry started", { intervalMs });
  }

  /**
   * Stop automatic refresh
   */
  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    logger.info("Signal Registry stopped");
  }

  /**
   * Clear all signals (for testing)
   */
  clear(): void {
    this.signals.clear();
    this.batches = [];
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: SignalRegistry | null = null;

export function getSignalRegistry(): SignalRegistry {
  if (!instance) {
    instance = new SignalRegistry();
  }
  return instance;
}

export function resetSignalRegistry(): void {
  if (instance) {
    instance.stop();
    instance.clear();
  }
  instance = null;
}

export { SignalRegistry };
