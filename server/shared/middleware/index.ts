/**
 * Shared Middleware
 * Phase 1 Foundation: Export all foundation middleware
 */

export {
  correlationIdMiddleware,
  generateCorrelationId,
  getCorrelationId,
  getCorrelationContext,
  CORRELATION_ID_HEADER,
} from './correlation-id';

export {
  foundationErrorHandler,
  asyncHandler,
  notFoundHandler,
  type ErrorHandlerOptions,
} from './error-handler';

export {
  createRateLimiter,
  diagnosticsRateLimiter,
  healthRateLimiter,
  configRateLimiter,
  foundationRateLimitConfig,
} from './rate-limit.middleware';
