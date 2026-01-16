/**
 * SEO/AEO Regeneration Guard
 * 
 * PHASE 6.3: Prevent unnecessary regeneration
 * 
 * Features:
 * - Cache outputs by entity + locale + promptVersion
 * - Skip regeneration if unchanged
 * - Log cache hits for monitoring
 * 
 * ACTIVATION: ENABLED
 */

import { log } from '../lib/logger';
import { getPromptRegistry } from './prompt-registry';
import type { PromptType, PromptContext } from './prompt-registry';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[RegenGuard] ${msg}`, data),
};

interface CacheEntry {
  output: string;
  cacheKey: string;
  promptVersion: string;
  createdAt: Date;
  hitCount: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  savedGenerations: number;
}

class RegenerationGuard {
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    entries: 0,
    savedGenerations: 0,
  };
  private maxEntries = 1000;
  private ttlMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check if regeneration is needed
   */
  shouldRegenerate(type: PromptType, context: PromptContext): {
    needed: boolean;
    cached?: string;
    reason: string;
  } {
    const cacheKey = this.buildCacheKey(type, context);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.stats.misses++;
      return { needed: true, reason: 'not_cached' };
    }

    // Check if prompt version changed
    const registry = getPromptRegistry();
    const template = registry.getTemplate(type);
    if (template && entry.promptVersion !== template.version) {
      this.stats.misses++;
      return { needed: true, reason: 'version_changed' };
    }

    // Check TTL
    const age = Date.now() - entry.createdAt.getTime();
    if (age > this.ttlMs) {
      this.cache.delete(cacheKey);
      this.stats.entries--;
      this.stats.misses++;
      return { needed: true, reason: 'expired' };
    }

    // Cache hit
    entry.hitCount++;
    this.stats.hits++;
    this.stats.savedGenerations++;

    logger.info('Cache hit - skipping regeneration', {
      type,
      entity: context.entityName,
      locale: context.locale,
      hitCount: entry.hitCount,
    });

    return { needed: false, cached: entry.output, reason: 'cached' };
  }

  /**
   * Store generated output
   */
  store(type: PromptType, context: PromptContext, output: string): void {
    const cacheKey = this.buildCacheKey(type, context);
    const registry = getPromptRegistry();
    const template = registry.getTemplate(type);

    // Evict if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    this.cache.set(cacheKey, {
      output,
      cacheKey,
      promptVersion: template?.version || 'unknown',
      createdAt: new Date(),
      hitCount: 0,
    });

    this.stats.entries = this.cache.size;
  }

  /**
   * Build cache key from type and context
   */
  private buildCacheKey(type: PromptType, context: PromptContext): string {
    const registry = getPromptRegistry();
    return registry.getCacheKey(type, context);
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt.getTime() < oldestTime) {
        oldestTime = entry.createdAt.getTime();
        oldest = key;
      }
    }

    if (oldest) {
      this.cache.delete(oldest);
      this.stats.entries--;
    }
  }

  /**
   * Invalidate cache for an entity
   */
  invalidate(entityType: string, entityName: string): number {
    const prefix = `${entityType}:${entityName}:`;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.stats.entries = this.cache.size;
      logger.info('Cache invalidated', { entityType, entityName, entriesRemoved: count });
    }

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? Math.round((this.stats.hits / total) * 100) : 0;

    return {
      ...this.stats,
      hitRate,
    };
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.entries = 0;
    logger.info('Cache cleared');
  }
}

// Singleton
let instance: RegenerationGuard | null = null;

export function getRegenerationGuard(): RegenerationGuard {
  if (!instance) {
    instance = new RegenerationGuard();
  }
  return instance;
}

export { RegenerationGuard };
