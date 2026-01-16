/**
 * Domain Error System Tests
 * Phase 1 Foundation
 */

import { describe, it, expect } from 'vitest';
import {
  DomainError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  InternalError,
  FeatureDisabledError,
  isDomainError,
  isOperationalError,
} from '../../../server/shared/errors/domain-error';

describe('Domain Error System', () => {
  describe('DomainError', () => {
    it('should create error with all properties', () => {
      const error = new DomainError({
        code: 'TEST_ERROR',
        message: 'Test error message',
        httpStatus: 400,
        context: { key: 'value' },
        isOperational: true,
      });

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.httpStatus).toBe(400);
      expect(error.context).toEqual({ key: 'value' });
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should use defaults when optional values not provided', () => {
      const error = new DomainError({
        code: 'TEST_ERROR',
        message: 'Test error',
      });

      expect(error.httpStatus).toBe(500);
      expect(error.context).toEqual({});
      expect(error.isOperational).toBe(true);
    });

    it('should serialize to JSON correctly', () => {
      const error = new DomainError({
        code: 'TEST_ERROR',
        message: 'Test error',
        context: { field: 'value' },
      });

      const json = error.toJSON();

      expect(json).toEqual({
        error: 'TEST_ERROR',
        message: 'Test error',
        context: { field: 'value' },
      });
    });

    it('should not include empty context in JSON', () => {
      const error = new DomainError({
        code: 'TEST_ERROR',
        message: 'Test error',
      });

      const json = error.toJSON();

      expect(json).not.toHaveProperty('context');
    });

    it('should include detailed info in log JSON', () => {
      const cause = new Error('Original error');
      const error = new DomainError({
        code: 'TEST_ERROR',
        message: 'Test error',
        cause,
      });

      const logJson = error.toLogJSON();

      expect(logJson).toHaveProperty('name', 'DomainError');
      expect(logJson).toHaveProperty('code', 'TEST_ERROR');
      expect(logJson).toHaveProperty('stack');
      expect(logJson).toHaveProperty('cause');
    });
  });

  describe('ValidationError', () => {
    it('should have correct status and code', () => {
      const error = new ValidationError('Invalid input');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.httpStatus).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should include context and cause', () => {
      const cause = new Error('Zod error');
      const error = new ValidationError('Invalid input', { field: 'email' }, cause);

      expect(error.context).toEqual({ field: 'email' });
      expect(error.cause).toBe(cause);
    });
  });

  describe('NotFoundError', () => {
    it('should have correct status and code', () => {
      const error = new NotFoundError('Article', '123');

      expect(error.code).toBe('NOT_FOUND');
      expect(error.httpStatus).toBe(404);
      expect(error.message).toBe("Article with identifier '123' not found");
    });

    it('should handle missing identifier', () => {
      const error = new NotFoundError('Article');

      expect(error.message).toBe('Article not found');
    });
  });

  describe('AuthenticationError', () => {
    it('should have correct status and code', () => {
      const error = new AuthenticationError();

      expect(error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(error.httpStatus).toBe(401);
    });
  });

  describe('AuthorizationError', () => {
    it('should have correct status and code', () => {
      const error = new AuthorizationError();

      expect(error.code).toBe('AUTHORIZATION_DENIED');
      expect(error.httpStatus).toBe(403);
    });
  });

  describe('ConflictError', () => {
    it('should have correct status and code', () => {
      const error = new ConflictError('Resource already exists');

      expect(error.code).toBe('CONFLICT');
      expect(error.httpStatus).toBe(409);
    });
  });

  describe('RateLimitError', () => {
    it('should have correct status and code', () => {
      const error = new RateLimitError('Too many requests', 60);

      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.httpStatus).toBe(429);
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('ExternalServiceError', () => {
    it('should have correct status and code', () => {
      const error = new ExternalServiceError('OpenAI', 'API timeout');

      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.httpStatus).toBe(502);
      expect(error.message).toContain('OpenAI');
    });
  });

  describe('InternalError', () => {
    it('should be non-operational', () => {
      const error = new InternalError('Unexpected error');

      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.httpStatus).toBe(500);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('FeatureDisabledError', () => {
    it('should have correct status and code', () => {
      const error = new FeatureDisabledError('dark-mode');

      expect(error.code).toBe('FEATURE_DISABLED');
      expect(error.httpStatus).toBe(503);
      expect(error.context).toHaveProperty('feature', 'dark-mode');
    });
  });

  describe('Type Guards', () => {
    it('isDomainError should return true for DomainError', () => {
      const error = new ValidationError('test');
      expect(isDomainError(error)).toBe(true);
    });

    it('isDomainError should return false for regular Error', () => {
      const error = new Error('test');
      expect(isDomainError(error)).toBe(false);
    });

    it('isOperationalError should return true for operational errors', () => {
      const error = new ValidationError('test');
      expect(isOperationalError(error)).toBe(true);
    });

    it('isOperationalError should return false for non-operational errors', () => {
      const error = new InternalError('test');
      expect(isOperationalError(error)).toBe(false);
    });
  });
});
