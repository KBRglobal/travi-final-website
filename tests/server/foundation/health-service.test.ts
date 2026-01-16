/**
 * Health Service Tests
 * Phase 1 Foundation: Tests for health check business logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database module before importing the service
vi.mock('../../../server/db', () => ({
  db: {
    execute: vi.fn(),
  },
}));

describe('HealthService', () => {
  let healthService: typeof import('../../../server/domains/system/services/health.service').healthService;
  let mockDb: { execute: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.resetModules();

    // Get the mocked db
    const dbModule = await import('../../../server/db');
    mockDb = dbModule.db as unknown as { execute: ReturnType<typeof vi.fn> };

    // Import the service (will use mocked db)
    const serviceModule = await import('../../../server/domains/system/services/health.service');
    healthService = serviceModule.healthService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return healthy status when all checks pass', async () => {
      mockDb.execute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const { response, httpStatus } = await healthService.checkHealth({
        includeDatabase: true,
        includeMemory: true,
      });

      expect(httpStatus).toBe(200);
      expect(response.status).toBe('healthy');
      expect(response.checks?.database?.status).toBe('healthy');
      expect(response.checks?.memory?.status).toBe('healthy');
      expect(response.uptime).toBeGreaterThan(0);
      expect(response.timestamp).toBeDefined();
    });

    it('should return unhealthy status when database check fails', async () => {
      mockDb.execute.mockRejectedValueOnce(new Error('Connection refused'));

      const { response, httpStatus } = await healthService.checkHealth({
        includeDatabase: true,
        includeMemory: true,
      });

      expect(httpStatus).toBe(503);
      expect(response.status).toBe('unhealthy');
      expect(response.checks?.database?.status).toBe('unhealthy');
      expect(response.checks?.database?.message).toContain('Failed to connect to database');
    });

    it('should skip database check when includeDatabase is false', async () => {
      const { response, httpStatus } = await healthService.checkHealth({
        includeDatabase: false,
        includeMemory: true,
      });

      expect(httpStatus).toBe(200);
      expect(response.checks?.database).toBeUndefined();
      expect(response.checks?.memory).toBeDefined();
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should skip memory check when includeMemory is false', async () => {
      mockDb.execute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const { response, httpStatus } = await healthService.checkHealth({
        includeDatabase: true,
        includeMemory: false,
      });

      expect(httpStatus).toBe(200);
      expect(response.checks?.database).toBeDefined();
      expect(response.checks?.memory).toBeUndefined();
    });

    it('should include correlationId when provided', async () => {
      mockDb.execute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const { response } = await healthService.checkHealth({
        correlationId: 'cid_test_12345',
      });

      expect(response.correlationId).toBe('cid_test_12345');
    });

    it('should measure database latency', async () => {
      mockDb.execute.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { rows: [{ '?column?': 1 }] };
      });

      const { response } = await healthService.checkHealth({
        includeDatabase: true,
        includeMemory: false,
      });

      expect(response.checks?.database?.latency).toBeGreaterThan(0);
    });
  });

  describe('checkLiveness', () => {
    it('should always return alive status', () => {
      const response = healthService.checkLiveness();

      expect(response.status).toBe('alive');
      expect(response.timestamp).toBeDefined();
    });

    it('should include correlationId when provided', () => {
      const response = healthService.checkLiveness('cid_test_12345');

      expect(response.correlationId).toBe('cid_test_12345');
    });
  });

  describe('checkReadiness', () => {
    it('should return ready when database is available', async () => {
      mockDb.execute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const { response, httpStatus } = await healthService.checkReadiness();

      expect(httpStatus).toBe(200);
      expect(response.status).toBe('ready');
    });

    it('should return not_ready when database is unavailable', async () => {
      mockDb.execute.mockRejectedValueOnce(new Error('Connection refused'));

      const { response, httpStatus } = await healthService.checkReadiness();

      expect(httpStatus).toBe(503);
      expect(response.status).toBe('not_ready');
      expect(response.reason).toContain('Database unavailable');
    });

    it('should include correlationId when provided', async () => {
      mockDb.execute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const { response } = await healthService.checkReadiness('cid_test_12345');

      expect(response.correlationId).toBe('cid_test_12345');
    });
  });
});
