/**
 * Traffic Attribution - Express Middleware
 *
 * Tracks traffic for content pages.
 * Feature-flagged: ENABLE_TRAFFIC_INTELLIGENCE
 */

import type { Request, Response, NextFunction } from 'express';
import { detectFromRequest } from '../source-detection';
import { getAttributionStore } from './store';
import type { TrafficSource } from '../types';

// Check if feature is enabled
function isEnabled(): boolean {
  return process.env.ENABLE_TRAFFIC_INTELLIGENCE === 'true';
}

// Generate visitor ID from request
function getVisitorId(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';
  // Simple hash-like ID (not cryptographic, just for deduplication)
  return Buffer.from(`${ip}:${userAgent}`).toString('base64').slice(0, 32);
}

// Extract content ID from request path
function extractContentId(req: Request): string | undefined {
  // Try to get from params
  if (req.params.id) return req.params.id;
  if (req.params.contentId) return req.params.contentId;
  if (req.params.slug) return `slug:${req.params.slug}`;

  // Try to parse from path
  const pathParts = req.path.split('/').filter(Boolean);

  // Pattern: /:type/:slug
  if (pathParts.length >= 2) {
    const contentTypes = [
      'attraction', 'hotel', 'article', 'dining', 'district',
      'transport', 'event', 'itinerary', 'landing_page',
    ];
    if (contentTypes.includes(pathParts[0])) {
      return `${pathParts[0]}:${pathParts[1]}`;
    }
  }

  return undefined;
}

// Extract entity info from request
function extractEntityInfo(req: Request): { entityId?: string; entityType?: string } {
  const pathParts = req.path.split('/').filter(Boolean);

  if (pathParts.length >= 2) {
    return {
      entityType: pathParts[0],
      entityId: pathParts[1],
    };
  }

  return {};
}

/**
 * Traffic tracking middleware
 */
export function trafficTrackingMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isEnabled()) {
      next();
      return;
    }

    // Skip API routes
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }

    // Skip static assets
    if (req.path.match(/\.(js|css|png|jpg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      next();
      return;
    }

    // Detect traffic source
    const source = detectFromRequest(req);

    // Skip bots (except AI bots we want to track)
    if (source.isBot && source.channel !== 'ai_search') {
      next();
      return;
    }

    // Extract content info
    const contentId = extractContentId(req);
    const { entityId, entityType } = extractEntityInfo(req);

    if (!contentId) {
      next();
      return;
    }

    // Record the visit
    const store = getAttributionStore();
    const visitorId = getVisitorId(req);

    store.record(contentId, source.channel, source.source, {
      entityId,
      aiPlatform: source.aiPlatform,
      visitorId,
    });

    // Attach source to request for downstream use
    (req as any).trafficSource = source;
    (req as any).contentId = contentId;

    next();
  };
}

/**
 * Get traffic source from request (after middleware)
 */
export function getTrafficSource(req: Request): TrafficSource | undefined {
  return (req as any).trafficSource;
}

/**
 * Get content ID from request (after middleware)
 */
export function getTrackedContentId(req: Request): string | undefined {
  return (req as any).contentId;
}
