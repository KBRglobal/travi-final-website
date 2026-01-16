/**
 * Signal Registry
 *
 * In-memory registry for normalized signals with bounded storage,
 * deduplication, and lifecycle management.
 */

import type {
  NormalizedSignal,
  SignalCategory,
  SignalSource,
} from './types';
import { getGrowthOSConfig, isSignalsEnabled } from '../config';
import { log } from '../../lib/logger';

/**
 * Bounded signal storage with LRU eviction
 */
class BoundedSignalMap {
  private signals: Map<string, NormalizedSignal> = new Map();
  private accessOrder: string[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(id: string): NormalizedSignal | undefined {
    const signal = this.signals.get(id);
    if (signal) {
      this.updateAccessOrder(id);
    }
    return signal;
  }

  set(id: string, signal: NormalizedSignal): void {
    // Evict oldest if at capacity
    while (this.signals.size >= this.maxSize && this.accessOrder.length > 0) {
      const oldestId = this.accessOrder.shift();
      if (oldestId) {
        this.signals.delete(oldestId);
      }
    }

    this.signals.set(id, signal);
    this.updateAccessOrder(id);
  }

  delete(id: string): boolean {
    const idx = this.accessOrder.indexOf(id);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
    return this.signals.delete(id);
  }

  has(id: string): boolean {
    return this.signals.has(id);
  }

  values(): IterableIterator<NormalizedSignal> {
    return this.signals.values();
  }

  get size(): number {
    return this.signals.size;
  }

  clear(): void {
    this.signals.clear();
    this.accessOrder = [];
  }

  private updateAccessOrder(id: string): void {
    const idx = this.accessOrder.indexOf(id);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
    this.accessOrder.push(id);
  }
}

/**
 * Global signal registry instance
 */
class SignalRegistry {
  private signalsByCategory: Map<SignalCategory, BoundedSignalMap> = new Map();
  private signalIndex: Map<string, SignalCategory> = new Map(); // id -> category
  private contentIndex: Map<string, Set<string>> = new Map(); // contentId -> signal IDs
  private entityIndex: Map<string, Set<string>> = new Map(); // entityKey -> signal IDs
  private initialized = false;

  /**
   * Initialize the registry
   */
  initialize(): void {
    if (this.initialized) return;

    const config = getGrowthOSConfig();
    const maxPerCategory = config.maxSignalsPerCategory;

    const categories: SignalCategory[] = [
      'traffic', 'content', 'media', 'revenue', 'seo', 'aeo', 'ux', 'ops', 'governance', 'risk'
    ];

    for (const category of categories) {
      this.signalsByCategory.set(category, new BoundedSignalMap(maxPerCategory));
    }

    this.initialized = true;
    log.info('[GrowthOS] Signal registry initialized');
  }

  /**
   * Add a signal to the registry
   */
  addSignal(signal: NormalizedSignal): void {
    if (!isSignalsEnabled()) return;

    this.ensureInitialized();

    // Check for duplicates by looking at similar signals
    const duplicateId = this.findDuplicate(signal);
    if (duplicateId) {
      this.mergeSignal(duplicateId, signal);
      return;
    }

    // Add to category map
    const categoryMap = this.signalsByCategory.get(signal.category);
    if (categoryMap) {
      categoryMap.set(signal.id, signal);
    }

    // Update indexes
    this.signalIndex.set(signal.id, signal.category);
    this.indexByContent(signal);
    this.indexByEntity(signal);
  }

  /**
   * Get a signal by ID
   */
  getSignal(id: string): NormalizedSignal | undefined {
    this.ensureInitialized();

    const category = this.signalIndex.get(id);
    if (!category) return undefined;

    return this.signalsByCategory.get(category)?.get(id);
  }

  /**
   * Remove a signal
   */
  removeSignal(id: string): boolean {
    this.ensureInitialized();

    const category = this.signalIndex.get(id);
    if (!category) return false;

    const signal = this.signalsByCategory.get(category)?.get(id);
    if (!signal) return false;

    // Remove from indexes
    this.signalIndex.delete(id);
    this.removeFromContentIndex(signal);
    this.removeFromEntityIndex(signal);

    return this.signalsByCategory.get(category)?.delete(id) ?? false;
  }

  /**
   * Get all signals for a category
   */
  getSignalsByCategory(category: SignalCategory): NormalizedSignal[] {
    this.ensureInitialized();

    const categoryMap = this.signalsByCategory.get(category);
    if (!categoryMap) return [];

    return Array.from(categoryMap.values());
  }

  /**
   * Get signals for a specific content ID
   */
  getSignalsByContent(contentId: string): NormalizedSignal[] {
    this.ensureInitialized();

    const signalIds = this.contentIndex.get(contentId);
    if (!signalIds) return [];

    const signals: NormalizedSignal[] = [];
    for (const id of signalIds) {
      const signal = this.getSignal(id);
      if (signal) {
        signals.push(signal);
      }
    }

    return signals;
  }

