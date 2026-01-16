/**
 * Error Handler Middleware
 * Phase 1 Foundation: Centralized error handling with structured logging
 *
 * This middleware catches all errors and transforms them into consistent responses.
 * Feature flagged - when disabled, falls through to existing error handler.
 */

import type { Request, Response, NextFunction } from 'express';
import { errorToHttpResponse, isDomainError } from '../errors';
import { getCorrelationId } from './correlation-id';
import { createLogger } from '../../lib/logger';

// Feature flag - default OFF
const ENABLE_FOUNDATION_ERROR_HANDLER = process.env.ENABLE_FOUNDATION_ERROR_HANDLER === 'true';

const logger = createLogger('error-handler');

export interface ErrorHandlerOptions {
  /** Include stack traces in development */
  includeStack?: boolean;
  /** Log all errors (including operational) */
  logAllErrors?: boolean;
}

/**
 * Foundation error handler middleware
 * Must be registered LAST in middleware chain
 */
export function foundationErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    includeStack = process.env.NODE_ENV !== 'production',
    logAllErrors = true,
  } = options;

  return function errorHandler(
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // Feature flag check - if disabled, pass to next error handler
    if (!ENABLE_FOUNDATION_ERROR_HANDLER) {
      return next(err);
    }

    const correlationId = getCorrelationId(req);
    const isProduction = process.env.NODE_ENV === 'production';

    // Transform error to HTTP response
    const { status, body } = errorToHttpResponse(err, {
      correlationId,
      isProduction,
    });

    // Log the error
    if (logAllErrors || status >= 500) {
      const logData: Record<string, unknown> = {
        correlationId,
        method: req.method,
        path: req.path,
        status,
        errorCode: body.error,
      };

      if (isDomainError(err)) {
        logData.errorDetails = err.toLogJSON();
      } else if (err instanceof Error) {
        logData.errorMessage = err.message;
        if (includeStack) {
          logData.stack = err.stack;
        }
      } else {
        logData.error = String(err);
      }

      if (status >= 500) {
        logger.error(logData, 'Unhandled error');
      } else if (status >= 400) {
        logger.warn(logData, 'Client error');
      } else {
        logger.info(logData, 'Error handled');
      }
    }

    // Don't send response if headers already sent
    if (res.headersSent) {
      return next(err);
    }

    // Send standardized error response
    res.status(status).json(body);
  };
}

/**
 * Async handler wrapper to catch promise rejections
 * Use this to wrap async route handlers
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return function asyncHandlerWrapper(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  // Feature flag check
  if (!ENABLE_FOUNDATION_ERROR_HANDLER) {
    return next();
  }

  const correlationId = getCorrelationId(req);

  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    ...(correlationId && { correlationId }),
  });
}
