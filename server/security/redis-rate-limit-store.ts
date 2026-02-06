/**
 * Redis-backed store for express-rate-limit (v7+).
 * Uses Upstash Redis when available, falls back to the default in-memory store.
 */

import { Redis } from "@upstash/redis";
import type { Store, IncrementResponse, Options } from "express-rate-limit";

export class RedisRateLimitStore implements Store {
  private redis: Redis | null = null;
  readonly prefix: string;
  private windowMs = 60_000;

  constructor(prefix = "erl:") {
    this.prefix = prefix;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      try {
        this.redis = new Redis({ url, token });
      } catch {
        // Redis unavailable — stays null, callers should check isAvailable
      }
    }
  }

  /** Whether this store has a working Redis connection. */
  get isAvailable(): boolean {
    return this.redis !== null;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<IncrementResponse> {
    if (!this.redis) {
      throw new Error("Redis not available");
    }

    const redisKey = `${this.prefix}${key}`;
    const ttlSec = Math.ceil(this.windowMs / 1000);

    // INCR + conditional EXPIRE in a pipeline for atomicity
    const results = await this.redis.pipeline().incr(redisKey).ttl(redisKey).exec();

    const totalHits = results[0] as number;
    const currentTtl = results[1] as number;

    // Set expiry only on first hit (TTL is -1 when no expiry)
    if (currentTtl < 0) {
      await this.redis.expire(redisKey, ttlSec);
    }

    const resetTime = new Date(Date.now() + (currentTtl > 0 ? currentTtl * 1000 : this.windowMs));

    return { totalHits, resetTime };
  }

  async decrement(key: string): Promise<void> {
    if (!this.redis) return;
    const redisKey = `${this.prefix}${key}`;
    await this.redis.decr(redisKey);
  }

  async resetKey(key: string): Promise<void> {
    if (!this.redis) return;
    const redisKey = `${this.prefix}${key}`;
    await this.redis.del(redisKey);
  }
}
