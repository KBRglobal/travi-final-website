/**
 * Health Service
 * Phase 1 Foundation: Business logic for health checks
 *
 * This service encapsulates all health check logic:
 * - Database connectivity checks
 * - Memory usage monitoring
 * - Overall system health aggregation
 */

import { sql } from 'drizzle-orm';
import { db } from '../../../db';
import { ExternalServiceError, ServiceUnavailableError } from '../../../shared/errors';
import type { HealthResponse, LivenessResponse, ReadinessResponse, CheckResult } from '../dto';

// ============================================================================
// Types
// ============================================================================

export interface HealthCheckOptions {
  /** Include database check */
  includeDatabase?: boolean;
  /** Include memory check */
  includeMemory?: boolean;
  /** Correlation ID for tracing */
  correlationId?: string;
}

export interface HealthCheckResult {
  response: HealthResponse;
  httpStatus: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class HealthService {
  private static instance: HealthService;

  private constructor() {}

  static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  /**
   * Perform full health check
   */
  async checkHealth(options: HealthCheckOptions = {}): Promise<HealthCheckResult> {
    const {
      includeDatabase = true,
      includeMemory = true,
      correlationId,
    } = options;

    const checks: HealthResponse['checks'] = {};
    let overallStatus: HealthResponse['status'] = 'healthy';

    // Database check
    if (includeDatabase) {
      const dbCheck = await this.checkDatabase();
      checks.database = dbCheck;

      if (dbCheck.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      }
    }

    // Memory check
    if (includeMemory) {
      const memCheck = this.checkMemory();
      checks.memory = memCheck;

      if (memCheck.status === 'warning' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      } else if (memCheck.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      }
    }

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      ...(correlationId && { correlationId }),
      ...(Object.keys(checks).length > 0 && { checks }),
    };

    const httpStatus = overallStatus === 'healthy' ? 200 : 503;

    return { response, httpStatus };
  }

  /**
   * Liveness probe - is the process alive?
   */
  checkLiveness(correlationId?: string): LivenessResponse {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      ...(correlationId && { correlationId }),
    };
  }

  /**
   * Readiness probe - is the service ready to accept traffic?
   */
  async checkReadiness(correlationId?: string): Promise<{
    response: ReadinessResponse;
    httpStatus: number;
  }> {
    try {
      await this.checkDatabaseConnectivity();

      return {
        response: {
          status: 'ready',
          timestamp: new Date().toISOString(),
          ...(correlationId && { correlationId }),
        },
        httpStatus: 200,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      return {
        response: {
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          reason: `Database unavailable: ${message}`,
          ...(correlationId && { correlationId }),
        },
        httpStatus: 503,
      };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Check database connectivity and measure latency
   */
  private async checkDatabase(): Promise<CheckResult> {
    const startTime = Date.now();

    try {
      await this.checkDatabaseConnectivity();

      return {
        status: 'healthy',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Database check failed',
      };
    }
  }

  /**
   * Execute database connectivity check
   * Throws ExternalServiceError if database is unreachable
   */
  private async checkDatabaseConnectivity(): Promise<void> {
    try {
      await db.execute(sql`SELECT 1`);
    } catch (error) {
      throw new ExternalServiceError(
        'database',
        'Failed to connect to database',
        {
          httpStatus: 503,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Check memory usage
   */
  private checkMemory(): CheckResult {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usagePercent = Math.round((heapUsedMB / heapTotalMB) * 100);

    let status: CheckResult['status'] = 'healthy';

    if (usagePercent > 95) {
      status = 'unhealthy';
    } else if (usagePercent > 90) {
      status = 'warning';
    }

    return {
      status,
      usage: usagePercent,
      ...(status !== 'healthy' && {
        message: `Heap usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
      }),
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const healthService = HealthService.getInstance();
