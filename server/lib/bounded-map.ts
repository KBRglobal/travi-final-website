/**
 * Bounded Map with LRU eviction and TTL support
 * Phase 16: Memory safety - no structure may grow without bound
 */

interface BoundedMapEntry<V> {
  value: V;
  expiresAt: number;
  lastAccessed: number;
}

export interface BoundedMapOptions {
  maxSize: number;
  defaultTtlMs: number;
  cleanupIntervalMs?: number;
}

export class BoundedMap<K, V> {
  private map = new Map<K, BoundedMapEntry<V>>();
  private maxSize: number;
  private defaultTtlMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: BoundedMapOptions) {
    this.maxSize = options.maxSize;
    this.defaultTtlMs = options.defaultTtlMs;

    const cleanupMs = options.cleanupIntervalMs || 60000;
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupMs);
  }

  set(key: K, value: V, ttlMs?: number): void {
    const now = Date.now();
    const ttl = ttlMs ?? this.defaultTtlMs;

    // Evict if at capacity
    if (this.map.size >= this.maxSize && !this.map.has(key)) {
      this.evictOldest();
    }

    this.map.set(key, {
      value,
      expiresAt: now + ttl,
      lastAccessed: now,
    });
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }

    entry.lastAccessed = now;
    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  private evictOldest(): void {
    let oldestKey: K | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.map) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.map.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (now > entry.expiresAt) {
        this.map.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.map.clear();
  }
}

export default BoundedMap;
