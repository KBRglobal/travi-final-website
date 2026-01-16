/**
 * Health Controller
 * Phase 1 Foundation: Request/Response handling for health endpoints
 *
 * Controllers are responsible for:
 * - Parsing and validating request data (DTOs)
 * - Calling the appropriate service methods
 * - Formatting and returning responses
 *
 * Controllers should NOT contain business logic.
 */

import type { Request, Response } from 'express';
import { healthService } from '../services';
import { HealthCheckQuerySchema } from '../dto';
import { ValidationError } from '../../../shared/errors';
import { getCorrelationId } from '../../../shared/middleware';

/**
 * Health Controller
 * Handles all health-related HTTP endpoints
 */
export class HealthController {
  /**
   * GET /health - Full health check
   *
   * Query params:
   * - detailed: 'true'|'false' - Include detailed checks (default: true)
   * - checks: 'database,memory' - Specific checks to include
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    // Parse and validate query parameters
    const parseResult = HealthCheckQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      throw new ValidationError('Invalid query parameters', {
        errors: parseResult.error.errors,
      });
    }

    const { detailed, checks } = parseResult.data;
    const correlationId = getCorrelationId(req);

    // Determine which checks to run
    const includeDatabase = detailed && (!checks || checks.includes('database'));
    const includeMemory = detailed && (!checks || checks.includes('memory'));

    // Call service
    const { response, httpStatus } = await healthService.checkHealth({
      includeDatabase,
      includeMemory,
      correlationId,
    });

    res.status(httpStatus).json(response);
  }

  /**
   * GET /health/live - Kubernetes liveness probe
   */
  getLiveness(req: Request, res: Response): void {
    const correlationId = getCorrelationId(req);
    const response = healthService.checkLiveness(correlationId);

    res.status(200).json(response);
  }

  /**
   * GET /health/ready - Kubernetes readiness probe
   */
  async getReadiness(req: Request, res: Response): Promise<void> {
    const correlationId = getCorrelationId(req);
    const { response, httpStatus } = await healthService.checkReadiness(correlationId);

    res.status(httpStatus).json(response);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const healthController = new HealthController();
