/**
 * Error Transformer Tests
 * Phase 1 Foundation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ZodError, z } from 'zod';
import {
  errorToHttpResponse,
  zodErrorToValidationError,
} from '../../../server/shared/errors/error-transformer';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from '../../../server/shared/errors/domain-error';

describe('Error Transformer', () => {
  describe('errorToHttpResponse', () => {
    describe('DomainError handling', () => {
      it('should transform ValidationError correctly', () => {
        const error = new ValidationError('Invalid email format', { field: 'email' });
        const { status, body } = errorToHttpResponse(error);

        expect(status).toBe(400);
        expect(body.error).toBe('VALIDATION_ERROR');
        expect(body.message).toBe('Invalid email format');
      });

      it('should transform NotFoundError correctly', () => {
        const error = new NotFoundError('Article', '123');
        const { status, body } = errorToHttpResponse(error);

        expect(status).toBe(404);
        expect(body.error).toBe('NOT_FOUND');
      });

      it('should include correlationId when provided', () => {
        const error = new ValidationError('test');
        const { body } = errorToHttpResponse(error, { correlationId: 'cid_test' });

        expect(body.correlationId).toBe('cid_test');
      });

      it('should hide context in production', () => {
        const error = new ValidationError('test', { sensitive: 'data' });
        const { body } = errorToHttpResponse(error, { isProduction: true });

        expect(body).not.toHaveProperty('context');
      });
    });

    describe('ZodError handling', () => {
      it('should transform ZodError to validation error response', () => {
        const schema = z.object({
          email: z.string().email(),
          age: z.number().min(18),
        });

        let zodError: ZodError;
        try {
          schema.parse({ email: 'invalid', age: 10 });
        } catch (e) {
          zodError = e as ZodError;
        }

        const { status, body } = errorToHttpResponse(zodError!);

        expect(status).toBe(400);
        expect(body.error).toBe('VALIDATION_ERROR');
        expect(body.details).toBeDefined();
        expect(body.details!.length).toBeGreaterThan(0);
      });
    });

    describe('Generic Error handling', () => {
      it('should handle operational errors with isOperational flag', () => {
        const error = new Error('Custom error') as any;
        error.isOperational = true;
        error.statusCode = 422;

        const { status, body } = errorToHttpResponse(error);

        expect(status).toBe(422);
        expect(body.error).toBe('OPERATIONAL_ERROR');
      });

      it('should hide internal error details in production', () => {
        const error = new Error('Database connection failed');
        const { status, body } = errorToHttpResponse(error, { isProduction: true });

        expect(status).toBe(500);
        expect(body.message).toBe('Internal server error');
      });

      it('should show error message in development', () => {
        const error = new Error('Debug info here');
        const { status, body } = errorToHttpResponse(error, { isProduction: false });

        expect(status).toBe(500);
        expect(body.message).toBe('Debug info here');
      });
    });

    describe('Unknown error types', () => {
      it('should handle string errors', () => {
        const { status, body } = errorToHttpResponse('Something went wrong', {
          isProduction: false,
        });

        expect(status).toBe(500);
        expect(body.error).toBe('UNKNOWN_ERROR');
      });

      it('should handle null/undefined', () => {
        const { status, body } = errorToHttpResponse(null);

        expect(status).toBe(500);
        expect(body.error).toBe('UNKNOWN_ERROR');
      });
    });
  });

  describe('zodErrorToValidationError', () => {
    it('should convert ZodError to ValidationError', () => {
      const schema = z.object({
        name: z.string().min(1),
      });

      let zodError: ZodError;
      try {
        schema.parse({ name: '' });
      } catch (e) {
        zodError = e as ZodError;
      }

      const validationError = zodErrorToValidationError(zodError!);

      expect(validationError).toBeInstanceOf(ValidationError);
      expect(validationError.context).toHaveProperty('errors');
    });
  });
});
