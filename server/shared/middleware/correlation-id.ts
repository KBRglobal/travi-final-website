/**
 * Correlation ID Middleware
 * Phase 1 Foundation: Request tracing across the system
 *
 * Injects X-Correlation-Id header on every request.
 * If provided by client, it's preserved. Otherwise, a new one is generated.
 */

import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

// Feature flag - default OFF (no behavior change until enabled)
const ENABLE_CORRELATION_ID = process.env.ENABLE_CORRELATION_ID === 'true';

/**
 * Generate a unique correlation ID
 * Format: cid_{timestamp}_{random}
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomUUID().split('-')[0];
  return `cid_${timestamp}_${random}`;
}

/**
 * Extend Express Request to include correlationId
 */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/**
 * Correlation ID middleware
 * - Reads X-Correlation-Id from incoming request header
 * - Generates new ID if not present
 * - Attaches to req.correlationId
 * - Adds to response header
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Feature flag check - if disabled, skip but continue
  if (!ENABLE_CORRELATION_ID) {
    return next();
  }

  // Check for existing correlation ID in request header
  const existingId = req.headers[CORRELATION_ID_HEADER] as string | undefined;

  // Use existing or generate new
  const correlationId = existingId || generateCorrelationId();

  // Attach to request object for downstream use
  req.correlationId = correlationId;

  // Add to response headers
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
}

/**
 * Get correlation ID from request (safe accessor)
 */
export function getCorrelationId(req: Request): string | undefined {
  return req.correlationId;
}

/**
 * Create a child context with correlation ID for logging
 */
export function getCorrelationContext(req: Request): Record<string, string> {
  const correlationId = getCorrelationId(req);
  return correlationId ? { correlationId } : {};
}
