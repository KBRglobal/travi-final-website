/**
 * Enterprise Cache Layer
 * Supports Upstash Redis (recommended) or falls back to in-memory cache
 */

import { Redis } from "@upstash/redis";

// Cache configuration
const CACHE_TTL = {
  short: 60, // 1 minute
  medium: 300, // 5 minutes
  long: 3600, // 1 hour
  day: 86400, // 24 hours
} as const;

type CacheTTL = keyof typeof CACHE_TTL;

// In-memory fallback cache
class MemoryCache {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  private cleanupInterval: NodeJS.Timeout;
  private readonly maxSize = 100000; // Phase 16: Bound cache size

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    // Phase 16: Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < oldestTime) {
        oldestTime = entry.expiresAt;
        oldestKey = key;
      }
    }
    if (oldestKey) this.cache.delete(oldestKey);
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  async flushByPattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    keys.forEach(key => this.cache.delete(key));
    return keys.length;
  }

  async incr(key: string): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const newValue = current + 1;
    await this.set(key, newValue, CACHE_TTL.day);
    return newValue;
  }

  private cleanup() {
    const now = Date.now();
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    });
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

// Unified cache interface
class CacheService {
  private redis: Redis | null = null;
  private memory: MemoryCache;
  private isRedisAvailable: boolean = false;

  constructor() {
    this.memory = new MemoryCache();
    this.initRedis();
  }

  private initRedis() {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
      try {
        this.redis = new Redis({
          url: redisUrl,
          token: redisToken,
        });
        this.isRedisAvailable = true;
      } catch (error) {}
    } else {
    }
  }

  get usingRedis(): boolean {
    return this.isRedisAvailable;
  }

  /**
   * Get a cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis && this.isRedisAvailable) {
        return await this.redis.get<T>(key);
      }
      return await this.memory.get<T>(key);
    } catch (error) {
      return await this.memory.get<T>(key);
    }
  }

  /**
   * Set a cached value
   */
  async set(key: string, value: unknown, ttl: CacheTTL | number = "medium"): Promise<void> {
    const ttlSeconds = typeof ttl === "string" ? CACHE_TTL[ttl] : ttl;
    try {
      if (this.redis && this.isRedisAvailable) {
        await this.redis.set(key, value, { ex: ttlSeconds });
      }
      // Always set in memory as backup
      await this.memory.set(key, value, ttlSeconds);
    } catch (error) {
      await this.memory.set(key, value, ttlSeconds);
    }
  }

  /**
   * Delete a cached value
   */
  async del(key: string): Promise<void> {
    try {
      if (this.redis && this.isRedisAvailable) {
        await this.redis.del(key);
      }
      await this.memory.del(key);
    } catch (error) {
      await this.memory.del(key);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      if (this.redis && this.isRedisAvailable) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        await this.memory.flushByPattern(pattern);
        return keys.length;
      }
      return await this.memory.flushByPattern(pattern);
    } catch (error) {
      return await this.memory.flushByPattern(pattern);
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      if (this.redis && this.isRedisAvailable) {
        return await this.redis.incr(key);
      }
      return await this.memory.incr(key);
    } catch (error) {
      return await this.memory.incr(key);
    }
  }

  /**
   * Cache-aside pattern: get from cache or compute
   */
  async getOrSet<T>(
    key: string,
    compute: () => Promise<T>,
    ttl: CacheTTL | number = "medium"
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await compute();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    type: "redis" | "memory";
    connected: boolean;
  }> {
    return {
      type: this.isRedisAvailable ? "redis" : "memory",
      connected: this.isRedisAvailable,
    };
  }

  /**
   * Health check - verify Redis connectivity
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    type: "redis" | "memory";
    latency?: number;
    error?: string;
  }> {
    const start = Date.now();

    if (!this.redis || !this.isRedisAvailable) {
      return {
        status: "degraded",
        type: "memory",
        latency: 0,
      };
    }

    try {
      // Test Redis connectivity with PING
      await this.redis.ping();
      return {
        status: "healthy",
        type: "redis",
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        type: "redis",
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : "Redis connection failed",
      };
    }
  }
}

// Cache key generators
export const cacheKeys = {
  content: (id: string) => `content:${id}`,
  contentBySlug: (slug: string) => `content:slug:${slug}`,
  contentList: (type: string, status: string, page: number) => `contents:${type}:${status}:${page}`,
  translation: (contentId: string, locale: string) => `translation:${contentId}:${locale}`,
  user: (id: string) => `user:${id}`,
  userPermissions: (id: string) => `user:permissions:${id}`,
  settings: () => `settings:all`,
  stats: () => `stats:dashboard`,
  analytics: (contentId: string, period: string) => `analytics:${contentId}:${period}`,

  // Patterns for invalidation
  patterns: {
    allContent: "content:*",
    allTranslations: "translation:*",
    allUsers: "user:*",
    allStats: "stats:*",
  },
};

// Singleton instance
export const cache = new CacheService();
export { CACHE_TTL, CacheTTL };