  /**
   * Get signals for a specific entity
   */
  getSignalsByEntity(entityType: string, entityId: string): NormalizedSignal[] {
    this.ensureInitialized();

    const key = `${entityType}:${entityId}`;
    const signalIds = this.entityIndex.get(key);
    if (!signalIds) return [];

    const signals: NormalizedSignal[] = [];
    for (const id of signalIds) {
      const signal = this.getSignal(id);
      if (signal) {
        signals.push(signal);
      }
    }

    return signals;
  }

  /**
   * Get all signals
   */
  getAllSignals(): NormalizedSignal[] {
    this.ensureInitialized();

    const allSignals: NormalizedSignal[] = [];
    for (const categoryMap of this.signalsByCategory.values()) {
      for (const signal of categoryMap.values()) {
        allSignals.push(signal);
      }
    }

    return allSignals;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalSignals: number;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    this.ensureInitialized();

    const stats = {
      totalSignals: 0,
      byCategory: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };

    for (const [category, categoryMap] of this.signalsByCategory.entries()) {
      const count = categoryMap.size;
      stats.byCategory[category] = count;
      stats.totalSignals += count;

      for (const signal of categoryMap.values()) {
        stats.bySource[signal.source] = (stats.bySource[signal.source] || 0) + 1;
        stats.byPriority[signal.priority] = (stats.byPriority[signal.priority] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Acknowledge a signal
   */
  acknowledgeSignal(id: string): boolean {
    const signal = this.getSignal(id);
    if (!signal) return false;

    signal.acknowledged = true;
    signal.updatedAt = new Date();
    return true;
  }

  /**
   * Clear all signals
   */
  clear(): void {
    for (const categoryMap of this.signalsByCategory.values()) {
      categoryMap.clear();
    }
    this.signalIndex.clear();
    this.contentIndex.clear();
    this.entityIndex.clear();
  }

  // Private helpers

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }

  private findDuplicate(signal: NormalizedSignal): string | null {
    // Look for signals with same source, type, and entity
    const categoryMap = this.signalsByCategory.get(signal.category);
    if (!categoryMap) return null;

    for (const existing of categoryMap.values()) {
      if (
        existing.source === signal.source &&
        existing.type === signal.type &&
        existing.entityId === signal.entityId &&
        existing.entityType === signal.entityType
      ) {
        // Same signal type for same entity within decay window
        const ageMs = Date.now() - existing.createdAt.getTime();
        const hourMs = 60 * 60 * 1000;
        if (ageMs < hourMs) {
          return existing.id;
        }
      }
    }

    return null;
  }

  private mergeSignal(existingId: string, newSignal: NormalizedSignal): void {
    const existing = this.getSignal(existingId);
    if (!existing) return;

    // Update with higher severity/impact
    existing.severity = Math.max(existing.severity, newSignal.severity);
    existing.impact = Math.max(existing.impact, newSignal.impact);
    existing.freshness = 100; // Reset freshness
    existing.updatedAt = new Date();

    // Merge content IDs
    for (const contentId of newSignal.contentIds) {
      if (!existing.contentIds.includes(contentId)) {
        existing.contentIds.push(contentId);
        this.indexByContent(existing);
      }
    }

    // Link as related
    if (!existing.relatedSignalIds.includes(newSignal.id)) {
      existing.relatedSignalIds.push(newSignal.id);
    }
  }

  private indexByContent(signal: NormalizedSignal): void {
    for (const contentId of signal.contentIds) {
      let signalIds = this.contentIndex.get(contentId);
      if (!signalIds) {
        signalIds = new Set();
        this.contentIndex.set(contentId, signalIds);
      }
      signalIds.add(signal.id);
    }
  }

  private indexByEntity(signal: NormalizedSignal): void {
    if (!signal.entityId) return;

    const key = `${signal.entityType}:${signal.entityId}`;
    let signalIds = this.entityIndex.get(key);
    if (!signalIds) {
      signalIds = new Set();
      this.entityIndex.set(key, signalIds);
    }
    signalIds.add(signal.id);
  }

  private removeFromContentIndex(signal: NormalizedSignal): void {
    for (const contentId of signal.contentIds) {
      const signalIds = this.contentIndex.get(contentId);
      if (signalIds) {
        signalIds.delete(signal.id);
        if (signalIds.size === 0) {
          this.contentIndex.delete(contentId);
        }
      }
    }
  }

  private removeFromEntityIndex(signal: NormalizedSignal): void {
    if (!signal.entityId) return;

    const key = `${signal.entityType}:${signal.entityId}`;
    const signalIds = this.entityIndex.get(key);
    if (signalIds) {
      signalIds.delete(signal.id);
      if (signalIds.size === 0) {
        this.entityIndex.delete(key);
      }
    }
  }
}

// Export singleton instance
export const signalRegistry = new SignalRegistry();
