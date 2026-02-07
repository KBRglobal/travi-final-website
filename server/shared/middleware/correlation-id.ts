import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

/**
 * Correlation ID Middleware
 * Assigns a unique request ID to every request for tracing across logs.
 * Uses incoming cf-ray (Cloudflare) or x-request-id header if present,
 * otherwise generates a new UUID v4.
 * Sets the ID on both the request and response headers.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId =
    (req.headers["cf-ray"] as string) || (req.headers["x-request-id"] as string) || randomUUID();

  // Attach to request for downstream use
  (req as any).requestId = requestId;

  // Return in response for client-side correlation
  res.setHeader("X-Request-Id", requestId);

  next();
}
