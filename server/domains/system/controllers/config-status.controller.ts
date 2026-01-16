/**
 * Config Status Controller
 * Phase 1 Foundation: Configuration and feature flags endpoints
 */

import type { Request, Response } from 'express';
import { configStatusService } from '../services';
import { getCorrelationId } from '../../../shared/middleware';

export class ConfigStatusController {
  /**
   * GET /config/status - Service configuration status
   * Mirrors legacy /api/system-status
   */
  getConfigStatus(req: Request, res: Response): void {
    const correlationId = getCorrelationId(req);
    const response = configStatusService.getConfigStatus(correlationId);
    res.json(response);
  }

  /**
   * GET /features - Platform features status
   */
  getFeatures(req: Request, res: Response): void {
    const correlationId = getCorrelationId(req);
    const configStatus = configStatusService.getConfigStatus(correlationId);

    res.json({
      timestamp: new Date().toISOString(),
      features: configStatus.features,
      activeAIProvider: configStatus.activeAIProvider,
      safeMode: configStatus.safeMode,
      ...(correlationId && { correlationId }),
    });
  }

  /**
   * GET /flags - Feature flags status
   */
  getFlags(req: Request, res: Response): void {
    const correlationId = getCorrelationId(req);
    const response = configStatusService.getFeatureFlags(correlationId);
    res.json(response);
  }

  /**
   * GET /domains - Enabled domains status
   */
  getDomains(req: Request, res: Response): void {
    const correlationId = getCorrelationId(req);
    const response = configStatusService.getDomainsStatus(correlationId);
    res.json(response);
  }
}

export const configStatusController = new ConfigStatusController();
