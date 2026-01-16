/**
 * Foundation Rate Limiting Middleware
 * Phase 1: Safety guards for system endpoints
 *
 * All rate limiters are DISABLED by default.
 * Enable via environment variables:
 * - ENABLE_FOUNDATION_RATE_LIMIT=true (master switch)
 * - FOUNDATION_DIAGNOSTICS_RATE_LIMIT=10 (requests per minute)
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';

// ============================================================================
// Configuration
// ============================================================================

const ENABLE_RATE_LIMIT = process.env.ENABLE_FOUNDATION_RATE_LIMIT === 'true';
const DIAGNOSTICS_LIMIT = parseInt(process.env.FOUNDATION_DIAGNOSTICS_RATE_LIMIT || '10', 10);
const DIAGNOSTICS_WINDOW_MS = 60 * 1000; // 1 minute

// ============================================================================
// In-Memory Rate Limiter (Simple, No External Dependencies)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes - only when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== 'true' && process.env.REPLIT_DEPLOYMENT !== '1') {
  setInterval(cleanupExpired, 5 * 60 * 1000);
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(req: Request): string {
  // Use X-Forwarded-For if behind proxy, otherwise use IP
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.ip || req.socket?.remoteAddress || 'unknown';
  return ip.trim();
}

// ============================================================================
// Rate Limit Middleware Factory
// ============================================================================

interface RateLimitOptions {
  /** Maximum requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Unique key prefix for this limiter */
  keyPrefix: string;
  /** Skip rate limiting for certain requests */
  skip?: (req: Request) => boolean;
}

/**
 * Create a rate limiting middleware
 * Returns 429 when limit exceeded
 */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip if rate limiting is disabled globally
    if (!ENABLE_RATE_LIMIT) {
      next();
      return;
    }

    // Skip if custom skip function returns true
    if (options.skip && options.skip(req)) {
      next();
      return;
    }

    const clientId = getClientId(req);
    const key = `${options.keyPrefix}:${clientId}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Create new entry if doesn't exist or window expired
    if (!entry || entry.resetAt <= now) {
      entry = {
        count: 1,
        resetAt: now + options.windowMs,
      };
      rateLimitStore.set(key, entry);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', options.limit);
      res.setHeader('X-RateLimit-Remaining', options.limit - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

      next();
      return;
    }

    // Increment count
    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', options.limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.limit - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    // Check if limit exceeded
    if (entry.count > options.limit) {
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
}

// ============================================================================
// Pre-configured Rate Limiters for Foundation Endpoints
// ============================================================================

/**
 * Rate limiter for diagnostics endpoint
 * Default: 10 requests per minute per IP
 * Disabled by default (ENABLE_FOUNDATION_RATE_LIMIT=false)
 */
export const diagnosticsRateLimiter = createRateLimiter({
  limit: DIAGNOSTICS_LIMIT,
  windowMs: DIAGNOSTICS_WINDOW_MS,
  keyPrefix: 'foundation:diagnostics',
});

/**
 * Rate limiter for health endpoints
 * Default: 60 requests per minute per IP (1/second)
 * Disabled by default
 */
export const healthRateLimiter = createRateLimiter({
  limit: 60,
  windowMs: 60 * 1000,
  keyPrefix: 'foundation:health',
});

/**
 * Rate limiter for config/flags endpoints
 * Default: 30 requests per minute per IP
 * Disabled by default
 */
export const configRateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60 * 1000,
  keyPrefix: 'foundation:config',
});

// ============================================================================
// Exports
// ============================================================================

export const foundationRateLimitConfig = {
  enabled: ENABLE_RATE_LIMIT,
  diagnostics: {
    limit: DIAGNOSTICS_LIMIT,
    windowMs: DIAGNOSTICS_WINDOW_MS,
  },
};
