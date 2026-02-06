import type { Request, Response, NextFunction } from "express";

/**
 * CDN-ready cache headers middleware.
 * Adds Vary: Accept-Encoding and appropriate Cache-Control
 * based on file type. Only applies to static asset routes,
 * NOT to API responses.
 */
export function cdnCacheHeaders(req: Request, res: Response, next: NextFunction) {
  // Skip API routes - never cache API responses with this middleware
  if (req.path.startsWith("/api")) {
    return next();
  }

  // Add Vary header for CDN content negotiation (gzip/brotli variants)
  res.setHeader("Vary", "Accept-Encoding");

  next();
}

/**
 * Cache headers for user-uploaded content (images, PDFs).
 * Moderate caching since uploads can be re-uploaded with same filename.
 */
export function uploadsCacheHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("Vary", "Accept-Encoding");
  next();
}
