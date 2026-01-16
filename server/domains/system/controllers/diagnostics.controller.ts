/**
 * Diagnostics Controller
 * Phase 1 Foundation: Aggregated system diagnostics endpoint
 */

import type { Request, Response } from 'express';
import { diagnosticsService } from '../services';
import { getCorrelationId } from '../../../shared/middleware';

export class DiagnosticsController {
  /**
   * GET /diagnostics - Aggregated system diagnostics
   * For Ops dashboards and monitoring
   */
  async getDiagnostics(req: Request, res: Response): Promise<void> {
    const correlationId = getCorrelationId(req);
    const response = await diagnosticsService.getDiagnostics(correlationId);
    res.json(response);
  }
}

export const diagnosticsController = new DiagnosticsController();
