/**
 * Rate Limiting Configuration
 * 
 * Protects against abuse and DoS attacks with configurable rate limits
 * for different endpoint types.
 */

import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Rate limiter for login endpoints
 * 5 attempts per 15 minutes per IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use IP address as the key
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  // Skip successful requests (only count failed attempts)
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter for general API endpoints
 * 100 requests per minute per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

/**
 * Rate limiter for AI endpoints
 * 50 requests per hour per user/IP
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per window
  message: {
    error: 'AI request limit exceeded. Please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID if available, otherwise fall back to IP
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.claims?.sub;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return userId ? `user:${userId}` : `ip:${ip}`;
  },
});

/**
 * Rate limiter for write operations (POST, PUT, PATCH, DELETE)
 * 30 requests per minute per user/IP
 */
export const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per window
  message: {
    error: 'Too many write operations. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.claims?.sub;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return userId ? `user:${userId}` : `ip:${ip}`;
  },
  // Only apply to write operations
  skip: (req: Request) => {
    return !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  },
});

/**
 * Rate limiter for analytics endpoints
 * 200 requests per minute per IP/visitor
 */
export const analyticsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per window
  message: {
    error: 'Too many analytics requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use visitor ID from body if available, otherwise fall back to IP
    const visitorId = (req as any).body?.visitorId;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return visitorId ? `visitor:${visitorId}` : `ip:${ip}`;
  },
});

/**
 * Create a custom rate limiter with specific configuration
 */
export function createCustomRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message || 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req: Request) => {
      return req.ip || req.socket.remoteAddress || 'unknown';
    }),
  });
}
