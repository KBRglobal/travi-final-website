/**
 * Error Transformer
 * Phase 1 Foundation: Converts errors to standardized HTTP responses
 */

import { ZodError } from 'zod';
import { DomainError, isDomainError, ValidationError } from './domain-error';

export interface ErrorResponse {
  error: string;
  message: string;
  correlationId?: string;
  context?: Record<string, unknown>;
  details?: Array<{ field: string; message: string }>;
}

export interface TransformOptions {
  correlationId?: string;
  includeStack?: boolean;
  isProduction?: boolean;
}

/**
 * Transform any error into a standardized error response
 */
export function errorToHttpResponse(
  error: unknown,
  options: TransformOptions = {}
): { status: number; body: ErrorResponse } {
  const {
    correlationId,
    isProduction = process.env.NODE_ENV === 'production',
  } = options;

  // Handle DomainError
  if (isDomainError(error)) {
    return {
      status: error.httpStatus,
      body: {
        error: error.code,
        message: error.message,
        ...(correlationId && { correlationId }),
        ...(Object.keys(error.context).length > 0 && !isProduction && { context: error.context }),
      },
    };
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.map((e) => ({
      field: e.path.join('.') || 'unknown',
      message: e.message,
    }));

    return {
      status: 400,
      body: {
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        ...(correlationId && { correlationId }),
        details,
      },
    };
  }

  // Handle generic Error
  if (error instanceof Error) {
    // Check for operational flag (legacy compatibility)
    const isOperational = (error as any).isOperational === true;
    const statusCode = (error as any).statusCode || (error as any).status || 500;

    if (isOperational) {
      return {
        status: statusCode,
        body: {
          error: 'OPERATIONAL_ERROR',
          message: error.message,
          ...(correlationId && { correlationId }),
        },
      };
    }

    // Non-operational error - hide details in production
    return {
      status: 500,
      body: {
        error: 'INTERNAL_ERROR',
        message: isProduction ? 'Internal server error' : error.message,
        ...(correlationId && { correlationId }),
      },
    };
  }

  // Handle unknown error types
  return {
    status: 500,
    body: {
      error: 'UNKNOWN_ERROR',
      message: isProduction ? 'An unexpected error occurred' : String(error),
      ...(correlationId && { correlationId }),
    },
  };
}

/**
 * Convert Zod error to ValidationError for consistent handling
 */
export function zodErrorToValidationError(zodError: ZodError): ValidationError {
  const firstError = zodError.errors[0];
  const field = firstError?.path.join('.') || 'unknown';
  const message = firstError?.message || 'Validation failed';

  return new ValidationError(`${field}: ${message}`, {
    errors: zodError.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    })),
  });
}
