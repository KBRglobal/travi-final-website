/**
 * System Info Controller
 * Phase 1 Foundation: Version, uptime, and build info endpoints
 */

import type { Request, Response } from 'express';
import { systemInfoService } from '../services';
import { getCorrelationId } from '../../../shared/middleware';

export class SystemInfoController {
  /**
   * GET /version - API version information
   * Mirrors legacy /api/version
   */
  getVersion(req: Request, res: Response): void {
    const correlationId = getCorrelationId(req);
    const response = systemInfoService.getVersion(correlationId);
    res.json(response);
  }

  /**
   * GET /uptime - Server uptime information
   */
  getUptime(req: Request, res: Response): void {
    const correlationId = getCorrelationId(req);
    const response = systemInfoService.getUptime(correlationId);
    res.json(response);
  }

  /**
   * GET /build-info - Build and environment information
   */
  getBuildInfo(req: Request, res: Response): void {
    const correlationId = getCorrelationId(req);
    const response = systemInfoService.getBuildInfo(correlationId);
    res.json(response);
  }
}

export const systemInfoController = new SystemInfoController();
