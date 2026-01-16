/**
 * Domain Error System
 * Phase 1 Foundation: Unified error handling for all domains
 *
 * All domain errors extend DomainError and provide:
 * - Consistent error codes
 * - HTTP status mapping
 * - Structured context for debugging
 * - Correlation ID propagation
 */

export interface ErrorContext {
  [key: string]: unknown;
}

export interface DomainErrorOptions {
  code: string;
  message: string;
  httpStatus?: number;
  context?: ErrorContext;
  cause?: Error;
  isOperational?: boolean;
}

/**
 * Base class for all domain errors.
 * Operational errors are expected errors (validation, not found, etc.)
 * Non-operational errors are unexpected (programming bugs, system failures)
 */
export class DomainError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;
  public readonly cause?: Error;
  public readonly timestamp: Date;

  constructor(options: DomainErrorOptions) {
    super(options.message);

    this.name = this.constructor.name;
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? 500;
    this.context = options.context ?? {};
    this.isOperational = options.isOperational ?? true;
    this.cause = options.cause;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to a safe JSON representation for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      error: this.code,
      message: this.message,
      ...(Object.keys(this.context).length > 0 && { context: this.context }),
    };
  }

  /**
   * Convert to a detailed JSON for logging (includes stack, cause)
   */
  toLogJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      context: this.context,
      isOperational: this.isOperational,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      ...(this.cause && {
        cause: this.cause instanceof Error
          ? { message: this.cause.message, stack: this.cause.stack }
          : this.cause
      }),
    };
  }
}

// ============================================================================
// Validation Errors (400)
// ============================================================================

export class ValidationError extends DomainError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super({
      code: 'VALIDATION_ERROR',
      message,
      httpStatus: 400,
      context,
      cause,
      isOperational: true,
    });
  }
}

export class InvalidInputError extends DomainError {
  constructor(field: string, reason: string, context?: ErrorContext) {
    super({
      code: 'INVALID_INPUT',
      message: `Invalid input for field '${field}': ${reason}`,
      httpStatus: 400,
      context: { field, reason, ...context },
      isOperational: true,
    });
  }
}

// ============================================================================
// Authentication & Authorization Errors (401, 403)
// ============================================================================

export class AuthenticationError extends DomainError {
  constructor(message: string = 'Authentication required', context?: ErrorContext) {
    super({
      code: 'AUTHENTICATION_REQUIRED',
      message,
      httpStatus: 401,
      context,
      isOperational: true,
    });
  }
}

export class AuthorizationError extends DomainError {
  constructor(message: string = 'Permission denied', context?: ErrorContext) {
    super({
      code: 'AUTHORIZATION_DENIED',
      message,
      httpStatus: 403,
      context,
      isOperational: true,
    });
  }
}

// ============================================================================
// Not Found Errors (404)
// ============================================================================

export class NotFoundError extends DomainError {
  constructor(resource: string, identifier?: string | number, context?: ErrorContext) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super({
      code: 'NOT_FOUND',
      message,
      httpStatus: 404,
      context: { resource, identifier, ...context },
      isOperational: true,
    });
  }
}

// ============================================================================
// Conflict Errors (409)
// ============================================================================

export class ConflictError extends DomainError {
  constructor(message: string, context?: ErrorContext) {
    super({
      code: 'CONFLICT',
      message,
      httpStatus: 409,
      context,
      isOperational: true,
    });
  }
}

export class DuplicateError extends DomainError {
  constructor(resource: string, field: string, value: unknown, context?: ErrorContext) {
    super({
      code: 'DUPLICATE_ENTRY',
      message: `${resource} with ${field} '${value}' already exists`,
      httpStatus: 409,
      context: { resource, field, value, ...context },
      isOperational: true,
    });
  }
}

// ============================================================================
// Rate Limit Errors (429)
// ============================================================================

export class RateLimitError extends DomainError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number, context?: ErrorContext) {
    super({
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      httpStatus: 429,
      context: { retryAfter, ...context },
      isOperational: true,
    });
    this.retryAfter = retryAfter;
  }
}

// ============================================================================
// External Service Errors (502, 503, 504)
// ============================================================================

export class ExternalServiceError extends DomainError {
  constructor(
    serviceName: string,
    message: string,
    options?: {
      httpStatus?: number;
      context?: ErrorContext;
      cause?: Error;
    }
  ) {
    super({
      code: 'EXTERNAL_SERVICE_ERROR',
      message: `External service '${serviceName}' error: ${message}`,
      httpStatus: options?.httpStatus ?? 502,
      context: { serviceName, ...options?.context },
      cause: options?.cause,
      isOperational: true,
    });
  }
}

export class ServiceUnavailableError extends DomainError {
  constructor(message: string = 'Service temporarily unavailable', context?: ErrorContext) {
    super({
      code: 'SERVICE_UNAVAILABLE',
      message,
      httpStatus: 503,
      context,
      isOperational: true,
    });
  }
}

// ============================================================================
// Internal Errors (500)
// ============================================================================

export class InternalError extends DomainError {
  constructor(message: string, cause?: Error, context?: ErrorContext) {
    super({
      code: 'INTERNAL_ERROR',
      message,
      httpStatus: 500,
      context,
      cause,
      isOperational: false,
    });
  }
}

// ============================================================================
// Feature Flag Errors
// ============================================================================

export class FeatureDisabledError extends DomainError {
  constructor(featureName: string, context?: ErrorContext) {
    super({
      code: 'FEATURE_DISABLED',
      message: `Feature '${featureName}' is currently disabled`,
      httpStatus: 503,
      context: { feature: featureName, ...context },
      isOperational: true,
    });
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

export function isOperationalError(error: unknown): boolean {
  if (isDomainError(error)) {
    return error.isOperational;
  }
  return false;
}
