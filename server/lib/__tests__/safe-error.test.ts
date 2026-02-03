/**
 * Tests for Safe Error Handling Utilities
 *
 * These tests verify that error messages are properly sanitized
 * before being sent to clients, preventing information disclosure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ErrorCategory,
  getSafeErrorMessage,
  createErrorResponse,
  getStatusCodeForCategory,
  isMessageSafeForClient,
  sanitizeErrorMessage,
} from '../safe-error';

// Mock the logger
vi.mock('../logger', () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Safe Error Handling', () => {
  describe('getSafeErrorMessage', () => {
    it('should return safe message for validation errors', () => {
      const error = new Error('User input "id" failed validation: invalid UUID format');
      const result = getSafeErrorMessage(error, ErrorCategory.VALIDATION);
      expect(result).toBe('Invalid request data');
    });

    it('should return safe message for authentication errors', () => {
      const error = new Error('JWT token expired at 2024-01-01');
      const result = getSafeErrorMessage(error, ErrorCategory.AUTHENTICATION);
      expect(result).toBe('Authentication required');
    });

    it('should return safe message for database errors', () => {
      const error = new Error('PostgreSQL connection refused to host 192.168.1.1:5432');
      const result = getSafeErrorMessage(error, ErrorCategory.DATABASE);
      expect(result).toBe('Service temporarily unavailable');
    });

    it('should return safe message for internal errors', () => {
      const error = new Error('Stack trace: at processUser (/app/server/routes.ts:123)');
      const result = getSafeErrorMessage(error, ErrorCategory.INTERNAL);
      expect(result).toBe('An unexpected error occurred');
    });

    it('should handle non-Error objects', () => {
      const result = getSafeErrorMessage('string error', ErrorCategory.INTERNAL);
      expect(result).toBe('An unexpected error occurred');
    });

    it('should handle null/undefined errors', () => {
      const result = getSafeErrorMessage(null, ErrorCategory.INTERNAL);
      expect(result).toBe('An unexpected error occurred');
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response without code', () => {
      const error = new Error('Database connection failed');
      const result = createErrorResponse(error, ErrorCategory.DATABASE);

      expect(result).toEqual({ error: 'Service temporarily unavailable' });
      expect(result).not.toHaveProperty('code');
    });

    it('should create error response with code when requested', () => {
      const error = new Error('Rate limit exceeded');
      const result = createErrorResponse(error, ErrorCategory.RATE_LIMIT, undefined, true);

      expect(result).toEqual({
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT',
      });
    });

    it('should use default category when not specified', () => {
      const error = new Error('Unknown error');
      const result = createErrorResponse(error);

      expect(result.error).toBe('An unexpected error occurred');
    });
  });

  describe('getStatusCodeForCategory', () => {
    it('should return 400 for validation errors', () => {
      expect(getStatusCodeForCategory(ErrorCategory.VALIDATION)).toBe(400);
    });

    it('should return 401 for authentication errors', () => {
      expect(getStatusCodeForCategory(ErrorCategory.AUTHENTICATION)).toBe(401);
    });

    it('should return 403 for authorization errors', () => {
      expect(getStatusCodeForCategory(ErrorCategory.AUTHORIZATION)).toBe(403);
    });

    it('should return 404 for not found errors', () => {
      expect(getStatusCodeForCategory(ErrorCategory.NOT_FOUND)).toBe(404);
    });

    it('should return 409 for conflict errors', () => {
      expect(getStatusCodeForCategory(ErrorCategory.CONFLICT)).toBe(409);
    });

    it('should return 429 for rate limit errors', () => {
      expect(getStatusCodeForCategory(ErrorCategory.RATE_LIMIT)).toBe(429);
    });

    it('should return 503 for external service errors', () => {
      expect(getStatusCodeForCategory(ErrorCategory.EXTERNAL_SERVICE)).toBe(503);
    });

    it('should return 503 for database errors', () => {
      expect(getStatusCodeForCategory(ErrorCategory.DATABASE)).toBe(503);
    });

    it('should return 500 for internal errors', () => {
      expect(getStatusCodeForCategory(ErrorCategory.INTERNAL)).toBe(500);
    });
  });

  describe('isMessageSafeForClient', () => {
    it('should allow "not found" messages', () => {
      expect(isMessageSafeForClient('not found')).toBe(true);
      expect(isMessageSafeForClient('Not Found')).toBe(true);
    });

    it('should allow "invalid request" messages', () => {
      expect(isMessageSafeForClient('invalid request')).toBe(true);
      expect(isMessageSafeForClient('Invalid Request')).toBe(true);
    });

    it('should allow "permission denied" messages', () => {
      expect(isMessageSafeForClient('permission denied')).toBe(true);
    });

    it('should allow "X is required" messages', () => {
      expect(isMessageSafeForClient('Email is required')).toBe(true);
      expect(isMessageSafeForClient('Password is required')).toBe(true);
    });

    it('should allow "invalid X format" messages', () => {
      expect(isMessageSafeForClient('invalid email format')).toBe(true);
      expect(isMessageSafeForClient('Invalid date format')).toBe(true);
    });

    it('should block messages containing file paths', () => {
      expect(isMessageSafeForClient('Error at /app/server/routes.ts:123')).toBe(false);
    });

    it('should block messages containing stack traces', () => {
      expect(isMessageSafeForClient('Error: TypeError at Object.<anonymous>')).toBe(false);
    });

    it('should block messages containing SQL', () => {
      expect(isMessageSafeForClient('SELECT * FROM users WHERE id = 1')).toBe(false);
    });

    it('should block messages containing internal IPs', () => {
      expect(isMessageSafeForClient('Connection refused to 192.168.1.1')).toBe(false);
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should pass through safe messages', () => {
      expect(sanitizeErrorMessage('not found')).toBe('not found');
      expect(sanitizeErrorMessage('Email is required')).toBe('Email is required');
    });

    it('should replace unsafe messages with fallback', () => {
      expect(sanitizeErrorMessage('Error at /app/server/routes.ts:123'))
        .toBe('An error occurred');
    });

    it('should use custom fallback when provided', () => {
      expect(sanitizeErrorMessage('Some internal error', 'Something went wrong'))
        .toBe('Something went wrong');
    });
  });

  describe('Security: No Information Disclosure', () => {
    it('should never leak database connection strings', () => {
      const sensitiveError = new Error('ECONNREFUSED postgresql://user:password@db.internal:5432/production');
      const result = getSafeErrorMessage(sensitiveError, ErrorCategory.DATABASE);

      expect(result).not.toContain('postgresql');
      expect(result).not.toContain('password');
      expect(result).not.toContain('user');
      expect(result).not.toContain('internal');
      expect(result).not.toContain('5432');
    });

    it('should never leak file system paths', () => {
      const sensitiveError = new Error('ENOENT: no such file or directory /var/app/config/secrets.json');
      const result = getSafeErrorMessage(sensitiveError, ErrorCategory.INTERNAL);

      expect(result).not.toContain('/var');
      expect(result).not.toContain('secrets');
      expect(result).not.toContain('.json');
    });

    it('should never leak API keys', () => {
      const sensitiveError = new Error('Invalid API key: sk-proj-abc123xyz789');
      const result = getSafeErrorMessage(sensitiveError, ErrorCategory.EXTERNAL_SERVICE);

      expect(result).not.toContain('sk-proj');
      expect(result).not.toContain('abc123');
    });

    it('should never leak user data', () => {
      const sensitiveError = new Error('User john.doe@example.com not found in database');
      const result = getSafeErrorMessage(sensitiveError, ErrorCategory.NOT_FOUND);

      expect(result).not.toContain('john.doe');
      expect(result).not.toContain('example.com');
    });
  });
});
