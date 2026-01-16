/**
 * Unified Error System
 * Phase 1 Foundation: Export all error types and utilities
 */

export {
  DomainError,
  ValidationError,
  InvalidInputError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DuplicateError,
  RateLimitError,
  ExternalServiceError,
  ServiceUnavailableError,
  InternalError,
  FeatureDisabledError,
  isDomainError,
  isOperationalError,
  type ErrorContext,
  type DomainErrorOptions,
} from './domain-error';

export {
  errorToHttpResponse,
  zodErrorToValidationError,
  type ErrorResponse,
  type TransformOptions,
} from './error-transformer';
