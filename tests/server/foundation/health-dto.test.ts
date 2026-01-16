/**
 * Health DTO Tests
 * Phase 1 Foundation: Tests for health endpoint DTOs and validation
 */

import { describe, it, expect } from 'vitest';
import {
  HealthCheckQuerySchema,
  HealthResponseSchema,
  LivenessResponseSchema,
  ReadinessResponseSchema,
} from '../../../server/domains/system/dto';

describe('Health DTOs', () => {
  describe('HealthCheckQuerySchema', () => {
    it('should parse empty query with defaults', () => {
      const result = HealthCheckQuerySchema.parse({});

      expect(result.detailed).toBe(true);
      expect(result.checks).toBeUndefined();
    });

    it('should parse detailed=false', () => {
      const result = HealthCheckQuerySchema.parse({ detailed: 'false' });

      expect(result.detailed).toBe(false);
    });

    it('should parse detailed=true', () => {
      const result = HealthCheckQuerySchema.parse({ detailed: 'true' });

      expect(result.detailed).toBe(true);
    });

    it('should parse checks as comma-separated list', () => {
      const result = HealthCheckQuerySchema.parse({ checks: 'database,memory' });

      expect(result.checks).toEqual(['database', 'memory']);
    });

    it('should parse single check', () => {
      const result = HealthCheckQuerySchema.parse({ checks: 'database' });

      expect(result.checks).toEqual(['database']);
    });

    it('should reject invalid detailed value', () => {
      const result = HealthCheckQuerySchema.safeParse({ detailed: 'maybe' });

      expect(result.success).toBe(false);
    });
  });

  describe('HealthResponseSchema', () => {
    it('should validate healthy response', () => {
      const response = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 12345,
        version: '1.0.0',
        checks: {
          database: { status: 'healthy', latency: 5 },
          memory: { status: 'healthy', usage: 45 },
        },
      };

      const result = HealthResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it('should validate unhealthy response', () => {
      const response = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 12345,
        version: '1.0.0',
        checks: {
          database: { status: 'unhealthy', message: 'Connection refused' },
        },
      };

      const result = HealthResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it('should validate response with correlationId', () => {
      const response = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 12345,
        version: '1.0.0',
        correlationId: 'cid_test_12345',
      };

      const result = HealthResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
      expect(result.data?.correlationId).toBe('cid_test_12345');
    });

    it('should reject invalid status', () => {
      const response = {
        status: 'broken',
        timestamp: new Date().toISOString(),
        uptime: 12345,
        version: '1.0.0',
      };

      const result = HealthResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });
  });

  describe('LivenessResponseSchema', () => {
    it('should validate liveness response', () => {
      const response = {
        status: 'alive',
        timestamp: new Date().toISOString(),
      };

      const result = LivenessResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it('should validate with correlationId', () => {
      const response = {
        status: 'alive',
        timestamp: new Date().toISOString(),
        correlationId: 'cid_test_12345',
      };

      const result = LivenessResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it('should reject non-alive status', () => {
      const response = {
        status: 'dead',
        timestamp: new Date().toISOString(),
      };

      const result = LivenessResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });
  });

  describe('ReadinessResponseSchema', () => {
    it('should validate ready response', () => {
      const response = {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };

      const result = ReadinessResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it('should validate not_ready response with reason', () => {
      const response = {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        reason: 'Database unavailable',
      };

      const result = ReadinessResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
      expect(result.data?.reason).toBe('Database unavailable');
    });

    it('should validate with correlationId', () => {
      const response = {
        status: 'ready',
        timestamp: new Date().toISOString(),
        correlationId: 'cid_test_12345',
      };

      const result = ReadinessResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });
  });
});
